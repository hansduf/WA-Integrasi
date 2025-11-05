# 📚 List Triggers - Advanced Styling Patterns

**Document Purpose:** Advanced styling patterns and code examples from the List Triggers component

---

## Table of Contents
1. [Search & Filter Section Styling](#search--filter-section-styling)
2. [Trigger List Display](#trigger-list-display)
3. [Status Indicators](#status-indicators)
4. [Form Validation Patterns](#form-validation-patterns)
5. [Query Preview Styling](#query-preview-styling)
6. [Testing Section](#testing-section)
7. [Loading & Empty States](#loading--empty-states)
8. [Error Handling Styling](#error-handling-styling)

---

## Search & Filter Section Styling

### Search Input Container
```jsx
<div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6 mb-6">
  {/* Card-style container */}
  <div className="flex flex-col md:flex-row gap-4 items-end">
    {/* Search inputs */}
  </div>
</div>
```

### Search Input Field
```jsx
<div className="flex-1">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    🔍 Cari Trigger
  </label>
  <input
    type="text"
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    }}
    placeholder="Cari berdasarkan nama atau tipe..."
    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
  />
</div>
```

**Features:**
- Full width responsive
- Clear placeholder text
- Focus ring for accessibility
- Emoji icon for visual cue

### Create Button
```jsx
<button
  onClick={handleCreate}
  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
             transition-colors font-medium shadow-sm hover:shadow-md"
>
  + Buat Trigger Baru
</button>
```

---

## Trigger List Display

### List Header Section
```jsx
{displayItems.length > 0 && (
  <div className="flex items-center justify-between mb-4 px-4 py-3 
                  bg-gray-50 rounded-lg border border-gray-200">
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-gray-700">
        📊 Menampilkan {displayItems.slice(startIndex, endIndex).length} 
        dari {displayItems.length} hasil
      </span>
      {filteredCount !== displayItems.length && (
        <span className="text-xs text-gray-500">
          (Difilter dari {displayItems.length} total)
        </span>
      )}
    </div>
  </div>
)}
```

### Trigger Item Card
```jsx
<div key={item.id} className="bg-white border border-gray-300 rounded-lg p-4 mb-3 
                              hover:shadow-md transition-shadow">
  {/* Card header with title */}
  <div className="flex items-start justify-between">
    <div className="flex-1">
      {/* Trigger info */}
    </div>
    {/* Action buttons */}
  </div>
</div>
```

### Trigger Item Details
```jsx
<div className="flex items-center gap-2">
  {/* Type indicator */}
  {item.type === 'trigger' && (
    <>
      <span className="px-2 py-1 text-xs font-medium 
                       bg-blue-100 text-blue-800 rounded">
        TRIGGER
      </span>
      <h3 className="text-lg font-semibold text-gray-900">
        {item.name}
      </h3>
    </>
  )}
  {item.type === 'group' && (
    <>
      <span className="px-2 py-1 text-xs font-medium 
                       bg-purple-100 text-purple-800 rounded">
        GROUP
      </span>
      <h3 className="text-lg font-semibold text-gray-900">
        👥 {item.name}
      </h3>
    </>
  )}
</div>
```

### Trigger Meta Information
```jsx
<div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-2">
  {/* Data source badge */}
  <span className="inline-flex items-center gap-1">
    🔌 <strong>Data Source:</strong> 
    {connections.find(c => c.id === item.dataSource)?.name || 'Unknown'}
  </span>
  
  {/* Status badge */}
  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
    item.active 
      ? 'bg-green-100 text-green-800 font-medium' 
      : 'bg-gray-200 text-gray-700 font-medium'
  }`}>
    {item.active ? '✓ Aktif' : '✗ Nonaktif'}
  </span>
  
  {/* Description */}
  {item.description && (
    <span className="text-gray-700 line-clamp-1">
      {item.description}
    </span>
  )}
</div>
```

### Action Buttons Group
```jsx
<div className="flex gap-2 mt-3">
  <button
    onClick={() => handleEdit(item)}
    className="px-3 py-1 text-sm bg-blue-600 text-white rounded 
               hover:bg-blue-700 transition-colors"
  >
    ✏️ Edit
  </button>
  <button
    onClick={() => handleDelete(item)}
    className="px-3 py-1 text-sm bg-red-600 text-white rounded 
               hover:bg-red-700 transition-colors"
  >
    🗑️ Hapus
  </button>
</div>
```

---

## Status Indicators

### Active/Inactive Status Badge
```jsx
{/* Active - Green */}
<span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
  ✓ Aktif
</span>

{/* Inactive - Gray */}
<span className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
  ✗ Nonaktif
</span>

{/* Warning - Yellow */}
<span className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
  ⚠️ Caution
</span>

{/* Error - Red */}
<span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
  ✕ Error
</span>
```

### Status with Icon
```jsx
<div className="inline-flex items-center gap-1">
  {item.active ? (
    <>
      <span className="w-2 h-2 bg-green-600 rounded-full"></span>
      <span className="text-green-700 font-medium">Aktif</span>
    </>
  ) : (
    <>
      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
      <span className="text-gray-600 font-medium">Nonaktif</span>
    </>
  )}
</div>
```

### Data Source Type Indicator
```jsx
{/* MySQL */}
<span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
  [MySQL] {name}
</span>

{/* Oracle */}
<span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
  [Oracle] {name}
</span>

{/* AVEVA PI */}
<span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
  [AVEVA PI] {name}
</span>
```

---

## Form Validation Patterns

### Validation Error Display
```jsx
{avevaPiValidation.errors && avevaPiValidation.errors.length > 0 && (
  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
    <p className="text-sm font-medium text-red-900 mb-2">
      ⚠️ Validation Errors:
    </p>
    <ul className="space-y-1">
      {avevaPiValidation.errors.map((error, index) => (
        <li key={index} className="text-sm text-red-700">
          • {error}
        </li>
      ))}
    </ul>
  </div>
)}
```

### Field with Error State
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Tag AVEVA PI *
  </label>
  <input
    type="text"
    value={formData.tag}
    onChange={(e) => setFormData(prev => ({ ...prev, tag: e.target.value }))}
    className={`w-full px-3 py-2 border rounded-md focus:ring-2 
                 focus:border-transparent transition-colors
                 ${isInvalid 
                   ? 'border-red-500 focus:ring-red-500' 
                   : 'border-gray-300 focus:ring-blue-500'}`}
    placeholder="Contoh: CPU_TEMP"
  />
  {isInvalid && (
    <p className="text-sm text-red-600 mt-1">Tag is required</p>
  )}
</div>
```

### Success Validation Indicator
```jsx
{validation.isValid && (
  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
    <p className="text-sm text-green-700">
      ✓ All validations passed
    </p>
  </div>
)}
```

---

## Query Preview Styling

### Preview Container
```jsx
<div className="border border-gray-200 rounded-md p-4 mb-4">
  {/* Preview section */}
</div>
```

### Preview Header
```jsx
<h4 className="text-sm font-semibold text-blue-900 mb-2">
  📋 SQL Query Preview:
</h4>
```

### Code Block
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-md p-3">
  <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono 
                   overflow-x-auto">
    {queryPreview}
  </pre>
</div>
```

**Classes:**
- `bg-blue-50` → Light blue background (hint color)
- `border border-blue-200` → Subtle blue border
- `text-blue-800` → Dark blue text for code
- `font-mono` → Monospace font (code styling)
- `whitespace-pre-wrap` → Preserve formatting & wrap
- `text-xs` → Small text for readability
- `overflow-x-auto` → Horizontal scroll if needed
- `p-3` → Padding around code

### Alternative Preview Colors

**Success Preview**
```jsx
<div className="bg-green-50 border border-green-200 rounded-md p-3">
  <pre className="text-xs text-green-800 whitespace-pre-wrap font-mono">
    {queryPreview}
  </pre>
</div>
```

**Error Preview**
```jsx
<div className="bg-red-50 border border-red-200 rounded-md p-3">
  <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">
    {errorMessage}
  </pre>
</div>
```

---

## Testing Section

### Test Query Button
```jsx
<button
  type="button"
  onClick={() => handleTestQuery()}
  className="px-4 py-2 bg-green-600 text-white rounded-md 
             hover:bg-green-700 transition-colors font-medium"
>
  🧪 Test Query
</button>
```

### Test Result Container
```jsx
{testResult.loading && (
  <div className="flex items-center gap-2 text-blue-600">
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 
                    border-t-transparent"></div>
    <span>Testing query...</span>
  </div>
)}

{testResult.error && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
    <p className="text-sm font-medium text-red-900">❌ Error:</p>
    <p className="text-sm text-red-700 mt-1">{testResult.error}</p>
  </div>
)}

{testResult.data && !testResult.loading && (
  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
    <p className="text-sm font-medium text-green-900">✅ Success!</p>
    <pre className="text-xs text-green-800 mt-2 overflow-x-auto">
      {JSON.stringify(testResult.data, null, 2)}
    </pre>
  </div>
)}
```

### Result Data Display
```jsx
<div className="mt-4">
  <h5 className="text-sm font-semibold text-gray-900 mb-2">
    📊 Result Preview:
  </h5>
  {testResult.data?.length > 0 ? (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 
                    max-h-40 overflow-y-auto">
      <table className="w-full text-xs text-gray-700">
        <tbody>
          {testResult.data.slice(0, 5).map((row, idx) => (
            <tr key={idx} className="border-b border-gray-200 last:border-b-0">
              <td className="px-2 py-1">{JSON.stringify(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {testResult.data.length > 5 && (
        <p className="text-center pt-2 text-gray-600">
          +{testResult.data.length - 5} more results...
        </p>
      )}
    </div>
  ) : (
    <p className="text-sm text-gray-600">No data returned</p>
  )}
</div>
```

---

## Loading & Empty States

### Loading Spinner
```jsx
{loading && (
  <div className="flex items-center justify-center py-12">
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 
                        border-blue-600 border-t-transparent"></div>
      </div>
      <p className="text-gray-600">Loading triggers...</p>
    </div>
  </div>
)}
```

### Empty State Display
```jsx
{displayItems.length === 0 && !loading && (
  <div className="flex items-center justify-center py-12 px-4">
    <div className="text-center space-y-4">
      <div className="text-6xl">📭</div>
      <h3 className="text-xl font-semibold text-gray-900">
        No Triggers Found
      </h3>
      <p className="text-gray-600 max-w-md">
        {searchTerm
          ? `No triggers match your search "${searchTerm}"`
          : 'Create your first trigger to get started'}
      </p>
      <button
        onClick={handleCreate}
        className="px-4 py-2 bg-blue-600 text-white rounded-md 
                   hover:bg-blue-700 transition-colors"
      >
        Create First Trigger
      </button>
    </div>
  </div>
)}
```

### Data Loading State
```jsx
{!loading && connections.length === 0 && (
  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p className="text-yellow-800">
      ⚠️ No data sources found. Create a connection first.
    </p>
  </div>
)}
```

---

## Error Handling Styling

### Error Banner
```jsx
{error && (
  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded-md">
    <div className="flex items-start gap-3">
      <span className="text-red-600 text-xl">❌</span>
      <div className="flex-1">
        <h4 className="font-semibold text-red-900">Error</h4>
        <p className="text-sm text-red-800 mt-1">{error}</p>
      </div>
      <button
        onClick={() => setError(null)}
        className="text-red-600 hover:text-red-800 font-bold"
      >
        ✕
      </button>
    </div>
  </div>
)}
```

### Form Submission Error
```jsx
{submitError && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
    <p className="text-sm text-red-700">
      <strong>Error:</strong> {submitError}
    </p>
  </div>
)}
```

### Field-Level Error
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Field Name
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border-2 rounded-md 
               border-red-500 focus:ring-2 focus:ring-red-500"
    aria-invalid="true"
    aria-describedby="field-error"
  />
  <p id="field-error" className="text-sm text-red-600 mt-1">
    This field is required
  </p>
</div>
```

### Retry Button
```jsx
{error && (
  <button
    onClick={loadData}
    className="px-4 py-2 bg-gray-600 text-white rounded-md 
               hover:bg-gray-700 transition-colors"
  >
    🔄 Retry
  </button>
)}
```

---

## Notification Patterns

### Success Notification
```jsx
{notification?.type === 'success' && (
  <div className="fixed top-4 right-4 p-4 bg-green-600 text-white rounded-lg 
                   shadow-lg animation-fade-out">
    <div className="flex items-center gap-2">
      <span className="text-xl">✓</span>
      <span>{notification.message}</span>
    </div>
  </div>
)}
```

### Error Notification
```jsx
{notification?.type === 'error' && (
  <div className="fixed top-4 right-4 p-4 bg-red-600 text-white rounded-lg 
                   shadow-lg animation-fade-out">
    <div className="flex items-center gap-2">
      <span className="text-xl">✕</span>
      <span>{notification.message}</span>
    </div>
  </div>
)}
```

### Warning Notification
```jsx
{notification?.type === 'warning' && (
  <div className="fixed top-4 right-4 p-4 bg-yellow-600 text-white rounded-lg 
                   shadow-lg animation-fade-out">
    <div className="flex items-center gap-2">
      <span className="text-xl">⚠️</span>
      <span>{notification.message}</span>
    </div>
  </div>
)}
```

---

## Modal Content Patterns

### Create/Edit Modal Content
```jsx
<Modal
  onClose={() => setShowCreateModal(false)}
  title={editingTrigger ? 'Edit Trigger' : 'Buat Trigger Baru'}
>
  <form onSubmit={handleSubmit} className="space-y-4">
    {/* Form sections */}
    
    <div className="flex gap-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={() => setShowCreateModal(false)}
        className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md 
                   hover:bg-gray-400 transition-colors"
      >
        Batal
      </button>
      <button
        type="submit"
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md 
                   hover:bg-blue-700 transition-colors font-medium"
      >
        {editingTrigger ? 'Update' : 'Buat'} Trigger
      </button>
    </div>
  </form>
</Modal>
```

### Delete Confirmation Modal
```jsx
<Modal
  onClose={() => setShowDeleteConfirm(null)}
  title="Hapus Trigger?"
>
  <div className="space-y-4">
    <p className="text-gray-700">
      Apakah Anda yakin ingin menghapus trigger 
      <strong className="text-red-600"> "{showDeleteConfirm?.name}"</strong>?
    </p>
    <p className="text-sm text-gray-600">
      ⚠️ Aksi ini tidak dapat dibatalkan.
    </p>
    
    <div className="flex gap-3">
      <button
        onClick={() => setShowDeleteConfirm(null)}
        className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md 
                   hover:bg-gray-400 transition-colors"
      >
        Batal
      </button>
      <button
        onClick={confirmDelete}
        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md 
                   hover:bg-red-700 transition-colors font-medium"
      >
        Hapus Permanent
      </button>
    </div>
  </div>
</Modal>
```

---

**Last Updated:** October 2025
**Component:** List Triggers (2,443 lines)
**Framework:** React 18 + TypeScript + Tailwind CSS
