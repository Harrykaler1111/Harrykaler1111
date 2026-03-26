import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";
import {
  ArrowLeft, Package, MessageSquare, AlertTriangle,
  CheckCircle, XCircle, Clock, Send, RotateCcw
} from "lucide-react";

const STATUS_STYLES = {
  requested: "bg-blue-500/20 text-blue-600",
  vendor_approved: "bg-green-500/20 text-green-600",
  vendor_rejected: "bg-red-500/20 text-red-600",
  item_shipped_back: "bg-purple-500/20 text-purple-600",
  item_received: "bg-teal-500/20 text-teal-600",
  refund_processing: "bg-yellow-500/20 text-yellow-600",
  refunded: "bg-emerald-500/20 text-emerald-600",
  closed: "bg-neutral-500/20 text-neutral-500",
  disputed: "bg-orange-500/20 text-orange-600",
};

const REASON_LABELS = {
  defective: "Defective Product",
  wrong_item: "Wrong Item Received",
  not_as_described: "Not As Described",
  size_issue: "Size/Fit Issue",
  damaged_in_transit: "Damaged in Transit",
  late_delivery: "Late Delivery",
  changed_mind: "Changed My Mind",
  other: "Other"
};

export const ReturnsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [activeReturn, setActiveReturn] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [form, setForm] = useState({ order_id: "", reason: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/returns/me`, { headers });
      setReturns(res.data || []);
    } catch { toast.error("Failed to load returns"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReturns();
    axios.get(`${API}/returns/reasons`).then(r => setReasons(r.data)).catch(() => {});
  }, []);

  const openReturn = async (id) => {
    try {
      const res = await axios.get(`${API}/returns/${id}`, { headers });
      setActiveReturn(res.data);
      setView("detail");
    } catch { toast.error("Failed to load return"); }
  };

  const submitReturn = async (e) => {
    e.preventDefault();
    if (!form.order_id || !form.reason || !form.description) {
      toast.error("Please fill all fields"); return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/returns`, form, { headers });
      toast.success("Return request submitted!");
      setForm({ order_id: "", reason: "", description: "" });
      setView("list");
      fetchReturns();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSubmitting(false); }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeReturn) return;
    setSending(true);
    try {
      await axios.post(`${API}/returns/${activeReturn.return_id}/message`, { message, attachments: [] }, { headers });
      toast.success("Message sent");
      setMessage("");
      openReturn(activeReturn.return_id);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSending(false); }
  };

  const escalateDispute = async () => {
    if (!disputeReason.trim() || !activeReturn) return;
    try {
      await axios.post(`${API}/returns/${activeReturn.return_id}/dispute`, { reason: disputeReason }, { headers });
      toast.success("Dispute escalated to admin");
      setDisputeReason("");
      openReturn(activeReturn.return_id);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-white" data-testid="returns-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <Button variant="ghost" size="sm" onClick={() => { setView("list"); setActiveReturn(null); }}
                className="text-neutral-500" data-testid="back-btn">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <h1 className="font-serif text-2xl md:text-3xl font-bold" data-testid="returns-title">
              {view === "create" ? "Request Return" : view === "detail" ? "Return Details" : "My Returns"}
            </h1>
          </div>
          {view === "list" && (
            <Button className="bg-black text-white hover:bg-neutral-800" size="sm" onClick={() => setView("create")}
              data-testid="request-return-btn">
              <RotateCcw className="h-4 w-4 mr-1" /> Request Return
            </Button>
          )}
        </div>

        {view === "list" && (
          <div className="space-y-3" data-testid="returns-list">
            {loading ? (
              <div className="text-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black mx-auto" /></div>
            ) : returns.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-neutral-300 rounded-xl">
                <Package className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">No return requests</p>
              </div>
            ) : (
              returns.map(r => (
                <motion.div key={r.return_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => openReturn(r.return_id)}
                  className="border border-neutral-200 rounded-xl p-4 hover:border-neutral-400 cursor-pointer transition-colors"
                  data-testid={`return-${r.return_id}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs text-neutral-400">{r.return_id}</span>
                      <p className="text-sm font-medium text-neutral-900 mt-0.5">Order: {r.order_id}</p>
                      <p className="text-xs text-neutral-500">{REASON_LABELS[r.reason] || r.reason} - {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-medium ${STATUS_STYLES[r.status]}`}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {view === "create" && (
          <form onSubmit={submitReturn} className="space-y-5" data-testid="return-form">
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1.5">Order ID *</label>
              <Input value={form.order_id} onChange={(e) => setForm(f => ({ ...f, order_id: e.target.value }))}
                placeholder="Enter your order ID" className="border-neutral-300" data-testid="return-order-id" />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1.5">Reason *</label>
              <select value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full h-10 px-3 border border-neutral-300 rounded-md text-sm" data-testid="return-reason">
                <option value="">Select reason</option>
                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1.5">Description *</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue..." rows={4}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm resize-none" data-testid="return-description" />
            </div>
            <Button type="submit" disabled={submitting} className="bg-black text-white hover:bg-neutral-800"
              data-testid="submit-return-btn">
              {submitting ? "Submitting..." : "Submit Return Request"}
            </Button>
          </form>
        )}

        {view === "detail" && activeReturn && (
          <div className="space-y-5" data-testid="return-detail">
            <div className="border border-neutral-200 rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-mono text-xs text-neutral-400">{activeReturn.return_id}</span>
                  <h2 className="text-lg font-bold mt-1">Order: {activeReturn.order_id}</h2>
                  <p className="text-sm text-neutral-500">Vendor: {activeReturn.vendor_name || "N/A"}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full uppercase font-medium ${STATUS_STYLES[activeReturn.status]}`}>
                  {activeReturn.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm text-neutral-700 mb-2">{activeReturn.description}</p>
              <div className="flex gap-4 text-xs text-neutral-400">
                <span>Reason: <strong className="text-neutral-600">{REASON_LABELS[activeReturn.reason]}</strong></span>
                <span>Amount: <strong className="text-neutral-600">Rs. {activeReturn.refund_amount?.toLocaleString()}</strong></span>
                <span>Created: {new Date(activeReturn.created_at).toLocaleString()}</span>
              </div>

              {activeReturn.vendor_response && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  activeReturn.vendor_response.action === "approved" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}>
                  Vendor {activeReturn.vendor_response.action} {activeReturn.vendor_response.reason ? `- ${activeReturn.vendor_response.reason}` : ""}
                </div>
              )}

              {activeReturn.admin_override && (
                <div className="mt-3 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
                  Admin override: {activeReturn.admin_override.action} by {activeReturn.admin_override.admin_name}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="space-y-2" data-testid="return-messages">
              {activeReturn.messages?.length > 0 ? activeReturn.messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm ${
                  m.sender_type === "customer" ? "bg-neutral-50 border-neutral-200 mr-8"
                  : m.sender_type === "vendor" ? "bg-blue-50 border-blue-200 ml-8"
                  : "bg-purple-50 border-purple-200 ml-8"
                }`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{m.sender_name} ({m.sender_type})</span>
                    <span className="text-xs text-neutral-400">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
              )) : <p className="text-center text-sm text-neutral-400 py-4">No messages yet</p>}
            </div>

            {/* Reply */}
            {!["refunded", "closed"].includes(activeReturn.status) && (
              <div className="flex gap-2 items-end">
                <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..." rows={2}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-md text-sm resize-none" data-testid="return-message-input" />
                <Button onClick={sendMessage} disabled={sending} className="bg-black text-white" data-testid="return-send-btn">
                  <Send className="h-4 w-4 mr-1" /> Send
                </Button>
              </div>
            )}

            {/* Dispute button */}
            {activeReturn.status === "vendor_rejected" && (
              <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3" data-testid="dispute-section">
                <p className="text-sm font-medium text-orange-800 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Not satisfied with the vendor's decision?
                </p>
                <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why you're disputing..." rows={2}
                  className="w-full px-3 py-2 border border-orange-300 rounded-md text-sm resize-none" data-testid="dispute-reason" />
                <Button onClick={escalateDispute} className="bg-orange-600 text-white hover:bg-orange-700" size="sm"
                  data-testid="escalate-dispute-btn">
                  Escalate to Admin
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
