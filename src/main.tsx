import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminPage from './AdminPage.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { Toaster } from '../components/ui/sonner';

const isAdminRoute = window.location.pathname === '/admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {isAdminRoute ? (
        <AdminPage />
      ) : (
        <>
          <App />
          <Toaster position="top-center" richColors />
        </>
      )}
    </AuthProvider>
  </StrictMode>,
);
