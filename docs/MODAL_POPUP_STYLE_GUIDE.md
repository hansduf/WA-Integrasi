# 🎨 Modal & Popup Style Guide - List Triggers

## Daftar Isi
1. [Modal Component](#modal-component)
2. [Notification Toast](#notification-toast)
3. [Delete Confirmation Dialog](#delete-confirmation-dialog)
4. [Success Modal](#success-modal)
5. [Style System](#style-system)
6. [Animation & Transitions](#animation--transitions)

---

## Modal Component

### File Location
- **Component**: `frontend/src/app/components/ui/Modal.tsx`
- **Used in**: `frontend/src/app/components/list triger/list triger.tsx`

### Props Interface
```typescript
type Props = {
  title?: string;                           // Modal title
  children?: React.ReactNode;               // Modal content
  onClose?: () => void;                    // Close handler
  footer?: React.ReactNode;                // Footer buttons
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; // Modal width
  showCloseButton?: boolean;               // Show close X button (default: true)
};
```

### Size Classes
| Size | Tailwind | Use Case |
|------|----------|----------|
| `sm` | `max-w-md` | Delete confirmation, small dialogs (448px max) |
| `md` | `max-w-lg` | Medium forms, alerts (512px max) |
| `lg` | `max-w-3xl` | Large forms, data tables (768px max) |
| `xl` | `max-w-5xl` | Complex forms, trigger management (64rem max) |
| `full` | `max-w-7xl` | Full-width dialogs (80rem max) |

### Structure Breakdown

#### 1. **Backdrop (Overlay)**
```jsx
<div className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-400 z-[90]" />
```
- `backdrop-blur-sm`: Blurred background
- `inset-0`: Fills entire screen
- `z-[90]`: Behind modal (z-110)
- Animation: Fade in 400ms

#### 2. **Header**
```jsx
<div className="flex items-center justify-between px-8 py-6 border-b border-gray-100/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 backdrop-blur-sm">
  {/* Left: Title with icon bar */}
  <div className="flex items-center space-x-3">
    <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
      {title}
    </h3>
  </div>
  
  {/* Right: Close button */}
  <button className="group flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-gray-700 hover:bg-red-50 transition-all duration-300">
    ✕
  </button>
</div>
```

**Features:**
- Gradient background: Blue → Indigo → Purple
- Left color bar (visual indicator)
- Close button dengan hover effect (red background)
- `backdrop-blur-sm`: Glassmorphism effect

#### 3. **Content Area**
```jsx
<div className="px-8 py-8 max-h-[calc(95vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-gray-50">
  <div className="space-y-6">
    {children}
  </div>
</div>
```

**Features:**
- Padding: 32px horizontal, 32px vertical
- Max height: 95vh - 200px (untuk header + footer)
- Custom scrollbar styling (blue thumb, gray track)
- Content spacing: 24px (space-y-6)

#### 4. **Footer**
```jsx
<div className="px-8 py-6 border-t border-gray-100/80 bg-gradient-to-r from-gray-50/80 to-blue-50/60 backdrop-blur-sm">
  <div className="flex justify-end space-x-3">
    {footer}
  </div>
</div>
```

**Features:**
- Gradient background: Gray → Blue
- Buttons aligned right dengan 12px spacing
- Border top separator

---

## Notification Toast

### Location in Code
```typescript
{notification && (
  <div className={`fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-right-2 fade-in duration-300`}>
    {/* Toast content */}
  </div>
)}
```

### States

#### Success Toast
```jsx
<div className={`bg-white rounded-xl shadow-2xl border border-green-200`}>
  <div className={`px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100`}>
    {/* Green icon + message */}
  </div>
  <div className={`h-1 bg-green-500`} style={{ width: `${progress}%` }} />
</div>
```

#### Error Toast
```jsx
<div className={`bg-white rounded-xl shadow-2xl border border-red-200`}>
  <div className={`px-4 py-3 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100`}>
    {/* Red icon + message */}
  </div>
  <div className={`h-1 bg-red-500`} style={{ width: `${progress}%` }} />
</div>
```

### Features

| Feature | Style |
|---------|-------|
| Position | `fixed bottom-6 right-6` |
| Z-index | `z-50` |
| Max width | `max-w-sm` (448px) |
| Entrance | `animate-in slide-in-from-right-2 fade-in duration-300` |
| Exit | `animate-out fade-out slide-out-to-right-2 duration-300` |
| Shadow | `shadow-2xl` |
| Border radius | `rounded-xl` |

### Content Structure
```
┌─────────────────────────────────────┐
│ ✓ Icon  Message                  ✕  │  ← Header (gradient bg)
├─────────────────────────────────────┤
│ Menghilang dalam 3 detik            │  ← Footer text
└─────────────────────────────────────┘
█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← Progress bar
```

### Timer Display
- Initial: 3 seconds
- Decrements: Every 1 second
- Text: "Menghilang dalam {notificationTimeLeft} detik"
- Progress bar: `width = (notificationTimeLeft / 3) * 100%`

---

## Delete Confirmation Dialog

### Usage Example
```tsx
{showDeleteConfirm && (
  <Modal
    onClose={() => setShowDeleteConfirm(null)}
    title="Konfirmasi Penghapusan"
    size="sm"
    footer={
      <div className="flex justify-end space-x-3">
        <button onClick={cancelDelete} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
          Batal
        </button>
        <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white">
          Hapus
        </button>
      </div>
    }
  >
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        {/* Warning icon SVG */}
      </div>
      <div className="flex-1">
        <p className="text-gray-700">
          Apakah Anda yakin ingin menghapus trigger <strong>{trigger.name}</strong>?
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.
        </p>
      </div>
    </div>
  </Modal>
)}
```

### Visual Layout
```
┌─────────────────────────────────────────────┐
│  │  Konfirmasi Penghapusan              ✕   │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️  Apakah Anda yakin ingin menghapus    │
│      trigger "Name"?                       │
│                                             │
│      Tindakan ini tidak dapat dibatalkan   │
│      dan akan menghapus semua data         │
│      terkait trigger ini.                  │
│                                             │
├─────────────────────────────────────────────┤
│                         [ Batal ]  [ Hapus ]│
└─────────────────────────────────────────────┘
```

### Button Styles

**Batal (Cancel)**
```jsx
className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
```

**Hapus (Delete)**
```jsx
className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200"
```

---

## Success Modal

### Usage Example
```tsx
{showSuccessModal && (
  <Modal
    onClose={() => setShowSuccessModal(false)}
    title="Berhasil!"
    size="sm"
    footer={
      <button
        onClick={() => setShowSuccessModal(false)}
        className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white"
      >
        OK
      </button>
    }
  >
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        {/* Checkmark icon SVG */}
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
  </Modal>
)}
```

### Visual Layout
```
┌────────────────────────────────────┐
│  │  Berhasil!                    ✕  │
├────────────────────────────────────┤
│                                    │
│  ✓  Trigger "Name" berhasil       │
│      dihapus permanent!            │
│                                    │
│      Data telah tersimpan dan     │
│      tabel telah diperbarui       │
│      secara otomatis.             │
│                                    │
├────────────────────────────────────┤
│                             [ OK ] │
└────────────────────────────────────┘
```

---

## Style System

### Color Palette

#### Primary Colors
| Purpose | Color | Tailwind | Usage |
|---------|-------|----------|-------|
| Success | Green | `green-500/600` | Success modal, success toast |
| Error | Red | `red-500/600` | Delete dialog, error toast |
| Info | Blue | `blue-500` | Modal headers |
| Warning | Purple | `purple-500` | Accents |

#### Neutral Colors
| Level | Tailwind | Usage |
|-------|----------|-------|
| Background | `gray-50` | Light backgrounds |
| Border | `gray-100/200` | Dividers |
| Text Primary | `gray-900` | Headings |
| Text Secondary | `gray-600` | Descriptions |

### Typography

| Element | Style | Size |
|---------|-------|------|
| Modal Title | `font-bold tracking-tight` | `text-2xl` |
| Section Header | `font-medium` | `text-lg` |
| Body Text | Regular weight | `text-base` |
| Small Text | Regular weight | `text-sm` |

### Spacing

| Size | Value | Tailwind | Usage |
|------|-------|----------|-------|
| Extra Small | 8px | `p-2` | Button padding |
| Small | 12px | `p-3` | Toast padding |
| Medium | 24px | `p-6` | Content spacing |
| Large | 32px | `p-8` | Modal padding |

### Border & Shadow

| Style | Tailwind | Usage |
|-------|----------|-------|
| Border Radius | `rounded-lg` / `rounded-xl` | Buttons / Modals |
| Border | `border border-gray-200` | Modals, toasts |
| Shadow | `shadow-2xl` | Modal, toast |
| Blur Effect | `backdrop-blur-sm` | Modal backdrop |

---

## Animation & Transitions

### Modal Entrance
```css
animate-in zoom-in-95 duration-400
```
- Effect: Zoom in from 95% scale
- Duration: 400ms
- Curve: Default (ease-out)

### Modal Backdrop
```css
animate-in fade-in duration-400
```
- Effect: Fade in
- Duration: 400ms

### Toast Entrance
```css
animate-in slide-in-from-right-2 fade-in duration-300
```
- Effect: Slide from right 2px + fade in
- Duration: 300ms

### Toast Exit
```css
animate-out fade-out slide-out-to-right-2 duration-300
```
- Effect: Fade out + slide to right 2px
- Duration: 300ms

### Button Interactions
```css
transition-all duration-200
```
- Scale on hover: `hover:scale-110`
- Background change: `hover:bg-gray-200`
- Color change: `hover:text-gray-700`

### Progress Bar
```css
transition-all duration-1000 ease-linear
```
- Smooth width animation as timer counts down
- Linear easing (constant speed)
- 1 second duration per notch

---

## Component Usage Examples

### Example 1: Delete with Toast Notification
```tsx
const handleDelete = async (trigger: Trigger) => {
  try {
    await deleteTrigger(trigger.id);
    setNotification({ 
      message: `Trigger "${trigger.name}" berhasil dihapus!`,
      type: 'success' 
    });
    setShowSuccessModal(true);
    setSuccessMessage(`Trigger "${trigger.name}" berhasil dihapus permanent!`);
  } catch (error) {
    setNotification({ 
      message: error.message,
      type: 'error' 
    });
  }
};
```

### Example 2: Custom Modal
```tsx
<Modal 
  title="Pengaturan Trigger" 
  size="lg"
  footer={
    <>
      <button onClick={() => setShowModal(false)}>Batal</button>
      <button onClick={handleSave}>Simpan</button>
    </>
  }
>
  {/* Form content */}
</Modal>
```

### Example 3: Full-width Dialog
```tsx
<Modal 
  title="Manajemen Data Besar"
  size="full"
  showCloseButton={false}
>
  {/* Large content */}
</Modal>
```

---

## Best Practices

### ✅ DO
- Use appropriate modal sizes based on content
- Provide clear action buttons (Batal, Hapus, OK)
- Show confirmation dialogs for destructive actions
- Use toast for quick feedback
- Keep modal titles descriptive
- Use gradient backgrounds for visual appeal

### ❌ DON'T
- Don't use large modals for simple confirmations
- Don't forget close button handler
- Don't mix multiple notification types
- Don't hardcode colors (use Tailwind classes)
- Don't remove backdrop (helps focus)

---

## Related Files
- Modal Component: `frontend/src/app/components/ui/Modal.tsx`
- List Triggers: `frontend/src/app/components/list triger/list triger.tsx`
- Tailwind Config: `frontend/tailwind.config.js` (for custom animations)
