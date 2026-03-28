import { motion } from "framer-motion";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const ContactPage = () => {
  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-white" data-testid="contact-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Contact Us</h1>
          <p className="text-neutral-500 text-sm mb-10">We'd love to hear from you. Reach out anytime.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WhatsApp */}
            <a
              href="https://wa.me/919876543210?text=Hi%20Pigma!"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 bg-green-50 border border-green-200 rounded-xl p-5 hover:shadow-md transition-all"
              data-testid="whatsapp-contact"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">WhatsApp</h3>
                <p className="text-xs text-neutral-500 mb-2">Fastest way to reach us</p>
                <span className="text-green-600 text-sm font-medium group-hover:underline">Chat Now</span>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:support@thepigma.com"
              className="group flex items-start gap-4 bg-blue-50 border border-blue-200 rounded-xl p-5 hover:shadow-md transition-all"
              data-testid="email-contact"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Email</h3>
                <p className="text-xs text-neutral-500 mb-2">We reply within 24 hours</p>
                <span className="text-blue-600 text-sm font-medium group-hover:underline">support@thepigma.com</span>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/thepigma"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 bg-pink-50 border border-pink-200 rounded-xl p-5 hover:shadow-md transition-all"
              data-testid="instagram-contact"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Instagram</h3>
                <p className="text-xs text-neutral-500 mb-2">Follow us & DM anytime</p>
                <span className="text-pink-600 text-sm font-medium group-hover:underline">@thepigma</span>
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:+919876543210"
              className="group flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-5 hover:shadow-md transition-all"
              data-testid="phone-contact"
            >
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Phone</h3>
                <p className="text-xs text-neutral-500 mb-2">Mon-Sat, 10AM - 7PM</p>
                <span className="text-amber-700 text-sm font-medium group-hover:underline">+91 98765 43210</span>
              </div>
            </a>
          </div>

          {/* Trust signals */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🔒", label: "Secure Payments", sub: "256-bit SSL encrypted" },
              { icon: "💳", label: "COD Available", sub: "Cash on delivery" },
              { icon: "🔄", label: "Easy Returns", sub: "7-day exchange policy" },
              { icon: "🚚", label: "Fast Delivery", sub: "3-5 business days" },
            ].map((t, i) => (
              <div key={i} className="text-center bg-neutral-50 rounded-lg p-4" data-testid={`trust-signal-${i}`}>
                <span className="text-2xl mb-2 block">{t.icon}</span>
                <p className="text-xs font-bold">{t.label}</p>
                <p className="text-[10px] text-neutral-400">{t.sub}</p>
              </div>
            ))}
          </div>

          {/* Business Hours */}
          <div className="mt-10 bg-neutral-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-neutral-400" />
              <h3 className="font-bold text-sm">Business Hours</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-neutral-600">
              <span>Monday - Saturday</span><span className="font-medium">10:00 AM - 7:00 PM</span>
              <span>Sunday</span><span className="font-medium text-red-500">Closed</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactPage;
