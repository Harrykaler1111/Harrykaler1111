import { Link } from "react-router-dom";
import { Instagram, Youtube, Facebook, Twitter } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-black text-white py-16 md:py-24" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="font-serif text-3xl font-bold tracking-tight">
              PIGMA
            </Link>
            <p className="mt-4 text-neutral-400 text-sm leading-relaxed">
              Bold. Limited. Exclusive. Premium women's boots for the fearless fashionista.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-gold transition-colors"
                data-testid="social-instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-gold transition-colors"
                data-testid="social-youtube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-gold transition-colors"
                data-testid="social-facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-gold transition-colors"
                data-testid="social-twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Shop
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/products" className="text-neutral-300 hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/products/Platform Boots" className="text-neutral-300 hover:text-white transition-colors">
                  Platform Boots
                </Link>
              </li>
              <li>
                <Link to="/products/Stiletto Heels" className="text-neutral-300 hover:text-white transition-colors">
                  Stiletto Heels
                </Link>
              </li>
              <li>
                <Link to="/products?limited=true" className="text-gold hover:text-gold-light transition-colors">
                  Limited Drops
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/shipping" className="text-neutral-300 hover:text-white transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-neutral-300 hover:text-white transition-colors">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link to="/size-guide" className="text-neutral-300 hover:text-white transition-colors">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-neutral-300 hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Join */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Partner With Us
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/influencer" className="text-neutral-300 hover:text-white transition-colors">
                  Become an Influencer
                </Link>
              </li>
              <li>
                <Link to="/affiliate" className="text-neutral-300 hover:text-white transition-colors">
                  Affiliate Program
                </Link>
              </li>
              <li>
                <Link to="/wholesale" className="text-neutral-300 hover:text-white transition-colors">
                  Wholesale
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-neutral-500 text-sm">
            &copy; {new Date().getFullYear()} Pigma. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-neutral-500 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-neutral-500 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
