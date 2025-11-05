# 🎨 List Triggers - Quick Reference Card

**For:** Frontend developers, designers  
**Purpose:** Quick lookup without reading full docs  
**Component:** List Triggers (2,443 lines, ~5,000 LOC with subcomponents)

---

## 🚀 5-Minute Cheat Sheet

### Standard Input
```jsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                  transition-colors" />
```

### Standard Button
```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md 
                   hover:bg-blue-700 transition-colors">
  Action
</button>
```

### Standard Label + Input
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">Label *</label>
  <input className="w-full px-3 py-2 border border-gray-300 rounded-md 
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
</div>
```

### Status Badge
```jsx
{/* Green - Active */}
<span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
  ✓ Aktif
</span>

{/* Red - Inactive */}
<span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
  ✗ Nonaktif
</span>
```

### Card Container
```jsx
<div className="bg-white border border-gray-300 rounded-lg p-4 
                hover:shadow-md transition-shadow">
  Content here
</div>
```

### Two-Column Form
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### Error Display
```jsx
<div className="p-3 bg-red-50 border border-red-200 rounded-md">
  <p className="text-sm text-red-700">⚠️ Error message</p>
</div>
```

### Loading Spinner
```jsx
<div className="flex items-center gap-2">
  <div className="animate-spin rounded-full h-4 w-4 border-2 
                  border-blue-600 border-t-transparent"></div>
  <span>Loading...</span>
</div>
```

### Pagination Buttons
```jsx
{/* Previous */}
<button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md 
                   hover:bg-gray-50 disabled:opacity-50">
  ‹ Sebelumnya
</button>

{/* Page number - Active */}
<button className="px-3 py-1 text-sm bg-blue-600 text-white border border-blue-600 rounded-md">
  2
</button>

{/* Page number - Inactive */}
<button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">
  3
</button>
```

---

## 🎨 Color Quick Reference

| Color | Usage | Tailwind |
|-------|-------|----------|
| **Blue** | Primary action, links, hover | `bg-blue-600` hover `hover:bg-blue-700` |
| **Green** | Success, active status | `bg-green-100` text `text-green-800` |
| **Red** | Danger, delete, error | `bg-red-600` hover `hover:bg-red-700` |
| **Gray** | Neutral, borders, disabled | `bg-gray-300`, `border-gray-300` |
| **Yellow** | Warning | `bg-yellow-100` text `text-yellow-800` |
| **White** | Cards, modals, base | `bg-white` |

---

## 📐 Spacing Quick Reference

| Class | Size | Use Case |
|-------|------|----------|
| `px-2 py-1` | 8×4px | Compact badges |
| `px-3 py-2` | 12×8px | Form inputs, small buttons |
| `px-4 py-2` | 16×8px | Standard buttons |
| `p-3` | 12px all | Padding in cards |
| `p-4` | 16px all | Standard card padding |
| `p-6` | 24px all | Large section padding |
| `gap-2` | 8px | Tight spacing |
| `gap-3` | 12px | Medium spacing |
| `gap-4` | 16px | Standard spacing |
| `mb-4` | 16px bottom | Section spacing |
| `space-y-4` | 16px vertical | Form sections |

---

## 📱 Responsive Cheat Sheet

| Breakpoint | Width | Classes |
|------------|-------|---------|
| **Mobile** | <640px | Base classes (no prefix) |
| **Tablet** | ≥640px | `sm:` prefix |
| **Tablet+** | ≥768px | `md:` prefix |
| **Desktop** | ≥1024px | `lg:` prefix |
| **Desktop+** | ≥1280px | `xl:` prefix |

### Common Responsive Patterns
```jsx
{/* 1 col mobile, 2 col tablet+ */}
grid grid-cols-1 md:grid-cols-2

{/* Hide on mobile */}
hidden md:block

{/* Different padding */}
px-4 sm:px-6 lg:px-8

{/* Different text size */}
text-sm md:text-base lg:text-lg

{/* Full on mobile, flex row on desktop */}
flex flex-col md:flex-row
```

---

## 🔘 Button Variants

### Primary Button
```jsx
className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
```

### Secondary Button (Outline)
```jsx
className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
```

### Danger Button (Delete)
```jsx
className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
```

### Small Button
```jsx
className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
```

### Full Width Button
```jsx
className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
```

### Disabled Button
```jsx
className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md opacity-50 cursor-not-allowed"
```

---

## 📝 Form Patterns

### Text Input
```jsx
<input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
```

### Select Dropdown
```jsx
<select className="w-full px-3 py-2 border border-gray-300 rounded-md 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
  <option>Option 1</option>
</select>
```

### Textarea
```jsx
<textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
```

### Checkbox
```jsx
<input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
<label className="text-sm font-medium text-gray-700">Label text</label>
```

### Required Indicator
```jsx
<label className="block text-sm font-medium text-gray-700">
  Field Name <span className="text-red-600">*</span>
</label>
```

---

## 🎯 Modal Patterns

### Basic Modal
```jsx
<Modal onClose={handleClose} title="Modal Title">
  <div className="space-y-4">
    {/* Content */}
    
    <div className="flex gap-3 pt-4 border-t border-gray-200">
      <button className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md">
        Batal
      </button>
      <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md">
        Simpan
      </button>
    </div>
  </div>
</Modal>
```

### Confirmation Modal
```jsx
<Modal onClose={handleClose} title="Confirm Action?">
  <div className="space-y-4">
    <p className="text-gray-700">Are you sure?</p>
    
    <div className="flex gap-3">
      <button className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md">
        Batal
      </button>
      <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md">
        Confirm
      </button>
    </div>
  </div>
</Modal>
```

---

## 📊 List & Table Patterns

### Table Header
```jsx
<thead className="bg-gray-100 border-b border-gray-300">
  <tr>
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
      Header
    </th>
  </tr>
</thead>
```

### Table Row
```jsx
<tr className="border-b border-gray-300 hover:bg-gray-50">
  <td className="px-4 py-3 text-sm text-gray-700">Data</td>
</tr>
```

### Card List Item
```jsx
<div className="bg-white border border-gray-300 rounded-lg p-4 
                hover:shadow-md transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900">Title</h3>
  <p className="text-sm text-gray-600 mt-2">Description</p>
  
  <div className="flex gap-2 mt-4">
    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
      Edit
    </button>
    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded">
      Delete
    </button>
  </div>
</div>
```

---

## ⚡ Focus & Interaction States

### Focus Ring
```jsx
className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
```

### Hover Effect
```jsx
className="hover:bg-blue-700 transition-colors"
```

### Disabled State
```jsx
className="disabled:opacity-50 disabled:cursor-not-allowed"
```

### Active/Selected
```jsx
className="bg-blue-600 text-white border-blue-600"
```

### Inactive/Unselected
```jsx
className="bg-white text-gray-700 border-gray-300"
```

---

## 🎓 Database Type Styling

### AVEVA PI
```jsx
<span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
  [AVEVA PI]
</span>
```

### MySQL
```jsx
<span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
  [MySQL]
</span>
```

### Oracle
```jsx
<span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
  [Oracle]
</span>
```

---

## 🔗 Component Usage

### Import Modal
```jsx
import Modal from '../ui/Modal';
```

### Use Modal
```jsx
{showModal && (
  <Modal onClose={() => setShowModal(false)} title="Title">
    {/* Content */}
  </Modal>
)}
```

### Import Subfolder Component
```jsx
import AvevaPITriggerForm from './aveva-pi/AvevaPITriggerForm';
import MySQLTriggerForm from './mysql/MySQLTriggerForm';
import OracleTriggerForm from './oracle/OracleTriggerForm';
import TriggerGroupsManager from './group/TriggerGroupsManager';
```

### Conditional Rendering
```jsx
{selectedConnection?.plugin === 'aveva-pi' && (
  <AvevaPITriggerForm {...props} />
)}
{selectedConnection?.plugin === 'mysql' && (
  <MySQLTriggerForm {...props} />
)}
```

---

## 🚨 Common Mistakes to Avoid

❌ **DON'T:** Mix Tailwind with inline styles
```jsx
// Bad
className="px-4 py-2" style={{ backgroundColor: 'blue' }}

// Good
className="px-4 py-2 bg-blue-600"
```

❌ **DON'T:** Use hard-coded colors
```jsx
// Bad
style={{ color: '#3b82f6' }}

// Good
className="text-blue-600"
```

❌ **DON'T:** Forget focus states
```jsx
// Bad
<button className="px-4 py-2 bg-blue-600">Submit</button>

// Good
<button className="px-4 py-2 bg-blue-600 focus:ring-2 focus:ring-blue-500">
  Submit
</button>
```

❌ **DON'T:** Skip responsive prefixes
```jsx
// Bad
className="grid grid-cols-2 gap-4"

// Good
className="grid grid-cols-1 md:grid-cols-2 gap-4"
```

---

## 📚 Full Documentation

For complete details, see:
- `LIST_TRIGGERS_STYLE_GUIDE.md` - Full styling guide
- `LIST_TRIGGERS_ADVANCED_PATTERNS.md` - Code examples
- `LIST_TRIGGERS_SUBCOMPONENTS.md` - Database-specific components
- `LIST_TRIGGERS_INDEX.md` - Navigation & overview

---

**Quick Ref Version:** 1.0  
**Last Updated:** October 2025  
**Component:** List Triggers (~5,000 LOC)
