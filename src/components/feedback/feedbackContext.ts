import { createContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

export interface AlertOptions {
  title: string;
  description?: string;
  buttonLabel?: string;
}

export interface FeedbackContextValue {
  toast: (options: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);
