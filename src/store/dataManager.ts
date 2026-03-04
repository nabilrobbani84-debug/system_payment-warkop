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
  { id: 'm1', name: 'Kopi Hitam', price: 10000, category: 'Minuman', available: true, image: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm2', name: 'Kopi Susu Gula Aren', price: 15000, category: 'Minuman', available: true, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm3', name: 'Ayam Bakar Cabe Ijo', price: 25000, category: 'Makanan', available: true, image: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm4', name: 'Indomie Goreng Telur', price: 14000, category: 'Makanan', available: true, image: 'https://images.unsplash.com/photo-1612929633738-8fe01f7c8166?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm5', name: 'Kentang Goreng', price: 12000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'm6', name: 'Pisang Bakar Coklat Keju', price: 15000, category: 'Snack', available: true, image: 'https://images.unsplash.com/photo-1662973902347-1af609c1ee94?auto=format&fit=crop&q=80&w=200&h=200' }
];

const initialTables: Table[] = Array.from({ length: 6 }, (_, i) => ({
  id: `t${i + 1}`,
  number: i + 1,
  status: 'Tersedia'
}));

// Local Storage Keys
const KEYS = {
  MENUS: 'warkop_menus',
  TABLES: 'warkop_tables',
  ORDERS: 'warkop_orders'
};

export const loadData = <T>(key: string, initial: T): T => {
  const data = localStorage.getItem(key);
  if (data) return JSON.parse(data);
  saveData(key, initial);
  return initial;
};

export const saveData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
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
