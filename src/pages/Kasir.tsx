import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getOrders,
  saveOrders,
  getTables,
  updateTableStatus,
  getMenus,
  type Order,
  type Table,
  type MenuItem,
  type OrderStatus,
  listenToDataChanges,
  notifyDataUpdate,
  formatRupiah,
  isCashierPinEnabled,
  verifyCashierPin,
} from '../store/dataManager';
import * as Lucide from 'lucide-react';
import { useFeedback } from '../components/feedback/useFeedback';

type KasirTab = 'sales' | 'orders' | 'menu' | 'history';

interface OrderDetailModal {
  order: Order;
  isOpen: boolean;
}

const CASHIER_SESSION_KEY = 'warkop_cashier_unlocked';

export default function Kasir() {
  const feedback = useFeedback();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => sessionStorage.getItem(CASHIER_SESSION_KEY) === 'true' || !isCashierPinEnabled());
  const [cashierPinInput, setCashierPinInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<KasirTab>('sales');

  const [orderDetailModal, setOrderDetailModal] = useState<OrderDetailModal | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter] = useState<'all' | 'Lunas/Diproses' | 'Selesai' | 'Batal'>('all');

  const NOTIFICATION_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjEwMC4xMDAAAAAAAAAAAAAAAAD/MUZAAAAGwAAAAAAA8AAAgAAAgAAAAEAA8AAAgAAAgAAAAC/8xRkAAAAHAAAAAAAAEAACABAACAAAAAAACABAACAAAAAAL/zFGQAAAAsAAAAAAAABAAAAEAAIAAAAAAAAAAQAACAAAAAAL/zFGQAAAAsAAAAAAAAEAACABAACAAAAAAACABAACAAAAAAL/zFGQAAAAsAAAAAAAAEAACABAACAAAAAAACABAACAAAAAAL/zFGQAAAAsAAAAAAAAEAACABAACAAAAAAACABAACAAAAAAL/zFGQAAAAsAAAAAAAAEAACABAACAAAAAAACABAACAAAAAA=="; 
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCountRef = useRef(0);

  const getTableNumber = (tableId: string) => {
    const t = tables.find(t => t.id === tableId);
    return t ? t.number.toString().padStart(2, '0') : '??';
  };

  const getElapsedTime = (isoString: string) => {
    const diffInMs = new Date().getTime() - new Date(isoString).getTime();
    const mins = Math.floor(diffInMs / 60000);
    return mins > 0 ? `${mins}m` : '<1m';
  };

  const loadData = useCallback(() => {
    const freshOrders = getOrders();
    setOrders(freshOrders);
    setTables(getTables());
    setMenus(getMenus());

    const activeWaitings = freshOrders.filter(o => o.status === 'Menunggu Pembayaran').length;
    if (activeWaitings > prevOrderCountRef.current && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }
    prevOrderCountRef.current = activeWaitings;
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    loadData();
    const cleanup = listenToDataChanges(loadData);
    return cleanup;
  }, [loadData]);

  const activeOrders = orders.filter(o => o.status === 'Menunggu Pembayaran').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const completedOrders = orders.filter(o => o.status === 'Lunas/Diproses' || o.status === 'Selesai' || o.status === 'Batal');

  const filteredHistory = completedOrders.filter(o => {
    const tableNum = getTableNumber(o.tableId);
    const matchSearch = o.id.toLowerCase().includes(historySearch.toLowerCase()) || tableNum.includes(historySearch);
    const matchFilter = historyFilter === 'all' || o.status === historyFilter;
    return matchSearch && matchFilter;
  });

  const handleConfirmOrder = async (order: Order) => {
    const confirmMsg = order.paymentMethod === 'QRIS'
      ? `✅ [QRIS] Pastikan dana sebesar Rp ${formatRupiah(order.totalAmount)} sudah masuk?\n\nLanjutkan konfirmasi lunas?`
      : `✅ [TUNAI] Terima uang tunai Rp ${formatRupiah(order.totalAmount)} dari pembeli?`;

    const shouldConfirm = await feedback.confirm({
      title: 'Konfirmasi pembayaran',
      description: confirmMsg,
      confirmLabel: 'Ya, lunas',
      cancelLabel: 'Belum',
    });
    if (!shouldConfirm) return;

    const ordersCopy = [...orders];
    const index = ordersCopy.findIndex(o => o.id === order.id);
    if (index > -1) {
      const updatedOrder = {
        ...ordersCopy[index],
        status: 'Lunas/Diproses' as OrderStatus,
        completedAt: new Date().toISOString()
      };
      ordersCopy[index] = updatedOrder;
      saveOrders(ordersCopy);
      import('../store/dataManager').then(m => m.syncToGoogleSheet(updatedOrder));
    }
    updateTableStatus(order.tableId, 'Tersedia');
    notifyDataUpdate();
    setOrderDetailModal(null);
    feedback.toast({ title: 'Pembayaran dikonfirmasi', description: `${order.id} sudah ditandai lunas.`, variant: 'success' });
  };

  const handleCancelOrder = (order: Order) => {
    const ordersCopy = [...orders];
    const index = ordersCopy.findIndex(o => o.id === order.id);
    if (index > -1) {
      ordersCopy[index] = { ...ordersCopy[index], status: 'Batal' as OrderStatus };
      saveOrders(ordersCopy);
    }
    updateTableStatus(order.tableId, 'Tersedia');
    notifyDataUpdate();
    setOrderDetailModal(null);
    feedback.toast({ title: 'Order dibatalkan', description: `${order.id} dipindahkan ke status batal.`, variant: 'info' });
  };

  const getTodayRevenue = () => {
    const todayStr = new Date().toDateString();
    return orders
      .filter(o => (o.status === 'Lunas/Diproses' || o.status === 'Selesai') && new Date(o.createdAt).toDateString() === todayStr)
      .reduce((sum, o) => sum + o.totalAmount, 0);
  };

  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const todayCompletedOrders = todayOrders.filter(o => o.status === 'Lunas/Diproses' || o.status === 'Selesai');
  const todayTransactionsCount = todayCompletedOrders.length;
  const todayRevenue = getTodayRevenue();
  const todayCashRevenue = todayCompletedOrders
    .filter(o => (o.paymentMethod || 'Cash') === 'Cash')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const todayQrisRevenue = todayCompletedOrders
    .filter(o => o.paymentMethod === 'QRIS')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const todayPendingCount = todayOrders.filter(o => o.status === 'Menunggu Pembayaran').length;
  const todayCancelledCount = todayOrders.filter(o => o.status === 'Batal').length;
  const todayItemsSold = todayCompletedOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const averageTicketToday = todayTransactionsCount > 0 ? todayRevenue / todayTransactionsCount : 0;
  const occupiedTables = tables.filter(table => table.status === 'Aktif/Unpaid');
  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const getOrderItemUnitPrice = (item: Order['items'][number]) => {
    const menu = menus.find(entry => entry.id === item.menuId);
    const basePrice = menu?.price || 0;
    const variantExtra = (item.selectedVariants || []).reduce((sum, variant) => sum + (variant.price || 0), 0);
    return basePrice + variantExtra;
  };

  const handleUnlockCashier = async () => {
    if (!isCashierPinEnabled()) {
      setIsUnlocked(true);
      sessionStorage.setItem(CASHIER_SESSION_KEY, 'true');
      return;
    }

    if (!verifyCashierPin(cashierPinInput)) {
      feedback.toast({
        title: 'PIN kasir salah',
        description: 'Masukkan PIN kasir yang sudah diatur di dashboard admin.',
        variant: 'error',
      });
      return;
    }

    sessionStorage.setItem(CASHIER_SESSION_KEY, 'true');
    setIsUnlocked(true);
    feedback.toast({
      title: 'Kasir terbuka',
      description: 'Akses kasir berhasil dibuka.',
      variant: 'success',
    });
  };

  if (!isUnlocked) {
    return (
      <div style={{ backgroundColor: '#f8f9fa', color: '#0f172a', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '360px', backgroundColor: 'white', borderRadius: '28px', padding: '28px 24px', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Lucide.Lock size={28} color="#ea580c" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, textAlign: 'center', margin: '0 0 8px', color: '#0f172a' }}>Akses Kasir</h1>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>Panel kasir dikunci oleh admin. Masukkan PIN kasir untuk melanjutkan.</p>
          <input
            type="password"
            value={cashierPinInput}
            onChange={(e) => setCashierPinInput(e.target.value)}
            placeholder="Masukkan PIN kasir"
            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', marginBottom: '14px' }}
          />
          <button
            type="button"
            onClick={() => void handleUnlockCashier()}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#ea580c', color: 'white', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
          >
            Buka Panel Kasir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', color: '#0f172a', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }} className="flex justify-center pb-24">
      <div className="w-full max-w-md bg-[#f8f9fa] min-h-screen relative shadow-2xl">

        {/* Header */}
        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <Lucide.Coffee size={24} color="#ea580c" />
             <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Warkop Kasir</h1>
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: 0 }}>Omzet: <b style={{ color: '#ea580c' }}>Rp {formatRupiah(getTodayRevenue())}</b></p>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <div onClick={() => setActiveTab('orders')} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: activeOrders.length > 0 ? '#ea580c' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                <Lucide.Bell size={20} color={activeOrders.length > 0 ? 'white' : '#64748b'} />
                {activeOrders.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: '18px', height: '18px', backgroundColor: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 800, borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeOrders.length}</span>}
             </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          
          {/* TAB: PENJUALAN */}
          {activeTab === 'sales' && (
            <div className="animate-fade-in">
              <div style={{ backgroundColor: '#0f172a', borderRadius: '24px', padding: '22px', color: 'white', marginBottom: '18px', boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)' }}>
                <p style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Penjualan Hari Ini</p>
                <h2 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 8px' }}>Rp {formatRupiah(todayRevenue)}</h2>
                <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>{todayTransactionsCount} transaksi selesai hari ini dengan {todayItemsSold} item terjual.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Total transaksi</p>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{todayTransactionsCount}</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Rata-rata transaksi</p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatRupiah(averageTicketToday)}</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>Cash hari ini</p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', margin: 0 }}>Rp {formatRupiah(todayCashRevenue)}</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px' }}>QRIS hari ini</p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', margin: 0 }}>Rp {formatRupiah(todayQrisRevenue)}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>KPI Operasional</h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Ringkasan antrean dan aktivitas penjualan kasir hari ini.</p>
                    </div>
                    <Lucide.BarChart3 size={18} color="#ea580c" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#fff7ed' }}>
                      <p style={{ fontSize: '11px', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Menunggu bayar</p>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#9a3412', margin: 0 }}>{todayPendingCount}</p>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#eff6ff' }}>
                      <p style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Meja aktif</p>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>{occupiedTables.length}</p>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#f0fdf4' }}>
                      <p style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Item terjual</p>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#166534', margin: 0 }}>{todayItemsSold}</p>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#fef2f2' }}>
                      <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Transaksi batal</p>
                      <p style={{ fontSize: '22px', fontWeight: 800, color: '#991b1b', margin: 0 }}>{todayCancelledCount}</p>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Meja Sedang Aktif</h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Klik order yang menunggu pembayaran dari tab `Orders` untuk proses lebih lanjut.</p>
                    </div>
                    <Lucide.LayoutGrid size={18} color="#ea580c" />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {occupiedTables.length > 0 ? occupiedTables.map(table => {
                      const activeOrder = orders.find(o => o.tableId === table.id && o.status === 'Menunggu Pembayaran');
                      return (
                        <div key={table.id} style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', minWidth: '96px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 800, color: '#9a3412', margin: 0 }}>Meja {table.number.toString().padStart(2, '0')}</p>
                          <p style={{ fontSize: '11px', color: '#c2410c', margin: '4px 0 0' }}>{activeOrder ? `${getElapsedTime(activeOrder.createdAt)} lalu` : 'Aktif'}</p>
                        </div>
                      );
                    }) : (
                      <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', fontSize: '13px', color: '#64748b', width: '100%', textAlign: 'center' }}>
                        Tidak ada meja aktif saat ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PESANAN */}
          {activeTab === 'orders' && (
            <div className="animate-fade-in">
                {activeOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px 40px' }}>
                        <Lucide.CheckCircle size={40} color="#cbd5e1" style={{ margin: '0 auto 20px' }} />
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#94a3b8' }}>Semua Selesai</h3>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {activeOrders.map(order => {
                           const tableNumber = getTableNumber(order.tableId);
                           return (
                               <div key={order.id} style={{ backgroundColor: 'white', borderRadius: '24px', padding: '20px', border: '1px solid #f1f5f9' }}>
                                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                       <div>
                                           <span style={{ fontSize: '12px', fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '4px 10px', borderRadius: '8px' }}>MEJA {tableNumber}</span>
                                           <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{order.id}</p>
                                       </div>
                                       <div style={{ textAlign: 'right' }}>
                                           <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatRupiah(order.totalAmount)}</h4>
                                       </div>
                                   </div>
                                   <div style={{ display: 'flex', gap: '10px' }}>
                                       <button onClick={() => setOrderDetailModal({order, isOpen: true})} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700 }}>Detail</button>
                                       <button onClick={() => handleConfirmOrder(order)} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ea580c', color: 'white', fontWeight: 800 }}>Konfirmasi Lunas</button>
                                   </div>
                               </div>
                           );
                        })}
                    </div>
                )}
            </div>
          )}

          {/* TAB: MENU */}
          {activeTab === 'menu' && (
             <div className="animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}><Lucide.FileText size={20} color="#ea580c" /> Daftar Item Menu</h2>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0' }}>Kasir hanya dapat melihat rincian makanan dan minuman. Pengelolaan menu dilakukan dari admin.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {menus.map(menu => (
                        <div key={menu.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <img src={menu.image} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} alt={menu.name} />
                            <div style={{ marginLeft: '12px', flex: 1 }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{menu.name}</h4>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{menu.category}</p>
                                <p style={{ fontSize: '12px', color: '#ea580c', fontWeight: 800, margin: '6px 0 0' }}>Rp {formatRupiah(menu.price)}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0 0' }}>{menu.description || 'Belum ada deskripsi menu.'}</p>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: '999px', backgroundColor: menu.available ? '#f0fdf4' : '#fef2f2', color: menu.available ? '#15803d' : '#dc2626', fontSize: '11px', fontWeight: 800 }}>
                              {menu.available ? 'Tersedia' : 'Habis'}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === 'history' && (
             <div className="animate-fade-in">
                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '4px 12px', display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <Lucide.Search size={16} color="#94a3b8" />
                    <input type="text" placeholder="Cari pesanan..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} style={{ width: '100%', padding: '12px', border: 'none', outline: 'none', fontSize: '13px', backgroundColor: 'transparent', color: '#0f172a' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredHistory.slice(0, 20).map(o => {
                        const statusStyle = o.status === 'Selesai'
                          ? { bg: '#f0fdf4', text: '#15803d' }
                          : o.status === 'Batal'
                            ? { bg: '#fef2f2', text: '#dc2626' }
                            : { bg: '#eff6ff', text: '#2563eb' };
                        return (
                          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                              <div style={{ minWidth: 0 }}>
                                  <h5 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{o.id}</h5>
                                  <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 8px' }}>Meja {getTableNumber(o.tableId)} • {new Date(o.createdAt).toLocaleTimeString()}</p>
                                  <span style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: '10px', fontWeight: 800 }}>
                                    {o.status}
                                  </span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatRupiah(o.totalAmount)}</p>
                              </div>
                          </div>
                        );
                    })}
                </div>
             </div>
          )}

        </div>

        {/* Bottom Nav */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '448px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0 24px', borderTop: '1px solid #f1f5f9', zIndex: 50 }}>
          <div onClick={() => setActiveTab('sales')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: activeTab === 'sales' ? 1 : 0.5 }}>
             <Lucide.BarChart3 size={22} color={activeTab === 'sales' ? '#ea580c' : '#94a3b8'} />
             <span style={{ fontSize: '10px', fontWeight: 800 }}>PENJUALAN</span>
          </div>
          <div onClick={() => setActiveTab('orders')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: activeTab === 'orders' ? 1 : 0.5 }}>
             <Lucide.ScrollText size={22} color={activeTab === 'orders' ? '#ea580c' : '#94a3b8'} />
             <span style={{ fontSize: '10px', fontWeight: 800 }}>ORDERS</span>
          </div>
          <div onClick={() => setActiveTab('menu')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: activeTab === 'menu' ? 1 : 0.5 }}>
             <Lucide.FileText size={22} color={activeTab === 'menu' ? '#ea580c' : '#94a3b8'} />
             <span style={{ fontSize: '10px', fontWeight: 800 }}>MENU</span>
          </div>
          <div onClick={() => setActiveTab('history')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: activeTab === 'history' ? 1 : 0.5 }}>
             <Lucide.History size={22} color={activeTab === 'history' ? '#ea580c' : '#94a3b8'} />
             <span style={{ fontSize: '10px', fontWeight: 800 }}>RIWAYAT</span>
          </div>
        </div>

        {/* Modal: Detail Pesanan */}
        {orderDetailModal?.isOpen && (
          (() => {
            const detailOrder = orderDetailModal.order;
            const itemCount = detailOrder.items.reduce((sum, item) => sum + item.quantity, 0);
            const subtotal = detailOrder.items.reduce((sum, item) => sum + (getOrderItemUnitPrice(item) * item.quantity), 0);
            const serviceAmount = Math.max(0, detailOrder.totalAmount - subtotal);
            const hasServiceCharge = serviceAmount > 0;
            const isQris = detailOrder.paymentMethod === 'QRIS';
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
                <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '448px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Detail Order Masuk</p>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{detailOrder.id}</h2>
                    </div>
                    <Lucide.X size={24} onClick={() => setOrderDetailModal(null)} style={{ cursor: 'pointer', color: '#64748b' }} />
                  </div>

                  <div style={{ backgroundColor: '#0f172a', borderRadius: '24px', padding: '18px', color: 'white', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Identitas Transaksi</p>
                        <p style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Meja {getTableNumber(detailOrder.tableId)}</p>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, padding: '7px 10px', borderRadius: '999px', backgroundColor: isQris ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.12)', color: isQris ? '#93c5fd' : '#f8fafc' }}>
                        {detailOrder.paymentMethod || 'Cash'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Waktu order</p>
                        <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{formatDateTime(detailOrder.createdAt)}</p>
                      </div>
                      <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Status</p>
                        <p style={{ fontSize: '13px', fontWeight: 700, margin: 0 }}>{detailOrder.status}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Total item</p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{itemCount}</p>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Baris menu</p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{detailOrder.items.length}</p>
                    </div>
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Total bayar</p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: '#ea580c', margin: 0 }}>Rp {formatRupiah(detailOrder.totalAmount)}</p>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '18px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rincian Item Pesanan</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Seluruh makanan dan minuman yang dipesan buyer.</p>
                      </div>
                      <Lucide.ReceiptText size={18} color="#ea580c" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {detailOrder.items.map((it, idx) => {
                        const menu = menus.find(m => m.id === it.menuId);
                        const unitPrice = getOrderItemUnitPrice(it);
                        return (
                          <div key={`${it.menuId}-${idx}`} style={{ padding: '14px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{menu?.name || it.menuId}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>{menu?.category || 'Kategori menu'} • {it.quantity}x pesanan</p>
                                {(it.selectedVariants || []).length > 0 && (
                                  <p style={{ fontSize: '11px', color: '#ea580c', margin: '8px 0 0' }}>
                                    {(it.selectedVariants || []).map(variant => `${variant.groupName}: ${variant.optionName}${variant.price > 0 ? ` (+Rp ${formatRupiah(variant.price)})` : ''}`).join(' • ')}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatRupiah(unitPrice * it.quantity)}</p>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>Rp {formatRupiah(unitPrice)} / item</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '18px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>Breakdown Pembayaran</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Subtotal item</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(subtotal)}</span>
                    </div>
                    {hasServiceCharge && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Pajak / layanan</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(serviceAmount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Metode pembayaran</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{detailOrder.paymentMethod || 'Cash'}</span>
                    </div>
                    {!hasServiceCharge && (
                      <div style={{ padding: '10px 12px', borderRadius: '14px', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', marginBottom: '10px' }}>
                        Transaksi ini tidak memakai pajak atau biaya layanan tambahan.
                      </div>
                    )}
                    <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Grand Total</span>
                      <span style={{ fontSize: '22px', fontWeight: 900, color: '#ea580c' }}>Rp {formatRupiah(detailOrder.totalAmount)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => handleCancelOrder(detailOrder)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: 700 }}>Batal</button>
                    <button onClick={() => handleConfirmOrder(detailOrder)} style={{ flex: 2, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#ea580c', color: 'white', fontWeight: 800 }}>Bayar Lunas</button>
                  </div>
                </div>
              </div>
            );
          })()
        )}

      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
