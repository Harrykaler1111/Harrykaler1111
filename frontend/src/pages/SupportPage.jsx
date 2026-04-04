import { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "@/App";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { whatsappLink, PHONE_NUMBER } from "@/components/WhatsAppButton";
import {
  ExternalLink, Package, CreditCard, User, Bug, HelpCircle, MoreHorizontal,
  Clock, ChevronRight, MessageSquare, ArrowRight, Phone
} from "lucide-react";

const STATUS_STYLES = {
  open: "bg-blue-500/20 text-blue-600",
  assigned: "bg-purple-500/20 text-purple-600",
  in_progress: "bg-yellow-500/20 text-yellow-600",
  waiting_for_user: "bg-orange-500/20 text-orange-600",
  resolved: "bg-green-500/20 text-green-600",
  closed: "bg-neutral-500/20 text-neutral-500",
};

const CATEGORIES = [
  { value: "order", label: "Order Issue", icon: Package, msg: "Hi, I need help with my order." },
  { value: "payment", label: "Payment", icon: CreditCard, msg: "Hi, I have a payment-related issue." },
  { value: "refund", label: "Refund / Return", icon: CreditCard, msg: "Hi, I would like to request a refund or return." },
  { value: "account_login", label: "Account / Login", icon: User, msg: "Hi, I need help with my account or login." },
  { value: "technical_bug", label: "Technical Bug", icon: Bug, msg: "Hi, I found a technical issue on the website." },
  { value: "other", label: "General", icon: MoreHorizontal, msg: "Hi, I need support regarding your website." },
];

export const SupportPage = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tickets/me`, { headers: { Authorization: `Bearer ${token}` } });
      setTickets(res.data.tickets || []);
    } catch { /* ignore if no tickets */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openWhatsApp = (message) => {
    window.open(whatsappLink(message), "_blank");
  };

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-white" data-testid="support-page">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: "#25D366" }}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-neutral-900 mb-2" data-testid="support-title">
            Need Help?
          </h1>
          <p className="text-neutral-500 text-base max-w-md mx-auto">
            All support is handled via WhatsApp for the fastest, simplest experience. A ticket is auto-created when you message us.
          </p>
        </div>

        {/* Primary CTA */}
        <motion.button
          onClick={() => openWhatsApp("Hi, I need support. Please create a ticket for me.")}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all shadow-lg hover:shadow-xl mb-8"
          style={{ backgroundColor: "#25D366" }}
          data-testid="wa-primary-cta"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-white">Chat & Raise Ticket on WhatsApp</p>
            <p className="text-sm text-white/80 mt-0.5">Message us and we'll get back to you quickly</p>
          </div>
          <ExternalLink className="h-5 w-5 text-white/60 shrink-0" />
        </motion.button>

        {/* Quick Issue Categories */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Quick Issue Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => openWhatsApp(cat.msg)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 hover:border-[#25D366] hover:bg-green-50/30 transition-all text-left group"
                  data-testid={`support-cat-${cat.value}`}
                >
                  <Icon className="h-5 w-5 text-neutral-400 group-hover:text-[#25D366] transition-colors shrink-0" />
                  <span className="text-sm font-medium text-neutral-700">{cat.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-300 ml-auto group-hover:text-[#25D366] transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex items-center justify-center gap-6 text-sm text-neutral-500 mb-10 border-t border-b border-neutral-100 py-4">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#25D366] transition-colors" data-testid="support-wa-link">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            WhatsApp
          </a>
          <a href="tel:+919625992057" className="flex items-center gap-2 hover:text-neutral-800 transition-colors" data-testid="support-phone-link">
            <Phone className="h-4 w-4" />
            {PHONE_NUMBER}
          </a>
        </div>

        {/* Existing Tickets (read-only tracking, only if logged in) */}
        {token && (
          <div>
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4" data-testid="ticket-history-heading">
              Your Support History
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-neutral-300 mx-auto" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-neutral-200 rounded-xl">
                <Clock className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">No support tickets yet</p>
                <p className="text-xs text-neutral-400 mt-1">Message us on WhatsApp and a ticket will be created automatically</p>
              </div>
            ) : (
              <div className="space-y-2" data-testid="ticket-list">
                {tickets.map(t => (
                  <div key={t.ticket_id}
                    className="border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors"
                    data-testid={`ticket-${t.ticket_id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-neutral-400">{t.ticket_id}</span>
                          {t.source === "whatsapp" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">WhatsApp</span>
                          )}
                        </div>
                        <h3 className="font-medium text-neutral-900 text-sm truncate">{t.title}</h3>
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">{t.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${STATUS_STYLES[t.status] || STATUS_STYLES.open}`}>
                          {(t.status || "open").replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-neutral-400">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {t.status !== "resolved" && t.status !== "closed" && (
                      <button
                        onClick={() => openWhatsApp(`Hi, I have an update on ticket ${t.ticket_id}: ${t.title}`)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-[#25D366] hover:underline font-medium"
                        data-testid={`ticket-follow-up-${t.ticket_id}`}
                      >
                        <MessageSquare className="h-3 w-3" /> Follow up on WhatsApp
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
