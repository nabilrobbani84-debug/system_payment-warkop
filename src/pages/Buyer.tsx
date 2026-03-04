import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Search, Store, Plus, Minus, CreditCard, Banknote, ShieldCheck, ChevronRight, ShoppingBag } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getMenus,
  getTables,
  type MenuItem,
  type Table,
  type OrderItem,
  generateOrderId,
  type PaymentMethod,
  updateTableStatus,
  getOrders,
  saveOrders,
  notifyDataUpdate,
  listenToDataChanges
} from '../store/dataManager';

type Step = 'validating' | 'error' | 'menu' | 'cart' | 'success';

export default function Buyer() {
  const [searchParams] = useSearchParams();
  const mejaId = searchParams.get('meja');

  const [step, setStep] = useState<Step>('validating');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<Table | null>(null);
  
  const categories = ['All', 'Minuman', 'Makanan', 'Snack'];
  const [category, setCategory] = useState<'All' | 'Makanan' | 'Minuman' | 'Snack'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState('');
  
  const [transactionInfo, setTransactionInfo] = useState<{ id: string, total: number, method: PaymentMethod | null } | null>(null);

  // Load data & Validate table
  const validateTable = () => {
    const tables = getTables();
    const loadedMenus = getMenus();
    setMenus(loadedMenus.filter(m => m.available));

    if (!mejaId) {
      setErrorMsg('Meja tidak tidak ditemukan. Coba scan ulang QR Code Anda.');
      setStep('error');
      return;
    }

    const t = tables.find(t => t.id === mejaId || t.number.toString() === mejaId);
    if (!t) {
      setErrorMsg('Meja tidak terdaftar.');
      setStep('error');
      return;
    }

    if (t.status === 'Aktif/Unpaid') {
      setErrorMsg('Meja ini masih memiliki pesanan yang belum dibayar. Harap selesaikan pembayaran di kasir atau tunggu sebentar.');
      setStep('error');
      return;
    }

    setTable(t);
    if (step === 'validating' || step === 'error') {
      setStep('menu');
    }
  };

  useEffect(() => {
    validateTable();
    // Re-validate when data changes, in case cashier clears the table
    const cleanup = listenToDataChanges(validateTable);
    return cleanup;
  }, [mejaId]);

  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuId === item.id);
      if (existing) {
        return prev.map(i => i.menuId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuId: item.id, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuId === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.menuId === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.menuId !== itemId);
    });
  };

  const getCartSubtotal = () => {
    return cart.reduce((total, item) => {
      const menu = menus.find(m => m.id === item.menuId);
      return total + ((menu?.price || 0) * item.quantity);
    }, 0);
  };
  
  const taxAmount = getCartSubtotal() * 0.1;
  const grandTotal = getCartSubtotal() + taxAmount;
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleProcessOrder = () => {
    if (!table || !paymentMethod) return;

    // Generate TRX
    const orderId = generateOrderId(table.number);

    const newOrder = {
      id: orderId,
      tableId: table.id,
      items: cart,
      totalAmount: grandTotal,
      status: 'Menunggu Pembayaran' as const,
      paymentMethod,
      createdAt: new Date().toISOString()
    };

    // Save Order
    const orders = getOrders();
    orders.push(newOrder);
    saveOrders(orders);

    // Update Table status
    updateTableStatus(table.id, 'Aktif/Unpaid');
    
    // Notify custom event across window to update Kasir UI
    notifyDataUpdate();

    setTransactionInfo({ id: orderId, total: grandTotal, method: paymentMethod });
    setStep('success');
  };

  const filteredMenus = menus.filter(m => {
    const matchesCategory = category === 'All' || m.category === category;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Inline CSS variable container style to enforce light mode overriding 'index.css' body Dark theme
  const rootStyle = {
    backgroundColor: '#f8f9fa',
    color: '#111827',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
    paddingBottom: '20px'
  };

  if (step === 'validating') {
    return (
      <div style={{ ...rootStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ea580c', fontWeight: 600, animation: 'pulse 2s infinite' }}>Memvalidasi Status Meja...</div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={{ ...rootStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', maxWidth: '400px' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Info size={40} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>Akses Ditolak</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>{errorMsg}</p>
          <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '14px', backgroundColor: '#ea580c', color: 'white', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Coba Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success' && transactionInfo) {
    // We will generate a QR string using the orderId and amount for realism
    const qrisData = `00020101021126570011ID.CO.QRIS.WWW0118936009131000000010206MANDIRI5204541153033605406${transactionInfo.total}5802ID5913WARKOP MODERN6007JAKARTA6105123456250070703A0163048D8E`;
    return (
      <div style={{ ...rootStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 60px', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#0f172a', letterSpacing: '-0.5px' }}>Pesanan Berhasil!</h2>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px' }}>Nomor Meja: <span style={{ fontWeight: 700, color: '#0f172a' }}>{table?.number}</span></p>
        
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '32px', textAlign: 'left' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Nomor Transaksi</p>
          <p style={{ fontSize: '22px', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '24px' }}>{transactionInfo.id}</p>
          
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Total Pembayaran</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#ea580c', letterSpacing: '-1px', margin: 0 }}>Rp {transactionInfo.total.toLocaleString('id-ID')}</p>
        </div>

        <div style={{ width: '100%', maxWidth: '380px', padding: '32px 24px', borderRadius: '16px', border: '1px solid #fdba74', backgroundColor: '#fff7ed', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Instruksi Pembayaran</p>
          {transactionInfo.method === 'Cash' ? (
             <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>Silakan menuju kasir dan sebutkan <b style={{ color: '#0f172a' }}>Nomor Transaksi</b> Anda untuk melakukan pembayaran tunai.</p>
          ) : (
             <>
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px', padding: '0 8px' }}>Silakan scan kode QRIS di bawah ini dengan aplikasi M-Banking atau e-Wallet kesayangan Anda.</p>
               <div style={{ width: '220px', height: '220px', backgroundColor: 'white', margin: '0 auto', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <QRCodeSVG value={qrisData} size={180} />
               </div>
             </>
           )}
        </div>
        
        {/* Action Buttons Container */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '380px', marginTop: '24px' }}>
          <button 
             onClick={() => {
                setCart([]);
                setTransactionInfo(null);
                setPaymentMethod(null);
                setStep('menu');
             }} 
             style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s' }}
          >
            Kembali ke Menu
          </button>
          <button 
             onClick={() => alert(`Status pesanan ${transactionInfo.id}: \n\n${getOrders().find(o => o.id === transactionInfo.id)?.status || 'Menunggu Pembayaran'}`)}
             style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#ea580c', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px', transition: 'background 0.2s' }}
          >
            Detail Pesanan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      {step === 'menu' && (
        <div style={{ paddingBottom: '100px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 40 }}>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #f3f4f6', width: '40px', height: '40px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
              <ArrowLeft size={20} color="#111827" />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#ea580c', letterSpacing: '1.5px', textTransform: 'uppercase' }}>WARKOP MODERN</span>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>Table {table?.number.toString().padStart(2, '0')}</h1>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer' }}>
              <Info size={18} color="#ffffff" />
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '0 20px', marginBottom: '20px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '16px' }}>
              <Search size={18} color="#94a3b8" style={{ marginRight: '12px' }} />
              <input 
                type="text" 
                placeholder="Search menu items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '15px', color: '#111827' }} 
              />
            </div>
          </div>

          {/* Categories */}
          <div style={{ display: 'flex', overflowX: 'auto', padding: '0 20px', marginBottom: '24px', gap: '28px', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap' }} className="scrollbar-hide">
            {categories.map(cat => (
               <div key={cat} onClick={() => setCategory(cat as any)} style={{ paddingBottom: '12px', cursor: 'pointer', borderBottom: category === cat ? '2px solid #ea580c' : '2px solid transparent', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: category === cat ? '#ea580c' : '#64748b', transition: 'color 0.2s' }}>
                    {cat === 'Minuman' ? 'Coffee' : cat === 'Makanan' ? 'Main Course' : cat === 'Snack' ? 'Snacks' : 'All'}
                  </span>
               </div>
            ))}
          </div>

          {/* Menu Grid */}
          <div style={{ padding: '0 20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                   {category === 'All' ? 'Menu Favorites' : category === 'Minuman' ? 'Coffee Favorites' : category === 'Makanan' ? 'Main Course' : 'Snacks Favorites'}
                </h2>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{filteredMenus.length} Items</span>
             </div>

             {filteredMenus.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                 <p>Menu tidak ditemukan.</p>
               </div>
             ) : (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                  {filteredMenus.map(menu => (
                     <div key={menu.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', paddingBottom: '16px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
                           <img src={menu.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400'} alt={menu.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                           <div style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#ea580c', color: 'white', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px' }}>BESTSELLER</div>
                        </div>
                        <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>
                           <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, lineHeight: 1.3, color: '#0f172a' }}>{menu.name}</h3>
                           <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 16px', lineHeight: 1.4 }}>{menu.category}</p>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ea580c' }}>Rp {menu.price.toLocaleString('id-ID')}</span>
                              
                              {cart.find(c => c.menuId === menu.id) ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff7ed', border: '1px solid #ea580c', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', color: '#ea580c', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => handleRemoveFromCart(menu.id)}><Minus size={14} strokeWidth={3} /></button>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c', margin: '0 6px' }}>{cart.find(c => c.menuId === menu.id)?.quantity}</span>
                                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', color: '#ea580c', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => handleAddToCart(menu)}><Plus size={14} strokeWidth={3} /></button>
                                  </div>
                              ) : (
                                  <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', backgroundColor: '#ea580c', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => handleAddToCart(menu)}>
                                     <Plus size={18} color="white" strokeWidth={2.5} />
                                  </button>
                              )}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
             )}
          </div>

          {/* Cart Overlay */}
          {cartQuantity > 0 && (
             <div style={{ position: 'fixed', bottom: '24px', left: '20px', right: '20px', backgroundColor: '#0f172a', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, cursor: 'pointer', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.3)' }} onClick={() => setStep('cart')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <div style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '6px 14px', borderRadius: '24px', fontSize: '13px', fontWeight: 600 }}>{cartQuantity} Items</div>
                   <div style={{ color: 'white', fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>VIEW CART</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'white', fontSize: '16px', fontWeight: 700 }}>
                   Rp {getCartSubtotal().toLocaleString('id-ID')} <ShoppingBag size={18} strokeWidth={2.5} style={{ marginLeft: '12px' }} />
                </div>
             </div>
          )}
        </div>
      )}

      {step === 'cart' && (
        <div style={{ paddingBottom: '40px', maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', position: 'relative', backgroundColor: '#f8f9fa' }}>
            <button style={{ position: 'absolute', left: '20px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => setStep('menu')}>
              <ArrowLeft size={24} color="#0f172a" />
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Checkout</h1>
          </div>

          <div style={{ padding: '0 20px', marginTop: '16px' }}>
            {/* Table Card */}
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', padding: '12px 16px', borderRadius: '16px', marginBottom: '28px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
               <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '44px', height: '44px', backgroundColor: '#ffedd5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Store size={22} color="#ea580c" />
                  </div>
                  <div style={{ marginLeft: '14px' }}>
                     <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '2px', textTransform: 'uppercase' }}>Table Number</p>
                     <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Table {table?.number.toString().padStart(2, '0')}</h3>
                  </div>
               </div>
               <div style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '13px', fontWeight: 600, padding: '6px 14px', borderRadius: '20px' }}>
                  Dine-in
               </div>
            </div>

            {/* Order Summary */}
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#0f172a' }}>Order Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
               {cart.map(item => {
                  const menu = menus.find(m => m.id === item.menuId);
                  if (!menu) return null;
                  return (
                     <div key={item.menuId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                           <img src={menu.image || 'https://via.placeholder.com/150?text=No+Image'} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #f1f5f9' }} />
                           <div style={{ marginLeft: '14px' }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', color: '#0f172a' }}>{menu.name}</h4>
                              <p style={{ fontSize: '13px', color: '#ea580c', margin: 0, fontWeight: 500 }}>{item.quantity}x <span style={{ color: '#94a3b8', margin: '0 4px' }}>|</span> {menu.category}</p>
                           </div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Rp {(menu.price * item.quantity).toLocaleString('id-ID')}</div>
                     </div>
                  );
               })}
            </div>

            {/* Totals Box */}
            <div style={{ padding: '20px', borderRadius: '16px', marginBottom: '32px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Subtotal</span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Rp {getCartSubtotal().toLocaleString('id-ID')}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Tax & Service (10%)</span>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Rp {taxAmount.toLocaleString('id-ID')}</span>
               </div>
               <div style={{ height: '1px', borderTop: '1px dashed #fdba74', margin: '16px 0' }}></div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Total Payment</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c' }}>Rp {grandTotal.toLocaleString('id-ID')}</span>
               </div>
            </div>

            {/* Payment Method */}
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Payment Method</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
               <div onClick={() => setPaymentMethod('QRIS')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', border: paymentMethod === 'QRIS' ? '2px solid #ea580c' : '1px solid #e2e8f0', backgroundColor: paymentMethod === 'QRIS' ? '#fff7ed' : '#ffffff' }}>
                  <CreditCard size={32} color={paymentMethod === 'QRIS' ? '#ea580c' : '#94a3b8'} style={{ marginBottom: '12px' }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: paymentMethod === 'QRIS' ? '#0f172a' : '#64748b' }}>QRIS</span>
               </div>
               <div onClick={() => setPaymentMethod('Cash')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', border: paymentMethod === 'Cash' ? '2px solid #ea580c' : '1px solid #e2e8f0', backgroundColor: paymentMethod === 'Cash' ? '#fff7ed' : '#ffffff' }}>
                  <Banknote size={32} color={paymentMethod === 'Cash' ? '#ea580c' : '#94a3b8'} style={{ marginBottom: '12px' }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: paymentMethod === 'Cash' ? '#0f172a' : '#64748b' }}>Cash at Counter</span>
               </div>
            </div>

            {/* Note */}
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#0f172a' }}>Add a note (Optional)</h2>
            <textarea 
               rows={3} 
               value={note}
               onChange={(e) => setNote(e.target.value)}
               placeholder="E.g. Don't make it too salty" 
               style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', resize: 'none', marginBottom: '32px', outline: 'none', color: '#0f172a', fontFamily: "'Inter', sans-serif" }}
            ></textarea>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
               <ShieldCheck size={16} color="#64748b" style={{ marginRight: '6px' }} />
               <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Secure payment powered by WarkopPay</span>
            </div>

            <button 
               disabled={!paymentMethod} 
               onClick={handleProcessOrder} 
               style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '18px', borderRadius: '16px', backgroundColor: !paymentMethod ? '#ffedd5' : '#ea580c', color: 'white', fontSize: '18px', fontWeight: 700, transition: 'all 0.2s', border: 'none', cursor: !paymentMethod ? 'not-allowed' : 'pointer' }}
            >
               Place Order <ChevronRight size={22} style={{ marginLeft: '8px' }} />
            </button>
            
            {/* Decorative home indicator bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', marginBottom: '10px' }}>
               <div style={{ width: '130px', height: '5px', backgroundColor: '#cbd5e1', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
