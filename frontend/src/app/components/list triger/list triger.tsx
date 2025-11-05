'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import Modal from '../ui/Modal';
import AvevaPITriggerForm from './aveva-pi/AvevaPITriggerForm';
import TriggerGroupsManager from './group/TriggerGroupsManager';
import MySQLTriggerForm from './mysql/MySQLTriggerForm';
import OracleTriggerForm from './oracle/OracleTriggerForm';

interface Trigger {
  id: string;
  name: string;
  dataSource: string;
  description: string;
  type: string;
  aliases: string[];
  active?: boolean;
  source?: string;
  dataSourceExists?: boolean;
  groupId?: string; // Add groupId property
}

interface DataSource {
  id: string;
  name: string;
  plugin: string;
  databaseType?: string;
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
  databaseType?: string;
  directUrl?: string;
  sqlMode?: boolean;
  variables?: string[]; // Add variables property for AVEVA PI presets
}

interface TriggerFormData {
  name: string;
  dataSourceId: string;
  presetQueryId: string;
  tag: string;
  description: string;
  type: string;
  active: boolean;
  directUrl?: string;
  groupId?: string; // Add groupId to form data
  // AVEVA PI custom fields
  avevaPiInterval?: string;
  avevaPiLimit?: number;
  // Temporary: Keep database fields for backward compatibility
  selectedTable: string;
  availableTables: string[];
  availableColumns: string[];
  selectedSortColumn: string;
}

interface TriggerGroup {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  triggerCount?: number;
  groupName?: string;
}

// Union type for combined display
type DisplayItem = (Trigger & { type: 'trigger'; groupName?: string; priority?: string; createdAt?: string }) | (TriggerGroup & { type: 'group' });

export default function ListTriger() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [groups, setGroups] = useState<TriggerGroup[]>([]);
  const [connections, setConnections] = useState<DataSource[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Trigger | null>(null);
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    data: any;
    error: string | null;
  }>({ loading: false, data: null, error: null });
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' | 'warning' } | null>(null);
  const notificationIdRef = useRef(0);
  const [notificationTimeLeft, setNotificationTimeLeft] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // AVEVA PI specific states
  const [avevaPiValidation, setAvevaPiValidation] = useState<{
    isValid: boolean;
    errors: string[];
  }>({ isValid: true, errors: [] });
  // Helper to compare validation arrays to avoid unnecessary parent state updates
  const arraysEqual = (a: string[] = [], b: string[] = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  // Stable handler passed to child form to avoid causing parent state updates on every render
  const handleAvevaPiValidationChange = useCallback((isValid: boolean, errors: string[]) => {
    setAvevaPiValidation(prev => {
      if (prev.isValid === isValid && arraysEqual(prev.errors, errors)) {
        return prev; // No change, keep previous reference
      }
      return { isValid, errors };
    });
  }, []);
  const [generatedQuery, setGeneratedQuery] = useState<string>('');

  // AVEVA PI Preset states
  const [avevaPiPresets, setAvevaPiPresets] = useState<AvevaPIPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // === CUSTOM QUERY STATE MANAGEMENT ===
  const [customQuery, setCustomQuery] = useState('');
  const [queryMode, setQueryMode] = useState<'preset' | 'custom'>('preset');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [isQueryAutoFilled, setIsQueryAutoFilled] = useState(false);
  const previousDataSourceIdRef = useRef<string>('');
  const hasAutoFilledTagRef = useRef<boolean>(false);
  const hasLoadedInitialDataRef = useRef(false);


  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      setNotificationTimeLeft(3);
      setIsHiding(false);

      const hideTimer = setTimeout(() => {
        setIsHiding(true);
        setTimeout(() => {
          setNotification(null);
          setNotificationTimeLeft(0);
          setIsHiding(false);
        }, 300); // Wait for fade-out animation
      }, 2700); // Start fade-out 300ms before complete hide

      const countdownTimer = setInterval(() => {
        setNotificationTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(hideTimer);
        clearInterval(countdownTimer);
      };
    }
  }, [notification]);

  // Filter triggers based on search term
  const filteredTriggers = useMemo(() => triggers.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.dataSource?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [triggers, searchTerm]);

  // Filter groups based on search term
  const filteredGroups = useMemo(() => groups.filter(g =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [groups, searchTerm]);

  // Combine triggers and groups for unified display
  const combinedData: DisplayItem[] = useMemo(() => [
    ...filteredTriggers.map(trigger => ({
      ...trigger,
      type: 'trigger' as const,
      originalId: trigger.id, // Preserve original ID for API calls
      id: trigger.name,
      groupName: groups.find(g => g.triggers.includes(trigger.name))?.name || 'None',
      priority: 'Normal', // Default priority since Trigger interface doesn't have it
      createdAt: undefined // Triggers don't have createdAt
    })),
    ...filteredGroups.map(group => ({
      ...group,
      type: 'group' as const,
      triggerCount: group.triggers.length
    }))
  ], [filteredTriggers, filteredGroups, groups]);

  // Pagination logic for combined data
  const displayData = useMemo(() => 
    showAll ? combinedData : combinedData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    ), [showAll, combinedData, currentPage, itemsPerPage]
  );
  const totalPages = useMemo(() => 
    showAll ? 1 : Math.ceil(combinedData.length / itemsPerPage),
    [showAll, combinedData.length, itemsPerPage]
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage, showAll]);

  // Load AVEVA PI presets on component mount
  useEffect(() => {
    console.log('🔄 useEffect: Loading AVEVA PI presets...');
    const loadPresets = async () => {
      try {
        setPresetsLoading(true);
        console.log('📡 Calling API: /api/aveva-pi-presets');
        const data = await apiFetch('/api/aveva-pi-presets');
        console.log('📡 API Response data:', data);
        console.log('📡 Presets array:', data?.presets);
        setAvevaPiPresets(data?.presets || []);
        console.log('✅ Set avevaPiPresets to:', (data?.presets || []).length, 'presets');
        // Force re-render by triggering state update
        setTimeout(() => {
          console.log('🔄 Force re-render check - avevaPiPresets length:', avevaPiPresets.length);
        }, 0);
      } catch (error) {
        console.error('❌ Failed to load AVEVA PI presets:', error);
        console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      } finally {
        setPresetsLoading(false);
        console.log('🏁 Finished loading presets, presetsLoading set to false');
      }
    };

    loadPresets();
  }, []); // Empty dependency array

  // Form states
  const [formData, setFormData] = useState<TriggerFormData>({
    name: '',
    dataSourceId: '',
    presetQueryId: '',
    tag: '',
    description: '',
    type: 'query',
    active: true,
    groupId: '',
    avevaPiInterval: '1h', // Default interval for AVEVA PI
    avevaPiLimit: 5, // Default limit for AVEVA PI
    // Temporary: Initialize database fields for backward compatibility
    selectedTable: '',
    availableTables: [],
    availableColumns: [],
    selectedSortColumn: ''
  });

  // Guarded auto-fill: populate `customQuery` automatically for AVEVA PI when switching
  // into custom mode and the data source has a defaultTag. This runs once per dataSource
  // and won't overwrite user-typed queries. Uses refs to avoid infinite loops.
  useEffect(() => {
    try {
      if (queryMode !== 'custom') return;

      const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
      if (!selectedConnection || selectedConnection.plugin !== 'aveva-pi') return;

      // If user already typed a custom query, do not overwrite
      if (customQuery && customQuery.trim().length > 0) return;

      // If we've already auto-filled for this dataSource, skip
      if (hasAutoFilledTagRef.current && previousDataSourceIdRef.current === formData.dataSourceId) return;

      const defaultTag = selectedConnection.config?.defaultTag;
      if (!defaultTag) return;

      const autoQ = `SELECT TOP 10 *\nFROM Point\nWHERE tag = '${defaultTag}'\nORDER BY timestamp DESC;`;
      setCustomQuery(autoQ);
      setIsQueryAutoFilled(true);
      hasAutoFilledTagRef.current = true;
      previousDataSourceIdRef.current = formData.dataSourceId;
      console.log('🪄 Auto-filled customQuery for AVEVA PI dataSource', formData.dataSourceId);
    } catch (err) {
      console.warn('Auto-fill effect error:', err);
    }
  // Only run when switching to custom mode or when the selected data source changes
  }, [queryMode, formData.dataSourceId, connections, customQuery]);

  // MySQL specific states
  const [mysqlValidation, setMysqlValidation] = useState({ isValid: true, errors: [] as string[] });
  const [mysqlQueryData, setMysqlQueryData] = useState({ table: '', sortColumn: '' });

  // Oracle specific states (temporary until OracleTriggerForm is updated)
  const [oracleValidation, setOracleValidation] = useState({ isValid: true, errors: [] as string[] });
  const [oracleQueryData, setOracleQueryData] = useState({ table: '', sortColumn: '' });

  // Helper: remove empty 'units' properties from result objects (recursive)
  const stripEmptyUnits = (input: any): any => {
    if (Array.isArray(input)) {
      return input.map(stripEmptyUnits);
    }
    if (input && typeof input === 'object') {
      const out: any = {};
      for (const key of Object.keys(input)) {
        const val = (input as any)[key];
        if (key === 'units') {
          if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
            continue;
          }
        }
        out[key] = stripEmptyUnits(val);
      }
      return out;
    }
    return input;
  };

  // Load available tables for database connection
  const loadDatabaseTables = async (dataSourceId: string) => {
    try {
      const result = await apiFetch(`/api/data-sources/${dataSourceId}/tables`);

      // ✅ FIX: Update formData state for all database types (MySQL, Oracle, etc.)
      setFormData(prev => ({
        ...prev,
        availableTables: result.tables || [],
        selectedTable: (result.tables || []).length === 1 ? result.tables[0] : '',
        availableColumns: [], // Reset columns when table list changes
        selectedSortColumn: ''
      }));

      // Auto-load columns if only one table is available
      if (result.tables?.length === 1) {
        await loadDatabaseColumns(dataSourceId, result.tables[0]);
      }

      console.log(`✅ Tables loaded: ${result.tables?.length || 0} tables for ${dataSourceId}`);
    } catch (err: any) {
      console.error('Failed to load database tables:', err);
      setError('Gagal memuat daftar tabel database');
    }
  };

  // Load available columns for selected database table
  const loadDatabaseColumns = async (dataSourceId: string, tableName: string) => {
    try {
      const result = await apiFetch(`/api/data-sources/${dataSourceId}/tables/${encodeURIComponent(tableName)}/columns`);

      // ✅ FIX: Update formData state for all database types
      setFormData(prev => ({
        ...prev,
        availableColumns: result.columns || [],
        selectedSortColumn: ''
      }));

      console.log(`✅ Columns loaded: ${result.columns?.length || 0} columns for table ${tableName}`);
    } catch (err: any) {
      console.error('Failed to load database columns:', err);
      setError('Gagal memuat daftar kolom tabel');
    }
  };

  // Handle table selection for database
  const handleTableChange = (tableName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTable: tableName,
      availableColumns: [], // Reset columns when table changes
      selectedSortColumn: ''
    }));

    // Auto-load columns for the selected table
    if (tableName && formData.dataSourceId) {
      loadDatabaseColumns(formData.dataSourceId, tableName);
    }

    console.log(`✅ Table changed to: ${tableName}`);
  };

  // Preset query options
  const PRESET_QUERIES: PresetQuery[] = [
    // MySQL queries - user selects sorting column
    {
      id: 'mysql-recent-data',
      name: 'Data Terbaru MySQL',
      description: 'Data terbaru dari tabel MySQL berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY `{sortColumn}` DESC LIMIT 10',
      plugin: 'database',
      databaseType: 'mysql'
    },
    {
      id: 'mysql-timerange',
      name: 'Rentang Waktu MySQL',
      description: 'Data dalam rentang waktu tertentu berdasarkan kolom yang dipilih',
      category: 'time',
      query: 'SELECT * FROM {table} WHERE `{sortColumn}` BETWEEN ? AND ? ORDER BY `{sortColumn}` DESC',
      parameters: ['start_value', 'end_value'],
      plugin: 'database',
      databaseType: 'mysql'
    },
    {
      id: 'mysql-latest-record',
      name: 'Record Terakhir MySQL',
      description: 'Record terbaru dari tabel MySQL berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY `{sortColumn}` DESC LIMIT 1',
      plugin: 'database',
      databaseType: 'mysql'
    },
    {
      id: 'mysql-3-recent',
      name: '3 Record Terakhir MySQL',
      description: '3 record terbaru dari tabel MySQL berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY `{sortColumn}` DESC LIMIT 3',
      plugin: 'database',
      databaseType: 'mysql'
    },
    {
      id: 'mysql-10-recent',
      name: '10 Record Terakhir MySQL',
      description: '10 record terbaru dari tabel MySQL berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY `{sortColumn}` DESC LIMIT 10',
      plugin: 'database',
      databaseType: 'mysql'
    },
    {
      id: 'mysql-30min',
      name: '30 Menit Terakhir MySQL',
      description: 'Data 30 menit terakhir dari tabel MySQL berdasarkan kolom waktu',
      category: 'time',
      query: 'SELECT * FROM {table} WHERE `{sortColumn}` >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) ORDER BY `{sortColumn}` DESC',
      plugin: 'database',
      databaseType: 'mysql'
    },
    {
      id: 'mysql-24hours',
      name: '24 Jam Terakhir MySQL',
      description: 'Data 24 jam terakhir dari tabel MySQL berdasarkan kolom waktu',
      category: 'time',
      query: 'SELECT * FROM {table} WHERE `{sortColumn}` >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY `{sortColumn}` DESC',
      plugin: 'database',
      databaseType: 'mysql'
    },
    // Oracle queries - user selects sorting column
    {
      id: 'oracle-recent-data',
      name: 'Data Terbaru Oracle',
      description: 'Data terbaru dari tabel Oracle berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY "{sortColumn}" DESC FETCH FIRST 10 ROWS ONLY',
      plugin: 'database',
      databaseType: 'oracle'
    },
    {
      id: 'oracle-timerange',
      name: 'Rentang Waktu Oracle',
      description: 'Data dalam rentang waktu tertentu berdasarkan kolom yang dipilih',
      category: 'time',
      query: 'SELECT * FROM {table} WHERE "{sortColumn}" BETWEEN :start_value AND :end_value ORDER BY "{sortColumn}" DESC',
      parameters: ['start_value', 'end_value'],
      plugin: 'database',
      databaseType: 'oracle'
    },
    {
      id: 'oracle-latest-record',
      name: 'Record Terakhir Oracle',
      description: 'Record terbaru dari tabel Oracle berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY "{sortColumn}" DESC FETCH FIRST 1 ROWS ONLY',
      plugin: 'database',
      databaseType: 'oracle'
    },
    {
      id: 'oracle-3-recent',
      name: '3 Record Terakhir Oracle',
      description: '3 record terbaru dari tabel Oracle berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY "{sortColumn}" DESC FETCH FIRST 3 ROWS ONLY',
      plugin: 'database',
      databaseType: 'oracle'
    },
    {
      id: 'oracle-10-recent',
      name: '10 Record Terakhir Oracle',
      description: '10 record terbaru dari tabel Oracle berdasarkan kolom yang dipilih',
      category: 'recent',
      query: 'SELECT * FROM {table} ORDER BY "{sortColumn}" DESC FETCH FIRST 10 ROWS ONLY',
      plugin: 'database',
      databaseType: 'oracle'
    },
    {
      id: 'oracle-30min',
      name: '30 Menit Terakhir Oracle',
      description: 'Data 30 menit terakhir dari tabel Oracle berdasarkan kolom waktu',
      category: 'time',
      query: 'SELECT * FROM {table} WHERE "{sortColumn}" >= SYSDATE - INTERVAL \'30\' MINUTE ORDER BY "{sortColumn}" DESC',
      plugin: 'database',
      databaseType: 'oracle'
    },
    {
      id: 'oracle-24hours',
      name: '24 Jam Terakhir Oracle',
      description: 'Data 24 jam terakhir dari tabel Oracle berdasarkan kolom waktu',
      category: 'time',
      query: 'SELECT * FROM {table} WHERE "{sortColumn}" >= SYSDATE - INTERVAL \'1\' DAY ORDER BY "{sortColumn}" DESC',
      plugin: 'database',
      databaseType: 'oracle'
    },
    // AVEVA PI queries - REMOVED: No more hardcoded presets for AVEVA PI
    // AVEVA PI now supports fully dynamic custom SQL queries
    // Users can write any SQL query they want for AVEVA PI
  ];

  // Load triggers and connections
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all dashboard data in single request with cache buster
      const timestamp = Date.now() + Math.random();
      const dashboardRes = await apiFetch(`/api/dashboard-data?t=${timestamp}`);

      console.log('Dashboard API Response:', dashboardRes); // Debug log

      // Handle different response formats (backend might return direct object or wrapped)
      let responseData;
      if (dashboardRes.success && dashboardRes.data) {
        // Standard wrapped response
        responseData = dashboardRes.data;
      } else if (dashboardRes.triggers || dashboardRes.dataSources) {
        // Direct response without wrapper
        responseData = dashboardRes;
      } else {
        throw new Error('Invalid response format: missing triggers or dataSources');
      }

      const { triggers: triggersData, dataSources: connectionsData, triggerGroups: groupsData } = responseData;

      console.log('📊 Loaded triggers:', triggersData?.length || 0, 'items');
      console.log('🔌 Loaded connections:', connectionsData?.length || 0, 'items');
      console.log('👥 Loaded groups:', groupsData?.length || 0, 'items');
      console.log('👥 Groups data:', groupsData);

      // Additional validation
      if (!Array.isArray(groupsData)) {
        console.warn('⚠️ groupsData is not an array:', typeof groupsData, groupsData);
      }

      setTriggers(prev => {
        const newTriggers = Array.isArray(triggersData) ? triggersData : [];
        // Only update if the data actually changed
        if (prev.length !== newTriggers.length) return newTriggers;
        for (let i = 0; i < prev.length; i++) {
          if (JSON.stringify(prev[i]) !== JSON.stringify(newTriggers[i])) return newTriggers;
        }
        return prev; // No change, keep previous reference
      });
      setConnections(prev => {
        const newConnections = Array.isArray(connectionsData) ? connectionsData : [];
        // Only update if the data actually changed
        if (prev.length !== newConnections.length) return newConnections;
        for (let i = 0; i < prev.length; i++) {
          if (JSON.stringify(prev[i]) !== JSON.stringify(newConnections[i])) return newConnections;
        }
        return prev; // No change, keep previous reference
      });
      setGroups(prev => {
        const newGroups = Array.isArray(groupsData) ? groupsData : [];
        // Only update if the data actually changed
        if (prev.length !== newGroups.length) return newGroups;
        for (let i = 0; i < prev.length; i++) {
          if (JSON.stringify(prev[i]) !== JSON.stringify(newGroups[i])) return newGroups;
        }
        return prev; // No change, keep previous reference
      });

      // Show success notification only on first load
      if (connectionsData && connectionsData.length > 0 && !hasLoadedInitialDataRef.current) {
        hasLoadedInitialDataRef.current = true;
        // Use ref to prevent this from causing re-render loop
        setTimeout(() => {
          setNotification({
            message: `✅ Data berhasil dimuat: ${connectionsData.length} koneksi, ${triggersData.length} trigger`,
            type: 'success'
          });
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-refresh data when window gets focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused - refreshing data...');
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set up listener once

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      dataSourceId: '',
      presetQueryId: '',
      tag: '',
      description: '',
      type: 'query',
      active: true,
      directUrl: '',
      groupId: '',
      avevaPiInterval: '1h', // Reset to default interval
      // Temporary: Reset database fields for backward compatibility
      selectedTable: '',
      availableTables: [],
      availableColumns: [],
      selectedSortColumn: ''
    });
    setTestResult({ loading: false, data: null, error: null });
  };

  // Debug: Log groups state changes (disabled to prevent potential re-render issues)
  // useEffect(() => {
  //   console.log('🔄 Groups state updated:', groups?.length || 0, 'groups');
  //   if (groups && groups.length > 0) {
  //     console.log('🔄 First group:', groups[0]);
  //   }
  // }, [groups]);

  // REMOVED: Auto-fill tag useEffect to prevent infinite loop
  // Auto-fill is now handled in data source selection handler

  // REMOVED: Auto-fill custom query useEffect to prevent infinite loop
  // Auto-fill is now handled in query mode change handler

  // Fetch available tags for AVEVA PI
  const fetchAvailableTags = async () => {
    const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
    if (!selectedConnection || selectedConnection.plugin !== 'aveva-pi') return;

    setTagLoading(true);
    try {
      const data = await apiFetch(`/api/data-sources/${selectedConnection.id}/tags`);
      if (data && data.success) {
        setAvailableTags(data.tags || []);
      } else {
        console.error('Failed to fetch tags:', data?.error || 'Unknown error');
        setAvailableTags([]);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setAvailableTags([]);
    } finally {
      setTagLoading(false);
    }
  };

  // Handle create trigger
  const handleCreate = () => {
    // Temporarily remove connection check to test button visibility
    // if (connections.length === 0) {
    //   setError('Data sources belum dimuat. Silakan tunggu sebentar.');
    //   return;
    // }
    resetForm();
    setEditingTrigger(null);
    setShowCreateModal(true);
  };

  // Handle edit trigger
  const handleEdit = (trigger: Trigger) => {
    // Check if this is an AVEVA PI trigger with SQL query
    const isAvevaPiSqlTrigger = trigger.dataSource && 
      connections.find(c => c.id === trigger.dataSource)?.plugin === 'aveva-pi' &&
      (trigger as any).api_url?.includes('SELECT') && 
      (trigger as any).api_url?.includes('FROM points');

    setFormData({
      name: trigger.name,
      dataSourceId: trigger.dataSource,
      groupId: (trigger as any).groupId || '', // Add groupId from trigger
      presetQueryId: isAvevaPiSqlTrigger ? 'aveva-pi-sql' : '', // Special handling for AVEVA PI SQL
      tag: '',
      description: trigger.description,
      type: 'query',
      active: trigger.active !== false,
      directUrl: (trigger as any).config?.directUrl || '',
      avevaPiInterval: (trigger as any).config?.interval || '1h', // Load custom interval
      // Initialize MySQL fields for backward compatibility
      selectedTable: '',
      availableTables: [],
      availableColumns: [],
      selectedSortColumn: ''
    });
    setEditingTrigger(trigger);
    setShowCreateModal(true);
  };

  // Handle delete trigger
  const handleDelete = (trigger: Trigger) => {
    setShowDeleteConfirm(trigger);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      // ✅ HARD DELETE - Permanent deletion
      await apiFetch(`/pi/triggers/${showDeleteConfirm.id || showDeleteConfirm.name}/permanent`, {
        method: 'DELETE'
      });

      setSuccessMessage(`Trigger "${showDeleteConfirm.name}" berhasil dihapus permanent!`);
      setShowSuccessModal(true);
      loadData();
      setShowDeleteConfirm(null);
    } catch (err: any) {
      // If 404, trigger might already be deleted, just refresh data
      if (err.message && err.message.includes('404')) {
        console.warn('⚠️ Trigger not found (might already be deleted), refreshing data...');
        loadData();
        setShowDeleteConfirm(null);
      } else {
        setNotification({ message: err.message || 'Gagal menghapus trigger', type: 'error' });
      }
    }
  };

  // Trigger action handlers
  const handleEditTrigger = (trigger: any) => {
    setFormData({
      name: trigger.name,
      dataSourceId: trigger.dataSource,
      presetQueryId: '',
      tag: '',
      description: trigger.description,
      type: 'query',
      active: trigger.active !== false,
      groupId: trigger.groupId || '',
      avevaPiInterval: trigger.config?.interval || '1h', // Load custom interval
      // Temporary: Initialize database fields for backward compatibility
      selectedTable: '',
      availableTables: [],
      availableColumns: [],
      selectedSortColumn: ''
    });
    setEditingTrigger(trigger);
    setShowCreateModal(true);
  };

  const handleDeleteTrigger = (trigger: any) => {
    setShowDeleteConfirm(trigger);
  };

  // Handle data source change
  const handleDataSourceChange = (dataSourceId: string) => {
    setFormData(prev => ({
      ...prev,
      dataSourceId,
      presetQueryId: '',
      tag: '',
      // Reset database fields when data source changes
      availableTables: [],
      selectedTable: '',
      availableColumns: [],
      selectedSortColumn: ''
    }));

    // ✅ FIX: Auto-load tables for database connections (MySQL, Oracle, etc.)
    if (dataSourceId) {
      const selectedConnection = connections.find(c => c.id === dataSourceId);
      if (selectedConnection?.plugin === 'database') {
        console.log(`🔄 Auto-loading tables for ${selectedConnection.databaseType} connection: ${dataSourceId}`);
        loadDatabaseTables(dataSourceId);
      }
    }
  };

  // Handle preset query change
  const handlePresetQueryChange = (presetId: string) => {
    setFormData(prev => ({
      ...prev,
      presetQueryId: presetId,
      tag: '' // Reset tag when preset changes
    }));
  };

  const triggerGroupsManagerRef = useRef<any>(null);

  // Group action handlers
  const handleEditGroup = (group: TriggerGroup) => {
    if (triggerGroupsManagerRef.current?.handleEditGroup) {
      triggerGroupsManagerRef.current.handleEditGroup(group);
    }
  };

  const handleDeleteGroup = async (group: TriggerGroup) => {
    if (triggerGroupsManagerRef.current?.handleDeleteGroup) {
      await triggerGroupsManagerRef.current.handleDeleteGroup(group);
    }
  };

  // Helper function to find preset from both standard and custom AVEVA PI presets
  const findPresetById = (presetQueryId: string) => {
    console.log('🔍 findPresetById called with:', presetQueryId);
    // Check if it's a standard preset
    let selectedPreset = PRESET_QUERIES.find(p => p.id === presetQueryId);
    console.log('🔍 Standard preset found:', !!selectedPreset, selectedPreset?.name);

    // If not found in standard presets, check AVEVA PI custom presets
    if (!selectedPreset && presetQueryId.startsWith('custom-')) {
      const customPresetId = presetQueryId.replace('custom-', '');
      console.log('🔍 Looking for AVEVA PI custom preset:', customPresetId);
      const avevaPiPreset = avevaPiPresets.find(p => p.id === customPresetId);
      console.log('🔍 AVEVA PI preset found:', !!avevaPiPreset, avevaPiPreset?.name);
      if (avevaPiPreset) {
        // Convert AVEVA PI preset to standard preset format for compatibility
        selectedPreset = {
          id: presetQueryId,
          name: avevaPiPreset.name,
          description: avevaPiPreset.queryTemplate,
          query: avevaPiPreset.queryTemplate,
          category: 'custom' as 'time' | 'recent',
          requiresTag: avevaPiPreset.variables.includes('tag'),
          parameters: avevaPiPreset.variables,
          variables: avevaPiPreset.variables, // Add variables property
          plugin: 'aveva-pi',
          databaseType: undefined
        };
        console.log('🔍 Converted AVEVA PI preset:', selectedPreset);
      }
    }

    console.log('🔍 findPresetById returning:', !!selectedPreset, selectedPreset?.id);
    return selectedPreset;
  };

  // AVEVA PI Preset handlers
  const handleAvevaPiPresetSelect = (preset: any) => {
    if (preset) {
      setSelectedPresetId(preset.id);
      // Update formData.presetQueryId to match the format expected by findPresetById
      setFormData(prev => ({
        ...prev,
        presetQueryId: `custom-${preset.id}`
      }));
      // For AVEVA PI presets, we stay in preset mode and let the form handle the query generation
      // Don't switch to custom mode - the preset should work in preset mode
      setNotification({ message: `Preset AVEVA PI "${preset.name}" dipilih`, type: 'success' });
    } else {
      setSelectedPresetId(null);
      setFormData(prev => ({
        ...prev,
        presetQueryId: ''
      }));
    }
  };

  const handleAvevaPiPresetSave = async (name: string, queryTemplate: string, variables: string[]) => {
    try {
      const data = await apiFetch('/api/aveva-pi-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, queryTemplate, variables })
      });

      // Reload presets after saving
      try {
        const reloadData = await apiFetch('/api/aveva-pi-presets');
        setAvevaPiPresets(reloadData?.presets || []);
        setNotification({ message: 'Preset saved successfully', type: 'success' });
      } catch (reloadError) {
        console.error('Error reloading presets:', reloadError);
        setNotification({ message: 'Preset saved but failed to reload list', type: 'warning' });
      }
    } catch (error) {
      console.error('Error saving preset:', error);
      setNotification({ message: 'Failed to save preset', type: 'error' });
    }
  };

  const handleAvevaPiPresetRename = async (presetId: string, newName: string) => {
    try {
      const data = await apiFetch(`/api/aveva-pi-presets/${presetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      // Reload presets after renaming
      try {
        const reloadData = await apiFetch('/api/aveva-pi-presets');
        setAvevaPiPresets(reloadData?.presets || []);
        setNotification({ message: 'Preset renamed successfully', type: 'success' });
      } catch (reloadError) {
        console.error('Error reloading presets:', reloadError);
        setNotification({ message: 'Preset renamed but failed to reload list', type: 'warning' });
      }
    } catch (error) {
      console.error('Error renaming preset:', error);
      setNotification({ message: 'Failed to rename preset', type: 'error' });
    }
  };

  const handleAvevaPiPresetDelete = async (presetId: string) => {
    try {
      const data = await apiFetch(`/api/aveva-pi-presets/${presetId}`, {
        method: 'DELETE'
      });

      // Reload presets after deleting
      try {
        const reloadData = await apiFetch('/api/aveva-pi-presets');
        setAvevaPiPresets(reloadData?.presets || []);
        if (selectedPresetId === presetId) {
          setSelectedPresetId(null);
        }
        setNotification({ message: 'Preset deleted successfully', type: 'success' });
      } catch (reloadError) {
        console.error('Error reloading presets:', reloadError);
        setNotification({ message: 'Preset deleted but failed to reload list', type: 'warning' });
      }
    } catch (error) {
      console.error('Error deleting preset:', error);
      setNotification({ message: 'Failed to delete preset', type: 'error' });
    }
  };

  const handleAvevaPiPresetDuplicate = async (presetId: string) => {
    const preset = avevaPiPresets.find(p => p.id === presetId);
    if (preset) {
      const newName = `${preset.name} (Copy)`;
      await handleAvevaPiPresetSave(newName, preset.queryTemplate, preset.variables);
    }
  };

  // Handle create/edit trigger submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
    const selectedPreset = findPresetById(formData.presetQueryId);

    // Validation
    if (!formData.name?.trim()) {
      setError('Nama trigger harus diisi');
      return;
    }
    if (!formData.dataSourceId) {
      setError('Data source harus dipilih');
      return;
    }
    // Skip preset query validation for AVEVA PI (handled by AvevaPITriggerForm)
    if (selectedConnection?.plugin !== 'aveva-pi' && !formData.presetQueryId) {
      setError('Preset query harus dipilih');
      return;
    }
    // Additional validation for AVEVA PI
    if (selectedConnection?.plugin === 'aveva-pi') {
      if (queryMode === 'custom' && !customQuery.trim()) {
        setError('Custom query AVEVA PI tidak boleh kosong');
        return;
      }
      if (queryMode === 'preset' && !formData.presetQueryId) {
        setError('Preset query AVEVA PI harus dipilih');
        return;
      }
      if (!avevaPiValidation.isValid) {
        setError(avevaPiValidation.errors.join(', '));
        return;
      }
    }
    // Additional validation for MySQL
    if (selectedConnection?.plugin === 'mysql' || (selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'mysql')) {
      if (!mysqlValidation.isValid) {
        setError(mysqlValidation.errors.join(', '));
        return;
      }
      // Ensure MySQL data is available
      if (!mysqlQueryData.table || !mysqlQueryData.sortColumn) {
        setError('Data tabel dan kolom sorting MySQL belum lengkap. Pastikan Anda telah memilih tabel dan kolom sorting.');
        return;
      }
    }

    try {
      setError(null);

      // Generate query based on data source type
      let finalQuery = '';
      if (selectedConnection?.plugin === 'aveva-pi') {
        // ✅ AVEVA PI: Support both preset and custom query modes
        if (queryMode === 'custom') {
          finalQuery = customQuery.trim();
          if (!finalQuery) {
            setError('Custom query AVEVA PI tidak boleh kosong');
            return;
          }
        } else if (queryMode === 'preset') {
          // Handle AVEVA PI preset queries
          if (!selectedPreset) {
            setError('Preset query AVEVA PI harus dipilih');
            return;
          }
          finalQuery = selectedPreset.query;
          // Handle template variables for AVEVA PI presets
          if ('variables' in selectedPreset && selectedPreset.variables && selectedPreset.variables.length > 0) {
            let processedQuery = selectedPreset.query;
            if (selectedPreset.variables.includes('tag')) {
              const tagValue = formData.tag?.trim() || selectedConnection?.config?.defaultTag || '{tag}';
              processedQuery = processedQuery.replace(/\{tag\}/g, tagValue);
            }
            finalQuery = processedQuery;
          }
        } else {
          setError('Mode query AVEVA PI tidak valid');
          return;
        }
      } else if (selectedPreset) {
        // Handle other database types with preset queries
        if (selectedConnection?.plugin === 'mysql' || (selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'mysql')) {
          finalQuery = selectedPreset.query;
          if (mysqlQueryData.table) {
            finalQuery = finalQuery.replace('{table}', `\`${mysqlQueryData.table}\``);
          } else {
            finalQuery = finalQuery.replace('{table}', 'sensor_data');
          }
          // Replace sort column placeholder for MySQL queries (gunakan replaceAll untuk semua instance)
          if (mysqlQueryData.sortColumn) {
            finalQuery = finalQuery.replaceAll('{sortColumn}', mysqlQueryData.sortColumn);
          } else {
            finalQuery = finalQuery.replaceAll('{sortColumn}', 'id'); // Default fallback
          }
        } else if (selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'oracle') {
          finalQuery = selectedPreset.query;
          if (formData.selectedTable) {
            finalQuery = finalQuery.replace('{table}', `"${formData.selectedTable}"`);
          } else {
            finalQuery = finalQuery.replace('{table}', '"ALARMS"');
          }
          // Replace sort column placeholder for Oracle queries (double quotes for case-sensitive identifiers)
          if (formData.selectedSortColumn) {
            finalQuery = finalQuery.replaceAll('{sortColumn}', formData.selectedSortColumn);
          } else {
            finalQuery = finalQuery.replaceAll('{sortColumn}', 'TIMESTAMP'); // Default fallback for Oracle
          }
        } else {
          finalQuery = selectedPreset.query.replace('{table}', 'data_table');
        }
      } else {
        // For non-AVEVA PI connections that don't have preset selected
        setError('Preset query harus dipilih untuk tipe database ini');
        return;
      }

      const triggerData = {
        name: formData.name.trim(),
        type: formData.type,
        dataSourceId: formData.dataSourceId,
        groupId: formData.groupId || null, // Add groupId
        config: {
          query: finalQuery,
          description: formData.description.trim(),
          responsePrefix: formData.name.trim(),
          parameters: selectedConnection?.plugin === 'aveva-pi' ? [] : (selectedPreset?.parameters || []),
          ...(selectedConnection?.plugin === 'aveva-pi' && formData.avevaPiInterval && { interval: formData.avevaPiInterval }),
          ...(selectedConnection?.plugin === 'aveva-pi' ? {} : (selectedPreset?.directUrl && formData.directUrl && { directUrl: formData.directUrl }))
        },
        active: formData.active,
        tag: (selectedConnection?.plugin === 'aveva-pi') ? null : (formData.tag?.trim() || null), // AVEVA PI tag auto-taken from data source
        aliases: [],
        source: selectedConnection?.plugin || 'unknown'
      };

      console.log('Sending trigger data to backend:', triggerData);

      if (editingTrigger) {
        // Use originalId if available, fallback to id (which might be name), then name
        const triggerId = (editingTrigger as any).originalId || editingTrigger.id || editingTrigger.name;
        console.log('Updating trigger with ID:', triggerId, 'editingTrigger:', editingTrigger);
        await apiFetch(`/api/triggers/${triggerId}`, {
          method: 'PUT',
          body: JSON.stringify(triggerData)
        });
        setSuccessMessage(`Trigger "${formData.name}" berhasil diperbarui!`);
        setShowSuccessModal(true);
      } else {
        await apiFetch('/api/triggers', {
          method: 'POST',
          body: JSON.stringify(triggerData)
        });
        setSuccessMessage(`Trigger "${formData.name}" berhasil dibuat!`);
        setShowSuccessModal(true);
      }

      await loadData();
      setShowCreateModal(false);
      resetForm();

    } catch (err: any) {
      console.error('Error creating trigger:', err);
      const errorMessage = err.message || err.error || 'Gagal menyimpan trigger';
      setError(`Error: ${errorMessage}`);
    }
  };

  // Handle test query
  const handleTestQuery = async (customInterval?: string) => {
    console.log('🚀 [FRONTEND] ===== HANDLE TEST QUERY CALLED =====');
    console.log('🚀 [FRONTEND] customInterval parameter received:', customInterval);
    console.log('🚀 [FRONTEND] customInterval type:', typeof customInterval);
    console.log('🚀 [FRONTEND] customInterval is null/undefined:', customInterval == null);
    console.log('🚀 [FRONTEND] handleTestQuery called with customInterval:', customInterval);
    console.log('� [FRONTEND] Call source:', customInterval ? 'Execute Custom Query (blue button)' : 'Test Query (green button)');
    console.log('�📋 [FRONTEND] Current state:', {
      queryMode,
      customQuery,
      formData: {
        dataSourceId: formData.dataSourceId,
        avevaPiInterval: formData.avevaPiInterval
      },
      customInterval
    });    const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
    const selectedPreset = findPresetById(formData.presetQueryId);

    console.log('📋 [FRONTEND] Test query debug:', {
      dataSourceId: formData.dataSourceId,
      presetQueryId: formData.presetQueryId,
      queryMode,
      selectedConnectionPlugin: selectedConnection?.plugin,
      selectedPresetFound: !!selectedPreset,
      selectedPresetId: selectedPreset?.id,
      selectedPresetName: selectedPreset?.name,
      selectedPresetPlugin: selectedPreset?.plugin,
      isAvevaPiPreset: selectedPreset?.id?.startsWith('custom-'),
      avevaPiPresetsCount: avevaPiPresets.length
    });

    if (!selectedConnection) {
      console.log('❌ No data source selected');
      setTestResult({ loading: false, data: null, error: 'Data source harus dipilih' });
      return;
    }

    // For AVEVA PI custom queries, we don't need preset validation
    if (selectedConnection.plugin === 'aveva-pi' && queryMode === 'custom') {
      console.log('🎯 AVEVA PI custom query mode detected');
      if (!customQuery.trim()) {
        console.log('❌ Custom query is empty');
        setTestResult({ loading: false, data: null, error: 'Custom query AVEVA PI tidak boleh kosong' });
        return;
      }
      console.log('✅ Custom query validation passed:', customQuery.trim());
    } 
    // For AVEVA PI preset mode, we also skip preset validation since AVEVA PI uses custom presets
    else if (selectedConnection.plugin === 'aveva-pi' && queryMode === 'preset') {
      console.log('🎯 AVEVA PI preset mode detected');
      if (!selectedPreset) {
        console.log('❌ No AVEVA PI preset selected');
        setTestResult({ loading: false, data: null, error: 'Preset AVEVA PI harus dipilih' });
        return;
      }
      console.log('✅ AVEVA PI preset validation passed:', selectedPreset.name);
    }
    else if (!selectedPreset) {
      console.log('❌ No preset selected for non-custom mode');
      setTestResult({ loading: false, data: null, error: 'Preset query harus dipilih' });
      return;
    }

    console.log('🔄 Setting loading state...');
    setTestResult({ loading: true, data: null, error: null });
    console.log('✅ Loading state set, now making API call...');

    try {
      // Generate test query
      let testQuery = '';
      let queryParams: any = {};

      if (selectedConnection.plugin === 'aveva-pi' && queryMode === 'custom') {
        // Use custom query directly for AVEVA PI
        testQuery = customQuery.trim();
      } else if (selectedConnection.plugin === 'aveva-pi') {
        // Handle AVEVA PI preset queries
        if (selectedPreset!.variables && selectedPreset!.variables.length > 0) {
          // For AVEVA PI presets with template variables, replace them
          let processedQuery = selectedPreset!.query;
          console.log('🔧 [TEST] Processing AVEVA PI preset with variables:', {
            presetId: selectedPreset!.id,
            originalQuery: selectedPreset!.query,
            variables: selectedPreset!.variables,
            formDataTag: formData.tag,
            defaultTag: selectedConnection.config?.defaultTag
          });
          if (selectedPreset!.variables.includes('tag')) {
            const tagValue = formData.tag?.trim() || selectedConnection.config?.defaultTag || '{tag}';
            console.log('🔧 [TEST] Replacing {tag} with:', tagValue);
            processedQuery = processedQuery.replace(/\{tag\}/g, tagValue);
            console.log('🔧 [TEST] Processed query:', processedQuery);
          }
          testQuery = processedQuery;
        } else {
          // For AVEVA PI presets without variables
          testQuery = selectedPreset!.query;
        }
      } else if (selectedConnection.plugin === 'mysql' || (selectedConnection.plugin === 'database' && selectedConnection.databaseType === 'mysql')) {
        testQuery = selectedPreset!.query;
        if (mysqlQueryData.table) {
          testQuery = testQuery.replace('{table}', `\`${mysqlQueryData.table}\``);
        } else {
          testQuery = testQuery.replace('{table}', 'sensor_data');
        }
        // Replace sort column placeholder for MySQL queries (gunakan replaceAll untuk semua instance)
        if (mysqlQueryData.sortColumn) {
          testQuery = testQuery.replaceAll('{sortColumn}', mysqlQueryData.sortColumn);
        } else {
          testQuery = testQuery.replaceAll('{sortColumn}', 'id'); // Default fallback
        }
      } else if (selectedConnection.plugin === 'database' && selectedConnection.databaseType === 'oracle') {
        testQuery = selectedPreset!.query;
        if (formData.selectedTable) {
          testQuery = testQuery.replace('{table}', `"${formData.selectedTable}"`);
        } else {
          testQuery = testQuery.replace('{table}', '"ALARMS"');
        }
        // Replace sort column placeholder for Oracle queries (double quotes for case-sensitive identifiers)
        if (formData.selectedSortColumn) {
          testQuery = testQuery.replaceAll('{sortColumn}', formData.selectedSortColumn);
        } else {
          testQuery = testQuery.replaceAll('{sortColumn}', 'TIMESTAMP'); // Default fallback for Oracle
        }
      } else {
        testQuery = selectedPreset!.query.replace('{table}', 'data_table');
      }

      // Execute test query
      const queryPayload: any = {
        query: testQuery,
        parameters: queryParams
      };

      // ✅ STRICT VALIDATION: AVEVA PI only requires interval now
      if (selectedConnection.plugin === 'aveva-pi') {
        // ❌ TIDAK ADA DEFAULT! Kalau ga ada interval, langsung error
        if (!formData.avevaPiInterval) {
          throw new Error('Interval wajib dipilih untuk AVEVA PI! Pilih interval waktu (30s, 1m, 5m, 15m, 30m, 1h, 2h, 6h, 12h, 1d)');
        }

        // ✅ VALIDASI TAG: Pastikan tag sudah ada untuk AVEVA PI
        if (selectedConnection.plugin === 'aveva-pi' && testQuery.includes('{tag}')) {
          const tagValue = formData.tag?.trim() || selectedConnection.config?.defaultTag;
          if (!tagValue || tagValue === '{tag}') {
            throw new Error('Tag AVEVA PI wajib diisi! Pastikan tag sudah terisi atau data source memiliki defaultTag yang valid.');
          }
          // Lakukan replacement sekali lagi untuk memastikan
          testQuery = testQuery.replace(/\{tag\}/g, tagValue);
          console.log('🔧 [VALIDATION] Final tag replacement:', { original: testQuery.replace(tagValue, '{tag}'), final: testQuery, tagValue });
        }

        queryPayload.limit = formData.avevaPiLimit || 10; // Default to 10 if not specified
        queryPayload.interval = formData.avevaPiInterval;

        // ✅ TAMBAHKAN TAG PARAMETER: Kirim tag sebagai parameter terpisah untuk backend
        const tagValue = formData.tag?.trim() || selectedConnection.config?.defaultTag;
        if (tagValue && tagValue !== '{tag}') {
          queryPayload.tag = tagValue;
          console.log('🏷️ [AVEVA PI] Adding tag parameter:', tagValue);
        }

        // Auto-set data source based on query mode (user's rule)
        // Preset Query → Historical Only, Custom Query → Real-time + Historical
        queryPayload.dualQuery = (queryMode === 'custom') || (selectedConnection.plugin === 'aveva-pi' && customQuery.trim());
      }

      console.log('🔍 [FRONTEND] Executing test query:', {
        dataSourceId: formData.dataSourceId,
        query: testQuery,
        payload: queryPayload,
        isCustomAVEVA: selectedConnection.plugin === 'aveva-pi' && queryMode === 'custom',
        tagValue: formData.tag,
        defaultTag: selectedConnection.config?.defaultTag
      });

      // 🚨 DEBUG: Log the exact payload being sent
      console.log('🚨 [FRONTEND] SENDING PAYLOAD TO BACKEND:', JSON.stringify(queryPayload, null, 2));

      const result = await apiFetch(`/api/data-sources/${formData.dataSourceId}/query`, {
        method: 'POST',
        body: JSON.stringify(queryPayload)
      });

      console.log('✅ [FRONTEND] Test query API response received');
      console.log('✅ [FRONTEND] Result structure:', {
        hasData: result && 'data' in result,
        dataType: result?.data ? typeof result.data : 'undefined',
        dataLength: Array.isArray(result?.data) ? result.data.length : 'not array',
        firstItem: Array.isArray(result?.data) && result.data.length > 0 ? result.data[0] : 'no data',
        success: result?.success,
        error: result?.error,
        fullKeys: result ? Object.keys(result) : 'no result'
      });

      const processedData = stripEmptyUnits(result);
      console.log('✅ Processed data:', processedData);
      console.log('✅ Final data to display:', {
        hasProcessedData: processedData && 'data' in processedData,
        processedDataLength: Array.isArray(processedData?.data) ? processedData.data.length : 'not array',
        willDisplay: processedData?.data ? true : false,
        processedDataKeys: processedData ? Object.keys(processedData) : 'no processed data'
      });

      setTestResult({
        loading: false,
        data: processedData,
        error: null
      });

      console.log('✅ testResult set to:', {
        loading: false,
        data: processedData,
        error: null
      });

    } catch (err: any) {
      console.error('❌ Test query error:', err);
      setTestResult({
        loading: false,
        data: null,
        error: err.message || 'Gagal menjalankan test query'
      });
    }
  };

  // Main render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trigger Management</h1>
          <p className="text-gray-600">Kelola trigger dan grup trigger untuk monitoring data</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            + Buat Trigger
          </button>
          <TriggerGroupsManager
            ref={triggerGroupsManagerRef}
            triggers={triggers}
            groups={groups}
            onGroupsChange={setGroups}
            onLoadData={loadData}
            setSuccessMessage={setSuccessMessage}
            setShowSuccessModal={setShowSuccessModal}
            setNotification={setNotification}
          />
        </div>
      </div>

      <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Triggers & Groups</h2>
            {!loading && (triggers.length > 0 || groups.length > 0) && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{triggers.length + groups.length}</span>
                  <span>dari {triggers.length + groups.length} total</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-medium">
                    {triggers.filter(t => t.active !== false && t.dataSourceExists !== false).length + groups.filter(g => g.active !== false).length}
                  </span>
                  <span>aktif</span>
                </div>
                {triggers.some(t => t.dataSourceExists === false) && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="font-medium">
                      {triggers.filter(t => t.dataSourceExists === false).length}
                    </span>
                    <span>trigger dengan data source hilang</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : triggers.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada trigger</h3>
            <p className="text-gray-600 mb-4">Buat trigger pertama untuk memulai monitoring data</p>
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Buat Trigger Pertama
            </button>
          </div>
        ) : (triggers.length === 0 && groups.length === 0) ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada hasil pencarian</h3>
            <p className="text-gray-600 mb-4">Coba kata kunci yang berbeda</p>
            <button
              onClick={() => setSearchTerm('')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Hapus Pencarian
            </button>
          </div>
        ) : (
          <div>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <input
                    type="text"
                    placeholder="🔍 Cari trigger atau group..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={() => loadData()}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Source / Triggers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : (triggers.length === 0 && groups.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900 mb-1">Belum ada trigger atau group</p>
                      <p className="text-sm text-gray-500">Buat trigger atau group pertama Anda untuk memulai</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((item, index) => {
                  const connection = item.type === 'trigger' ? connections.find(c => c.id === item.dataSource) : null;
                  const hasMissingDataSource = item.type === 'trigger' && item.dataSourceExists === false;
                  return (
                    <tr key={`${item.type}-${item.id}`} className={`transition-colors ${hasMissingDataSource ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {hasMissingDataSource && (
                            <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                          <div>
                            <div className={`text-sm font-medium ${hasMissingDataSource ? 'text-red-900' : 'text-gray-900'}`}>{item.name}</div>
                            {item.description && (
                              <div className={`text-sm ${hasMissingDataSource ? 'text-red-700' : 'text-gray-500'}`}>{item.description}</div>
                            )}
                            {hasMissingDataSource && (
                              <div className="text-xs text-red-600 mt-1 font-medium">⚠️ Data source tidak ditemukan</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === 'trigger' ? (
                          <div className="flex flex-col">
                            <div className={`text-sm ${hasMissingDataSource ? 'text-red-900 font-medium' : 'text-gray-900'}`}>
                              {hasMissingDataSource ? (
                                <span>❌ {item.dataSource}</span>
                              ) : (
                                connection?.name || item.dataSource
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {(connection?.plugin === 'mysql' || (connection?.plugin === 'database' && connection?.databaseType === 'mysql')) && connection?.config?.database && (
                                <span>DB: {connection.config.database}</span>
                              )}
                              {connection?.plugin === 'aveva-pi' && connection?.config && (() => {
                                const fullUrl = connection.config.url || connection.config.endpoint || 
                                               `${connection.config.protocol || 'http'}://${connection.config.host}:${connection.config.port || 6066}/pi/trn`;
                                
                                // Shorten the URL for display
                                if (fullUrl.includes('?tag=')) {
                                  const baseUrl = fullUrl.split('?')[0];
                                  const tagParam = fullUrl.match(/tag=([^&]*)/)?.[1] || '';
                                  const dateMatch = fullUrl.match(/Sep\/\d{4}/)?.[0] || '';
                                  return `${baseUrl}?tag=${tagParam}${dateMatch ? `...${dateMatch}` : ''}`;
                                }
                                
                                return fullUrl;
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {item.type === 'group' && item.triggers && item.triggers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.triggers.slice(0, 3).map((triggerName: string, index: number) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {triggerName}
                                  </span>
                                ))}
                                {item.triggers.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    +{item.triggers.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : item.type === 'group' ? (
                              <span className="text-gray-500">No triggers</span>
                            ) : (
                              <span className="text-gray-500">Individual trigger</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (item.active !== false && !hasMissingDataSource)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            (item.active !== false && !hasMissingDataSource) ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                          {(item.active !== false && !hasMissingDataSource) ? 'Aktif' : 'Nonaktif'}
                          {hasMissingDataSource && (
                            <span className="ml-1 text-xs">(Data source hilang)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => item.type === 'trigger' ? handleEditTrigger(item) : handleEditGroup(item)}
                            className={`${hasMissingDataSource ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'} underline`}
                            disabled={hasMissingDataSource}
                            title={hasMissingDataSource ? 'Tidak dapat mengedit trigger dengan data source yang hilang' : 'Edit'}
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => item.type === 'trigger' ? handleDeleteTrigger(item) : handleDeleteGroup(item)}
                            className="text-red-600 hover:text-red-800 underline"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
            {triggers.length + groups.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>Menampilkan</span>
                      <select
                        value={showAll ? 'all' : itemsPerPage.toString()}
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setShowAll(true);
                          } else {
                            setShowAll(false);
                            setItemsPerPage(Number(e.target.value));
                          }
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option key="5" value="5">5</option>
                        <option key="10" value="10">10</option>
                        <option key="20" value="20">20</option>
                        <option key="50" value="50">50</option>
                        <option key="all" value="all">Semua</option>
                      </select>
                      <span>dari {triggers.length + groups.length} hasil</span>
                    </div>
                  </div>

                  {!showAll && totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        ‹ Sebelumnya
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum > totalPages) return null;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md min-w-[40px] ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Selanjutnya ›
                      </button>

                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-sm text-gray-600">Ke halaman</span>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = Number(e.target.value);
                            if (page >= 1 && page <= totalPages) {
                              setCurrentPage(page);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = Number((e.target as HTMLInputElement).value);
                              if (page >= 1 && page <= totalPages) {
                                setCurrentPage(page);
                              }
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">dari {totalPages}</span>
                      </div>
                    </div>
                  )}

                  {triggers.length + groups.length > 10 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          showAll
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        }`}
                      >
                        {showAll ? 'Tampilkan Paginated' : 'Tampilkan Semua'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <Modal
          onClose={() => setShowCreateModal(false)}
          title={editingTrigger ? 'Edit Trigger' : 'Buat Trigger Baru'}
        >
          <form onSubmit={(e) => {
            console.log('📝 [FORM SUBMIT] Form onSubmit triggered');
            handleSubmit(e);
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Nama Trigger *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="contoh: monitor-temperature"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Data Source *
                </label>
                <select
                  value={formData.dataSourceId}
                  onChange={(e) => handleDataSourceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option key="empty-connection" value="">
                    Pilih data source... ({connections.length} tersedia)
                  </option>
                  {connections.map((connection, connIndex) => {
                    const isMySQL = connection.plugin === 'mysql' || (connection.plugin === 'database' && connection.databaseType === 'mysql');
                    const isOracle = connection.plugin === 'oracle' || (connection.plugin === 'database' && connection.databaseType === 'oracle');
                    const isAvevaPI = connection.plugin === 'aveva-pi';
                    
                    return (
                      <option key={connection.id || `conn-${connIndex}`} value={connection.id}>
                        {isMySQL && '[MySQL]'}
                        {isOracle && '[Oracle]'}
                        {isAvevaPI && '[AVEVA PI]'}
                        {' '}{connection.name}
                        {isMySQL && connection.config?.database && ` - DB: ${connection.config.database}`}
                        {isOracle && connection.config?.service && ` - Service: ${connection.config.service}`}
                        {isAvevaPI && connection.config?.url && ` - ${connection.config.url}`}
                      </option>
                    );
                  })}
                </select>

                {formData.dataSourceId && (() => {
                  const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
                  if (!selectedConnection) return null;

                  return (
                    <div className="mt-2 text-sm text-gray-600">
                      {(selectedConnection.plugin === 'mysql' || (selectedConnection.plugin === 'database' && selectedConnection.databaseType === 'mysql')) && selectedConnection.config && (
                        <div>Database: {selectedConnection.config.database || 'N/A'}</div>
                      )}
                      {(selectedConnection.plugin === 'oracle' || (selectedConnection.plugin === 'database' && selectedConnection.databaseType === 'oracle')) && selectedConnection.config && (
                        <div>Service: {selectedConnection.config.service || 'N/A'}</div>
                      )}
                      {selectedConnection.plugin === 'aveva-pi' && selectedConnection.config && (
                        <div>URL: {selectedConnection.config.url || 'N/A'}</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {formData.dataSourceId && (() => {
              const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
              if (!selectedConnection || selectedConnection.plugin === 'aveva-pi') return null;

              // For AVEVA PI, combine standard presets with custom AVEVA PI presets
              let availablePresets = PRESET_QUERIES;
              if (selectedConnection.plugin === 'aveva-pi') {
                // Add AVEVA PI custom presets to the list
                const avevaPiCustomPresets = avevaPiPresets.map((preset, index) => ({
                  id: `aveva-pi-custom-${preset.id || index}`,
                  name: `🔧 ${preset.name}`,
                  description: preset.queryTemplate.length > 50
                    ? `${preset.queryTemplate.substring(0, 50)}...`
                    : preset.queryTemplate,
                  query: preset.queryTemplate,
                  category: 'recent' as 'time' | 'recent', // Use 'recent' for custom presets
                  requiresTag: preset.variables.includes('tag'),
                  parameters: preset.variables,
                  plugin: 'aveva-pi' as string,
                  databaseType: undefined
                }));
                availablePresets = [...PRESET_QUERIES, ...avevaPiCustomPresets];
              }

              return (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Preset Query *
                  </label>
                <select
                  value={formData.presetQueryId}
                  onChange={(e) => handlePresetQueryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  {(() => {
                    const filteredPresets = availablePresets.filter(preset => {
                      if (!selectedConnection) return false;

                      // Check plugin match
                      if (preset.plugin && preset.plugin !== selectedConnection.plugin) return false;

                      // For database plugin, also check database type
                      if (selectedConnection.plugin === 'database' && preset.databaseType) {
                        return preset.databaseType === selectedConnection.databaseType;
                      }

                      return true;
                    });

                    return (
                      <>
                        <option key="empty-preset" value="">
                          Pilih preset query... ({filteredPresets.length} tersedia)
                        </option>
                        {filteredPresets.map((preset, index) => (
                          <option key={preset.id || `preset-${index}`} value={preset.id}>
                            {preset.category === 'recent' && '[RECENT]'}
                            {preset.category === 'time' && '[TIME]'}
                            {preset.id.startsWith('aveva-pi-custom-') && '[CUSTOM]'}
                            {' '}{preset.name}
                          </option>
                        ))}
                      </>
                    );
                  })()}
                </select>

                {formData.presetQueryId && (() => {
                  const selectedPreset = findPresetById(formData.presetQueryId);
                  if (!selectedPreset) return null;

                  return (
                    <div className="mt-2 text-sm text-gray-600">
                      <div>{selectedPreset.description}</div>
                      {(selectedPreset.plugin === 'mysql' || (selectedPreset.plugin === 'database' && selectedPreset.databaseType === 'mysql')) && (
                        <div className="text-blue-600">• Membutuhkan Tabel MySQL</div>
                      )}
                      {(selectedPreset.plugin === 'database' && selectedPreset.databaseType === 'oracle') && (
                        <div className="text-green-600">• Membutuhkan Tabel Oracle</div>
                      )}
                    </div>
                  );
                })()}
                </div>
              );
            })()}

            {(() => {
              const selectedConnection = connections.find(c => c.id === formData.dataSourceId);

              if (selectedConnection?.plugin === 'mysql' || (selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'mysql')) {
                return (
                  <MySQLTriggerForm
                    dataSourceId={formData.dataSourceId}
                    connections={connections}
                    onTableSelected={(table) => setMysqlQueryData(prev => ({ ...prev, table }))}
                    onColumnsLoaded={(columns) => {}}
                    onValidationChange={(isValid, errors) => setMysqlValidation({ isValid, errors })}
                    onQueryGenerated={(query, table, sortColumn) => {
                      setMysqlQueryData({ table, sortColumn });
                    }}
                  />
                );
              } else if (selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'oracle') {
                return (
                  <OracleTriggerForm
                    formData={formData as any}
                    setFormData={setFormData as any}
                    connections={connections}
                    setError={setError}
                    loadDatabaseTables={loadDatabaseTables}
                    loadDatabaseColumns={loadDatabaseColumns}
                    handleTableChange={handleTableChange}
                  />
                );
              } else if (selectedConnection?.plugin === 'aveva-pi') {
                console.log('🚀 Rendering AvevaPITriggerForm with:', {
                  avevaPiPresetsLength: avevaPiPresets.length,
                  presetsLoading,
                  queryMode
                });
                return (
                  <AvevaPITriggerForm
                    formData={formData as any}
                    setFormData={setFormData as any}
                    connections={connections}
                    presetQueries={PRESET_QUERIES}
                    onValidationChange={handleAvevaPiValidationChange}
                    onQueryGenerated={(query) => {
                      setGeneratedQuery(query);
                    }}
                    // Custom query props
                    queryMode={queryMode}
                    setQueryMode={setQueryMode}
                    customQuery={customQuery}
                    setCustomQuery={setCustomQuery}
                    availableTags={availableTags}
                    tagLoading={tagLoading}
                    onExecuteCustomQuery={handleTestQuery}
                    // Auto-fill props
                    onCustomQueryChange={() => setIsQueryAutoFilled(false)}
                    isQueryAutoFilled={isQueryAutoFilled}
                    // AVEVA PI Preset props
                    avevaPiPresets={avevaPiPresets}
                    selectedPresetId={selectedPresetId}
                    onPresetSelect={handleAvevaPiPresetSelect}
                    onPresetSave={handleAvevaPiPresetSave}
                    onPresetRename={handleAvevaPiPresetRename}
                    onPresetDelete={handleAvevaPiPresetDelete}
                    onPresetDuplicate={handleAvevaPiPresetDuplicate}
                    presetsLoading={presetsLoading}
                    // Test result props
                    testResult={testResult}
                  />
                );
              }
              return null;
            })()}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Deskripsi trigger ini..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Aktifkan trigger
              </label>
            </div>

            {formData.dataSourceId && (
              <div className="border border-gray-200 rounded-md p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 SQL Query Preview:</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">
                      {(() => {
                        const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
                        if (!selectedConnection) return 'Pilih data source untuk melihat preview';

                        if (selectedConnection.plugin === 'aveva-pi') {
                          // ✅ AVEVA PI Query Preview for both preset and custom modes
                          console.log('🔍 AVEVA PI Preview Debug:', {
                            queryMode,
                            presetQueryId: formData.presetQueryId,
                            selectedPresetId
                          });
                          if (queryMode === 'custom') {
                            const intervalInfo = formData.avevaPiInterval ? ` (Interval: ${formData.avevaPiInterval})` : '';
                            return `${customQuery}\n\n-- AVEVA PI Custom Query${intervalInfo}\n-- Data akan diambil dengan interval ${formData.avevaPiInterval || '1h'}`;
                          } else if (queryMode === 'preset') {
                            const selectedPreset = findPresetById(formData.presetQueryId);
                            console.log('🔍 Preset mode - selectedPreset found:', !!selectedPreset, selectedPreset?.name);
                            if (selectedPreset) {
                              let previewQuery = '';
                              if (selectedPreset.id.startsWith('custom-')) {
                                // For custom AVEVA PI presets, show processed query
                                let processedQuery = selectedPreset.query;
                                console.log('🔧 [PREVIEW] Processing custom AVEVA PI preset for preview:', {
                                  presetId: selectedPreset.id,
                                  originalQuery: selectedPreset.query,
                                  variables: selectedPreset.variables,
                                  hasTagVariable: selectedPreset.variables?.includes('tag'),
                                  formDataTag: formData.tag,
                                  defaultTag: selectedConnection.config?.defaultTag
                                });
                                if (selectedPreset.variables?.includes('tag')) {
                                  const tagValue = formData.tag?.trim() || selectedConnection.config?.defaultTag || '{tag}';
                                  console.log('🔧 [PREVIEW] Replacing {tag} with:', tagValue);
                                  processedQuery = processedQuery.replace(/\{tag\}/g, tagValue);
                                  console.log('🔧 [PREVIEW] Processed query result:', processedQuery);
                                }
                                previewQuery = `${processedQuery}\n\n-- AVEVA PI Custom Preset: ${selectedPreset.name}`;
                              } else {
                                // For standard AVEVA PI presets
                                previewQuery = `-- AVEVA PI Standard Preset: ${selectedPreset.name}\n-- Query: ${selectedPreset.query}`;
                              }
                              const intervalInfo = formData.avevaPiInterval ? ` (Interval: ${formData.avevaPiInterval})` : '';
                              return `${previewQuery}${intervalInfo}\n-- Data akan diambil dengan interval ${formData.avevaPiInterval || '1h'}`;
                            }
                            return 'Pilih preset AVEVA PI untuk melihat preview';
                          } else {
                            return 'Pilih mode query untuk AVEVA PI';
                          }
                        }

                        const selectedPreset = findPresetById(formData.presetQueryId);
                        if (!selectedPreset) return 'Pilih preset query untuk melihat preview';

                        // Get tag for AVEVA PI - NO HARDCODE!
                        let tag = '';
                        if (selectedConnection.plugin === 'aveva-pi') {
                          // Prioritas: form input > connection config > empty (validation will handle)
                          tag = formData.tag || selectedConnection.config?.defaultTag || '';
                        }

                        // Generate SQL preview similar to backend logic
                        if (selectedConnection.plugin === 'aveva-pi') {
                        // Generate SQL-like preview for AVEVA PI
                        let previewQuery = '';
                        if (selectedPreset.id.startsWith('custom-')) {
                          // For custom AVEVA PI presets, show template with variables replaced
                          previewQuery = selectedPreset.query.replace(/\{tag\}/g, tag || '{tag}');
                        } else {
                          // For other AVEVA PI presets, show generic preview
                          previewQuery = `SELECT * FROM Point\nWHERE tag = '${tag}'\n-- AVEVA PI Query: ${selectedPreset.query}`;
                        }
                        return previewQuery;
                        } else {
                          // Handle other database types
                          let previewQuery = selectedPreset.query;
                          if (selectedConnection.plugin === 'mysql' || (selectedConnection.plugin === 'database' && selectedConnection.databaseType === 'mysql')) {
                            if (mysqlQueryData.table) {
                              previewQuery = previewQuery.replace('{table}', `\`${mysqlQueryData.table}\``);
                            } else {
                              previewQuery = previewQuery.replace('{table}', 'sensor_data');
                            }

                            if (mysqlQueryData.sortColumn) {
                              previewQuery = previewQuery.replaceAll('{sortColumn}', mysqlQueryData.sortColumn);
                            } else {
                              previewQuery = previewQuery.replaceAll('{sortColumn}', 'id');
                            }
                          } else if (selectedConnection.plugin === 'database' && selectedConnection.databaseType === 'oracle') {
                            if (formData.selectedTable) {
                              previewQuery = previewQuery.replace('{table}', `"${formData.selectedTable}"`);
                            } else {
                              previewQuery = previewQuery.replace('{table}', '"ALARMS"');
                            }
                            if (formData.selectedSortColumn) {
                              previewQuery = previewQuery.replaceAll('{sortColumn}', formData.selectedSortColumn);
                            } else {
                              previewQuery = previewQuery.replaceAll('{sortColumn}', 'TIMESTAMP');
                            }
                          } else {
                            previewQuery = previewQuery.replace('{table}', 'data_table');
                          }
                          return previewQuery;
                        }
                        return 'Pilih preset query untuk melihat preview';
                      })()}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🎯 [TEST QUERY BUTTON] ===== BUTTON CLICKED =====');
                        console.log('🎯 [TEST QUERY BUTTON] Current formData:', JSON.stringify(formData, null, 2));
                        console.log('🎯 [TEST QUERY BUTTON] formData.avevaPiInterval:', formData.avevaPiInterval);
                        const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
                        console.log('🎯 [TEST QUERY BUTTON] selectedConnection?.plugin:', selectedConnection?.plugin);
                        const intervalParam = selectedConnection?.plugin === 'aveva-pi' ? (formData.avevaPiInterval || '1h') : undefined;
                        console.log('🎯 [TEST QUERY BUTTON] intervalParam to send:', intervalParam);
                        handleTestQuery(intervalParam);
                      }}
                      disabled={testResult.loading}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors text-sm"
                    >
                      {testResult.loading ? 'Testing...' : 'Test Query'}
                    </button>
                    <div className="text-xs text-gray-500">
                      Test tanpa interval (hijau) - untuk validasi query
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      {editingTrigger ? 'Update' : 'Buat'} Trigger
                    </button>
                  </div>
                </div>

                {(() => {
                  const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
                  const isAvevaPI = selectedConnection?.plugin === 'aveva-pi';

                  // Skip showing results here for AVEVA PI - it's handled in the form component
                  if (isAvevaPI) {
                    return null;
                  }

                  const debugInfo = {
                    testResult,
                    hasData: testResult && testResult.data,
                    dataType: testResult?.data ? typeof testResult.data : 'undefined',
                    hasNestedData: testResult?.data && 'data' in testResult.data,
                    nestedDataLength: testResult?.data?.data ? (Array.isArray(testResult.data.data) ? testResult.data.data.length : 'not array') : 'no nested data',
                    directDataLength: Array.isArray(testResult?.data) ? testResult.data.length : 'not direct array',
                    willShow: testResult && !testResult.loading && (testResult.data || testResult.error),
                    displayData: testResult?.data?.data || testResult?.data
                  };
                  console.log('🔍 UI Test Result Debug:', debugInfo);
                  return debugInfo.willShow && (
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">📊 Hasil Query:</h5>
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-green-800 whitespace-pre-wrap">
                          {JSON.stringify(debugInfo.displayData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const selectedConnection = connections.find(c => c.id === formData.dataSourceId);
                  const isAvevaPI = selectedConnection?.plugin === 'aveva-pi';

                  // Skip showing errors here for AVEVA PI - it's handled in the form component
                  if (isAvevaPI) {
                    return null;
                  }

                  return testResult.error && (
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-red-900 mb-2">Error:</h5>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-xs text-red-800">{testResult.error}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </form>
        </Modal>
      )}
      </>

      {showDeleteConfirm && (
        <Modal
          onClose={() => setShowDeleteConfirm(null)}
          title="Konfirmasi Hapus"
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200"
              >
                Hapus
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-700">
                  Apakah Anda yakin ingin menghapus trigger <strong className="text-gray-900">{showDeleteConfirm.name}</strong>?
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait trigger ini.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showSuccessModal && (
        <Modal
          onClose={() => setShowSuccessModal(false)}
          title="Berhasil!"
          size="sm"
          footer={
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-200"
              >
                OK
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium text-gray-900">
                  {successMessage}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Data telah tersimpan dan tabel telah diperbarui secara otomatis.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-right-2 fade-in duration-300 ${
          isHiding ? 'animate-out fade-out slide-out-to-right-2 duration-300' : ''
        }`}>
          <div className={`bg-white rounded-xl shadow-2xl border border-gray-200/50 backdrop-blur-sm overflow-hidden ${
            notification.type === 'success' ? 'border-green-200' : 'border-red-200'
          }`}>
            <div className={`px-4 py-3 ${
              notification.type === 'success' 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100' 
                : 'bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {notification.type === 'success' ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    notification.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {notification.message}
                  </p>
                  <p className={`text-xs mt-1 ${
                    notification.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Menghilang dalam {notificationTimeLeft} detik
                  </p>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    notification.type === 'success' 
                      ? 'hover:bg-green-100 text-green-400 hover:text-green-600' 
                      : 'hover:bg-red-100 text-red-400 hover:text-red-600'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className={`h-1 bg-gray-100 ${
              notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                } ${isHiding ? 'animate-pulse' : ''}`}
                style={{ width: `${(notificationTimeLeft / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
