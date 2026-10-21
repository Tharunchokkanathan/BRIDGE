import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export const ToastProvider: React.FC = () => {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--ink)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          fontFamily: 'var(--font-sans)',
          fontSize: '13px',
          boxShadow: 'var(--shadow-menu)',
          padding: '12px 14px',
        },
        className: 'bridge-toast',
      }}
    />
  );
};
