# 🗂️ List Triggers - Subfolder Components & Styling

**Document Purpose:** Detailed styling breakdown of subfolder components (AVEVA PI, MySQL, Oracle, Groups)

---

## Directory Structure
```
frontend/src/app/components/list triger/
├── list triger.tsx               ← Main component
├── aveva-pi/
│   └── AvevaPITriggerForm.tsx    ← AVEVA PI-specific form
├── mysql/
│   └── MySQLTriggerForm.tsx      ← MySQL-specific form
├── oracle/
│   └── OracleTriggerForm.tsx     ← Oracle-specific form
└── group/
    └── TriggerGroupsManager.tsx  ← Group management
```

---

## AVEVA PI Trigger Form Component

**File:** `frontend/src/app/components/list triger/aveva-pi/AvevaPITriggerForm.tsx`

### Purpose
- Handles AVEVA PI-specific form fields
- Manages tag selection and custom queries
- Supports preset query management
- Validates AVEVA PI configurations

### Key Styling Features

#### 1. Query Mode Selection
```jsx
<div className="space-y-3">
  <label className="block text-sm font-medium text-gray-700">
    Query Mode *
  </label>
  <div className="grid grid-cols-2 gap-2">
    {/* Preset Mode Button */}
    <button
      onClick={() => setQueryMode('preset')}
      className={`px-4 py-2 rounded-md border-2 transition-all ${
        queryMode === 'preset'
          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      }`}
    >
      📋 Preset Queries
    </button>
    
    {/* Custom Mode Button */}
    <button
      onClick={() => setQueryMode('custom')}
      className={`px-4 py-2 rounded-md border-2 transition-all ${
        queryMode === 'custom'
          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      }`}
    >
      ✏️ Custom Query
    </button>
  </div>
</div>
```

**Styling Details:**
- Two-button toggle with clear visual feedback
- Border-based selection indicator
- Blue highlight for active mode
- Smooth transitions

#### 2. Tag Selection
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Tag AVEVA PI *
  </label>
  <div className="flex gap-2">
    <input
      type="text"
      value={tag}
      onChange={(e) => setTag(e.target.value)}
      placeholder="CPU_TEMP, SYSTEM_PRESSURE..."
      className="flex-1 px-3 py-2 border border-gray-300 rounded-md 
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                 transition-colors"
    />
    {tagLoading && (
      <div className="flex items-center px-3 py-2 bg-blue-50 rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-2 
                        border-blue-600 border-t-transparent"></div>
      </div>
    )}
  </div>
  
  {/* Available Tags Dropdown */}
  {availableTags.length > 0 && (
    <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 
                    rounded-md bg-white">
      {availableTags.map((availableTag, index) => (
        <button
          key={index}
          onClick={() => setTag(availableTag)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 
                     transition-colors border-b border-gray-100 last:border-b-0"
        >
          {availableTag}
        </button>
      ))}
    </div>
  )}
</div>
```

**Features:**
- Input field with placeholder
- Loading indicator (spinner)
- Dropdown with available tags
- Click to select tags
- Hover effect on tag options

#### 3. Interval Selection (AVEVA PI-specific)
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Data Polling Interval
  </label>
  <select
    value={formData.avevaPiInterval || '1h'}
    onChange={(e) => setFormData(prev => ({ 
      ...prev, 
      avevaPiInterval: e.target.value 
    }))}
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
  >
    <option value="5m">Every 5 minutes</option>
    <option value="15m">Every 15 minutes</option>
    <option value="30m">Every 30 minutes</option>
    <option value="1h">Every 1 hour (default)</option>
    <option value="6h">Every 6 hours</option>
    <option value="24h">Every 24 hours</option>
    <option value="custom">Custom interval</option>
  </select>
</div>
```

#### 4. Custom Query Editor
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Custom SQL Query *
  </label>
  <textarea
    value={customQuery}
    onChange={(e) => setCustomQuery(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               font-mono text-xs focus:ring-2 focus:ring-blue-500 
               focus:border-blue-500 transition-colors"
    rows={6}
    placeholder={'SELECT * FROM points\nWHERE tag = \'TAG_NAME\'\nAND timestamp > now() - INTERVAL \'1\' HOUR'}
  />
  <p className="text-xs text-gray-600">
    💡 Tip: Use {'{tag}'} placeholder - it will be replaced with selected tag
  </p>
</div>
```

**Features:**
- Monospace font for code visibility
- 6-row textarea
- Helpful placeholder
- Tips section below

#### 5. Preset Query List
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Select Preset Query *
  </label>
  <div className="space-y-2 max-h-64 overflow-y-auto">
    {presets.map((preset) => (
      <button
        key={preset.id}
        onClick={() => handlePresetSelect(preset)}
        className={`w-full p-3 rounded-md border-2 text-left transition-all ${
          selectedPresetId === preset.id
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-blue-400'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{preset.name}</h4>
            <p className="text-xs text-gray-600 mt-1">
              {preset.description}
            </p>
          </div>
          <span className="text-sm text-gray-500">
            {preset.usageCount || 0} uses
          </span>
        </div>
      </button>
    ))}
  </div>
</div>
```

**Features:**
- Scrollable preset list
- Clickable preset cards
- Name and description display
- Usage count
- Active state highlighting

---

## MySQL Trigger Form Component

**File:** `frontend/src/app/components/list triger/mysql/MySQLTriggerForm.tsx`

### Key Styling Features

#### 1. Database Connection Display
```jsx
<div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
  <p className="text-sm text-blue-900">
    <strong>🔌 Connected to:</strong> {connection.config.database}
  </p>
  {connection.config.host && (
    <p className="text-xs text-blue-700 mt-1">
      Host: {connection.config.host}
    </p>
  )}
</div>
```

#### 2. Table Selection
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Select Table *
  </label>
  <select
    value={selectedTable}
    onChange={(e) => handleTableChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
  >
    <option value="">
      Choose table... ({tables.length} available)
    </option>
    {tables.map((table) => (
      <option key={table} value={table}>
        {table}
      </option>
    ))}
  </select>
</div>
```

#### 3. Column Selection
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Sort Column *
  </label>
  <select
    value={selectedSortColumn}
    onChange={(e) => handleSortColumnChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
    disabled={!selectedTable}
  >
    <option value="">
      Select sort column... ({columns.length} available)
    </option>
    {columns.map((col) => (
      <option key={col} value={col}>
        {col}
      </option>
    ))}
  </select>
  {!selectedTable && (
    <p className="text-xs text-gray-600 mt-1">
      Select a table first
    </p>
  )}
</div>
```

**Features:**
- Dependent dropdown (columns depend on table)
- Disabled state when no table selected
- Column count display
- Helper text

#### 4. Loading Table Schema
```jsx
{schemaLoading && (
  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
    <div className="animate-spin rounded-full h-4 w-4 border-2 
                    border-blue-600 border-t-transparent"></div>
    <span className="text-sm text-blue-700">
      Loading tables...
    </span>
  </div>
)}
```

---

## Oracle Trigger Form Component

**File:** `frontend/src/app/components/list triger/oracle/OracleTriggerForm.tsx`

### Key Styling Features

#### 1. Oracle Connection Info
```jsx
<div className="p-3 bg-green-50 border border-green-200 rounded-md">
  <p className="text-sm text-green-900">
    <strong>🗄️ Oracle Connection:</strong>
  </p>
  {connection.config.service && (
    <p className="text-xs text-green-700 mt-1">
      Service: {connection.config.service}
    </p>
  )}
  {connection.config.host && (
    <p className="text-xs text-green-700">
      Host: {connection.config.host}:{connection.config.port}
    </p>
  )}
</div>
```

#### 2. Table Selection (Oracle-specific)
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Select Table *
  </label>
  <select
    value={formData.selectedTable}
    onChange={(e) => handleTableChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
  >
    <option value="">
      Choose table... ({tables.length} found)
    </option>
    {tables.map((table) => (
      <option key={table.name} value={table.name}>
        {table.name}
      </option>
    ))}
  </select>
</div>
```

#### 3. Column with Nullable Info
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Sort Column *
  </label>
  <select
    value={formData.selectedSortColumn}
    onChange={(e) => handleSortColumnChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
    disabled={!formData.selectedTable}
  >
    <option value="">Select sort column...</option>
    {columns.map((col) => (
      <option key={col.name} value={col.name}>
        {col.name} ({col.dataType}){col.nullable ? ' [NULL]' : ''}
      </option>
    ))}
  </select>
</div>
```

**Features:**
- Data type display
- Nullable indicator
- Oracle-specific formatting

---

## Trigger Groups Manager Component

**File:** `frontend/src/app/components/list triger/group/TriggerGroupsManager.tsx`

### Key Styling Features

#### 1. Group Header
```jsx
<div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
  <div className="flex items-center gap-2">
    <span className="text-lg font-semibold text-gray-900">
      👥 Trigger Groups
    </span>
    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
      {groups.length} groups
    </span>
  </div>
  <button
    onClick={handleAddGroup}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
  >
    + New Group
  </button>
</div>
```

#### 2. Group Card List
```jsx
<div className="space-y-3">
  {groups.map((group) => (
    <div
      key={group.id}
      className="bg-white border border-gray-300 rounded-lg p-4 
                 hover:shadow-md transition-shadow"
    >
      {/* Group content */}
    </div>
  ))}
</div>
```

#### 3. Group Card Content
```jsx
<div className="flex items-start justify-between">
  <div className="flex-1">
    <h3 className="text-lg font-semibold text-gray-900">
      {group.name}
    </h3>
    
    {group.description && (
      <p className="text-sm text-gray-600 mt-1">
        {group.description}
      </p>
    )}
    
    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
      <span>🔗 {group.triggers?.length || 0} triggers</span>
      <span>✓ Active</span>
      <span>📅 {new Date(group.createdAt).toLocaleDateString()}</span>
    </div>
  </div>
  
  {/* Action buttons */}
  <div className="flex gap-2">
    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
      ✏️ Edit
    </button>
    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
      🗑️ Delete
    </button>
  </div>
</div>
```

#### 4. Group Member List
```jsx
<div className="mt-3 pt-3 border-t border-gray-200">
  <p className="text-xs font-semibold text-gray-600 mb-2">
    Members:
  </p>
  <div className="flex flex-wrap gap-2">
    {group.triggers?.map((triggerId) => {
      const trigger = triggers.find(t => t.id === triggerId);
      return (
        <span
          key={triggerId}
          className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
        >
          {trigger?.name || triggerId}
        </span>
      );
    })}
  </div>
</div>
```

**Features:**
- Member count display
- Trigger badges/chips
- Hover effects
- Clean visual hierarchy

#### 5. Group Creation/Edit Modal
```jsx
<Modal
  onClose={() => setShowGroupModal(false)}
  title={editingGroup ? 'Edit Group' : 'Create Group'}
>
  <form onSubmit={handleGroupSubmit} className="space-y-4">
    {/* Group name input */}
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Group Name *
      </label>
      <input
        type="text"
        value={groupForm.name}
        onChange={(e) => setGroupForm(prev => ({ 
          ...prev, 
          name: e.target.value 
        }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="e.g., Production Monitors"
        required
      />
    </div>

    {/* Group description */}
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Description
      </label>
      <textarea
        value={groupForm.description}
        onChange={(e) => setGroupForm(prev => ({ 
          ...prev, 
          description: e.target.value 
        }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={3}
        placeholder="Brief description of this group..."
      />
    </div>

    {/* Trigger selection */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Triggers *
      </label>
      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
        {availableTriggers.map((trigger) => (
          <label
            key={trigger.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={groupForm.triggers.includes(trigger.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setGroupForm(prev => ({
                    ...prev,
                    triggers: [...prev.triggers, trigger.id]
                  }));
                } else {
                  setGroupForm(prev => ({
                    ...prev,
                    triggers: prev.triggers.filter(id => id !== trigger.id)
                  }));
                }
              }}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">{trigger.name}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Buttons */}
    <div className="flex gap-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={() => setShowGroupModal(false)}
        className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
      >
        Batal
      </button>
      <button
        type="submit"
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {editingGroup ? 'Update' : 'Create'} Group
      </button>
    </div>
  </form>
</Modal>
```

---

## Common Styling Patterns Across All Components

### Unified Input Styling
All components use consistent input styling:
```jsx
className="w-full px-3 py-2 border border-gray-300 rounded-md 
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
           transition-colors"
```

### Unified Button Styling
```jsx
{/* Primary */}
className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"

{/* Secondary */}
className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"

{/* Danger */}
className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
```

### Unified Label Styling
```jsx
className="block text-sm font-medium text-gray-700"
```

### Unified Card Styling
```jsx
className="bg-white border border-gray-300 rounded-lg p-4 
           hover:shadow-md transition-shadow"
```

---

## Component Integration Points

### Where Components are Imported
```jsx
// In list triger.tsx
import AvevaPITriggerForm from './aveva-pi/AvevaPITriggerForm';
import MySQLTriggerForm from './mysql/MySQLTriggerForm';
import OracleTriggerForm from './oracle/OracleTriggerForm';
import TriggerGroupsManager from './group/TriggerGroupsManager';
```

### Conditional Rendering Logic
```jsx
{selectedConnection?.plugin === 'mysql' && (
  <MySQLTriggerForm {...props} />
)}

{selectedConnection?.plugin === 'oracle' && (
  <OracleTriggerForm {...props} />
)}

{selectedConnection?.plugin === 'aveva-pi' && (
  <AvevaPITriggerForm {...props} />
)}

{showGroupsTab && (
  <TriggerGroupsManager {...props} />
)}
```

---

**Last Updated:** October 2025
**Components:** 4 subfolder components
**Total Lines:** ~3,000+
**Framework:** React 18 + TypeScript + Tailwind CSS
