import { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import StaffPanel from './pages/staff/StaffPanel';
import LandingPage from './pages/LandingPage';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackingPage from './pages/TrackingPage';
import AboutPage from './pages/AboutPage';

function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <div key={location.pathname} className="page-fade-in">{children}</div>;
}

function App() {
  const location = useLocation();
  const isPanel = location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff');
  const isLogin = location.pathname === '/login';

  return (
    <>
      {!isPanel && !isLogin && <Navbar />}
      <Suspense fallback={<div className="page-loader"><div className="spinner" /></div>}>
        <Routes>
          <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
          <Route path="/menu" element={<PageWrapper><MenuPage /></PageWrapper>} />
          <Route path="/cart" element={<PageWrapper><CartPage /></PageWrapper>} />
          <Route path="/checkout" element={<PageWrapper><CheckoutPage /></PageWrapper>} />
          <Route path="/track" element={<PageWrapper><TrackingPage /></PageWrapper>} />
          <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/*" element={<AdminLayout />} />
          <Route path="/staff/*" element={<StaffPanel />} />
        </Routes>
      </Suspense>
      {!isPanel && !isLogin && <Footer />}
    </>
  );
}

export default App;
