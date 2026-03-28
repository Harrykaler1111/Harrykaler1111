import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import axios from "axios";
import {
  ShoppingBag, Heart, User, Menu, Search, ChevronDown, ChevronRight,
  X, Store, Users, Share2, UserPlus, LayoutGrid, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationSystem";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============ MEGA MENU (Desktop) ============
const MegaMenu = ({ categories, onClose }) => {
  const navCats = categories.filter(c => c.show_in_nav && c.is_active);
  if (navCats.length === 0) return null;

  // Group into columns of up to 4 categories
  const cols = [];
  const perCol = Math.ceil(navCats.length / Math.max(1, Math.ceil(navCats.length / 4)));
  for (let i = 0; i < navCats.length; i += perCol) {
    cols.push(navCats.slice(i, i + perCol));
  }

  return (
    <div
      className="absolute top-full left-0 right-0 bg-neutral-950 border-t border-gold/10 shadow-2xl shadow-black/60 z-50"
      data-testid="mega-menu"
      onMouseLeave={onClose}
    >
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-12 gap-y-6">
          {navCats.map((cat) => (
            <div key={cat.category_id} className="space-y-2.5">
              <Link
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                onClick={onClose}
                className="block text-sm font-semibold text-gold uppercase tracking-wider hover:text-yellow-400 transition-colors"
                data-testid={`mega-cat-${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {cat.name}
              </Link>
              {cat.sub_categories?.length > 0 && (
                <div className="space-y-1.5 pl-0.5">
                  {cat.sub_categories.map((sub) => (
                    <Link
                      key={sub.sub_category_id}
                      to={`/products?category=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub.name)}`}
                      onClick={onClose}
                      className="block text-[13px] text-neutral-400 hover:text-white transition-colors"
                      data-testid={`mega-sub-${sub.slug || sub.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div className="mt-8 pt-5 border-t border-neutral-800 flex items-center justify-between">
          <Link
            to="/products"
            onClick={onClose}
            className="text-sm text-neutral-400 hover:text-gold transition-colors flex items-center gap-2"
            data-testid="mega-view-all"
          >
            <LayoutGrid className="h-4 w-4" /> View All Products
          </Link>
          <p className="text-xs text-neutral-600">New collections dropping every week</p>
        </div>
      </div>
    </div>
  );
};

// ============ PARTNER DROPDOWN (Desktop) ============
const PartnerDropdown = ({ onClose }) => (
  <div
    className="absolute top-full left-1/2 -translate-x-1/2 w-60 bg-neutral-950 border border-gold/10 rounded-lg shadow-2xl shadow-black/60 z-50 py-2 mt-1"
    data-testid="partner-dropdown"
    onMouseLeave={onClose}
  >
    <Link
      to="/creators"
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-gold hover:bg-neutral-900 transition-colors"
      data-testid="partner-influencer"
    >
      <Users className="h-4 w-4 text-gold/60" />
      Become an Influencer
    </Link>
    <Link
      to="/affiliate"
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-gold hover:bg-neutral-900 transition-colors"
      data-testid="partner-affiliate"
    >
      <Share2 className="h-4 w-4 text-gold/60" />
      Affiliate Program
    </Link>
    <Link
      to="/reseller-register"
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:text-gold hover:bg-neutral-900 transition-colors"
      data-testid="partner-reseller"
    >
      <UserPlus className="h-4 w-4 text-gold/60" />
      Reseller Program
    </Link>
  </div>
);

// ============ MOBILE MENU ============
const MobileMenu = ({ open, onClose, categories, user, logout, navigate, unreadTickets }) => {
  const [expandedCat, setExpandedCat] = useState(null);
  const [expandedPartner, setExpandedPartner] = useState(false);
  const navCats = categories.filter(c => c.show_in_nav && c.is_active);

  if (!open) return null;

  const go = (path) => { navigate(path); onClose(); };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-[60]" onClick={onClose} />
      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full w-80 bg-neutral-950 z-[61] overflow-y-auto border-r border-gold/10"
        data-testid="mobile-menu-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <span className="font-serif text-xl font-bold text-white tracking-tight">PIGMA</span>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white" data-testid="mobile-menu-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="py-3">
          {/* Shop All */}
          <button
            onClick={() => go("/products")}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-900 transition-colors"
            data-testid="mobile-nav-shop-all"
          >
            <LayoutGrid className="h-4 w-4 text-gold" />
            Shop All Products
          </button>

          {/* Categories expandable */}
          {navCats.map((cat) => (
            <div key={cat.category_id}>
              <button
                onClick={() => {
                  if (cat.sub_categories?.length > 0) {
                    setExpandedCat(expandedCat === cat.category_id ? null : cat.category_id);
                  } else {
                    go(`/products?category=${encodeURIComponent(cat.name)}`);
                  }
                }}
                className="w-full flex items-center justify-between px-5 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                data-testid={`mobile-cat-${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span>{cat.name}</span>
                {cat.sub_categories?.length > 0 && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedCat === cat.category_id ? 'rotate-180' : ''}`} />
                )}
              </button>
              {expandedCat === cat.category_id && cat.sub_categories?.length > 0 && (
                <div className="bg-neutral-900/50 border-l-2 border-gold/20 ml-5">
                  <button
                    onClick={() => go(`/products?category=${encodeURIComponent(cat.name)}`)}
                    className="w-full px-5 py-2.5 text-[13px] text-gold text-left hover:bg-neutral-800 transition-colors"
                  >
                    View All {cat.name}
                  </button>
                  {cat.sub_categories.map((sub) => (
                    <button
                      key={sub.sub_category_id}
                      onClick={() => go(`/products?category=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub.name)}`)}
                      className="w-full px-5 py-2.5 text-[13px] text-neutral-400 text-left hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="h-px bg-neutral-800 my-2 mx-4" />

          {/* Partner with Us */}
          <button
            onClick={() => setExpandedPartner(!expandedPartner)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
            data-testid="mobile-partner-toggle"
          >
            <span className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gold/60" />
              Partner with Us
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${expandedPartner ? 'rotate-180' : ''}`} />
          </button>
          {expandedPartner && (
            <div className="bg-neutral-900/50 border-l-2 border-gold/20 ml-5">
              <button onClick={() => go("/creators")} className="w-full px-5 py-2.5 text-[13px] text-neutral-400 text-left hover:text-white hover:bg-neutral-800 transition-colors">
                Become an Influencer
              </button>
              <button onClick={() => go("/affiliate")} className="w-full px-5 py-2.5 text-[13px] text-neutral-400 text-left hover:text-white hover:bg-neutral-800 transition-colors">
                Affiliate Program
              </button>
              <button onClick={() => go("/reseller-register")} className="w-full px-5 py-2.5 text-[13px] text-neutral-400 text-left hover:text-white hover:bg-neutral-800 transition-colors">
                Reseller Program
              </button>
            </div>
          )}

          {/* Sell on Pigma */}
          <button
            onClick={() => go("/vendor-login")}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-gold hover:bg-neutral-900 transition-colors"
            data-testid="mobile-nav-sell"
          >
            <Store className="h-4 w-4" />
            Sell on Pigma
          </button>

          <div className="h-px bg-neutral-800 my-2 mx-4" />

          {/* User section */}
          {user ? (
            <>
              <div className="px-5 py-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Account</p>
              </div>
              <button onClick={() => go("/profile")} className="w-full px-5 py-2.5 text-sm text-neutral-300 text-left hover:text-white hover:bg-neutral-900 transition-colors">My Account</button>
              <button onClick={() => go("/orders")} className="w-full px-5 py-2.5 text-sm text-neutral-300 text-left hover:text-white hover:bg-neutral-900 transition-colors">Orders</button>
              <button onClick={() => go("/wishlist")} className="w-full px-5 py-2.5 text-sm text-neutral-300 text-left hover:text-white hover:bg-neutral-900 transition-colors">Wishlist</button>
              <button onClick={() => go("/support")} className="w-full px-5 py-2.5 text-sm text-neutral-300 text-left hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-2">
                Support
                {unreadTickets > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">{unreadTickets}</span>}
              </button>
              <button onClick={() => go("/influencer")} className="w-full px-5 py-2.5 text-sm text-neutral-300 text-left hover:text-white hover:bg-neutral-900 transition-colors">Influencer Hub</button>
              {user.role === "admin" && (
                <button onClick={() => go("/admin")} className="w-full px-5 py-2.5 text-sm text-gold text-left hover:bg-neutral-900 transition-colors">Admin Dashboard</button>
              )}
              <div className="h-px bg-neutral-800 my-2 mx-4" />
              <button
                onClick={() => { logout(); onClose(); navigate("/"); }}
                className="w-full px-5 py-2.5 text-sm text-red-400 text-left hover:bg-neutral-900 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <button onClick={() => go("/auth")} className="w-full px-5 py-3 text-sm text-white text-left hover:bg-neutral-900 transition-colors flex items-center gap-3">
              <User className="h-4 w-4 text-gold" />
              Sign In / Register
            </button>
          )}
        </nav>
      </div>
    </>
  );
};

// ============ MAIN HEADER ============
export const Header = () => {
  const { user, token, logout } = useAuth();
  const { cartCount, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadTickets, setUnreadTickets] = useState(0);
  const [categories, setCategories] = useState([]);
  const [megaOpen, setMegaOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const megaTimer = useRef(null);
  const partnerTimer = useRef(null);

  useEffect(() => {
    axios.get(`${API}/categories`).then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && token) {
      axios.get(`${API}/tickets/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setUnreadTickets(r.data.unread_count || 0))
        .catch(() => {});
    }
  }, [user, token, location.pathname]);

  // Hover intent helpers (prevents flicker)
  const openMega = useCallback(() => {
    clearTimeout(megaTimer.current);
    setPartnerOpen(false);
    setMegaOpen(true);
  }, []);
  const closeMega = useCallback(() => {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 150);
  }, []);
  const openPartner = useCallback(() => {
    clearTimeout(partnerTimer.current);
    setMegaOpen(false);
    setPartnerOpen(true);
  }, []);
  const closePartner = useCallback(() => {
    partnerTimer.current = setTimeout(() => setPartnerOpen(false), 150);
  }, []);

  const isHomePage = location.pathname === "/";
  const headerBg = "bg-black";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 ${headerBg}`}
        style={{ transform: "translateZ(0)" }}
        data-testid="header"
      >
        {/* Main bar */}
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-[68px]">
            {/* Left: Mobile hamburger + Logo */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-1.5 text-white hover:text-gold transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="h-6 w-6" />
              </button>

              <Link
                to="/"
                className="font-serif text-2xl md:text-[26px] font-bold tracking-tight text-white"
                data-testid="logo"
              >
                PIGMA
              </Link>
            </div>

            {/* Center: Desktop Nav */}
            <nav className="hidden md:flex items-center gap-7" data-testid="desktop-nav">
              {/* All Products (mega menu trigger) */}
              <div
                className="relative"
                onMouseEnter={openMega}
                onMouseLeave={closeMega}
              >
                <Link
                  to="/products"
                  className={`flex items-center gap-1 text-[13px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors ${megaOpen ? 'text-gold' : 'text-white hover:text-gold'}`}
                  data-testid="nav-all-products"
                >
                  All Products
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`} />
                </Link>
              </div>

              {/* Partner with Us */}
              <div
                className="relative"
                onMouseEnter={openPartner}
                onMouseLeave={closePartner}
              >
                <button
                  className={`flex items-center gap-1 text-[13px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors ${partnerOpen ? 'text-gold' : 'text-white hover:text-gold'}`}
                  data-testid="nav-partner"
                >
                  Partner with Us
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${partnerOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Sell on Pigma - CTA */}
              <Link
                to="/vendor-login"
                className="text-[13px] uppercase tracking-[0.12em] font-semibold text-gold border border-gold/40 px-4 py-1.5 rounded hover:bg-gold hover:text-black transition-all duration-200 whitespace-nowrap"
                data-testid="nav-sell-on-pigma"
              >
                Sell on Pigma
              </Link>
            </nav>

            {/* Right: Action icons */}
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="ghost" size="icon"
                className="text-white hover:text-gold hover:bg-transparent"
                onClick={() => navigate("/products?search=true")}
                data-testid="search-btn"
              >
                <Search className="h-5 w-5" />
              </Button>

              <NotificationBell />

              {user && (
                <Button
                  variant="ghost" size="icon"
                  className="text-white hover:text-gold hover:bg-transparent"
                  onClick={() => navigate("/wishlist")}
                  data-testid="wishlist-btn"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              )}

              {user && (
                <Button
                  variant="ghost" size="icon"
                  className="text-white hover:text-gold hover:bg-transparent relative"
                  onClick={openCart}
                  data-testid="cart-btn"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gold text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Button>
              )}

              {/* Desktop User Menu */}
              <div className="hidden md:block">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-white hover:text-gold hover:bg-transparent flex items-center gap-1.5 px-2"
                        data-testid="user-menu-btn"
                      >
                        <User className="h-5 w-5" />
                        <span className="text-sm max-w-[80px] truncate">{user.name?.split(" ")[0]}</span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-neutral-950 border-neutral-800">
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900" data-testid="menu-profile">My Account</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/orders")} className="text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900" data-testid="menu-orders">Orders</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/returns")} className="text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900" data-testid="menu-returns">Returns</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/support")} className="text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900" data-testid="menu-support">
                        <span className="flex items-center gap-2">
                          Support
                          {unreadTickets > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1" data-testid="unread-ticket-badge">{unreadTickets}</span>
                          )}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/wishlist")} className="text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900" data-testid="menu-wishlist">Wishlist</DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-neutral-800" />
                      {user.role === "influencer" && (
                        <DropdownMenuItem onClick={() => navigate("/influencer")} className="text-neutral-300 hover:text-white focus:text-white focus:bg-neutral-900" data-testid="menu-influencer">Influencer Dashboard</DropdownMenuItem>
                      )}
                      {user.role === "admin" && (
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="text-gold hover:text-gold focus:text-gold focus:bg-neutral-900" data-testid="menu-admin">Admin Dashboard</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-neutral-800" />
                      <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} className="text-red-400 hover:text-red-400 focus:text-red-400 focus:bg-neutral-900" data-testid="menu-logout">Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-white hover:text-gold hover:bg-transparent text-sm"
                    onClick={() => navigate("/auth")}
                    data-testid="signin-btn"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mega Menu Dropdown (full width, anchored to header) */}
        {megaOpen && (
          <div onMouseEnter={openMega} onMouseLeave={closeMega}>
            <MegaMenu categories={categories} onClose={() => setMegaOpen(false)} />
          </div>
        )}

        {/* Partner Dropdown */}
        {partnerOpen && (
          <div
            className="hidden md:block absolute top-full z-50"
            style={{ left: "50%", transform: "translateX(-50%)" }}
            onMouseEnter={openPartner}
            onMouseLeave={closePartner}
          >
            {/* We need to position this relative to the nav, so we use a portal-like approach */}
          </div>
        )}
      </header>

      {/* Partner dropdown rendered as absolute from the header - need to calculate position */}
      {partnerOpen && <PartnerDropdownPortal openPartner={openPartner} closePartner={closePartner} closeFn={() => setPartnerOpen(false)} />}

      {/* Mobile Menu */}
      <MobileMenu
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        categories={categories}
        user={user}
        logout={logout}
        navigate={navigate}
        unreadTickets={unreadTickets}
      />
    </>
  );
};

// Helper to render the partner dropdown positioned correctly
const PartnerDropdownPortal = ({ openPartner, closePartner, closeFn }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: 0 });

  useEffect(() => {
    const trigger = document.querySelector('[data-testid="nav-partner"]');
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setPos({ left: rect.left + rect.width / 2 });
    }
  }, []);

  return (
    <div
      ref={ref}
      className="fixed z-[51] hidden md:block"
      style={{ top: 68, left: pos.left, transform: "translateX(-50%)" }}
      onMouseEnter={openPartner}
      onMouseLeave={closePartner}
    >
      <PartnerDropdown onClose={closeFn} />
    </div>
  );
};
