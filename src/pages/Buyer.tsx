import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Search, Plus, Minus, CreditCard, Banknote, ShieldCheck, ChevronRight, ShoppingBag, RefreshCw, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getMenus,
  getTables,
  type MenuItem,
  type Table,
  type OrderItem,
  type PaymentMethod,
  type VariantGroup,
  getOrders,
  notifyDataUpdate,
  listenToDataChanges,
  getDailyToken,
  submitOrder,
  calculateOrderTax,
  getBestsellerMenuIds,
  getQrisPayload,
  formatRupiah,
  getTaxSettings,
  getMenuCategories,
  getVariantGroups
} from '../store/dataManager';
import { useFeedback } from '../components/feedback/useFeedback';

type Step = 'validating' | 'error' | 'menu' | 'variant' | 'cart' | 'success';
const BUYER_TRANSACTION_SESSION_KEY = 'warkop_buyer_transaction';

type TransactionMenuItem = {
  cartKey?: string;
  menuId: string;
  name: string;
  category?: string;
  quantity: number;
  basePrice: number;
  variantExtra: number;
  price: number;
  image?: string;
  selectedVariants?: NonNullable<OrderItem['selectedVariants']>;
};

type BuyerCartItem = OrderItem & {
  cartKey: string;
};

type VariantSelectionState = {
  menu: MenuItem;
  groups: VariantGroup[];
  selectedOptions: Record<string, string>;
} | null;

type TransactionInfo = {
  id: string;
  total: number;
  method: PaymentMethod | null;
  status: string;
  tableId: string;
  items: TransactionMenuItem[];
  pending?: boolean;
  startedAt?: string;
};

const getStoredBuyerTransaction = (): TransactionInfo | null => {
  const raw = sessionStorage.getItem(BUYER_TRANSACTION_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TransactionInfo;
  } catch {
    sessionStorage.removeItem(BUYER_TRANSACTION_SESSION_KEY);
    return null;
  }
};

export default function Buyer() {
  const feedback = useFeedback();
  const [searchParams] = useSearchParams();
  const mejaId = searchParams.get('meja');

  const [step, setStep] = useState<Step>('validating');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [table, setTable] = useState<Table | null>(null);
  
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['All']);
  const [category, setCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<BuyerCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  
  const [transactionInfo, setTransactionInfo] = useState<TransactionInfo | null>(() => getStoredBuyerTransaction());
  const [bestsellerIds, setBestsellerIds] = useState<string[]>([]);
  const [qrisPayload, setQrisPayload] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [taxSettings, setTaxSettings] = useState(() => getTaxSettings());
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [variantSelection, setVariantSelection] = useState<VariantSelectionState>(null);

  const buildTransactionItems = (rawItems: OrderItem[], sourceMenus: MenuItem[]): TransactionMenuItem[] => (
    rawItems.map(item => {
      const menu = sourceMenus.find(entry => entry.id === item.menuId);
      const variantExtra = (item.selectedVariants || []).reduce((sum, variant) => sum + variant.price, 0);
      return {
        cartKey: `${item.menuId}-${(item.selectedVariants || []).map(variant => variant.optionId).join('-') || 'default'}`,
        menuId: item.menuId,
        name: menu?.name || 'Menu tidak ditemukan',
        category: menu?.category,
        quantity: item.quantity,
        basePrice: menu?.price || 0,
        variantExtra,
        price: (menu?.price || 0) + variantExtra,
        image: menu?.image,
        selectedVariants: item.selectedVariants || [],
      };
    })
  );

  const getApplicableVariantGroups = (menu: MenuItem) => {
    return variantGroups.filter(group => group.visible && group.appliesToCategories.includes(menu.category) && group.options.some(option => option.inStock));
  };

  const buildCartKey = (menuId: string, selectedVariants: NonNullable<OrderItem['selectedVariants']>) => {
    const variantKey = selectedVariants.map(variant => `${variant.groupId}:${variant.optionId}`).sort().join('|');
    return `${menuId}::${variantKey || 'default'}`;
  };

  const getCartItemUnitPrice = (item: BuyerCartItem) => {
    const menu = menus.find(entry => entry.id === item.menuId);
    const basePrice = menu?.price || 0;
    const variantExtra = (item.selectedVariants || []).reduce((sum, variant) => sum + variant.price, 0);
    return basePrice + variantExtra;
  };

  useEffect(() => {
    if (transactionInfo) {
      sessionStorage.setItem(BUYER_TRANSACTION_SESSION_KEY, JSON.stringify(transactionInfo));
    } else {
      sessionStorage.removeItem(BUYER_TRANSACTION_SESSION_KEY);
    }
  }, [transactionInfo]);

  // Load data & Validate table
  const validateTable = useCallback(() => {
    const tables = getTables();
    const latestOrders = getOrders();
    const loadedMenus = getMenus();
    setMenus(loadedMenus);
    setCategoryOptions(['All', ...getMenuCategories()]);
    setBestsellerIds(getBestsellerMenuIds());
    setQrisPayload(getQrisPayload());
    setTaxSettings(getTaxSettings());
    setVariantGroups(getVariantGroups());

    if (!mejaId) {
      setErrorMsg('Meja tidak tidak ditemukan. Coba scan ulang QR Code Anda.');
      setStep('error');
      return;
    }

    const t = tables.find(t => t.id === mejaId || t.number.toString() === mejaId || t.id.split('-').pop() === mejaId);
    if (!t) {
      setErrorMsg('Meja tidak terdaftar.');
      setStep('error');
      return;
    }

    const activeTransaction = transactionInfo || getStoredBuyerTransaction();
    const currentTransactionOrder = activeTransaction?.id
      ? latestOrders.find(o => o.id === activeTransaction.id)
      : null;
    const latestTableOrder = latestOrders
      .filter(o => o.tableId === t.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const hasPendingSessionForThisTable = activeTransaction?.pending && activeTransaction.tableId === t.id;
    const isCurrentTransactionForTable = currentTransactionOrder?.tableId === t.id;

    if (hasPendingSessionForThisTable && latestTableOrder) {
      setTransactionInfo({
        id: latestTableOrder.id,
        total: latestTableOrder.totalAmount,
        method: latestTableOrder.paymentMethod || null,
        status: latestTableOrder.status,
        tableId: latestTableOrder.tableId,
        items: buildTransactionItems(latestTableOrder.items, loadedMenus),
      });
      setTable(t);
      setStep('success');
      return;
    }

    if (t.status === 'Aktif/Unpaid' && !isCurrentTransactionForTable) {
      setErrorMsg('Meja ini masih memiliki pesanan yang belum dibayar. Harap selesaikan pembayaran di kasir atau tunggu sebentar.');
      setStep('error');
      return;
    }

    const reqToken = searchParams.get('token');
    if (reqToken !== getDailyToken()) {
      setErrorMsg('Sesi tidak valid / Kadaluarsa. Harap scan ulang QR Code asli dari meja barusan.');
      setStep('error');
      return;
    }

    setTable(t);

    if (currentTransactionOrder) {
      setTransactionInfo(prev => prev ? {
        ...prev,
        total: currentTransactionOrder.totalAmount,
        method: currentTransactionOrder.paymentMethod || prev.method,
        status: currentTransactionOrder.status,
        tableId: currentTransactionOrder.tableId,
        items: buildTransactionItems(currentTransactionOrder.items, loadedMenus),
        pending: false,
      } : prev);
      setStep('success');
      return;
    }

    if (step === 'validating' || step === 'error') {
      setStep('menu');
    }
  }, [mejaId, searchParams, step, transactionInfo]);

  useEffect(() => {
    validateTable();
    const cleanup = listenToDataChanges(() => {
      validateTable();
      setMenus(getMenus());
      setCategoryOptions(['All', ...getMenuCategories()]);
      setBestsellerIds(getBestsellerMenuIds());
      setVariantGroups(getVariantGroups());
      
      if (transactionInfo) {
         const currentOrder = getOrders().find(o => o.id === transactionInfo.id);
         if (currentOrder && currentOrder.status !== transactionInfo.status) {
            setTransactionInfo({
              ...transactionInfo,
              status: currentOrder.status,
              items: buildTransactionItems(currentOrder.items, getMenus()),
            });
         }
      }
    });
    return cleanup;
  }, [transactionInfo, validateTable]);

  const handleAddToCart = (item: MenuItem) => {
    const applicableGroups = getApplicableVariantGroups(item);
    if (applicableGroups.length > 0) {
      setVariantSelection({
        menu: item,
        groups: applicableGroups,
        selectedOptions: Object.fromEntries(
          applicableGroups.map(group => [group.id, group.options.find(option => option.inStock)?.id || ''])
        ),
      });
      setStep('variant');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.cartKey === `${item.id}::default`);
      if (existing) {
        return prev.map(i => i.cartKey === `${item.id}::default` ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { cartKey: `${item.id}::default`, menuId: item.id, quantity: 1, selectedVariants: [] }];
    });
  };

  const handleManualRefresh = () => {
    validateTable();
    setMenus(getMenus());
    setCategoryOptions(['All', ...getMenuCategories()]);
    setBestsellerIds(getBestsellerMenuIds());
    setVariantGroups(getVariantGroups());
  };

  const handleRemoveFromCart = (cartKey: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.cartKey !== cartKey);
    });
  };

  const handleConfirmVariantSelection = () => {
    if (!variantSelection) return;

    const selectedVariants = variantSelection.groups.map(group => {
      const selectedOption = group.options.find(option => option.id === variantSelection.selectedOptions[group.id]);
      if (!selectedOption) return null;
      return {
        groupId: group.id,
        groupName: group.name,
        optionId: selectedOption.id,
        optionName: selectedOption.name,
        price: selectedOption.price,
      };
    }).filter(Boolean) as NonNullable<OrderItem['selectedVariants']>;

    if (selectedVariants.length !== variantSelection.groups.length) {
      void feedback.alert({
        title: 'Varian belum lengkap',
        description: 'Pilih satu varian untuk setiap kategori varian sebelum melanjutkan.',
        buttonLabel: 'Oke',
      });
      return;
    }

    const cartKey = buildCartKey(variantSelection.menu.id, selectedVariants);
    setCart(prev => {
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) {
        return prev.map(item => item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        cartKey,
        menuId: variantSelection.menu.id,
        quantity: 1,
        selectedVariants,
      }];
    });
    setVariantSelection(null);
    setStep('menu');
  };

  const getCartSubtotal = () => {
    return cart.reduce((total, item) => {
      return total + (getCartItemUnitPrice(item) * item.quantity);
    }, 0);
  };
  
  const subtotal = getCartSubtotal();
  const taxAmount = paymentMethod
    ? calculateOrderTax(subtotal, paymentMethod)
    : (taxSettings.enabled ? subtotal * (taxSettings.rate / 100) : 0);
  const grandTotal = getCartSubtotal() + taxAmount;
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const taxReviewLabel = !taxSettings.enabled
    ? 'Pajak & layanan (nonaktif)'
    : paymentMethod === 'QRIS' && !taxSettings.applyToQris
      ? 'Pajak & layanan (QRIS bebas pajak)'
      : `Pajak & layanan (${formatRupiah(taxSettings.rate)}%)`;
  const shouldShowTaxRow = taxSettings.enabled;
  const shouldShowPaymentNote = taxSettings.enabled;

  const handleProcessOrder = () => {
    if (!table || !paymentMethod) return;
    const token = searchParams.get('token') || '';
    
    try {
      const result = submitOrder(table.id, cart, paymentMethod, token);
      notifyDataUpdate();
      setTransactionInfo({
        id: result.orderId,
        total: result.grandTotal,
        method: paymentMethod,
        status: 'Menunggu Pembayaran',
        tableId: table.id,
        items: buildTransactionItems(cart, menus),
        pending: false,
      });
      setStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses pesanan.';
      void feedback.alert({
        title: 'Pesanan gagal diproses',
        description: message,
        buttonLabel: 'Tutup',
      });
      validateTable();
    }
  };

  const simulatePaymentSuccess = () => {
    if (!transactionInfo) return;
    setIsVerifyingPayment(true);
    
    setTimeout(() => {
      import('../store/dataManager').then(({ getOrders, saveOrders, updateTableStatus, notifyDataUpdate, syncToGoogleSheet }) => {
        const orders = getOrders();
        const orderIdx = orders.findIndex(o => o.id === transactionInfo.id);
        if (orderIdx > -1) {
           const updatedOrder = { ...orders[orderIdx], status: 'Lunas/Diproses' as const };
           orders[orderIdx] = updatedOrder;
           saveOrders(orders);
           syncToGoogleSheet(updatedOrder);
           updateTableStatus(updatedOrder.tableId, 'Tersedia');
           notifyDataUpdate();
           setTransactionInfo({ ...transactionInfo, status: 'Lunas/Diproses', pending: false });
           setIsVerifyingPayment(false);
        }
      });
    }, 2000);
  };

  const filteredMenus = menus.filter(m => {
    const matchesCategory = category === 'All' || m.category === category;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const soldCountByMenu = getOrders().reduce<Record<string, number>>((acc, order) => {
    if (order.status === 'Lunas/Diproses' || order.status === 'Selesai') {
      order.items.forEach(item => {
        acc[item.menuId] = (acc[item.menuId] || 0) + item.quantity;
      });
    }
    return acc;
  }, {});
  const visibleCategorySections = (category === 'All' ? categoryOptions.filter(option => option !== 'All') : [category])
    .map(sectionCategory => ({
      category: sectionCategory,
      menus: filteredMenus.filter(menu => menu.category === sectionCategory),
    }))
    .filter(section => section.menus.length > 0);

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
    const isPaid = transactionInfo.status === 'Lunas/Diproses' || transactionInfo.status === 'Selesai';
    const itemSubtotal = transactionInfo.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemTax = transactionInfo.method ? calculateOrderTax(itemSubtotal, transactionInfo.method) : 0;
    
    return (
      <div style={{ ...rootStyle, padding: '24px 16px 40px', background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 24%)' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {isPaid ? (
              <div style={{ backgroundColor: '#f0fdf4', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'scaleUp 0.5s ease-out' }}>
                <CheckCircle2 size={40} color="#22c55e" />
              </div>
            ) : (
              <div style={{ backgroundColor: '#fff7ed', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <RefreshCw size={40} color="#ea580c" />
              </div>
            )}

            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: '#0f172a', letterSpacing: '-0.5px' }}>
              {isPaid ? 'Pembayaran Berhasil!' : (transactionInfo.method === 'Cash' ? 'Satu Langkah Lagi!' : 'Selesaikan Pembayaran')}
            </h2>
            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>Meja Nomor <span style={{ fontWeight: 700, color: '#0f172a' }}>{table?.number}</span></p>
          </div>

          <div style={{ width: '100%', backgroundColor: '#ffffff', padding: '22px', borderRadius: '24px', border: isPaid ? '2px solid #bbf7d0' : '1px solid #fed7aa', marginBottom: '18px', textAlign: 'left', position: 'relative', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)' }}>
            {isPaid && <span style={{ position: 'absolute', top: '-12px', right: '20px', backgroundColor: '#22c55e', color: 'white', fontSize: '10px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px' }}>LUNAS</span>}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Nomor Transaksi</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>{transactionInfo.id.toUpperCase()}</p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, padding: '7px 12px', borderRadius: '999px', backgroundColor: transactionInfo.method === 'QRIS' ? '#eff6ff' : '#f8fafc', color: transactionInfo.method === 'QRIS' ? '#1d4ed8' : '#475569' }}>
                {transactionInfo.method || 'Cash'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Status</p>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{transactionInfo.status}</p>
              </div>
              <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#fff7ed' }}>
                <p style={{ fontSize: '11px', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Total Tagihan</p>
                <p style={{ fontSize: '18px', fontWeight: 900, color: isPaid ? '#16a34a' : '#ea580c', margin: 0 }}>Rp {formatRupiah(transactionInfo.total)}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 12px' }}>Item Pesanan</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {transactionInfo.items.map(item => (
                  <div key={item.cartKey || `${item.menuId}-${item.quantity}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{item.name}</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' }}>{item.category || 'Kategori menu'}</p>
                      {(item.selectedVariants || []).length > 0 && (
                        <p style={{ fontSize: '11px', color: '#ea580c', margin: '0 0 4px' }}>
                          {(item.selectedVariants || []).map(variant => `${variant.groupName}: ${variant.optionName}${variant.price > 0 ? ` (+Rp ${formatRupiah(variant.price)})` : ''}`).join(' • ')}
                        </p>
                      )}
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{item.quantity}x Rp {formatRupiah(item.price)}</p>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', margin: 0, textAlign: 'right' }}>Rp {formatRupiah(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width: '100%', backgroundColor: '#ffffff', borderRadius: '22px', border: '1px solid #f1f5f9', padding: '18px 20px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Subtotal</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(itemSubtotal)}</span>
            </div>
            {taxSettings.enabled && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  {transactionInfo.method === 'QRIS' && !taxSettings.applyToQris ? 'Pajak & layanan (QRIS bebas pajak)' : `Pajak & layanan (${taxSettings.rate}%)`}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(itemTax)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Total pembayaran</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: isPaid ? '#16a34a' : '#ea580c' }}>Rp {formatRupiah(transactionInfo.total)}</span>
            </div>
          </div>

          {!isPaid && (
            <div style={{ width: '100%', padding: '24px 20px', borderRadius: '22px', border: '1px solid #fdba74', backgroundColor: '#fff7ed', textAlign: 'center', marginBottom: '18px' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Instruksi Pembayaran</p>
              {transactionInfo.method === 'Cash' ? (
                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, margin: 0 }}>Silakan menuju kasir sekarang dan sebutkan <b style={{ color: '#0f172a' }}>nomor transaksi</b> ini. Kasir akan memproses pembayaran tunai dan status pesanan Anda otomatis diperbarui.</p>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
                    Scan QRIS di bawah dan tunjukkan bukti transaksi ke kasir atau klik <b>Cek Status Bayar</b> agar pesanan segera diproses.
                  </p>
                  <div style={{ width: '100%', maxWidth: '240px', aspectRatio: '1 / 1', backgroundColor: 'white', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '12px' }}>
                    {qrisPayload ? (
                      <QRCodeSVG value={qrisPayload} size={180} />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Info size={24} style={{ marginBottom: '8px' }} />
                        <p style={{ fontSize: '11px', fontWeight: 600 }}>Tunjukkan Kode Ini Ke Kasir</p>
                        <p style={{ fontSize: '10px' }}>QRIS belum dikonfigurasi oleh admin.</p>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>A/N WARKOP MODERN</p>
                  <button
                    onClick={simulatePaymentSuccess}
                    disabled={isVerifyingPayment}
                    style={{ marginTop: '24px', width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: '#ea580c', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}
                  >
                    {isVerifyingPayment ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    {isVerifyingPayment ? 'Memverifikasi...' : 'Cek Status Bayar'}
                  </button>
                </>
              )}
            </div>
          )}

          {isPaid && (
            <div style={{ width: '100%', padding: '24px', borderRadius: '22px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center', marginBottom: '18px' }}>
              <p style={{ fontSize: '14px', color: '#166534', fontWeight: 600, margin: 0 }}>Terima kasih! Pesanan Anda sedang disiapkan oleh barista kami.</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button
              onClick={() => {
                setCart([]);
                setTransactionInfo(null);
                setPaymentMethod(null);
                setStep('menu');
              }}
              style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}
            >
              Kembali ke Menu
            </button>
          </div>
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
            <div style={{ width: '40px' }}></div>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#ea580c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>WARKOP MODERN</span>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.5px' }}>Table {table?.number.toString().padStart(2, '0')}</h1>
            </div>
            <button onClick={handleManualRefresh} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer' }}>
              <RefreshCw size={20} color="#64748b" />
            </button>
          </div>

          <div style={{ padding: '0 20px', marginBottom: '24px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <Search size={20} color="#94a3b8" style={{ marginRight: '14px' }} />
              <input type="text" placeholder="Mau pesan apa hari ini?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '15px', color: '#111827', fontWeight: 500 }} />
            </div>
          </div>

          {/* Categories */}
          <div style={{ display: 'flex', overflowX: 'auto', padding: '0 20px', marginBottom: '24px', gap: '28px', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap' }} className="scrollbar-hide">
            {categoryOptions.map(cat => (
               <div key={cat} onClick={() => setCategory(cat)} style={{ paddingBottom: '12px', cursor: 'pointer', borderBottom: category === cat ? '2px solid #ea580c' : '2px solid transparent', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px', color: category === cat ? '#ea580c' : '#64748b' }}>{cat}</span>
               </div>
            ))}
          </div>

          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {visibleCategorySections.map(section => (
                <div key={section.category}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#334155', margin: 0 }}>{section.category} ({section.menus.length})</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {section.menus.map(menu => {
                      const applicableGroups = getApplicableVariantGroups(menu);
                      const soldCount = soldCountByMenu[menu.id] || 0;
                      return (
                        <div key={menu.id} style={{ backgroundColor: '#ffffff', borderRadius: '22px', border: '1px solid #f1f5f9', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)', padding: '12px', display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: '12px', alignItems: 'center' }}>
                          <div style={{ position: 'relative', width: '84px', height: '84px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                            <img
                              src={menu.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400'}
                              alt={menu.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: menu.available ? 1 : 0.38 }}
                            />
                            {!menu.available && (
                              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                                <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 800, padding: '6px 10px', borderRadius: '10px' }}>HABIS</span>
                              </div>
                            )}
                            {menu.available && bestsellerIds.includes(menu.id) && (
                              <div style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: '#ea580c', color: 'white', fontSize: '9px', fontWeight: 800, padding: '4px 7px', borderRadius: '999px' }}>BEST</div>
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#1f2937', margin: '0 0 6px' }}>{menu.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              <span style={{ fontSize: '13px', color: '#64748b' }}>{soldCount} terjual</span>
                              <span style={{ width: '4px', height: '4px', borderRadius: '999px', backgroundColor: '#cbd5e1' }}></span>
                              <span style={{ fontSize: '13px', color: applicableGroups.length > 0 ? '#ea580c' : '#94a3b8', fontWeight: 600 }}>
                                {applicableGroups.length > 0 ? `Varian tersedia ${applicableGroups.length}` : 'Tanpa varian'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: menu.available ? '#ea580c' : '#94a3b8' }}>Rp{formatRupiah(menu.price)}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{menu.category}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {menu.available ? (
                              <button
                                style={{ width: '36px', height: '36px', backgroundColor: '#ff5a36', border: 'none', borderRadius: '10px', color: 'white', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(255, 90, 54, 0.22)' }}
                                onClick={() => handleAddToCart(menu)}
                              >
                                +
                              </button>
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e2e8f0' }}></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {visibleCategorySections.length === 0 && (
                <div style={{ padding: '20px', borderRadius: '18px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                  Tidak ada menu yang cocok dengan pencarian atau kategori ini.
                </div>
              )}
            </div>
          </div>

          {cartQuantity > 0 && (
             <div style={{ position: 'fixed', bottom: '24px', left: '20px', right: '20px', backgroundColor: '#0f172a', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, cursor: 'pointer', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.3)' }} onClick={() => setStep('cart')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <div style={{ backgroundColor: '#334155', color: '#f8fafc', padding: '6px 14px', borderRadius: '24px', fontSize: '13px', fontWeight: 600 }}>{cartQuantity} Items</div>
                   <div style={{ color: 'white', fontSize: '15px', fontWeight: 700 }}>VIEW CART</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: 'white', fontSize: '16px', fontWeight: 700 }}>Rp {formatRupiah(getCartSubtotal())} <ShoppingBag size={18} style={{ marginLeft: '12px' }} /></div>
             </div>
          )}
        </div>
      )}

      {step === 'variant' && variantSelection && (
        <div style={{ paddingBottom: '32px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#f8f9fa' }}>
            <button
              style={{ position: 'absolute', left: '20px', border: 'none', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => {
                setVariantSelection(null);
                setStep('menu');
              }}
            >
              <ArrowLeft size={24} color="#0f172a" />
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Pilih Kategori Varian</h1>
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ backgroundColor: '#0f172a', color: 'white', borderRadius: '24px', padding: '20px', marginBottom: '16px', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#38bdf8', margin: '0 0 8px' }}>Konfigurasi Menu</p>
              <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '14px', alignItems: 'center' }}>
                <img src={variantSelection.menu.image} alt={variantSelection.menu.name} style={{ width: '72px', height: '72px', borderRadius: '18px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)' }} />
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>{variantSelection.menu.name}</h2>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 8px' }}>{variantSelection.menu.category}</p>
                  <p style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Mulai dari Rp {formatRupiah(variantSelection.menu.price)}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {variantSelection.groups.map(group => (
                <div key={group.id} style={{ backgroundColor: '#ffffff', borderRadius: '22px', border: '1px solid #e2e8f0', padding: '18px 16px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>{group.name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{group.description || 'Pilih satu opsi untuk kategori varian ini.'}</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {group.options.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={!option.inStock}
                        onClick={() => setVariantSelection(prev => prev ? {
                          ...prev,
                          selectedOptions: { ...prev.selectedOptions, [group.id]: option.id },
                        } : prev)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: '18px',
                          border: variantSelection.selectedOptions[group.id] === option.id ? '2px solid #ea580c' : '1px solid #e2e8f0',
                          backgroundColor: variantSelection.selectedOptions[group.id] === option.id ? '#fff7ed' : '#ffffff',
                          color: !option.inStock ? '#94a3b8' : '#0f172a',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: !option.inStock ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span style={{ textAlign: 'left' }}>
                          <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>{option.name}</strong>
                          <span style={{ fontSize: '11px', color: !option.inStock ? '#94a3b8' : '#64748b' }}>
                            {option.inStock ? (option.price > 0 ? `Tambah Rp ${formatRupiah(option.price)}` : 'Gratis') : 'Stok tidak tersedia'}
                          </span>
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: variantSelection.selectedOptions[group.id] === option.id ? '#ea580c' : '#94a3b8' }}>
                          {variantSelection.selectedOptions[group.id] === option.id ? 'Dipilih' : option.inStock ? 'Pilih' : 'Habis'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', border: '1px solid #e2e8f0', padding: '18px 16px', marginTop: '16px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Harga menu</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(variantSelection.menu.price)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Tambahan varian</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Rp {formatRupiah(
                    variantSelection.groups.reduce((sum, group) => {
                      const selectedOptionId = variantSelection.selectedOptions[group.id];
                      const selectedOption = group.options.find(option => option.id === selectedOptionId);
                      return sum + (selectedOption?.price || 0);
                    }, 0)
                  )}
                </span>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: '14px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Total per item</span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ea580c' }}>
                  Rp {formatRupiah(
                    variantSelection.menu.price + variantSelection.groups.reduce((sum, group) => {
                      const selectedOptionId = variantSelection.selectedOptions[group.id];
                      const selectedOption = group.options.find(option => option.id === selectedOptionId);
                      return sum + (selectedOption?.price || 0);
                    }, 0)
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmVariantSelection}
              style={{ width: '100%', marginTop: '18px', padding: '18px', borderRadius: '18px', border: 'none', backgroundColor: '#ea580c', color: 'white', fontWeight: 800, fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 22px rgba(234, 88, 12, 0.26)' }}
            >
              Tambahkan ke Keranjang
            </button>
          </div>
        </div>
      )}

      {step === 'cart' && (
        <div style={{ paddingBottom: '40px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#f8f9fa' }}>
            <button style={{ position: 'absolute', left: '20px', border: 'none', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setStep('menu')}><ArrowLeft size={24} color="#0f172a" /></button>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>Review Pesanan</h1>
          </div>
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ backgroundColor: '#0f172a', color: 'white', borderRadius: '24px', padding: '20px', marginBottom: '16px', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#38bdf8', margin: '0 0 8px' }}>Checkout Meja</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>Meja {table?.number.toString().padStart(2, '0')}</h2>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>{cartQuantity} item siap diproses</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Subtotal</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Rp {formatRupiah(subtotal)}</p>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '18px 16px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Detail Item</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Cek kembali pesanan sebelum dikirim</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ea580c', backgroundColor: '#fff7ed', padding: '7px 10px', borderRadius: '999px' }}>{cartQuantity} item</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => {
                  const menu = menus.find(m => m.id === item.menuId);
                  if (!menu) return null;
                  const unitPrice = getCartItemUnitPrice(item);
                  return (
                    <div key={item.cartKey} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '12px', alignItems: 'center', padding: '12px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <img src={menu.image} alt={menu.name} style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'cover' }} />
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>{menu.name}</h4>
                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase' }}>{menu.category}</p>
                        {(item.selectedVariants || []).length > 0 && (
                          <p style={{ fontSize: '11px', color: '#ea580c', margin: '0 0 6px' }}>
                            {(item.selectedVariants || []).map(variant => `${variant.groupName}: ${variant.optionName}${variant.price > 0 ? ` (+Rp ${formatRupiah(variant.price)})` : ''}`).join(' • ')}
                          </p>
                        )}
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>Rp {formatRupiah(unitPrice)} per item</p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', borderRadius: '999px', padding: '6px 10px', border: '1px solid #e2e8f0' }}>
                          <button style={{ width: '24px', height: '24px', color: '#ea580c', backgroundColor: '#fff7ed', border: 'none', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleRemoveFromCart(item.cartKey)}><Minus size={12} strokeWidth={3} /></button>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', minWidth: '18px', textAlign: 'center' }}>{item.quantity}</span>
                          <button style={{ width: '24px', height: '24px', color: 'white', backgroundColor: '#ea580c', border: 'none', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCart(prev => prev.map(cartItem => cartItem.cartKey === item.cartKey ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem))}><Plus size={12} strokeWidth={3} /></button>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Jumlah</p>
                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatRupiah(unitPrice * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '18px 16px', marginBottom: '16px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Ringkasan Pembayaran</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Subtotal</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', color: '#64748b' }}>Total item</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{cartQuantity} pcs</span>
              </div>
              {shouldShowTaxRow && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>{taxReviewLabel}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rp {formatRupiah(taxAmount)}</span>
                </div>
              )}
              {shouldShowPaymentNote && (
                <div style={{ padding: '12px 14px', borderRadius: '16px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', marginBottom: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#9a3412', fontWeight: 700, margin: '0 0 4px' }}>Catatan pembayaran</p>
                  <p style={{ fontSize: '12px', color: '#c2410c', margin: 0 }}>
                    {paymentMethod === 'QRIS' && !taxSettings.applyToQris ? 'QRIS tidak dikenakan pajak tambahan.' : `Metode ini mengikuti pajak layanan ${taxSettings.rate}%.`}
                  </p>
                </div>
              )}
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '14px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Total Pembayaran</span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#ea580c' }}>Rp {formatRupiah(grandTotal)}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '18px 16px', marginBottom: '20px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Metode Bayar</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div onClick={() => setPaymentMethod('QRIS')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '18px 16px', borderRadius: '18px', border: paymentMethod === 'QRIS' ? '2px solid #ea580c' : '1px solid #e2e8f0', backgroundColor: paymentMethod === 'QRIS' ? '#fff7ed' : '#ffffff', cursor: 'pointer', minHeight: '120px' }}>
                  <CreditCard size={28} color={paymentMethod === 'QRIS' ? '#ea580c' : '#94a3b8'} style={{ marginBottom: '10px' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>QRIS</span>
                  <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{!taxSettings.enabled || !taxSettings.applyToQris ? 'Bayar lewat scan QR, total tanpa pajak tambahan.' : `Bayar lewat scan QR, pajak ${taxSettings.rate}% ikut dihitung.`}</span>
                </div>
                <div onClick={() => setPaymentMethod('Cash')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '18px 16px', borderRadius: '18px', border: paymentMethod === 'Cash' ? '2px solid #ea580c' : '1px solid #e2e8f0', backgroundColor: paymentMethod === 'Cash' ? '#fff7ed' : '#ffffff', cursor: 'pointer', minHeight: '120px' }}>
                  <Banknote size={28} color={paymentMethod === 'Cash' ? '#ea580c' : '#94a3b8'} style={{ marginBottom: '10px' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Tunai</span>
                  <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>Bayar di kasir setelah order dibuat.</span>
                </div>
              </div>
            </div>

            <button
              disabled={!paymentMethod}
              onClick={() => {
                if (!table || !paymentMethod) return;
                setTransactionInfo({
                  id: '',
                  total: grandTotal,
                  method: paymentMethod,
                  status: 'Menunggu Pembayaran',
                  tableId: table.id,
                  items: buildTransactionItems(cart, menus),
                  pending: true,
                  startedAt: new Date().toISOString(),
                });
                sessionStorage.setItem(BUYER_TRANSACTION_SESSION_KEY, JSON.stringify({
                  id: '',
                  total: grandTotal,
                  method: paymentMethod,
                  status: 'Menunggu Pembayaran',
                  tableId: table.id,
                  items: buildTransactionItems(cart, menus),
                  pending: true,
                  startedAt: new Date().toISOString(),
                } satisfies TransactionInfo));
                handleProcessOrder();
              }}
              style={{ width: '100%', padding: '18px', borderRadius: '18px', backgroundColor: !paymentMethod ? '#fdba74' : '#ea580c', color: 'white', fontSize: '17px', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: !paymentMethod ? 'none' : '0 10px 22px rgba(234, 88, 12, 0.26)', cursor: !paymentMethod ? 'not-allowed' : 'pointer', marginBottom: '16px' }}
            >
              Order Sekarang <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
