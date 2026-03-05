import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, get } from 'firebase/database';

export type MenuCategory = 'Makanan' | 'Minuman' | 'Snack';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  image?: string;
  available: boolean;
}

export type TableStatus = 'Tersedia' | 'Aktif/Unpaid';

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
}

export type OrderStatus = 'Menunggu Pembayaran' | 'Lunas/Diproses' | 'Selesai' | 'Batal';
export type PaymentMethod = 'Cash' | 'QRIS';

export interface OrderItem {
  menuId: string;
  quantity: number;
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
}

// Initial Data
const initialMenus: MenuItem[] = [
  // Indomie Variations
  { id: 'm1', name: 'Indomie Polos', price: 8000, category: 'Makanan', available: true, image: 'https://images.unsplash.com/photo-1612929633738-8fe01f7c8166?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm2', name: 'Telur (Tambahan)', price: 3000, category: 'Makanan', available: true, image: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm3', name: 'Kornet (Tambahan)', price: 3000, category: 'Makanan', available: true, image: 'https://images.unsplash.com/photo-1628268909376-e8c56cc8d197?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm4', name: 'Keju (Tambahan)', price: 2000, category: 'Makanan', available: true, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&q=80&w=200&h=200' },

  // General Foods
  { id: 'm5', name: 'Kentang Goreng', price: 10000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm6', name: 'Rujak Cireng', price: 15000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm7', name: 'Mix Platter', price: 15000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm8', name: 'Cireng Isi / 5pcs', price: 10000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1626082928842-8c886e58f0cf?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm9', name: 'Pisang Bakar', price: 10000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1662973902347-1af609c1ee94?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm10', name: 'Ketan Susu', price: 10000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm11', name: 'Roti Bakar', price: 10000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80&w=200&h=200' },

  // Pancong Lumer & Variants
  { id: 'm12', name: 'Pancong Lumer', price: 10000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200&h=200' }
];

const initialTables: Table[] = Array.from({ length: 5 }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  status: 'Tersedia'
}));

// Local Storage Keys
const KEYS = {
  MENUS: 'warkop_menus',
  TABLES: 'warkop_tables',
  ORDERS: 'warkop_orders',
  SHEET_APP_URL: 'warkop_sheet_app_url',
  SHEET_PUB_URL: 'warkop_sheet_pub_url'
};

// 🔥 KONFIGURASI DATABASE ONLINE (FIREBASE REALTIME DATABASE) 🔥
// Jika Anda mengisi variabel ini, web aplikasi Anda akan berubah otomatis menjadi aplikasi Live yang saling tersinkronisasi antar perangkat.
const FIREBASE_CONFIG = {
  apiKey: "", // misal: "AIzaSycxxxxxxxxxxxxxx"
  authDomain: "", // misal: "warkop-app.firebaseapp.com"
  databaseURL: "", // misal: "https://warkop-app-default-rtdb.asia-southeast1.firebasedatabase.app"
  projectId: "", 
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const isFirebaseActive = FIREBASE_CONFIG.apiKey.length > 5;
let db: any = null;

if (isFirebaseActive) {
  try {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    
    // Seed Database awal jika masih kosong
    get(ref(db, 'warkopData')).then(snap => {
      if (!snap.exists()) {
        set(ref(db, 'warkopData'), {
          menus: loadData(KEYS.MENUS, initialMenus),
          tables: loadData(KEYS.TABLES, initialTables),
          orders: loadData(KEYS.ORDERS, [])
        });
      }
    });

    // Listener Realtime: Jika ada order/edit dari HP Pembeli atau HP Kasir lain, layarnya otomatis update
    onValue(ref(db, 'warkopData'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.menus) localStorage.setItem(KEYS.MENUS, JSON.stringify(data.menus));
        if (data.tables) localStorage.setItem(KEYS.TABLES, JSON.stringify(data.tables));
        if (data.orders) localStorage.setItem(KEYS.ORDERS, JSON.stringify(data.orders));
        notifyDataUpdate(); // Panggil fungsi re-render di semua tab
      }
    });
  } catch (err) {
    console.error("Gagal terhubung ke Firebase:", err);
  }
}

export const loadData = <T>(key: string, initial: T): T => {
  const data = localStorage.getItem(key);
  if (data) return JSON.parse(data);
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
};

export const saveData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
  notifyDataUpdate(); // Tetap update lokal
  
  // Sinkronisasi ke Cloud secara asinkron otomatis!
  if (isFirebaseActive && db) {
    const nodeName = key === KEYS.MENUS ? 'menus' : key === KEYS.TABLES ? 'tables' : key === KEYS.ORDERS ? 'orders' : null;
    if (nodeName) {
      set(ref(db, `warkopData/${nodeName}`), data);
    }
  }
};

export const initializeData = () => {
  if (!localStorage.getItem(KEYS.MENUS)) saveData(KEYS.MENUS, initialMenus);
  if (!localStorage.getItem(KEYS.TABLES)) saveData(KEYS.TABLES, initialTables);
  if (!localStorage.getItem(KEYS.ORDERS)) saveData(KEYS.ORDERS, []);
};

export const getMenus = (): MenuItem[] => loadData(KEYS.MENUS, initialMenus);
export const saveMenus = (menus: MenuItem[]) => saveData(KEYS.MENUS, menus);

export const getTables = (): Table[] => loadData(KEYS.TABLES, initialTables);
export const saveTables = (tables: Table[]) => saveData(KEYS.TABLES, tables);

export const getOrders = (): Order[] => loadData(KEYS.ORDERS, []);
export const saveOrders = (orders: Order[]) => saveData(KEYS.ORDERS, orders);

export const getSheetAppUrl = (): string => loadData(KEYS.SHEET_APP_URL, '');
export const saveSheetAppUrl = (url: string) => saveData(KEYS.SHEET_APP_URL, url);

export const getSheetPubUrl = (): string => loadData(KEYS.SHEET_PUB_URL, '');
export const saveSheetPubUrl = (url: string) => saveData(KEYS.SHEET_PUB_URL, url);

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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Error syncing to google sheet:', error);
  }
};

export const updateTableStatus = (tableId: string, status: TableStatus) => {
  const tables = getTables();
  const updated = tables.map(t => t.id === tableId ? { ...t, status } : t);
  saveTables(updated);
};

export const generateOrderId = (tableNumber: number) => {
  const orders = getOrders();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const count = orders.filter(o => o.id.includes(today)).length + 1;
  return `TRX-M${tableNumber}-${today}-${count.toString().padStart(3, '0')}`;
};

export const getDailyToken = () => {
  const dateStr = new Date().toISOString().split('T')[0];
  // Simple deterministic token based on date
  return btoa(`WarkopSalt_${dateStr}`).substring(0, 10);
};

export const submitOrder = (tableId: string, items: {menuId: string, quantity: number}[], paymentMethod: PaymentMethod, reqToken: string) => {
  // B. Token Dinamis Harian Check
  if (reqToken !== getDailyToken()) {
    throw new Error("Token tidak valid atau kadaluarsa. Silakan scan QR ulang.");
  }
  
  const tables = getTables();
  const tableIndex = tables.findIndex(t => t.id === tableId);
  if (tableIndex === -1) throw new Error("Meja tidak ditemukan.");
  const table = tables[tableIndex];
  
  // C. Bentrokan Pesanan & B. Batasan Spamming
  if (table.status !== 'Tersedia') {
    throw new Error("Meja ini sedang digunakan atau memiliki pesanan yang belum dibayar.");
  }

  const menus = getMenus();
  
  // A. Manipulasi Harga (Parameter Tampering) Check
  let validSubtotal = 0;
  const validatedItems: OrderItem[] = [];
  
  for (const item of items) {
    const menu = menus.find(m => m.id === item.menuId);
    if (!menu) throw new Error(`Menu item tidak valid.`);
    if (item.quantity <= 0) throw new Error("Kuantitas tidak valid.");
    
    validSubtotal += (menu.price * item.quantity);
    validatedItems.push({
      menuId: menu.id,
      quantity: item.quantity
    });
  }
  
  const taxAmount = validSubtotal * 0.1;
  const grandTotal = validSubtotal + taxAmount;
  
  // Transaction: Create Order & Lock Table Atomically
  const orderId = generateOrderId(table.number);
  const newOrder: Order = {
    id: orderId,
    tableId: table.id,
    items: validatedItems,
    totalAmount: grandTotal,
    status: 'Menunggu Pembayaran',
    paymentMethod,
    createdAt: new Date().toISOString()
  };
  
  const orders = getOrders();
  orders.push(newOrder);
  saveOrders(orders);
  
  tables[tableIndex].status = 'Aktif/Unpaid';
  saveTables(tables);
  
  return { orderId, grandTotal };
};

export const listenToDataChanges = (callback: () => void) => {
  window.addEventListener('storage', callback);
  // Custom event for cross-component in same window
  window.addEventListener('warkop-data-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('warkop-data-updated', callback);
  };
};

export const notifyDataUpdate = () => {
  window.dispatchEvent(new Event('warkop-data-updated'));
};
