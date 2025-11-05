# 📚 Modal & Popup Code Snippets

Kumpulan kode siap pakai untuk menggunakan Modal dan Popup di aplikasi.

## Quick Start

### 1. Basic Modal
```tsx
import Modal from '@/components/ui/Modal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Buka Modal
      </button>

      {showModal && (
        <Modal
          title="Judul Modal"
          onClose={() => setShowModal(false)}
          size="md"
          footer={
            <button 
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Tutup
            </button>
          }
        >
          <p>Konten modal di sini</p>
        </Modal>
      )}
    </>
  );
}
```

---

### 2. Delete Confirmation Dialog
```tsx
const [showDeleteConfirm, setShowDeleteConfirm] = useState<Item | null>(null);

const handleDelete = (item: Item) => {
  setShowDeleteConfirm(item);
};

const confirmDelete = async () => {
  if (!showDeleteConfirm) return;
  try {
    await apiDelete(`/items/${showDeleteConfirm.id}`);
    setNotification({ 
      message: `${showDeleteConfirm.name} berhasil dihapus!`,
      type: 'success' 
    });
    loadData();
  } catch (error) {
    setNotification({ 
      message: error.message,
      type: 'error' 
    });
  } finally {
    setShowDeleteConfirm(null);
  }
};

// Render
{showDeleteConfirm && (
  <Modal
    title="Konfirmasi Penghapusan"
    onClose={() => setShowDeleteConfirm(null)}
    size="sm"
    footer={
      <div className="flex gap-3">
        <button 
          onClick={() => setShowDeleteConfirm(null)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
        >
          Batal
        </button>
        <button 
          onClick={confirmDelete}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          Hapus
        </button>
      </div>
    }
  >
    <div className="flex items-start gap-3">
      <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <div>
        <p className="text-gray-900">
          Apakah Anda yakin ingin menghapus <strong>{showDeleteConfirm.name}</strong>?
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Tindakan ini tidak dapat dibatalkan.
        </p>
      </div>
    </div>
  </Modal>
)}
```

---

### 3. Success Modal
```tsx
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [successMessage, setSuccessMessage] = useState('');

// Trigger success
const handleSuccess = (message: string) => {
  setSuccessMessage(message);
  setShowSuccessModal(true);
};

// Render
{showSuccessModal && (
  <Modal
    title="Berhasil!"
    onClose={() => setShowSuccessModal(false)}
    size="sm"
    footer={
      <button 
        onClick={() => setShowSuccessModal(false)}
        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
      >
        OK
      </button>
    }
  >
    <div className="flex items-start gap-3">
      <svg className="w-8 h-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <div>
        <p className="text-lg font-medium text-gray-900">
          {successMessage}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Operasi telah berhasil diselesaikan.
        </p>
      </div>
    </div>
  </Modal>
)}
```

---

### 4. Toast Notification
```tsx
const [notification, setNotification] = useState<{ 
  message: string; 
  type?: 'success' | 'error' | 'warning' 
} | null>(null);
const [notificationTimeLeft, setNotificationTimeLeft] = useState(0);

// Show notification
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  setNotification({ message, type });
  setNotificationTimeLeft(3);
};

// Timer effect (in useEffect)
useEffect(() => {
  if (!notification) return;
  
  const interval = setInterval(() => {
    setNotificationTimeLeft(prev => {
      if (prev <= 0) {
        setNotification(null);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [notification]);

// Render
{notification && (
  <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-in slide-in-from-right-2 fade-in duration-300">
    <div className={`bg-white rounded-xl shadow-2xl border ${
      notification.type === 'success' ? 'border-green-200' : 'border-red-200'
    } overflow-hidden`}>
      {/* Header */}
      <div className={`px-4 py-3 ${
        notification.type === 'success' 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100' 
          : 'bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {notification.type === 'success' ? (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <p className={`text-xs mt-1 ${
              notification.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
              Menghilang dalam {notificationTimeLeft} detik
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              notification.type === 'success' 
                ? 'hover:bg-green-100 text-green-400 hover:text-green-600' 
                : 'hover:bg-red-100 text-red-400 hover:text-red-600'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className={`h-1 ${
        notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'
      }`}>
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${(notificationTimeLeft / 3) * 100}%` }}
        />
      </div>
    </div>
  </div>
)}
```

---

### 5. Form Modal dengan Validasi
```tsx
const [showFormModal, setShowFormModal] = useState(false);
const [formData, setFormData] = useState({ name: '', description: '' });
const [formErrors, setFormErrors] = useState<Record<string, string>>({});

const validateForm = () => {
  const errors: Record<string, string> = {};
  if (!formData.name.trim()) errors.name = 'Nama diperlukan';
  if (!formData.description.trim()) errors.description = 'Deskripsi diperlukan';
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) return;
  
  try {
    await apiPost('/items', formData);
    setShowFormModal(false);
    setFormData({ name: '', description: '' });
    showNotification('Data berhasil disimpan!', 'success');
    loadData();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

// Render
{showFormModal && (
  <Modal
    title="Tambah Item Baru"
    onClose={() => setShowFormModal(false)}
    size="md"
    footer={
      <div className="flex gap-3">
        <button 
          onClick={() => setShowFormModal(false)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
        >
          Batal
        </button>
        <button 
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Simpan
        </button>
      </div>
    }
  >
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nama
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            formErrors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Masukkan nama"
        />
        {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Deskripsi
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            formErrors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Masukkan deskripsi"
        />
        {formErrors.description && <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>}
      </div>
    </div>
  </Modal>
)}
```

---

### 6. Loading Modal
```tsx
const [isLoading, setIsLoading] = useState(false);

{isLoading && (
  <Modal
    title="Memproses..."
    showCloseButton={false}
    size="sm"
  >
    <div className="flex items-center justify-center py-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin"></div>
      </div>
      <p className="ml-4 text-gray-600">Sedang memproses...</p>
    </div>
  </Modal>
)}
```

---

### 7. Info/Alert Modal
```tsx
const [showInfo, setShowInfo] = useState(false);

{showInfo && (
  <Modal
    title="Informasi Penting"
    onClose={() => setShowInfo(false)}
    size="sm"
    footer={
      <button 
        onClick={() => setShowInfo(false)}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
      >
        Mengerti
      </button>
    }
  >
    <div className="flex items-start gap-3">
      <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="font-medium text-gray-900">
          Perhatian!
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Informasi penting yang perlu Anda ketahui tentang fitur ini.
        </p>
      </div>
    </div>
  </Modal>
)}
```

---

### 8. Custom Icons for Notifications
```tsx
// Success Icon
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
</svg>

// Error Icon
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Warning Icon
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
</svg>

// Info Icon
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Check Icon
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

// Close Icon
<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
</svg>
```

---

## Common Patterns

### Pattern 1: Async Operation with Loading
```tsx
const handleAsync = async () => {
  setIsLoading(true);
  try {
    const result = await longRunningOperation();
    showNotification('Operasi berhasil!', 'success');
    setShowSuccessModal(true);
    setSuccessMessage('Data telah diperbarui');
  } catch (error) {
    showNotification(error.message, 'error');
  } finally {
    setIsLoading(false);
  }
};
```

### Pattern 2: Cascade Modals
```tsx
// First confirm, then show result
const handleCascade = () => {
  setShowDeleteConfirm(item);
};

const confirmDelete = async () => {
  setShowDeleteConfirm(null);
  setIsLoading(true);
  
  try {
    await apiDelete(`/items/${item.id}`);
    setIsLoading(false);
    setShowSuccessModal(true);
  } catch (error) {
    setIsLoading(false);
    showNotification(error.message, 'error');
  }
};
```

### Pattern 3: Reusable Notification Hook
```tsx
const useNotification = () => {
  const [notification, setNotification] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!notification) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setNotification(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [notification]);

  return {
    notification,
    timeLeft,
    show: (message, type = 'success') => {
      setNotification({ message, type });
      setTimeLeft(3);
    },
    clear: () => setNotification(null)
  };
};

// Usage
const { notification, timeLeft, show, clear } = useNotification();
show('Item berhasil dihapus!', 'success');
```

---

## Troubleshooting

### Modal tidak muncul
- Pastikan state sudah di-set ke `true`
- Cek z-index (modal: z-110, backdrop: z-90)
- Verifikasi JSX conditional rendering

### Toast terlalu cepat hilang
- Naikkan duration di state (default: 3 detik)
- Ganti `duration-1000` menjadi `duration-500` untuk progress bar lebih cepat

### Animasi tidak smooth
- Pastikan Tailwind animations diaktifkan di config
- Gunakan `transition-all duration-X` untuk smooth transitions

### Modal tidak bisa di-close
- Verifikasi `onClose` handler
- Cek apakah ada event propagation issue
- Pastikan close button punya `onClick` handler

