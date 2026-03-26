import { useState, useEffect, useCallback } from "react";
import { useAuth, API } from "@/App";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/MediaUploader";
import {
  LifeBuoy, Plus, ArrowLeft, Send, Clock, AlertTriangle,
  CheckCircle, MessageSquare, Paperclip, Search, ChevronRight,
  BookOpen, RefreshCw
} from "lucide-react";

const STATUS_STYLES = {
  open: "bg-blue-500/20 text-blue-400",
  assigned: "bg-purple-500/20 text-purple-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  waiting_for_user: "bg-orange-500/20 text-orange-400",
  resolved: "bg-green-500/20 text-green-400",
  closed: "bg-neutral-500/20 text-neutral-400",
};

const PRIORITY_STYLES = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

export const SupportPage = () => {
  const { user, token } = useAuth();
  const [view, setView] = useState("list"); // list | create | detail | kb
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [categories, setCategories] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await axios.get(`${API}/tickets/me${params}`, { headers });
      setTickets(res.data.tickets || []);
      setTotal(res.data.total || 0);
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  }, [statusFilter, token]);

  useEffect(() => {
    fetchTickets();
    axios.get(`${API}/tickets/categories`).then(r => setCategories(r.data)).catch(() => {});
    axios.get(`${API}/kb/articles`).then(r => setKbArticles(r.data)).catch(() => {});
  }, [fetchTickets]);

  const openTicket = async (ticketId) => {
    try {
      const res = await axios.get(`${API}/tickets/${ticketId}`, { headers });
      setActiveTicket(res.data);
      setView("detail");
    } catch { toast.error("Failed to load ticket"); }
  };

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-white" data-testid="support-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <Button variant="ghost" size="sm" onClick={() => { setView("list"); setActiveTicket(null); }}
                className="text-neutral-500" data-testid="back-to-list">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold" data-testid="support-title">
                {view === "create" ? "New Support Ticket" : view === "detail" ? "Ticket Details" : view === "kb" ? "Help Center" : "My Support Tickets"}
              </h1>
              {view === "list" && <p className="text-sm text-neutral-500 mt-1">{total} ticket{total !== 1 ? "s" : ""}</p>}
            </div>
          </div>
          {view === "list" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setView("kb")} data-testid="help-center-btn">
                <BookOpen className="h-4 w-4 mr-1" /> Help Center
              </Button>
              <Button className="bg-black text-white hover:bg-neutral-800" size="sm" onClick={() => setView("create")} data-testid="new-ticket-btn">
                <Plus className="h-4 w-4 mr-1" /> New Ticket
              </Button>
            </div>
          )}
        </div>

        {view === "list" && (
          <TicketList tickets={tickets} loading={loading} statusFilter={statusFilter}
            setStatusFilter={setStatusFilter} openTicket={openTicket} />
        )}
        {view === "create" && (
          <CreateTicketForm categories={categories} headers={headers} userId={user?.user_id}
            onCreated={() => { setView("list"); fetchTickets(); }} kbArticles={kbArticles} />
        )}
        {view === "detail" && activeTicket && (
          <TicketDetail ticket={activeTicket} headers={headers} onUpdate={() => openTicket(activeTicket.ticket_id)} />
        )}
        {view === "kb" && <KnowledgeBase articles={kbArticles} />}
      </div>
    </div>
  );
};

// ========== TICKET LIST ==========
const TicketList = ({ tickets, loading, statusFilter, setStatusFilter, openTicket }) => (
  <div className="space-y-4">
    <div className="flex gap-2 flex-wrap" data-testid="status-filters">
      {["", "open", "in_progress", "waiting_for_user", "resolved", "closed"].map(s => (
        <button key={s} onClick={() => setStatusFilter(s)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            statusFilter === s ? "bg-black text-white border-black" : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
          }`} data-testid={`filter-${s || "all"}`}>
          {s ? s.replace(/_/g, " ") : "All"}
        </button>
      ))}
    </div>

    {loading ? (
      <div className="text-center py-16 text-neutral-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black mx-auto" />
      </div>
    ) : tickets.length === 0 ? (
      <div className="text-center py-16 border border-dashed border-neutral-300 rounded-xl">
        <LifeBuoy className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
        <p className="text-neutral-500">No tickets found</p>
        <p className="text-sm text-neutral-400 mt-1">Create a new ticket to get help</p>
      </div>
    ) : (
      <div className="space-y-3" data-testid="ticket-list">
        {tickets.map(t => (
          <motion.div key={t.ticket_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => openTicket(t.ticket_id)}
            className="border border-neutral-200 rounded-xl p-4 hover:border-neutral-400 cursor-pointer transition-colors group"
            data-testid={`ticket-${t.ticket_id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-neutral-400">{t.ticket_id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${PRIORITY_STYLES[t.priority]}`}>
                    {t.priority}
                  </span>
                </div>
                <h3 className="font-medium text-neutral-900 truncate">{t.title}</h3>
                <p className="text-sm text-neutral-500 mt-0.5 truncate">{t.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium ${STATUS_STYLES[t.status]}`}>
                  {t.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-neutral-400">{new Date(t.created_at).toLocaleDateString()}</span>
                <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);

// ========== CREATE TICKET FORM ==========
const CreateTicketForm = ({ categories, headers, userId, onCreated, kbArticles }) => {
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "medium" });
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleTitleChange = (title) => {
    setForm(f => ({ ...f, title }));
    if (title.length > 3 && kbArticles.length > 0) {
      const words = title.toLowerCase().split(" ");
      const matched = kbArticles.filter(a =>
        words.some(w => a.title.toLowerCase().includes(w) || a.category.toLowerCase().includes(w))
      ).slice(0, 3);
      setSuggestions(matched);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/tickets`, {
        ...form,
        attachments: attachments.map(a => typeof a === "string" ? a : a.url)
      }, { headers });
      toast.success("Ticket created successfully!");
      onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to create ticket"); }
    finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-ticket-form">
      {/* KB Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4" data-testid="kb-suggestions">
          <p className="text-sm font-medium text-blue-800 mb-2">
            <BookOpen className="h-4 w-4 inline mr-1" /> These articles might help:
          </p>
          {suggestions.map(a => (
            <div key={a.article_id} className="text-sm text-blue-700 py-1 hover:underline cursor-pointer">
              {a.title}
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-1.5">Issue Title *</label>
        <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Briefly describe your issue..." className="border-neutral-300" data-testid="ticket-title" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1.5">Category *</label>
          <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full h-10 px-3 border border-neutral-300 rounded-md text-sm" data-testid="ticket-category">
            <option value="">Select category</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 block mb-1.5">Priority</label>
          <select value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
            className="w-full h-10 px-3 border border-neutral-300 rounded-md text-sm" data-testid="ticket-priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-1.5">Description *</label>
        <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe your issue in detail..."
          rows={5} className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm resize-none" data-testid="ticket-description" />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-1.5">Attachments (optional)</label>
        <MediaUploader value={attachments} onChange={setAttachments} maxFiles={5} userId={userId || "anonymous"} />
      </div>

      <Button type="submit" disabled={submitting} className="bg-black text-white hover:bg-neutral-800 w-full sm:w-auto"
        data-testid="submit-ticket-btn">
        {submitting ? "Creating..." : "Submit Ticket"}
      </Button>
    </form>
  );
};

// ========== TICKET DETAIL ==========
const TicketDetail = ({ ticket, headers, onUpdate }) => {
  const [reply, setReply] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [sending, setSending] = useState(false);

  const sendReply = async () => {
    if (!reply.trim()) { toast.error("Please enter a message"); return; }
    setSending(true);
    try {
      await axios.post(`${API}/tickets/${ticket.ticket_id}/reply`, {
        message: reply,
        attachments: replyAttachments.map(a => typeof a === "string" ? a : a.url)
      }, { headers });
      toast.success("Reply sent");
      setReply("");
      setReplyAttachments([]);
      onUpdate();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSending(false); }
  };

  const handleReopen = async () => {
    try {
      await axios.put(`${API}/tickets/${ticket.ticket_id}/reopen`, {}, { headers });
      toast.success("Ticket reopened");
      onUpdate();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const slaDeadline = ticket.sla_deadline ? new Date(ticket.sla_deadline) : null;
  const now = new Date();
  const slaPassed = slaDeadline && now > slaDeadline;

  return (
    <div className="space-y-6" data-testid="ticket-detail">
      {/* Header */}
      <div className="border border-neutral-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="font-mono text-xs text-neutral-400">{ticket.ticket_id}</span>
            <h2 className="text-xl font-bold text-neutral-900 mt-1">{ticket.title}</h2>
          </div>
          <div className="flex gap-2">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium ${PRIORITY_STYLES[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium ${STATUS_STYLES[ticket.status]}`}>
              {ticket.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <p className="text-sm text-neutral-600 mb-3">{ticket.description}</p>
        <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
          <span>Category: <strong className="text-neutral-600">{ticket.category.replace(/_/g, " ")}</strong></span>
          <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
          {ticket.assigned_name && <span>Assigned: <strong className="text-neutral-600">{ticket.assigned_name}</strong></span>}
          {slaDeadline && (
            <span className={slaPassed ? "text-red-500 font-medium" : ""}>
              <Clock className="h-3 w-3 inline mr-0.5" />
              SLA: {slaPassed ? "Overdue" : slaDeadline.toLocaleString()}
            </span>
          )}
        </div>
        {ticket.attachments?.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {ticket.attachments.map((a, i) => (
              <a key={i} href={a} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> Attachment {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="space-y-3" data-testid="ticket-replies">
        {ticket.replies?.length > 0 ? ticket.replies.map(r => (
          <div key={r.reply_id}
            className={`p-4 rounded-xl border ${
              r.sender_type === "support" || r.sender_type === "admin"
                ? "bg-blue-50 border-blue-200 ml-4"
                : "bg-neutral-50 border-neutral-200 mr-4"
            }`} data-testid={`reply-${r.reply_id}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-neutral-800">
                {r.sender_name} {r.sender_type === "support" ? "(Support)" : ""}
              </span>
              <span className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{r.message}</p>
            {r.attachments?.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.attachments.map((a, i) => (
                  <a key={i} href={a} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Attachment</a>
                ))}
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-8 text-neutral-400 text-sm">No replies yet. Support team will respond soon.</div>
        )}
      </div>

      {/* Reply box or Reopen */}
      {ticket.status === "closed" || ticket.status === "resolved" ? (
        <div className="border border-neutral-200 rounded-xl p-4 text-center">
          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-neutral-600 mb-3">This ticket has been {ticket.status}.</p>
          <Button variant="outline" size="sm" onClick={handleReopen} data-testid="reopen-ticket-btn">
            <RefreshCw className="h-4 w-4 mr-1" /> Reopen Ticket
          </Button>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl p-4 space-y-3" data-testid="reply-form">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..." rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm resize-none" data-testid="reply-input" />
          <div className="flex items-center justify-between">
            <MediaUploader value={replyAttachments} onChange={setReplyAttachments} maxFiles={3} userId="ticket" />
            <Button onClick={sendReply} disabled={sending} className="bg-black text-white hover:bg-neutral-800 ml-3"
              data-testid="send-reply-btn">
              <Send className="h-4 w-4 mr-1" /> {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== KNOWLEDGE BASE ==========
const KnowledgeBase = ({ articles }) => {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="space-y-4" data-testid="knowledge-base">
      {articles.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
          <p>No help articles available yet</p>
        </div>
      ) : (
        articles.map(a => (
          <div key={a.article_id} className="border border-neutral-200 rounded-xl overflow-hidden" data-testid={`kb-${a.article_id}`}>
            <button onClick={() => setExpandedId(expandedId === a.article_id ? null : a.article_id)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div>
                <span className="text-xs text-neutral-400 uppercase">{a.category.replace(/_/g, " ")}</span>
                <h3 className="font-medium text-neutral-900">{a.title}</h3>
              </div>
              <ChevronRight className={`h-4 w-4 text-neutral-400 transition-transform ${expandedId === a.article_id ? "rotate-90" : ""}`} />
            </button>
            {expandedId === a.article_id && (
              <div className="px-4 pb-4 text-sm text-neutral-600 whitespace-pre-wrap border-t border-neutral-100 pt-3">
                {a.content}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
