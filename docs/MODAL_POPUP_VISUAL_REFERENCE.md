# 🎨 Modal & Popup Visual Reference

Referensi visual lengkap untuk semua jenis modal dan popup yang digunakan di List Triggers.

---

## 1. Delete Confirmation Modal

### Visual Layout
```
╔════════════════════════════════════════════════════════════════════╗
║  ▌ Konfirmasi Penghapusan                                       ✕  ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║    ⚠️  Apakah Anda yakin ingin menghapus trigger                 ║
║        "Test AVEVA PI Trigger"?                                 ║
║                                                                    ║
║        Tindakan ini tidak dapat dibatalkan dan akan menghapus     ║
║        semua data terkait trigger ini.                           ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                   [ Batal ]     [ Hapus ]         ║
╚════════════════════════════════════════════════════════════════════╝
```

### Colors
- **Header**: Gradient Blue → Indigo → Purple
- **Close button hover**: Red background
- **Cancel button**: Gray background with hover effect
- **Delete button**: Red gradient (red-500 to red-600)
- **Icon**: Red warning symbol
- **Text**: Dark gray for primary, light gray for secondary

### Sizes
- Modal size: `sm` (448px max)
- Header height: 56px
- Content padding: 32px
- Footer padding: 24px
- Icon size: 24px (w-6 h-6)

### Interactions
1. ❌ Click backdrop/close button → Close modal
2. 🔙 Click "Batal" → Close modal, cancel delete
3. ✅ Click "Hapus" → Execute delete, show loading, close modal, show success/error toast
4. ⏱️ After action → Toast appears bottom-right with 3 second timer

---

## 2. Success Modal

### Visual Layout
```
╔════════════════════════════════════════════════════════════════════╗
║  ▌ Berhasil!                                                     ✕  ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║    ✅ Trigger "Test AVEVA PI Trigger" berhasil dihapus           ║
║       permanent!                                                  ║
║                                                                    ║
║       Data telah tersimpan dan tabel telah diperbarui secara     ║
║       otomatis.                                                   ║
║                                                                    ║
╠════════════════════════════════════════════════════════════════════╣
║                                                    [ OK ]           ║
╚════════════════════════════════════════════════════════════════════╝
```

### Colors
- **Header**: Gradient Blue → Purple
- **Icon background**: Green circle with checkmark
- **Icon**: Green checkmark
- **Button**: Green gradient (green-500 to green-600)
- **Text**: Dark gray for primary message, light gray for description

### Sizes
- Modal size: `sm` (448px max)
- Icon size: 32px (w-8 h-8)
- Primary text: 18px font-medium (text-lg)
- Secondary text: 14px font-normal (text-sm)

### Auto-close
- Modal stays open until user clicks OK
- OR close via X button

### Transitions
- Enter: Zoom in 95% + fade in (400ms)
- Exit: Fade out + slide out (200ms)

---

## 3. Toast Notification (Success)

### Visual Layout
```
┌────────────────────────────────────────────────┐
│  ✓ Trigger berhasil dihapus!              ✕   │  ← Header
├────────────────────────────────────────────────┤
│  Menghilang dalam 3 detik                      │  ← Footer
└────────────────────────────────────────────────┘
██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← Progress bar
```

### Position
- **Fixed**: Bottom-right corner
- **Offset**: 24px from bottom, 24px from right (bottom-6 right-6)
- **Z-index**: 50 (z-50)
- **Max width**: 448px (max-w-sm)

### Colors
- **Border**: Green (#D1FAE5)
- **Header background**: Gradient from green-50 to emerald-50
- **Border-bottom**: Green (#DEF7EC)
- **Icon circle**: Green-100 background
- **Icon**: Green checkmark
- **Text**: Green-800 for message, Green-600 for timer
- **Progress bar**: Green-500
- **Close button**: Green-400 text, hover Green-600

### Animations
- **Enter**: Slide in from right 2px + fade in (300ms)
- **Exit**: Slide out to right 2px + fade out (300ms)
- **Progress**: Linear width decrease from 100% to 0% (1000ms)

### Interactive Elements
- ✕ Close button: Stops timer, hides toast immediately
- Click on toast: No action (read-only)
- Timer: Auto-hides after 3 seconds

### States
| State | Duration | Behavior |
|-------|----------|----------|
| Initial | 0-3s | Show "Menghilang dalam 3 detik" |
| Counting | 1-3s | Decrement every 1 second |
| Final | 3s | "Menghilang dalam 0 detik" then hide |

---

## 4. Toast Notification (Error)

### Visual Layout
```
┌────────────────────────────────────────────────┐
│  ⚠ Gagal menghapus trigger!               ✕   │  ← Header
├────────────────────────────────────────────────┤
│  Menghilang dalam 3 detik                      │  ← Footer
└────────────────────────────────────────────────┘
██████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← Progress bar
```

### Colors (Different from Success)
- **Border**: Red (#FCA5A5)
- **Header background**: Gradient from red-50 to rose-50
- **Border-bottom**: Red (#FEE2E2)
- **Icon circle**: Red-100 background
- **Icon**: Red error symbol
- **Text**: Red-800 for message, Red-600 for timer
- **Progress bar**: Red-500
- **Close button**: Red-400 text, hover Red-600

### Duration
- Same as success: 3 seconds total

### Interactions
- Same as success toast
- User can close immediately with X button

---

## 5. Modal Header Components

### With Title and Close Button
```
┌──────────────────────────────────────────────────────┐
│  ▌ Modal Title                                    ✕  │
└──────────────────────────────────────────────────────┘
   ^                                                ^
   Color bar                                   Close button
```

**Left bar**: 
- Width: 4px (w-1)
- Height: 32px (h-8)
- Gradient: Blue → Purple
- Rounded: Full (rounded-full)
- Margin-right: 12px

**Title**:
- Size: 28px font-bold (text-2xl)
- Tracking: Tight
- Gradient text: Gray-900 to gray-700
- Background clip: Text

**Close button**:
- Size: 40px (w-10 h-10)
- Shape: Circle (rounded-full)
- Icon: ✕ (multiply sign)
- Hover: Red-50 background, scale 110%
- Focus: Ring-2 ring-red-500 ring-offset-2

---

## 6. Scrollbar Styling

### Custom Scrollbar in Modal Content
```
Content with scrollbar:
│
├─ scrollbar-thin: Thin width
├─ scrollbar-thumb-blue-200: Blue thumb on normal
├─ scrollbar-track-gray-50: Gray track
├─ hover:scrollbar-thumb-blue-300: Blue thumb on hover
└─ transition-colors duration-200: Smooth color change

Example visualization:
┌─────────────────────┐
│ Content line 1    ░ │
│ Content line 2    █ │  ← Blue thumb (hover: darker blue)
│ Content line 3    ░ │
│ Content line 4    █ │
└─────────────────────┘
  └─ Gray track ────┘
```

---

## 7. Button Variations

### Primary Action (Blue)
```
┌─────────────────┐
│   Simpan        │  ← text: white, bg: blue-500
└─────────────────┘
 Normal state
 
┌─────────────────┐
│   Simpan        │  ← bg: blue-600 (darker)
└─────────────────┘
 Hover state
```

### Destructive Action (Red)
```
┌─────────────────┐
│   Hapus         │  ← text: white, bg: red-500
└─────────────────┘
 Normal state
 
┌─────────────────┐
│   Hapus         │  ← bg: red-600 (darker)
└─────────────────┘
 Hover state
 
OR with gradient:

┌─────────────────┐
│   Hapus         │  ← bg: gradient red-500 to red-600
└─────────────────┘
 Normal state
 
┌─────────────────┐
│   Hapus         │  ← hover: red-600 to red-700 (darker)
└─────────────────┘
 Hover state
```

### Secondary Action (Gray)
```
┌─────────────────┐
│   Batal         │  ← text: gray-700, bg: gray-100
└─────────────────┘
 Normal state
 
┌─────────────────┐
│   Batal         │  ← bg: gray-200 (darker)
└─────────────────┘
 Hover state
```

### Button Padding
- Small: `px-3 py-2` (12px × 8px)
- Standard: `px-4 py-2` (16px × 8px)
- Large: `px-6 py-2` (24px × 8px)

### Border Radius
- Buttons: `rounded-lg` (8px)
- Toast: `rounded-xl` (12px)
- Modal: `rounded-2xl` (16px)

---

## 8. Icon Reference

### Success Icon
```
  ✓
```
- Green color
- Stroke width: 2
- Size: 16-32px depending on context

### Error/Warning Icon
```
  ⚠
```
- Red/Orange color
- Exclamation mark in triangle
- Size: 16-32px

### Info Icon
```
  ⓘ
```
- Blue color
- Information symbol
- Size: 16-32px

### Close Icon
```
  ✕
```
- Gray/colored based on context
- Size: 12-20px
- Hover: Color changes, background appears

---

## 9. Spacing & Layout Rules

### Modal Padding
```
╔═══════════════════════════════════════╗
║  ▌ Title                           ✕  ║  ← Header: py-6 px-8
╠═══════════════════════════════════════╣
║                                       ║
║        Content with                  ║  ← Content: py-8 px-8
║        32px vertical spacing         ║     (space-y-6 for children)
║                                       ║
╠═══════════════════════════════════════╣
║              [ Button ]   [ Button ]  ║  ← Footer: py-6 px-8
╚═══════════════════════════════════════╝
```

### Toast Spacing
```
┌─────────────────────────────────────┐
│  ⬤ Message            ✕             │  ← px-4 py-3 (header)
├─────────────────────────────────────┤
│  Timer text                         │  ← px-4 py-3 (body)
└─────────────────────────────────────┘
█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ← h-1 (4px)
```

---

## 10. Responsive Behavior

### Desktop (1024px+)
- Modal: Full size based on `size` prop
- Toast: Bottom-right corner, 448px max width
- Animations: All transitions enabled
- Backdrop: Visible blur effect

### Tablet (768px - 1023px)
- Modal: Slightly smaller size
- Toast: Same position, might overlap with content
- Animations: Slightly faster (200ms instead of 300ms)
- Padding: Slightly reduced

### Mobile (< 768px)
- Modal: Full width - 32px (p-4)
- Toast: Full width - 32px, positioned at bottom
- Animations: Faster (200ms)
- Padding: Reduced (px-4 py-4)

### Max heights
- Modal content: `max-h-[calc(95vh-200px)]`
- Modal container: `max-h-[95vh]`
- Ensures header, footer, and content all visible

---

## 11. Z-index Stack

```
z-50   ← Toast notification (topmost)
z-110  ← Modal content
z-100  ← Modal container
z-90   ← Modal backdrop
z-0    ← Page content (bottommost)
```

Always ensure:
- Toast > Modal > Backdrop > Page
- Prevents modal from covering toast
- Prevents background from covering modal

---

## 12. Animation Timing Reference

### Fast animations (200ms)
- Button hover states
- Notification close
- Small state changes

### Normal animations (300ms)
- Toast entrance/exit
- Fade transitions
- Simple state changes

### Medium animations (400ms)
- Modal entrance
- Backdrop fade
- Complex transitions

### Slow animations (1000ms)
- Toast progress bar
- Long-running operations
- Important visual feedback

---

## State Flow Diagram

### Delete Flow
```
List Screen
    ↓ (user clicks delete)
showDeleteConfirm = item
    ↓ (render confirmation modal)
Delete Modal Appears
    ├─ User clicks Cancel
    │   └─ showDeleteConfirm = null → Close modal
    │
    └─ User clicks Delete
        ├─ Loading state shows (optional)
        ├─ API call: DELETE /api/triggers/{id}
        ├─ Success: Show success modal + toast
        ├─ Error: Show error toast
        └─ Refresh data
```

### Success Flow
```
Success Modal Shows
    ↓
User sees checkmark + message
    ↓
User clicks OK
    ↓
Modal closes
    ↓
Back to list (data already refreshed)
```

### Toast Flow
```
Notification triggered
    ↓
Toast slides in from right (300ms)
    ↓
Show for 3 seconds with timer
    ├─ 3s: "Menghilang dalam 3 detik"
    ├─ 2s: "Menghilang dalam 2 detik"
    ├─ 1s: "Menghilang dalam 1 detik"
    └─ 0s: "Menghilang dalam 0 detik"
    ↓
Auto-hide with slide out (300ms)
OR
User clicks X button → immediate hide
```

