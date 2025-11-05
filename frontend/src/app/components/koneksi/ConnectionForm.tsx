"use client";

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Props = {
  initial?: any;
  onSaved?: (item: any) => void;
  onResponse?: (resp: { type: 'info' | 'success' | 'error'; message: string }) => void;
  onCancel?: () => void;
};

type DatabaseSchema = {
  name: string;
  description: string;
  icon: string;
  category: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    description?: string;
    default?: any;
    min?: number;
    max?: number;
    dependsOn?: string;
  }>;
  validation?: Record<string, any>;
  testConnection?: boolean;
  discoverSchema?: boolean;
  supportedFeatures?: string[];
};

type DatabaseConfigFormProps = {
  schema: DatabaseSchema;
  formData: Record<string, any>;
  onFieldChange: (fieldName: string, value: any) => void;
};

function DatabaseConfigForm({ schema, formData, onFieldChange }: DatabaseConfigFormProps) {
  const renderField = (field: DatabaseSchema['fields'][0]) => {
    const value = formData[field.name] ?? field.default ?? '';
    const isRequired = field.required || false;

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={value}
                onChange={(e) => onFieldChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={field.placeholder}
                rows={3}
              />
            ) : (
                            <input
                type="text"
                value={value}
                onChange={(e) => onFieldChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={field.placeholder}
                minLength={field.min}
                maxLength={field.max}
              />
            )}
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => onFieldChange(field.name, e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'password':
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="password"
              value={value}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={field.name}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => onFieldChange(field.name, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {field.label}
              </span>
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      case 'select':
        
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={field.placeholder}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
          </div>
        );
    }
  };

  
  const groupedFields = schema.fields.reduce((acc, field) => {
    const group = (field as any).group || 'basic';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, DatabaseSchema['fields']>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedFields).map(([groupName, fields]) => (
        <div key={groupName} className="space-y-4">
          {groupName !== 'basic' && (
            <h5 className="text-sm font-medium text-gray-800 capitalize">
              {groupName.replace(/([A-Z])/g, ' $1').trim()}
            </h5>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(renderField)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConnectionForm({ initial, onSaved, onCancel, onResponse }: Props) {
  
  const generateId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `conn-${timestamp}-${random}`;
  };

  const [id, setId] = useState(initial?.id || generateId());
  const [name, setName] = useState(initial?.name || '');
  const [plugin, setPlugin] = useState(initial?.plugin || '');
  const [databaseType, setDatabaseType] = useState(initial?.databaseType || '');

 
  const [databaseSchemas, setDatabaseSchemas] = useState<Record<string, DatabaseSchema>>({});
  const [loadingSchemas, setLoadingSchemas] = useState(false);

  
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    return initial?.config || {};
  });

  
  const cfg = initial?.config || {};
  const [host, setHost] = useState(cfg.host || '');
  const [port, setPort] = useState(cfg.port ? String(cfg.port) : '');
  const [user, setUser] = useState(cfg.user || cfg.username || '');
  const [password, setPassword] = useState(cfg.password || '');
  const [database, setDatabase] = useState(cfg.database || cfg.db || '');
  const [extra, setExtra] = useState<Array<{ key: string; value: string }>>(() => {
    const leftovers: Array<{ key: string; value: string }> = [];
    Object.keys(cfg).forEach((k) => {
      if (!['host', 'port', 'user', 'username', 'password', 'database', 'db'].includes(k)) {
        try { leftovers.push({ key: k, value: String((cfg as any)[k]) }); } catch { }
      }
    });
    return leftovers;
  });

  
  const [avevaUrl, setAvevaUrl] = useState(() => {
    
    if (cfg.url || cfg.endpoint) {
      return cfg.url || cfg.endpoint;
    }
    
    if (cfg.host && cfg.port) {
      const protocol = cfg.protocol || 'http';
      return `${protocol}://${cfg.host}:${cfg.port}`;
    }
    return '';
  });

  const [testUrlLoading, setTestUrlLoading] = useState(false);
  const [testUrlResult, setTestUrlResult] = useState<string | null>(null);
  const [testUrlError, setTestUrlError] = useState<string | null>(null);
  const [testDbLoading, setTestDbLoading] = useState(false);
  const [testDbResult, setTestDbResult] = useState<any | null>(null);
  const [testDbError, setTestDbError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  const loadDatabaseSchemas = async () => {
    try {
      setLoadingSchemas(true);
      const response = await apiFetch('/api/database/schemas');
      if (response.schemas) {
        setDatabaseSchemas(response.schemas);
      }
    } catch (err: any) {
      console.error('Failed to load database schemas:', err);
    
    } finally {
      setLoadingSchemas(false);
    }
  };

  
  const getAvailableDatabaseTypes = () => {
    return Object.keys(databaseSchemas);
  };

  
  const getCurrentSchema = (): DatabaseSchema | null => {
    return databaseSchemas[databaseType] || null;
  };


  const handleDatabaseTypeChange = (newType: string) => {
    setDatabaseType(newType);
    setPlugin('database'); 

    
    setFormData({});

    
    const schema = databaseSchemas[newType];
    if (schema) {
      const defaults: Record<string, any> = {};
      schema.fields.forEach(field => {
        if (field.default !== undefined) {
          defaults[field.name] = field.default;
        }
      });
      setFormData(defaults);
    }
  };

  
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  
  const getRequiredFields = (pluginType: string) => {
    switch (pluginType) {
      case 'aveva-pi':
        return ['host', 'port'];
      default:
        return ['host', 'port'];
    }
  };

  const getOptionalFields = (pluginType: string) => {
    switch (pluginType) {
      case 'aveva-pi':
        return ['protocol', 'timeout', 'maxRetries'];
      default:
        return [];
    }
  };

 
  const getDefaultPort = (dbType: string) => {
    switch (dbType) {
      case 'mysql':
        return 3306;
      case 'oracle':
        return 1521;
      case 'sqlserver':
        return 1433;
      default:
        return 3306;
    }
  };

  
  const canTestDatabase = () => {
    
    if (plugin === 'database' && databaseType) {
      const requiredFields = ['host', 'user'];
      if (databaseType === 'oracle') {
        requiredFields.push('service');
      } else {
        requiredFields.push('database');
      }

      return requiredFields.every(field => {
        if (field === 'host') return formData.host;
        if (field === 'user') return formData.user || formData.username;
        if (field === 'database') return formData.database || formData.db;
        if (field === 'service') return formData.service;
        return formData[field];
      });
    }

    return false;
  };

  const requiredFields = getRequiredFields(plugin);
  const optionalFields = getOptionalFields(plugin);

  
  const handleAvevaUrlChange = (url: string) => {
    setAvevaUrl(url);

   
    if (url && url.trim()) {
      const urlMatch = url.match(/tag=([^&]+)/);
      if (urlMatch && urlMatch[1]) {
        
        setFormData(prev => ({
          ...prev,
          defaultTag: urlMatch[1]
        }));
        console.log(`✅ Auto-extracted defaultTag from URL: ${urlMatch[1]}`);
      }
    }
  };

  useEffect(() => {
    
    loadDatabaseSchemas();

    
    if (initial?.id) {
      setId(initial.id);
    } else {
      
      setId(generateId());
    }

    setName(initial?.name || '');
    setPlugin(initial?.plugin || '');
    setDatabaseType(initial?.databaseType || '');

    const cfg2 = initial?.config || {};

    
    if (initial?.plugin === 'database') {
      setDatabaseType(initial.databaseType || '');
      setFormData(cfg2);
    } else {
      
      setHost(cfg2.host || '');
      setPort(cfg2.port ? String(cfg2.port) : '');
      setUser(cfg2.user || cfg2.username || '');
      setPassword(cfg2.password || '');
      setDatabase(cfg2.database || cfg2.db || '');

      
      if (initial?.plugin === 'aveva-pi') {

        if (cfg2.url || cfg2.endpoint) {
          setAvevaUrl(cfg2.url || cfg2.endpoint);
        } else if (cfg2.host && cfg2.port) {
          const protocol = cfg2.protocol || 'http';
          setAvevaUrl(`${protocol}://${cfg2.host}:${cfg2.port}`);
        }
      }

      
      const leftovers: Array<{ key: string; value: string }> = [];
      Object.keys(cfg2).forEach((k) => {
        if (!['host', 'port', 'user', 'username', 'password', 'database', 'db'].includes(k)) {
          try { leftovers.push({ key: k, value: String((cfg2 as any)[k]) }); } catch { }
        }
      });
      setExtra(leftovers);
    }
  }, [initial]);  const payloadPreview = React.useMemo(() => {
    let parsedConfig: any = {};
    
    if (plugin === 'aveva-pi' && avevaUrl) {
      parsedConfig.url = avevaUrl;
      parsedConfig.endpoint = avevaUrl;

    } else {
      
      if (host) parsedConfig.host = host;
      if (port) parsedConfig.port = Number(port);
      if (user) parsedConfig.user = user;
      if (password) parsedConfig.password = password;
      if (database) parsedConfig.database = database;
    }
    extra.forEach((e) => { if (e.key) parsedConfig[e.key] = tryParseValue(e.value); });

    
    if (plugin === 'aveva-pi' && avevaUrl) {
      parsedConfig.url = avevaUrl;
      parsedConfig.endpoint = avevaUrl;
    }

    
    const connectionId = id || generateId();
    const payload = { id: connectionId, name, plugin, config: parsedConfig };
    const method = initial ? 'PUT' : 'POST';
    const path = initial ? `/api/data-sources/${encodeURIComponent(connectionId)}` : '/api/data-sources';
    return { method, path, payload };
  }, [initial, host, port, user, password, database, extra, id, name, plugin, avevaUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    
    if (!plugin) {
      setError('Silakan pilih plugin terlebih dahulu');
      return;
    }

    if (plugin === 'database' && !databaseType) {
      setError('Silakan pilih tipe database');
      return;
    }

    if (!name || name.trim() === '') {
      setError('Silakan masukkan nama koneksi');
      return;
    }

    
    let connectionId = id;
    if (!connectionId || connectionId.trim() === '') {
      connectionId = generateId();
      setId(connectionId);
    }


    let finalName = name;
    if (!finalName || finalName.trim() === '') {
      finalName = initial?.name || `Connection ${connectionId}`;
    }

    let parsedConfig: any = {};

    
    if (plugin === 'database' && databaseType) {
      parsedConfig = { ...formData };
      
      parsedConfig.databaseType = databaseType;
    } else {
      
      if (plugin === 'aveva-pi' && avevaUrl) {
        parsedConfig.url = avevaUrl;
        parsedConfig.endpoint = avevaUrl;
        
      } else {
        
        if (host) parsedConfig.host = host;
        if (port) parsedConfig.port = Number(port);
        if (user) parsedConfig.user = user;
        if (password) parsedConfig.password = password;
        if (database) parsedConfig.database = database;
      }
      extra.forEach((e) => { if (e.key) parsedConfig[e.key] = tryParseValue(e.value); });

      
      if (plugin === 'aveva-pi' && avevaUrl) {
        parsedConfig.url = avevaUrl;
        parsedConfig.endpoint = avevaUrl; 

        if (formData.defaultTag) {
          parsedConfig.defaultTag = formData.defaultTag;
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        id: connectionId,
        name: finalName,
        plugin,
        ...(plugin === 'database' && databaseType && { databaseType }),
        config: parsedConfig
      };
      const method = initial ? 'PUT' : 'POST';
      const path = initial ? `/api/data-sources/${encodeURIComponent(connectionId)}` : '/api/data-sources';
      const res = await apiFetch(path, { method, body: JSON.stringify(payload) });
      const savedItem = res?.dataSource || { id: connectionId, name: finalName, plugin, config: parsedConfig };
      console.log('Save result:', { res, payload, savedItem, connectionId, finalName, initialName: initial?.name });
      onSaved && onSaved(savedItem);
      onResponse && onResponse({ type: 'success', message: `Koneksi tersimpan: ${connectionId}` });
    } catch (err: any) {
      const msg = err.message || 'Gagal menyimpan koneksi';
      setError(msg);
      onResponse && onResponse({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }

  function tryParseValue(v: string) {
    
    if (!v) return v;
    if (/^-?\d+$/.test(v)) return Number(v);
    if (/^-?\d+\.\d+$/.test(v)) return Number(v);
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    return v;
  }

  function addExtra() {
    setExtra((s) => [...s, { key: '', value: '' }]);
  }

  function updateExtra(idx: number, key: string, value: string) {
    setExtra((s) => s.map((it, i) => i === idx ? { key, value } : it));
  }

  function removeExtra(idx: number) {
    setExtra((s) => s.filter((_, i) => i !== idx));
  }

    async function handleTestUrl() {
    if (!avevaUrl) return;

    setTestUrlLoading(true);
    setTestUrlError(null);
    setTestUrlResult(null);

    try {
      const data = await apiFetch('/api/test-aveva-url', {
        method: 'POST',
        body: JSON.stringify({ url: avevaUrl }),
      });

      setTestUrlResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestUrlError(err.message || 'Unknown error occurred');
    } finally {
      setTestUrlLoading(false);
    }
  }

  async function handleTestDatabase() {
    if (!canTestDatabase()) return;

    setTestDbLoading(true);
    setTestDbError(null);
    setTestDbResult(null);

    try {
      let tempConfig: any;

      
      if (plugin === 'database' && databaseType) {
        tempConfig = {
          id: `temp-${Date.now()}`,
          plugin: 'database',
          name: 'Test Connection',
          databaseType, 
          config: {
            ...formData,
            driver: databaseType, 
            
            port: formData.port || getDefaultPort(databaseType)
          }
        };
      } else {
        throw new Error('Unsupported plugin type for database testing');
      }

      
      const createResult = await apiFetch('/api/data-sources', {
        method: 'POST',
        body: JSON.stringify(tempConfig),
      });

      if (createResult.success) {
        
        const testResult = await apiFetch(`/api/data-sources/${createResult.dataSource.id}/test`, {
          method: 'POST',
          body: JSON.stringify({ preview: true }),
        });

        
        if (testResult.preview) {
          
          setTestDbResult(testResult.preview);
        } else if (testResult.success) {
          
          setTestDbResult({
            database: formData.database || database || 'Unknown',
            tables: [],
            message: `✅ Connection successful! Preview not available for ${databaseType || 'this database type'}.`,
            supported: false
          });
        } else {
          
          setTestDbError(testResult.message || 'Connection test failed');
        }

        
        try {
          await apiFetch(`/api/data-sources/${createResult.dataSource.id}`, {
            method: 'DELETE',
          });
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary connection:', cleanupError);
        }
      } else {
        throw new Error(createResult.error || 'Failed to create test connection');
      }
    } catch (err: any) {
      setTestDbError(err.message || 'Unknown error occurred');
    } finally {
      setTestDbLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {initial && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-amber-800">Mode Edit</span>
          </div>
          <p className="text-sm text-amber-700 mt-1">Anda sedang mengedit koneksi: <strong className="font-semibold">{initial.id}</strong></p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-800">Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuration Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Panduan Konfigurasi</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            {plugin === 'database' && databaseType && (
              <>
                <li>• <strong>{databaseSchemas[databaseType]?.name || databaseType}:</strong> Konfigurasi database enterprise</li>
                <li>• <strong>Koneksi Aman:</strong> Mendukung SSL/TLS encryption</li>
                <li>• <strong>Connection Pooling:</strong> Optimasi performa dengan pooling</li>
                <li>• <strong>Auto-discovery:</strong> Deteksi otomatis tabel dan schema</li>
              </>
            )}
            {plugin === 'aveva-pi' && (
              <>
                <li>• <strong>AVEVA PI System:</strong> Input URL lengkap dengan parameter yang diinginkan</li>
                <li>• <strong>Format Lengkap:</strong> http://server.com:port/pi/trn?tag=NAMA_TAG&interval=30m&start=2025-01-01&end=2025-01-02</li>
                <li>• <strong>Test As-Is:</strong> Sistem akan test URL persis seperti yang Anda input, tanpa mengubah parameter</li>
                <li>• <strong>Data Preview:</strong> Anda akan melihat data dari tag dan parameter yang Anda tentukan</li>
              </>
            )}
            {!plugin && (
              <>
                <li>• <strong>Pilih plugin dulu:</strong> Universal Database atau AVEVA PI System</li>
                <li>• <strong>Universal Database:</strong> Mendukung MySQL, Oracle dengan fitur enterprise</li>
                <li>• <strong>AVEVA PI:</strong> Hanya butuh server address</li>
              </>
            )}
            <li>• <strong>Pengaturan Tambahan:</strong> Parameter khusus plugin seperti timeout, connectionLimit</li>
          </ul>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              placeholder="contoh: mysql-prod"
              readOnly={!initial} 
            />
            <p className="text-xs text-gray-500 mt-1">
              {initial ? 'ID unik untuk koneksi ini' : 'ID otomatis di-generate untuk koneksi baru'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contoh: Production Database"
            />
            <p className="text-xs text-gray-500 mt-1">Nama deskriptif koneksi</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plugin</label>
          <select
            value={plugin || ''}
            onChange={(e) => setPlugin(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option key="empty-plugin" value="">Pilih plugin...</option>
            <option key="database" value="database">Universal Database (MySQL, Oracle)</option>
            <option key="aveva-pi" value="aveva-pi">AVEVA PI System</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Jenis data source yang akan digunakan</p>
        </div>

        
        {plugin === 'database' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
            <select
              value={databaseType || ''}
              onChange={(e) => handleDatabaseTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option key="empty-database-type" value="">Pilih tipe database...</option>
              {getAvailableDatabaseTypes().map(type => (
                <option key={type} value={type}>
                  {databaseSchemas[type]?.name || type}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Pilih jenis database yang akan digunakan</p>
          </div>
        )}

        
        {plugin && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-3">
              Konfigurasi {plugin === 'database' ? (databaseSchemas[databaseType]?.name || 'Database') : 'AVEVA PI'}
            </h4>

            
            {plugin === 'database' && databaseType && getCurrentSchema() && (
              <>
                <DatabaseConfigForm
                  schema={getCurrentSchema()!}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                />

                
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={!canTestDatabase() || testDbLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {testDbLoading ? 'Testing Database...' : 'Test Database'}
                  </button>
                  <p className="text-xs text-gray-500 self-center">Test koneksi dan lihat struktur database</p>
                </div>

                
                {(testDbResult || testDbError) && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">Database Preview:</h5>
                    <div className="bg-gray-100 border border-gray-300 rounded-md p-3 max-h-96 overflow-auto">
                      {testDbError ? (
                        <div className="text-red-600">
                          <strong>Error:</strong> {testDbError}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {testDbResult && testDbResult.message ? (
                            
                            <div className="text-green-600">
                              <strong>✅ {testDbResult.message}</strong>
                            </div>
                          ) : testDbResult && testDbResult.tables && testDbResult.tables.length > 0 ? (
                            <>
                              <div className="text-sm text-gray-700">
                                <strong>Database:</strong> {testDbResult.database} | <strong>Total Tables:</strong> {testDbResult.tables.length}
                              </div>
                              <div className="space-y-2">
                                {testDbResult.tables.map((table: any, index: number) => (
                                  <div key={index} className="bg-white border border-gray-200 rounded p-3">
                                    <div className="font-medium text-gray-800 mb-1">
                                      📋 {table.name} ({table.rowCount} rows)
                                    </div>
                                    {table.columns && table.columns.length > 0 && (
                                      <div className="text-xs text-gray-600">
                                        <strong>Columns:</strong> {table.columns.map((col: any) => `${col.name} (${col.type})`).join(', ')}
                                      </div>
                                    )}
                                    {table.sampleData && table.sampleData.length > 0 && (
                                      <div className="mt-2">
                                        <div className="text-xs text-gray-600 mb-1"><strong>Sample Data:</strong></div>
                                        <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
                                          {JSON.stringify(table.sampleData.slice(0, 3), null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-600">
                              <strong>No tables found or database is empty.</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            
            {plugin === 'aveva-pi' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AVEVA PI Server URL</label>
                <div className="flex gap-2">
                  <input
                    value={avevaUrl || ''}
                    onChange={(e) => handleAvevaUrlChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="http://aveva-server.com:6066/pi/trn?tag=YOUR_TAG&interval=30m&start=2025-01-01&end=2025-01-02"
                  />
                  <button
                    type="button"
                    onClick={handleTestUrl}
                    disabled={!avevaUrl || testUrlLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Test URL
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">URL lengkap server AVEVA PI dengan parameter yang diinginkan. Sistem akan test URL ini apa adanya tanpa mengubah parameter.</p>

                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default AVEVA PI Tag
                    {formData.defaultTag && <span className="text-green-600 text-xs ml-2">✅ Auto-extracted</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.defaultTag || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultTag: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tag akan di-extract otomatis dari URL di atas"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tag AVEVA PI yang akan digunakan sebagai default. Sistem akan otomatis extract dari URL di atas, atau Anda bisa input manual.
                  </p>
                </div>

                
                {(testUrlResult || testUrlError) && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">Test URL Results:</h5>
                    <div className="bg-gray-100 border border-gray-300 rounded-md p-3 max-h-64 overflow-auto">
                      {testUrlError ? (
                        <div className="text-red-600 space-y-2">
                          <div><strong>❌ Error:</strong> {testUrlError}</div>
                          {(testUrlResult as any)?.troubleshooting && (
                            <div>
                              <strong>🔧 Troubleshooting Tips:</strong>
                              <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                                {(testUrlResult as any).troubleshooting.map((tip: string, index: number) => (
                                  <li key={index}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(testUrlResult as any)?.test?.url && (
                            <div><strong>🔗 URL Tested:</strong> {(testUrlResult as any).test.url}</div>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800">
                          {testUrlResult}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        
        {initial && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-800">Pengaturan Tambahan (Opsional)</h4>
            </div>
            <p className="text-xs text-gray-600 mb-3">Parameter konfigurasi tambahan untuk plugin tertentu, seperti connectionLimit, timeout, dll.</p>

            <div className="space-y-2">
              {extra.map((e, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={e.key || ''}
                    onChange={(ev) => updateExtra(i, ev.target.value, e.value)}
                    placeholder="contoh: connectionLimit"
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    value={e.value || ''}
                    onChange={(ev) => updateExtra(i, e.key, ev.target.value)}
                    placeholder="contoh: 10"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
                    onClick={() => removeExtra(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="px-4 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                onClick={addExtra}
              >
                + Tambah Parameter
              </button>
            </div>
          </div>
        )}

        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-800 mb-1">Preview Request</h4>
            <p className="text-xs text-gray-600">Data yang akan dikirim ke backend</p>
          </div>

          <div className="bg-white border border-gray-300 rounded-md p-3 mb-4 max-h-64 overflow-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-800">
              {JSON.stringify(payloadPreview, null, 2)}
            </pre>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Menyimpan…' : 'Simpan Koneksi'}
            </button>
            <button
              type="button"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              onClick={onCancel}
            >
              Batal
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
