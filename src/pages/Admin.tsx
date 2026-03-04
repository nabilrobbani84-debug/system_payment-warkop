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
  listenToDataChanges
} from '../store/dataManager';
import { Settings, Plus, Edit, Trash2, Download, Table2, Coffee, FileText, TrendingUp, Search } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Tab = 'dashboard' | 'menu' | 'table';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  const loadData = () => {
    setMenus(getMenus());
    setTables(getTables());
    setOrders(getOrders());
  };

  useEffect(() => {
    loadData();
    const cleanup = listenToDataChanges(loadData);
    return cleanup;
  }, []);

  // Compute Dashboard Stats
  const completedOrders = orders.filter(o => o.status === 'Selesai' || o.status === 'Lunas/Diproses');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCash = completedOrders.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalQris = completedOrders.filter(o => o.paymentMethod === 'QRIS').reduce((sum, o) => sum + o.totalAmount, 0);

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
      image: formData.get('image') as string || 'https://via.placeholder.com/300x200?text=Menu+Image'
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
  };

  const handleDownloadQR = (tableNum: number) => {
    // In a real app, you'd convert SVg to PNG or trigger a print dialog
    alert(`Mencetak QR code untuk Meja ${tableNum}... (Simulasi)`);
  };

  return (
    <div className="flex h-screen bg-bg-color overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border h-full flex flex-col z-10 shadow-lg">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Settings className="text-primary" size={24} />
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button 
            className={`btn justify-start w-full py-3 ${activeTab === 'dashboard' ? 'btn-outline text-primary border-primary bg-primary/10 font-bold shadow-md' : 'text-secondary hover:bg-surface-light hover:text-white'}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <TrendingUp size={20} /> Laporan & Transaksi
          </button>
          <button 
            className={`btn justify-start w-full py-3 ${activeTab === 'menu' ? 'btn-outline text-primary border-primary bg-primary/10 font-bold shadow-md' : 'text-secondary hover:bg-surface-light hover:text-white'}`}
            onClick={() => setActiveTab('menu')}
          >
            <Coffee size={20} /> Kelola Menu
          </button>
          <button 
            className={`btn justify-start w-full py-3 ${activeTab === 'table' ? 'btn-outline text-primary border-primary bg-primary/10 font-bold shadow-md' : 'text-secondary hover:bg-surface-light hover:text-white'}`}
            onClick={() => setActiveTab('table')}
          >
            <Table2 size={20} /> Kelola Meja & QR
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 animate-fade-in relative z-0">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Ringkasan Hari Ini</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card bg-gradient-to-br from-surface to-surface-light border-l-4 border-l-primary shadow-lg p-6">
                <p className="text-secondary text-sm mb-2 font-medium">Total Omzet</p>
                <p className="text-3xl font-bold text-white mb-2 tracking-tight">Rp {totalRevenue.toLocaleString('id-ID')}</p>
                <div className="badge badge-success px-3">{completedOrders.length} Transaksi</div>
              </div>
              <div className="card bg-gradient-to-br from-surface to-surface-light border-l-4 border-l-info shadow-lg p-6">
                <p className="text-secondary text-sm mb-2 font-medium">Omzet QRIS</p>
                <p className="text-3xl font-bold text-info mb-2 tracking-tight">Rp {totalQris.toLocaleString('id-ID')}</p>
                <p className="text-xs text-secondary mt-1">Non-Tunai Masuk</p>
              </div>
              <div className="card bg-gradient-to-br from-surface to-surface-light border-l-4 border-l-warning shadow-lg p-6">
                <p className="text-secondary text-sm mb-2 font-medium">Omzet Tunai (Cash)</p>
                <p className="text-3xl font-bold text-warning mb-2 tracking-tight">Rp {totalCash.toLocaleString('id-ID')}</p>
                <p className="text-xs text-secondary mt-1">Uang Kasir</p>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 mt-8">
              <FileText size={20} className="text-primary"/> Riwayat Transaksi Lunas
            </h3>
            <div className="card p-0 overflow-hidden shadow-lg border border-border">
              <table className="w-full text-left">
                <thead className="bg-surface-light">
                  <tr>
                    <th className="font-semibold text-secondary py-4 tracking-wider">ID TRANSAKSI</th>
                    <th className="font-semibold text-secondary py-4 tracking-wider">MEJA</th>
                    <th className="font-semibold text-secondary py-4 tracking-wider">WAKTU</th>
                    <th className="font-semibold text-secondary py-4 tracking-wider">METODE</th>
                    <th className="font-semibold text-secondary py-4 tracking-wider text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-secondary">
                        <div className="flex flex-col items-center justify-center opacity-70">
                          <Search size={32} className="mb-2"/>
                          Tidak ada transaksi lunas
                        </div>
                      </td>
                    </tr>
                  ) : (
                    completedOrders.map(order => {
                      const table = tables.find(t => t.id === order.tableId);
                      return (
                        <tr key={order.id} className="hover:bg-white/5 border-b border-border/50">
                          <td className="font-mono text-sm py-3 px-4 text-white">{order.id}</td>
                          <td className="py-3 px-4 font-bold">Meja {table?.number || '?'}</td>
                          <td className="py-3 px-4 text-sm text-secondary">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="py-3 px-4">
                            <span className={`badge ${order.paymentMethod === 'Cash' ? 'badge-warning' : 'badge-info'}`}>
                              {order.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-white">Rp {order.totalAmount.toLocaleString('id-ID')}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manajemen Menu</h2>
              <button 
                className="btn btn-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-1"
                onClick={() => { setEditingMenu(null); setIsMenuModalOpen(true); }}
              >
                <Plus size={18} /> Tambah Menu Baru
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menus.map(menu => (
                <div key={menu.id} className={`card p-0 overflow-hidden flex flex-col shadow-md hover:shadow-xl transition-all ${!menu.available ? 'opacity-60 grayscale-[50%]' : ''}`}>
                  <img src={menu.image} alt={menu.name} className="w-full h-40 object-cover" />
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold whitespace-nowrap overflow-hidden text-ellipsis mr-2">{menu.name}</h3>
                      {!menu.available && <span className="badge badge-danger text-xs whitespace-nowrap">Habis</span>}
                    </div>
                    <p className="text-xs text-secondary mb-4">{menu.category}</p>
                    <p className="font-bold text-lg text-warning mt-auto mb-4">Rp {menu.price.toLocaleString('id-ID')}</p>
                    
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-outline flex-1 py-1.5 px-3 text-xs" 
                        onClick={() => { setEditingMenu(menu); setIsMenuModalOpen(true); }}
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        className="btn btn-danger py-1.5 px-3" 
                        onClick={() => handleDeleteMenu(menu.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'table' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Manajemen Meja & QR Code</h2>
              <button className="btn btn-primary shadow-lg shadow-primary/20 transition-all hover:-translate-y-1" onClick={handleAddTable}>
                <Plus size={18} /> Tambah Meja
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {tables.map(table => {
                const qrUrl = `${window.location.origin}/menu?meja=${table.number}`;
                return (
                  <div key={table.id} className="card flex flex-col items-center p-6 text-center hover:shadow-lg transition-all border-border shadow-sm">
                    <h3 className="font-bold text-2xl mb-4">Meja {table.number}</h3>
                    
                    <div className="bg-white p-4 rounded-xl shadow-inner mb-4">
                      <QRCodeSVG value={qrUrl} size={150} level="M" />
                    </div>
                    
                    <p className="text-xs text-secondary mb-6 break-all line-clamp-2 px-4 select-all">{qrUrl}</p>
                    
                    <button className="btn btn-outline w-full hover:bg-white hover:text-black border-white/20 transition-all" onClick={() => handleDownloadQR(table.number)}>
                      <Download size={18} /> Unduh QR
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Full Modal Overlay */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card w-full max-w-md bg-surface shadow-2xl border-border">
            <h2 className="text-xl font-bold mb-6 border-b border-border pb-4">{editingMenu ? 'Edit Menu' : 'Tambah Menu'}</h2>
            <form onSubmit={handleSaveMenu} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm mb-1 font-medium text-secondary">Nama Menu</label>
                <input required name="name" type="text" className="input" defaultValue={editingMenu?.name} placeholder="Misal: Kopi Hitam"/>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium text-secondary">Harga (Rp)</label>
                <input required name="price" type="number" className="input" defaultValue={editingMenu?.price} placeholder="Misal: 15000"/>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium text-secondary">Kategori</label>
                <select name="category" className="input bg-surface-light border-border focus:border-primary" defaultValue={editingMenu?.category || 'Minuman'}>
                  <option value="Minuman">Minuman</option>
                  <option value="Makanan">Makanan</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium text-secondary">URL Gambar (Opsional)</label>
                <input name="image" type="url" className="input text-xs" defaultValue={editingMenu?.image} placeholder="https://example.com/image.jpg"/>
              </div>
              <div className="flex items-center gap-2 mt-2 bg-surface-light p-3 rounded-lg border border-border">
                <input type="checkbox" name="available" id="available" defaultChecked={editingMenu ? editingMenu.available : true} className="w-5 h-5 accent-primary"/>
                <label htmlFor="available" className="font-medium">Menu Tersedia (Stok Ada)</label>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                <button type="button" className="btn btn-outline" onClick={() => setIsMenuModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary px-6">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
