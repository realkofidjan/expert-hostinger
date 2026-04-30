import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { AlertProvider } from './context/AlertContext';
import { SocketProvider } from './context/SocketContext';
import { WishlistProvider } from './context/WishlistContext';
import CartSidebar from './components/CartSidebar';
import PageLoader from './components/PageLoader';
import Home from './pages/Home';
import PublicProducts from './pages/PublicProducts';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Finance from './pages/admin/Finance';
import Products from './pages/admin/Products';
import Users from './pages/admin/Users';
import Categories from './pages/admin/Categories';
import Brands from './pages/admin/Brands';
import Blogs from './pages/admin/Blogs';
import AdminProjects from './pages/admin/Projects';
import Logs from './pages/admin/Logs';
import Discounts from './pages/admin/Discounts';
import AdminSettings from './pages/admin/Settings';
import Proforma from './pages/admin/Proforma';
import CreateOfflineOrder from './pages/admin/CreateOfflineOrder';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Profile from './pages/Profile';
import ProductDetail from './pages/ProductDetail';
import PublicProjects from './pages/Projects';
import BlogListing from './pages/BlogListing';
import BlogPost from './pages/BlogPost';
import CartPage from './pages/CartPage';
import OrderSuccess from './pages/OrderSuccess';
import UploadReceipt from './pages/UploadReceipt';
import Services from './pages/Services';
import UnderConstruction from './pages/UnderConstruction';
import VerifyEmailPage from './pages/VerifyEmailPage';
import WhatsAppButton from './components/WhatsAppButton';

// Fires PageLoader on every route change (skips the very first render — that's handled by the splash loader)
const RouteLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [loaderKey, setLoaderKey] = useState(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setLoading(true);
    setLoaderKey(k => k + 1);
  }, [location.pathname]);

  if (!loading) return null;
  return <PageLoader key={loaderKey} fast onDone={() => setLoading(false)} />;
};

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};

// Auth Guard — allows admin and staff
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('admin_user') || localStorage.getItem('user') || '{}');
  const role = (user.role || '').toLowerCase();

  if (!token) return <Navigate to="/admin/login" replace />;
  if (!['admin', 'staff', 'sub-admin'].includes(role)) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const ConditionalWhatsAppButton = () => {
  const location = useLocation();
  const isExcluded = location.pathname.startsWith('/admin');
  if (isExcluded) return null;
  return <WhatsAppButton />;
};

function App() {
  const [loading, setLoading] = useState(true);
  const [underConstruction, setUnderConstruction] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { if (data?.under_construction === 'true') setUnderConstruction(true); })
      .catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <SocketProvider>
        <AlertProvider>
          <WishlistProvider>
            <CartProvider>
              {loading && <PageLoader onDone={() => setLoading(false)} />}
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ScrollToTop />
                <RouteLoader />
                <CartSidebar />
                <Routes>
                  {/* ... routes ... */}
                  <Route path="/" element={underConstruction ? <UnderConstruction /> : <Home />} />
                  <Route path="/products" element={underConstruction ? <UnderConstruction /> : <PublicProducts />} />
                  <Route path="/projects" element={underConstruction ? <UnderConstruction /> : <PublicProjects />} />
                  <Route path="/services" element={underConstruction ? <UnderConstruction /> : <Services />} />
                  <Route path="/blog" element={underConstruction ? <UnderConstruction /> : <BlogListing />} />
                  <Route path="/blog/:id/:slug?" element={underConstruction ? <UnderConstruction /> : <BlogPost />} />
                  <Route path="/product/:id/:slug?" element={underConstruction ? <UnderConstruction /> : <ProductDetail />} />
                  <Route path="/products/:id" element={<Navigate to="/" replace />} /> {/* Legacy Redirect */}
                  <Route path="/cart" element={underConstruction ? <UnderConstruction /> : <CartPage />} />
                  <Route path="/order-success" element={underConstruction ? <UnderConstruction /> : <OrderSuccess />} />
                  <Route path="/upload-receipt" element={underConstruction ? <UnderConstruction /> : <UploadReceipt />} />
                  <Route path="/profile" element={underConstruction ? <UnderConstruction /> : <Profile />} />
                  <Route path="/login" element={underConstruction ? <UnderConstruction /> : <Login />} />
                  <Route path="/register" element={underConstruction ? <UnderConstruction /> : <Register />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />

                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route
                    path="/admin/*"
                    element={
                      <ProtectedRoute>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="categories" element={<Categories />} />
                          <Route path="brands" element={<Brands />} />
                          <Route path="products" element={<Products />} />
                          <Route path="discounts" element={<Discounts />} />
                          <Route path="orders" element={<Orders />} />
                          <Route path="orders/new" element={<CreateOfflineOrder />} />
                          <Route path="finance" element={<Finance />} />
                          <Route path="proforma" element={<Proforma />} />
                          <Route path="users" element={<Users />} />
                          <Route path="blogs" element={<Blogs />} />
                          <Route path="projects" element={<AdminProjects />} />
                          <Route path="logs" element={<Logs />} />
                          <Route path="settings" element={<AdminSettings />} />
                          <Route path="*" element={<Navigate to="/admin" replace />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <ConditionalWhatsAppButton />
              </Router>
            </CartProvider>
          </WishlistProvider>
        </AlertProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
