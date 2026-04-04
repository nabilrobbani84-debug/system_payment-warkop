import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';

// ==================== TYPES ====================
export type MenuCategory = string;

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  image?: string;
  available: boolean;
  description?: string;
}

export interface VariantOption {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

export interface VariantGroup {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  appliesToCategories: MenuCategory[];
  options: VariantOption[];
}

export type TableStatus = 'Tersedia' | 'Aktif/Unpaid';

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  capacity?: number;
}

export type OrderStatus = 'Menunggu Pembayaran' | 'Lunas/Diproses' | 'Selesai' | 'Batal';
export type PaymentMethod = 'Cash' | 'QRIS';

export interface OrderItem {
  menuId: string;
  quantity: number;
  selectedVariants?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  }>;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  kasirNote?: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  destination: string;
  destinationType: 'DANA' | 'GoPay' | 'OVO' | 'ShopeePay' | 'BRI' | 'BCA' | 'Mandiri' | 'Lainnya';
  timestamp: string;
  adminName: string;
  description?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface TaxSettings {
  enabled: boolean;
  rate: number;
  applyToQris: boolean;
}

export interface SecuritySettings {
  adminAllowlistEnabled: boolean;
  adminAllowlist: string[];
  cashierPinEnabled: boolean;
  cashierPin: string;
}

// ==================== INITIAL DATA ====================
const initialMenus: MenuItem[] = [
  { id: 'm1', name: 'Indomie Polos', price: 8000, category: 'Makanan', available: true, description: 'Indomie polos hangat yang pas untuk teman nongkrong santai.', image: 'https://images.unsplash.com/photo-1612929633738-8fe01f7c8166?auto=format&fit=crop&q=80&w=400' },
  { id: 'm2', name: 'Indomie + Telur', price: 11000, category: 'Makanan', available: true, description: 'Indomie favorit dengan tambahan telur untuk rasa yang lebih mantap.', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400' },
  { id: 'm3', name: 'Kentang Goreng', price: 10000, category: 'Makanan', available: true, description: 'Kentang goreng renyah dengan porsi pas untuk camilan bersama.', image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=400' },
  { id: 'm4', name: 'Cireng Isi (5 pcs)', price: 10000, category: 'Makanan', available: true, description: 'Cireng isi gurih dengan tekstur kenyal dan renyah di luar.', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=400' },
  { id: 'm5', name: 'Mix Platter', price: 15000, category: 'Makanan', available: true, description: 'Paket aneka gorengan dan snack untuk dinikmati rame-rame.', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&q=80&w=400' },
  { id: 'm6', name: 'Pisang Bakar', price: 10000, category: 'Makanan', available: true, description: 'Pisang bakar manis hangat dengan aroma panggangan yang khas.', image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=400' },
  { id: 'm7', name: 'Roti Bakar', price: 10000, category: 'Makanan', available: true, description: 'Roti bakar lembut yang cocok untuk teman kopi atau teh.', image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=400' },
  { id: 'm8', name: 'Sosis/Otak-otak (SCONG)', price: 10000, category: 'Makanan', available: true, description: 'Pilihan sosis atau otak-otak gurih untuk camilan cepat saji.', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=400' },
  { id: 'm13', name: 'Es Kopi Gula Aren', price: 15000, category: 'Minuman', available: true, description: 'Double shot espresso dengan susu segar dan gula aren organik.', image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400' },
  { id: 'm14', name: 'Caramel Macchiato', price: 18000, category: 'Minuman', available: true, description: 'Susu steam halus dengan vanilla syrup dan saus caramel.', image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&q=80&w=400' },
  { id: 'm15', name: 'Teh Tarik Klasik', price: 10000, category: 'Minuman', available: true, description: 'Teh melati pilihan ditarik hingga berbusa melimpah.', image: 'https://images.unsplash.com/photo-1544787210-2211d7c3497b?auto=format&fit=crop&q=80&w=400' },
];

const initialTables: Table[] = Array.from({ length: 8 }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  status: 'Tersedia',
  capacity: 4
}));

// ==================== FIREBASE INIT ====================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCBFNWa0ldE9R40UcHVVhYodlTUurXCnkw",
  authDomain: "cloud-computing-22552.firebaseapp.com",
  projectId: "cloud-computing-22552", // REQUIRED for Firestore
  storageBucket: "cloud-computing-22552.firebasestorage.app",
  messagingSenderId: "1077252898399",
  appId: "1:1077252898399:web:1f3b54b389e5e52f6d65ea"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

// ==================== IN-MEMORY STATE ====================
// We maintain an in-memory cache synchronized with Firestore 
// so the rest of the application can use synchronous getter APIs.
interface GlobalState {
  menus: MenuItem[];
  menuCategories: MenuCategory[];
  variantGroups: VariantGroup[];
  tables: Table[];
  orders: Order[];
  sheetAppUrl: string;
  sheetPubUrl: string;
  qrisPayload: string;
  taxSettings: TaxSettings;
  securitySettings: SecuritySettings;
  qrisWithdrawnDaily: Record<string, number>;
  withdrawalHistory: WithdrawalRecord[];
}

const defaultTaxSettings: TaxSettings = {
  enabled: true,
  rate: 10,
  applyToQris: false,
};

const defaultSecuritySettings: SecuritySettings = {
  adminAllowlistEnabled: false,
  adminAllowlist: [],
  cashierPinEnabled: false,
  cashierPin: '1234',
};

const state: GlobalState = {
  menus: [...initialMenus],
  menuCategories: ['Makanan', 'Minuman', 'Snack'],
  variantGroups: [],
  tables: [...initialTables],
  orders: [],
  sheetAppUrl: '',
  sheetPubUrl: '',
  qrisPayload: '',
  taxSettings: defaultTaxSettings,
  securitySettings: defaultSecuritySettings,
  qrisWithdrawnDaily: {},
  withdrawalHistory: [],
};

// ==================== EVENT NOTIFIER ====================
export const notifyDataUpdate = () => {
  window.dispatchEvent(new Event('warkop-data-updated'));
};

type FirestoreDocName = 'menus' | 'tables' | 'orders' | 'publicSettings' | 'privateSettings' | 'withdrawals';

const docRef = (docName: FirestoreDocName) => doc(db, 'warkopDB', docName);
const writeQueue = new Map<FirestoreDocName, Promise<void>>();
let firestoreListenersInitialized = false;
let initializePromise: Promise<void> | null = null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const getString = (value: unknown, fallback = '') => isString(value) ? value : fallback;
const getRecord = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<Record<string, number>>((acc, [key, rawValue]) => {
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      acc[key] = rawValue;
    }
    return acc;
  }, {});
};

const syncToFirestore = (docName: FirestoreDocName, data: Record<string, unknown>) => {
  const previousWrite = writeQueue.get(docName) || Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      await setDoc(docRef(docName), data, { merge: true });
    })
    .catch(err => {
      console.error(`Firebase Firestore save error (${docName}):`, err);
      throw err;
    });

  writeQueue.set(docName, nextWrite);
  return nextWrite;
};

// ==================== FIRESTORE LISTENERS ====================
const setupFirestoreListeners = () => {
  if (firestoreListenersInitialized) return;
  firestoreListenersInitialized = true;

  const listeners: Array<{ docName: FirestoreDocName; apply: (data: Record<string, unknown>) => void }> = [
    {
      docName: 'menus',
      apply: (data) => {
        state.menus = Array.isArray(data.list) ? data.list as MenuItem[] : [];
      }
    },
    {
      docName: 'tables',
      apply: (data) => {
        state.tables = Array.isArray(data.list) ? data.list as Table[] : [];
      }
    },
    {
      docName: 'orders',
      apply: (data) => {
        state.orders = Array.isArray(data.list) ? data.list as Order[] : [];
      }
    },
    {
      docName: 'publicSettings',
      apply: (data) => {
        state.qrisPayload = getString(data.qrisPayload) || getString(data.qrisImageUrl);
        state.menuCategories = Array.isArray(data.menuCategories)
          ? data.menuCategories.filter(isString)
          : ['Makanan', 'Minuman', 'Snack'];
        state.variantGroups = Array.isArray(data.variantGroups)
          ? data.variantGroups as VariantGroup[]
          : [];
      }
    },
    {
      docName: 'privateSettings',
      apply: (data) => {
        state.sheetAppUrl = getString(data.sheetAppUrl);
        state.sheetPubUrl = getString(data.sheetPubUrl);
        state.taxSettings = {
          enabled: typeof data.taxEnabled === 'boolean' ? data.taxEnabled : defaultTaxSettings.enabled,
          rate: typeof data.taxRate === 'number' && Number.isFinite(data.taxRate) ? data.taxRate : defaultTaxSettings.rate,
          applyToQris: typeof data.taxApplyToQris === 'boolean' ? data.taxApplyToQris : defaultTaxSettings.applyToQris,
        };
        state.securitySettings = {
          adminAllowlistEnabled: typeof data.adminAllowlistEnabled === 'boolean' ? data.adminAllowlistEnabled : defaultSecuritySettings.adminAllowlistEnabled,
          adminAllowlist: Array.isArray(data.adminAllowlist) ? data.adminAllowlist.filter(isString) : defaultSecuritySettings.adminAllowlist,
          cashierPinEnabled: typeof data.cashierPinEnabled === 'boolean' ? data.cashierPinEnabled : defaultSecuritySettings.cashierPinEnabled,
          cashierPin: getString(data.cashierPin, defaultSecuritySettings.cashierPin),
        };
      }
    },
    {
      docName: 'withdrawals',
      apply: (data) => {
        state.withdrawalHistory = Array.isArray(data.history) ? data.history as WithdrawalRecord[] : [];
        state.qrisWithdrawnDaily = getRecord(data.daily);
      }
    }
  ];

  listeners.map(({ docName, apply }) =>
    onSnapshot(docRef(docName), (snapshot) => {
      if (!snapshot.exists()) return;
      apply(snapshot.data());
      notifyDataUpdate();
    }, (error) => {
      console.error(`Firebase Firestore listener error (${docName}):`, error);
    })
  );
};

// Start listeners immediately
setupFirestoreListeners();

export const initializeData = async () => {
  if (initializePromise) return initializePromise;

  initializePromise = (async () => {
    const docs: Array<{ docName: FirestoreDocName; seed: Record<string, unknown> }> = [
      { docName: 'menus', seed: { list: initialMenus } },
      { docName: 'tables', seed: { list: initialTables } },
      { docName: 'orders', seed: { list: [] } },
      { docName: 'publicSettings', seed: { qrisPayload: '', menuCategories: ['Makanan', 'Minuman', 'Snack'], variantGroups: [] } },
      {
        docName: 'privateSettings',
        seed: {
          sheetAppUrl: '',
          sheetPubUrl: '',
          taxEnabled: defaultTaxSettings.enabled,
          taxRate: defaultTaxSettings.rate,
          taxApplyToQris: defaultTaxSettings.applyToQris,
          adminAllowlistEnabled: defaultSecuritySettings.adminAllowlistEnabled,
          adminAllowlist: defaultSecuritySettings.adminAllowlist,
          cashierPinEnabled: defaultSecuritySettings.cashierPinEnabled,
          cashierPin: defaultSecuritySettings.cashierPin,
        }
      },
      { docName: 'withdrawals', seed: { history: [], daily: {} } },
    ];

    const snapshots = await Promise.all(
      docs.map(async ({ docName }) => ({
        docName,
        snapshot: await getDoc(docRef(docName)),
      }))
    );

    await Promise.all(
      snapshots.map(({ docName, snapshot }) => {
        const config = docs.find(item => item.docName === docName);
        if (!config || snapshot.exists()) return Promise.resolve();
        return syncToFirestore(docName, config.seed);
      })
    );
  })();

  return initializePromise;
};


// ==================== CORE ACCESSORS ====================
export const getMenus = (): MenuItem[] => state.menus;
export const saveMenus = (menus: MenuItem[]) => {
  state.menus = menus;
  syncToFirestore('menus', { list: menus });
  notifyDataUpdate();
};

export const getTables = (): Table[] => state.tables;
export const saveTables = (tables: Table[]) => {
  state.tables = tables;
  syncToFirestore('tables', { list: tables });
  notifyDataUpdate();
};

export const getOrders = (): Order[] => state.orders;
export const saveOrders = (orders: Order[]) => {
  state.orders = orders;
  syncToFirestore('orders', { list: orders });
  notifyDataUpdate();
};

export const getSheetAppUrl = (): string => state.sheetAppUrl;
export const saveSheetAppUrl = (url: string) => {
  state.sheetAppUrl = url;
  syncToFirestore('privateSettings', {
    sheetAppUrl: url,
    sheetPubUrl: state.sheetPubUrl,
    taxEnabled: state.taxSettings.enabled,
    taxRate: state.taxSettings.rate,
    taxApplyToQris: state.taxSettings.applyToQris,
    adminAllowlistEnabled: state.securitySettings.adminAllowlistEnabled,
    adminAllowlist: state.securitySettings.adminAllowlist,
    cashierPinEnabled: state.securitySettings.cashierPinEnabled,
    cashierPin: state.securitySettings.cashierPin,
  });
  notifyDataUpdate();
};

export const getSheetPubUrl = (): string => state.sheetPubUrl;
export const saveSheetPubUrl = (url: string) => {
  state.sheetPubUrl = url;
  syncToFirestore('privateSettings', {
    sheetAppUrl: state.sheetAppUrl,
    sheetPubUrl: url,
    taxEnabled: state.taxSettings.enabled,
    taxRate: state.taxSettings.rate,
    taxApplyToQris: state.taxSettings.applyToQris,
    adminAllowlistEnabled: state.securitySettings.adminAllowlistEnabled,
    adminAllowlist: state.securitySettings.adminAllowlist,
    cashierPinEnabled: state.securitySettings.cashierPinEnabled,
    cashierPin: state.securitySettings.cashierPin,
  });
  notifyDataUpdate();
};

export const getQrisPayload = (): string => state.qrisPayload;
export const saveQrisPayload = (payload: string) => {
  state.qrisPayload = payload;
  syncToFirestore('publicSettings', { qrisPayload: payload, menuCategories: state.menuCategories, variantGroups: state.variantGroups });
  notifyDataUpdate();
};

export const getMenuCategories = (): MenuCategory[] => state.menuCategories;
export const saveMenuCategories = (categories: MenuCategory[]) => {
  const normalized = Array.from(new Set(categories.map(item => item.trim()).filter(Boolean)));
  state.menuCategories = normalized.length > 0 ? normalized : ['Makanan', 'Minuman', 'Snack'];
  syncToFirestore('publicSettings', { qrisPayload: state.qrisPayload, menuCategories: state.menuCategories, variantGroups: state.variantGroups });
  notifyDataUpdate();
};

export const getVariantGroups = (): VariantGroup[] => state.variantGroups;
export const saveVariantGroups = (groups: VariantGroup[]) => {
  state.variantGroups = groups;
  syncToFirestore('publicSettings', { qrisPayload: state.qrisPayload, menuCategories: state.menuCategories, variantGroups: state.variantGroups });
  notifyDataUpdate();
};

export const getTaxSettings = (): TaxSettings => state.taxSettings;
export const saveTaxSettings = (settings: TaxSettings) => {
  state.taxSettings = {
    enabled: settings.enabled,
    rate: Number.isFinite(settings.rate) ? Math.max(0, settings.rate) : defaultTaxSettings.rate,
    applyToQris: settings.applyToQris,
  };
  syncToFirestore('privateSettings', {
    sheetAppUrl: state.sheetAppUrl,
    sheetPubUrl: state.sheetPubUrl,
    taxEnabled: state.taxSettings.enabled,
    taxRate: state.taxSettings.rate,
    taxApplyToQris: state.taxSettings.applyToQris,
    adminAllowlistEnabled: state.securitySettings.adminAllowlistEnabled,
    adminAllowlist: state.securitySettings.adminAllowlist,
    cashierPinEnabled: state.securitySettings.cashierPinEnabled,
    cashierPin: state.securitySettings.cashierPin,
  });
  notifyDataUpdate();
};

export const getSecuritySettings = (): SecuritySettings => state.securitySettings;
export const saveSecuritySettings = (settings: SecuritySettings) => {
  state.securitySettings = {
    adminAllowlistEnabled: settings.adminAllowlistEnabled,
    adminAllowlist: settings.adminAllowlist.map(item => item.trim()).filter(Boolean),
    cashierPinEnabled: settings.cashierPinEnabled,
    cashierPin: settings.cashierPin.trim() || defaultSecuritySettings.cashierPin,
  };
  syncToFirestore('privateSettings', {
    sheetAppUrl: state.sheetAppUrl,
    sheetPubUrl: state.sheetPubUrl,
    taxEnabled: state.taxSettings.enabled,
    taxRate: state.taxSettings.rate,
    taxApplyToQris: state.taxSettings.applyToQris,
    adminAllowlistEnabled: state.securitySettings.adminAllowlistEnabled,
    adminAllowlist: state.securitySettings.adminAllowlist,
    cashierPinEnabled: state.securitySettings.cashierPinEnabled,
    cashierPin: state.securitySettings.cashierPin,
  });
  notifyDataUpdate();
};

// Backward-compatible aliases for older imports.
export const getQrisImageUrl = (): string => getQrisPayload();
export const saveQrisImageUrl = (url: string) => saveQrisPayload(url);

// ==================== WITHDRAWALS ====================
const getLocalDateStr = () => {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

export const addQrisWithdrawn = (amount: number) => {
  const today = getLocalDateStr();
  state.qrisWithdrawnDaily[today] = (state.qrisWithdrawnDaily[today] || 0) + amount;
  syncToFirestore('withdrawals', { history: state.withdrawalHistory, daily: state.qrisWithdrawnDaily });
  notifyDataUpdate();
};

export const getQrisWithdrawn = (): number => state.qrisWithdrawnDaily[getLocalDateStr()] || 0;
export const getTotalQrisWithdrawnAllTime = (): number => Object.values(state.qrisWithdrawnDaily).reduce((sum, v) => sum + v, 0);

export const getWithdrawalHistory = (): WithdrawalRecord[] => state.withdrawalHistory;
export const saveWithdrawalRecord = (record: WithdrawalRecord) => {
  state.withdrawalHistory.unshift(record);
  syncToFirestore('withdrawals', { history: state.withdrawalHistory, daily: state.qrisWithdrawnDaily });
  notifyDataUpdate();
};

// ==================== BESTSELLER ====================
export const getBestsellerMenuIds = (limit = 4): string[] => {
  const salesCount: Record<string, number> = {};
  state.orders.forEach(order => {
    if (order.status === 'Lunas/Diproses' || order.status === 'Selesai') {
      order.items.forEach(item => {
        salesCount[item.menuId] = (salesCount[item.menuId] || 0) + item.quantity;
      });
    }
  });

  return Object.keys(salesCount)
    .filter(id => salesCount[id] > 0)
    .sort((a, b) => salesCount[b] - salesCount[a])
    .slice(0, limit);
};

// ==================== ADMIN AUTH ====================
export const getAdmins = async (): Promise<AdminUser[]> => [];

type ErrorWithCode = Error & { code?: string };

const getErrorWithCode = (error: unknown): ErrorWithCode | null => {
  if (error instanceof Error) {
    return error as ErrorWithCode;
  }
  return null;
};

export const registerAdmin = async (email: string, password: string): Promise<string | null> => {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) return 'Format email tidak valid.';
  if (!password || password.length < 6) return 'Password minimal 6 karakter.';

  try {
    const cred = await createUserWithEmailAndPassword(auth, trimmed, password);
    void cred;
    return null;
  } catch (err: unknown) {
    const error = getErrorWithCode(err);
    if (error?.code === 'auth/email-already-in-use') return 'Email ini sudah terdaftar.';
    if (error?.code === 'auth/invalid-email') return 'Format email tidak valid.';
    if (error?.code === 'auth/configuration-not-found') return 'Gagal: Fitur Autentikasi belum diaktifkan di Firebase Console.';
    return error?.message || 'Terjadi kesalahan saat mendaftar akun.';
  }
};

export const loginAdmin = async (email: string, password: string): Promise<{user?: AdminUser, error?: string}> => {
  if (email === 'admin@warkop.com' && password === 'admin123') {
    if (state.securitySettings.adminAllowlistEnabled) {
      const normalizedEmail = email.trim().toLowerCase();
      const allowlist = state.securitySettings.adminAllowlist.map(item => item.toLowerCase());
      if (!allowlist.includes(normalizedEmail)) {
        return { error: 'Akses admin ditolak. Email ini belum masuk allowlist admin.' };
      }
    }
    return { user: { id: 'default', username: 'admin@warkop.com', passwordHash: '', createdAt: '' } };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const normalizedEmail = (cred.user.email || email).trim().toLowerCase();
    if (state.securitySettings.adminAllowlistEnabled) {
      const allowlist = state.securitySettings.adminAllowlist.map(item => item.toLowerCase());
      if (!allowlist.includes(normalizedEmail)) {
        await signOut(auth).catch(() => undefined);
        return { error: 'Akses admin ditolak. Email ini belum diizinkan masuk dashboard admin.' };
      }
    }
    const loggedInAdmin: AdminUser = {
      id: cred.user.uid,
      username: cred.user.email || 'Admin',
      passwordHash: 'firebase-auth',
      createdAt: cred.user.metadata.creationTime || new Date().toISOString(),
    };
    return { user: loggedInAdmin };
  } catch (err: unknown) {
    const error = getErrorWithCode(err);
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') return { error: 'Email atau password salah!' };
    if (error?.code === 'auth/configuration-not-found') return { error: 'Gagal: Fitur Autentikasi belum diaktifkan di Firebase Console.' };
    return { error: error?.message || 'Terjadi kesalahan saat login.' };
  }
};

export const loginWithGoogleAdmin = async (): Promise<{user?: AdminUser, error?: string}> => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const normalizedEmail = (user.email || '').trim().toLowerCase();

    if (state.securitySettings.adminAllowlistEnabled) {
      const allowlist = state.securitySettings.adminAllowlist.map(item => item.toLowerCase());
      if (!normalizedEmail || !allowlist.includes(normalizedEmail)) {
        await signOut(auth).catch(() => undefined);
        return { error: 'Akses admin ditolak. Akun Google ini belum masuk allowlist admin.' };
      }
    }

    const googleUser: AdminUser = {
      id: user.uid,
      username: user.email || user.displayName || 'GoogleUser',
      passwordHash: 'google-oauth',
      createdAt: user.metadata.creationTime || new Date().toISOString(),
    };

    return { user: googleUser };
  } catch (err: unknown) {
    const error = getErrorWithCode(err);
    if (error?.code === 'auth/configuration-not-found') return { error: 'Gagal login: Provider Google Sign-In belum diaktifkan.' };
    return { error: error?.message || 'Gagal login dengan Google.' };
  }
};

export const resetAdminPassword = async (email: string): Promise<string | null> => {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) return 'Format email tidak valid.';

  try {
    await sendPasswordResetEmail(auth, trimmed);
    return null;
  } catch (err: unknown) {
    const error = getErrorWithCode(err);
    if (error?.code === 'auth/user-not-found') return 'Akun (Email) tidak ditemukan.';
    return error?.message || 'Gagal mengirim email reset.';
  }
};

export const logoutAdmin = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Gagal logout Firebase:', err);
  }
};

export const verifyCashierPin = (pin: string): boolean => {
  if (!state.securitySettings.cashierPinEnabled) return true;
  return pin.trim() === state.securitySettings.cashierPin;
};

export const isCashierPinEnabled = (): boolean => state.securitySettings.cashierPinEnabled;

// ==================== OTHER LOGIC ====================
export const syncToGoogleSheet = async (order: Order) => {
  const url = getSheetAppUrl();
  if (!url) return;

  const payload = {
    orderId: order.id,
    tableId: order.tableId,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentMethod: order.paymentMethod || 'Cash',
    createdAt: order.createdAt,
    items: JSON.stringify(order.items)
  };

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Error syncing to google sheet:', error);
  }
};

export const updateTableStatus = (tableId: string, status: TableStatus) => {
  const updated = state.tables.map(t => t.id === tableId ? { ...t, status } : t);
  saveTables(updated);
};

export const generateOrderId = (tableNumber: number) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateCode = `${yy}${mm}${dd}`;
  const count = state.orders.filter(o => o.id.includes(dateCode)).length + 1;
  return `T${tableNumber}-${dateCode}-${count.toString().padStart(2, '0')}`;
};

export const getDailyToken = () => {
  const dateStr = new Date().toISOString().split('T')[0];
  return btoa(`WarkopSalt_${dateStr}`).substring(0, 10);
};

export const calculateOrderTax = (subtotal: number, paymentMethod: PaymentMethod) => {
  if (!state.taxSettings.enabled) return 0;
  if (paymentMethod === 'QRIS' && !state.taxSettings.applyToQris) return 0;
  return subtotal * (state.taxSettings.rate / 100);
};

export const formatRupiah = (amount: number) => {
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const submitOrder = (
  tableId: string,
  items: { menuId: string; quantity: number; selectedVariants?: OrderItem['selectedVariants'] }[],
  paymentMethod: PaymentMethod,
  reqToken: string,
  notes?: string
) => {
  if (reqToken !== getDailyToken()) throw new Error("Token tidak valid atau kadaluarsa. Silakan scan QR ulang.");

  const tableIndex = state.tables.findIndex(t => t.id === tableId);
  if (tableIndex === -1) throw new Error("Meja tidak ditemukan.");
  const table = state.tables[tableIndex];

  if (table.status !== 'Tersedia') throw new Error("Meja ini sedang digunakan atau memiliki pesanan yang belum dibayar.");

  let validSubtotal = 0;
  const validatedItems: OrderItem[] = [];

  for (const item of items) {
    const menu = state.menus.find(m => m.id === item.menuId);
    if (!menu) throw new Error(`Menu item tidak valid.`);
    if (item.quantity <= 0) throw new Error("Kuantitas tidak valid.");
    if (!menu.available) throw new Error(`Menu "${menu.name}" sedang tidak tersedia.`);
    const variantExtra = (item.selectedVariants || []).reduce((sum, variant) => sum + (variant.price || 0), 0);
    validSubtotal += (menu.price + variantExtra) * item.quantity;
    validatedItems.push({ menuId: menu.id, quantity: item.quantity, selectedVariants: item.selectedVariants || [] });
  }

  const taxAmount = calculateOrderTax(validSubtotal, paymentMethod);
  const grandTotal = validSubtotal + taxAmount;

  const orderId = generateOrderId(table.number);
  const newOrder: Order = {
    id: orderId,
    tableId: table.id,
    items: validatedItems,
    totalAmount: grandTotal,
    status: 'Menunggu Pembayaran',
    paymentMethod,
    createdAt: new Date().toISOString(),
    notes: notes || '',
  };

  const updatedOrders = [...state.orders, newOrder];
  saveOrders(updatedOrders);

  const updatedTables = [...state.tables];
  updatedTables[tableIndex].status = 'Aktif/Unpaid';
  saveTables(updatedTables);

  return { orderId, grandTotal };
};

export const listenToDataChanges = (callback: () => void) => {
  window.addEventListener('warkop-data-updated', callback);
  return () => {
    window.removeEventListener('warkop-data-updated', callback);
  };
};
