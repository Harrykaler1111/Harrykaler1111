import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ChevronLeft, Package, CreditCard, User, Bug, HelpCircle, MoreHorizontal, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/components/WhatsAppButton";

const CATEGORIES = [
  { value: "order", label: "Order Issue", icon: Package, color: "text-blue-500", msg: "Hi, I need help with my order." },
  { value: "payment", label: "Payment Issue", icon: CreditCard, color: "text-green-500", msg: "Hi, I have a payment-related issue." },
  { value: "refund", label: "Refund / Return", icon: CreditCard, color: "text-amber-500", msg: "Hi, I would like to request a refund or return." },
  { value: "account_login", label: "Account / Login", icon: User, color: "text-purple-500", msg: "Hi, I need help with my account or login." },
  { value: "vendor_collaboration", label: "Become Reseller", icon: HelpCircle, color: "text-pink-500", msg: "Hi, I want to become a reseller on Pigma." },
  { value: "technical_bug", label: "Technical Bug", icon: Bug, color: "text-red-500", msg: "Hi, I found a technical issue on the website." },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-neutral-500", msg: "Hi, I need support regarding your website." },
];

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState("welcome"); // welcome | categories

  const openWhatsApp = (message) => {
    window.open(whatsappLink(message), "_blank");
    setIsOpen(false);
    setStep("welcome");
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-14 right-6 z-[9999] bg-gold hover:bg-gold-dark text-black p-4 rounded-full shadow-gold-glow transition-all duration-300"
            data-testid="chat-widget-btn"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-14 right-6 z-[9999] w-[380px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200"
            data-testid="chat-widget"
          >
            {/* Header */}
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {step === "categories" && (
                  <button onClick={() => setStep("welcome")} className="hover:bg-white/10 p-1 rounded" data-testid="chat-back-btn">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Pigma Support</h3>
                  <p className="text-[10px] text-neutral-400">
                    {step === "categories" ? "Select your issue" : "Chat & Raise Ticket on WhatsApp"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); setStep("welcome"); }} className="text-white hover:bg-white/10" data-testid="chat-close-btn">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto max-h-[420px]">
              {step === "welcome" && (
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-xl p-4">
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      Welcome to Pigma Support! We're here to help. All support is handled via <strong>WhatsApp</strong> for the fastest response.
                    </p>
                  </div>

                  {/* Quick WhatsApp CTA */}
                  <button
                    onClick={() => openWhatsApp("Hi, I need support. Please create a ticket for me.")}
                    className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:shadow-md"
                    style={{ backgroundColor: "#25D366" }}
                    data-testid="wa-quick-support"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-white">Chat & Raise Ticket on WhatsApp</p>
                      <p className="text-xs text-white/70">Fastest way to get help</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-white/60 shrink-0" />
                  </button>

                  {/* Specific issue selector */}
                  <button
                    onClick={() => setStep("categories")}
                    className="w-full flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition-colors text-left"
                    data-testid="wa-specific-issue"
                  >
                    <div className="w-10 h-10 bg-neutral-200 rounded-lg flex items-center justify-center shrink-0">
                      <HelpCircle className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-neutral-800">I have a specific issue</p>
                      <p className="text-xs text-neutral-500">Select a category for a guided message</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-400 shrink-0" />
                  </button>
                </div>
              )}

              {/* Category Selection → opens WhatsApp with pre-filled message */}
              {step === "categories" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-neutral-700 mb-1">What's your issue about?</p>
                  <p className="text-xs text-neutral-500 mb-3">Select a category — we'll open WhatsApp with a pre-filled message for faster support.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => openWhatsApp(cat.msg)}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-200 hover:border-[#25D366] hover:bg-green-50/30 transition-all text-center group"
                          data-testid={`wa-cat-${cat.value}`}
                        >
                          <Icon className={`h-5 w-5 ${cat.color} group-hover:text-[#25D366] transition-colors`} />
                          <span className="text-xs font-medium text-neutral-700">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-neutral-200 shrink-0">
              <p className="text-[10px] text-center text-neutral-400">
                Pigma Support via WhatsApp &bull; Tickets auto-tracked
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
