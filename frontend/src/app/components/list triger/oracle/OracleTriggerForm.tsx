'use client';

import React, { useEffect } from 'react';

interface DataSource {
  id: string;
  name: string;
  plugin: string;
  databaseType?: string;
  config?: any;
}

interface TriggerFormData {
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
  selectedSortColumn: string;
}

interface OracleTriggerFormProps {
  formData: TriggerFormData;
  setFormData: React.Dispatch<React.SetStateAction<TriggerFormData>>;
  connections: DataSource[];
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loadDatabaseTables: (dataSourceId: string) => Promise<void>;
  loadDatabaseColumns: (dataSourceId: string, tableName: string) => Promise<void>;
  handleTableChange: (tableName: string) => void;
}

export default function OracleTriggerForm({
  formData,
  setFormData,
  connections,
  setError,
  loadDatabaseTables,
  loadDatabaseColumns,
  handleTableChange
}: OracleTriggerFormProps) {
  const selectedConnection = connections.find(c => c.id === formData.dataSourceId);

  // Fungsi untuk mendeteksi kolom yang berhubungan dengan waktu untuk Oracle
  const detectTimeColumn = (columns: string[]): string => {
    // Prioritas 0: Kolom yang paling relevan untuk real-time data
    const priorityColumns = ['CREATED_DATE', 'MODIFIED_DATE', 'INSERT_DATE', 'UPDATE_DATE', 'TIMESTAMP'];
    for (const priorityCol of priorityColumns) {
      if (columns.includes(priorityCol)) {
        return priorityCol;
      }
    }

    const timeKeywords = [
      'timestamp', 'time', 'datetime', 'created', 'updated', 'inserted', 'modified',
      'tanggal', 'waktu', 'jam', 'hari', 'bulan', 'tahun', 'dt', 'ts', 'date'
    ];

    // Prioritas 1: Kolom yang mengandung kata kunci waktu lainnya
    for (const column of columns) {
      const lowerColumn = column.toLowerCase();
      if (timeKeywords.some(keyword => lowerColumn.includes(keyword))) {
        return column;
      }
    }

    // Prioritas 2: Kolom dengan nama 'ID' (biasanya auto-increment dengan urutan waktu)
    if (columns.includes('ID')) {
      return 'ID';
    }

    // Prioritas 3: Kolom pertama sebagai fallback
    return columns.length > 0 ? columns[0] : 'ID'; // Default ke 'ID' jika tidak ada kolom
  };

  // Auto-select kolom sorting ketika columns loaded (hanya jika belum ada pilihan)
  useEffect(() => {
    if (formData.availableColumns.length > 0 && !formData.selectedSortColumn) {
      const recommendedColumn = detectTimeColumn(formData.availableColumns);
      if (recommendedColumn) {
        setFormData((prev: TriggerFormData) => ({
          ...prev,
          selectedSortColumn: recommendedColumn
        }));
      }
    }
  }, [formData.availableColumns, formData.selectedSortColumn]);

  if ((selectedConnection?.plugin !== 'database' || selectedConnection?.databaseType !== 'oracle') || formData.availableTables.length === 0) {
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
            value={formData.selectedTable || ''}
            onChange={(e) => handleTableChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            required
          >
            <option key="empty-table" value="">
              {formData.availableTables.length === 0 ? 'Memuat tabel...' : 'Pilih tabel dari database...'}
            </option>
            {formData.availableTables.map((table: string, index: number) => (
              <option key={table || `table-${index}`} value={table}>
                [TABLE] {table}
              </option>
            ))}
          </select>
        </div>

        {formData.selectedTable && formData.availableColumns.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Kolom untuk Sorting *
            </label>
            <select
              value={formData.selectedSortColumn || ''}
              onChange={(e) => setFormData((prev: TriggerFormData) => ({ ...prev, selectedSortColumn: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              <option key="empty-column" value="">
                Pilih kolom untuk sorting...
              </option>
              {formData.availableColumns.map((column: string, index: number) => (
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

      {formData.selectedTable && (
        <div className="mt-2 text-sm text-gray-600">
          Tabel: {formData.selectedTable} ({formData.availableColumns.length} kolom)
          {formData.selectedSortColumn && (
            <span className="ml-2 text-blue-600 font-medium">
              • Sort by: {formData.selectedSortColumn}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
