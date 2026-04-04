import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import {
  type AlertOptions,
  type ConfirmOptions,
  FeedbackContext,
  type FeedbackContextValue,
  type ToastOptions,
  type ToastVariant,
} from './feedbackContext';

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant' | 'durationMs'>> {
  id: number;
  description: string;
}

interface ConfirmState extends Required<Pick<ConfirmOptions, 'title' | 'confirmLabel' | 'cancelLabel' | 'variant'>> {
  description: string;
  resolve: (value: boolean) => void;
}

interface AlertState extends Required<Pick<AlertOptions, 'title' | 'buttonLabel'>> {
  description: string;
  resolve: () => void;
}

const variantStyles: Record<ToastVariant, { background: string; color: string; border: string; icon: ReactNode }> = {
  success: {
    background: '#f0fdf4',
    color: '#166534',
    border: '#bbf7d0',
    icon: <CheckCircle2 size={18} color="#16a34a" />,
  },
  error: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca',
    icon: <TriangleAlert size={18} color="#dc2626" />,
  },
  info: {
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '#bfdbfe',
    icon: <Info size={18} color="#2563eb" />,
  },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const idRef = useRef(0);

  const closeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    idRef.current += 1;
    const id = idRef.current;
    const nextToast: ToastItem = {
      id,
      title: options.title,
      description: options.description || '',
      variant: options.variant || 'info',
      durationMs: options.durationMs ?? 2800,
    };

    setToasts((current) => [...current, nextToast]);
    window.setTimeout(() => closeToast(id), nextToast.durationMs);
  }, [closeToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        title: options.title,
        description: options.description || '',
        confirmLabel: options.confirmLabel || 'Lanjutkan',
        cancelLabel: options.cancelLabel || 'Batal',
        variant: options.variant || 'default',
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({
        title: options.title,
        description: options.description || '',
        buttonLabel: options.buttonLabel || 'Tutup',
        resolve,
      });
    });
  }, []);

  const contextValue = useMemo<FeedbackContextValue>(() => ({
    toast,
    confirm,
    alert,
  }), [alert, confirm, toast]);

  const handleConfirmClose = (accepted: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(accepted);
    setConfirmState(null);
  };

  const handleAlertClose = () => {
    if (!alertState) return;
    alertState.resolve();
    setAlertState(null);
  };

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}

      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px', width: 'calc(100vw - 40px)', pointerEvents: 'none' }}>
        {toasts.map((item) => {
          const style = variantStyles[item.variant];
          return (
            <div
              key={item.id}
              style={{
                backgroundColor: style.background,
                color: style.color,
                border: `1px solid ${style.border}`,
                borderRadius: '18px',
                padding: '14px 16px',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ marginTop: '2px' }}>{style.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>{item.title}</p>
                {item.description && <p style={{ margin: '4px 0 0', fontSize: '12px', lineHeight: 1.5 }}>{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => closeToast(item.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: style.color, padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, backgroundColor: 'rgba(15, 23, 42, 0.56)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: confirmState.variant === 'danger' ? '#fef2f2' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertTriangle size={24} color={confirmState.variant === 'danger' ? '#dc2626' : '#ea580c'} />
            </div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 800 }}>{confirmState.title}</h3>
            {confirmState.description && <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>{confirmState.description}</p>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                style={{ flex: 1, border: 'none', borderRadius: '14px', padding: '14px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                style={{ flex: 1, border: 'none', borderRadius: '14px', padding: '14px', backgroundColor: confirmState.variant === 'danger' ? '#dc2626' : '#ea580c', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertState && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, backgroundColor: 'rgba(15, 23, 42, 0.56)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '380px', backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Info size={24} color="#2563eb" />
            </div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 800 }}>{alertState.title}</h3>
            {alertState.description && <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{alertState.description}</p>}
            <div style={{ marginTop: '24px' }}>
              <button
                type="button"
                onClick={handleAlertClose}
                style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '14px', backgroundColor: '#0f172a', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                {alertState.buttonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
