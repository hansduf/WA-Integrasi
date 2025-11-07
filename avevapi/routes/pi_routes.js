import express from 'express';
import { triggerEngine } from '../core/trigger-engine.js';
import db from '../lib/database.js';
import { dualAuthMiddleware } from '../middleware/dual-auth.middleware.js';
import {
  logTriggerExecuted
} from '../utils/audit.utils.js';
import { callAvevApiUrl } from '../utils/preprocessing.utils.js';
import { getClientIP, getUserAgent } from '../utils/security.utils.js';
import { invalidateTriggerCountsCache } from './data-sources.js';

const router = express.Router();

// Helper functions to read from database (replacing old JSON file reads)
function readTriggers() {
  // Get all triggers from database and convert to old format for compatibility
  const dbTriggers = db.preparedStatements.getAllTriggers.all();
  const triggers = { behaviors: {}, names: {} };
  
  dbTriggers.forEach(trigger => {
    const config = JSON.parse(trigger.config);
    triggers.behaviors[trigger.id] = {
      ...config,
      // ✅ FIX: Map 'query' field to 'api_url' for QUERY triggers
      api_url: config.query || config.api_url,
      type: trigger.type,
      active: trigger.active === 1,
      dataSourceId: trigger.data_source_id
    };
    triggers.names[trigger.name] = trigger.id;
  });
  
  return triggers;
}

function readTriggerGroups() {
  // Get all groups from database and convert to old format
  const dbGroups = db.preparedStatements.getAllTriggerGroups.all();
  const groups = { groups: {}, names: {} };
  
  dbGroups.forEach(group => {
    // Get members for this group
    const members = db.preparedStatements.getTriggerGroupMembers.all(group.id);
    const triggerIds = members.map(m => m.trigger_id);
    
    // Get trigger names for these IDs
    const triggerNames = triggerIds.map(id => {
      const trigger = db.preparedStatements.getTrigger.get(id);
      return trigger ? trigger.name : null;
    }).filter(Boolean);
    
    groups.groups[group.id] = {
      id: group.id,
      name: group.name,
      description: group.description,
      executionMode: group.execution_mode,
      triggers: triggerNames,
      createdAt: group.created_at,
      updatedAt: group.updated_at
    };
    groups.names[group.name] = group.id;
  });
  
  return groups;
}

function writeTriggers(obj) {
  // This function is deprecated - NO-OP (does nothing)
  // All writes should go through proper API endpoints that update database
  // This function kept for backward compatibility but does not save to database
  console.warn('⚠️ writeTriggers() called but ignored - use /api/triggers endpoints to update triggers');
  return false; // Indicate operation was not performed
}

// POST /pi/ask
router.post('/ask', async (req, res) => {
  let message = typeof req.body.message === 'string' ? req.body.message.trim() :
                typeof req.body.input === 'string' ? req.body.input.trim() : '';

  // Remove bot mention from group messages
  const botMention = '@256817720475733';
  message = message.replace(new RegExp(botMention, 'gi'), '').trim();

  const triggers = readTriggers();
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, '');

  // !update -> list behaviors with names
  if (normalizedMessage === '!update') {
    const listEntries = Object.entries(triggers.behaviors || {}).map(([id, v]) => {
      const mappedNames = Object.entries(triggers.names || {}).filter(([n,bid]) => bid === id).map(([n]) => n);
      const nameList = mappedNames.join(' | ');
      const desc = v.desc || (readableDesc[v.type] || v.type);
      const responsePrefix = v.responsePrefix || (typeof v.type === 'string' && readableDesc[v.type] ? readableDesc[v.type].replace('Menampilkan ', '').replace(' data','').replace(' unit 7','') : 'Default');
      return `- *${nameList}* = ${desc} | ${responsePrefix}`;
    });
    const list = listEntries.join('\n') || '(Belum ada trigger)';
    const answer = `*Daftar Trigger Saat Ini:*\n${list}\n\n*Cara update trigger:*\n• Ubah nama: <trigger> = <nama_baru> !!update\n• Ubah deskripsi: <trigger> = <deskripsi> !!update-desc\n• Ubah response: <trigger> = <prefix> !!update-response\n• Tambah nama panggilan: <source> + <alias> !!update\n• Hapus nama: <trigger> - deleted !!update-del`;
    return res.json({ answer });
  }

  // Delete name: <trigger> - deleted !!update-del (PINDAHKAN KE ATAS - SPESIFIK DULU)
  if (message.includes('!!update-del')) {
    const matchDel = message.match(/^(.+?)\s*-\s*deleted\s*!!update-del$/);
    if (!matchDel) return res.json({ answer: 'Format salah. Gunakan: <trigger> - deleted !!update-del' });
    const keyToDelete = matchDel[1].trim();
    if (triggers.names && triggers.names[keyToDelete]) {
      const bid = triggers.names[keyToDelete];
      delete triggers.names[keyToDelete];
      const stillReferenced = Object.values(triggers.names || {}).some(x => x === bid);
      if (!stillReferenced) delete triggers.behaviors[bid];
      writeTriggers(triggers);
      return res.json({ answer: `✅ Nama *${keyToDelete}* berhasil dihapus.` });
    }
    return res.json({ answer: `Trigger *${keyToDelete}* tidak ditemukan.` });
  }

  // Update desc explicit
  if (message.includes('!!update-desc')) {
    const match = message.match(/^(.+?)\s*=\s*(.+?)\s*!!update-desc$/);
    if (!match) return res.json({ answer: 'Format salah. Gunakan: <trigger> = <deskripsi> !!update-desc' });
    const key = match[1].trim();
    const newDesc = match[2].trim();
    const resolved = resolveByName(key, triggers);
    if (!resolved) return res.json({ answer: `Trigger *${key}* tidak ditemukan.` });
    triggers.behaviors[resolved.behaviorId] = { ...(triggers.behaviors[resolved.behaviorId] || {}), desc: newDesc };
    writeTriggers(triggers);
    return res.json({ answer: `✅ Deskripsi untuk *${key}* berhasil diupdate menjadi: ${newDesc}` });
  }

  // Update response prefix
  if (message.includes('!!update-response')) {
    const match = message.match(/^(.+?)\s*=\s*(.+?)\s*!!update-response$/);
    if (!match) return res.json({ answer: 'Format salah. Gunakan: <trigger> = <response prefix> !!update-response' });
    const key = match[1].trim();
    const newResponsePrefix = match[2].trim();
    const resolved = resolveByName(key, triggers);
    if (!resolved) return res.json({ answer: `Trigger *${key}* tidak ditemukan.` });
    triggers.behaviors[resolved.behaviorId] = { ...(triggers.behaviors[resolved.behaviorId] || {}), responsePrefix: newResponsePrefix };
    writeTriggers(triggers);
    return res.json({ answer: `✅ Response prefix untuk *${key}* berhasil diupdate menjadi: ${newResponsePrefix}` });
  }

  // Create alias/name: <source> + <alias> !!update
  if (message.includes('!!update') && message.match(/^(.+?)\s*\+\s*(.+?)\s*!!update$/)) {
    const m = message.match(/^(.+?)\s*\+\s*(.+?)\s*!!update$/);
    const source = m[1].trim();
    const alias = m[2].trim();
    const src = resolveByName(source, triggers);
    if (!src) return res.json({ answer: `Trigger *${source}* tidak ditemukan.` });
    if (triggers.names && triggers.names[alias]) return res.json({ answer: `Trigger *${alias}* sudah ada.` });
    triggers.names[alias] = src.behaviorId;
    writeTriggers(triggers);
    return res.json({ answer: `✅ Nama panggilan *${alias}* berhasil ditambahkan untuk: *${source}*` });
  }

  // Update / rename: <trigger> = <value> !!update (GENERAL - TERAKHIR)
  if (message.includes('!!update') && !message.includes('!!update-desc') && !message.includes('!!update-response') && !message.includes('!!update-del')) {
    const match = message.match(/^(.+?)\s*=\s*(.+?)\s*!!update$/);
    if (!match) return res.json({ answer: 'Format salah. Gunakan: <trigger> = <isi> !!update' });
    const key = match[1].trim();
    const value = match[2].trim();
    const resolved = resolveByName(key, triggers);
    if (!resolved) return res.json({ answer: `Trigger *${key}* tidak ditemukan.` });
    const bid = resolved.behaviorId;
    if (value.toLowerCase().includes('menampilkan')) {
      triggers.behaviors[bid] = { ...(triggers.behaviors[bid] || {}), desc: value };
      writeTriggers(triggers);
      return res.json({ answer: `✅ Deskripsi untuk *${key}* berhasil diupdate menjadi: ${value}` });
    }
    // treat as rename
    delete triggers.names[resolved.name];
    triggers.names[value] = bid;
    writeTriggers(triggers);
    return res.json({ answer: `✅ Nama *${key}* berhasil diubah menjadi: ${value}` });
  }

  // Halo help - Universal data system
  if (message.toLowerCase() === 'halo') {
    try {
      // Get PI triggers
      const piTriggers = Object.entries(triggers.names || {}).map(([k, bid]) => {
        const desc = triggers.behaviors && triggers.behaviors[bid] ? triggers.behaviors[bid].desc : '';
        const type = triggers.behaviors && triggers.behaviors[bid] ? triggers.behaviors[bid].type : 'Unknown';
        return { name: k, desc, type: 'PI', category: 'AVEVA PI Data' };
      });

      // Get trigger groups
      const triggerGroupsData = readTriggerGroups();
      const triggerGroupsList = Object.entries(triggerGroupsData.names || {}).map(([k, gid]) => {
        const group = triggerGroupsData.groups && triggerGroupsData.groups[gid] ? triggerGroupsData.groups[gid] : null;
        const triggerCount = group && group.triggers ? group.triggers.length : 0;
        const desc = group && group.description ? group.description : `${triggerCount} trigger(s)`;
        return { name: k, desc, type: 'GROUP', category: 'Trigger Groups' };
      });

      // Get AI triggers from database
      const aiTriggersRows = db.preparedStatements.getAllAiTriggers.all();
      const aiTriggers = (aiTriggersRows || [])
        .filter(t => t.enabled)
        .map(t => ({
          prefix: t.prefix,
          name: t.name,
          desc: t.description || 'AI Trigger',
          fullTrigger: `${t.prefix}${t.name}`,
          type: 'AI',
          category: 'AI Triggers'
        }));

      // Get data sources info
      const dataSources = [
        { name: 'data sources', desc: 'Kelola semua sumber data', type: 'SYSTEM', category: 'Data Sources' },
        { name: 'latest data', desc: 'Ambil data terakhir dari sumber data', type: 'SYSTEM', category: 'Data Sources' },
        { name: 'query data', desc: 'Query data dengan filter waktu', type: 'SYSTEM', category: 'Data Sources' }
      ];

      // Combine all available commands
      const allTriggers = [...piTriggers, ...triggerGroupsList, ...aiTriggers, ...dataSources];

      // Group by category
      const groupedTriggers = allTriggers.reduce((acc, trigger) => {
        if (!acc[trigger.category]) acc[trigger.category] = [];
        acc[trigger.category].push(trigger);
        return acc;
      }, {});

      // Build enhanced response
      let answer = `👋 *Halo Sobat POMI!*\n\n`;
      answer += `Saya siap membantu Anda mendapatkan data real-time dari berbagai sumber data:\n\n`;

      // PI Data section
      if (groupedTriggers['AVEVA PI Data'] && groupedTriggers['AVEVA PI Data'].length > 0) {
        answer += `🔋 *Data AVEVA PI:*\n`;
        groupedTriggers['AVEVA PI Data'].forEach(trigger => {
          answer += `• *${trigger.name}* → ${trigger.desc}\n`;
        });
        answer += `\n`;
      }

      // Trigger Groups section
      if (groupedTriggers['Trigger Groups'] && groupedTriggers['Trigger Groups'].length > 0) {
        answer += `🎯 *Trigger Groups:*\n`;
        groupedTriggers['Trigger Groups'].forEach(trigger => {
          answer += `• *${trigger.name}* → ${trigger.desc}\n`;
        });
        answer += `\n`;
      }

      // AI Triggers section
      if (groupedTriggers['AI Triggers'] && groupedTriggers['AI Triggers'].length > 0) {
        answer += `🤖 *AI Triggers:*\n`;
        groupedTriggers['AI Triggers'].forEach(trigger => {
          answer += `• *${trigger.prefix}* → ${trigger.name} → ${trigger.desc}\n`;
        });
        answer += `\n`;
      }

      // Help section
      answer += `💡 *Panduan Penggunaan:*\n`;
      answer += `• Ketik nama trigger atau group di atas untuk mendapatkan data\n`;
      answer += `• *Trigger Groups* menjalankan multiple triggers sekaligus\n`;
      answer += `• *AI Triggers* menggunakan AI untuk memproses query Anda\n`;


      return res.json({ answer });
    } catch (error) {
      console.error('Error in halo response:', error);
      const fallbackAnswer = `👋 *Halo! Selamat datang di AVEVA PI Assistant*Sistem sedang mengalami gangguan teknis. Silakan coba lagi dalam beberapa saat.💡 *Ketik "help" untuk panduan alternatif*`;
      return res.json({ answer: fallbackAnswer });
    }
  }

  // Help command - Enhanced help system
  if (message.toLowerCase() === 'help' || message.toLowerCase() === 'bantuan') {
    try {
      // Get PI triggers only
      const piTriggers = Object.entries(triggers.names || {}).map(([k, bid]) => {
        const desc = triggers.behaviors && triggers.behaviors[bid] ? triggers.behaviors[bid].desc : '';
        return { name: k, desc, type: 'PI' };
      });

      // Combine all triggers (PI only)
      const allTriggers = [...piTriggers];

      let answer = ` *Panduan Perintah*\n\n`;

      // Commands section
      answer += `🔧 *Perintah Utama:*\n`;
      answer += `• *"halo"* → Salam dan daftar perintah\n`;
      answer += `• *"help"* → Panduan lengkap ini\n\n`;

      // PI Data section
      if (piTriggers.length > 0) {
        answer += `🔋 *Data AVEVA PI (${piTriggers.length} perintah):*\n`;
        piTriggers.slice(0, 10).forEach(trigger => {
          answer += `• *${trigger.name}* → ${trigger.desc}\n`;
        });
        if (piTriggers.length > 10) {
          answer += `• ... dan ${piTriggers.length - 10} perintah lainnya\n`;
        }
        answer += `\n`;
      }

      // Tips
      answer += `💡 *Tips Penggunaan:*\n`;
      answer += `• Perintah case-insensitive (tidak peduli huruf besar/kecil)\n`;
      answer += `• Spasi akan diabaikan dalam matching\n`;
      answer += `• Sistem mendukung alias untuk kemudahan akses\n\n`;

      return res.json({ answer });
    } catch (error) {
      console.error('Error in help response:', error);
      const fallbackAnswer = `📚 *PANDUAN AVEVA PI ASSISTANT*🔧 *Perintah Utama:*• "halo" → Salam dan daftar perintah• "help" → Panduan lengkap💡 *Sistem AI untuk monitoring AVEVA PI real-time*⚠️ *Sistem sedang mengalami gangguan teknis*`;
      return res.json({ answer: fallbackAnswer });
    }
  }

  // 🎯 TRIGGER GROUPS: Check if message matches a trigger group name
  const triggerGroupsData = readTriggerGroups();
  for (const [groupName, groupId] of Object.entries(triggerGroupsData.names || {})) {
    const normalizedGroupName = groupName.toLowerCase().replace(/\s+/g, '');
    if (normalizedMessage === normalizedGroupName) {
      const group = triggerGroupsData.groups && triggerGroupsData.groups[groupId] ? triggerGroupsData.groups[groupId] : null;
      if (!group || !group.triggers || group.triggers.length === 0) continue;



      try {
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // 🎯 SUPER SIMPLE: Just call each trigger by name
        // Each trigger already has its own interval, dual query config, etc.
        // We just need to execute them and collect results!
        for (const triggerName of group.triggers) {
          try {


            // Check if trigger exists and is active
            const triggerId = triggers.names[triggerName];
            if (!triggerId) {
              results.push(`- ${triggerName}: ⚠️ Trigger tidak ditemukan`);
              errorCount++;
              continue;
            }

            const triggerBehavior = triggers.behaviors[triggerId];
            if (!triggerBehavior || triggerBehavior.active === false) {
              results.push(`- ${triggerName}: ⚠️ Trigger tidak aktif`);
              errorCount++;
              continue;
            }

            // 🚀 Call trigger execution by making internal request
            // Create a mock request object with just the trigger name
            const mockReq = { body: { message: triggerName } };
            const mockRes = {
              json: (data) => data // Capture the response
            };

            // Execute trigger logic (this will match the trigger name below in the code)
            // We'll process it inline to avoid recursion
            let triggerResult = null;
            const normalizedTriggerName = triggerName.toLowerCase().replace(/\s+/g, '');
            
            // Find and execute this specific trigger
            for (const [name, bid] of Object.entries(triggers.names || {})) {
              const normalizedName = name.toLowerCase().replace(/\s+/g, '');
              if (normalizedTriggerName === normalizedName) {
                const behavior = triggers.behaviors && triggers.behaviors[bid] ? triggers.behaviors[bid] : null;
                if (behavior && behavior.active !== false && behavior.type === 'QUERY' && behavior.api_url) {
                  // Execute QUERY trigger
                  const { dataSourceManager } = await import('../core/data-source-manager.js');
                  
                  const queryParams = {
                    query: behavior.api_url,
                    parameters: [],
                    units: behavior.units,
                    ...(behavior.interval && { interval: behavior.interval })
                  };
                  
                  const queryResult = await dataSourceManager.executeQuery(behavior.dataSourceId, queryParams);
                  
                  // ✅ Use SAME formatting logic as individual triggers
                  triggerResult = '';
                  
                    // Use SAME formatting logic as individual triggers
                    if (queryResult && typeof queryResult === 'object' && queryResult.data) {
                      const { data, rowCount, metadata } = queryResult;
                      const totalCount = metadata?.count ?? rowCount ?? data.length;
                      if (Array.isArray(data) && data.length > 0) {
                        triggerResult = data.map((row, index) => {
                          const values = Object.entries(row)
                            .filter(([key, value]) => value !== null && value !== undefined)
                            .map(([key, value]) => {
                              if (value instanceof Date) {
                                return `${key}: ${value.toLocaleString()}`;
                              }
                              const strValue = String(value);
                              return strValue.length > 50 ? `${key}: ${strValue.substring(0, 50)}...` : `${key}: ${strValue}`;
                            })
                            .join(', ');
                          return `📊 *Row ${index + 1}*: ${values}`;
                        }).join('\n');

                        triggerResult += `\n\n📈 *Total*: ${totalCount} records`;
                      } else {
                        triggerResult = '📊 No data found';
                      }
                    } else if (Array.isArray(queryResult) && queryResult.length > 0) {
                      triggerResult = `📊 Found ${queryResult.length} records`;
                    } else {
                      triggerResult = '📊 Query executed successfully';
                    }
                  
                }
                break;
              }
            }

            if (triggerResult !== undefined && triggerResult !== null) {
              const prefix = triggerBehavior.responsePrefix || triggerName;
              results.push(`*${prefix}*: ${triggerResult}`);
              successCount++;
            } else {
              throw new Error('No result from trigger');
            }

          } catch (triggerError) {
            console.error(`❌ Error executing trigger ${triggerName}:`, triggerError.message);
            const triggerBehavior = triggers.behaviors[triggers.names[triggerName]];
            const prefix = triggerBehavior?.responsePrefix || triggerName;
            results.push(`- ${prefix}: ❌ ${triggerError.message}`);
            errorCount++;
          }
        }

        // Build final response
        const groupPrefix = group.description || `${groupName.toUpperCase()} GROUP`;
        let answer = `*🎯 ${groupPrefix}*\n`;
        answer += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        answer += results.join('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        answer += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        answer += `✅ *${successCount}* berhasil, ❌ *${errorCount}* gagal`;


        return res.json({ answer });

      } catch (groupError) {
        console.error(`❌ Group execution error for ${groupName}:`, groupError.message);
        return res.json({ answer: `❌ Error executing group *${groupName}*: ${groupError.message}` });
      }
    }
  }

  // Dynamic triggers: match names -> behavior
  for (const [name, bid] of Object.entries(triggers.names || {})) {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    if (normalizedMessage === normalizedName) {
      const behavior = triggers.behaviors && triggers.behaviors[bid] ? triggers.behaviors[bid] : null;
      if (!behavior || !behavior.active) continue;
      const triggerType = behavior.type;

      // Handle API type triggers
      if (triggerType === 'API' && behavior.api_url) {
        try {
          const latest = await callAvevApiUrl(behavior.api_url);
          const waktu = new Date(latest.v0).toLocaleString();
          const nilaiBulat = Number(latest.v1).toFixed(2);
          const customPrefix = behavior.responsePrefix || 'Data';
          const answer = `*${customPrefix}*: *${nilaiBulat}* (waktu: ${waktu})`;

          // Audit logging for API trigger execution
          try {
            const userId = req.user?.id;
            const ipAddress = getClientIP(req);
            const userAgent = getUserAgent(req);
            await logTriggerExecuted(bid, userId, {
              result: { value: nilaiBulat, timestamp: waktu },
              executionTime: Date.now(),
              parameters: { triggerName: name, apiUrl: behavior.api_url }
            }, ipAddress, userAgent);
          } catch (auditError) {
            console.error('Failed to log API trigger execution:', auditError);
            // Don't fail the request if audit logging fails
          }

          return res.json({ answer });
        } catch (err) {
          console.error(`❌ API Error for ${name}:`, err.message);
          return res.json({ answer: '❌ Error fetching data from external API.' });
        }
      }

      // Handle COMPOSITE type triggers (multiple API calls)
      else if (triggerType === 'COMPOSITE' && behavior.composite_triggers) {
        try {
          const results = [];
          for (const triggerName of behavior.composite_triggers) {
            // First resolve trigger name to behavior ID
            const triggerId = triggers.names[triggerName];
            const triggerBehavior = triggers.behaviors[triggerId];
            if (triggerBehavior && triggerBehavior.active !== false) {
              try {
                let triggerResult = '';
                const prefix = triggerBehavior.responsePrefix || 'Data';

                // Handle QUERY type child triggers (new system)
                if (triggerBehavior.type === 'QUERY' && triggerBehavior.api_url) {
                  // Import data source manager dynamically
                  const { dataSourceManager } = await import('../core/data-source-manager.js');

                  const queryResult = await dataSourceManager.executeQuery(triggerBehavior.dataSourceId, {
                    query: triggerBehavior.api_url,
                    parameters: [],
                    units: triggerBehavior.units,
                    // ✅ FIX: Pass interval from trigger configuration
                    ...(triggerBehavior.interval && { interval: triggerBehavior.interval })
                  });

                  // Format result
                  if (queryResult && typeof queryResult === 'object' && queryResult.data) {
                    const { data } = queryResult;
                    if (Array.isArray(data) && data.length > 0) {
                      // For composite, show simplified format
                      const firstRow = data[0];
                      const values = Object.entries(firstRow)
                        .filter(([key, value]) => value !== null && value !== undefined)
                        .map(([key, value]) => {
                          if (value instanceof Date) {
                            return `${value.toLocaleString()}`;
                          }
                          return String(value);
                        });
                      triggerResult = `${values[0]} (waktu: ${values[1] || 'N/A'})`;
                    } else {
                      triggerResult = '❌ Data tidak ditemukan';
                    }
                  } else {
                    triggerResult = String(queryResult || 'No result');
                  }
                  
                  results.push(`*${prefix}*: ${triggerResult}`);
                  
                } 
                // Handle API type child triggers (legacy system)
                else if (triggerBehavior.type === 'API' && triggerBehavior.api_url) {
                  const latest = await callAvevApiUrl(triggerBehavior.api_url);
                  const waktu = new Date(latest.v0).toLocaleString();
                  const nilaiBulat = Number(latest.v1).toFixed(2);
                  results.push(`*${prefix}*: ${nilaiBulat} MW\n  waktu: ${waktu}`);
                } 
                // Handle other trigger types
                else {
                  results.push(`*${prefix}*: ${triggerBehavior.desc || 'Trigger executed'}`);
                }

              } catch (err) {
                const prefix = triggerBehavior.responsePrefix || 'Data';
                results.push(`- ${prefix}: ❌ Data tidak ditemukan`);
                console.error(`  ❌ Error calling ${triggerName}:`, err.message);
              }
            } else {
              results.push(`- ${triggerName}: ⚠️ Trigger tidak aktif atau tidak valid`);
            }
          }
          const customPrefix = behavior.responsePrefix || 'Data Gabungan';
          let answer = `*${customPrefix}*\n-----------------------------\n`;
          answer += results.join('\n-----------------------------\n');
          answer += '\n-----------------------------';
          return res.json({ answer });
        } catch (err) {
          console.error(`❌ Composite Error for ${name}:`, err.message);
          return res.json({ answer: '❌ Error fetching composite data.' });
        }
      }

      // Handle QUERY type triggers (new preset-based triggers)
      else if (triggerType === 'QUERY' && behavior.api_url) {
        try {
          // Get data source info
          const dataSourceId = behavior.dataSourceId;
          if (!dataSourceId) {
            return res.json({ answer: `❌ *${name}*: Data source tidak dikonfigurasi` });
          }

          // Import data source manager dynamically
          const { dataSourceManager } = await import('../core/data-source-manager.js');

          // Get data source to determine plugin type
          const dataSource = await dataSourceManager.getDataSource(dataSourceId);
          const isAvevaPi = dataSource.plugin === 'aveva-pi';

          // Prepare query parameters based on plugin type
          let queryParams;
          if (isAvevaPi) {
            // For AVEVA PI, determine if api_url is an interval or SQL query
            const isIntervalPreset = typeof behavior.api_url === 'string' && 
              ['latest', '1h', '24h', '30s', '1m', '5m', '15m', '30m', '2h', '6h', '12h', '1d'].includes(behavior.api_url);
            
            if (isIntervalPreset) {
              // api_url is a simple interval preset
              const parameters = { 
                interval: behavior.api_url,
                tag: dataSource.config.defaultTag  // ✅ FIX: Add tag for consistency
              };
              
              // Add dualQuery if specified in trigger configuration
              if (behavior.dualQuery === true) {
                parameters.dualQuery = true;
              }
              
              queryParams = {
                query: 'latest', // Use preset query for AVEVA PI
                parameters: parameters,
                units: behavior.units // Pass units from trigger configuration
              };
            } else {
              // api_url is a SQL query, use behavior.interval if available
              const interval = behavior.interval || '1h'; // Default to 1h if no interval specified
              const parameters = { 
                interval: interval,
                tag: dataSource.config.defaultTag  // ✅ FIX: Add tag from data source config
              };
              
              // Add dualQuery if specified in trigger configuration
              if (behavior.dualQuery === true) {
                parameters.dualQuery = true;
              }
              
              queryParams = {
                query: behavior.api_url, // Pass SQL query
                parameters: parameters,
                units: behavior.units // Pass units from trigger configuration
              };
            }
          } else {
            // For other plugins, use api_url as query
            queryParams = {
              query: behavior.api_url,
              parameters: [],
              units: behavior.units // Pass units from trigger configuration
            };
          }

          // Execute query through data source manager
          const queryResult = await dataSourceManager.executeQuery(dataSourceId, queryParams);

          // Format response based on result type
          let formattedResult = '';

          // Handle data source query results (with data/fields structure)
          if (queryResult && typeof queryResult === 'object' && queryResult.data) {
            const { data, rowCount, metadata } = queryResult;
            // Use metadata.count if available (AVEVA PI format), otherwise use rowCount or data.length
            const totalCount = metadata?.count ?? rowCount ?? data.length;

            if (Array.isArray(data) && data.length > 0) {
              // Format each row of data
              formattedResult = data.map((row, index) => {
                const values = Object.entries(row)
                  .filter(([key, value]) => value !== null && value !== undefined)
                  .map(([key, value]) => {
                    // Format date values nicely
                    if (value instanceof Date) {
                      return `${key}: ${value.toLocaleString()}`;
                    }
                    // Format long text values
                    const strValue = String(value);
                    return strValue.length > 50 ? `${key}: ${strValue.substring(0, 50)}...` : `${key}: ${strValue}`;
                  })
                  .join(', ');
                return `📊 *Row ${index + 1}*: ${values}`;
              }).join('\n');

              // Add summary
              formattedResult += `\n\n📈 *Total*: ${totalCount} records`;
            } else {
              formattedResult = '📊 No data found';
            }
          }
          // Handle legacy array results (multiple rows)
          else if (Array.isArray(queryResult) && queryResult.length > 0) {
            const firstRow = queryResult[0];
            const keys = Object.keys(firstRow).filter(key =>
              key !== 'units' || (firstRow[key] && firstRow[key].trim() !== '')
            ).filter(key => firstRow[key] !== null && firstRow[key] !== undefined);
            formattedResult = queryResult.map((row, index) => {
              const values = keys.map(key => `${key}: ${row[key]}`).join(', ');
              return `📊 *Row ${index + 1}*: ${values}`;
            }).join('\n');
          }
          // Handle single object result
          else if (queryResult && typeof queryResult === 'object') {
            const keys = Object.keys(queryResult).filter(key =>
              key !== 'units' || (queryResult[key] && queryResult[key].trim() !== '')
            ).filter(key => queryResult[key] !== null && queryResult[key] !== undefined);
            formattedResult = keys.map(key => `${key}: ${queryResult[key]}`).join(', ');
          }
          // Handle primitive results
          else {
            formattedResult = String(queryResult || 'No result');
          }

          const customPrefix = behavior.responsePrefix || `📊 *${name.toUpperCase()}*`;
          const answer = `${customPrefix}\n${formattedResult}`;
          console.log(`✅ Query Response: ${answer}`);

          // Audit logging for trigger execution
          try {
            const userId = req.user?.id;
            const ipAddress = getClientIP(req);
            const userAgent = getUserAgent(req);
            await logTriggerExecuted(bid, userId, {
              result: queryResult,
              executionTime: Date.now(),
              parameters: { triggerName: name }
            }, ipAddress, userAgent);
          } catch (auditError) {
            console.error('Failed to log trigger execution:', auditError);
            // Don't fail the request if audit logging fails
          }

          return res.json({ answer });

        } catch (err) {
          console.error(`❌ Query Error for ${name}:`, err.message);
          return res.json({ answer: `❌ *${name}*: Error executing query - ${err.message}` });
        }
      }

      // Handle other/custom types (fallback)
      else {
        const customDesc = behavior.desc || '';
        return res.json({ answer: `*${name}*: ${customDesc}` });
      }
    }
  }

  // If no trigger matched, provide helpful response
  const answer = `❓ *Test BOT*\n\n` +
                `❓ *Perintah tidak dikenali*\n\n` +
                `Ketik *"halo"* untuk melihat semua perintah yang tersedia\n` +
                `----\n\n` +
                ``;
  return res.json({ answer });
});

// Middleware to check admin key
function checkAdminKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== process.env.TRIGGERS_ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /pi/triggers - create trigger
// ✅ FIXED: Now uses dualAuthMiddleware (JWT + API Key) instead of checkAdminKey only
router.post('/triggers', dualAuthMiddleware, (req, res) => {
  try {
    const { key, api_url, desc, responsePrefix, aliases, active, type, composite_triggers } = req.body;
    
    // Validation based on trigger type
    if (type === 'COMPOSITE') {
      if (!key || !composite_triggers || !Array.isArray(composite_triggers) || composite_triggers.length === 0) {
        return res.status(400).json({ error: 'For COMPOSITE triggers: key and composite_triggers array required' });
      }
    } else {
      // Default to API type
      if (!key || !api_url) {
        return res.status(400).json({ error: 'For API triggers: key and api_url required' });
      }
    }

    // Check if trigger with same name already exists
    const existingTrigger = db.preparedStatements.getAllTriggers.all().find(t => t.name === key);
    if (existingTrigger) {
      return res.status(400).json({ error: 'Trigger with this name already exists' });
    }

    // Generate ID
    const id = `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create config
    const config = {
      type: type || 'API',
      api_url: api_url || null,
      desc: desc || `Trigger for ${key}`,
      responsePrefix: responsePrefix || 'Data',
      composite_triggers: composite_triggers || [],
      active: active !== false,
      aliases: aliases || []
    };

    // Insert to database
    const insertStmt = db.db.prepare(`
      INSERT INTO triggers (id, name, type, config, active, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    insertStmt.run(
      id,
      key,
      type || 'API',
      JSON.stringify(config),
      active !== false ? 1 : 0
    );

    console.log(`✅ Trigger created: ${id}`);

    // Invalidate caches
    invalidateTriggerCountsCache();
    triggerEngine.invalidateCache();

    res.json({
      success: true,
      trigger: {
        id,
        key,
        type: type || 'API',
        config
      }
    });
  } catch (error) {
    console.error('❌ Error creating trigger:', error);
    res.status(500).json({ error: error.message || 'Failed to create trigger' });
  }
});

// GET /pi/triggers - list all triggers
// ✅ FIXED: Now uses dualAuthMiddleware (JWT + API Key) instead of checkAdminKey only
router.get('/triggers', dualAuthMiddleware, (req, res) => {
  try {
    const dbTriggers = db.preparedStatements.getAllTriggers.all();
    
    // Convert to array format expected by frontend
    const triggerArray = dbTriggers.map(trigger => ({
      id: trigger.id,
      name: trigger.name,
      type: trigger.type,
      config: JSON.parse(trigger.config || '{}'),
      active: trigger.active === 1,
      createdAt: trigger.created_at,
      updatedAt: trigger.updated_at
    }));
    
    res.json({
      success: true,
      triggers: triggerArray,
      count: triggerArray.length
    });
  } catch (error) {
    console.error('❌ Error listing triggers:', error);
    res.status(500).json({ error: error.message || 'Failed to list triggers' });
  }
});

// OLD CODE (kept for reference, commented out)
/*
// GET /pi/triggers - list all triggers (OLD)
router.get('/triggers', checkAdminKey, (req, res) => {
  const triggers = readTriggers();
  // Convert to array format expected by frontend
  const triggerArray = [];
  for (const [name, behaviorId] of Object.entries(triggers.names || {})) {
    const behavior = triggers.behaviors[behaviorId];
    if (behavior) {
      triggerArray.push({
        id: behaviorId,
        key: name,
        api_url: behavior.api_url,
        desc: behavior.desc,
        responsePrefix: behavior.responsePrefix,
        active: behavior.active !== false,
        type: behavior.type,
        aliases: Object.entries(triggers.names || {})
          .filter(([n, bid]) => bid === behaviorId && n !== name)
          .map(([n]) => n),
        meta: behavior.meta
      });
    }
  }
  res.json({
    success: true,
    triggers: triggerArray,
    total: triggerArray.length
  });
});
*/

// GET /pi/triggers/:id - get single trigger
router.get('/triggers/:id', (req, res) => {
  const triggers = readTriggers();
  const behavior = triggers.behaviors[req.params.id];
  if (!behavior) return res.status(404).json({ error: 'Trigger not found' });
  // Find all names pointing to this trigger
  const names = Object.entries(triggers.names || {})
    .filter(([name, bid]) => bid === req.params.id)
    .map(([name]) => name);
  res.json({ id: req.params.id, behavior, names });
});

// PUT /pi/triggers/:id - update trigger
// ✅ FIXED: Now uses dualAuthMiddleware (JWT + API Key) instead of checkAdminKey only
router.put('/triggers/:id', dualAuthMiddleware, (req, res) => {
  try {
    const triggerId = req.params.id;
    const { api_url, desc, responsePrefix, active } = req.body;

    // Find trigger
    let trigger = db.preparedStatements.getTrigger.get(triggerId);

    if (!trigger) {
      // Try find by name for backward compatibility
      const allTriggers = db.preparedStatements.getAllTriggers.all();
      trigger = allTriggers.find(t => t.name === triggerId);
      if (!trigger) {
        console.warn(`⚠️ Trigger not found: ${triggerId}`);
        return res.status(404).json({ error: 'Trigger not found' });
      }
    }

    // Parse existing config
    const config = JSON.parse(trigger.config || '{}');

    // Update fields
    if (api_url !== undefined) config.api_url = api_url;
    if (desc !== undefined) config.desc = desc;
    if (responsePrefix !== undefined) config.responsePrefix = responsePrefix;
    if (active !== undefined) config.active = active;

    // Update in database
    const updateStmt = db.db.prepare(`
      UPDATE triggers 
      SET config = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(config), trigger.id);

    // Invalidate caches
    invalidateTriggerCountsCache();
    triggerEngine.invalidateCache();

    res.json({ success: true, message: 'Trigger updated', trigger: { id: trigger.id, name: trigger.name, config } });
  } catch (error) {
    console.error('❌ Error updating trigger:', error);
    res.status(500).json({ error: error.message || 'Failed to update trigger' });
  }
});

// DELETE /pi/triggers/:id - soft delete (set active: false)
// ✅ FIXED: Now uses dualAuthMiddleware (JWT + API Key) instead of checkAdminKey only
router.delete('/triggers/:id', dualAuthMiddleware, (req, res) => {
  try {
    const triggerId = req.params.id;

    // Find trigger
    let trigger = db.preparedStatements.getTrigger.get(triggerId);

    if (!trigger) {
      // Try find by name for backward compatibility
      const allTriggers = db.preparedStatements.getAllTriggers.all();
      trigger = allTriggers.find(t => t.name === triggerId);
      if (!trigger) {
        console.warn(`⚠️ Trigger not found: ${triggerId}`);
        return res.status(404).json({ error: 'Trigger not found' });
      }
    }

    // Parse existing config
    const config = JSON.parse(trigger.config || '{}');
    config.active = false;

    // Update in database
    const updateStmt = db.db.prepare(`
      UPDATE triggers 
      SET config = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(JSON.stringify(config), trigger.id);

    // Invalidate caches
    invalidateTriggerCountsCache();
    triggerEngine.invalidateCache();

    res.json({ success: true, message: 'Trigger deactivated' });
  } catch (error) {
    console.error('❌ Error deactivating trigger:', error);
    res.status(500).json({ error: error.message || 'Failed to deactivate trigger' });
  }
});

// DELETE /pi/triggers/:id/permanent - hard delete (remove completely)
// ✅ FIXED: Now uses dualAuthMiddleware (JWT + API Key) instead of checkAdminKey only
router.delete('/triggers/:id/permanent', dualAuthMiddleware, (req, res) => {
  try {
    const triggerId = req.params.id;

    // Find trigger
    let trigger = db.preparedStatements.getTrigger.get(triggerId);

    // If not found, try to find by name (for backward compatibility)
    if (!trigger) {
      const allTriggers = db.preparedStatements.getAllTriggers.all();
      trigger = allTriggers.find(t => t.name === triggerId);
      if (!trigger) {
        console.warn(`⚠️ Trigger not found: ${triggerId}`);
        return res.status(404).json({ error: 'Trigger not found' });
      }
    }

    // Delete trigger from database
    const result = db.preparedStatements.deleteTrigger.run(trigger.id);

    if (result.changes === 0) {
      return res.status(500).json({ error: 'Failed to delete trigger from database' });
    }

    // Invalidate caches
    invalidateTriggerCountsCache();
    triggerEngine.invalidateCache();

    res.json({
      success: true,
      message: 'Trigger permanently deleted',
      deletedId: trigger.id,
      deletedName: trigger.name
    });
  } catch (error) {
    console.error('❌ Error deleting trigger:', error);
    res.status(500).json({ error: error.message || 'Failed to delete trigger' });
  }
});

// POST /pi/triggers/test - dry-run resolver
router.post('/triggers/test', checkAdminKey, (req, res) => {
  let { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  // Remove bot mention from group messages
  const botMention = '@256817720475733';
  message = message.replace(new RegExp(botMention, 'gi'), '').trim();

  const triggers = readTriggers();
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, '');
  // Find matching trigger
  for (const [name, bid] of Object.entries(triggers.names || {})) {
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    if (normalizedMessage === normalizedName) {
      const behavior = triggers.behaviors[bid];
      if (behavior) {
        return res.json({
          matched: true,
          trigger: { id: bid, name, behavior },
          preview: `Would call: ${behavior.api_url || 'N/A'}`
        });
      }
    }
  }
  res.json({ matched: false, message: 'No trigger found for this message' });
});

export default router;