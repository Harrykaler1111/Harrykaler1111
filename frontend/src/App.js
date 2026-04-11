import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// Pages
import { HomePage } from "@/pages/HomePage";
import { ProductsPage } from "@/pages/ProductsPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CartPage } from "@/pages/CartPage";
import { AuthPage } from "@/pages/AuthPage";
import { AuthCallback } from "@/pages/AuthCallback";
import { ProfilePage } from "@/pages/ProfilePage";
import { WishlistPage } from "@/pages/WishlistPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderSuccessPage } from "@/pages/OrderSuccessPage";
import { InfluencerDashboard } from "@/pages/InfluencerDashboard";
import { AffiliateDashboard } from "@/pages/AffiliateDashboard";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { VendorAuthPage } from "@/pages/VendorAuthPage";
import { VendorDashboard } from "@/pages/VendorDashboard";
import { ResellerRegisterPage } from "@/pages/ResellerRegisterPage";
import { ResellerDashboard } from "@/pages/ResellerDashboard";
import { VendorStorePage } from "@/pages/VendorStorePage";
import { SupportPage } from "@/pages/SupportPage";
import { ReturnsPage } from "@/pages/ReturnsPage";
import { CreatorRecruitmentPage } from "@/pages/CreatorRecruitmentPage";
import { PolicyPage } from "@/pages/PolicyPage";
import { ContactPage } from "@/pages/ContactPage";
import { BundleDetailPage } from "@/components/BundleDeals";
import ReelsPage from "@/pages/ReelsPage";
import { Header } from "@/components/layout/Header";
import { FlashSaleToast } from "@/components/NotificationSystem";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/WhatsAppButton";
import { FomoNotification } from "@/components/FomoNotification";
import { TrackingPixels } from "@/components/TrackingPixels";
import { CartProvider, useCart } from "@/context/CartContext";
import { BoosterBar } from "@/components/BoosterBar";
import { CartDrawer } from "@/components/CartDrawer";
import { ChatWidget } from "@/components/ChatWidget";
import { SitePopup } from "@/components/SitePopup";
import UserNotificationsPage from "@/pages/UserNotificationsPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("pigma_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("pigma_token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("pigma_token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("pigma_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null, requiredRoles = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin Protected Route - checks admin token separately
const AdminProtectedRoute = ({ children }) => {
  const adminToken = localStorage.getItem("pigma_admin_token");
  const adminData = localStorage.getItem("pigma_admin");

  if (!adminToken || !adminData) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

// Layout wrapper - hides header/footer for admin pages
const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const isVendorPage = location.pathname.startsWith("/vendor");
  const isResellerDash = location.pathname.startsWith("/reseller/");
  const isReelsPage = location.pathname === "/reels";
  const hideChrome = isAdminPage || isVendorPage || isResellerDash || isReelsPage;

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("pigma_ref", ref);
    }
  }, [location.search]);

  return (
    <div className="App min-h-screen flex flex-col bg-neutral-50">
      {!hideChrome && <Header />}
      {!hideChrome && <FlashSaleToast />}
      {(!hideChrome || isReelsPage) && <BoosterBar />}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
      {!hideChrome && <FloatingWhatsApp />}
      {!hideChrome && <ChatWidget />}
      <SitePopup />
      {!hideChrome && <FomoNotification />}
      {(!hideChrome || isReelsPage) && <CartDrawer />}
      <TrackingPixels />
      <Toaster position="top-right" richColors />
    </div>
  );
};

// Cart route opens the drawer and redirects home
const CartRedirect = () => {
  const { openCart } = useCart();
  const navigate = useNavigate();
  useEffect(() => { openCart(); navigate("/", { replace: true }); }, []);
  return null;
};

// App Router with session_id detection
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const AppRouter = () => {
  const location = useLocation();
  
  // Check URL fragment for session_id (from Google OAuth)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <>
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:category" element={<ProductsPage />} />
      <Route path="/product/:productId" element={<ProductDetailPage />} />
      <Route path="/bundle/:bundleId" element={<BundleDetailPage />} />
      <Route path="/reels" element={<ReelsPage />} />
      <Route path="/store/:vendorId" element={<VendorStorePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/cart" element={<CartRedirect />} />
      <Route path="/cart-page" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <WishlistPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order-success"
        element={
          <ProtectedRoute>
            <OrderSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route path="/support" element={<SupportPage />} />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <UserNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/returns"
        element={
          <ProtectedRoute>
            <ReturnsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/creators" element={<CreatorRecruitmentPage />} />
      <Route path="/policy/:slug" element={<PolicyPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/influencer"
        element={
          <ProtectedRoute>
            <InfluencerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/affiliate"
        element={
          <ProtectedRoute>
            <AffiliateDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-login"
        element={<AdminLoginPage />}
      />
      <Route
        path="/admin/*"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/vendor-login"
        element={<VendorAuthPage />}
      />
      <Route
        path="/vendor/*"
        element={<VendorDashboard />}
      />
      <Route
        path="/reseller-register"
        element={<ResellerRegisterPage />}
      />
      <Route
        path="/reseller/*"
        element={
          <ProtectedRoute>
            <ResellerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <LayoutWrapper>
            <AppRouter />
          </LayoutWrapper>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
