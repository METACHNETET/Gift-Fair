import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GiftFairApp } from './App.tsx';
import AdminPage from './AdminPage.tsx';
import FairHub from './FairHub.tsx';
import SummerFairGame from './games/summerfair/SummerFairGame.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { Toaster } from '../components/ui/sonner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FairHub />} />
          <Route path="/giftfair" element={<GiftFairApp />} />
          <Route path="/summerfair" element={<SummerFairGame />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
