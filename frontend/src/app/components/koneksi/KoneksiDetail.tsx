"use client";


type Props = {
  item: any;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
};

export default function KoneksiDetail({ item, onEdit, onDelete }: Props) {
  if (!item) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{item.name} <span className="text-sm text-gray-500">({item.id})</span></h3>
            <div className="text-sm text-gray-600 mt-1">Plugin: {item.plugin}</div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm" onClick={() => onEdit && onEdit(item)}>Edit</button>
            <button className="px-3 py-1 bg-red-500 text-white rounded-md text-sm" onClick={() => onDelete && onDelete(item.id)}>Delete</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="text-sm font-medium text-gray-600">Status</div>
            <div className="text-gray-800 mt-1">{item.status || item.connected ? 'connected' : 'unknown'}</div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="text-sm font-medium text-gray-600">Config</div>
            <pre className="mt-2 bg-white p-3 rounded text-xs overflow-auto border">{JSON.stringify(item.config || {}, null, 2)}</pre>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="text-sm font-medium text-gray-600">Schema / Metadata</div>
            <pre className="mt-2 bg-white p-3 rounded text-xs overflow-auto border">{JSON.stringify(item.schema || item.metadata || {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
