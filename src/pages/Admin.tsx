import { useState, useEffect } from 'react';
import { 
  getMenus, 
  saveMenus, 
  getTables, 
  saveTables, 
  getOrders, 
  type MenuItem, 
  type Table, 
  type Order, 
  type MenuCategory,
  listenToDataChanges,
  getSheetAppUrl,
  saveSheetAppUrl,
  getSheetPubUrl,
  saveSheetPubUrl,
  getDailyToken
} from '../store/dataManager';
import { Settings, Plus, Edit, Trash2, Download, Table2, FileText, TrendingUp, QrCode, Calculator, Users, Clock, Home, PieChart, BarChart3, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

type Tab = 'dashboard' | 'menu' | 'table' | 'laporan';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [sheetAppUrl, setSheetAppUrl] = useState('');
  const [sheetPubUrl, setSheetPubUrl] = useState('');

  const [tableToDelete, setTableToDelete] = useState<{id: string, number: number} | null>(null);

  const loadData = () => {
    setMenus(getMenus());
    setTables(getTables());
    setOrders(getOrders());
    setSheetAppUrl(getSheetAppUrl());
    setSheetPubUrl(getSheetPubUrl());
  };

  useEffect(() => {
    loadData();
    const cleanup = listenToDataChanges(loadData);
    return cleanup;
  }, []);

  // Compute Dashboard Stats
  const completedOrders = orders.filter(o => o.status === 'Selesai' || o.status === 'Lunas/Diproses');
  const activeOrders = orders.filter(o => o.status === 'Menunggu Pembayaran');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const occupiedTables = tables.filter(t => t.status === 'Aktif/Unpaid');

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
      // Using a placeholder image if not provided for simplicity
      image: formData.get('image') as string || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400'
    };

    let updatedMenus;
    if (editingMenu) {
      updatedMenus = menus.map(m => m.id === newMenu.id ? newMenu : m);
    } else {
      updatedMenus = [...menus, newMenu];
    }
    
    saveMenus(updatedMenus);
    setMenus(updatedMenus);
    setIsMenuModalOpen(false);
    setEditingMenu(null);
  };

  const handleDeleteMenu = (id: string) => {
    if (!confirm('Yakin hapus menu ini?')) return;
    const updated = menus.filter(m => m.id !== id);
    saveMenus(updated);
    setMenus(updated);
  };

  // Table Management
  const handleAddTable = () => {
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    const newTable: Table = {
      id: `t${Date.now()}`,
      number: nextNum,
      status: 'Tersedia'
    };
    const updated = [...tables, newTable];
    saveTables(updated);
    setTables(updated);
    
    // User feedback so they know the table was added
    alert(`Meja ${nextNum.toString().padStart(2, '0')} berhasil ditambahkan!`);
    
    // Auto scroll to the very bottom to show the newly added table
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const confirmDeleteTable = (id: string, number: number) => {
    // Jangan izinkan hapus jika ada pesanan belum lunas
    const isActive = orders.some(o => o.tableId === id && o.status === 'Menunggu Pembayaran');
    if (isActive) {
      alert(`Meja ${number} sedang aktif / ada pesanan belum dibayar. Selesaikan dulu di Kasir.`);
      return;
    }

    // Tampilkan custom confirmation modal
    setTableToDelete({ id, number });
  };

  const executeDeleteTable = () => {
    if (!tableToDelete) return;
    const updated = tables.filter(t => t.id !== tableToDelete.id);
    saveTables(updated);
    setTables(updated);
    setTableToDelete(null);
  };

  const handleDownloadQR = async (tableNum: number) => {
    const qrElement = document.getElementById(`qr-meja-${tableNum}`);
    if (!qrElement) return;

    try {
      // Tunggu sebentar untuk memastikan render SVG selesai
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(qrElement, {
        backgroundColor: '#ffffff',
        scale: 2 // Resolusi tinggi
      });
      
      const link = document.createElement('a');
      link.download = `QR-Meja-${tableNum.toString().padStart(2, '0')}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link); // Penting untuk beberapa browser
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Gagal mendownload QR:', err);
      alert('Gagal mengekspor gambar QR.');
    }
  };

  const handleDownloadPDF = () => {
    if (!sheetPubUrl) {
      alert("Silakan atur URL Spreadsheet terlebih dahulu (Klik ikon Setting di section Laporan).");
      setIsSheetModalOpen(true);
      return;
    }
    
    let pdfUrl = sheetPubUrl;
    if (pdfUrl.includes('/edit')) {
      pdfUrl = pdfUrl.replace(/\/edit.*$/, '/export?format=pdf');
    }
    window.open(pdfUrl, '_blank');
  };

  const handleSaveSheetConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const appUrl = (formData.get('appUrl') as string).trim();
    const pubUrl = (formData.get('pubUrl') as string).trim();
    
    saveSheetAppUrl(appUrl);
    saveSheetPubUrl(pubUrl);
    setSheetAppUrl(appUrl);
    setSheetPubUrl(pubUrl);
    setIsSheetModalOpen(false);
    alert('Konfigurasi Google Sheet berhasil disimpan!');
  };

  // Computations for Laporan Omzet
  const totalTransaksi = completedOrders.length;
  
  // Calculate Metode Utama
  const methodCounts = completedOrders.reduce((acc, order) => {
    const method = order.paymentMethod || 'Cash';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const metodeUtama = Object.keys(methodCounts).length > 0 
    ? Object.keys(methodCounts).reduce((a, b) => methodCounts[a] > methodCounts[b] ? a : b) 
    : '-';
  const metodeUtamaVolume = totalTransaksi > 0 && metodeUtama !== '-'
    ? Math.round((methodCounts[metodeUtama] / totalTransaksi) * 100)
    : 0;

  // Category Revenue
  const categoryRevenue = { COFFEE: 0, FOOD: 0, SNACKS: 0 };
  const menuSales: Record<string, { qty: number, revenue: number, name: string, category: string, id: string }> = {};

  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const menu = menus.find(m => m.id === item.menuId);
      if (menu) {
        let cat = 'SNACKS';
        if (menu.category === 'Minuman') cat = 'COFFEE';
        else if (menu.category === 'Makanan') cat = 'FOOD';

        const rev = item.quantity * menu.price;
        categoryRevenue[cat as keyof typeof categoryRevenue] += rev;

        if (!menuSales[menu.id]) {
          menuSales[menu.id] = { qty: 0, revenue: 0, name: menu.name, category: cat, id: menu.id };
        }
        menuSales[menu.id].qty += item.quantity;
        menuSales[menu.id].revenue += rev;
      }
    });
  });

  const topMenus = Object.values(menuSales)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const maxMenuQty = topMenus.length > 0 ? topMenus[0].qty : 1;

  const formatCompact = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'rb';
    return value.toString();
  };

  // Inline styling for the wrapper to force the mobile light theme from the screenshot
  const wrapperStyle = {
    backgroundColor: '#f8f9fa',
    color: '#0f172a',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif"
  };

  return (
    <div style={wrapperStyle} className="flex justify-center pb-20">
      <div className="w-full max-w-md bg-[#f8f9fa] min-h-screen relative shadow-2xl">
        
        {/* Header */}
        {activeTab === 'laporan' ? (
          <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ArrowLeft size={24} color="#0f172a" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }} />
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Laporan Omzet</h1>
            </div>
            <button onClick={handleDownloadPDF} style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(234, 88, 12, 0.2)' }}>
              <Download size={14} /> PDF
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 40 }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>Halo, Admin!</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fdba74' }}>
              <Users size={20} color="#ea580c" />
            </div>
          </div>
        )}

        <div style={{ padding: '0 20px 100px' }}>
          
          {/* Main Content Area Based on Tabs */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="#ea580c" /> Status Warung Saat Ini
              </h2>

              {/* Main Revenue Card */}
              <div style={{ backgroundColor: '#e27515', borderRadius: '20px', padding: '24px', color: 'white', marginBottom: '16px', boxShadow: '0 10px 25px -5px rgba(234, 88, 12, 0.4)' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, marginBottom: '8px' }}>Omzet Hari Ini</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>Rp</span>
                  <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px' }}>{totalRevenue.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                  <TrendingUp size={12} /> +8.2% dari target
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '8px' }}>MEJA TERISI</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{occupiedTables.length}/{tables.length}</span>
                    {tables.length > 0 && (
                       <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', fontSize: '10px', fontWeight: 700, padding: '4px 6px', borderRadius: '6px' }}>
                         {Math.round((occupiedTables.length / tables.length) * 100)}%
                       </span>
                    )}
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '8px' }}>PESANAN AKTIF</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#ea580c' }}>{activeOrders.length}</span>
                    <Clock size={14} color="#ea580c" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Quick Action</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                <div onClick={() => { setActiveTab('menu'); setTimeout(() => setIsMenuModalOpen(true), 100); }} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={20} color="#ea580c" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Tambah Menu</span>
                </div>
                <div onClick={() => setActiveTab('table')} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <QrCode size={20} color="#4f46e5" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Cetak QR</span>
                </div>
                <div onClick={() => window.location.href = '/kasir'} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calculator size={20} color="#16a34a" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Buka Kasir</span>
                </div>
              </div>

              {/* Status Meja Quick View */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Status Meja</h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div> Tersedia
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ea580c' }}></div> Terisi
                  </div>
                </div>
              </div>
              
              <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {tables.map(table => {
                    const isOccupied = table.status === 'Aktif/Unpaid';
                    return (
                      <div key={table.id} onClick={() => setActiveTab('table')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: isOccupied ? '#ea580c' : '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', boxShadow: isOccupied ? '0 4px 10px rgba(234, 88, 12, 0.3)' : '0 4px 10px rgba(34, 197, 94, 0.3)' }}>
                          <Table2 size={24} color="white" />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>T-{table.number.toString().padStart(2, '0')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Kelola Menu</h2>
                <button 
                  onClick={() => { setEditingMenu(null); setIsMenuModalOpen(true); }}
                  style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(234, 88, 12, 0.2)' }}
                >
                  <Plus size={16} /> Tambah Menu
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {menus.map(menu => (
                  <div key={menu.id} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <img src={menu.image} alt={menu.name} style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', opacity: menu.available ? 1 : 0.5 }} />
                    <div style={{ marginLeft: '16px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{menu.name}</h3>
                        {!menu.available && <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>Habis</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>{menu.category}</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#ea580c', margin: 0 }}>Rp {menu.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '12px' }}>
                      <button onClick={() => { setEditingMenu(menu); setIsMenuModalOpen(true); }} style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteMenu(menu.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'table' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Kelola Meja</h2>
                <button 
                  onClick={handleAddTable}
                  style={{ backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(234, 88, 12, 0.2)' }}
                >
                  <Plus size={16} /> Tambah Meja
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {tables.map(table => {
                  const token = getDailyToken();
                  const qrUrl = `${window.location.origin}/menu?meja=${table.number}&token=${token}`;
                  return (
                    <div key={table.id} style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDeleteTable(table.id, table.number);
                        }}
                        style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', zIndex: 10 }}
                      >
                        <Trash2 size={16} />
                      </button>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>Meja {table.number.toString().padStart(2, '0')}</h3>
                      <div id={`qr-meja-${table.number}`} style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', marginBottom: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', color: '#ea580c' }}>MEJA {table.number.toString().padStart(2, '0')}</h4>
                        <QRCodeSVG value={qrUrl} size={120} level="M" />
                      </div>
                      <button 
                        onClick={() => handleDownloadQR(table.number)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <Download size={14} /> Unduh QR
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'laporan' && (
            <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
              
              {/* Ringkasan Hari Ini */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Ringkasan Hari Ini</h2>
                  <Settings size={16} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setIsSheetModalOpen(true)} />
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>

              {/* Card Total Omzet */}
              <div style={{ backgroundColor: '#f97316', borderRadius: '16px', padding: '24px', color: 'white', marginBottom: '16px', boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.3)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0', opacity: 0.9 }}>Total Omzet</p>
                <h3 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>Rp {totalRevenue.toLocaleString('id-ID')}</h3>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.25)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                  <TrendingUp size={12} strokeWidth={3} /> +12.5% vs kemarin
                </div>
              </div>

              {/* Mini Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: '0 0 8px 0' }}>Total Transaksi</p>
                  <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>{totalTransaksi}</h4>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', margin: 0 }}>+5 orders</p>
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, margin: '0 0 8px 0' }}>Metode Utama</p>
                  <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c', margin: '0 0 6px 0' }}>{metodeUtama.toUpperCase()}</h4>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>{metodeUtamaVolume}% Volume</p>
                </div>
              </div>

              {/* Revenue by Category */}
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px 0' }}>Revenue by Category</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                  <div style={{ borderRight: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#4472c4', margin: '0 0 16px 0', letterSpacing: '0.5px' }}>COFFEE</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>Coffee</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatCompact(categoryRevenue.COFFEE)}</p>
                  </div>
                  <div style={{ borderRight: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#4472c4', margin: '0 0 16px 0', letterSpacing: '0.5px' }}>FOOD</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>Food</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatCompact(categoryRevenue.FOOD)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: '#4472c4', margin: '0 0 16px 0', letterSpacing: '0.5px' }}>SNACKS</p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>Snacks</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Rp {formatCompact(categoryRevenue.SNACKS)}</p>
                  </div>
                </div>
              </div>

              {/* Menu Terlaris */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Menu Terlaris</h3>
                <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700 }}>Top 5</span>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px 20px 8px 20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '24px' }}>
                {topMenus.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '12px' }}>Belum ada data penjualan</p>
                ) : (
                  topMenus.map((menu, idx) => (
                    <div key={idx} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{menu.name}</p>
                          <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>{menu.category} • {menu.qty} SOLD</p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Rp {menu.revenue.toLocaleString('id-ID')}</p>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(menu.qty / maxMenuQty) * 100}%`, height: '100%', backgroundColor: ['#ea580c', '#f97316', '#fdba74', '#fed7aa', '#ffedd5'][idx] || '#ffedd5', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Daftar Transaksi */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Daftar Transaksi</h3>
                <span style={{ fontSize: '12px', color: '#ea580c', fontWeight: 600 }}>Lihat Semua</span>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>WAKTU</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>MEJA</th>
                      <th style={{ padding: '16px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>METODE</th>
                      <th style={{ padding: '16px 12px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>Belum ada transaksi</td>
                      </tr>
                    ) : (
                       completedOrders.slice(0, 5).map(order => {
                         const table = tables.find(t => t.id === order.tableId);
                         const isQris = order.paymentMethod === 'QRIS';
                         const timeStr = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
                         return (
                           <tr key={order.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                             <td style={{ padding: '16px 12px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{timeStr}</td>
                             <td style={{ padding: '16px 12px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>T-{table?.number.toString().padStart(2, '0') || '??'}</td>
                             <td style={{ padding: '16px 12px' }}>
                               <span style={{ display: 'inline-block', backgroundColor: isQris ? '#e0e7ff' : '#dcfce7', color: isQris ? '#4f46e5' : '#16a34a', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>
                                 {order.paymentMethod || 'CASH'}
                               </span>
                             </td>
                             <td style={{ padding: '16px 12px', textAlign: 'right', fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>
                               {order.totalAmount.toLocaleString('id-ID')}
                             </td>
                           </tr>
                         )
                       })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '448px', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '12px 0 20px', borderTop: '1px solid #e5e7eb', zIndex: 50 }}>
          <div onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'dashboard' ? '#ea580c' : '#94a3b8', cursor: 'pointer' }}>
            <Home size={22} color={activeTab === 'dashboard' ? '#ea580c' : '#94a3b8'} style={{ strokeWidth: activeTab === 'dashboard' ? 2.5 : 2 }} />
            <span style={{ fontSize: '10px', fontWeight: activeTab === 'dashboard' ? 800 : 700, letterSpacing: '0.5px' }}>HOME</span>
          </div>
          <div onClick={() => setActiveTab('menu')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'menu' ? '#ea580c' : '#94a3b8', cursor: 'pointer' }}>
            <FileText size={22} color={activeTab === 'menu' ? '#ea580c' : '#94a3b8'} style={{ strokeWidth: activeTab === 'menu' ? 2.5 : 2 }} />
            <span style={{ fontSize: '10px', fontWeight: activeTab === 'menu' ? 800 : 700, letterSpacing: '0.5px' }}>MENU</span>
          </div>
          <div onClick={() => setActiveTab('laporan')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'laporan' ? '#ea580c' : '#94a3b8', cursor: 'pointer' }}>
            <BarChart3 size={22} color={activeTab === 'laporan' ? '#ea580c' : '#94a3b8'} style={{ strokeWidth: activeTab === 'laporan' ? 2.5 : 2 }} />
            <span style={{ fontSize: '10px', fontWeight: activeTab === 'laporan' ? 800 : 700, letterSpacing: '0.5px' }}>LAPORAN</span>
          </div>
          <div onClick={() => window.location.href = '/kasir'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#94a3b8', cursor: 'pointer' }}>
            <Settings size={22} color="#94a3b8" style={{ strokeWidth: 2 }} />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>KASIR</span>
          </div>
        </div>

        {/* Modal Overlay Inline Styles (Overriding global) */}
        {isMenuModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '380px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
              <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Nama Menu</label>
                  <input required name="name" type="text" defaultValue={editingMenu?.name} placeholder="Misal: Es Kopi Susu" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#0f172a', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Harga (Rp)</label>
                  <input required name="price" type="number" defaultValue={editingMenu?.price} placeholder="Misal: 15000" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#0f172a', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Kategori</label>
                  <select name="category" defaultValue={editingMenu?.category || 'Minuman'} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#0f172a', outline: 'none', appearance: 'none' }}>
                    <option value="Minuman">Minuman</option>
                    <option value="Makanan">Makanan</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>URL Gambar Lengkap</label>
                  <input name="image" type="url" defaultValue={editingMenu?.image} placeholder="https://..." style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#0f172a', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', backgroundColor: '#fff7ed', padding: '12px', borderRadius: '12px', border: '1px solid #fdba74' }}>
                  <input type="checkbox" name="available" id="available" defaultChecked={editingMenu ? editingMenu.available : true} style={{ width: '18px', height: '18px', accentColor: '#ea580c' }} />
                  <label htmlFor="available" style={{ fontSize: '13px', fontWeight: 600, color: '#ea580c' }}>Stok Tersedia</label>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setIsMenuModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Batal</button>
                  <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#ea580c', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Sheet Configuration */}
        {isSheetModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>Koneksi Google Sheet</h2>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Hubungkan laporan otomatis ke spreadsheet Anda.</p>
              <form onSubmit={handleSaveSheetConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>URL Spreadsheet Pembacaan (Google Sheet URL)</label>
                  <input name="pubUrl" type="url" defaultValue={sheetPubUrl} placeholder="https://docs.google.com/spreadsheets/d/..." style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '12px', color: '#0f172a', outline: 'none' }} />
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>Ini digunakan untuk mendownload PDF bulanan/harian.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Web App URL (Apps Script)</label>
                  <input name="appUrl" type="url" defaultValue={sheetAppUrl} placeholder="https://script.google.com/macros/s/.../exec" style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '12px', color: '#0f172a', outline: 'none' }} />
                  <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>Diperlukan agar setiap pembayaran selesai bisa sinkronisasi ke spreadsheet.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setIsSheetModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Batal</button>
                  <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#ea580c', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Simpan Konfigurasi</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus Meja */}
        {tableToDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '320px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>Hapus Meja?</h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                Anda yakin ingin menghapus <b>Meja {tableToDelete.number.toString().padStart(2, '0')}</b> beserta kodenya dari sistem? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setTableToDelete(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Batal</button>
                <button type="button" onClick={executeDeleteTable} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#ef4444', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
