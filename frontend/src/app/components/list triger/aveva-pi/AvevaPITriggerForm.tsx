import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '../../ui/Modal';
import AvevaPIPresetDropdown from './AvevaPIPresetDropdown';

interface DataSource {
  id: string;
  name: string;
  plugin: string;
  config?: any;
}

interface AvevaPIPreset {
  id: string;
  name: string;
  queryTemplate: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface PresetQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  category: 'time' | 'recent';
  requiresTag?: boolean;
  parameters?: string[];
  plugin?: string;
  directUrl?: string;
  variables?: string[];
}

interface FormData {
  name: string;
  dataSourceId: string;
  presetQueryId: string;
  tag: string;
  description: string;
  type: string;
  active: boolean;
  selectedTable: string;
  availableTables: string[];
  availableColumns: string[];
  directUrl?: string;
  avevaPiInterval?: string;
  avevaPiLimit?: number;
}

interface AvevaPITriggerFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  connections: DataSource[];
  presetQueries: PresetQuery[];
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  onQueryGenerated?: (query: string) => void;
  
  queryMode: 'preset' | 'custom';
  setQueryMode: React.Dispatch<React.SetStateAction<'preset' | 'custom'>>;
  customQuery: string;
  setCustomQuery: React.Dispatch<React.SetStateAction<string>>;
  availableTags: string[];
  tagLoading: boolean;
  onExecuteCustomQuery?: (interval?: string) => void;
  
  onCustomQueryChange?: () => void;
  isQueryAutoFilled?: boolean;

  avevaPiPresets: AvevaPIPreset[];
  selectedPresetId: string | null;
  onPresetSelect: (preset: AvevaPIPreset | null) => void;
  onPresetSave: (name: string, queryTemplate: string, variables: string[]) => void;
  onPresetRename: (presetId: string, newName: string) => void;
  onPresetDelete: (presetId: string) => void;
  onPresetDuplicate: (presetId: string) => void;
  presetsLoading: boolean;
  
  testResult?: {
    loading: boolean;
    data: any;
    error: string | null;
  };
}

export default function AvevaPITriggerForm({
  formData,
  setFormData,
  connections,
  presetQueries,
  onValidationChange,
  onQueryGenerated,
  queryMode,
  setQueryMode,
  customQuery,
  setCustomQuery,
  availableTags,
  tagLoading,
  onExecuteCustomQuery,
  
  onCustomQueryChange,
  isQueryAutoFilled = false,
  
  avevaPiPresets,
  selectedPresetId,
  onPresetSelect,
  onPresetSave,
  onPresetRename,
  onPresetDelete,
  onPresetDuplicate,
  presetsLoading,
 
  testResult
}: AvevaPITriggerFormProps) {
  const selectedConnection = useMemo(() => 
    connections.find(c => c.id === formData.dataSourceId), 
    [connections, formData.dataSourceId]
  );
  
  
  const [localPresets, setLocalPresets] = useState<AvevaPIPreset[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  
  
  const effectivePresets = avevaPiPresets.length > 0 ? avevaPiPresets : localPresets;
  const effectiveLoading = presetsLoading || localLoading;
  
  
  console.log('🔍 AvevaPITriggerForm Debug:', {
    queryMode,
    avevaPiPresetsLength: avevaPiPresets.length,
    localPresetsLength: localPresets.length,
    effectivePresetsLength: effectivePresets.length,
    presetsLoading,
    localLoading,
    effectiveLoading,
    selectedConnection: selectedConnection?.plugin,
    presetQueriesLength: presetQueries.filter(p => p.plugin === 'aveva-pi').length,
    totalPresets: presetQueries.filter(p => p.plugin === 'aveva-pi').length + effectivePresets.length
  });
  
  
  const selectedPreset = useMemo(() => {
    if (!formData.presetQueryId) return null;

    
    if (formData.presetQueryId.startsWith('custom-')) {
      const customPresetId = formData.presetQueryId.replace('custom-', '');
      const customPreset = effectivePresets.find(p => p.id === customPresetId);
      if (customPreset) {
        
        return {
          id: formData.presetQueryId,
          name: customPreset.name,
          description: customPreset.queryTemplate.length > 50
            ? `${customPreset.queryTemplate.substring(0, 50)}...`
            : customPreset.queryTemplate,
          query: customPreset.queryTemplate,
          category: 'custom' as 'time' | 'recent',
          requiresTag: customPreset.variables.includes('tag'),
          parameters: customPreset.variables,
          plugin: 'aveva-pi' as string,
          databaseType: undefined
        };
      }
    }

    
    return presetQueries.find(p => p.id === formData.presetQueryId);
  }, [formData.presetQueryId, effectivePresets, presetQueries]);

  
  const [loadingTags, setLoadingTags] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  
  const [avevaPiIntervals, setAvevaPiIntervals] = useState([
    { value: '30s', label: '30 detik', description: 'Real-time monitoring', category: 'real-time' },
    { value: '1m', label: '1 menit', description: 'High-frequency data', category: 'real-time' },
    { value: '5m', label: '5 menit', description: 'Standard monitoring', category: 'monitoring' },
    { value: '15m', label: '15 menit', description: 'Process control', category: 'monitoring' },
    { value: '30m', label: '30 menit', description: 'Trend analysis', category: 'monitoring' },
    { value: '1h', label: '1 jam', description: 'Hourly reports', category: 'reporting' },
    { value: '2h', label: '2 jam', description: 'Shift monitoring', category: 'reporting' },
    { value: '6h', label: '6 jam', description: 'Daily overview', category: 'reporting' },
    { value: '12h', label: '12 jam', description: 'Half-day analysis', category: 'reporting' },
    { value: '1d', label: '1 hari', description: 'Daily reports', category: 'reporting' },
    { value: '1w', label: '1 minggu', description: 'Weekly analysis', category: 'reporting' }
  ]);


  const loadIntervalOptions = async () => {
    try {
      
      console.log('🎛️ [AVEVA PI FORM] Interval options loaded:', avevaPiIntervals.length);
    } catch (error) {
      console.error('Failed to load interval options:', error);
    }
  };

  
  useEffect(() => {
    loadIntervalOptions();
  }, []);

  useEffect(() => {
    console.log('🔄 [AVEVA PI FORM] Preset data changed:', {
      avevaPiPresetsLength: avevaPiPresets.length,
      presetsLoading,
      totalPresets: presetQueries.filter(p => p.plugin === 'aveva-pi').length + avevaPiPresets.length
    });
    console.log('🔄 [AVEVA PI FORM] Available presets:', avevaPiPresets.map(p => ({ id: p.id, name: p.name })));
  }, [avevaPiPresets, presetsLoading]);

  
  useEffect(() => {
    if (avevaPiPresets.length === 0 && !presetsLoading) {
      console.log('🔄 [AVEVA PI FORM] Props empty, loading presets locally...');
      const loadLocalPresets = async () => {
        try {
          setLocalLoading(true);
          const response = await fetch('/api/aveva-pi-presets', {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': 'universal-api-key-2025',
            },
          });
          if (response.ok) {
            const data = await response.json();
            setLocalPresets(data.presets || []);
            console.log('✅ [AVEVA PI FORM] Local presets loaded:', (data.presets || []).length);
          } else {
            console.error('❌ [AVEVA PI FORM] Failed to load local presets');
          }
        } catch (error) {
          console.error('❌ [AVEVA PI FORM] Error loading local presets:', error);
        } finally {
          setLocalLoading(false);
        }
      };
      loadLocalPresets();
    }
  }, [avevaPiPresets.length, presetsLoading]);

  if (selectedConnection?.plugin !== 'aveva-pi') {
    return null;
  }

  
  const validateForm = useCallback(() => {
    const errors: string[] = [];

    if (queryMode === 'preset') {
      
      if (selectedPreset?.requiresTag && !formData.tag?.trim()) {
        const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
        const hasDefaultTag = selectedConnection?.config?.defaultTag;
        if (!hasDefaultTag) {
          errors.push('Tag AVEVA PI harus diisi atau pastikan data source memiliki defaultTag');
        }
      }

      if (selectedPreset && 'directUrl' in selectedPreset && selectedPreset.directUrl && !formData.directUrl?.trim()) {
        errors.push('Direct URL AVEVA PI harus diisi');
      }
    } else if (queryMode === 'custom') {
      if (!customQuery?.trim()) {
        errors.push('Custom query AVEVA PI tidak boleh kosong');
      } else {
        
        const validation = validateCustomQuery(customQuery.trim());
        if (!validation.isValid && validation.error) {
          errors.push(validation.error);
        }
      }
    }

    setValidationErrors(errors);
    onValidationChange?.(errors.length === 0, errors);

    return errors.length === 0;
  }, [queryMode, selectedPreset, formData.tag, formData.directUrl, connections, formData.dataSourceId, customQuery, onValidationChange]);

  // Handle save preset
  const handleSavePreset = async () => {
    if (!presetName.trim() || !customQuery.trim() || !onPresetSave) {
      return;
    }

    setSavingPreset(true);
    try {
      
      let queryTemplate = customQuery.trim();
      const variables: string[] = [];
      
      if (selectedConnection?.config?.defaultTag) {
        
        const tagRegex = new RegExp(selectedConnection.config.defaultTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        queryTemplate = queryTemplate.replace(tagRegex, '{tag}');
        variables.push('tag');
      }

      await onPresetSave(presetName.trim(), queryTemplate, variables);
      setShowSavePresetModal(false);
      setPresetName('');
      alert('Preset berhasil disimpan!');
    } catch (error) {
      console.error('Error saving preset:', error);
      alert('Gagal menyimpan preset: ' + (error as Error).message);
    } finally {
      setSavingPreset(false);
    }
  };

  
  const validateCustomQuery = (query: string): { isValid: boolean; error?: string } => {
    const upperQuery = query.toUpperCase().trim();

    
    if (!upperQuery.startsWith('SELECT')) {
      return { isValid: false, error: 'Query AVEVA PI harus dimulai dengan SELECT' };
    }

    
    if (!upperQuery.includes('FROM POINT')) {
      return { isValid: false, error: 'Query AVEVA PI harus menggunakan tabel Point' };
    }

    
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return { isValid: false, error: `Query AVEVA PI tidak boleh mengandung operasi ${keyword}` };
      }
    }

    return { isValid: true };
  };

  const generateQuery = useCallback((): string => {
    if (!selectedPreset) return '';

    let query = selectedPreset.query;

    
    if ('variables' in selectedPreset && selectedPreset.variables && selectedPreset.variables.length > 0) {
      
      let processedQuery = selectedPreset.query;
      if (selectedPreset.variables.includes('tag')) {
        const tagValue = formData.tag?.trim() || selectedConnection?.config?.defaultTag || '{tag}';
        processedQuery = processedQuery.replace(/\{tag\}/g, tagValue);
      }
      
      query = processedQuery;
    } else {
      
      query = selectedPreset.query;
    }

    onQueryGenerated?.(query);
    return query;
  }, [selectedPreset, formData.tag, selectedConnection?.config?.defaultTag, onQueryGenerated]);

  // Fetch available tags when data source changes (moved to parent component)
  // useEffect(() => {
  //   if (selectedConnection && selectedPreset?.requiresTag) {
  //     fetchAvailableTags();
  //   }
  // }, [selectedConnection?.id, selectedPreset?.requiresTag]);

  useEffect(() => {
    validateForm();
    if (selectedPreset && queryMode === 'preset') {
      generateQuery();
    }
  }, [formData.presetQueryId, formData.tag, formData.directUrl, selectedPreset, queryMode, selectedConnection, validateForm, generateQuery]);

  const selectTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tag: tag
    }));
    setShowTagDropdown(false);
  };

  const handlePresetChange = (presetId: string) => {
    console.log('🎛️ handlePresetChange called with:', presetId);
    console.log('🎛️ Current queryMode before change:', queryMode);
    const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
    const defaultTag = selectedConnection?.config?.defaultTag || '';

    console.log('🎛️ Setting formData with:', { presetQueryId: presetId, tag: defaultTag });
    setFormData(prev => ({
      ...prev,
      presetQueryId: presetId,
      tag: defaultTag 
    }));

    
    console.log('🎛️ Setting queryMode to preset');
    setQueryMode('preset');

    
    if (presetId.startsWith('custom-')) {
      const customPresetId = presetId.replace('custom-', '');
      const customPreset = effectivePresets.find(p => p.id === customPresetId);
      console.log('🎛️ Custom preset found:', !!customPreset, customPreset?.name);
      if (customPreset) {
        onPresetSelect(customPreset);
      }
    } else {
      
      onPresetSelect(null);
    }
  };

  // const fetchAvailableTags = async () => {
  //   if (!selectedConnection) return;

  //   setLoadingTags(true);
  //   try {
  //     const response = await fetch(`/api/data-sources/${selectedConnection.id}/tags`, {
  //       headers: {
  //         'X-API-Key': 'universal-api-key-2025'
  //       }
  //     });
  //     if (response.ok) {
  //       const data = await response.json();
  //       setAvailableTags(data.tags || []);
  //     } else {
  //       console.error('Failed to fetch tags');
  //       setAvailableTags([]);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching tags:', error);
  //     setAvailableTags([]);
  //   } finally {
  //     setLoadingTags(false);
  //   }
  // };

  return (
    <div className="border border-gray-200 rounded p-4 space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Konfigurasi AVEVA PI</h3>
        <div className="mt-1 text-sm text-gray-600">
          <div>AVEVA PI: Sistem monitoring data industri</div>
          <div className="text-green-600">• Gunakan preset queries untuk kemudahan</div>
          <div className="text-blue-600">• Atau buat custom query untuk fleksibilitas lebih</div>
        </div>
      </div>

      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mode Query
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="preset"
              checked={queryMode === 'preset'}
              onChange={(e) => setQueryMode(e.target.value as 'preset' | 'custom')}
              className="mr-2"
            />
            <span className="text-sm">Preset Query</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="custom"
              checked={queryMode === 'custom'}
              onChange={(e) => setQueryMode(e.target.value as 'preset' | 'custom')}
              className="mr-2"
            />
            <span className="text-sm">Custom Query</span>
          </label>
        </div>
      </div>

      
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <div className="text-sm font-medium text-blue-800 mb-1">
          📊 Data Source (Auto-selected)
        </div>
        <div className="text-xs text-blue-700">
          {queryMode === 'preset' ? (
            <span>📈 <strong>Preset Query</strong> → Historical Data Only</span>
          ) : (
            <span>🔄 <strong>Custom Query</strong> → Real-time + Historical Data</span>
          )}
        </div>
      </div>

      
      {queryMode === 'preset' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preset Query AVEVA PI
          </label>
          <AvevaPIPresetDropdown
            presets={[
              
              ...presetQueries.filter(p => p.plugin === 'aveva-pi').map(p => ({
                id: p.id,
                name: `${p.name} - ${p.description}`,
                queryTemplate: p.query,
                variables: p.parameters || [],
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })),
              
              ...effectivePresets.map(p => ({
                ...p,
                name: `🔧 ${p.name} (Custom)`
              }))
            ]}
            selectedPresetId={formData.presetQueryId.startsWith('custom-') ? formData.presetQueryId.replace('custom-', '') : formData.presetQueryId}
            onPresetSelect={(preset) => {
              if (preset) {
                
                const presetId = preset.name.includes('(Custom)') 
                  ? `custom-${preset.id.replace('🔧 ', '').replace(' (Custom)', '')}`
                  : preset.id;
                handlePresetChange(presetId);
              } else {
                handlePresetChange('');
              }
            }}
            onPresetRename={onPresetRename}
            onPresetDelete={onPresetDelete}
            onPresetDuplicate={onPresetDuplicate}
            disabled={effectiveLoading}
          />
          {selectedPreset && (
            <div className="mt-2 text-sm text-gray-600">
              <div><strong>Kategori:</strong> {selectedPreset.category === 'time' ? 'Berdasarkan Waktu' : 'Data Terbaru'}</div>
              <div><strong>Query:</strong> {selectedPreset.query}</div>
            </div>
          )}
        </div>
      )}

      
      {queryMode === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Query AVEVA PI
          </label>
          
          <textarea
            value={customQuery}
            onChange={(e) => {
              setCustomQuery(e.target.value);
              onCustomQueryChange?.(); 
            }}
            placeholder={
              selectedConnection?.plugin === 'aveva-pi' && selectedConnection.config?.defaultTag
                ? `💡 Auto-fill tersedia! Contoh query untuk tag '${selectedConnection.config.defaultTag}':\n\nSELECT TOP 10 *\nFROM Point\nWHERE tag = '${selectedConnection.config.defaultTag}'\nORDER BY timestamp DESC;\n\nAtau gunakan format cepat:\n• latest (data terbaru)\n• 1h (1 jam terakhir)\n• 24h (24 jam terakhir)\n• custom:your_query (query kustom)`
                : "Masukkan custom query AVEVA PI:\n\n• latest (data terbaru)\n• 1h (1 jam terakhir) \n• 24h (24 jam terakhir)\n• custom:SELECT * FROM Point WHERE tag='your_tag' (query SQL lengkap)"
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          {isQueryAutoFilled && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Auto-filled
              </span>
              <span className="text-xs text-gray-500">Query di-generate otomatis berdasarkan data source yang dipilih</span>
            </div>
          )}
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Format: latest | 1h | 24h | custom:your_query
            </div>
          </div>

          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interval Data AVEVA PI <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.avevaPiInterval || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log('🎛️ [AVEVA PI FORM] DROPDOWN CHANGED - BEFORE:', formData.avevaPiInterval);
                console.log('🎛️ [AVEVA PI FORM] DROPDOWN CHANGED - NEW VALUE:', newValue);

                
                setFormData(prev => {
                  const updated = { ...prev, avevaPiInterval: newValue };
                  console.log('🎛️ [AVEVA PI FORM] DROPDOWN CHANGED - AFTER:', updated.avevaPiInterval);
                  return updated;
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option key="empty-interval" value="">-- Pilih Interval --</option>
              {avevaPiIntervals.map(interval => (
                <option key={interval.value} value={interval.value} title={interval.description}>
                  {interval.label} - {interval.description}
                </option>
              ))}
            </select>
            <div className="mt-1 text-sm text-gray-500">
              Interval pengambilan data dari AVEVA PI server
            </div>
            
            <div className="mt-1 text-xs text-blue-600">
              Current interval: {formData.avevaPiInterval || 'belum dipilih'}
            </div>

            <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
              <div className="font-medium mb-1 text-blue-800">ℹ️ Penting:</div>
              <div className="text-blue-700">• Interval tergantung pada konfigurasi tag di AVEVA PI server</div>
              <div className="text-blue-700">• Server mungkin tidak mendukung interval yang terlalu kecil</div>
              <div className="text-blue-700">• Jika interval tidak sesuai, periksa konfigurasi tag di AVEVA PI</div>
            </div>
          </div>



          
          <div className="mt-4 flex justify-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSavePresetModal(true)}
                disabled={!customQuery.trim() || !onPresetSave}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 Save as Preset
              </button>
              <button
                type="button"
                onClick={() => {
                  
                  if (!formData.avevaPiInterval) {
                    alert('Interval wajib dipilih! Pilih interval waktu (30s, 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d)');
                    return;
                  }

                  const intervalToSend = formData.avevaPiInterval;
                  console.log('🎯 [AVEVA PI FORM] ===== EXECUTE CUSTOM QUERY CLICKED =====');
                  console.log('🎯 [AVEVA PI FORM] Current formData.avevaPiInterval:', formData.avevaPiInterval);
                  console.log('🎯 [AVEVA PI FORM] intervalToSend (NO DEFAULT):', intervalToSend);
                  console.log('🎯 [AVEVA PI FORM] Custom query:', customQuery);
                  console.log('🎯 [AVEVA PI FORM] onExecuteCustomQuery exists:', !!onExecuteCustomQuery);

                  if (onExecuteCustomQuery) {
                    onExecuteCustomQuery(intervalToSend);
                    console.log('🎯 [AVEVA PI FORM] onExecuteCustomQuery called successfully');
                  } else {
                    console.error('🎯 [AVEVA PI FORM] onExecuteCustomQuery is undefined!');
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              >
                Execute Custom Query
              </button>
            </div>
          </div>
        </div>
      )}

      
      {queryMode === 'preset' && selectedPreset?.requiresTag && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tag AVEVA PI
            {selectedConnection?.config?.defaultTag && (
              <span className="text-xs text-blue-600 ml-2">
                (Otomatis terisi dari data source)
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.tag}
              onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
              onFocus={() => setShowTagDropdown(true)}
              placeholder={
                selectedConnection?.config?.defaultTag
                  ? `Otomatis: ${selectedConnection.config.defaultTag} (dapat diubah)`
                  : "Pilih atau ketik tag AVEVA PI..."
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showTagDropdown && availableTags.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {tagLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Loading tags...</div>
                ) : (
                  availableTags.map(tag => (
                    <div
                      key={tag}
                      onClick={() => selectTag(tag)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {tag}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {availableTags.length === 0 && !tagLoading && (
            <div className="mt-1 text-sm text-gray-500">
              Tidak ada tag tersedia. Pastikan data source AVEVA PI sudah dikonfigurasi dengan benar.
            </div>
          )}
        </div>
      )}

      
      {queryMode === 'preset' && selectedPreset && 'directUrl' in selectedPreset && selectedPreset.directUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Direct URL AVEVA PI
          </label>
          <input
            type="url"
            value={formData.directUrl || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, directUrl: e.target.value }))}
            placeholder="https://aveva-pi-server/piwebapi/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-1 text-sm text-gray-500">
            URL lengkap ke endpoint AVEVA PI Web API
          </div>
        </div>
      )}

      
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-sm text-red-800 font-medium">Error Validasi:</div>
          <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      
      {testResult && !testResult.loading && (testResult.data || testResult.error) && (
        <div className="border border-gray-200 rounded p-3">
          <h5 className="text-sm font-semibold text-gray-900 mb-2">📊 Hasil Test Query:</h5>
          {testResult.error ? (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <p className="text-sm text-red-800">❌ {testResult.error}</p>
            </div>
          ) : (
            <div className="space-y-3">
              
              {testResult.data?.metadata?.isDualQuery && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                  <div className="font-medium mb-2 text-blue-800">
                    🔄 Dual Query Results:
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-medium text-blue-700">Real-Time Data:</div>
                      <div className="text-blue-600">
                        {testResult.data.metadata.realTimeCount || 0} records
                      </div>
                      <div className="text-blue-500">
                        Interval: {testResult.data.metadata.realTimeInfo?.interval || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-green-700">Historical Data:</div>
                      <div className="text-green-600">
                        {testResult.data.metadata.historicalCount || 0} records
                      </div>
                      <div className="text-green-500">
                        Interval: {testResult.data.metadata.historicalInfo?.interval || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-blue-700">
                    Total: {testResult.data.metadata.totalCount || 0} records
                  </div>
                </div>
              )}

              
              {testResult.data?.metadata?.intervalInfo && (
                <div className={`p-3 rounded text-sm ${
                  testResult.data.metadata.intervalInfo.match
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="font-medium mb-1">
                    ⏱️ Interval Information:
                  </div>
                  <div className="space-y-1">
                    <div>Requested: <span className="font-mono">{testResult.data.metadata.intervalInfo.requested}</span></div>
                    <div>Actual: <span className="font-mono">{testResult.data.metadata.intervalInfo.actual}</span></div>
                    <div>Status: {
                      testResult.data.metadata.intervalInfo.match
                        ? <span className="text-green-600 font-medium">✅ Match</span>
                        : <span className="text-yellow-600 font-medium">⚠️ Mismatch</span>
                    }</div>
                    {testResult.data.metadata.intervalInfo.warning && (
                      <div className="text-yellow-700 text-xs mt-2 p-2 bg-yellow-100 rounded">
                        ⚠️ {testResult.data.metadata.intervalInfo.warning}
                      </div>
                    )}
                  </div>
                </div>
              )}

              
              <div className="bg-green-50 border border-green-200 rounded p-2 max-h-40 overflow-y-auto">
                <div className="text-xs text-green-800 mb-2">
                  📊 Data Records ({testResult.data?.data?.length || 0} total):
                </div>
                <pre className="text-xs text-green-800 whitespace-pre-wrap">
                  {JSON.stringify(testResult.data?.data?.map((record: any, index: number) => ({
                    ...record,
                    _queryType: record.queryType || (index === 0 && testResult.data?.metadata?.isDualQuery ? 'real-time' : 'historical')
                  })) || testResult.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      
      {showSavePresetModal && (
        <Modal
          title="💾 Save as Preset"
          onClose={() => {
            setShowSavePresetModal(false);
            setPresetName('');
          }}
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                disabled={savingPreset}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim() || savingPreset}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPreset ? '💾 Saving...' : '💾 Save Preset'}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preset Name
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="e.g., Power Monitor Query"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && presetName.trim()) handleSavePreset();
                  if (e.key === 'Escape') {
                    setShowSavePresetModal(false);
                    setPresetName('');
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Preview
              </label>
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200 text-sm font-mono text-gray-800 max-h-32 overflow-y-auto">
                {(() => {
                  let preview = customQuery.trim();
                  if (selectedConnection?.config?.defaultTag) {
                    const tagRegex = new RegExp(selectedConnection.config.defaultTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    preview = preview.replace(tagRegex, '{tag}');
                  }
                  return preview;
                })()}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {selectedConnection?.config?.defaultTag
                  ? `Tag '${selectedConnection.config.defaultTag}' akan diganti dengan {tag} placeholder`
                  : 'Template akan menggunakan tag dari data source yang dipilih'
                }
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
