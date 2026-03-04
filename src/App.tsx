import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { initializeData } from './store/dataManager';
import Buyer from './pages/Buyer';
import Kasir from './pages/Kasir';
import Admin from './pages/Admin';

function Home() {
  return (
    <div className="container min-h-screen flex flex-col justify-center items-center gap-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl md:text-4xl text-primary font-bold mb-2">Sistem Pemesanan Warkop Berbasis QR</h1>
        <p>Pilih mode aplikasi untuk memulai</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
        <Link to="/menu?meja=1" className="card flex flex-col items-center justify-center p-8 gap-4 hover:-translate-y-2">
          <div className="text-4xl">📱</div>
          <h2 className="text-xl font-bold">Mode Pembeli</h2>
          <p className="text-center text-xs">Simulasi scan QR Meja 1</p>
        </Link>
        <Link to="/kasir" className="card flex flex-col items-center justify-center p-8 gap-4 hover:-translate-y-2">
          <div className="text-4xl">💻</div>
          <h2 className="text-xl font-bold">Mode Kasir</h2>
          <p className="text-center text-xs">Kelola pesanan & buka meja</p>
        </Link>
        <Link to="/admin" className="card flex flex-col items-center justify-center p-8 gap-4 hover:-translate-y-2">
          <div className="text-4xl">⚙️</div>
          <h2 className="text-xl font-bold">Mode Admin</h2>
          <p className="text-center text-xs">Kelola menu, meja & laporan</p>
        </Link>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    initializeData();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Buyer />} />
        <Route path="/kasir" element={<Kasir />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
