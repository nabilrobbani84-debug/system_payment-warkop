import { useState } from 'react';
import { Lock, Eye, EyeOff, Coffee, ShieldAlert, UserPlus, LogIn, CheckCircle } from 'lucide-react';
import { loginAdmin, registerAdmin, resetAdminPassword, loginWithGoogleAdmin } from '../store/dataManager';
import { setAdminSession } from './adminSession';

type Mode = 'login' | 'register' | 'forgot-password';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    setShowConfirm(false);
    setRegisterSuccess(false);
    setResetSuccess(false);
  };

  const switchMode = (m: Mode) => {
    resetForm();
    setMode(m);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { user, error } = await loginAdmin(username, password);
      if (user) {
        setAdminSession(user.username);
        onSuccess();
      } else {
        setError(error || 'Email atau password salah!');
        triggerShake();
      }
    } catch {
      setError('Terjadi kesalahan, coba lagi.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { user, error } = await loginWithGoogleAdmin();
      if (user) {
        setAdminSession(user.username);
        onSuccess();
      } else {
        setError(error || 'Login Google dibatalkan atau gagal.');
        triggerShake();
      }
    } catch {
      setError('Terjadi kesalahan saat login Google.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok!');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const errMsg = await registerAdmin(username, password);
      if (errMsg) {
        setError(errMsg);
        triggerShake();
      } else {
        setRegisterSuccess(true);
        // Auto switch ke login setelah 2 detik
        setTimeout(() => {
          switchMode('login');
          setUsername(username); // prefill username
        }, 2000);
      }
    } catch {
      setError('Terjadi kesalahan saat mendaftar, coba lagi.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);
    try {
      const errMsg = await resetAdminPassword(username);
      if (errMsg) {
        setError(errMsg);
        triggerShake();
      } else {
        setResetSuccess(true);
        setTimeout(() => {
          switchMode('login');
          setUsername(username);
        }, 2000);
      }
    } catch {
      setError('Terjadi kesalahan saat mereset password, coba lagi.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px',
      }}>

        {/* Logo & Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            backgroundColor: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Coffee size={36} color="white" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            {mode === 'login' ? 'Admin Panel' : mode === 'register' ? 'Daftar Akun Admin' : 'Reset Password'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: 500 }}>
            {mode === 'login' ? 'Login untuk mengakses dashboard admin' : mode === 'register' ? 'Buat akun admin baru' : 'Masukkan username dan password baru kamu'}
          </p>
        </div>

        {/* Toggle Login / Register */}
        <div style={{
          display: 'flex',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '4px',
          width: '100%',
          border: '1px solid #334155',
        }}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: mode === 'login' ? '#ea580c' : 'transparent',
              color: mode === 'login' ? 'white' : '#64748b',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <LogIn size={16} />
            Masuk
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: mode === 'register' ? '#ea580c' : 'transparent',
              color: mode === 'register' ? 'white' : '#64748b',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <UserPlus size={16} />
            Daftar
          </button>
        </div>

        {/* Card Form */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '24px',
            padding: '32px 28px',
            border: '1px solid #334155',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            animation: shake ? 'shake 0.4s ease' : 'none',
          }}
        >
          {/* Register Success Banner */}
          {registerSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#052e16',
              border: '1px solid #166534',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '24px',
              animation: 'fadeIn 0.3s ease',
            }}>
              <CheckCircle size={20} color="#22c55e" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#86efac', margin: '0 0 2px 0' }}>Registrasi Berhasil! 🎉</p>
                <p style={{ fontSize: '12px', color: '#4ade80', margin: 0 }}>Akun tersimpan di database. Mengalihkan ke login...</p>
              </div>
            </div>
          )}

          {/* Reset Success Banner */}
          {resetSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#052e16',
              border: '1px solid #166534',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '24px',
              animation: 'fadeIn 0.3s ease',
            }}>
              <CheckCircle size={20} color="#22c55e" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#86efac', margin: '0 0 2px 0' }}>Bantuan Reset Terkirim! 🎉</p>
                <p style={{ fontSize: '12px', color: '#4ade80', margin: 0 }}>Silakan periksa inbox email Anda untuk mereset password.</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && !registerSuccess && !resetSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#450a0a',
              border: '1px solid #7f1d1d',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              animation: 'fadeIn 0.3s ease',
            }}>
              <ShieldAlert size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan email (contoh: admin@warkop.com)"
                  required
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button id="admin-login-btn" type="submit" disabled={isLoading} style={submitBtn(isLoading)}>
                <Lock size={16} />
                {isLoading ? 'Memverifikasi...' : 'Masuk ke Admin'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>ATAU</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: '1px solid #e2e8f0',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'background-color 0.2s ease',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Masuk dengan Google
              </button>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ea580c',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  Lupa Password?
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan email terdaftar"
                  required
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button id="admin-reset-btn" type="submit" disabled={isLoading || resetSuccess} style={submitBtn(isLoading || resetSuccess)}>
                <ShieldAlert size={16} />
                {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  Kembali ke Login
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  id="reg-email"
                  type="email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Gunakan email aktif"
                  required
                  autoComplete="email"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.15)'; }}
                  onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Konfirmasi Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    required
                    autoComplete="new-password"
                    style={{
                      ...inputStyle,
                      paddingRight: '48px',
                      borderColor: confirmPassword && confirmPassword !== password ? '#ef4444' : '#334155',
                    }}
                    onFocus={e => { e.target.style.borderColor = confirmPassword !== password ? '#ef4444' : '#ea580c'; e.target.style.boxShadow = '0 0 0 3px rgba(234,88,12,0.15)'; }}
                    onBlur={e => { e.target.style.borderColor = confirmPassword && confirmPassword !== password ? '#ef4444' : '#334155'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: '12px', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                    ⚠ Password tidak cocok
                  </p>
                )}
              </div>

              <button id="admin-register-btn" type="submit" disabled={isLoading || registerSuccess} style={submitBtn(isLoading || registerSuccess)}>
                <UserPlus size={16} />
                {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
              </button>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: '12px', color: '#475569', textAlign: 'center', margin: 0 }}>
          Hanya admin yang dapat mengakses panel ini
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ==================== SHARED STYLES ====================
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid #334155',
  backgroundColor: '#0f172a',
  color: '#f1f5f9',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const eyeBtn: React.CSSProperties = {
  position: 'absolute',
  right: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  color: '#64748b',
};

const submitBtn = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '16px',
  borderRadius: '14px',
  backgroundColor: disabled ? '#475569' : '#ea580c',
  color: 'white',
  fontWeight: 800,
  fontSize: '15px',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  transition: 'all 0.2s ease',
  marginTop: '4px',
});
