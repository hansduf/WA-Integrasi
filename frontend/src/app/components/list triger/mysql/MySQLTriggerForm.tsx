'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

interface DataSource {
  id: string;
  name: string;
  plugin: string;
  databaseType?: string;
  config?: any;
}

interface MySQLTriggerFormProps {
  dataSourceId: string;
  connections: DataSource[];
  onTableSelected?: (tableName: string) => void;
  onColumnsLoaded?: (columns: string[]) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  onQueryGenerated?: (query: string, selectedTable: string, selectedSortColumn: string) => void;
}

export default function MySQLTriggerForm({
  dataSourceId,
  connections,
  onTableSelected,
  onColumnsLoaded,
  onValidationChange,
  onQueryGenerated
}: MySQLTriggerFormProps) {
  // Internal state for MySQL-specific data
  const [mysqlState, setMysqlState] = useState({
    selectedTable: '',
    availableTables: [] as string[],
    availableColumns: [] as string[],
    selectedSortColumn: ''
  });

  const selectedConnection = connections.find(c => c.id === dataSourceId);

  // Fungsi untuk mendeteksi kolom yang berhubungan dengan waktu
  const detectTimeColumn = (columns: string[]): string => {
    // Prioritas 0: Kolom yang paling relevan untuk real-time data
    const priorityColumns = ['date', 'created_at', 'updated_at', 'timestamp'];
    for (const priorityCol of priorityColumns) {
      if (columns.includes(priorityCol)) {
        return priorityCol;
      }
    }

    const timeKeywords = [
      'timestamp', 'time', 'datetime', 'created_at', 'updated_at',
      'created', 'updated', 'inserted', 'modified', 'tanggal', 'waktu',
      'jam', 'hari', 'bulan', 'tahun', 'dt', 'ts'
    ];

    // Prioritas 1: Kolom yang mengandung kata kunci waktu lainnya
    for (const column of columns) {
      const lowerColumn = column.toLowerCase();
      if (timeKeywords.some(keyword => lowerColumn.includes(keyword))) {
        return column;
      }
    }

    // Prioritas 2: Kolom dengan nama 'id' (biasanya auto-increment dengan urutan waktu)
    if (columns.includes('id')) {
      return 'id';
    }

    // Prioritas 3: Kolom pertama sebagai fallback
    return columns.length > 0 ? columns[0] : 'id'; // Default ke 'id' jika tidak ada kolom
  };

  // Load available tables for database connection
  const loadDatabaseTables = async (dataSourceId: string) => {
    try {
      const result = await apiFetch(`/api/data-sources/${dataSourceId}/tables`);

      if (result && Array.isArray(result.tables)) {
        setMysqlState(prev => ({
          ...prev,
          availableTables: result.tables,
          selectedTable: result.tables.length === 1 ? result.tables[0] : ''
        }));

        // If only one table, auto-load its columns
        if (result.tables.length === 1) {
          await loadDatabaseColumns(dataSourceId, result.tables[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load database tables:', err);
      // Handle error via callback if needed
    }
  };

  // Load available columns for selected database table
  const loadDatabaseColumns = async (dataSourceId: string, tableName: string) => {
    try {
      const result = await apiFetch(`/api/data-sources/${dataSourceId}/tables/${encodeURIComponent(tableName)}/columns`);

      if (result && Array.isArray(result.columns)) {
        setMysqlState(prev => ({
          ...prev,
          availableColumns: result.columns
        }));

        // Call callback if provided
        if (onColumnsLoaded) {
          onColumnsLoaded(result.columns);
        }
      }
    } catch (err: any) {
      console.error('Failed to load MySQL columns:', err);
      // Handle error via callback if needed
    }
  };

  // Handle table selection for MySQL
  const handleTableChange = (tableName: string) => {
    setMysqlState(prev => ({
      ...prev,
      selectedTable: tableName,
      selectedSortColumn: '', // Reset sort column when table changes
      availableColumns: [] // Reset available columns
    }));

    // Call callback if provided
    if (onTableSelected) {
      onTableSelected(tableName);
    }

    // Load columns when table is selected
    if (tableName && dataSourceId) {
      loadDatabaseColumns(dataSourceId, tableName);
    }
  };

  // Auto-select kolom sorting ketika columns loaded (hanya jika belum ada pilihan)
  useEffect(() => {
    if (mysqlState.availableColumns.length > 0 && !mysqlState.selectedSortColumn) {
      const recommendedColumn = detectTimeColumn(mysqlState.availableColumns);
      if (recommendedColumn) {
        setMysqlState((prev) => ({
          ...prev,
          selectedSortColumn: recommendedColumn
        }));
      }
    }
  }, [mysqlState.availableColumns, mysqlState.selectedSortColumn]); // Tambahkan mysqlState.selectedSortColumn sebagai dependency

  // Load tables when dataSourceId changes
  useEffect(() => {
    if (dataSourceId && (selectedConnection?.plugin === 'mysql' || (selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'mysql'))) {
      loadDatabaseTables(dataSourceId);
    }
  }, [dataSourceId, selectedConnection]);

  // Validation effect
  useEffect(() => {
    if (onValidationChange) {
      const errors: string[] = [];
      if (mysqlState.availableTables.length > 0 && !mysqlState.selectedTable) {
        errors.push('Tabel database harus dipilih');
      }
      if (mysqlState.availableColumns.length > 0 && !mysqlState.selectedSortColumn) {
        errors.push('Kolom sorting harus dipilih');
      }
      onValidationChange(errors.length === 0, errors);
    }
  }, [mysqlState.availableTables, mysqlState.selectedTable, mysqlState.availableColumns, mysqlState.selectedSortColumn, onValidationChange]);

  // Query generation effect - return data needed for query generation
  useEffect(() => {
    if (onQueryGenerated && mysqlState.selectedTable && mysqlState.selectedSortColumn) {
      console.log('📤 MySQLTriggerForm: Sending query data to parent:', {
        table: mysqlState.selectedTable,
        sortColumn: mysqlState.selectedSortColumn
      });
      // Return the data needed for query generation to parent component
      onQueryGenerated('', mysqlState.selectedTable, mysqlState.selectedSortColumn);
    } else {
      console.log('⏳ MySQLTriggerForm: Waiting for complete data:', {
        hasTable: !!mysqlState.selectedTable,
        hasSortColumn: !!mysqlState.selectedSortColumn,
        table: mysqlState.selectedTable,
        sortColumn: mysqlState.selectedSortColumn
      });
    }
  }, [mysqlState.selectedTable, mysqlState.selectedSortColumn, onQueryGenerated]);

  if ((selectedConnection?.plugin !== 'mysql' && !(selectedConnection?.plugin === 'database' && selectedConnection?.databaseType === 'mysql')) || mysqlState.availableTables.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded p-3">

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">
            Pilih Tabel *
          </label>
          <select
            value={mysqlState.selectedTable || ''}
            onChange={(e) => handleTableChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          >
            <option key="empty-table" value="">
              {mysqlState.availableTables.length === 0 ? 'Memuat tabel...' : 'Pilih tabel dari database...'}
            </option>
            {mysqlState.availableTables.map((table: string, index: number) => (
              <option key={table || `table-${index}`} value={table}>
                [TABLE] {table}
              </option>
            ))}
          </select>
        </div>

        {mysqlState.selectedTable && mysqlState.availableColumns.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Kolom untuk Sorting *
            </label>
            <select
              value={mysqlState.selectedSortColumn || ''}
              onChange={(e) => setMysqlState((prev) => ({ ...prev, selectedSortColumn: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option key="empty-column" value="">
                Pilih kolom untuk sorting...
              </option>
              {mysqlState.availableColumns.map((column: string, index: number) => (
                <option key={column || `column-${index}`} value={column}>
                  [COLUMN] {column}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500">
              Kolom ini akan digunakan untuk ORDER BY dalam query
            </div>
          </div>
        )}
      </div>

      {mysqlState.selectedTable && (
        <div className="mt-2 text-sm text-gray-600">
          Tabel: {mysqlState.selectedTable} ({mysqlState.availableColumns.length} kolom)
          {mysqlState.selectedSortColumn && (
            <span className="ml-2 text-blue-600 font-medium">
              • Sort by: {mysqlState.selectedSortColumn}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
