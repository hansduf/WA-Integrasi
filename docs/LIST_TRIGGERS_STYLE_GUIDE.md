# 🎨 List Triggers Component - Styling Guide

**File:** `frontend/src/app/components/list triger/list triger.tsx`
**Size:** 2,443 lines
**Framework:** React 18 + TypeScript + Tailwind CSS + Next.js

---

## 📋 Table of Contents
1. [Component Overview](#component-overview)
2. [Styling Architecture](#styling-architecture)
3. [Color System](#color-system)
4. [Layout Patterns](#layout-patterns)
5. [UI Components Used](#ui-components-used)
6. [Form Styling](#form-styling)
7. [Modal & Dialog Patterns](#modal--dialog-patterns)
8. [Button Styles](#button-styles)
9. [Input & Select Styles](#input--select-styles)
10. [Text & Typography](#text--typography)
11. [Spacing & Sizing](#spacing--sizing)
12. [Animation & Transitions](#animation--transitions)
13. [Responsive Design](#responsive-design)
14. [Error & Validation States](#error--validation-states)
15. [Best Practices](#best-practices)

---

## Component Overview

**ListTriger** adalah komponen utama untuk menampilkan dan mengelola triggers dengan fitur:
- 📋 List triggers dengan pagination & search
- 🆕 Create/Edit modal dengan form dinamis
- 🗑️ Delete confirmation dialog
- 🔍 Test query functionality
- 📊 Support 3 database types: AVEVA PI, MySQL, Oracle
- 👥 Trigger groups management
- 📝 Dynamic form fields based on data source

---

## Styling Architecture

### Layering System
```
Global CSS (globals.css)
    ↓
Tailwind Config (tailwind.config.js)
    ↓
Component Tailwind Classes
    ↓
Inline Styles (minimal, for dynamic values)
```

### CSS-in-JS Strategy
- **Inline Tailwind:** Primary approach for all styling
- **Dynamic Classes:** Computed based on state/props
- **No CSS Modules:** All styling via Tailwind classes
- **No Styled Components:** Pure React + Tailwind approach

---

## Color System

### Brand Colors Used

| Color | Tailwind | Usage | Hex |
|-------|----------|-------|-----|
| **Blue** | `bg-blue-*` | Primary actions, highlights | `#3b82f6` |
| **Gray** | `bg-gray-*` | Neutral, borders, backgrounds | `#6b7280` |
| **Green** | `bg-green-*` | Success, active, positive | `#10b981` |
| **Red** | `bg-red-*` | Danger, delete, errors | `#ef4444` |
| **Yellow** | `bg-yellow-*` | Warnings, caution | `#eab308` |
| **White** | `bg-white` | Cards, modals, containers | `#ffffff` |

### Color Shade Patterns

**Background Shades:**
```tailwind
bg-gray-50    /* Very light, almost white */
bg-gray-100   /* Light, for hover states */
bg-gray-200   /* Medium light, for borders */
bg-gray-600   /* Dark, for text/buttons */
```

**Text Colors:**
```tailwind
text-gray-600     /* Muted text */
text-gray-700     /* Normal text */
text-blue-600     /* Links/emphasis */
text-blue-900     /* Strong emphasis */
text-red-600      /* Error/warning */
text-green-600    /* Success */
```

---

## Layout Patterns

### Container Layout
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Main content container with responsive padding */}
</div>
```

### Card/Section Styling
```jsx
<div className="bg-white rounded-lg border border-gray-300 shadow-sm p-6">
  {/* Card with subtle shadow and border */}
</div>
```

### Header Section
```jsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-gray-900">Daftar Triggers</h1>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    + Tambah Trigger
  </button>
</div>
```

### Two-Column Layout
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>Left column - responsive</div>
  <div>Right column - responsive</div>
</div>
```

### Flex Container
```jsx
<div className="flex items-center justify-between gap-4">
  {/* Horizontal layout with equal spacing */}
</div>
```

---

## UI Components Used

### 1. **Modal Component**
```typescript
// Located: frontend/src/app/components/ui/Modal.tsx

<Modal
  onClose={() => setShowCreateModal(false)}
  title={editingTrigger ? 'Edit Trigger' : 'Buat Trigger Baru'}
>
  {/* Modal content */}
</Modal>
```

**Features:**
- Overlay backdrop with blur effect
- Customizable title and footer
- Configurable sizes (sm, md, lg, xl, full)
- Close button (X) in top-right
- Smooth animations

### 2. **Sub-Components Used in ListTriger**

```jsx
// Import statements
import AvevaPITriggerForm from './aveva-pi/AvevaPITriggerForm';
import MySQLTriggerForm from './mysql/MySQLTriggerForm';
import OracleTriggerForm from './oracle/OracleTriggerForm';
import TriggerGroupsManager from './group/TriggerGroupsManager';
```

---

## Form Styling

### Form Container
```jsx
<form onSubmit={handleSubmit} className="space-y-4">
  {/* Form inputs with consistent spacing */}
</form>
```

**Key Classes:**
- `space-y-4` → 16px vertical gap between form sections
- `space-y-1` → 4px vertical gap within form groups

### Form Section Group
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Responsive 2-column on medium+ screens, 1 column on small */}
</div>
```

### Individual Input Group
```jsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Nama Trigger *
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
               transition-colors"
    placeholder="contoh: monitor-temperature"
    required
  />
</div>
```

**Components:**
- Label: `text-sm font-medium text-gray-700`
- Input: `border border-gray-300 rounded-md`
- Focus State: `focus:ring-2 focus:ring-blue-500 focus:border-blue-500`

---

## Modal & Dialog Patterns

### Delete Confirmation Dialog
```jsx
{showDeleteConfirm && (
  <Modal onClose={() => setShowDeleteConfirm(null)} title="Hapus Trigger?">
    <div className="space-y-4">
      <p className="text-gray-700">
        Apakah Anda yakin ingin menghapus trigger "{showDeleteConfirm.name}"?
      </p>
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md">
          Batal
        </button>
        <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
          Hapus
        </button>
      </div>
    </div>
  </Modal>
)}
```

### Success Modal
```jsx
{showSuccessModal && (
  <Modal onClose={() => setShowSuccessModal(false)} title="Berhasil">
    <div className="space-y-4">
      <p className="text-green-700">✅ {successMessage}</p>
      <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
        OK
      </button>
    </div>
  </Modal>
)}
```

### Notification Toast
```jsx
{notification && (
  <div className={`fixed top-4 right-4 px-4 py-3 rounded-md text-white
                    ${notification.type === 'success' ? 'bg-green-600' : ''}
                    ${notification.type === 'error' ? 'bg-red-600' : ''}
                    ${notification.type === 'warning' ? 'bg-yellow-600' : ''}
                    shadow-lg animation-fade-out`}>
    {notification.message}
  </div>
)}
```

---

## Button Styles

### Primary Action Button
```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md 
                   hover:bg-blue-700 transition-colors font-medium">
  + Tambah Trigger
</button>
```

**Classes:**
- `px-4 py-2` → Padding (horizontal × vertical)
- `bg-blue-600` → Primary color background
- `text-white` → White text
- `rounded-md` → Medium border radius (6px)
- `hover:bg-blue-700` → Darker on hover
- `transition-colors` → Smooth color transition

### Secondary Button (Outline)
```jsx
<button className="px-3 py-1 text-sm border border-gray-300 rounded-md 
                   hover:bg-gray-50 bg-white">
  Batal
</button>
```

### Danger Button (Delete/Warning)
```jsx
<button className="px-4 py-2 bg-red-600 text-white rounded-md 
                   hover:bg-red-700 transition-colors">
  Hapus
</button>
```

### Icon Button
```jsx
<button className="w-8 h-8 flex items-center justify-center rounded-full 
                   hover:bg-gray-100 transition-colors text-gray-600">
  ✏️
</button>
```

### Disabled Button State
```jsx
<button disabled 
        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md 
                   hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
  Sebelumnya
</button>
```

**Disabled Classes:**
- `disabled:opacity-50` → Fade out effect
- `disabled:cursor-not-allowed` → Prevent cursor change

### Button Groups
```jsx
<div className="flex gap-3">
  <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md">
    Batal
  </button>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Simpan
  </button>
</div>
```

---

## Input & Select Styles

### Text Input
```jsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-md 
             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
             transition-colors"
  placeholder="Nama trigger..."
/>
```

### Select Dropdown
```jsx
<select className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   transition-colors">
  <option value="">Pilih data source...</option>
  {connections.map(conn => (
    <option key={conn.id} value={conn.id}>{conn.name}</option>
  ))}
</select>
```

### Textarea
```jsx
<textarea
  rows={3}
  className="w-full px-3 py-2 border border-gray-300 rounded-md 
             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
             transition-colors"
  placeholder="Deskripsi trigger..."
/>
```

### Checkbox
```jsx
<div className="flex items-center space-x-2">
  <input
    type="checkbox"
    id="active"
    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
  />
  <label htmlFor="active" className="text-sm font-medium text-gray-700">
    Aktifkan trigger
  </label>
</div>
```

### Input Focus States
```
Default:    border-gray-300, bg-white
Hover:      (visual only for select)
Focus:      ring-2 ring-blue-500, border-blue-500, bg-white
Error:      ring-2 ring-red-500, border-red-500
```

---

## Text & Typography

### Heading Sizes

**H1 - Page Title**
```jsx
<h1 className="text-2xl font-bold text-gray-900">Daftar Triggers</h1>
```
- Size: 24px (`text-2xl`)
- Weight: Bold (`font-bold`)
- Color: Dark gray (`text-gray-900`)

**H4 - Section Header**
```jsx
<h4 className="text-sm font-semibold text-blue-900 mb-2">
  📋 SQL Query Preview:
</h4>
```
- Size: 14px (`text-sm`)
- Weight: Semibold (`font-semibold`)
- Color: Dark blue (`text-blue-900`)

### Body Text

**Normal Text**
```jsx
<p className="text-gray-700">Deskripsi trigger ini...</p>
```
- Size: 16px (default)
- Color: Medium gray (`text-gray-700`)

**Muted Text**
```jsx
<span className="text-sm text-gray-600">dari {triggers.length} hasil</span>
```
- Size: 14px (`text-sm`)
- Color: Light gray (`text-gray-600`)

**Label Text**
```jsx
<label className="block text-sm font-medium text-gray-700">
  Nama Trigger *
</label>
```
- Size: 14px (`text-sm`)
- Weight: Medium (`font-medium`)
- Color: Medium gray (`text-gray-700`)

### Text Emphasis

**Error/Warning Text**
```jsx
<span className="text-red-600">⚠️ Field is required</span>
```

**Success Text**
```jsx
<span className="text-green-600">✅ Operation successful</span>
```

**Link/Blue Text**
```jsx
<span className="text-blue-600">Click here</span>
```

---

## Spacing & Sizing

### Padding Scales
```
p-2    =  8px
p-3    = 12px
p-4    = 16px
p-6    = 24px
px-2   = 8px horizontal
py-2   = 8px vertical
px-3 py-2 = 12px horizontal, 8px vertical
```

### Margin Scales
```
mb-2   = 8px bottom margin
mb-4   = 16px bottom margin
mb-6   = 24px bottom margin
mt-2   = 8px top margin
gap-2  = 8px gap between flex items
gap-4  = 16px gap between flex items
```

### Width Patterns

**Full Width**
```jsx
<input className="w-full" /> {/* 100% width */}
```

**Fixed Widths**
```jsx
<div className="w-16">Fixed width</div> {/* 64px */}
<div className="w-64">Wider fixed</div> {/* 256px */}
```

**Min/Max Widths**
```jsx
<button className="min-w-[40px]">Page</button> {/* Minimum 40px */}
<div className="max-w-7xl">Max container</div> {/* Max 80rem */}
```

### Height Patterns

**Icon Sizes**
```jsx
<div className="w-8 h-8">Square icon</div> {/* 32×32px */}
<div className="w-6 h-6">Small icon</div> {/* 24×24px */}
```

**Button Heights**
```jsx
py-1  = ~32px total height (button)
py-2  = ~40px total height (button)
py-3  = ~48px total height (button)
```

---

## Animation & Transitions

### Color Transitions
```jsx
className="... transition-colors hover:bg-blue-700"
```
- Smooth color changes on hover
- Duration: 150ms (default)
- Easing: ease-in-out (default)

### Opacity Transitions
```jsx
className="... transition-opacity opacity-100 hover:opacity-75"
```

### Disabled Opacity
```jsx
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

### Fade Animation (CSS)
```css
@keyframes fadeOut {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.animation-fade-out {
  animation: fadeOut 3s ease-in-out forwards;
}
```

### Hover Effects

**Button Hover**
```jsx
className="hover:bg-blue-700 hover:shadow-lg transition-all"
```

**Row Hover**
```jsx
className="hover:bg-gray-50 cursor-pointer transition-colors"
```

---

## Responsive Design

### Breakpoints Used
```
sm  = 640px   - Small tablets
md  = 768px   - Medium tablets/small laptops
lg  = 1024px  - Large laptops
xl  = 1280px  - XL screens
2xl = 1536px  - 2XL screens
```

### Responsive Grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

### Responsive Padding
```jsx
<div className="px-4 sm:px-6 lg:px-8 py-8">
  {/* 16px on mobile, 24px on tablet, 32px on desktop */}
</div>
```

### Responsive Typography
```jsx
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
  {/* 20px on mobile, 24px on tablet, 30px on desktop */}
</h1>
```

### Responsive Display
```jsx
<div className="hidden md:block">
  {/* Hidden on mobile, visible on tablet+ */}
</div>
```

### Pagination Responsive
```jsx
{/* Pagination controls stack on mobile */}
<div className="flex flex-col md:flex-row items-center gap-4">
  {/* Column on mobile, row on tablet+ */}
</div>
```

---

## Error & Validation States

### Required Field Indicator
```jsx
<label className="block text-sm font-medium text-gray-700">
  Nama Trigger <span className="text-red-600">*</span>
</label>
```

### Field Validation Error
```jsx
{validation.errors && validation.errors.length > 0 && (
  <div className="text-red-600 text-sm mt-1">
    {validation.errors[0]}
  </div>
)}
```

### Form Section with Border
```jsx
<div className="border border-gray-200 rounded-md p-4">
  {/* Content with border highlight */}
</div>
```

### Preview/Info Section
```jsx
<div className="mt-2 text-sm text-gray-600">
  <div>Database: {selectedConnection.config.database}</div>
</div>
```

### Code/Query Preview
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-md p-3">
  <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">
    {generatedQuery}
  </pre>
</div>
```

**Preview Block Classes:**
- `bg-blue-50` → Light blue background
- `border border-blue-200` → Subtle border
- `p-3` → 12px padding
- `text-xs` → Very small text (12px)
- `font-mono` → Monospace for code
- `whitespace-pre-wrap` → Preserve formatting

---

## List & Table Patterns

### Table Header Row
```jsx
<thead className="bg-gray-100 border-b border-gray-300">
  <tr>
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
      Nama
    </th>
    {/* More columns */}
  </tr>
</thead>
```

### Table Body Row
```jsx
<tbody>
  {items.map((item) => (
    <tr key={item.id} className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{item.name}</td>
      {/* More cells */}
    </tr>
  ))}
</tbody>
```

### Action Button Group in Row
```jsx
<div className="flex gap-2">
  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded 
                     hover:bg-blue-700">
    Edit
  </button>
  <button className="px-3 py-1 text-sm bg-red-600 text-white rounded 
                     hover:bg-red-700">
    Delete
  </button>
</div>
```

### Badge/Tag Styling
```jsx
<span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
  Active
</span>
```

**Badge Variants:**
```jsx
{/* Success badge */}
<span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
  ✅ Success
</span>

{/* Warning badge */}
<span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
  ⚠️ Warning
</span>

{/* Error badge */}
<span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
  ❌ Error
</span>
```

---

## Pagination Control Styling

### Previous/Next Buttons
```jsx
<button
  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
  disabled={currentPage === 1}
  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md 
             hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed 
             flex items-center gap-1"
>
  ‹ Sebelumnya
</button>
```

### Page Number Buttons
```jsx
<button
  onClick={() => setCurrentPage(pageNum)}
  className={`px-3 py-1 text-sm border rounded-md min-w-[40px] ${
    currentPage === pageNum
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-white border-gray-300 hover:bg-gray-50'
  }`}
>
  {pageNum}
</button>
```

### Items Per Page Selector
```jsx
<select className="px-2 py-1 text-sm border border-gray-300 rounded">
  <option value="5">5</option>
  <option value="10">10</option>
  <option value="20">20</option>
  <option value="50">50</option>
  <option value="all">Semua</option>
</select>
```

---

## Best Practices

### ✅ DO

1. **Use Tailwind Classes Consistently**
   ```jsx
   // ✅ Good
   className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
   
   // ❌ Avoid
   className="p-2 bg-blue text-white"
   ```

2. **Responsive First**
   ```jsx
   // ✅ Good - Mobile first, then enhance
   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
   
   // ❌ Avoid - Desktop first
   className="grid grid-cols-3"
   ```

3. **Use Space Utilities for Consistency**
   ```jsx
   // ✅ Good
   className="space-y-4"
   
   // ❌ Avoid
   className="mb-4" {/* Each item needs this */}
   ```

4. **Group Related Styles**
   ```jsx
   // ✅ Good - Grouped logically
   className="flex items-center justify-between px-4 py-2 rounded-md 
              bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
   
   // ❌ Avoid - Scattered
   className="flex bg-white hover:bg-gray-50 px-4 border justify-between 
              py-2 transition-colors border-gray-300 rounded-md items-center"
   ```

5. **Use Dynamic Classes for State-Based Styling**
   ```jsx
   // ✅ Good
   className={`px-4 py-2 rounded-md ${
     isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
   }`}
   
   // ❌ Avoid
   const style = isActive ? { background: 'blue', color: 'white' } : { ... }
   ```

### ❌ DON'T

1. **Don't Mix Tailwind with Inline Styles**
   ```jsx
   // ❌ Bad
   className="px-4 py-2" style={{ backgroundColor: 'blue' }}
   
   // ✅ Good
   className="px-4 py-2 bg-blue-600"
   ```

2. **Don't Use Hard-Coded Color Values**
   ```jsx
   // ❌ Bad
   className="text-[#3b82f6]"
   
   // ✅ Good
   className="text-blue-600"
   ```

3. **Don't Forget Accessibility**
   ```jsx
   // ❌ Bad - No focus indicator
   <button>Click me</button>
   
   // ✅ Good - Clear focus state
   <button className="focus:ring-2 focus:ring-blue-500">Click me</button>
   ```

4. **Don't Use Arbitrary Values Without Reason**
   ```jsx
   // ❌ Bad
   className="w-[462px] h-[234px]"
   
   // ✅ Good - Use standard scales
   className="w-full md:w-96 h-64"
   ```

5. **Don't Skip Hover States**
   ```jsx
   // ❌ Bad - No hover feedback
   <button className="bg-blue-600 text-white rounded-md">Submit</button>
   
   // ✅ Good - Clear hover state
   <button className="bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
     Submit
   </button>
   ```

---

## Integration Examples

### Creating a New Trigger Form Section
```jsx
<div className="space-y-4">
  {/* Form container with vertical spacing */}
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Two-column responsive section */}
    
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Field Name *
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-md 
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   transition-colors"
        placeholder="Enter value..."
        required
      />
    </div>
  </div>
  
  <div className="flex gap-3 pt-4">
    <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">
      Batal
    </button>
    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
      Simpan
    </button>
  </div>
</div>
```

### Creating a Modal Alert
```jsx
{showAlert && (
  <Modal onClose={() => setShowAlert(false)} title="Konfirmasi">
    <div className="space-y-4">
      <p className="text-gray-700">
        Apakah Anda yakin ingin melakukan aksi ini?
      </p>
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md">
          Batal
        </button>
        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Lanjutkan
        </button>
      </div>
    </div>
  </Modal>
)}
```

---

## File Structure Reference

```
frontend/src/app/components/
├── list triger/
│   ├── list triger.tsx          ← Main component (2,443 lines)
│   ├── aveva-pi/
│   │   └── AvevaPITriggerForm.tsx
│   ├── mysql/
│   │   └── MySQLTriggerForm.tsx
│   ├── oracle/
│   │   └── OracleTriggerForm.tsx
│   └── group/
│       └── TriggerGroupsManager.tsx
├── ui/
│   ├── Modal.tsx                ← Base modal component
│   ├── ConfirmModal.tsx         ← Enhanced modal with confirm
│   ├── InfoModal.tsx            ← Info/notification modal
│   ├── SessionExpiredModal.tsx  ← Session expiration modal
│   └── ToastProvider.tsx        ← Toast notifications
└── ...
```

---

## Related Documentation

- **Modal System:** `MODAL_POPUP_STYLE_GUIDE.md`
- **Design System:** Design token definitions in `tailwind.config.js`
- **Tailwind Config:** `frontend/tailwind.config.js`
- **Global Styles:** `frontend/src/app/globals.css`

---

**Last Updated:** October 2025
**Component Status:** Active & Maintained
**Styling Approach:** Tailwind CSS (No CSS Modules)
