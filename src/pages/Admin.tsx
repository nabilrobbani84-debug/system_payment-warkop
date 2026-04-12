import { useState, useEffect } from 'react';
import { 
  getMenus, 
  saveMenus, 
  getTables, 
  saveTables, 
  getOrders, 
  saveOrders,
  updateTableStatus,
  syncToGoogleSheet,
  listenToDataChanges,
  type MenuItem, 
  type Table, 
  type Order, 
  type MenuCategory,
  getSheetAppUrl,
  saveSheetAppUrl,
  getSheetPubUrl,
  saveSheetPubUrl,
  getDailyToken,
  getQrisPayload,
  saveQrisPayload,
  logoutAdmin,
  initializeData,
  formatRupiah,
  getTaxSettings,
  saveTaxSettings,
  getSecuritySettings,
  saveSecuritySettings,
  type TaxSettings,
  type SecuritySettings,
  getMenuCategories,
  saveMenuCategories,
  getVariantGroups,
  saveVariantGroups,
  type VariantGroup,
  type VariantOption,
  getWithdrawalHistory,
  getFirestoreSyncState,
  type FirestoreSyncState,
} from '../store/dataManager';
import { Settings, Plus, Edit, Trash2, Table2, FileText, Users, Home, BarChart3, ArrowLeft, ShoppingBag, QrCode, ChevronRight, LogOut, Clock3, CreditCard, Link2, Database, BadgeCheck, History, ShieldCheck, UserCog, LockKeyhole, Percent, KeyRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

import AdminLogin from './AdminLogin';
import { useFeedback } from '../components/feedback/useFeedback';

type Tab = 'dashboard' | 'menu' | 'table' | 'laporan' | 'account';
type AccountSection = 'home' | 'security' | 'tax' | 'category' | 'variant';

export default function Admin() {
  const feedback = useFeedback();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => sessionStorage.getItem('warkop_admin_logged_in') === 'true');
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [menus, setMenus] = useState<MenuItem[]>(() => getMenus());
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>(() => getMenuCategories());
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>(() => getVariantGroups());
  const [tables, setTables] = useState<Table[]>(() => getTables());
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [withdrawalHistory, setWithdrawalHistory] = useState(() => getWithdrawalHistory());
  const [firestoreSync, setFirestoreSync] = useState<FirestoreSyncState>(() => getFirestoreSyncState());

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetAppUrl, setSheetAppUrl] = useState(() => getSheetAppUrl());
  const [sheetPubUrl, setSheetPubUrl] = useState(() => getSheetPubUrl());
  const [qrisPayloadInput, setQrisPayloadInput] = useState(() => getQrisPayload());
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => getTaxSettings());
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => getSecuritySettings());
  const [adminAllowlistInput, setAdminAllowlistInput] = useState(() => getSecuritySettings().adminAllowlist.join('\n'));
  const [accountSection, setAccountSection] = useState<AccountSection>('home');
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [variantGroupDraft, setVariantGroupDraft] = useState({
    name: '',
    description: '',
    visible: true,
    appliesToCategories: [] as string[],
  });
  const [editingVariantGroupId, setEditingVariantGroupId] = useState<string | null>(null);
  const [variantOptionDrafts, setVariantOptionDrafts] = useState<Record<string, { name: string; price: number; inStock: boolean }>>({});
  const [selectedVariantGroupId, setSelectedVariantGroupId] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'Semua' | Order['status']>('Semua');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'Semua' | 'Cash' | 'QRIS'>('Semua');
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, Order['status']>>(() =>
    getOrders().reduce<Record<string, Order['status']>>((acc, order) => {
      acc[order.id] = order.status;
      return acc;
    }, {})
  );
  const accountPageMeta: Record<AccountSection, { eyebrow: string; title: string; description: string }> = {
    home: {
      eyebrow: 'Account Settings',
      title: 'Pusat kontrol dashboard',
      description: 'Pilih halaman pengaturan yang ingin dibuka agar konfigurasi admin tetap rapi dan fokus.',
    },
    security: {
      eyebrow: 'Keamanan',
      title: 'Kontrol akses panel',
      description: 'Kelola siapa yang boleh masuk ke admin dan apakah halaman kasir harus memakai PIN.',
    },
    tax: {
      eyebrow: 'Pajak',
      title: 'Konfigurasi pajak layanan',
      description: 'Atur bagaimana pajak tampil di review pesanan dan detail transaksi buyer.',
    },
    category: {
      eyebrow: 'Kategori',
      title: 'Kategori menu utama',
      description: 'Kelola kategori menu agar buyer lebih mudah memahami jenis makanan dan minuman.',
    },
    variant: {
      eyebrow: 'Kategori Varian',
      title: 'Varian per kategori menu',
      description: 'Atur logika varian seperti hangat/es, level gula, topping, dan biaya tambahan.',
    },
  };

  const [tableToDelete, setTableToDelete] = useState<{id: string, number: number} | null>(null);
  const selectedVariantGroup = selectedVariantGroupId ? variantGroups.find(group => group.id === selectedVariantGroupId) ?? null : null;

  const loadData = () => {
    const nextOrders = getOrders();
    setMenus(getMenus());
    setMenuCategories(getMenuCategories());
    setVariantGroups(getVariantGroups());
    setTables(getTables());
    setOrders(nextOrders);
    setSheetAppUrl(getSheetAppUrl());
    setSheetPubUrl(getSheetPubUrl());
    setQrisPayloadInput(getQrisPayload());
    const loadedTaxSettings = getTaxSettings();
    const loadedSecuritySettings = getSecuritySettings();
    setTaxSettings(loadedTaxSettings);
    setSecuritySettings(loadedSecuritySettings);
    setWithdrawalHistory(getWithdrawalHistory());
    setFirestoreSync({ ...getFirestoreSyncState() });
    setAdminAllowlistInput(loadedSecuritySettings.adminAllowlist.join('\n'));
    setOrderStatusDrafts(
      nextOrders.reduce<Record<string, Order['status']>>((acc, order) => {
        acc[order.id] = order.status;
        return acc;
      }, {})
    );
  };

  useEffect(() => {
    return listenToDataChanges(loadData);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    void initializeData()
      .then(() => {
        loadData();
      })
      .catch(() => {
        loadData();
      });
  }, [isAuthenticated]);

  const handleLogout = async () => {
    const shouldLogout = await feedback.confirm({
      title: 'Keluar dari panel admin?',
      description: 'Sesi admin akan diakhiri dan Anda perlu login kembali untuk mengakses dashboard.',
      confirmLabel: 'Ya, keluar',
      cancelLabel: 'Tetap di sini',
      variant: 'danger',
    });
    if (!shouldLogout) return;

    await logoutAdmin();
    sessionStorage.removeItem('warkop_admin_logged_in');
    setIsAuthenticated(false);
    feedback.toast({ title: 'Berhasil logout', description: 'Sesi admin sudah ditutup.', variant: 'success' });
  };

  // Compute Dashboard Stats
  const completedOrders = orders.filter(o => o.status === 'Selesai' || o.status === 'Lunas/Diproses');
  const activeOrders = orders.filter(o => o.status === 'Menunggu Pembayaran');
  
  // Semua Waktu
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const cashRevenue = completedOrders.filter(o => o.paymentMethod === 'Cash' || !o.paymentMethod).reduce((sum, o) => sum + o.totalAmount, 0);
  const qrisRevenue = totalRevenue - cashRevenue; // Semua transfer (QRIS, DANA, GoPay, OVO, dll)

  // Hari Ini
  const todayStr = new Date().toDateString();
  const completedToday = completedOrders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const todayRevenue = completedToday.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayCash = completedToday.filter(o => o.paymentMethod === 'Cash' || !o.paymentMethod).reduce((sum, o) => sum + o.totalAmount, 0);
  const todayQris = todayRevenue - todayCash;

  const occupiedTables = tables.filter(t => t.status === 'Aktif/Unpaid');
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const paymentReadyCount = orders.filter(o => o.status === 'Lunas/Diproses').length;
  const privateFirestoreReady = firestoreSync.privateSettings.ready;
  const withdrawalFirestoreReady = firestoreSync.withdrawals.ready;
  const firestoreSyncReadyCount = Object.values(firestoreSync).filter(item => item.ready).length;
  const firestoreErrorCount = Object.values(firestoreSync).filter(item => item.error).length;
  const latestWithdrawal = withdrawalHistory[0] || null;
  const ordersPerPage = 8;
  const filteredOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(order => {
      const search = orderSearch.trim().toLowerCase();
      const matchesSearch = search.length === 0
        || order.id.toLowerCase().includes(search)
        || getTableLabel(order.tableId).toLowerCase().includes(search);
      const matchesStatus = orderStatusFilter === 'Semua' || order.status === orderStatusFilter;
      const matchesPayment = orderPaymentFilter === 'Semua' || (order.paymentMethod || 'Cash') === orderPaymentFilter;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const currentOrdersPage = Math.min(ordersPage, totalOrderPages);
  const paginatedOrders = filteredOrders.slice((currentOrdersPage - 1) * ordersPerPage, currentOrdersPage * ordersPerPage);
  const filteredRevenue = filteredOrders
    .filter(order => order.status === 'Lunas/Diproses' || order.status === 'Selesai')
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const getTableLabel = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table ? `Meja ${table.number.toString().padStart(2, '0')}` : tableId;
  };

  const getOrderStatusColor = (status: Order['status']) => {
    if (status === 'Menunggu Pembayaran') return { bg: '#fff7ed', text: '#c2410c' };
    if (status === 'Lunas/Diproses') return { bg: '#eff6ff', text: '#1d4ed8' };
    if (status === 'Selesai') return { bg: '#f0fdf4', text: '#15803d' };
    return { bg: '#fef2f2', text: '#b91c1c' };
  };

  const getPaymentStyle = (paymentMethod?: Order['paymentMethod']) => {
    if (paymentMethod === 'QRIS') return { bg: '#eff6ff', text: '#1d4ed8', label: 'QRIS' };
    return { bg: '#f8fafc', text: '#475569', label: 'Cash' };
  };

  const formatOrderDate = (date: string) => new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleAdminOrderStatusChange = async (orderId: string) => {
    const targetStatus = orderStatusDrafts[orderId];
    const currentOrder = orders.find(order => order.id === orderId);
    if (!currentOrder || !targetStatus || currentOrder.status === targetStatus) return;

    const shouldApply = await feedback.confirm({
      title: 'Ubah status pembayaran?',
      description: `Order ${orderId} akan diubah dari "${currentOrder.status}" menjadi "${targetStatus}".`,
      confirmLabel: 'Simpan status',
      cancelLabel: 'Batal',
    });
    if (!shouldApply) {
      setOrderStatusDrafts(prev => ({ ...prev, [orderId]: currentOrder.status }));
      return;
    }

    const updatedOrder: Order = {
      ...currentOrder,
      status: targetStatus,
      completedAt: targetStatus === 'Lunas/Diproses' || targetStatus === 'Selesai'
        ? currentOrder.completedAt || new Date().toISOString()
        : currentOrder.completedAt,
    };

    const nextOrders = orders.map(order => order.id === orderId ? updatedOrder : order);
    saveOrders(nextOrders);

    if (targetStatus === 'Menunggu Pembayaran') {
      updateTableStatus(currentOrder.tableId, 'Aktif/Unpaid');
    } else {
      updateTableStatus(currentOrder.tableId, 'Tersedia');
    }

    if (targetStatus === 'Lunas/Diproses' && currentOrder.status !== 'Lunas/Diproses') {
      void syncToGoogleSheet(updatedOrder);
    }

    feedback.toast({
      title: 'Status order diperbarui',
      description: `${orderId} sekarang berstatus ${targetStatus}.`,
      variant: 'success',
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    const currentOrder = orders.find(order => order.id === orderId);
    if (!currentOrder) return;

    const shouldDelete = await feedback.confirm({
      title: 'Hapus order ini?',
      description: `Order ${orderId} akan dihapus permanen dari riwayat transaksi admin.`,
      confirmLabel: 'Hapus order',
      cancelLabel: 'Batal',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    const nextOrders = orders.filter(order => order.id !== orderId);
    saveOrders(nextOrders);
    setOrderStatusDrafts(prev => {
      const nextDrafts = { ...prev };
      delete nextDrafts[orderId];
      return nextDrafts;
    });

    const tableStillActive = nextOrders.some(order => order.tableId === currentOrder.tableId && order.status === 'Menunggu Pembayaran');
    updateTableStatus(currentOrder.tableId, tableStillActive ? 'Aktif/Unpaid' : 'Tersedia');

    feedback.toast({
      title: 'Order berhasil dihapus',
      description: `${orderId} sudah dihapus dari Firestore.`,
      variant: 'success',
    });
  };

  // Compute Monthly Revenue Chart Data
  const monthlyRevenue = (() => {
    const now = new Date();
    const months: { label: string; value: number; month: number; year: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('id-ID', { month: 'short' }),
        value: 0,
        month: d.getMonth(),
        year: d.getFullYear()
      });
    }
    completedOrders.forEach(order => {
      const d = new Date(order.createdAt);
      const entry = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (entry) entry.value += order.totalAmount;
    });
    return months;
  })();
  const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.value), 1);

  // Menu Management
  const handleSaveMenu = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newMenu: MenuItem = {
      id: editingMenu?.id || `m${Date.now()}`,
      name: formData.get('name') as string,
      price: parseInt(formData.get('price') as string, 10),
      category: formData.get('category') as MenuCategory,
      available: formData.get('available') === 'on',
      description: formData.get('description') as string || '',
      image: formData.get('image') as string || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400'
    };

    let updatedMenus;
    if (editingMenu) {
      updatedMenus = menus.map(m => m.id === newMenu.id ? newMenu : m);
    } else {
      updatedMenus = [...menus, newMenu];
    }
    
    saveMenus(updatedMenus);
    setIsMenuModalOpen(false);
    setEditingMenu(null);
  };

  const handleDeleteMenu = async (id: string) => {
    const shouldDelete = await feedback.confirm({
      title: 'Hapus menu ini?',
      description: 'Menu yang dihapus akan hilang dari daftar buyer dan kasir.',
      confirmLabel: 'Hapus menu',
      cancelLabel: 'Batal',
      variant: 'danger',
    });
    if (!shouldDelete) return;
    const updated = menus.filter(m => m.id !== id);
    saveMenus(updated);
    feedback.toast({ title: 'Menu dihapus', description: 'Perubahan sudah disimpan ke Firestore.', variant: 'success' });
  };

  const handleAddTable = () => {
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    const newTable: Table = {
      id: `t${Date.now()}`,
      number: nextNum,
      status: 'Tersedia'
    };
    const updated = [...tables, newTable];
    saveTables(updated);
    feedback.toast({
      title: 'Meja berhasil ditambahkan',
      description: `Meja ${nextNum.toString().padStart(2, '0')} sudah aktif di sistem.`,
      variant: 'success',
    });
  };

  const confirmDeleteTable = async (id: string, number: number) => {
    const isActive = orders.some(o => o.tableId === id && o.status === 'Menunggu Pembayaran');
    if (isActive) {
      await feedback.alert({
        title: 'Meja tidak bisa dihapus',
        description: `Meja ${number} sedang aktif atau masih memiliki pesanan yang belum dibayar.`,
        buttonLabel: 'Mengerti',
      });
      return;
    }
    setTableToDelete({ id, number });
  };

  const executeDeleteTable = () => {
    if (!tableToDelete) return;
    const updated = tables.filter(t => t.id !== tableToDelete.id);
    saveTables(updated);
    feedback.toast({
      title: 'Meja dihapus',
      description: `Meja ${tableToDelete.number.toString().padStart(2, '0')} sudah dihapus dari sistem.`,
      variant: 'success',
    });
    setTableToDelete(null);
  };

  const handleDownloadQR = async (tableNum: number) => {
    const qrElement = document.getElementById(`qr-meja-${tableNum}`);
    if (!qrElement) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(qrElement, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `QR-Meja-${tableNum.toString().padStart(2, '0')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      void err;
      feedback.toast({ title: 'Gagal mengekspor QR', description: 'Silakan coba lagi beberapa saat.', variant: 'error' });
    }
  };

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveSheetAppUrl(sheetAppUrl);
    saveSheetPubUrl(sheetPubUrl);
    saveQrisPayload(qrisPayloadInput);
    setIsSheetModalOpen(false);
    feedback.toast({
      title: 'Konfigurasi disimpan',
      description: 'Pengaturan pembayaran dan integrasi sudah diperbarui.',
      variant: 'success',
    });
  };

  const handleSaveAccountSettings = () => {
    const parsedAllowlist = adminAllowlistInput
      .split(/\r?\n|,/)
      .map(item => item.trim().toLowerCase())
      .filter(Boolean);

    saveSecuritySettings({
      ...securitySettings,
      adminAllowlist: parsedAllowlist,
    });
    saveTaxSettings(taxSettings);

    feedback.toast({
      title: 'Pengaturan akun disimpan',
      description: 'Akses admin, keamanan kasir, dan pajak sudah diperbarui di Firestore.',
      variant: 'success',
    });
  };

  const handleSaveCategory = async () => {
    const nextCategory = categoryNameInput.trim();
    if (!nextCategory) {
      feedback.toast({ title: 'Kategori belum diisi', description: 'Masukkan nama kategori terlebih dahulu.', variant: 'error' });
      return;
    }

    if (editingCategory) {
      const updatedMenus = menus.map(menu => menu.category === editingCategory ? { ...menu, category: nextCategory } : menu);
      saveMenus(updatedMenus);
      saveMenuCategories(menuCategories.map(category => category === editingCategory ? nextCategory : category));
      feedback.toast({ title: 'Kategori diperbarui', description: `Kategori ${editingCategory} diganti menjadi ${nextCategory}.`, variant: 'success' });
    } else {
      if (menuCategories.some(category => category.toLowerCase() === nextCategory.toLowerCase())) {
        feedback.toast({ title: 'Kategori sudah ada', description: 'Gunakan nama kategori yang berbeda.', variant: 'error' });
        return;
      }
      saveMenuCategories([...menuCategories, nextCategory]);
      feedback.toast({ title: 'Kategori ditambahkan', description: `${nextCategory} siap dipakai di buyer dan kasir.`, variant: 'success' });
    }

    setCategoryNameInput('');
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const usedCount = menus.filter(menu => menu.category === categoryName).length;
    if (usedCount > 0) {
      await feedback.alert({
        title: 'Kategori tidak bisa dihapus',
        description: `${categoryName} masih dipakai oleh ${usedCount} menu. Ganti kategori pada menu terkait dulu.`,
        buttonLabel: 'Mengerti',
      });
      return;
    }

    const shouldDelete = await feedback.confirm({
      title: 'Hapus kategori ini?',
      description: `Kategori ${categoryName} akan dihapus dari pilihan kategori.`,
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    saveMenuCategories(menuCategories.filter(category => category !== categoryName));
    if (editingCategory === categoryName) {
      setEditingCategory(null);
      setCategoryNameInput('');
    }
    feedback.toast({ title: 'Kategori dihapus', description: `${categoryName} berhasil dihapus.`, variant: 'success' });
  };

  const resetVariantGroupDraft = () => {
    setVariantGroupDraft({ name: '', description: '', visible: true, appliesToCategories: [] });
    setEditingVariantGroupId(null);
  };

  const handleSaveVariantGroup = () => {
    const normalizedName = variantGroupDraft.name.trim();
    if (!normalizedName) {
      feedback.toast({ title: 'Nama kategori varian wajib diisi', description: 'Isi nama kategori varian terlebih dahulu.', variant: 'error' });
      return;
    }

    if (variantGroupDraft.appliesToCategories.length === 0) {
      feedback.toast({ title: 'Kategori menu belum dipilih', description: 'Pilih minimal satu kategori menu yang akan memakai varian ini.', variant: 'error' });
      return;
    }

    if (editingVariantGroupId) {
      saveVariantGroups(variantGroups.map(group => group.id === editingVariantGroupId ? {
        ...group,
        name: normalizedName,
        description: variantGroupDraft.description.trim(),
        visible: variantGroupDraft.visible,
        appliesToCategories: variantGroupDraft.appliesToCategories,
      } : group));
      feedback.toast({ title: 'Kategori varian diperbarui', description: `${normalizedName} berhasil disimpan.`, variant: 'success' });
    } else {
      const nextGroup: VariantGroup = {
        id: `vg-${Date.now()}`,
        name: normalizedName,
        description: variantGroupDraft.description.trim(),
        visible: variantGroupDraft.visible,
        appliesToCategories: variantGroupDraft.appliesToCategories,
        options: [],
      };
      saveVariantGroups([...variantGroups, nextGroup]);
      setSelectedVariantGroupId(nextGroup.id);
      feedback.toast({ title: 'Kategori varian ditambahkan', description: `${normalizedName} siap dipakai di buyer.`, variant: 'success' });
    }

    resetVariantGroupDraft();
  };

  const handleDeleteVariantGroup = async (groupId: string) => {
    const group = variantGroups.find(item => item.id === groupId);
    if (!group) return;

    const shouldDelete = await feedback.confirm({
      title: 'Hapus kategori varian ini?',
      description: `${group.name} beserta semua variannya akan dihapus.`,
      confirmLabel: 'Hapus',
      cancelLabel: 'Batal',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    saveVariantGroups(variantGroups.filter(item => item.id !== groupId));
    if (selectedVariantGroupId === groupId) {
      setSelectedVariantGroupId(null);
    }
    resetVariantGroupDraft();
    feedback.toast({ title: 'Kategori varian dihapus', description: `${group.name} berhasil dihapus.`, variant: 'success' });
  };

  const handleSaveVariantOption = (groupId: string) => {
    const draft = variantOptionDrafts[groupId];
    if (!draft || !draft.name.trim()) {
      feedback.toast({ title: 'Nama varian wajib diisi', description: 'Isi nama varian sebelum menyimpan.', variant: 'error' });
      return;
    }

    const nextGroups = variantGroups.map(group => {
      if (group.id !== groupId) return group;
      const nextOption: VariantOption = {
        id: `vo-${Date.now()}`,
        name: draft.name.trim(),
        price: Number.isFinite(draft.price) ? Math.max(0, draft.price) : 0,
        inStock: draft.inStock,
      };
      return { ...group, options: [...group.options, nextOption] };
    });

    saveVariantGroups(nextGroups);
    setVariantOptionDrafts(prev => ({ ...prev, [groupId]: { name: '', price: 0, inStock: true } }));
    feedback.toast({ title: 'Varian ditambahkan', description: 'Varian baru berhasil masuk ke kategori varian.', variant: 'success' });
  };

  const handleDeleteVariantOption = (groupId: string, optionId: string) => {
    saveVariantGroups(variantGroups.map(group => group.id === groupId ? { ...group, options: group.options.filter(option => option.id !== optionId) } : group));
  };

  const wrapperStyle = {
    backgroundColor: '#f8f9fa',
    color: '#0f172a',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif"
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin onSuccess={() => {
        sessionStorage.setItem('warkop_admin_logged_in', 'true');
        setIsAuthenticated(true);
      }} />
    );
  }

  return (
    <div style={wrapperStyle} className="flex justify-center pb-20">
      <div className="w-full max-w-md bg-[#f8f9fa] min-h-screen relative shadow-2xl">
        
        {/* Header */}
        <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 40 }}>
            {activeTab === 'dashboard' ? (
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>Dashboard Admin</h1>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>Halo, selamat datang kembali!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ArrowLeft size={24} onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }} />
                  <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {activeTab === 'laporan' ? 'RIWAYAT ORDERS' : activeTab === 'account' ? 'ACCOUNT & PROFILE' : activeTab.toUpperCase()}
                  </h1>
                </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div onClick={handleLogout} style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} title="Keluar">
                <LogOut size={18} color="#ef4444" />
              </div>
              <div onClick={() => setIsSheetModalOpen(true)} style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} title="Pengaturan">
                <Settings size={20} color="#64748b" />
              </div>
            </div>
        </div>

        <div style={{ padding: '0 20px 100px' }}>
          
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Revenue Card Card */}
              <div style={{ backgroundColor: '#0f172a', borderRadius: '24px', padding: '24px', color: 'white', marginBottom: '8px', boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.4)', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '100px', height: '100px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                     <div>
                         <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#38bdf8', marginBottom: '8px' }}>Omzet Hari Ini</p>
                         <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 20px', color: '#ffffff' }}>Rp {formatRupiah(todayRevenue)}</h2>
                     </div>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '12px', borderRadius: '16px' }}>
                        <p style={{ fontSize: '10px', opacity: 0.9, marginBottom: '4px', color: '#bae6fd', fontWeight: 600 }}>💳 E-WALLET / QRIS</p>
                        <p style={{ fontSize: '15px', fontWeight: 700 }}>Rp {formatRupiah(todayQris)}</p>
                    </div>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '16px' }}>
                        <p style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px' }}>💵 CASH</p>
                        <p style={{ fontSize: '15px', fontWeight: 700 }}>Rp {formatRupiah(todayCash)}</p>
                    </div>
                 </div>
              </div>

              {/* All Time Revenue (Collapsed/Minimal) */}
              <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '16px 20px', color: 'white', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Total Keseluruhan (All-Time)</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>Rp {formatRupiah(totalRevenue)}</p>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Total via QRIS</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#38bdf8' }}>Rp {formatRupiah(qrisRevenue)}</p>
                 </div>
              </div>

              {/* QRIS Setup Alert if empty */}
              {!qrisPayloadInput && (
                <div onClick={() => setIsSheetModalOpen(true)} style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', padding: '16px', borderRadius: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                   <div style={{ backgroundColor: '#ea580c', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={20} color="white" />
                   </div>
                   <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#9a3412', margin: 0 }}>QRIS Belum Disetup</p>
                      <p style={{ fontSize: '11px', color: '#ea580c', margin: '2px 0 0' }}>Klik di sini untuk isi payload QRIS warung Anda.</p>
                   </div>
                   <ChevronRight size={16} color="#ea580c" />
                </div>
              )}

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <Users size={18} color="#ea580c" />
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>TABLES</span>
                   </div>
                   <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{occupiedTables.length}/{tables.length}</h3>
                   <p style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>● Live status</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <ShoppingBag size={18} color="#3b82f6" />
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>ORDERS</span>
                   </div>
                   <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{activeOrders.length}</h3>
                   <p style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700, marginTop: '4px' }}>Menunggu Bayar</p>
                </div>
              </div>

              {/* Chart Placeholder / Laporan Short */}
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Pemasukan Bulanan</h3>
                    <BarChart3 size={18} color="#94a3b8" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px', marginBottom: '8px' }}>
                      {monthlyRevenue.slice(-7).map((m, i) => (
                        <div key={i} style={{ flex: 1, backgroundColor: i === 6 ? '#ea580c' : '#f1f5f9', borderRadius: '4px', height: `${(m.value / (maxMonthlyRevenue || 1)) * 100}%`, minHeight: '4px' }}></div>
                      ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                      {monthlyRevenue.slice(-7).map((m, i) => (
                        <span key={i} style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>{m.label}</span>
                      ))}
                  </div>
              </div>

              {/* Quick Navigation Cards */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div onClick={() => setActiveTab('menu')} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', cursor: 'pointer' }}>
                     <FileText size={24} color="#ea580c" style={{ marginBottom: '12px' }} />
                     <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Menu</h4>
                     <p style={{ fontSize: '11px', color: '#64748b' }}>Kelola daftar makanan & minuman</p>
                  </div>
                  <div onClick={() => setActiveTab('table')} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', cursor: 'pointer' }}>
                     <Table2 size={24} color="#3b82f6" style={{ marginBottom: '12px' }} />
                     <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Meja</h4>
                     <p style={{ fontSize: '11px', color: '#64748b' }}>Setup meja & download QR Code</p>
                  </div>
               </div>

               <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', marginTop: '24px', marginBottom: '20px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                   <div>
                     <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Order Terbaru</h3>
                     <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Data live dari Firestore</p>
                   </div>
                   <button onClick={() => setActiveTab('laporan')} style={{ border: 'none', backgroundColor: '#fff7ed', color: '#ea580c', fontWeight: 700, borderRadius: '12px', padding: '10px 14px', cursor: 'pointer' }}>
                     Lihat Semua
                   </button>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {recentOrders.length > 0 ? recentOrders.map(order => {
                     const statusColor = getOrderStatusColor(order.status);
                     const paymentStyle = getPaymentStyle(order.paymentMethod);
                     return (
                       <div key={order.id} style={{ padding: '16px', borderRadius: '18px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                           <div style={{ minWidth: 0, flex: 1 }}>
                             <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{order.id}</p>
                             <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>{formatOrderDate(order.createdAt)}</p>
                           </div>
                           <span style={{ fontSize: '11px', fontWeight: 800, padding: '6px 10px', borderRadius: '999px', backgroundColor: statusColor.bg, color: statusColor.text }}>
                             {order.status}
                           </span>
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                               <span style={{ fontSize: '11px', fontWeight: 800, padding: '6px 10px', borderRadius: '999px', backgroundColor: '#f8fafc', color: '#334155' }}>
                                 {getTableLabel(order.tableId)}
                               </span>
                               <span style={{ fontSize: '11px', fontWeight: 800, padding: '6px 10px', borderRadius: '999px', backgroundColor: paymentStyle.bg, color: paymentStyle.text }}>
                                 {paymentStyle.label}
                               </span>
                             </div>
                             <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Transaksi terbaru tersinkron langsung dari Firestore.</p>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                             <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Total</p>
                             <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: 800 }}>Rp {formatRupiah(order.totalAmount)}</span>
                           </div>
                         </div>
                       </div>
                     );
                   }) : (
                     <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                       Belum ada order yang masuk ke Firestore.
                     </div>
                   )}
                 </div>
               </div>

               <div style={{ backgroundColor: '#0f172a', borderRadius: '24px', padding: '24px', color: 'white' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                   <div>
                     <p style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, margin: 0 }}>Konfigurasi Database</p>
                     <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0 0' }}>Firestore Aktif</h3>
                   </div>
                   <Database size={22} color="#38bdf8" />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                   <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px' }}>
                     <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Sinkronisasi</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, margin: '6px 0 0', color: firestoreErrorCount === 0 ? '#86efac' : '#fcd34d' }}>
                        {firestoreErrorCount === 0 ? 'Tersambung' : 'Perlu login / cek rules'}
                      </p>
                   </div>
                   <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px' }}>
                     <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>Dokumen Siap</p>
                     <p style={{ fontSize: '14px', fontWeight: 700, margin: '6px 0 0' }}>{firestoreSyncReadyCount}/6 dokumen</p>
                   </div>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <QrCode size={16} color="#38bdf8" />
                       <span style={{ fontSize: '13px', fontWeight: 600 }}>QRIS publik untuk buyer</span>
                     </div>
                     <span style={{ fontSize: '12px', fontWeight: 700, color: qrisPayloadInput ? '#86efac' : '#fcd34d' }}>{qrisPayloadInput ? 'Tersedia' : 'Kosong'}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <Link2 size={16} color="#38bdf8" />
                       <span style={{ fontSize: '13px', fontWeight: 600 }}>Google Sheet App Script</span>
                     </div>
                     <span style={{ fontSize: '12px', fontWeight: 700, color: sheetAppUrl ? '#86efac' : '#fcd34d' }}>{sheetAppUrl ? 'Tersimpan' : 'Kosong'}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <ShieldCheck size={16} color="#38bdf8" />
                       <span style={{ fontSize: '13px', fontWeight: 600 }}>Private settings admin</span>
                     </div>
                     <span style={{ fontSize: '12px', fontWeight: 700, color: privateFirestoreReady ? '#86efac' : '#fcd34d' }}>
                       {privateFirestoreReady ? 'Terbaca' : 'Butuh auth'}
                     </span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <History size={16} color="#38bdf8" />
                       <span style={{ fontSize: '13px', fontWeight: 600 }}>Riwayat penarikan QRIS</span>
                     </div>
                     <span style={{ fontSize: '12px', fontWeight: 700, color: withdrawalFirestoreReady ? '#86efac' : '#fcd34d' }}>
                       {withdrawalFirestoreReady ? `${withdrawalHistory.length} data` : 'Butuh auth'}
                     </span>
                   </div>
                 </div>
                 <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '8px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Orders diproses</span>
                     <span style={{ fontSize: '12px', color: 'white', fontWeight: 800 }}>{paymentReadyCount} transaksi</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Pajak & keamanan</span>
                     <span style={{ fontSize: '12px', color: 'white', fontWeight: 800 }}>
                       {taxSettings.enabled ? `${taxSettings.rate}% aktif` : 'Pajak nonaktif'} • {securitySettings.cashierPinEnabled ? 'PIN kasir aktif' : 'PIN kasir mati'}
                     </span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Penarikan terakhir</span>
                     <span style={{ fontSize: '12px', color: 'white', fontWeight: 800 }}>
                       {latestWithdrawal ? `${latestWithdrawal.destinationType} • Rp ${formatRupiah(latestWithdrawal.amount)}` : 'Belum ada data'}
                     </span>
                   </div>
                   {firestoreSync.privateSettings.error && (
                     <div style={{ marginTop: '6px', padding: '10px 12px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.16)', color: '#fde68a', fontSize: '11px', lineHeight: 1.5 }}>
                       Firestore private settings belum terbaca penuh: {firestoreSync.privateSettings.error}
                     </div>
                   )}
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="animate-fade-in">
              {(() => {
                const pageMeta = accountPageMeta[accountSection];
                return (
              <div style={{ backgroundColor: '#0f172a', color: 'white', borderRadius: '24px', padding: '24px', marginBottom: '18px', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 700, margin: '0 0 6px' }}>{pageMeta.eyebrow}</p>
                    <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>{pageMeta.title}</h3>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>{pageMeta.description}</p>
                  </div>
                  <ShieldCheck size={24} color="#38bdf8" />
                </div>
              </div>
                );
              })()}

              <div style={{ display: 'grid', gap: '16px' }}>
                {accountSection === 'home' && (
                  <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '12px', border: '1px solid #e2e8f0', display: 'grid', gap: '10px' }}>
                    {[
                      { key: 'security' as const, icon: ShieldCheck, title: 'Keamanan', desc: 'Akses admin dan PIN kasir' },
                      { key: 'tax' as const, icon: Percent, title: 'Pajak', desc: 'Atur pajak layanan buyer' },
                      { key: 'category' as const, icon: FileText, title: 'Kategori', desc: 'Kelola kategori menu utama' },
                      { key: 'variant' as const, icon: Plus, title: 'Kategori Varian', desc: 'Kelola varian per kategori menu' },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAccountSection(item.key)}
                          style={{
                            padding: '16px 18px',
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={18} color="#ea580c" />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{item.title}</div>
                              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{item.desc}</div>
                            </div>
                          </div>
                          <ChevronRight size={18} color="#94a3b8" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {accountSection !== 'home' && (
                  <button
                    type="button"
                    onClick={() => setAccountSection('home')}
                    style={{ width: 'fit-content', padding: '10px 14px', borderRadius: '999px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ArrowLeft size={16} />
                    Kembali ke Menu Account
                  </button>
                )}

                {accountSection === 'security' && (
                  <>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Akses Admin</h3>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Batasi email yang boleh login ke dashboard admin.</p>
                        </div>
                        <UserCog size={18} color="#ea580c" />
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', marginBottom: '16px', cursor: 'pointer' }}>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Aktifkan allowlist admin</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Jika aktif, hanya email di bawah yang boleh mengakses admin.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={securitySettings.adminAllowlistEnabled}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, adminAllowlistEnabled: e.target.checked }))}
                        />
                      </label>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Daftar email admin</label>
                        <textarea
                          value={adminAllowlistInput}
                          onChange={(e) => setAdminAllowlistInput(e.target.value)}
                          rows={5}
                          placeholder={'admin@warkop.com\nowner@warkop.com'}
                          style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', resize: 'vertical' }}
                        />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Keamanan Kasir</h3>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Tambahkan PIN sebelum halaman kasir bisa diakses.</p>
                        </div>
                        <LockKeyhole size={18} color="#ea580c" />
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', marginBottom: '16px', cursor: 'pointer' }}>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Kunci halaman kasir dengan PIN</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Kasir harus memasukkan PIN sebelum membuka panel operasional.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={securitySettings.cashierPinEnabled}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, cashierPinEnabled: e.target.checked }))}
                        />
                      </label>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>PIN Kasir</label>
                        <input
                          type="password"
                          value={securitySettings.cashierPin}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, cashierPin: e.target.value }))}
                          placeholder="Masukkan PIN kasir"
                          style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {accountSection === 'tax' && (
                  <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Konfigurasi Pajak</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Mengontrol total di review pesanan dan detail transaksi buyer.</p>
                      </div>
                      <Percent size={18} color="#ea580c" />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', marginBottom: '16px', cursor: 'pointer' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Aktifkan pajak layanan</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Jika dimatikan, semua checkout buyer otomatis tanpa pajak.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={taxSettings.enabled}
                        onChange={(e) => setTaxSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                      />
                    </label>

                    <div style={{ display: 'grid', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>Persentase pajak layanan</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={taxSettings.rate}
                          onChange={(e) => setTaxSettings(prev => ({ ...prev, rate: Number(e.target.value) }))}
                          style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Terapkan juga ke QRIS</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Biarkan mati jika QRIS harus tetap bebas pajak.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={taxSettings.applyToQris}
                          onChange={(e) => setTaxSettings(prev => ({ ...prev, applyToQris: e.target.checked }))}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {accountSection === 'category' && (
                  <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Kategori Menu</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Tambah, ubah, dan hapus kategori agar buyer lebih mudah mengenali jenis menu.</p>
                      </div>
                      <FileText size={18} color="#ea580c" />
                    </div>

                    <div style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
                      <input
                        type="text"
                        value={categoryNameInput}
                        onChange={(e) => setCategoryNameInput(e.target.value)}
                        placeholder="Contoh: Dessert, Kopi Susu, Mie"
                        style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => void handleSaveCategory()}
                          style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                        </button>
                        {editingCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setCategoryNameInput('');
                            }}
                            style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {menuCategories.map(category => {
                        const usedCount = menus.filter(menu => menu.category === category).length;
                        return (
                          <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{category}</p>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{usedCount} menu menggunakan kategori ini</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setCategoryNameInput(category);
                                }}
                                style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteCategory(category)}
                                style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {accountSection === 'variant' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0' }}>
                      <div style={{ marginBottom: '18px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Kategori Varian</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Atur logika varian seperti hangat/es, level gula, topping, dan lainnya.</p>
                      </div>

                      <div style={{ display: 'grid', gap: '12px' }}>
                        <input
                          type="text"
                          value={variantGroupDraft.name}
                          onChange={(e) => setVariantGroupDraft(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nama kategori varian, contoh: Suhu Minuman"
                          style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                        />
                        <textarea
                          value={variantGroupDraft.description}
                          onChange={(e) => setVariantGroupDraft(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          placeholder="Keterangan kategori varian"
                          style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', resize: 'vertical' }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Tampilan status</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{variantGroupDraft.visible ? 'Tampilkan ke buyer' : 'Sembunyikan dari buyer'}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={variantGroupDraft.visible}
                            onChange={(e) => setVariantGroupDraft(prev => ({ ...prev, visible: e.target.checked }))}
                          />
                        </label>
                        <div style={{ padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                          <p style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', margin: '0 0 10px' }}>Pakai untuk kategori menu</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {menuCategories.map(category => {
                              const selected = variantGroupDraft.appliesToCategories.includes(category);
                              return (
                                <button
                                  key={category}
                                  type="button"
                                  onClick={() => setVariantGroupDraft(prev => ({
                                    ...prev,
                                    appliesToCategories: selected
                                      ? prev.appliesToCategories.filter(item => item !== category)
                                      : [...prev.appliesToCategories, category],
                                  }))}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: '999px',
                                    border: selected ? '1px solid #ea580c' : '1px solid #cbd5e1',
                                    backgroundColor: selected ? '#fff7ed' : 'white',
                                    color: selected ? '#ea580c' : '#475569',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {category}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" onClick={handleSaveVariantGroup} style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                            {editingVariantGroupId ? 'Simpan Kategori Varian' : 'Tambah Kategori Varian'}
                          </button>
                          {editingVariantGroupId && (
                            <button type="button" onClick={resetVariantGroupDraft} style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
                              Batal
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!selectedVariantGroup && (
                      <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0', display: 'grid', gap: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Daftar Kategori Varian</h4>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>Klik salah satu kategori varian untuk masuk ke halaman detail dan mengelola data variannya.</p>
                        </div>

                        {variantGroups.length === 0 && (
                          <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                            Belum ada kategori varian. Tambahkan kategori varian baru terlebih dahulu.
                          </div>
                        )}

                        {variantGroups.map(group => (
                          <div key={group.id} style={{ padding: '16px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{group.name}</h4>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>{group.description || 'Tanpa keterangan tambahan.'}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0' }}>Kategori menu: {group.appliesToCategories.join(', ') || 'Belum dipilih'} • {group.visible ? 'Tampilkan' : 'Sembunyikan'} • {group.options.length} varian</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedVariantGroupId(group.id)}
                                style={{ padding: '10px 14px', borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Buka Detail
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" onClick={() => {
                                setEditingVariantGroupId(group.id);
                                setVariantGroupDraft({
                                  name: group.name,
                                  description: group.description,
                                  visible: group.visible,
                                  appliesToCategories: group.appliesToCategories,
                                });
                              }} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                                Edit
                              </button>
                              <button type="button" onClick={() => void handleDeleteVariantGroup(group.id)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>
                                Hapus
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedVariantGroup && (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedVariantGroupId(null)}
                          style={{ width: 'fit-content', padding: '10px 14px', borderRadius: '999px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                          <ArrowLeft size={16} />
                          Kembali ke Daftar Kategori Varian
                        </button>

                        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                            <div>
                              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{selectedVariantGroup.name}</h4>
                              <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>{selectedVariantGroup.description || 'Tanpa keterangan tambahan.'}</p>
                              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0' }}>Kategori menu: {selectedVariantGroup.appliesToCategories.join(', ') || 'Belum dipilih'} • {selectedVariantGroup.visible ? 'Tampilkan' : 'Sembunyikan'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" onClick={() => {
                                setEditingVariantGroupId(selectedVariantGroup.id);
                                setVariantGroupDraft({
                                  name: selectedVariantGroup.name,
                                  description: selectedVariantGroup.description,
                                  visible: selectedVariantGroup.visible,
                                  appliesToCategories: selectedVariantGroup.appliesToCategories,
                                });
                              }} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                                Edit Kategori
                              </button>
                              <button type="button" onClick={() => void handleDeleteVariantGroup(selectedVariantGroup.id)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>
                                Hapus Kategori
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
                            {selectedVariantGroup.options.length === 0 && (
                              <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                                Belum ada varian di kategori ini. Tambahkan varian baru di bawah.
                              </div>
                            )}

                            {selectedVariantGroup.options.map(option => (
                              <div key={option.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div>
                                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{option.name}</p>
                                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                                    {option.price > 0 ? `Tambah Rp ${formatRupiah(option.price)}` : 'Gratis'} • {option.inStock ? 'Stok tersedia' : 'Stok habis'}
                                  </p>
                                </div>
                                <button type="button" onClick={() => handleDeleteVariantOption(selectedVariantGroup.id, option.id)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>
                                  Hapus
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '22px', border: '1px solid #e2e8f0', display: 'grid', gap: '10px' }}>
                          <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Tambah Varian</p>
                          <input
                            type="text"
                            value={variantOptionDrafts[selectedVariantGroup.id]?.name || ''}
                            onChange={(e) => setVariantOptionDrafts(prev => ({ ...prev, [selectedVariantGroup.id]: { name: e.target.value, price: prev[selectedVariantGroup.id]?.price || 0, inStock: prev[selectedVariantGroup.id]?.inStock ?? true } }))}
                            placeholder="Nama varian, contoh: Hangat"
                            style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                          />
                          <input
                            type="number"
                            min="0"
                            value={variantOptionDrafts[selectedVariantGroup.id]?.price || 0}
                            onChange={(e) => setVariantOptionDrafts(prev => ({ ...prev, [selectedVariantGroup.id]: { name: prev[selectedVariantGroup.id]?.name || '', price: Number(e.target.value), inStock: prev[selectedVariantGroup.id]?.inStock ?? true } }))}
                            placeholder="Harga varian, 0 jika gratis"
                            style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Ketersediaan stok</span>
                            <input
                              type="checkbox"
                              checked={variantOptionDrafts[selectedVariantGroup.id]?.inStock ?? true}
                              onChange={(e) => setVariantOptionDrafts(prev => ({ ...prev, [selectedVariantGroup.id]: { name: prev[selectedVariantGroup.id]?.name || '', price: prev[selectedVariantGroup.id]?.price || 0, inStock: e.target.checked } }))}
                            />
                          </label>
                          <button type="button" onClick={() => handleSaveVariantOption(selectedVariantGroup.id)} style={{ width: '100%', padding: '14px', borderRadius: '16px', border: 'none', backgroundColor: '#ea580c', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                            Simpan Varian
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(accountSection === 'security' || accountSection === 'tax') && (
                  <button
                    type="button"
                    onClick={handleSaveAccountSettings}
                    style={{ width: '100%', padding: '16px', borderRadius: '18px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontSize: '15px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.16)' }}
                  >
                    Simpan Pengaturan Account
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Terdapat {menus.length} menu aktif.</p>
                 <button 
                   onClick={() => { setEditingMenu(null); setIsMenuModalOpen(true); }}
                   style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                 >
                   <Plus size={16} /> Tambah Menu
                 </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {menus.map(menu => (
                    <div key={menu.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                        <img src={menu.image} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                        <div style={{ marginLeft: '16px', flex: 1 }}>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{menu.name}</h4>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px' }}>{menu.category}</p>
                            <p style={{ fontSize: '14px', fontWeight: 800, color: '#ea580c', margin: 0 }}>Rp {formatRupiah(menu.price)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <button onClick={() => { setEditingMenu(menu); setIsMenuModalOpen(true); }} style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Edit size={16} color="#64748b" /></button>
                           <button onClick={() => handleDeleteMenu(menu.id)} style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444" /></button>
                        </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="animate-fade-in">
                <button onClick={handleAddTable} style={{ width: '100%', marginBottom: '24px', padding: '14px', borderRadius: '16px', backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Plus size={18} /> Tambah Meja Baru
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {tables.sort((a,b) => a.number - b.number).map(table => (
                        <div key={table.id} style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>NO. {table.number}</span>
                                <Trash2 size={16} color="#ef4444" onClick={() => confirmDeleteTable(table.id, table.number)} style={{ cursor: 'pointer' }} />
                            </div>
                            <div id={`qr-meja-${table.number}`} style={{ padding: '16px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <QRCodeSVG value={`${window.location.origin}/menu?meja=${table.number}&token=${getDailyToken()}`} size={120} />
                            </div>
                            <button onClick={() => handleDownloadQR(table.number)} style={{ marginTop: '16px', width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                                Download QR
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {activeTab === 'laporan' && (
            <div className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Clock3 size={16} color="#ea580c" />
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>MENUNGGU BAYAR</span>
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{activeOrders.length}</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <CreditCard size={16} color="#3b82f6" />
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>TOTAL ORDER</span>
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{orders.length}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <History size={16} color="#0f172a" />
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>HASIL FILTER</span>
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{filteredOrders.length}</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <BadgeCheck size={16} color="#16a34a" />
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>OMZET TAMPIL</span>
                  </div>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatRupiah(filteredRevenue)}</p>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Riwayat Orders</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Seluruh transaksi yang tersimpan di Firestore</p>
                  </div>
                  <BadgeCheck size={18} color="#16a34a" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                  <input
                    value={orderSearch}
                    onChange={e => {
                      setOrderSearch(e.target.value);
                      setOrdersPage(1);
                    }}
                    placeholder="Cari ID order atau meja..."
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }}
                  />
                  <select
                    value={orderStatusFilter}
                    onChange={e => {
                      setOrderStatusFilter(e.target.value as 'Semua' | Order['status']);
                      setOrdersPage(1);
                    }}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', backgroundColor: 'white' }}
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                    <option value="Lunas/Diproses">Lunas/Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </select>
                  <select
                    value={orderPaymentFilter}
                    onChange={e => {
                      setOrderPaymentFilter(e.target.value as 'Semua' | 'Cash' | 'QRIS');
                      setOrdersPage(1);
                    }}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', backgroundColor: 'white' }}
                  >
                    <option value="Semua">Semua Pembayaran</option>
                    <option value="Cash">Cash</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '18px' }}>
                  {filteredOrders.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1180px', backgroundColor: 'white' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Order</th>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meja</th>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detail Transaksi</th>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Waktu</th>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pembayaran</th>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aksi</th>
                          <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map(order => {
                          const statusColor = getOrderStatusColor(order.status);
                          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                          const itemSummary = order.items.map(item => {
                            const menu = menus.find(entry => entry.id === item.menuId);
                            const variantSummary = (item.selectedVariants || []).map(variant => variant.optionName).join(', ');
                            return `${item.quantity}x ${menu?.name || item.menuId}${variantSummary ? ` (${variantSummary})` : ''}`;
                          }).join(' • ');
                          return (
                            <tr key={order.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800, margin: 0 }}>{order.id}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>{itemCount} item • Token transaksi tersimpan</p>
                              </td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <p style={{ fontSize: '13px', color: '#334155', fontWeight: 700, margin: 0 }}>{getTableLabel(order.tableId)}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>Table ID: {order.tableId}</p>
                              </td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top', minWidth: '280px' }}>
                                <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, margin: 0 }}>{itemSummary || 'Tidak ada rincian item'}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                                  {order.items.length} baris menu • {(order.items.some(item => (item.selectedVariants || []).length > 0)) ? 'Terdapat varian tambahan' : 'Tanpa varian tambahan'}
                                </p>
                              </td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, margin: 0 }}>{formatOrderDate(order.createdAt)}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                                  {order.completedAt ? `Selesai: ${formatOrderDate(order.completedAt)}` : 'Belum ada waktu selesai'}
                                </p>
                              </td>
                              <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, margin: 0 }}>{order.paymentMethod || 'Cash'}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                                  {order.paymentMethod === 'QRIS' ? 'Pembayaran digital / scan QR' : 'Pembayaran tunai di kasir'}
                                </p>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ display: 'inline-flex', fontSize: '11px', fontWeight: 800, padding: '6px 10px', borderRadius: '999px', backgroundColor: statusColor.bg, color: statusColor.text }}>
                                  {order.status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <select
                                    value={orderStatusDrafts[order.id] || order.status}
                                    onChange={(e) => setOrderStatusDrafts(prev => ({ ...prev, [order.id]: e.target.value as Order['status'] }))}
                                    style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '12px', color: '#0f172a', outline: 'none' }}
                                  >
                                    <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                                    <option value="Lunas/Diproses">Lunas/Diproses</option>
                                    <option value="Selesai">Selesai</option>
                                    <option value="Batal">Batal</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => void handleAdminOrderStatusChange(order.id)}
                                    disabled={(orderStatusDrafts[order.id] || order.status) === order.status}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: '10px',
                                      border: 'none',
                                      backgroundColor: (orderStatusDrafts[order.id] || order.status) === order.status ? '#e2e8f0' : '#0f172a',
                                      color: (orderStatusDrafts[order.id] || order.status) === order.status ? '#94a3b8' : 'white',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: (orderStatusDrafts[order.id] || order.status) === order.status ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteOrder(order.id)}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: '10px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fef2f2',
                                      color: '#dc2626',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                    }}
                                  >
                                    <Trash2 size={14} />
                                    Hapus
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'top' }}>
                                <p style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800, margin: 0 }}>Rp {formatRupiah(order.totalAmount)}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>
                                  Rata-rata item: Rp {formatRupiah(itemCount > 0 ? order.totalAmount / itemCount : order.totalAmount)}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                      Tidak ada transaksi yang cocok dengan filter saat ini.
                    </div>
                  )}
                </div>

                {filteredOrders.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                      Menampilkan {((currentOrdersPage - 1) * ordersPerPage) + 1}-{Math.min(currentOrdersPage * ordersPerPage, filteredOrders.length)} dari {filteredOrders.length} orders
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                        disabled={currentOrdersPage === 1}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: currentOrdersPage === 1 ? '#f8fafc' : 'white', color: currentOrdersPage === 1 ? '#94a3b8' : '#0f172a', fontWeight: 700, cursor: currentOrdersPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        Sebelumnya
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        Halaman {currentOrdersPage} / {totalOrderPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrdersPage(prev => Math.min(totalOrderPages, prev + 1))}
                        disabled={currentOrdersPage === totalOrderPages}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: currentOrdersPage === totalOrderPages ? '#f8fafc' : 'white', color: currentOrdersPage === totalOrderPages ? '#94a3b8' : '#0f172a', fontWeight: 700, cursor: currentOrdersPage === totalOrderPages ? 'not-allowed' : 'pointer' }}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Nav */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '448px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0 20px', borderTop: '1px solid #e5e7eb', zIndex: 50 }}>
          <div onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <Home size={22} color={activeTab === 'dashboard' ? '#ea580c' : '#94a3b8'} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: activeTab === 'dashboard' ? '#ea580c' : '#94a3b8' }}>DASHBOARD</span>
          </div>
          <div onClick={() => setActiveTab('menu')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <FileText size={22} color={activeTab === 'menu' ? '#ea580c' : '#94a3b8'} strokeWidth={activeTab === 'menu' ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: activeTab === 'menu' ? '#ea580c' : '#94a3b8' }}>MENU</span>
          </div>
          <div onClick={() => setActiveTab('table')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <QrCode size={22} color={activeTab === 'table' ? '#ea580c' : '#94a3b8'} strokeWidth={activeTab === 'table' ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: activeTab === 'table' ? '#ea580c' : '#94a3b8' }}>MEJA</span>
          </div>
          <div onClick={() => setActiveTab('laporan')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <History size={22} color={activeTab === 'laporan' ? '#ea580c' : '#94a3b8'} strokeWidth={activeTab === 'laporan' ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: activeTab === 'laporan' ? '#ea580c' : '#94a3b8' }}>RIWAYAT</span>
          </div>
          <div onClick={() => setActiveTab('account')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <KeyRound size={22} color={activeTab === 'account' ? '#ea580c' : '#94a3b8'} strokeWidth={activeTab === 'account' ? 2.5 : 2} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: activeTab === 'account' ? '#ea580c' : '#94a3b8' }}>ACCOUNT</span>
          </div>
        </div>

        {/* Modals Menu & Config */}
        {isMenuModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', maxHeight: '90vh', overflow: 'auto' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Nama Menu</label>
                   <input required name="name" defaultValue={editingMenu?.name} placeholder="Sebutkan namaya..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Harga Dasar (Rp)</label>
                   <input required name="price" type="number" defaultValue={editingMenu?.price} placeholder="Misal: 15000" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Kategori</label>
                   <select name="category" defaultValue={editingMenu?.category || menuCategories[0] || 'Minuman'} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', outline: 'none', fontSize: '14px' }}>
                      {menuCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                   </select>
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>Deskripsi Produk</label>
                   <textarea name="description" defaultValue={editingMenu?.description} placeholder="Jelaskan rasanya agar pembeli tertarik..." rows={3} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', resize: 'none' }}></textarea>
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>URL Gambar Lengkap</label>
                   <input name="image" type="url" defaultValue={editingMenu?.image} placeholder="https://unsplash.com/..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                   <input type="checkbox" name="available" id="m-available" defaultChecked={editingMenu ? editingMenu.available : true} />
                   <label htmlFor="m-available" style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>Stok Tersedia di Kasir</label>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                   <button type="button" onClick={() => setIsMenuModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                   <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#ea580c', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Simpan Menu</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isSheetModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Konfigurasi QRIS</h2>
                 <QrCode size={24} color="#ea580c" />
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>Semua pengaturan ini disimpan di Firestore, bukan Realtime Database.</p>
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>URL Google Apps Script</label>
                    <input type="url" value={sheetAppUrl} onChange={e => setSheetAppUrl(e.target.value)} placeholder="https://script.google.com/macros/..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }} />
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4 }}>Dipakai saat order yang sudah lunas dikirim otomatis dari Firestore ke Google Sheet.</p>
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>URL Publish Google Sheet</label>
                    <input type="url" value={sheetPubUrl} onChange={e => setSheetPubUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/..." style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }} />
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4 }}>Opsional, untuk link publik spreadsheet jika ingin dibaca dari dashboard lain.</p>
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Payload / String QRIS</label>
                    <textarea value={qrisPayloadInput} onChange={e => setQrisPayloadInput(e.target.value)} placeholder="Masukkan string payload QRIS dari penyedia pembayaran..." rows={5} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4 }}>Tempel payload QRIS asli. Sistem akan membuat kode QR secara otomatis untuk buyer.</p>
                 </div>
                 {qrisPayloadInput && (
                    <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
                       <p style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>Pratinjau QRIS:</p>
                       <div style={{ width: '140px', height: '140px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '12px' }}>
                         <QRCodeSVG value={qrisPayloadInput} size={120} />
                       </div>
                    </div>
                 )}
                 <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                   <button type="button" onClick={() => setIsSheetModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                   <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#0f172a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Gunakan QRIS Ini</button>
                 </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Meja */}
        {tableToDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '300px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', textAlign: 'center' }}>
               <Trash2 size={40} color="#ef4444" style={{ margin: '0 auto 16px' }} />
               <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Hapus Meja {tableToDelete.number}?</h3>
               <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Data QR Code meja ini akan terhapus permanen dari sistem.</p>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setTableToDelete(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                  <button onClick={executeDeleteTable} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Ya, Hapus</button>
               </div>
            </div>
          </div>
        )}

      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
