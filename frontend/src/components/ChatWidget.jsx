import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, ChevronLeft, TicketCheck, AlertCircle, HelpCircle, CreditCard, Package, User, Bug, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import { API } from "@/App";

const CATEGORIES = [
  { value: "order", label: "Order Issues", icon: Package, color: "text-blue-400" },
  { value: "payment", label: "Payment Issues", icon: CreditCard, color: "text-green-400" },
  { value: "refund", label: "Refund Issues", icon: CreditCard, color: "text-yellow-400" },
  { value: "account_login", label: "Account / Login", icon: User, color: "text-purple-400" },
  { value: "vendor_collaboration", label: "Vendor Collab", icon: HelpCircle, color: "text-pink-400" },
  { value: "technical_bug", label: "Technical Bug", icon: Bug, color: "text-red-400" },
  { value: "influencer", label: "Influencer Issues", icon: User, color: "text-teal-400" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-neutral-400" },
];

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState("welcome"); // welcome | categories | form | submitting | success | chat
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [createdTicket, setCreatedTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, step]);

  const getToken = () => localStorage.getItem("pigma_token");

  const resetForm = () => {
    setStep("welcome");
    setSelectedCategory(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setCreatedTicket(null);
  };

  const handleSubmitTicket = async () => {
    if (!title.trim() || !description.trim()) return;
    const token = getToken();
    if (!token) {
      setStep("welcome");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/tickets`, {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        priority,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCreatedTicket(res.data.ticket);
      setStep("success");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to create ticket. Please try again.";
      setCreatedTicket(null);
      setStep("form");
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { message: chatInput, session_id: sessionId });
      setSessionId(res.data.session_id);
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
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
            className="fixed bottom-6 right-6 z-[9999] bg-gold hover:bg-gold-dark text-black p-4 rounded-full shadow-gold-glow transition-all duration-300"
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
            className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[540px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200"
            data-testid="chat-widget"
          >
            {/* Header */}
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {step !== "welcome" && step !== "chat" && (
                  <button onClick={() => step === "form" ? setStep("categories") : step === "categories" ? setStep("welcome") : step === "success" ? resetForm() : null} className="hover:bg-white/10 p-1 rounded" data-testid="chat-back-btn">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {step === "chat" && (
                  <button onClick={() => { setStep("welcome"); setMessages([]); setSessionId(null); }} className="hover:bg-white/10 p-1 rounded" data-testid="chat-back-btn">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="w-9 h-9 bg-gold rounded-full flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Pigma Support</h3>
                  <p className="text-[10px] text-neutral-400">
                    {step === "chat" ? "AI Assistant" : step === "success" ? "Ticket Created" : "How can we help?"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10" data-testid="chat-close-btn">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
              {/* Welcome */}
              {step === "welcome" && (
                <div className="space-y-4">
                  <div className="bg-neutral-50 rounded-xl p-4">
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      Welcome to Pigma Support! How would you like us to help?
                    </p>
                  </div>
                  <button
                    onClick={() => { if (!getToken()) { alert("Please login first to create a support ticket."); return; } setStep("categories"); }}
                    className="w-full flex items-center gap-3 p-4 bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors text-left"
                    data-testid="create-ticket-option"
                  >
                    <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center shrink-0">
                      <TicketCheck className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Create Support Ticket</p>
                      <p className="text-xs text-neutral-400">Get help from our team with tracking</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setStep("chat"); setMessages([{ role: "assistant", content: "Hi! I'm Pigma's AI assistant. How can I help you today?" }]); }}
                    className="w-full flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition-colors text-left"
                    data-testid="quick-chat-option"
                  >
                    <div className="w-10 h-10 bg-neutral-200 rounded-lg flex items-center justify-center shrink-0">
                      <MessageCircle className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-neutral-800">Quick Chat with AI</p>
                      <p className="text-xs text-neutral-500">Ask our AI assistant anything</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Category Selection */}
              {step === "categories" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-neutral-700 mb-3">What's your issue about?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          onClick={() => { setSelectedCategory(cat.value); setStep("form"); }}
                          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-200 hover:border-gold hover:bg-gold/5 transition-all text-center"
                          data-testid={`ticket-cat-${cat.value}`}
                        >
                          <Icon className={`h-5 w-5 ${cat.color}`} />
                          <span className="text-xs font-medium text-neutral-700">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ticket Form */}
              {step === "form" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="px-2 py-0.5 bg-gold/10 text-gold rounded font-medium capitalize">{CATEGORIES.find(c => c.value === selectedCategory)?.label}</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Title *</label>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Brief summary of your issue"
                      className="text-sm"
                      data-testid="ticket-title-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Description *</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Please describe your issue in detail..."
                      rows={4}
                      className="w-full text-sm border border-neutral-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none"
                      data-testid="ticket-desc-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 mb-1 block">Priority</label>
                    <div className="flex gap-2">
                      {["low", "medium", "high"].map(p => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                            priority === p
                              ? p === "high" ? "bg-red-500 text-white" : p === "medium" ? "bg-yellow-500 text-black" : "bg-green-500 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                          data-testid={`ticket-priority-${p}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Success */}
              {step === "success" && createdTicket && (
                <div className="flex flex-col items-center justify-center text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <TicketCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-800">Ticket Created!</h3>
                    <p className="text-sm text-neutral-500 mt-1">Your ticket has been submitted successfully.</p>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 w-full text-left space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Ticket ID</span>
                      <span className="font-mono font-medium text-gold" data-testid="ticket-created-id">{createdTicket.ticket_id}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Category</span>
                      <span className="capitalize">{CATEGORIES.find(c => c.value === createdTicket.category)?.label}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Priority</span>
                      <span className={`capitalize font-medium ${createdTicket.priority === "high" ? "text-red-500" : createdTicket.priority === "medium" ? "text-yellow-600" : "text-green-600"}`}>{createdTicket.priority}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Status</span>
                      <span className="text-blue-500 capitalize">{createdTicket.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400">Track your ticket in the Support page</p>
                  <Button onClick={resetForm} className="bg-black text-white hover:bg-neutral-800 w-full" data-testid="ticket-new-btn">
                    Back to Home
                  </Button>
                </div>
              )}

              {/* AI Chat */}
              {step === "chat" && (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                        msg.role === "user" ? "bg-black text-white rounded-br-sm" : "bg-neutral-100 text-black rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-100 px-4 py-2 rounded-2xl rounded-bl-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-neutral-200 shrink-0">
              {step === "form" && (
                <Button
                  onClick={handleSubmitTicket}
                  disabled={!title.trim() || !description.trim() || submitting}
                  className="w-full bg-gold text-black hover:bg-gold/90 font-semibold"
                  data-testid="ticket-submit-btn"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              )}
              {step === "chat" && (
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Type your message..."
                    className="flex-1 text-sm"
                    data-testid="chat-input"
                  />
                  <Button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} className="bg-black hover:bg-neutral-800 text-white" data-testid="chat-send-btn">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {(step === "welcome" || step === "categories") && (
                <p className="text-[10px] text-center text-neutral-400">Pigma Support &bull; Available 24/7</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
