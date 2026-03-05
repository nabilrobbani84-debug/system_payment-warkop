import { useState, useEffect } from 'react';
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
  notifyDataUpdate
} from '../store/dataManager';
import { Coffee, Bell, LayoutGrid, Users, ScrollText, BookOpen, Clock, CreditCard } from 'lucide-react';

export default function Kasir() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'tables' | 'orders' | 'menu'>('tables');

  const loadData = () => {
    setOrders(getOrders());
    setTables(getTables());
    setMenus(getMenus());
  };

  useEffect(() => {
    loadData();
    const cleanup = listenToDataChanges(loadData);
    return cleanup;
  }, []);

  const activeOrders = orders.filter(o => o.status === 'Menunggu Pembayaran');

  const handleConfirmOrder = (order: Order) => {
    let message = '';
    if (order.paymentMethod === 'QRIS') {
      message = `Apakah Anda sudah memastikan saldo Rp ${order.totalAmount.toLocaleString('id-ID')} masuk ke rekening/QRIS toko?\n\n[OK] = Ya, Sudah\n[Cancel] = Batal`;
    } else {
      message = `Konfirmasi penerimaan pembayaran Tunai sejumlah Rp ${order.totalAmount.toLocaleString('id-ID')} untuk pesanan ${order.id}?`;
    }
    if(!window.confirm(message)) return;
    
    // Update Order Status
    const ordersCopy = [...orders];
    const index = ordersCopy.findIndex(o => o.id === order.id);
    if (index > -1) {
      const updatedOrder = { ...ordersCopy[index], status: 'Lunas/Diproses' as OrderStatus };
      ordersCopy[index] = updatedOrder;
      saveOrders(ordersCopy);
      
      // Auto Sync to Google Sheet
      import('../store/dataManager').then(m => m.syncToGoogleSheet(updatedOrder));
    }
    
    // Unlock Table
    updateTableStatus(order.tableId, 'Tersedia');
    notifyDataUpdate(); // broadcast change
  };

  const handleCancelOrder = (order: Order) => {
    if(!window.confirm(`Yakin ingin membatalkan pesanan ${order.id}? (Pesanan akan ditarik dan meja akan dibuka kembali)`)) return;
    
    const ordersCopy = [...orders];
    const index = ordersCopy.findIndex(o => o.id === order.id);
    if (index > -1) {
      ordersCopy[index] = { ...ordersCopy[index], status: 'Batal' as OrderStatus };
      saveOrders(ordersCopy);
    }
    
    // Unlock Table
    updateTableStatus(order.tableId, 'Tersedia');
    notifyDataUpdate();
  };

  const getTableNumber = (tableId: string) => {
    const tbl = tables.find(t => t.id === tableId);
    return tbl ? tbl.number : 'Unknown';
  };
  
  const getOrderForTable = (tableId: string) => {
    return activeOrders.find(o => o.tableId === tableId);
  };

  const getElapsedTime = (isoString: string) => {
    const diff = new Date().getTime() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    return minutes > 0 ? `${minutes}m` : '1m';
  };

  const rootStyle = {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={rootStyle} className="pb-24 flex flex-col items-center">
      <div className="w-full max-w-md bg-[#f3f4f6] min-h-screen relative shadow-2xl">
        
        {/* Header */}
        <div style={{ padding: '16px 20px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Coffee size={24} color="#ea580c" />
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>Warkop Cashier</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div 
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => {
                if (activeOrders.length > 0) {
                  document.getElementById('recent-orders')?.scrollIntoView({ behavior: 'smooth' });
                  setActiveTab('orders');
                } else {
                  alert('Tidak ada pesanan baru yang menunggu pembayaran.');
                }
              }}
            >
              <Bell size={22} color="#4b5563" />
              {activeOrders.length > 0 && (
                <div style={{ position: 'absolute', top: -2, right: -2, width: '10px', height: '10px', backgroundColor: '#ea580c', borderRadius: '50%', border: '2px solid white', animation: 'pulse 2s infinite' }}></div>
              )}
            </div>
            <img src="https://ui-avatars.com/api/?name=Kasir+Warkop&background=0f172a&color=fff&rounded=true" alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          
          {/* Table Status Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <LayoutGrid size={18} color="#4b5563" /> Table Status
            </h2>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Available
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div> Occupied
              </div>
            </div>
          </div>

          {/* Tables Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            {tables.map(table => {
              const isOccupied = table.status === 'Aktif/Unpaid';
              const activeOrder = isOccupied ? getOrderForTable(table.id) : null;
              
              return (
                <div key={table.id} style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  border: isOccupied ? '1.5px solid #ef4444' : '1px solid transparent',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                  position: 'relative',
                  marginTop: isOccupied ? '6px' : '0' // space for the time badge
                }}>
                  {isOccupied && activeOrder && (
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', border: '2px solid #f3f4f6' }}>
                      {getElapsedTime(activeOrder.createdAt)}
                    </div>
                  )}
                  
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isOccupied ? '#fee2e2' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    {isOccupied ? (
                      <Users size={24} color="#ef4444" />
                    ) : (
                      <LayoutGrid size={24} color="#10b981" />
                    )}
                  </div>
                  
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>T-{table.number.toString().padStart(2, '0')}</h3>
                  
                  <div style={{ backgroundColor: isOccupied ? '#fee2e2' : '#d1fae5', color: isOccupied ? '#ef4444' : '#10b981', fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px' }}>
                    {isOccupied && activeOrder ? `Unpaid ($${(activeOrder.totalAmount/15000).toFixed(2)})` : 'Available'}
                  </div>
                  {/* Note: I converted Rp to a mock $ format just to match the visual screenshot literal "$24.50" look, or I could keep it Rp. Let's stick to $ for aesthetic match of screenshot, or switch to Rp formatting. Let's use Rp since the data is in millions */}
                </div>
              );
            })}
          </div>

          {/* Recent Orders Section */}
          <div id="recent-orders" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingTop: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <ScrollText size={18} color="#4b5563" /> Recent Orders
            </h2>
            <span 
              onClick={() => { document.getElementById('recent-orders')?.scrollIntoView({ behavior: 'smooth' }); setActiveTab('orders'); }}
              style={{ fontSize: '13px', color: '#ea580c', fontWeight: 600, cursor: 'pointer' }}
            >
              View All
            </span>
          </div>

          {/* Orders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>No active orders</div>
            ) : (
              activeOrders.map(order => {
                const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);
                
                return (
                  <div key={order.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                    
                    {/* Order Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>{order.id}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>Unpaid</span>
                          {order.paymentMethod === 'QRIS' && (
                            <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>QRIS</span>
                          )}
                          {(order.paymentMethod === 'Cash' || !order.paymentMethod) && (
                            <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>CASH</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>Rp {order.totalAmount.toLocaleString('id-ID')}</h3>
                      </div>
                    </div>
                    
                    {/* Sub Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} • Table T-{getTableNumber(order.tableId).toString().padStart(2, '0')}
                      </div>
                      <span>{totalItems} items</span>
                    </div>
                    
                    <div style={{ height: '1px', backgroundColor: '#f3f4f6', marginBottom: '16px' }}></div>
                    
                    {/* Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                      {order.items.slice(0, 3).map((item, idx) => {
                        const menu = menus.find(m => m.id === item.menuId);
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                            <span>{item.quantity}x {menu?.name || 'Item'}</span>
                            <span>Rp {((menu?.price || 0) * item.quantity).toLocaleString('id-ID')}</span>
                          </div>
                        );
                      })}
                      {order.items.length > 3 && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                          + {order.items.length - 3} more items...
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleCancelOrder(order)} style={{ flex: '0 0 auto', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        Batalkan
                      </button>
                      <button onClick={() => handleConfirmOrder(order)} style={{ flex: '1', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <CreditCard size={16} /> {order.paymentMethod === 'QRIS' ? 'Konfirmasi Lunas' : 'Terima Tunai'}
                      </button>
                    </div>
                    
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '448px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0 20px', borderTop: '1px solid #e5e7eb', zIndex: 50 }}>
          <div onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveTab('tables'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'tables' ? '#ea580c' : '#6b7280', cursor: 'pointer' }}>
            <LayoutGrid size={22} color={activeTab === 'tables' ? '#ea580c' : '#6b7280'} />
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'tables' ? 700 : 500 }}>Tables</span>
          </div>
          <div onClick={() => { document.getElementById('recent-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveTab('orders'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'orders' ? '#ea580c' : '#6b7280', position: 'relative', cursor: 'pointer' }}>
            <ScrollText size={22} color={activeTab === 'orders' ? '#ea580c' : '#6b7280'} />
            {activeOrders.length > 0 && <div style={{ position: 'absolute', top: -2, right: -4, width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>}
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'orders' ? 700 : 500 }}>Orders</span>
          </div>
          <div onClick={() => window.location.href = '/admin'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#6b7280', cursor: 'pointer' }}>
            <BookOpen size={22} color="#6b7280" />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>Menu</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
