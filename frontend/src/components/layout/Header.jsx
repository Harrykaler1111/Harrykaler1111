import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { 
  ShoppingBag, Heart, User, Menu, Search, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Shop", href: "/products" },
    { label: "Boots", href: "/products/Platform Boots" },
    { label: "Heels", href: "/products/Stiletto Heels" },
    { label: "Drops", href: "/products?limited=true" },
  ];

  const mobileNavLinks = [
    { label: "Shop All", href: "/products" },
    { label: "Platform Boots", href: "/products/Platform Boots" },
    { label: "Stiletto Heels", href: "/products/Stiletto Heels" },
    { label: "Limited Drops", href: "/products?limited=true" },
    { label: "Sell on Pigma", href: "/vendor-login" },
    { label: "Become Reseller", href: "/reseller-register" },
  ];

  const isHomePage = location.pathname === "/";
  const headerBg = isScrolled || !isHomePage
    ? "bg-white/95 backdrop-blur-md border-b border-neutral-200"
    : "bg-transparent";
  const textColor = isScrolled || !isHomePage ? "text-black" : "text-white";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-3 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Left: Mobile Menu + Logo */}
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className={textColor} data-testid="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-white">
                <nav className="flex flex-col gap-3 mt-8">
                  {mobileNavLinks.map((link) => (
                    <Link key={link.href} to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-base font-medium text-black hover:text-gold transition-colors py-2"
                      data-testid={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                      {link.label}
                    </Link>
                  ))}
                  <hr className="my-3" />
                  {user ? (
                    <>
                      <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-base py-2">My Account</Link>
                      <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="text-base py-2">Orders</Link>
                      <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="text-base py-2">Wishlist</Link>
                      <Link to="/influencer" onClick={() => setIsMobileMenuOpen(false)} className="text-base py-2">Influencer Hub</Link>
                      {user.role === "admin" && (
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-base py-2 text-gold">Admin Dashboard</Link>
                      )}
                      <button onClick={() => { logout(); setIsMobileMenuOpen(false); navigate("/"); }}
                        className="text-base py-2 text-left text-red-500">Logout</button>
                    </>
                  ) : (
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} className="text-base py-2">Sign In</Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to="/" className={`font-serif text-xl md:text-2xl font-bold tracking-tight ${textColor}`} data-testid="logo">
              PIGMA
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}
                className={`text-[11px] lg:text-xs uppercase tracking-widest font-medium hover:text-gold transition-colors whitespace-nowrap ${textColor}`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}>
                {link.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`text-[11px] lg:text-xs uppercase tracking-widest font-medium hover:text-gold transition-colors flex items-center gap-1 ${textColor}`}
                  data-testid="nav-more-menu">
                  More <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44">
                <DropdownMenuItem onClick={() => navigate("/vendor-login")} data-testid="nav-sell-on-pigma">
                  Sell on Pigma
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/reseller-register")} data-testid="nav-become-reseller">
                  Become Reseller
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/influencer")} data-testid="nav-influencer-hub">
                  Influencer Hub
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className={`${textColor} hover:text-gold h-8 w-8 md:h-9 md:w-9`}
              onClick={() => navigate("/products?search=true")} data-testid="search-btn">
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {user && (
              <>
                <Button variant="ghost" size="icon" className={`${textColor} hover:text-gold h-8 w-8 md:h-9 md:w-9`}
                  onClick={() => navigate("/wishlist")} data-testid="wishlist-btn">
                  <Heart className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button variant="ghost" size="icon" className={`${textColor} hover:text-gold h-8 w-8 md:h-9 md:w-9`}
                  onClick={() => navigate("/cart")} data-testid="cart-btn">
                  <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </>
            )}

            {/* User Menu - visible on md+ */}
            <div className="hidden md:block">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={`${textColor} hover:text-gold flex items-center gap-1 h-9 px-2`}
                      data-testid="user-menu-btn">
                      <User className="h-4 w-4" />
                      <span className="text-xs lg:text-sm max-w-[60px] truncate">{user.name?.split(" ")[0]}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">My Account</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-orders">Orders</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wishlist")} data-testid="menu-wishlist">Wishlist</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.role === "influencer" && (
                      <DropdownMenuItem onClick={() => navigate("/influencer")} data-testid="menu-influencer">Influencer Dashboard</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/reseller-register")} data-testid="menu-reseller">Reseller Portal</DropdownMenuItem>
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="text-gold" data-testid="menu-admin">Admin Dashboard</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} className="text-red-500" data-testid="menu-logout">Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" className={`${textColor} hover:text-gold h-9 px-3 text-xs lg:text-sm`}
                  onClick={() => navigate("/auth")} data-testid="signin-btn">
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile: Sign In or User icon when not logged in */}
            <div className="md:hidden">
              {user ? (
                <Button variant="ghost" size="icon" className={`${textColor} hover:text-gold h-8 w-8`}
                  onClick={() => navigate("/profile")} data-testid="mobile-profile-btn">
                  <User className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className={`${textColor} hover:text-gold h-8 w-8`}
                  onClick={() => navigate("/auth")} data-testid="mobile-signin-btn">
                  <User className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
