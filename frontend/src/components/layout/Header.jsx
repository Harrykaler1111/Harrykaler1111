import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Menu, 
  X, 
  Search,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Shop All", href: "/products" },
    { label: "Platform Boots", href: "/products/Platform Boots" },
    { label: "Stiletto Heels", href: "/products/Stiletto Heels" },
    { label: "Limited Drops", href: "/products?limited=true" },
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
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className={textColor} data-testid="mobile-menu-btn">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-white">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-medium text-black hover:text-gold transition-colors py-2"
                    data-testid={`mobile-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="my-4" />
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-lg py-2">
                      My Account
                    </Link>
                    <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className="text-lg py-2">
                      Orders
                    </Link>
                    <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="text-lg py-2">
                      Wishlist
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-lg py-2 text-gold">
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); setIsMobileMenuOpen(false); navigate("/"); }}
                      className="text-lg py-2 text-left text-red-500"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg py-2"
                  >
                    Sign In
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            to="/"
            className={`font-serif text-2xl md:text-3xl font-bold tracking-tight ${textColor}`}
            data-testid="logo"
          >
            PIGMA
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm uppercase tracking-widest font-medium hover:text-gold transition-colors ${textColor}`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={`${textColor} hover:text-gold`}
              onClick={() => navigate("/products?search=true")}
              data-testid="search-btn"
            >
              <Search className="h-5 w-5" />
            </Button>

            {user && (
              <Button
                variant="ghost"
                size="icon"
                className={`${textColor} hover:text-gold`}
                onClick={() => navigate("/wishlist")}
                data-testid="wishlist-btn"
              >
                <Heart className="h-5 w-5" />
              </Button>
            )}

            {user && (
              <Button
                variant="ghost"
                size="icon"
                className={`${textColor} hover:text-gold`}
                onClick={() => navigate("/cart")}
                data-testid="cart-btn"
              >
                <ShoppingBag className="h-5 w-5" />
              </Button>
            )}

            {/* User Menu */}
            <div className="hidden md:block">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`${textColor} hover:text-gold flex items-center gap-2`}
                      data-testid="user-menu-btn"
                    >
                      <User className="h-5 w-5" />
                      <span className="text-sm">{user.name?.split(" ")[0]}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/orders")} data-testid="menu-orders">
                      Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wishlist")} data-testid="menu-wishlist">
                      Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.role === "influencer" && (
                      <DropdownMenuItem onClick={() => navigate("/influencer")} data-testid="menu-influencer">
                        Influencer Dashboard
                      </DropdownMenuItem>
                    )}
                    {user.role === "admin" && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="text-gold" data-testid="menu-admin">
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { logout(); navigate("/"); }}
                      className="text-red-500"
                      data-testid="menu-logout"
                    >
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  className={`${textColor} hover:text-gold`}
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
    </header>
  );
};
