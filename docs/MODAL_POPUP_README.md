# 📚 Modal & Popup Documentation - Quick Index

Dokumentasi lengkap tentang sistem Modal dan Popup di aplikasi AVEVA PI.

---

## 📖 Dokumentasi Tersedia

### 1. 🎨 **Style Guide** (`MODAL_POPUP_STYLE_GUIDE.md`)
**Untuk**: Memahami design system, warna, typography, spacing
- Modal component structure
- Color palette
- Typography guidelines
- Spacing & sizing rules
- Animation specifications
- Best practices

**Gunakan saat**: 
- Ingin membuat modal baru sesuai design system
- Perlu customize warna/size
- Memahami layout hierarchy

---

### 2. 💻 **Code Snippets** (`MODAL_POPUP_CODE_SNIPPETS.md`)
**Untuk**: Copy-paste code yang siap digunakan
- Basic modal
- Delete confirmation dialog
- Success modal
- Toast notification
- Form modal
- Loading modal
- Alert/info modal
- Custom icons
- Reusable hooks
- Common patterns
- Troubleshooting

**Gunakan saat**:
- Mau membuat modal/popup cepat
- Butuh reference implementasi
- Ada error/issue pada modal
- Mau membuat pattern baru

---

### 3. 🎭 **Visual Reference** (`MODAL_POPUP_VISUAL_REFERENCE.md`)
**Untuk**: Melihat layout visual, warna, spacing secara detail
- ASCII art layouts
- Color specifications
- Size measurements
- Button variations
- Icon reference
- Responsive behavior
- Z-index stack
- Animation timing
- State flow diagrams

**Gunakan saat**:
- Ingin tahu persis bagaimana tampilannya
- Butuh spacing measurements
- Perlu understand animations
- Mau trace state flows

---

### 4. 📌 **Upgrade Guide** (`MODAL_POPUP_UPGRADE_GUIDE.md`) ⬅️ NEW
**Untuk**: Understand apa yang berubah dan bagaimana mengintegrasikan ke komponen baru
- Before/After comparisons
- Updated component props
- Integration examples
- Color scheme reference
- Implementation checklist
- File references
- Verification checklist

**Gunakan saat**:
- Ingin tahu apa yang di-upgrade
- Need understanding tentang perubahan
- Want to apply same pattern ke komponen lain
- Perlu verify upgrade adalah complete

---

## 🎯 Quick Reference

### Ukuran Modal
| Size | Max Width | Use Case |
|------|-----------|----------|
| `sm` | 448px | Delete confirmation, small dialogs |
| `md` | 512px | Medium forms, alerts |
| `lg` | 768px | Large forms, data tables |
| `xl` | 64rem | Complex forms, trigger management |
| `full` | 80rem | Full-width dialogs |

---

### Tipe Notification (InfoModal)
| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| `info` | Blue | ⓘ | Informasi umum |
| `success` | Green | ✓ | Operasi berhasil |
| `error` | Red | ✕ | Operasi gagal |
| `warning` | Orange | ⚠ | Peringatan/validasi |

---

### ConfirmModal Props
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `open` | boolean | - | Show/hide modal |
| `title` | string | "Confirm" | Modal title |
| `message` | ReactNode | - | Confirmation message |
| `confirmLabel` | string | "Confirm" | Confirm button text |
| `cancelLabel` | string | "Cancel" | Cancel button text |
| **`isDangerous`** | boolean | false | **[NEW]** Red styling for destructive actions |
| `onConfirm` | function | - | Confirm handler |
| `onCancel` | function | - | Cancel handler |

---

### InfoModal Props
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `open` | boolean | - | Show/hide modal |
| `title` | string | "Info" | Modal title |
| `message` | ReactNode | - | Info message |
| `okLabel` | string | "OK" | Button text |
| **`type`** | string | "info" | **[NEW]** Message type: info/success/error/warning |
| `onOk` | function | - | Confirm handler |

---

### Animation Timings
| Duration | Tailwind | Use Case |
|----------|----------|----------|
| 200ms | `duration-200` | Button hover, quick changes |
| 300ms | `duration-300` | Toast entrance/exit |
| 400ms | `duration-400` | Modal entrance, backdrop |
| 1000ms | `duration-1000` | Progress bar, long operations |

---

## 🔧 Implementation Guide

### Step 1: Plan Your UI
```
1. Tentukan jenis dialog yang dibutuhkan
2. Tentukan ukuran modal (sm/md/lg/xl/full)
3. Lihat visual reference untuk layout
4. Sketch out state flow
```

### Step 2: Choose Code Template
```
1. Cari template serupa di Code Snippets
2. Copy seluruh code block
3. Customize untuk kebutuhan Anda
4. Test di browser
```

### Step 3: Customize Styling
```
1. Buka Style Guide untuk warna palette
2. Ubah color classes sesuai kebutuhan
3. Adjust spacing jika perlu
4. Verify terhadap design system
```

### Step 4: Test & Debug
```
1. Test semua state (open, close, loading, etc)
2. Cek animations smooth
3. Verify responsive di mobile
4. Test dengan keyboard (Tab, Escape)
```

---

## 🎓 Learning Path

### Beginner: Basic Modal
```
1. Read: MODAL_POPUP_STYLE_GUIDE.md (sections 1-2)
2. Copy: Basic Modal code snippet
3. Modify: Title, children content
4. Test: Open/close functionality
```

### Intermediate: Dialog with Actions
```
1. Read: Style Guide (section 6-7)
2. Copy: Delete Confirmation Dialog snippet
3. Add: API integration
4. Add: Success/error handling
5. Test: Full delete flow
```

### Advanced: Custom Patterns
```
1. Study: All code snippets
2. Understand: State management patterns
3. Create: Reusable component/hook
4. Optimize: Performance, animations
5. Document: For team
```

---

## 💡 Common Tasks

### Task: Create New Modal Type
```
1. Find similar modal in Code Snippets
2. Copy entire block to your component
3. Update JSX structure
4. Update state variables
5. Update class names (colors, sizes)
6. Test functionality
```

### Task: Change Modal Colors
```
1. Open MODAL_POPUP_STYLE_GUIDE.md
2. Find color palette section
3. Find your modal code
4. Replace color classes:
   - from-blue-500 → from-purple-500
   - to-red-600 → to-pink-600
5. Test in browser
```

### Task: Adjust Modal Size
```
1. Find your modal component
2. Change size prop:
   <Modal size="lg" ...>
3. If custom size needed:
   - Edit Modal.tsx sizeClasses
   - Add new size with custom max-width
4. Test responsive
```

### Task: Add Toast Notification
```
1. Copy Toast code from snippets
2. Add state variables
3. Add timer effect with useEffect
4. Render toast JSX
5. Call showNotification(message, type)
6. Test auto-hide in 3 seconds
```

---

## 🐛 Troubleshooting Guide

### Modal tidak muncul
**Checklist:**
- [ ] State variable set to `true`
- [ ] Conditional rendering di JSX correct
- [ ] Z-index tidak ter-override
- [ ] No parent overflow hidden

**Solution:** Lihat Code Snippets - Basic Modal section

---

### Toast terlalu cepat hilang
**Checklist:**
- [ ] Timer set to 3 seconds
- [ ] useEffect dependency array include notification
- [ ] Interval cleared properly

**Solution:** Lihat Code Snippets - Timer Effect section

---

### Animasi tidak smooth
**Checklist:**
- [ ] Tailwind animations enabled in config
- [ ] Using correct animation classes
- [ ] No conflicting CSS
- [ ] Browser hardware acceleration enabled

**Solution:** Lihat Visual Reference - Animation Timing

---

### Modal tidak bisa close
**Checklist:**
- [ ] onClose handler defined
- [ ] Close button onClick connected
- [ ] Backdrop clickable
- [ ] Escape key handler (if needed)

**Solution:** Copy fresh from Code Snippets template

---

## 📂 File Structure

```
frontend/
├── src/app/
│   ├── components/
│   │   ├── ui/
│   │   │   └── Modal.tsx (Main component)
│   │   └── list triger/
│   │       └── list triger.tsx (Implementation example)
│   └── lib/
│       └── api.ts (API calls)
└── docs/
    ├── MODAL_POPUP_STYLE_GUIDE.md (This file)
    ├── MODAL_POPUP_CODE_SNIPPETS.md
    ├── MODAL_POPUP_VISUAL_REFERENCE.md
    └── MODAL_POPUP_README.md (You are here)
```

---

## 🔗 Component Props Reference

### Modal Props
```typescript
interface ModalProps {
  title?: string;                    // Modal header title
  children?: React.ReactNode;        // Content
  onClose?: () => void;             // Close handler
  footer?: React.ReactNode;         // Footer buttons
  size?: 'sm'|'md'|'lg'|'xl'|'full'; // Width
  showCloseButton?: boolean;        // Show X button (default: true)
}
```

### Usage
```tsx
<Modal
  title="Title"
  size="md"
  onClose={handleClose}
  footer={<Button>OK</Button>}
>
  <p>Content here</p>
</Modal>
```

---

## 🎨 CSS Classes Cheatsheet

### Modal Classes
```
Modal wrapper: fixed inset-0 z-[100] animate-in zoom-in-95
Backdrop: backdrop-blur-sm z-[90] animate-in fade-in
Header: flex justify-between px-8 py-6 border-b
Content: px-8 py-8 max-h-[calc(95vh-200px)] overflow-y-auto
Footer: px-8 py-6 border-t flex justify-end space-x-3
```

### Toast Classes
```
Container: fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-right
Success bg: bg-gradient-to-r from-green-50 to-emerald-50
Error bg: bg-gradient-to-r from-red-50 to-rose-50
Progress bar: h-1 bg-green-500/red-500 transition-all duration-1000
```

### Button Classes
```
Primary: px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg
Destructive: px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg
Secondary: px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg
```

---

## 🚀 Next Steps

1. **For Developers**: 
   - Read Style Guide untuk understand design system
   - Bookmark Code Snippets untuk quick implementation
   - Reference Visual Reference saat debugging

2. **For Designers**: 
   - Check Visual Reference untuk current implementation
   - Suggest changes di Style Guide
   - Document custom variations

3. **For Maintainers**: 
   - Keep documentation updated saat ada perubahan
   - Add new snippets untuk patterns baru
   - Update visual reference bila ada UI changes

---

## 📞 Support

**Pertanyaan?**
- Check relevant documentation file
- Search troubleshooting guide
- Review code snippets for similar implementation
- Check Component Props Reference

**Menemukan bug?**
- Document exact steps to reproduce
- Include browser/device info
- Reference relevant documentation
- Create issue with clear description

---

**Last Updated**: October 17, 2025
**Documentation Version**: 1.0
**Status**: Complete & Ready to Use

