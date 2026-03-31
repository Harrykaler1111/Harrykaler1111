import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MessageCircle, Instagram, Shield, CreditCard, Truck, RefreshCw } from "lucide-react";
import { API } from "@/App";
import axios from "axios";

export const Footer = () => {
  const [policies, setPolicies] = useState([]);

  useEffect(() => {
    axios.get(`${API}/policies`).then(r => setPolicies(r.data || [])).catch(() => {});
  }, []);

  return (
    <footer className="bg-neutral-950 text-white pt-14 pb-6" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4">
        {/* Trust Signals Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-10 border-b border-neutral-800">
          {[
            { icon: Shield, label: "Secure Payments", sub: "256-bit SSL" },
            { icon: CreditCard, label: "COD Available", sub: "Pay at doorstep" },
            { icon: RefreshCw, label: "Easy Returns", sub: "7-day exchange" },
            { icon: Truck, label: "Fast Delivery", sub: "3-5 days" },
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-3" data-testid={`footer-trust-${i}`}>
              <div className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center flex-shrink-0">
                <t.icon className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-xs font-semibold">{t.label}</p>
                <p className="text-[10px] text-neutral-500">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-serif text-2xl tracking-[0.15em] text-gold block mb-4">PIGMA</Link>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              Premium footwear designed to empower. Bold, beautiful, unapologetically you.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com/thepigma" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center hover:border-gold hover:text-gold transition-colors" data-testid="footer-instagram">
                <Instagram className="h-3.5 w-3.5" />
              </a>
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center hover:border-green-400 hover:text-green-400 transition-colors" data-testid="footer-whatsapp">
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
              <a href="mailto:support@thepigma.com" className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center hover:border-blue-400 hover:text-blue-400 transition-colors" data-testid="footer-email">
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Shop</h4>
            <ul className="space-y-2.5">
              <li><Link to="/products" className="text-sm text-neutral-300 hover:text-gold transition-colors">All Products</Link></li>
              <li><Link to="/products?category=Platform+Boots" className="text-sm text-neutral-300 hover:text-gold transition-colors">Platform Boots</Link></li>
              <li><Link to="/products?category=Stiletto+Heels" className="text-sm text-neutral-300 hover:text-gold transition-colors">Stiletto Heels</Link></li>
              <li><Link to="/products?category=Party+Wear" className="text-sm text-neutral-300 hover:text-gold transition-colors">Party Wear</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Policies</h4>
            <ul className="space-y-2.5">
              {policies.map(p => (
                <li key={p.slug}>
                  <Link to={`/policy/${p.slug}`} className="text-sm text-neutral-300 hover:text-gold transition-colors" data-testid={`footer-policy-${p.slug}`}>
                    {p.title}
                  </Link>
                </li>
              ))}
              {policies.length === 0 && (
                <>
                  <li><Link to="/policy/return-policy" className="text-sm text-neutral-300 hover:text-gold transition-colors">Return Policy</Link></li>
                  <li><Link to="/policy/shipping-policy" className="text-sm text-neutral-300 hover:text-gold transition-colors">Shipping Policy</Link></li>
                  <li><Link to="/policy/privacy-policy" className="text-sm text-neutral-300 hover:text-gold transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/policy/terms-and-conditions" className="text-sm text-neutral-300 hover:text-gold transition-colors">Terms & Conditions</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Contact</h4>
            <ul className="space-y-2.5">
              <li><Link to="/contact" className="text-sm text-neutral-300 hover:text-gold transition-colors">Contact Us</Link></li>
              <li><Link to="/support" className="text-sm text-neutral-300 hover:text-gold transition-colors">Help & Support</Link></li>
              <li>
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-300 hover:text-green-400 transition-colors flex items-center gap-1.5">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:support@thepigma.com" className="text-sm text-neutral-300 hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> support@thepigma.com
                </a>
              </li>
            </ul>
          </div>

          {/* Partner with Us */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Partner with Us</h4>
            <ul className="space-y-2.5">
              <li><Link to="/influencer" className="text-sm text-neutral-300 hover:text-gold transition-colors" data-testid="footer-influencer">Become an Influencer</Link></li>
              <li><Link to="/affiliate" className="text-sm text-neutral-300 hover:text-gold transition-colors" data-testid="footer-affiliate">Affiliate Program</Link></li>
              <li><Link to="/reseller" className="text-sm text-neutral-300 hover:text-gold transition-colors" data-testid="footer-reseller">Reseller Program</Link></li>
              <li><Link to="/vendor-login" className="text-sm text-neutral-300 hover:text-gold transition-colors" data-testid="footer-sell">Sell on Pigma</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-neutral-500">&copy; {new Date().getFullYear()} Pigma. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[10px] text-neutral-500">
            <Link to="/policy/privacy-policy" className="hover:text-gold transition-colors">Privacy</Link>
            <Link to="/policy/terms-and-conditions" className="hover:text-gold transition-colors">Terms</Link>
            <Link to="/policy/shipping-policy" className="hover:text-gold transition-colors">Shipping</Link>
            <Link to="/policy/return-policy" className="hover:text-gold transition-colors">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
