import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ShoppingCart, Users, UserCheck, 
  Percent, Tag, TrendingUp, DollarSign, AlertTriangle, ChevronRight,
  Plus, Edit2, Trash2, Check, X, Eye, Wallet, CreditCard, LogOut,
  Shield, Instagram, Settings, User, Lock, Store, FileCheck, Upload,
  LifeBuoy, Send, BookOpen, Clock, MessageSquare, Star
} from "lucide-react";
import { MediaUploader } from "@/components/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { HeroVideoManagement, ReferralTiersManagement, InstagramDMManagement, WhatsAppRemindersManagement } from "@/components/AdminSiteSettings";
import { AdminBoosterPanel } from "@/components/AdminBoosterPanel";
import { AdminReviewsPanel } from "@/components/AdminReviewsPanel";
import { AdminOrdersPanel } from "@/components/AdminOrdersPanel";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Get admin auth headers
const getAdminHeaders = () => {
  const token = localStorage.getItem("pigma_admin_token");
  return { Authorization: `Bearer ${token}` };
};

// Get current admin
const getAdmin = () => {
  const admin = localStorage.getItem("pigma_admin");
  return admin ? JSON.parse(admin) : null;
};

// Check permission
const hasPermission = (resource, action) => {
  const admin = getAdmin();
  if (!admin?.permissions) return false;
  const resourcePerms = admin.permissions[resource] || [];
  return resourcePerms.includes(action);
};

// Dashboard Overview Component
const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API}/admin/dashboard`, {
          headers: getAdminHeaders()
        });
        setStats(response.data);
      } catch (error) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
          label="Total Revenue"
          value={`₹${(stats?.stats?.total_revenue || 0).toLocaleString()}`}
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-blue-400" />}
          label="Total Orders"
          value={stats?.stats?.total_orders || 0}
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-400" />}
          label="Influencers"
          value={stats?.stats?.total_influencers || 0}
          bg="bg-purple-500/10"
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-gold" />}
          label="Commissions Paid"
          value={`₹${(stats?.stats?.total_influencer_commissions || 0).toLocaleString()}`}
          bg="bg-gold/10"
        />
      </div>

      {/* Pending Actions */}
      {(stats?.stats?.pending_influencers > 0 || stats?.stats?.pending_withdrawals > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="flex-1">
            <p className="font-medium text-white">Pending Actions</p>
            <p className="text-sm text-neutral-400">
              {stats?.stats?.pending_influencers || 0} influencer approvals, 
              {stats?.stats?.pending_withdrawals || 0} withdrawal requests
            </p>
          </div>
          <Link to="/admin/withdrawals">
            <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-400">
              Review
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Orders</h3>
            <Link to="/admin/orders" className="text-sm text-gold hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {stats?.recent_orders?.slice(0, 5).map((order) => (
              <div key={order.order_id} className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-0">
                <div>
                  <p className="font-medium text-sm text-white">{order.order_id}</p>
                  <p className="text-xs text-neutral-400">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">₹{order.total?.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    order.status === "delivered" ? "bg-green-500/20 text-green-400" : "bg-neutral-700 text-neutral-300"
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {(!stats?.recent_orders || stats.recent_orders.length === 0) && (
              <p className="text-neutral-500 text-center py-4">No recent orders</p>
            )}
          </div>
        </div>

        {/* Top Influencers */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Top Influencers</h3>
            <Link to="/admin/influencers" className="text-sm text-gold hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {stats?.top_influencers?.map((inf, idx) => (
              <div key={inf.influencer_id} className="flex items-center gap-3 py-2 border-b border-neutral-700 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx === 0 ? "bg-gold text-black" : "bg-neutral-700 text-white"
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-white">{inf.name}</p>
                  <p className="text-xs text-neutral-400">{inf.total_conversions} conversions</p>
                </div>
                <p className="font-medium text-gold">₹{inf.total_earnings?.toLocaleString()}</p>
              </div>
            ))}
            {(!stats?.top_influencers || stats.top_influencers.length === 0) && (
              <p className="text-neutral-500 text-center py-4">No influencers yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, bg }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4"
  >
    <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
      {icon}
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-sm text-neutral-400">{label}</p>
  </motion.div>
);

// Orders Management
const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API}/admin/orders`, {
          headers: getAdminHeaders()
        });
        setOrders(response.data);
      } catch (error) {
        toast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(
        `${API}/admin/orders/${orderId}/status?status=${status}`,
        {},
        { headers: getAdminHeaders() }
      );
      toast.success("Order status updated");
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status } : o));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    }
  };

  const canUpdate = hasPermission("orders", "update");

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Orders Management</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Order ID</TableHead>
              <TableHead className="text-neutral-400">Date</TableHead>
              <TableHead className="text-neutral-400">Items</TableHead>
              <TableHead className="text-neutral-400">Total</TableHead>
              <TableHead className="text-neutral-400">Payment</TableHead>
              <TableHead className="text-neutral-400">Referral</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              {canUpdate && <TableHead className="text-neutral-400">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.order_id} className="border-neutral-700">
                <TableCell className="font-mono text-sm text-white">{order.order_id}</TableCell>
                <TableCell className="text-neutral-300">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-neutral-300">{order.items?.length || 0}</TableCell>
                <TableCell className="text-white">₹{order.total?.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {order.payment_status}
                  </span>
                </TableCell>
                <TableCell className="text-neutral-400">{order.referral_code || "-"}</TableCell>
                <TableCell>
                  {canUpdate ? (
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateStatus(order.order_id, value)}
                    >
                      <SelectTrigger className="w-32 h-8 bg-neutral-900 border-neutral-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="capitalize text-neutral-300">{order.status}</span>
                  )}
                </TableCell>
                {canUpdate && (
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && orders.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No orders found</div>
        )}
      </div>
    </div>
  );
};

// Influencer Management with full control actions
const InfluencerManagement = () => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        const response = await axios.get(`${API}/influencers`, { headers: getAdminHeaders() });
        setInfluencers(response.data);
      } catch { toast.error("Failed to load influencers"); }
      finally { setLoading(false); }
    };
    fetchInfluencers();
  }, []);

  const updateStatus = async (influencerId, status) => {
    try {
      await axios.put(`${API}/influencers/${influencerId}/status?status=${status}`, {}, { headers: getAdminHeaders() });
      toast.success(`Influencer ${status}`);
      setInfluencers(influencers.map(i => i.influencer_id === influencerId ? { ...i, status } : i));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
  };

  const controlAction = async (influencerId, action) => {
    const reason = window.prompt(`Reason for ${action}:`, "Policy violation");
    if (!reason) return;
    try {
      await axios.put(`${API}/admin/user-control/influencer/${influencerId}/${action}?reason=${encodeURIComponent(reason)}`, {}, { headers: getAdminHeaders() });
      toast.success(`Influencer ${action}d`);
      const newStatus = action === "reactivate" ? "approved" : action === "discontinue" ? "discontinued" : action + "ed";
      setInfluencers(influencers.map(i => i.influencer_id === influencerId ? { ...i, status: newStatus } : i));
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const viewHistory = async (id) => {
    try {
      const res = await axios.get(`${API}/admin/user-control/history/influencer/${id}`, { headers: getAdminHeaders() });
      setHistory(res.data);
      setHistoryTarget(id);
    } catch { toast.error("Failed to load history"); }
  };

  const canApprove = hasPermission("influencers", "approve");
  const canSuspend = hasPermission("influencers", "suspend");

  const statusBadge = (s) => {
    const map = { approved: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400", suspended: "bg-orange-500/20 text-orange-400", disconnected: "bg-red-600/20 text-red-500", discontinued: "bg-neutral-600/20 text-neutral-400", pending: "bg-yellow-500/20 text-yellow-400" };
    return map[s] || map.pending;
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Influencer Management</h2>

      {historyTarget && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-white">Action History for {historyTarget}</h3>
            <Button size="sm" variant="ghost" className="text-neutral-400" onClick={() => setHistoryTarget(null)}><X className="h-4 w-4" /></Button>
          </div>
          {history.length === 0 ? <p className="text-neutral-500 text-sm">No history</p> :
            history.map((h) => (
              <div key={h.log_id} className="flex justify-between items-center py-1.5 border-b border-neutral-700/50 last:border-0 text-xs">
                <span className={`font-medium capitalize ${h.action === "reactivate" ? "text-green-400" : "text-red-400"}`}>{h.action}</span>
                <span className="text-neutral-400">{h.reason}</span>
                <span className="text-neutral-500">by {h.admin_name} - {new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            ))
          }
        </motion.div>
      )}

      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Name</TableHead>
              <TableHead className="text-neutral-400">Instagram</TableHead>
              <TableHead className="text-neutral-400">Earnings</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              <TableHead className="text-neutral-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {influencers.map((inf) => (
              <TableRow key={inf.influencer_id} className="border-neutral-700">
                <TableCell>
                  <p className="text-white">{inf.name}</p>
                  <p className="text-xs text-neutral-400">{inf.email}</p>
                </TableCell>
                <TableCell className="text-neutral-300">@{inf.instagram_handle || "-"}</TableCell>
                <TableCell className="text-gold">{inf.total_earnings?.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge(inf.status)}`}>{inf.status}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {inf.status === "pending" && canApprove && (
                      <>
                        <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10 text-xs" onClick={() => updateStatus(inf.influencer_id, "approved")}>Approve</Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs" onClick={() => updateStatus(inf.influencer_id, "rejected")}>Reject</Button>
                      </>
                    )}
                    {inf.status === "approved" && canSuspend && (
                      <>
                        <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-500/10 text-xs" onClick={() => controlAction(inf.influencer_id, "suspend")}>Suspend</Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs" onClick={() => controlAction(inf.influencer_id, "disconnect")}>Disconnect</Button>
                      </>
                    )}
                    {(inf.status === "suspended" || inf.status === "disconnected") && canSuspend && (
                      <>
                        <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10 text-xs" onClick={() => controlAction(inf.influencer_id, "reactivate")}>Reactivate</Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-600/10 text-xs" onClick={() => controlAction(inf.influencer_id, "discontinue")}>Discontinue</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="text-neutral-400 hover:bg-neutral-700/50 text-xs" onClick={() => viewHistory(inf.influencer_id)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && influencers.length === 0 && <div className="text-center py-12 text-neutral-500">No influencers found</div>}
      </div>
    </div>
  );
};

// Withdrawal Management
const WithdrawalManagement = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const response = await axios.get(`${API}/admin/withdrawals`, {
          headers: getAdminHeaders()
        });
        setWithdrawals(response.data);
      } catch (error) {
        toast.error("Failed to load withdrawals");
      } finally {
        setLoading(false);
      }
    };
    fetchWithdrawals();
  }, []);

  const approveWithdrawal = async (withdrawalId) => {
    setProcessing(withdrawalId);
    try {
      await axios.put(
        `${API}/admin/withdrawals/${withdrawalId}/approve`,
        {},
        { headers: getAdminHeaders() }
      );
      toast.success("Withdrawal approved");
      setWithdrawals(withdrawals.map(w => 
        w.withdrawal_id === withdrawalId ? { ...w, status: "approved" } : w
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const rejectWithdrawal = async (withdrawalId) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    
    setProcessing(withdrawalId);
    try {
      await axios.put(
        `${API}/admin/withdrawals/${withdrawalId}/reject?reason=${encodeURIComponent(reason)}`,
        {},
        { headers: getAdminHeaders() }
      );
      toast.success("Withdrawal rejected");
      setWithdrawals(withdrawals.map(w => 
        w.withdrawal_id === withdrawalId ? { ...w, status: "rejected" } : w
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject");
    } finally {
      setProcessing(null);
    }
  };

  const processWithdrawal = async (withdrawalId) => {
    setProcessing(withdrawalId);
    try {
      await axios.put(
        `${API}/admin/withdrawals/${withdrawalId}/process`,
        {},
        { headers: getAdminHeaders() }
      );
      toast.success("Withdrawal processed - Payout sent!");
      setWithdrawals(withdrawals.map(w => 
        w.withdrawal_id === withdrawalId ? { ...w, status: "completed" } : w
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to process");
    } finally {
      setProcessing(null);
    }
  };

  const canApprove = hasPermission("wallets", "approve_withdrawal");
  const canProcess = hasPermission("payouts", "process");

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Withdrawal Requests</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Request ID</TableHead>
              <TableHead className="text-neutral-400">Influencer</TableHead>
              <TableHead className="text-neutral-400">Amount</TableHead>
              <TableHead className="text-neutral-400">Bank Details</TableHead>
              <TableHead className="text-neutral-400">Requested</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              {(canApprove || canProcess) && <TableHead className="text-neutral-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((wd) => (
              <TableRow key={wd.withdrawal_id} className="border-neutral-700">
                <TableCell className="font-mono text-sm text-white">{wd.withdrawal_id}</TableCell>
                <TableCell className="text-neutral-300">{wd.influencer_name || "Unknown"}</TableCell>
                <TableCell className="text-gold font-semibold">₹{wd.amount?.toLocaleString()}</TableCell>
                <TableCell className="text-neutral-300 text-sm">
                  <div>{wd.bank_details?.bank_name}</div>
                  <div className="text-neutral-500">{wd.bank_details?.account_number?.slice(-4).padStart(wd.bank_details?.account_number?.length, "*")}</div>
                </TableCell>
                <TableCell className="text-neutral-400">{new Date(wd.requested_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    wd.status === "completed" ? "bg-green-500/20 text-green-400" :
                    wd.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                    wd.status === "rejected" ? "bg-red-500/20 text-red-400" :
                    wd.status === "processing" ? "bg-purple-500/20 text-purple-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {wd.status}
                  </span>
                </TableCell>
                {(canApprove || canProcess) && (
                  <TableCell>
                    <div className="flex gap-1">
                      {wd.status === "pending" && canApprove && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={processing === wd.withdrawal_id}
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => approveWithdrawal(wd.withdrawal_id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={processing === wd.withdrawal_id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => rejectWithdrawal(wd.withdrawal_id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {wd.status === "approved" && canProcess && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processing === wd.withdrawal_id}
                          className="text-gold border-gold/50 hover:bg-gold/10"
                          onClick={() => processWithdrawal(wd.withdrawal_id)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Process
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && withdrawals.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No withdrawal requests</div>
        )}
      </div>
    </div>
  );
};

// Admin Users Management
const AdminUsersManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "", password: "", role: "support_manager", phone: "" });
  const [creating, setCreating] = useState(false);

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, { headers: getAdminHeaders() });
      setAdmins(response.data);
    } catch (error) {
      toast.error("Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const createAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`${API}/admin/users`, newAdmin, { headers: getAdminHeaders() });
      toast.success("Admin user created");
      setShowCreateForm(false);
      setNewAdmin({ email: "", name: "", password: "", role: "support_manager", phone: "" });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  };

  const deleteAdmin = async (adminId) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;
    try {
      await axios.delete(`${API}/admin/users/${adminId}`, { headers: getAdminHeaders() });
      toast.success("Admin deleted");
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete");
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: "bg-gold/20 text-gold",
      marketing_manager: "bg-blue-500/20 text-blue-400",
      finance_manager: "bg-green-500/20 text-green-400",
      support_manager: "bg-purple-500/20 text-purple-400"
    };
    return colors[role] || "bg-neutral-500/20 text-neutral-400";
  };

  const canCreate = hasPermission("admin_users", "create");
  const canDelete = hasPermission("admin_users", "delete");

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-white">Admin Users</h2>
        {canCreate && (
          <Button className="bg-gold text-black hover:bg-gold-dark" onClick={() => setShowCreateForm(!showCreateForm)} data-testid="add-admin-btn">
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        )}
      </div>

      {showCreateForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Admin User</h3>
          <form onSubmit={createAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Name</label>
              <Input value={newAdmin.name} onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="new-admin-name" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Email</label>
              <Input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="new-admin-email" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Password</label>
              <Input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" required data-testid="new-admin-password" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Role</label>
              <Select value={newAdmin.role} onValueChange={(val) => setNewAdmin({...newAdmin, role: val})}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_manager">Product Manager</SelectItem>
                  <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                  <SelectItem value="finance_manager">Finance Manager</SelectItem>
                  <SelectItem value="support_manager">Support Manager</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={creating} className="bg-gold text-black hover:bg-gold-dark" data-testid="create-admin-submit">
                {creating ? "Creating..." : "Create Admin"}
              </Button>
              <Button type="button" variant="outline" className="border-neutral-600 text-neutral-300" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Name</TableHead>
              <TableHead className="text-neutral-400">Email</TableHead>
              <TableHead className="text-neutral-400">Role</TableHead>
              <TableHead className="text-neutral-400">2FA</TableHead>
              <TableHead className="text-neutral-400">Last Login</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              {canDelete && <TableHead className="text-neutral-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.admin_id} className="border-neutral-700">
                <TableCell className="text-white">{admin.name}</TableCell>
                <TableCell className="text-neutral-300">{admin.email}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${getRoleBadge(admin.role)}`}>
                    {admin.role.replace(/_/g, " ")}
                  </span>
                </TableCell>
                <TableCell>
                  {admin.two_factor_enabled ? (
                    <span className="text-green-400"><Lock className="h-4 w-4" /></span>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </TableCell>
                <TableCell className="text-neutral-400">
                  {admin.last_login ? new Date(admin.last_login).toLocaleString() : "Never"}
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    admin.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {admin.is_active ? "Active" : "Disabled"}
                  </span>
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteAdmin(admin.admin_id)} data-testid={`delete-admin-${admin.admin_id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
      </div>
    </div>
  );
};

// Products Management (Admin)
const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editingPrice, setEditingPrice] = useState(null);
  const [newStockVal, setNewStockVal] = useState("");
  const [newPriceVal, setNewPriceVal] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: "", compare_price: "", category: "",
    sizes: "", colors: "", stock: "", is_limited_edition: false, tags: ""
  });
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API}/products?limit=100`),
        axios.get(`${API}/admin/settings/categories`, { headers: getAdminHeaders() }).catch(() => ({ data: [] }))
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${productId}`, { headers: getAdminHeaders() });
      toast.success("Product deleted");
      setProducts(products.filter(p => p.product_id !== productId));
    } catch (error) { toast.error(error.response?.data?.detail || "Failed to delete"); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) { toast.error("Name and price are required"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        compare_price: newProduct.compare_price ? parseFloat(newProduct.compare_price) : null,
        category: newProduct.category,
        sizes: newProduct.sizes ? newProduct.sizes.split(",").map(s => s.trim()) : [],
        colors: newProduct.colors ? newProduct.colors.split(",").map(s => s.trim()) : [],
        stock: parseInt(newProduct.stock) || 0,
        images: uploadedMedia.filter(m => m.type !== "video").map(m => m.url),
        videos: uploadedMedia.filter(m => m.type === "video").map(m => m.url),
        is_limited_edition: newProduct.is_limited_edition,
        tags: newProduct.tags ? newProduct.tags.split(",").map(s => s.trim()) : [],
      };
      await axios.post(`${API}/admin/products`, payload, { headers: getAdminHeaders() });
      toast.success("Product created!");
      setShowAddProduct(false);
      setNewProduct({ name: "", description: "", price: "", compare_price: "", category: "", sizes: "", colors: "", stock: "", is_limited_edition: false, tags: "" });
      setUploadedMedia([]);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to create product"); }
    finally { setSubmitting(false); }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) { toast.error("Category name required"); return; }
    try {
      await axios.post(`${API}/admin/settings/categories?name=${encodeURIComponent(newCatName)}&description=${encodeURIComponent(newCatDesc)}`, {}, { headers: getAdminHeaders() });
      toast.success("Category created!");
      setNewCatName(""); setNewCatDesc("");
      setShowAddCategory(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await axios.delete(`${API}/admin/settings/categories/${catId}`, { headers: getAdminHeaders() });
      toast.success("Category deleted");
      setCategories(categories.filter(c => c.category_id !== catId));
    } catch { toast.error("Failed to delete category"); }
  };

  const handleUpdateStock = async (productId) => {
    try {
      await axios.put(`${API}/admin/products/${productId}/stock?stock=${parseInt(newStockVal)}`, {}, { headers: getAdminHeaders() });
      toast.success("Stock updated");
      setEditingStock(null);
      fetchData();
    } catch { toast.error("Failed to update stock"); }
  };

  const handleUpdatePrice = async (productId) => {
    try {
      await axios.put(`${API}/admin/products/${productId}`, { price: parseFloat(newPriceVal) }, { headers: getAdminHeaders() });
      toast.success("Price updated");
      setEditingPrice(null);
      fetchData();
    } catch { toast.error("Failed to update price"); }
  };

  const canCreate = hasPermission("products", "create");
  const canEdit = hasPermission("products", "edit");
  const canDelete = hasPermission("products", "delete");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-bold text-white">Products Management</h2>
        <div className="flex gap-2">
          {canCreate && (
            <>
              <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => setShowAddCategory(true)} data-testid="add-category-btn">
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
              <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => setShowAddProduct(true)} data-testid="add-product-btn">
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Add Category</h3>
            <Button variant="ghost" size="sm" className="text-neutral-400" onClick={() => setShowAddCategory(false)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Category Name *</label>
              <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Ankle Boots"
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-cat-name" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Description</label>
              <Input value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} placeholder="Optional description"
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-cat-desc" />
            </div>
          </div>
          <Button className="bg-gold text-black" onClick={handleAddCategory} data-testid="save-category-btn">Save Category</Button>

          {/* Existing categories */}
          {categories.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-neutral-400 mb-2">Existing Categories:</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <Badge key={c.category_id} variant="outline" className="border-neutral-600 text-neutral-300 flex items-center gap-1 px-3 py-1">
                    {c.name}
                    <button onClick={() => handleDeleteCategory(c.category_id)} className="text-red-400 hover:text-red-300 ml-1"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Product Form */}
      {showAddProduct && (
        <form onSubmit={handleAddProduct} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Add New Product</h3>
            <Button type="button" variant="ghost" size="sm" className="text-neutral-400" onClick={() => setShowAddProduct(false)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Product Name *</label>
              <Input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Midnight Platform Boots" className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-prod-name" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Category *</label>
              <Select value={newProduct.category} onValueChange={(v) => setNewProduct(p => ({ ...p, category: v }))}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-prod-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.category_id} value={c.name}>{c.name}</SelectItem>)}
                  <SelectItem value="Platform Boots">Platform Boots</SelectItem>
                  <SelectItem value="Stiletto Heels">Stiletto Heels</SelectItem>
                  <SelectItem value="Ankle Boots">Ankle Boots</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Price (₹) *</label>
              <Input type="number" value={newProduct.price} onChange={(e) => setNewProduct(p => ({ ...p, price: e.target.value }))}
                placeholder="8999" className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-prod-price" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Compare/MRP Price (₹)</label>
              <Input type="number" value={newProduct.compare_price} onChange={(e) => setNewProduct(p => ({ ...p, compare_price: e.target.value }))}
                placeholder="12999" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Stock Quantity *</label>
              <Input type="number" value={newProduct.stock} onChange={(e) => setNewProduct(p => ({ ...p, stock: e.target.value }))}
                placeholder="50" className="bg-neutral-900 border-neutral-700 text-white" data-testid="new-prod-stock" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Sizes (comma-separated)</label>
              <Input value={newProduct.sizes} onChange={(e) => setNewProduct(p => ({ ...p, sizes: e.target.value }))}
                placeholder="6, 7, 8, 9, 10" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Colors (comma-separated)</label>
              <Input value={newProduct.colors} onChange={(e) => setNewProduct(p => ({ ...p, colors: e.target.value }))}
                placeholder="Black, Gold, Silver" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 block mb-1">Product Images & Videos</label>
              <MediaUploader value={uploadedMedia} onChange={setUploadedMedia} maxFiles={8} userId="admin" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-neutral-400 block mb-1">Description</label>
              <textarea value={newProduct.description} onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))}
                placeholder="Product description..." rows={3}
                className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-md px-3 py-2 text-sm" data-testid="new-prod-desc" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 block mb-1">Tags (comma-separated)</label>
              <Input value={newProduct.tags} onChange={(e) => setNewProduct(p => ({ ...p, tags: e.target.value }))}
                placeholder="new arrival, trending" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" checked={newProduct.is_limited_edition}
                onChange={(e) => setNewProduct(p => ({ ...p, is_limited_edition: e.target.checked }))} id="limited-ed" className="accent-gold" />
              <label htmlFor="limited-ed" className="text-sm text-neutral-300">Limited Edition</label>
            </div>
          </div>
          <Button type="submit" className="bg-gold text-black hover:bg-gold/90 font-semibold" disabled={submitting} data-testid="save-product-btn">
            {submitting ? "Creating..." : "Create Product"}
          </Button>
        </form>
      )}

      {/* Products Table */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Product</TableHead>
              <TableHead className="text-neutral-400">Category</TableHead>
              <TableHead className="text-neutral-400">Price</TableHead>
              <TableHead className="text-neutral-400">Stock</TableHead>
              <TableHead className="text-neutral-400">Limited</TableHead>
              <TableHead className="text-neutral-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.product_id} className="border-neutral-700">
                <TableCell className="text-white font-medium">{p.name}</TableCell>
                <TableCell className="text-neutral-300">{p.category}</TableCell>
                <TableCell>
                  {editingPrice === p.product_id ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={newPriceVal} onChange={(e) => setNewPriceVal(e.target.value)}
                        className="w-24 h-7 text-xs bg-neutral-900 border-neutral-600 text-white" />
                      <Button size="sm" className="h-7 px-2 bg-green-600 text-white text-xs" onClick={() => handleUpdatePrice(p.product_id)}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-neutral-400 text-xs" onClick={() => setEditingPrice(null)}>X</Button>
                    </div>
                  ) : (
                    <span className="text-gold cursor-pointer hover:underline" onClick={() => { if (canEdit) { setEditingPrice(p.product_id); setNewPriceVal(String(p.price)); } }}>
                      ₹{p.price?.toLocaleString()}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {editingStock === p.product_id ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" value={newStockVal} onChange={(e) => setNewStockVal(e.target.value)}
                        className="w-20 h-7 text-xs bg-neutral-900 border-neutral-600 text-white" />
                      <Button size="sm" className="h-7 px-2 bg-green-600 text-white text-xs" onClick={() => handleUpdateStock(p.product_id)}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-neutral-400 text-xs" onClick={() => setEditingStock(null)}>X</Button>
                    </div>
                  ) : (
                    <span className={`cursor-pointer hover:underline ${p.stock < 10 ? "text-red-400" : "text-neutral-300"}`}
                      onClick={() => { if (canEdit) { setEditingStock(p.product_id); setNewStockVal(String(p.stock)); } }}>
                      {p.stock}
                    </span>
                  )}
                </TableCell>
                <TableCell>{p.is_limited_edition ? <Badge variant="outline" className="border-gold text-gold">Limited</Badge> : "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button size="sm" variant="ghost" className="text-blue-400 h-7 px-2 text-xs"
                        onClick={() => { setEditingPrice(p.product_id); setNewPriceVal(String(p.price)); }}>
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2" onClick={() => deleteProduct(p.product_id)} data-testid={`delete-prod-${p.product_id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && products.length === 0 && <div className="text-center py-12 text-neutral-500">No products yet. Click "Add Product" to create one.</div>}
      </div>
    </div>
  );
};

// Customers Management
const CustomersManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get(`${API}/admin/customers`, { headers: getAdminHeaders() });
        setCustomers(response.data);
      } catch (error) {
        toast.error("Failed to load customers");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Customers</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Name</TableHead>
              <TableHead className="text-neutral-400">Email</TableHead>
              <TableHead className="text-neutral-400">Phone</TableHead>
              <TableHead className="text-neutral-400">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.user_id} className="border-neutral-700">
                <TableCell className="text-white">{c.name}</TableCell>
                <TableCell className="text-neutral-300">{c.email}</TableCell>
                <TableCell className="text-neutral-300">{c.phone || "-"}</TableCell>
                <TableCell className="text-neutral-400">{new Date(c.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && customers.length === 0 && <div className="text-center py-12 text-neutral-500">No customers yet</div>}
      </div>
    </div>
  );
};

// Marketing Hub - Coupons, Offers & Rewards Management
const CouponsManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("coupons");
  const [form, setForm] = useState({
    code: "", discount_type: "percentage", discount_value: "", min_order_value: "",
    max_uses: "100", expires_at: "", affiliate_id: ""
  });
  const [creating, setCreating] = useState(false);

  // Targets & rewards from settings
  const [settings, setSettings] = useState(null);
  const [targetForm, setTargetForm] = useState({ name: "", target_type: "influencer", target_amount: "", reward_type: "bonus", reward_value: "", is_active: true });

  // Marketing tab RBAC: only super_admin and marketing_manager can access
  const admin = getAdmin();
  const isMarketingAuthorized = admin && (admin.role === "super_admin" || admin.role === "marketing_manager");

  const fetchData = async () => {
    try {
      const [couponRes, settingsRes] = await Promise.all([
        axios.get(`${API}/coupons`, { headers: getAdminHeaders() }),
        axios.get(`${API}/admin/settings/commission`, { headers: getAdminHeaders() }).catch(() => ({ data: null }))
      ]);
      setCoupons(couponRes.data);
      setSettings(settingsRes.data);
    } catch { toast.error("Failed to load coupons"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isMarketingAuthorized) fetchData(); }, [isMarketingAuthorized]);

  if (!isMarketingAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
        <Shield className="h-12 w-12 mb-3 text-neutral-600" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm">Only Super Admin and Marketing Manager can access this section.</p>
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) { toast.error("Code and discount required"); return; }
    setCreating(true);
    try {
      await axios.post(`${API}/coupons`, {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_value: parseFloat(form.min_order_value) || 0,
        max_uses: parseInt(form.max_uses) || 100,
        expires_at: form.expires_at || null,
        affiliate_id: form.affiliate_id || null,
      }, { headers: getAdminHeaders() });
      toast.success("Coupon created!");
      setShowCreate(false);
      setForm({ code: "", discount_type: "percentage", discount_value: "", min_order_value: "", max_uses: "100", expires_at: "", affiliate_id: "" });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const toggleCoupon = async (couponId) => {
    try {
      await axios.put(`${API}/coupons/${couponId}/toggle`, {}, { headers: getAdminHeaders() });
      toast.success("Coupon updated");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const deleteCoupon = async (couponId) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await axios.delete(`${API}/coupons/${couponId}`, { headers: getAdminHeaders() });
      toast.success("Coupon deleted");
      setCoupons(coupons.filter(c => c.coupon_id !== couponId));
    } catch { toast.error("Failed"); }
  };

  const addTarget = async () => {
    if (!targetForm.name || !targetForm.target_amount) { toast.error("Name and amount required"); return; }
    try {
      await axios.post(`${API}/admin/settings/commission/targets`, {
        ...targetForm,
        target_amount: parseFloat(targetForm.target_amount),
        reward_value: parseFloat(targetForm.reward_value) || 0,
      }, { headers: getAdminHeaders() });
      toast.success("Target added!");
      setTargetForm({ name: "", target_type: "influencer", target_amount: "", reward_type: "bonus", reward_value: "", is_active: true });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const removeTarget = async (targetId) => {
    try {
      await axios.delete(`${API}/admin/settings/commission/targets/${targetId}`, { headers: getAdminHeaders() });
      toast.success("Target removed");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const addReward = async () => {
    if (!targetForm.name || !targetForm.target_amount) { toast.error("Name and amount required"); return; }
    try {
      await axios.post(`${API}/admin/settings/commission/rewards`, {
        ...targetForm,
        target_amount: parseFloat(targetForm.target_amount),
        reward_value: parseFloat(targetForm.reward_value) || 0,
      }, { headers: getAdminHeaders() });
      toast.success("Reward added!");
      setTargetForm({ name: "", target_type: "influencer", target_amount: "", reward_type: "bonus", reward_value: "", is_active: true });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const removeReward = async (rewardId) => {
    try {
      await axios.delete(`${API}/admin/settings/commission/rewards/${rewardId}`, { headers: getAdminHeaders() });
      toast.success("Reward removed");
      fetchData();
    } catch { toast.error("Failed"); }
  };

  const canCreate = hasPermission("coupons", "create");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-bold text-white">Marketing Hub</h2>
        {canCreate && (
          <Button className="bg-gold text-black hover:bg-gold/90" onClick={() => setShowCreate(true)} data-testid="create-coupon-btn">
            <Plus className="h-4 w-4 mr-1" /> Create Coupon
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-800 pb-3">
        {["coupons", "targets", "rewards"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${tab === t ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}>
            {t === "coupons" ? "Coupons & Offers" : t === "targets" ? "Sales Targets" : "Rewards"}
          </button>
        ))}
      </div>

      {/* Create Coupon Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Create Coupon / Offer</h3>
            <Button type="button" variant="ghost" size="sm" className="text-neutral-400" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Coupon Code *</label>
              <Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})}
                placeholder="SUMMER20" className="bg-neutral-900 border-neutral-700 text-white font-mono" data-testid="coupon-code" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Discount Type *</label>
              <select value={form.discount_type} onChange={(e) => setForm({...form, discount_type: e.target.value})}
                className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm" data-testid="discount-type">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Discount Value *</label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({...form, discount_value: e.target.value})}
                placeholder={form.discount_type === "percentage" ? "20" : "500"} className="bg-neutral-900 border-neutral-700 text-white" data-testid="discount-value" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Min Order Value (₹)</label>
              <Input type="number" value={form.min_order_value} onChange={(e) => setForm({...form, min_order_value: e.target.value})}
                placeholder="1000" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Max Uses</label>
              <Input type="number" value={form.max_uses} onChange={(e) => setForm({...form, max_uses: e.target.value})}
                placeholder="100" className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Expires At</label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({...form, expires_at: e.target.value})}
                className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
          </div>
          <Button type="submit" disabled={creating} className="bg-gold text-black hover:bg-gold/90 font-semibold" data-testid="save-coupon-btn">
            {creating ? "Creating..." : "Create Coupon"}
          </Button>
        </form>
      )}

      {/* Coupons Tab */}
      {tab === "coupons" && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="text-neutral-400">Code</TableHead>
                <TableHead className="text-neutral-400">Discount</TableHead>
                <TableHead className="text-neutral-400">Min Order</TableHead>
                <TableHead className="text-neutral-400">Used / Max</TableHead>
                <TableHead className="text-neutral-400">Expires</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.coupon_id} className="border-neutral-700">
                  <TableCell className="font-mono text-gold font-medium">{c.code}</TableCell>
                  <TableCell className="text-white">{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</TableCell>
                  <TableCell className="text-neutral-300">₹{c.min_order_value?.toLocaleString()}</TableCell>
                  <TableCell className="text-neutral-300">{c.used_count} / {c.max_uses}</TableCell>
                  <TableCell className="text-neutral-400 text-sm">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleCoupon(c.coupon_id)}
                      className={`text-xs px-2 py-1 rounded cursor-pointer ${c.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2" onClick={() => deleteCoupon(c.coupon_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && coupons.length === 0 && <div className="text-center py-12 text-neutral-500">No coupons yet. Click "Create Coupon" to add one.</div>}
        </div>
      )}

      {/* Sales Targets Tab */}
      {tab === "targets" && (
        <div className="space-y-4">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Add Sales Target</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Target Name *</label>
                <Input value={targetForm.name} onChange={(e) => setTargetForm({...targetForm, name: e.target.value})}
                  placeholder="e.g. Gold Seller Badge" className="bg-neutral-900 border-neutral-700 text-white" data-testid="target-name" />
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Target For</label>
                <select value={targetForm.target_type} onChange={(e) => setTargetForm({...targetForm, target_type: e.target.value})}
                  className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm">
                  <option value="influencer">Influencer</option>
                  <option value="reseller">Reseller</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Target Sales Amount (₹) *</label>
                <Input type="number" value={targetForm.target_amount} onChange={(e) => setTargetForm({...targetForm, target_amount: e.target.value})}
                  placeholder="50000" className="bg-neutral-900 border-neutral-700 text-white" data-testid="target-amount" />
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Reward Type</label>
                <select value={targetForm.reward_type} onChange={(e) => setTargetForm({...targetForm, reward_type: e.target.value})}
                  className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm">
                  <option value="bonus">Cash Bonus (₹)</option>
                  <option value="rate_increase">Commission Rate Increase (%)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Reward Value *</label>
                <Input type="number" value={targetForm.reward_value} onChange={(e) => setTargetForm({...targetForm, reward_value: e.target.value})}
                  placeholder={targetForm.reward_type === "bonus" ? "5000" : "2"} className="bg-neutral-900 border-neutral-700 text-white" data-testid="target-reward" />
              </div>
            </div>
            <Button className="bg-gold text-black hover:bg-gold/90" onClick={addTarget} data-testid="add-target-btn">Add Target</Button>
          </div>

          {/* Existing Targets */}
          {settings?.commission_targets?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-medium">Active Targets</h4>
              {settings.commission_targets.map((t, i) => (
                <div key={t.target_id || i} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{t.name}</p>
                    <p className="text-sm text-neutral-400">
                      {t.target_type} must reach ₹{t.target_amount?.toLocaleString()} in sales →
                      {t.reward_type === "bonus" ? ` ₹${t.reward_value} bonus` : ` +${t.reward_value}% commission`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => removeTarget(t.target_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rewards Tab */}
      {tab === "rewards" && (
        <div className="space-y-4">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Add Reward Program</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Reward Name *</label>
                <Input value={targetForm.name} onChange={(e) => setTargetForm({...targetForm, name: e.target.value})}
                  placeholder="e.g. Top Seller Bonus" className="bg-neutral-900 border-neutral-700 text-white" data-testid="reward-name" />
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">For User Type</label>
                <select value={targetForm.target_type} onChange={(e) => setTargetForm({...targetForm, target_type: e.target.value})}
                  className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm">
                  <option value="influencer">Influencer</option>
                  <option value="reseller">Reseller</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Sales Milestone (₹) *</label>
                <Input type="number" value={targetForm.target_amount} onChange={(e) => setTargetForm({...targetForm, target_amount: e.target.value})}
                  placeholder="100000" className="bg-neutral-900 border-neutral-700 text-white" />
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Reward Type</label>
                <select value={targetForm.reward_type} onChange={(e) => setTargetForm({...targetForm, reward_type: e.target.value})}
                  className="w-full h-10 px-3 bg-neutral-900 border border-neutral-700 text-white rounded-md text-sm">
                  <option value="bonus">Cash Bonus (₹)</option>
                  <option value="rate_increase">Commission Rate Increase (%)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Reward Value *</label>
                <Input type="number" value={targetForm.reward_value} onChange={(e) => setTargetForm({...targetForm, reward_value: e.target.value})}
                  placeholder={targetForm.reward_type === "bonus" ? "10000" : "3"} className="bg-neutral-900 border-neutral-700 text-white" />
              </div>
            </div>
            <Button className="bg-gold text-black hover:bg-gold/90" onClick={addReward} data-testid="add-reward-btn">Add Reward</Button>
          </div>

          {settings?.commission_rewards?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-white font-medium">Active Rewards</h4>
              {settings.commission_rewards.map((r, i) => (
                <div key={r.reward_id || i} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{r.name}</p>
                    <p className="text-sm text-neutral-400">
                      {r.target_type} reaches ₹{r.target_amount?.toLocaleString()} →
                      {r.reward_type === "bonus" ? ` ₹${r.reward_value} cash reward` : ` +${r.reward_value}% commission boost`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => removeReward(r.reward_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {(!settings?.commission_rewards || settings.commission_rewards.length === 0) && (
            <div className="text-center py-8 text-neutral-500">No rewards configured yet.</div>
          )}
        </div>
      )}
    </div>
  );
};

// Affiliates Management
const AffiliatesManagement = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAffiliates = async () => {
      try {
        const response = await axios.get(`${API}/affiliates`, { headers: getAdminHeaders() });
        setAffiliates(response.data);
      } catch (error) {
        toast.error("Failed to load affiliates");
      } finally {
        setLoading(false);
      }
    };
    fetchAffiliates();
  }, []);

  const updateStatus = async (affiliateId, status) => {
    try {
      await axios.put(`${API}/affiliates/${affiliateId}/status?status=${status}`, {}, { headers: getAdminHeaders() });
      toast.success(`Affiliate ${status}`);
      setAffiliates(affiliates.map(a => a.affiliate_id === affiliateId ? { ...a, status } : a));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update");
    }
  };

  const canApprove = hasPermission("affiliates", "approve");

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Affiliate Management</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Name</TableHead>
              <TableHead className="text-neutral-400">Company</TableHead>
              <TableHead className="text-neutral-400">Clicks</TableHead>
              <TableHead className="text-neutral-400">Conversions</TableHead>
              <TableHead className="text-neutral-400">Earnings</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              {canApprove && <TableHead className="text-neutral-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.map((a) => (
              <TableRow key={a.affiliate_id} className="border-neutral-700">
                <TableCell className="text-white">{a.name}</TableCell>
                <TableCell className="text-neutral-300">{a.company_name || "-"}</TableCell>
                <TableCell className="text-neutral-300">{a.total_clicks}</TableCell>
                <TableCell className="text-neutral-300">{a.total_conversions}</TableCell>
                <TableCell className="text-gold">{a.total_earnings?.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    a.status === "approved" ? "bg-green-500/20 text-green-400" :
                    a.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>{a.status}</span>
                </TableCell>
                {canApprove && (
                  <TableCell>
                    {a.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10"
                          onClick={() => updateStatus(a.affiliate_id, "approved")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10"
                          onClick={() => updateStatus(a.affiliate_id, "rejected")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && affiliates.length === 0 && <div className="text-center py-12 text-neutral-500">No affiliates</div>}
      </div>
    </div>
  );
};

// Main Admin Dashboard
export const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [admin, setAdminState] = useState(getAdmin());

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem("pigma_admin_token");
    if (!token) {
      navigate("/admin-login");
      return;
    }

    // Refresh admin data from server to get latest permissions
    const refreshAdmin = async () => {
      try {
        const response = await axios.get(`${API}/admin/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const adminData = response.data;
        localStorage.setItem("pigma_admin", JSON.stringify(adminData));
        setAdminState(adminData);
      } catch (err) {
        // Token expired or invalid - force re-login
        localStorage.removeItem("pigma_admin_token");
        localStorage.removeItem("pigma_admin");
        navigate("/admin-login");
      }
    };
    refreshAdmin();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("pigma_admin_token");
    localStorage.removeItem("pigma_admin");
    toast.success("Logged out");
    navigate("/");
  };

  // ====== VENDORS MANAGEMENT ======
  const VendorsManagement = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [historyTarget, setHistoryTarget] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
      const fetchVendors = async () => {
        try {
          const url = filter === "all" ? `${API}/vendors/admin/list` : `${API}/vendors/admin/list?status=${filter}`;
          const res = await axios.get(url, { headers: getAdminHeaders() });
          setVendors(res.data);
        } catch { toast.error("Failed to load vendors"); }
        finally { setLoading(false); }
      };
      fetchVendors();
    }, [filter]);

    const updateVendor = async (vendorId, action) => {
      try {
        await axios.put(`${API}/vendors/admin/${vendorId}/${action}`, {}, { headers: getAdminHeaders() });
        toast.success(`Vendor ${action}d`);
        setVendors(vendors.map(v => v.vendor_id === vendorId ? {
          ...v, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "suspended"
        } : v));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const approveKYC = async (vendorId, action) => {
      try {
        await axios.put(`${API}/vendors/admin/${vendorId}/kyc/${action}`, {}, { headers: getAdminHeaders() });
        toast.success(`KYC ${action}d`);
        setVendors(vendors.map(v => v.vendor_id === vendorId ? { ...v, kyc_status: action === "approve" ? "approved" : "rejected" } : v));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const controlAction = async (vendorId, action) => {
      const reason = window.prompt(`Reason for ${action}:`, "Policy violation");
      if (!reason) return;
      try {
        await axios.put(`${API}/admin/user-control/vendor/${vendorId}/${action}?reason=${encodeURIComponent(reason)}`, {}, { headers: getAdminHeaders() });
        toast.success(`Vendor ${action}d`);
        const newStatus = action === "reactivate" ? "approved" : action === "discontinue" ? "discontinued" : action + "ed";
        setVendors(vendors.map(v => v.vendor_id === vendorId ? { ...v, status: newStatus } : v));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const viewHistory = async (id) => {
      try {
        const res = await axios.get(`${API}/admin/user-control/history/vendor/${id}`, { headers: getAdminHeaders() });
        setHistory(res.data);
        setHistoryTarget(id);
      } catch { toast.error("Failed to load history"); }
    };

    const canApprove = hasPermission("vendors", "approve");
    const canSuspend = hasPermission("vendors", "suspend");
    const canApproveKYC = hasPermission("vendor_kyc", "approve");

    const statusBadge = (s) => {
      const map = { approved: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400", suspended: "bg-orange-500/20 text-orange-400", disconnected: "bg-red-600/20 text-red-500", discontinued: "bg-neutral-600/20 text-neutral-400", pending: "bg-yellow-500/20 text-yellow-400", kyc_submitted: "bg-blue-500/20 text-blue-400" };
      return map[s] || map.pending;
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-2xl font-bold text-white">Vendor Management</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="kyc_submitted">KYC Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {historyTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-white">Action History for {historyTarget}</h3>
              <Button size="sm" variant="ghost" className="text-neutral-400" onClick={() => setHistoryTarget(null)}><X className="h-4 w-4" /></Button>
            </div>
            {history.length === 0 ? <p className="text-neutral-500 text-sm">No history</p> :
              history.map((h) => (
                <div key={h.log_id} className="flex justify-between items-center py-1.5 border-b border-neutral-700/50 last:border-0 text-xs">
                  <span className={`font-medium capitalize ${h.action === "reactivate" ? "text-green-400" : "text-red-400"}`}>{h.action}</span>
                  <span className="text-neutral-400">{h.reason}</span>
                  <span className="text-neutral-500">by {h.admin_name} - {new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              ))
            }
          </motion.div>
        )}

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="text-neutral-400">Store</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-400">KYC</TableHead>
                <TableHead className="text-neutral-400">Sales</TableHead>
                <TableHead className="text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.vendor_id} className="border-neutral-700">
                  <TableCell>
                    <p className="text-white font-medium">{v.store_name}</p>
                    <p className="text-xs text-neutral-400">{v.owner_name} - {v.email}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge(v.status)}`}>{v.status?.replace("_", " ")}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge(v.kyc_status === "submitted" ? "kyc_submitted" : v.kyc_status || "pending")}`}>{v.kyc_status?.replace("_", " ") || "Not submitted"}</span>
                  </TableCell>
                  <TableCell className="text-gold">{(v.total_sales || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(v.status === "pending" || v.status === "kyc_submitted") && canApprove && (
                        <>
                          <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10 text-xs" onClick={() => updateVendor(v.vendor_id, "approve")} data-testid={`approve-vendor-${v.vendor_id}`}>Approve</Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs" onClick={() => updateVendor(v.vendor_id, "reject")}>Reject</Button>
                        </>
                      )}
                      {v.status === "approved" && canSuspend && (
                        <>
                          <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-500/10 text-xs" onClick={() => controlAction(v.vendor_id, "suspend")}>Suspend</Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs" onClick={() => controlAction(v.vendor_id, "disconnect")}>Disconnect</Button>
                        </>
                      )}
                      {(v.status === "suspended" || v.status === "disconnected") && canSuspend && (
                        <>
                          <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-500/10 text-xs" onClick={() => controlAction(v.vendor_id, "reactivate")}>Reactivate</Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-600/10 text-xs" onClick={() => controlAction(v.vendor_id, "discontinue")}>Discontinue</Button>
                        </>
                      )}
                      {canApproveKYC && v.kyc_status === "submitted" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-500/10 text-xs" onClick={() => approveKYC(v.vendor_id, "approve")}>KYC OK</Button>
                          <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-500/10 text-xs" onClick={() => approveKYC(v.vendor_id, "reject")}>KYC Rej</Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-neutral-400 hover:bg-neutral-700/50 text-xs" onClick={() => viewHistory(v.vendor_id)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && vendors.length === 0 && <div className="text-center py-12 text-neutral-500">No vendors found</div>}
        </div>
      </div>
    );
  };

  // ====== VENDOR PRODUCT APPROVALS ======
  const VendorProductApprovals = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchProducts = async () => {
        try {
          const res = await axios.get(`${API}/vendors/admin/products/pending`, { headers: getAdminHeaders() });
          setProducts(res.data);
        } catch { toast.error("Failed to load products"); }
        finally { setLoading(false); }
      };
      fetchProducts();
    }, []);

    const handleAction = async (productId, action) => {
      try {
        if (action === "approve") {
          await axios.put(`${API}/vendors/admin/products/${productId}/approve`, {}, { headers: getAdminHeaders() });
        } else {
          await axios.put(`${API}/vendors/admin/products/${productId}/reject?reason=Does not meet standards`, {}, { headers: getAdminHeaders() });
        }
        toast.success(`Product ${action}d`);
        setProducts(products.filter(p => p.product_id !== productId));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const canApprove = hasPermission("vendor_products", "approve");

    return (
      <div>
        <h2 className="font-serif text-2xl font-bold text-white mb-6">Pending Product Approvals</h2>
        <div className="space-y-4">
          {products.map((p) => (
            <div key={p.product_id} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 flex gap-4">
              {p.images?.[0] && (
                <img src={p.images[0]} alt={p.name} className="w-20 h-20 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-medium">{p.name}</h3>
                    <p className="text-sm text-neutral-400">{p.category} | Stock: {p.stock}</p>
                    <p className="text-xs text-neutral-500 mt-1">{p.description?.substring(0, 100)}...</p>
                  </div>
                  <p className="text-lg font-bold text-gold">{p.price?.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-neutral-400">Vendor: {p.vendor_id}</span>
                  {canApprove && (
                    <div className="flex gap-2 ml-auto">
                      <Button size="sm" className="bg-green-600 text-white text-xs" onClick={() => handleAction(p.product_id, "approve")}
                        data-testid={`approve-product-${p.product_id}`}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleAction(p.product_id, "reject")}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <FileCheck className="h-12 w-12 mx-auto mb-3 text-neutral-600" />
              No pending product approvals
            </div>
          )}
        </div>
      </div>
    );
  };

  // ====== RESELLER MANAGEMENT ======
  const ResellersManagement = () => {
    const [resellers, setResellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
      axios.get(`${API}/resellers/admin/list`, { headers: getAdminHeaders() })
        .then(res => setResellers(res.data))
        .catch(() => toast.error("Failed to load resellers"))
        .finally(() => setLoading(false));
    }, []);

    const controlAction = async (resellerId, action) => {
      const reason = window.prompt(`Reason for ${action}:`, "Policy violation");
      if (!reason) return;
      try {
        await axios.put(`${API}/admin/user-control/reseller/${resellerId}/${action}?reason=${encodeURIComponent(reason)}`, {}, { headers: getAdminHeaders() });
        toast.success(`Reseller ${action}d`);
        const newStatus = action === "reactivate" ? "approved" : action === "discontinue" ? "discontinued" : action + "ed";
        setResellers(resellers.map(r => r.reseller_id === resellerId ? { ...r, status: newStatus } : r));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const approveReject = async (resellerId, status) => {
      try {
        await axios.put(`${API}/admin/user-control/reseller/${resellerId}/${status === "approved" ? "reactivate" : "suspend"}?reason=${status}`, {}, { headers: getAdminHeaders() });
        toast.success(`Reseller ${status}`);
        setResellers(resellers.map(r => r.reseller_id === resellerId ? { ...r, status } : r));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const viewHistory = async (id) => {
      try {
        const res = await axios.get(`${API}/admin/user-control/history/reseller/${id}`, { headers: getAdminHeaders() });
        setHistory(res.data);
        setHistoryTarget(id);
      } catch {}
    };

    const canManage = hasPermission("resellers", "approve");
    const statusBadge = (s) => {
      const map = { approved: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400", suspended: "bg-orange-500/20 text-orange-400", disconnected: "bg-red-600/20 text-red-500", discontinued: "bg-neutral-600/20 text-neutral-400", pending: "bg-yellow-500/20 text-yellow-400" };
      return map[s] || map.pending;
    };

    return (
      <div>
        <h2 className="font-serif text-2xl font-bold text-white mb-6">Reseller Management</h2>

        {historyTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-white">Action History</h3>
              <Button size="sm" variant="ghost" className="text-neutral-400" onClick={() => setHistoryTarget(null)}><X className="h-4 w-4" /></Button>
            </div>
            {history.length === 0 ? <p className="text-neutral-500 text-sm">No history</p> :
              history.map((h) => (
                <div key={h.log_id} className="flex justify-between py-1.5 border-b border-neutral-700/50 last:border-0 text-xs">
                  <span className={`font-medium capitalize ${h.action === "reactivate" ? "text-green-400" : "text-red-400"}`}>{h.action}</span>
                  <span className="text-neutral-400">{h.reason}</span>
                  <span className="text-neutral-500">by {h.admin_name}</span>
                </div>
              ))
            }
          </motion.div>
        )}

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="text-neutral-400">Name</TableHead>
                <TableHead className="text-neutral-400">Earnings</TableHead>
                <TableHead className="text-neutral-400">Conversions</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                {canManage && <TableHead className="text-neutral-400">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.map((r) => (
                <TableRow key={r.reseller_id} className="border-neutral-700">
                  <TableCell>
                    <p className="text-white">{r.name}</p>
                    <p className="text-xs text-neutral-400">{r.email}</p>
                  </TableCell>
                  <TableCell className="text-gold">{r.total_earnings?.toLocaleString()}</TableCell>
                  <TableCell className="text-neutral-300">{r.total_conversions}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge(r.status)}`}>{r.status}</span>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-400 text-xs" onClick={() => approveReject(r.reseller_id, "approved")}>Approve</Button>
                            <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={() => approveReject(r.reseller_id, "rejected")}>Reject</Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <>
                            <Button size="sm" variant="ghost" className="text-orange-400 text-xs" onClick={() => controlAction(r.reseller_id, "suspend")}>Suspend</Button>
                            <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={() => controlAction(r.reseller_id, "disconnect")}>Disconnect</Button>
                          </>
                        )}
                        {(r.status === "suspended" || r.status === "disconnected") && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-400 text-xs" onClick={() => controlAction(r.reseller_id, "reactivate")}>Reactivate</Button>
                            <Button size="sm" variant="ghost" className="text-red-600 text-xs" onClick={() => controlAction(r.reseller_id, "discontinue")}>Discontinue</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-neutral-400 text-xs" onClick={() => viewHistory(r.reseller_id)}><Eye className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && resellers.length === 0 && <div className="text-center py-12 text-neutral-500">No resellers yet</div>}
        </div>
      </div>
    );
  };

  // ====== SUSPENSION HISTORY ======
  const SuspensionHistoryPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
      const url = filterType === "all"
        ? `${API}/admin/user-control/history?limit=100`
        : `${API}/admin/user-control/history?entity_type=${filterType}&limit=100`;
      axios.get(url, { headers: getAdminHeaders() })
        .then(res => setLogs(res.data))
        .catch(() => toast.error("Failed to load history"))
        .finally(() => setLoading(false));
    }, [filterType]);

    const actionColor = (a) => {
      const map = { reactivate: "text-green-400", suspend: "text-orange-400", disconnect: "text-red-400", discontinue: "text-red-600" };
      return map[a] || "text-neutral-400";
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif text-2xl font-bold text-white">Suspension & Action History</h2>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-neutral-800 border-neutral-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="vendor">Vendors</SelectItem>
              <SelectItem value="influencer">Influencers</SelectItem>
              <SelectItem value="reseller">Resellers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="text-neutral-400">Type</TableHead>
                <TableHead className="text-neutral-400">Name</TableHead>
                <TableHead className="text-neutral-400">Action</TableHead>
                <TableHead className="text-neutral-400">Reason</TableHead>
                <TableHead className="text-neutral-400">By</TableHead>
                <TableHead className="text-neutral-400">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.log_id} className="border-neutral-700">
                  <TableCell><span className="text-xs capitalize bg-neutral-700 px-2 py-0.5 rounded text-neutral-300">{l.entity_type}</span></TableCell>
                  <TableCell className="text-white">{l.entity_name}</TableCell>
                  <TableCell><span className={`text-sm font-medium capitalize ${actionColor(l.action)}`}>{l.action}</span></TableCell>
                  <TableCell className="text-neutral-300 text-sm">{l.reason}</TableCell>
                  <TableCell className="text-neutral-400 text-sm">{l.admin_name}</TableCell>
                  <TableCell className="text-neutral-500 text-sm">{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && logs.length === 0 && <div className="text-center py-12 text-neutral-500">No action history</div>}
        </div>
      </div>
    );
  };

  // ====== COMMISSION SETTINGS (Super Admin) ======
  const CommissionSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
      Promise.all([
        axios.get(`${API}/admin/settings/commission`, { headers: getAdminHeaders() }),
        axios.get(`${API}/admin/platform-stats`, { headers: getAdminHeaders() })
      ]).then(([settingsRes, statsRes]) => {
        setSettings(settingsRes.data);
        setStats(statsRes.data);
      }).catch(() => toast.error("Failed to load settings"))
        .finally(() => setLoading(false));
    }, []);

    const updateSettings = async (updates) => {
      setSaving(true);
      try {
        await axios.put(`${API}/admin/settings/commission`, updates, { headers: getAdminHeaders() });
        setSettings(prev => ({ ...prev, ...updates }));
        toast.success("Settings updated");
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
      finally { setSaving(false); }
    };

    if (loading) return <div className="text-center py-8 text-neutral-500">Loading...</div>;

    return (
      <div className="space-y-6">
        <h2 className="font-serif text-2xl font-bold text-white">Platform Settings</h2>

        {/* Platform Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="h-5 w-5 text-blue-400" />} label="Total Users" value={stats.total_users} bg="bg-blue-500/10" />
            <StatCard icon={<Store className="h-5 w-5 text-green-400" />} label="Vendors" value={stats.total_vendors} bg="bg-green-500/10" />
            <StatCard icon={<UserCheck className="h-5 w-5 text-purple-400" />} label="Influencers" value={stats.total_influencers} bg="bg-purple-500/10" />
            <StatCard icon={<Package className="h-5 w-5 text-gold" />} label="Products" value={stats.total_products} bg="bg-gold/10" />
          </div>
        )}

        {/* Commission Controls */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Commission Controls</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-400">Commissions</span>
              <button
                onClick={() => updateSettings({ commission_enabled: !settings.commission_enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.commission_enabled ? "bg-green-500" : "bg-neutral-600"}`}
                data-testid="commission-toggle"
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.commission_enabled ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Platform Commission (%)</label>
              <div className="flex gap-2">
                <Input type="number" value={settings.platform_commission_rate}
                  onChange={(e) => setSettings(prev => ({ ...prev, platform_commission_rate: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="platform-rate-input" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ platform_commission_rate: settings.platform_commission_rate })} disabled={saving}>Save</Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Influencer Commission (%)</label>
              <div className="flex gap-2">
                <Input type="number" value={settings.influencer_commission_rate}
                  onChange={(e) => setSettings(prev => ({ ...prev, influencer_commission_rate: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="influencer-rate-input" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ influencer_commission_rate: settings.influencer_commission_rate })} disabled={saving}>Save</Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Reseller Commission (%)</label>
              <div className="flex gap-2">
                <Input type="number" value={settings.reseller_commission_rate}
                  onChange={(e) => setSettings(prev => ({ ...prev, reseller_commission_rate: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="reseller-rate-input" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ reseller_commission_rate: settings.reseller_commission_rate })} disabled={saving}>Save</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Collab Platform Fee (%)</label>
              <p className="text-xs text-neutral-500 mb-1">Cut from every vendor-influencer collab sale</p>
              <div className="flex gap-2">
                <Input type="number" value={settings.collab_platform_fee || 5}
                  onChange={(e) => setSettings(prev => ({ ...prev, collab_platform_fee: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="collab-fee-input" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ collab_platform_fee: settings.collab_platform_fee })} disabled={saving}>Save</Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Min Withdrawal Amount (₹)</label>
              <div className="flex gap-2">
                <Input type="number" value={settings.min_withdrawal_amount}
                  onChange={(e) => setSettings(prev => ({ ...prev, min_withdrawal_amount: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ min_withdrawal_amount: settings.min_withdrawal_amount })} disabled={saving}>Save</Button>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-sm text-neutral-400 mb-1 block">Auto-settle on Delivery</label>
                <p className="text-xs text-neutral-500">When order is delivered, auto-distribute commissions</p>
              </div>
              <button
                onClick={() => updateSettings({ auto_settle_on_delivery: !settings.auto_settle_on_delivery })}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.auto_settle_on_delivery ? "bg-green-500" : "bg-neutral-600"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.auto_settle_on_delivery ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Referral Commission Controls */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Referral Commissions</h3>
          <p className="text-sm text-neutral-400">Vendors/Influencers earn commission when they refer new members to the platform.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Vendor Referral Commission (%)</label>
              <p className="text-xs text-neutral-500 mb-1">Vendor earns this % from referred vendor's monthly sales</p>
              <div className="flex gap-2">
                <Input type="number" value={settings.vendor_referral_commission || 1}
                  onChange={(e) => setSettings(prev => ({ ...prev, vendor_referral_commission: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="vendor-referral-rate" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ vendor_referral_commission: settings.vendor_referral_commission })} disabled={saving}>Save</Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Influencer Referral Commission (%)</label>
              <p className="text-xs text-neutral-500 mb-1">Influencer earns this % from referred influencer's earnings</p>
              <div className="flex gap-2">
                <Input type="number" value={settings.influencer_referral_commission || 1}
                  onChange={(e) => setSettings(prev => ({ ...prev, influencer_referral_commission: parseFloat(e.target.value) || 0 }))}
                  className="bg-neutral-900 border-neutral-700 text-white" data-testid="influencer-referral-rate" />
                <Button size="sm" className="bg-gold text-black" onClick={() => updateSettings({ influencer_referral_commission: settings.influencer_referral_commission })} disabled={saving}>Save</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reward Campaigns */}
        <RewardCampaigns />

        {/* Featured Vendors / Top Listing Control */}
        <FeaturedVendorsControl />

        {/* Marketing Pixel Settings */}
        <PixelSettings />
      </div>
    );
  };

  // ====== REWARD CAMPAIGNS ======
  const RewardCampaigns = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", target_amount: "", reward_description: "", reward_image: "", start_date: "", end_date: "" });
    const [tagForm, setTagForm] = useState({ campaign_id: "", user_id: "", user_type: "vendor", user_name: "" });

    const fetchCampaigns = async () => {
      try {
        const res = await axios.get(`${API}/admin/rewards/campaigns`, { headers: getAdminHeaders() });
        setCampaigns(res.data || []);
      } catch {}
    };
    useEffect(() => { fetchCampaigns(); }, []);

    const createCampaign = async () => {
      if (!form.title || !form.target_amount) { toast.error("Fill title and target amount"); return; }
      try {
        await axios.post(`${API}/admin/rewards/campaigns`, {
          ...form, target_amount: parseFloat(form.target_amount), target_user_types: ["vendor", "influencer"]
        }, { headers: getAdminHeaders() });
        toast.success("Campaign created!");
        setShowForm(false);
        setForm({ title: "", description: "", target_amount: "", reward_description: "", reward_image: "", start_date: "", end_date: "" });
        fetchCampaigns();
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const tagUser = async () => {
      if (!tagForm.campaign_id || !tagForm.user_id) { toast.error("Select campaign and enter user ID"); return; }
      try {
        await axios.post(`${API}/admin/rewards/campaigns/${tagForm.campaign_id}/tag`, {
          user_id: tagForm.user_id, user_type: tagForm.user_type, user_name: tagForm.user_name
        }, { headers: getAdminHeaders() });
        toast.success("User tagged!");
        setTagForm({ campaign_id: "", user_id: "", user_type: "vendor", user_name: "" });
        fetchCampaigns();
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    return (
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4" data-testid="reward-campaigns-section">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Reward Campaigns</h3>
          <Button size="sm" className="bg-gold text-black" onClick={() => setShowForm(!showForm)} data-testid="new-campaign-btn">
            <Plus className="h-4 w-4 mr-1" /> {showForm ? "Cancel" : "New Campaign"}
          </Button>
        </div>

        {showForm && (
          <div className="border border-neutral-600 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Campaign title" className="bg-neutral-900 border-neutral-700 text-white" data-testid="campaign-title" />
              <Input type="number" value={form.target_amount} onChange={(e) => setForm(f => ({ ...f, target_amount: e.target.value }))}
                placeholder="Target amount (Rs.)" className="bg-neutral-900 border-neutral-700 text-white" data-testid="campaign-target" />
            </div>
            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Campaign description" className="bg-neutral-900 border-neutral-700 text-white" />
            <Input value={form.reward_description} onChange={(e) => setForm(f => ({ ...f, reward_description: e.target.value }))}
              placeholder="Reward (e.g. Goa Trip for 2)" className="bg-neutral-900 border-neutral-700 text-white" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="bg-neutral-900 border-neutral-700 text-white" />
              <Input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="bg-neutral-900 border-neutral-700 text-white" />
            </div>
            <Button onClick={createCampaign} className="bg-gold text-black" data-testid="save-campaign-btn">Create Campaign</Button>
          </div>
        )}

        {/* Tag User */}
        <div className="border border-neutral-600 rounded-lg p-3 space-y-2">
          <p className="text-sm text-neutral-400">Tag user to campaign</p>
          <div className="flex gap-2 flex-wrap items-end">
            <select value={tagForm.campaign_id} onChange={(e) => setTagForm(f => ({ ...f, campaign_id: e.target.value }))}
              className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm" data-testid="tag-campaign-select">
              <option value="">Select campaign</option>
              {campaigns.filter(c => c.is_active).map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.title}</option>)}
            </select>
            <select value={tagForm.user_type} onChange={(e) => setTagForm(f => ({ ...f, user_type: e.target.value }))}
              className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm">
              <option value="vendor">Vendor</option>
              <option value="influencer">Influencer</option>
            </select>
            <Input value={tagForm.user_id} onChange={(e) => setTagForm(f => ({ ...f, user_id: e.target.value }))}
              placeholder="User/Vendor ID" className="bg-neutral-900 border-neutral-700 text-white max-w-[200px]" data-testid="tag-user-id" />
            <Input value={tagForm.user_name} onChange={(e) => setTagForm(f => ({ ...f, user_name: e.target.value }))}
              placeholder="Name (optional)" className="bg-neutral-900 border-neutral-700 text-white max-w-[150px]" />
            <Button size="sm" className="bg-gold text-black" onClick={tagUser} data-testid="tag-user-btn">Tag</Button>
          </div>
        </div>

        {/* Campaign List */}
        {campaigns.map(c => (
          <div key={c.campaign_id} className="border border-neutral-700 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white font-medium">{c.title}</h4>
                <p className="text-xs text-neutral-400">{c.description}</p>
                <p className="text-xs text-gold mt-1">Target: Rs. {c.target_amount?.toLocaleString()} | Reward: {c.reward_description}</p>
                <p className="text-xs text-neutral-500">{c.start_date} → {c.end_date}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-500/20 text-green-400" : "bg-neutral-500/20 text-neutral-400"}`}>
                {c.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {c.tagged_users?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-neutral-500 font-medium">Tagged Users:</p>
                {c.tagged_users.map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-neutral-900/50 rounded px-3 py-1.5">
                    <span className="text-neutral-300">{u.user_name || u.user_id} <span className="text-neutral-500">({u.user_type})</span></span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400">
                        Progress: Rs. {(u.current_progress || 0).toLocaleString()} / {c.target_amount?.toLocaleString()}
                      </span>
                      <div className="w-24 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${u.target_reached ? "bg-green-500" : "bg-gold"}`}
                          style={{ width: `${Math.min(100, ((u.current_progress || 0) / c.target_amount) * 100)}%` }} />
                      </div>
                      {u.target_reached && <span className="text-xs text-green-400 font-medium">TARGET MET!</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">No campaigns yet</p>}
      </div>
    );
  };

  // ====== FEATURED VENDORS / TOP LISTING CONTROL ======
  const FeaturedVendorsControl = () => {
    const [vendors, setVendors] = useState([]);
    const [featured, setFeatured] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState("");
    const [position, setPosition] = useState("1");

    const fetchData = async () => {
      try {
        const [v, f] = await Promise.all([
          axios.get(`${API}/vendors/admin/list`, { headers: getAdminHeaders() }),
          axios.get(`${API}/admin/vendors/featured`, { headers: getAdminHeaders() })
        ]);
        setVendors(v.data || []);
        setFeatured(f.data || []);
      } catch {}
    };
    useEffect(() => { fetchData(); }, []);

    const featureVendor = async () => {
      if (!selectedVendor) { toast.error("Select a vendor"); return; }
      try {
        await axios.put(`${API}/admin/vendors/featured`, {
          vendor_id: selectedVendor, featured: true, position: parseInt(position) || 1
        }, { headers: getAdminHeaders() });
        toast.success("Vendor featured!");
        setSelectedVendor("");
        fetchData();
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const unfeatureVendor = async (vendorId) => {
      try {
        await axios.put(`${API}/admin/vendors/featured`, {
          vendor_id: vendorId, featured: false
        }, { headers: getAdminHeaders() });
        toast.success("Vendor removed from featured");
        fetchData();
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    return (
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4" data-testid="featured-vendors-section">
        <h3 className="text-lg font-semibold text-white">Top Listing / Featured Vendors</h3>
        <p className="text-xs text-neutral-400">Manually push vendors to the featured/top list visible to customers.</p>

        <div className="flex gap-2 flex-wrap items-end">
          <select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm flex-1" data-testid="feature-vendor-select">
            <option value="">Select vendor</option>
            {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.store_name} ({v.vendor_id.slice(0, 10)})</option>)}
          </select>
          <Input type="number" value={position} onChange={(e) => setPosition(e.target.value)}
            className="bg-neutral-900 border-neutral-700 text-white w-24" placeholder="Position" data-testid="feature-position" />
          <Button className="bg-gold text-black" onClick={featureVendor} data-testid="feature-vendor-btn">
            <TrendingUp className="h-4 w-4 mr-1" /> Feature
          </Button>
        </div>

        {featured.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-400 font-medium">Currently Featured:</p>
            {featured.map(f => (
              <div key={f.vendor_id} className="flex items-center justify-between bg-neutral-900/50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-gold font-bold">#{f.featured_position || "-"}</span>
                  <span className="text-white text-sm">{f.store_name}</span>
                  <span className="text-xs text-neutral-500">{f.vendor_id}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-red-400 text-xs" onClick={() => unfeatureVendor(f.vendor_id)}
                  data-testid={`unfeature-${f.vendor_id}`}>Remove</Button>
              </div>
            ))}
          </div>
        )}
        {featured.length === 0 && <p className="text-sm text-neutral-500 text-center py-3">No featured vendors</p>}
      </div>
    );
  };


  // ====== MARKETING PIXEL SETTINGS ======
  const PixelSettings = () => {
    const [metaPixelId, setMetaPixelId] = useState("");
    const [googleAdsId, setGoogleAdsId] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      axios.get(`${API}/admin/settings/commission`, { headers: getAdminHeaders() })
        .then(r => {
          const s = r.data;
          setMetaPixelId(s?.meta_pixel_id || "");
          setGoogleAdsId(s?.google_ads_id || "");
        }).catch(() => {});
    }, []);

    const savePixels = async () => {
      setSaving(true);
      try {
        await axios.put(`${API}/admin/settings/commission`, {
          meta_pixel_id: metaPixelId || null,
          google_ads_id: googleAdsId || null,
        }, { headers: getAdminHeaders() });
        toast.success("Pixel settings saved!");
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
      finally { setSaving(false); }
    };

    return (
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4" data-testid="pixel-settings-section">
        <h3 className="text-lg font-semibold text-white">Marketing Pixels</h3>
        <p className="text-xs text-neutral-400">Configure tracking pixels for Meta (Facebook) and Google Ads. These will be injected into all pages when set.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Meta (Facebook) Pixel ID</label>
            <Input value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)}
              placeholder="e.g. 1234567890" className="bg-neutral-900 border-neutral-700 text-white" data-testid="meta-pixel-input" />
          </div>
          <div>
            <label className="text-sm text-neutral-400 mb-1 block">Google Ads Conversion ID</label>
            <Input value={googleAdsId} onChange={(e) => setGoogleAdsId(e.target.value)}
              placeholder="e.g. AW-1234567890" className="bg-neutral-900 border-neutral-700 text-white" data-testid="google-ads-input" />
          </div>
        </div>
        <Button onClick={savePixels} disabled={saving} className="bg-gold text-black" data-testid="save-pixels-btn">
          {saving ? "Saving..." : "Save Pixel Settings"}
        </Button>
        <p className="text-xs text-neutral-600">Pixels will auto-activate on all customer-facing pages once IDs are configured.</p>
      </div>
    );
  };


  // ====== ACTION HISTORY PAGE ======
  const ActionHistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState({ user_type: "", action: "" });

    useEffect(() => {
      const fetchHistory = async () => {
        const params = new URLSearchParams();
        if (filter.user_type) params.set("user_type", filter.user_type);
        if (filter.action) params.set("action", filter.action);
        params.set("limit", "50");
        const res = await axios.get(`${API}/action-history/admin?${params}`, { headers: getAdminHeaders() });
        setHistory(res.data.history || []);
        setTotal(res.data.total || 0);
      };
      fetchHistory();
    }, [filter]);

    return (
      <div className="space-y-6" data-testid="action-history-page">
        <h2 className="text-2xl font-bold">Action History</h2>
        <div className="flex gap-3 flex-wrap">
          <select value={filter.user_type} onChange={(e) => setFilter(f => ({ ...f, user_type: e.target.value }))} className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm" data-testid="history-type-filter">
            <option value="">All Types</option>
            <option value="user">Users</option>
            <option value="vendor">Vendors</option>
            <option value="influencer">Influencers</option>
            <option value="admin">Admins</option>
          </select>
          <input
            type="text"
            placeholder="Search action..."
            value={filter.action}
            onChange={(e) => setFilter(f => ({ ...f, action: e.target.value }))}
            className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm"
            data-testid="history-action-filter"
          />
          <span className="text-neutral-400 text-sm self-center">Total: {total}</span>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg divide-y divide-neutral-700" data-testid="history-list">
          {history.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No actions found</div>
          ) : history.map((item) => (
            <div key={item.action_id} className="p-4 flex items-center justify-between" data-testid={`history-${item.action_id}`}>
              <div>
                <span className="text-white font-medium">{item.action}</span>
                <span className="text-neutral-400 text-sm ml-2">— {item.details}</span>
                <div className="text-xs text-neutral-500 mt-1">
                  <span className="bg-neutral-700 px-2 py-0.5 rounded mr-2">{item.user_type}</span>
                  <span>{item.user_id}</span>
                </div>
              </div>
              <span className="text-xs text-neutral-500 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ====== MANAGERS PAGE ======
  const ManagersPage = () => {
    const [assignments, setAssignments] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [form, setForm] = useState({ target_id: "", target_type: "vendor", manager_admin_id: "" });

    useEffect(() => {
      const fetchData = async () => {
        const [aRes, mRes] = await Promise.all([
          axios.get(`${API}/admin/referrals/managers`, { headers: getAdminHeaders() }).catch(() => ({ data: [] })),
          axios.get(`${API}/admin/users`, { headers: getAdminHeaders() }).catch(() => ({ data: [] }))
        ]);
        setAssignments(Array.isArray(aRes.data) ? aRes.data : []);
        setAdmins(Array.isArray(mRes.data) ? mRes.data : []);
      };
      fetchData();
    }, []);

    const assignManager = async () => {
      if (!form.target_id || !form.manager_admin_id) { toast.error("Fill all fields"); return; }
      try {
        await axios.post(`${API}/admin/referrals/managers/assign`, form, { headers: getAdminHeaders() });
        toast.success("Manager assigned!");
        const res = await axios.get(`${API}/admin/referrals/managers`, { headers: getAdminHeaders() });
        setAssignments(Array.isArray(res.data) ? res.data : []);
        setForm({ target_id: "", target_type: "vendor", manager_admin_id: "" });
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const removeManager = async (type, id) => {
      try {
        await axios.delete(`${API}/admin/referrals/managers/${type}/${id}`, { headers: getAdminHeaders() });
        toast.success("Manager removed");
        setAssignments(a => a.filter(x => !(x.target_type === type && x.target_id === id)));
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    return (
      <div className="space-y-6" data-testid="managers-page">
        <h2 className="text-2xl font-bold">Dedicated Managers</h2>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Assign Manager</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={form.target_type} onChange={(e) => setForm(f => ({ ...f, target_type: e.target.value }))} className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2" data-testid="manager-target-type">
              <option value="vendor">Vendor</option>
              <option value="influencer">Influencer</option>
              <option value="user">User</option>
            </select>
            <input value={form.target_id} onChange={(e) => setForm(f => ({ ...f, target_id: e.target.value }))} placeholder={`${form.target_type} ID`} className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2" data-testid="manager-target-id" />
            <select value={form.manager_admin_id} onChange={(e) => setForm(f => ({ ...f, manager_admin_id: e.target.value }))} className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2" data-testid="manager-admin-select">
              <option value="">Select Admin</option>
              {admins.map(a => <option key={a.admin_id} value={a.admin_id}>{a.name} ({a.role})</option>)}
            </select>
            <button onClick={assignManager} className="bg-gold text-black px-4 py-2 rounded font-semibold hover:bg-gold/90" data-testid="assign-manager-btn">Assign</button>
          </div>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg divide-y divide-neutral-700">
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No manager assignments yet</div>
          ) : assignments.map(a => (
            <div key={a.assignment_id} className="p-4 flex items-center justify-between" data-testid={`assignment-${a.assignment_id}`}>
              <div>
                <span className="bg-gold/20 text-gold text-xs px-2 py-0.5 rounded mr-2 uppercase">{a.target_type}</span>
                <span className="text-white font-medium">{a.target_id}</span>
                <span className="text-neutral-400 text-sm ml-3">Manager: {a.manager_name} ({a.manager_role})</span>
              </div>
              <button onClick={() => removeManager(a.target_type, a.target_id)} className="text-red-400 hover:text-red-300 text-sm" data-testid={`remove-mgr-${a.assignment_id}`}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    );
  };


  // ====== RETURNS & DISPUTES MANAGEMENT ======
  const ReturnsManagement = () => {
    const [returns, setReturns] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [selected, setSelected] = useState(null);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);

    const fetchReturns = async () => {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : "";
      try {
        const res = await axios.get(`${API}/admin/returns${params}`, { headers: getAdminHeaders() });
        setReturns(res.data.returns || []);
        setStats(res.data.stats || null);
      } catch { toast.error("Failed to load returns"); }
      finally { setLoading(false); }
    };

    useEffect(() => { fetchReturns(); }, [filterStatus]);

    const overrideStatus = async (returnId, status, refundAmount) => {
      try {
        const params = new URLSearchParams({ status });
        if (refundAmount) params.set("refund_amount", refundAmount);
        await axios.put(`${API}/admin/returns/${returnId}/override?${params}`, {}, { headers: getAdminHeaders() });
        toast.success(`Status changed to ${status}`);
        fetchReturns();
        if (selected?.return_id === returnId) {
          const res = await axios.get(`${API}/admin/returns?status=${status}`, { headers: getAdminHeaders() });
          const updated = (res.data.returns || []).find(r => r.return_id === returnId);
          if (updated) setSelected(updated);
        }
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const sendReply = async () => {
      if (!reply.trim() || !selected) return;
      setSending(true);
      try {
        await axios.post(`${API}/admin/returns/${selected.return_id}/message`, { message: reply, attachments: [] }, { headers: getAdminHeaders() });
        toast.success("Message sent");
        setReply("");
        fetchReturns();
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
      finally { setSending(false); }
    };

    const sBadge = (s) => {
      const m = { requested: "bg-blue-500/20 text-blue-400", vendor_approved: "bg-green-500/20 text-green-400", vendor_rejected: "bg-red-500/20 text-red-400", disputed: "bg-orange-500/20 text-orange-400", refunded: "bg-emerald-500/20 text-emerald-400", closed: "bg-neutral-500/20 text-neutral-400", refund_processing: "bg-yellow-500/20 text-yellow-400", item_shipped_back: "bg-purple-500/20 text-purple-400", item_received: "bg-teal-500/20 text-teal-400" };
      return m[s] || "bg-neutral-500/20 text-neutral-400";
    };

    if (selected) {
      return (
        <div className="space-y-4" data-testid="admin-return-detail">
          <button onClick={() => setSelected(null)} className="text-gold text-sm hover:underline">&larr; Back</button>
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-mono text-xs text-neutral-500">{selected.return_id}</span>
                <h3 className="text-lg font-bold text-white mt-1">Order: {selected.order_id}</h3>
                <p className="text-sm text-neutral-400">{selected.user_name} ({selected.user_email}) → Vendor: {selected.vendor_name || "N/A"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full uppercase ${sBadge(selected.status)}`}>{selected.status.replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm text-neutral-300 mb-2">{selected.description}</p>
            <div className="flex gap-4 text-xs text-neutral-500">
              <span>Reason: {selected.reason}</span>
              <span>Amount: Rs. {selected.refund_amount?.toLocaleString()}</span>
              <span>Created: {new Date(selected.created_at).toLocaleString()}</span>
            </div>
            {selected.dispute && <div className="mt-2 p-2 rounded bg-orange-500/10 text-orange-400 text-xs">Disputed: {selected.dispute.reason}</div>}
          </div>

          <div className="flex gap-2 flex-wrap">
            {["vendor_approved", "refund_processing", "refunded", "closed"].map(s => (
              <Button key={s} size="sm" variant="ghost" className="text-neutral-300 text-xs border border-neutral-700"
                onClick={() => overrideStatus(selected.return_id, s, s === "refunded" ? selected.refund_amount : null)}
                data-testid={`override-${s}`}>{s.replace(/_/g, " ")}</Button>
            ))}
          </div>

          <div className="space-y-2">
            {selected.messages?.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg border ${m.sender_type === "admin" ? "bg-gold/5 border-gold/20 ml-6" : m.sender_type === "vendor" ? "bg-blue-500/5 border-blue-500/20 ml-3" : "bg-neutral-800/50 border-neutral-700 mr-6"}`}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white">{m.sender_name} ({m.sender_type})</span>
                  <span className="text-xs text-neutral-500">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-neutral-300">{m.message}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-end">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to user..."
              rows={2} className="flex-1 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm resize-none" data-testid="admin-return-reply" />
            <Button onClick={sendReply} disabled={sending} className="bg-gold text-black" data-testid="admin-return-send">
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-testid="returns-management-page">
        <h2 className="font-serif text-2xl font-bold text-white">Returns & Disputes</h2>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total", val: stats.total, color: "border-neutral-700" },
              { label: "Pending", val: stats.requested, color: "border-blue-500/30" },
              { label: "Approved", val: stats.approved, color: "border-green-500/30" },
              { label: "Rejected", val: stats.rejected, color: "border-red-500/30" },
              { label: "Disputed", val: stats.disputed, color: "border-orange-500/30" },
              { label: "Refunded", val: stats.refunded, color: "border-emerald-500/30" },
            ].map(s => (
              <div key={s.label} className={`bg-neutral-800/50 border ${s.color} rounded-lg p-3 text-center`}>
                <p className="text-2xl font-bold text-white">{s.val || 0}</p>
                <p className="text-xs text-neutral-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {["", "requested", "vendor_approved", "vendor_rejected", "disputed", "refunded", "closed"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filterStatus === s ? "bg-gold text-black border-gold" : "border-neutral-700 text-neutral-400"}`}>
              {s ? s.replace(/_/g, " ") : "All"}
            </button>
          ))}
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="text-neutral-400">ID</TableHead>
                <TableHead className="text-neutral-400">Order</TableHead>
                <TableHead className="text-neutral-400">User</TableHead>
                <TableHead className="text-neutral-400">Reason</TableHead>
                <TableHead className="text-neutral-400">Amount</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map(r => (
                <TableRow key={r.return_id} className={`border-neutral-700 ${r.status === "disputed" ? "bg-orange-500/5" : ""}`}>
                  <TableCell className="font-mono text-xs text-neutral-400">{r.return_id.slice(0, 12)}</TableCell>
                  <TableCell className="text-neutral-300 text-sm">{r.order_id.slice(0, 12)}</TableCell>
                  <TableCell>
                    <p className="text-neutral-300 text-sm">{r.user_name}</p>
                    <span className="text-xs text-neutral-500">{r.vendor_name || "N/A"}</span>
                  </TableCell>
                  <TableCell className="text-neutral-400 text-sm">{r.reason.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-neutral-300 text-sm">Rs. {r.refund_amount?.toLocaleString()}</TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${sBadge(r.status)}`}>{r.status.replace(/_/g, " ")}</span></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-gold text-xs" onClick={() => setSelected(r)}
                      data-testid={`view-return-${r.return_id}`}><Eye className="h-3 w-3 mr-1" /> View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && returns.length === 0 && <div className="text-center py-12 text-neutral-500">No returns found</div>}
        </div>
      </div>
    );
  };


  // ====== SUPPORT TICKETS MANAGEMENT ======
  const SupportTicketsManagement = () => {
    const [tickets, setTickets] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: "", category: "", priority: "", search: "" });
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [admins, setAdmins] = useState([]);
    const [kbTitle, setKbTitle] = useState("");
    const [kbContent, setKbContent] = useState("");
    const [kbCategory, setKbCategory] = useState("general");
    const [showKbForm, setShowKbForm] = useState(false);

    const fetchTickets = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.category) params.set("category", filters.category);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.search) params.set("search", filters.search);
      params.set("limit", "50");
      try {
        const [tRes, aRes] = await Promise.all([
          axios.get(`${API}/admin/tickets?${params}`, { headers: getAdminHeaders() }),
          axios.get(`${API}/admin/tickets/analytics`, { headers: getAdminHeaders() })
        ]);
        setTickets(tRes.data.tickets || []);
        setTotal(tRes.data.total || 0);
        setAnalytics(aRes.data);
      } catch { toast.error("Failed to load tickets"); }
      finally { setLoading(false); }
    };

    useEffect(() => { fetchTickets(); }, [filters]);
    useEffect(() => {
      axios.get(`${API}/admin/users`, { headers: getAdminHeaders() }).then(r => setAdmins(r.data || [])).catch(() => {});
    }, []);

    const openTicketDetail = async (ticketId) => {
      try {
        const res = await axios.get(`${API}/admin/tickets/${ticketId}`, { headers: getAdminHeaders() });
        setSelectedTicket(res.data);
      } catch { toast.error("Failed to load ticket"); }
    };

    const assignTicket = async (ticketId, adminId) => {
      try {
        await axios.put(`${API}/admin/tickets/${ticketId}/assign?admin_id=${adminId}`, {}, { headers: getAdminHeaders() });
        toast.success("Ticket assigned");
        fetchTickets();
        if (selectedTicket?.ticket_id === ticketId) openTicketDetail(ticketId);
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const changeStatus = async (ticketId, status) => {
      try {
        await axios.put(`${API}/admin/tickets/${ticketId}/status?status=${status}`, {}, { headers: getAdminHeaders() });
        toast.success(`Status changed to ${status}`);
        fetchTickets();
        if (selectedTicket?.ticket_id === ticketId) openTicketDetail(ticketId);
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const sendReply = async () => {
      if (!reply.trim() || !selectedTicket) return;
      setSending(true);
      try {
        await axios.post(`${API}/admin/tickets/${selectedTicket.ticket_id}/reply`, { message: reply, attachments: [] }, { headers: getAdminHeaders() });
        toast.success("Reply sent");
        setReply("");
        openTicketDetail(selectedTicket.ticket_id);
        fetchTickets();
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
      finally { setSending(false); }
    };

    const escalateTicket = async (ticketId) => {
      try {
        await axios.put(`${API}/admin/tickets/${ticketId}/escalate`, {}, { headers: getAdminHeaders() });
        toast.success("Ticket escalated");
        fetchTickets();
        if (selectedTicket?.ticket_id === ticketId) openTicketDetail(ticketId);
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const createKbArticle = async () => {
      if (!kbTitle || !kbContent) { toast.error("Fill title and content"); return; }
      try {
        await axios.post(`${API}/admin/kb/articles`, { title: kbTitle, content: kbContent, category: kbCategory }, { headers: getAdminHeaders() });
        toast.success("Article created");
        setKbTitle(""); setKbContent(""); setKbCategory("general"); setShowKbForm(false);
      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    };

    const statusBadge = (s) => {
      const map = { open: "bg-blue-500/20 text-blue-400", assigned: "bg-purple-500/20 text-purple-400", in_progress: "bg-yellow-500/20 text-yellow-400", waiting_for_user: "bg-orange-500/20 text-orange-400", resolved: "bg-green-500/20 text-green-400", closed: "bg-neutral-500/20 text-neutral-400" };
      return map[s] || "bg-neutral-500/20 text-neutral-400";
    };
    const prioBadge = (p) => {
      const map = { high: "bg-red-500/20 text-red-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-green-500/20 text-green-400" };
      return map[p] || "bg-neutral-500/20 text-neutral-400";
    };

    if (selectedTicket) {
      return (
        <div className="space-y-4" data-testid="admin-ticket-detail">
          <button onClick={() => setSelectedTicket(null)} className="text-gold text-sm hover:underline flex items-center gap-1">&larr; Back to tickets</button>
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-mono text-xs text-neutral-500">{selectedTicket.ticket_id}</span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedTicket.title}</h3>
                <p className="text-sm text-neutral-400 mt-1">By {selectedTicket.user_name} ({selectedTicket.user_type}) - {selectedTicket.user_email}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${prioBadge(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${statusBadge(selectedTicket.status)}`}>{selectedTicket.status.replace(/_/g, " ")}</span>
                {selectedTicket.escalated && <span className="text-[10px] px-2 py-0.5 rounded-full uppercase bg-red-600/20 text-red-400">Escalated</span>}
              </div>
            </div>
            <p className="text-sm text-neutral-300 mb-3">{selectedTicket.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
              <span>Category: {selectedTicket.category.replace(/_/g, " ")}</span>
              <span>Created: {new Date(selectedTicket.created_at).toLocaleString()}</span>
              {selectedTicket.assigned_name && <span>Assigned: {selectedTicket.assigned_name}</span>}
              {selectedTicket.sla_deadline && (
                <span className={new Date() > new Date(selectedTicket.sla_deadline) ? "text-red-400 font-medium" : ""}>
                  SLA: {new Date() > new Date(selectedTicket.sla_deadline) ? "OVERDUE" : new Date(selectedTicket.sla_deadline).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <select onChange={(e) => { if (e.target.value) assignTicket(selectedTicket.ticket_id, e.target.value); }}
              className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-1.5 text-sm" data-testid="assign-select">
              <option value="">Assign to...</option>
              {admins.map(a => <option key={a.admin_id} value={a.admin_id}>{a.name} ({a.role})</option>)}
            </select>
            {["in_progress", "waiting_for_user", "resolved", "closed"].map(s => (
              <Button key={s} size="sm" variant="ghost" className="text-neutral-300 text-xs border border-neutral-700"
                onClick={() => changeStatus(selectedTicket.ticket_id, s)} data-testid={`status-${s}`}>
                {s.replace(/_/g, " ")}
              </Button>
            ))}
            {!selectedTicket.escalated && (
              <Button size="sm" variant="ghost" className="text-red-400 text-xs border border-red-500/30"
                onClick={() => escalateTicket(selectedTicket.ticket_id)} data-testid="escalate-btn">
                Escalate
              </Button>
            )}
          </div>

          {/* Replies */}
          <div className="space-y-2">
            {selectedTicket.replies?.map(r => (
              <div key={r.reply_id} className={`p-3 rounded-lg border ${r.sender_type === "support" ? "bg-gold/5 border-gold/20 ml-6" : "bg-neutral-800/50 border-neutral-700 mr-6"}`}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-white">{r.sender_name} <span className="text-neutral-500 text-xs">({r.sender_type})</span></span>
                  <span className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">{r.message}</p>
              </div>
            ))}
            {(!selectedTicket.replies || selectedTicket.replies.length === 0) && <p className="text-neutral-500 text-sm text-center py-4">No replies yet</p>}
          </div>

          {/* Reply form */}
          <div className="flex gap-2 items-end">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder="Type reply to user..." rows={2}
              className="flex-1 bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm resize-none" data-testid="admin-reply-input" />
            <Button onClick={sendReply} disabled={sending} className="bg-gold text-black" data-testid="admin-reply-send">
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6" data-testid="support-tickets-page">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="font-serif text-2xl font-bold text-white">Support Tickets</h2>
          <Button size="sm" className="bg-gold text-black" onClick={() => setShowKbForm(!showKbForm)} data-testid="add-kb-btn">
            <BookOpen className="h-4 w-4 mr-1" /> {showKbForm ? "Cancel" : "Add KB Article"}
          </Button>
        </div>

        {/* KB Article Form */}
        {showKbForm && (
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">New Knowledge Base Article</h3>
            <Input value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} placeholder="Article title"
              className="bg-neutral-900 border-neutral-700 text-white" data-testid="kb-title-input" />
            <textarea value={kbContent} onChange={(e) => setKbContent(e.target.value)} placeholder="Article content..."
              rows={4} className="w-full bg-neutral-900 border border-neutral-700 text-white rounded px-3 py-2 text-sm resize-none" data-testid="kb-content-input" />
            <div className="flex gap-3">
              <select value={kbCategory} onChange={(e) => setKbCategory(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm">
                <option value="general">General</option>
                <option value="payment">Payment</option>
                <option value="order">Order</option>
                <option value="account">Account</option>
                <option value="vendor">Vendor</option>
              </select>
              <Button onClick={createKbArticle} className="bg-gold text-black" data-testid="save-kb-btn">Save Article</Button>
            </div>
          </div>
        )}

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{analytics.total}</p>
              <p className="text-xs text-neutral-400">Total</p>
            </div>
            <div className="bg-neutral-800/50 border border-blue-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{analytics.by_status?.open || 0}</p>
              <p className="text-xs text-neutral-400">Open</p>
            </div>
            <div className="bg-neutral-800/50 border border-yellow-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-400">{analytics.by_status?.in_progress || 0}</p>
              <p className="text-xs text-neutral-400">In Progress</p>
            </div>
            <div className="bg-neutral-800/50 border border-orange-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{analytics.by_status?.waiting_for_user || 0}</p>
              <p className="text-xs text-neutral-400">Waiting</p>
            </div>
            <div className="bg-neutral-800/50 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{analytics.by_status?.resolved || 0}</p>
              <p className="text-xs text-neutral-400">Resolved</p>
            </div>
            <div className="bg-neutral-800/50 border border-red-500/30 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-400">{analytics.escalated || 0}</p>
              <p className="text-xs text-neutral-400">Escalated</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm" data-testid="filter-status">
            <option value="">All Statuses</option>
            {["open", "assigned", "in_progress", "waiting_for_user", "resolved", "closed"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filters.priority} onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
            className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm" data-testid="filter-priority">
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
            className="bg-neutral-800 border border-neutral-700 text-white rounded px-3 py-2 text-sm" data-testid="filter-category">
            <option value="">All Categories</option>
            <option value="payment">Payment</option>
            <option value="order">Order</option>
            <option value="refund">Refund</option>
            <option value="vendor_collaboration">Vendor Collab</option>
            <option value="account_login">Account</option>
            <option value="technical_bug">Bug</option>
          </select>
          <Input value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search tickets..." className="bg-neutral-800 border-neutral-700 text-white max-w-[200px]" data-testid="filter-search" />
        </div>

        {/* Ticket Table */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-700">
                <TableHead className="text-neutral-400">ID</TableHead>
                <TableHead className="text-neutral-400">Title</TableHead>
                <TableHead className="text-neutral-400">User</TableHead>
                <TableHead className="text-neutral-400">Priority</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-400">Assigned</TableHead>
                <TableHead className="text-neutral-400">SLA</TableHead>
                <TableHead className="text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map(t => {
                const slaOver = t.sla_deadline && new Date() > new Date(t.sla_deadline) && !["resolved", "closed"].includes(t.status);
                return (
                  <TableRow key={t.ticket_id} className={`border-neutral-700 ${slaOver ? "bg-red-500/5" : ""}`}>
                    <TableCell className="font-mono text-xs text-neutral-400">{t.ticket_id.slice(0, 12)}</TableCell>
                    <TableCell>
                      <p className="text-white text-sm truncate max-w-[200px]">{t.title}</p>
                      <span className="text-xs text-neutral-500">{t.category.replace(/_/g, " ")}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-neutral-300 text-sm">{t.user_name}</p>
                      <span className="text-xs text-neutral-500">{t.user_type}</span>
                    </TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${prioBadge(t.priority)}`}>{t.priority}</span></TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(t.status)}`}>{t.status.replace(/_/g, " ")}</span></TableCell>
                    <TableCell className="text-neutral-400 text-sm">{t.assigned_name || "-"}</TableCell>
                    <TableCell>
                      {slaOver ? (
                        <span className="text-xs text-red-400 font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Overdue</span>
                      ) : t.sla_deadline ? (
                        <span className="text-xs text-neutral-500">{new Date(t.sla_deadline).toLocaleString()}</span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-gold text-xs" onClick={() => openTicketDetail(t.ticket_id)} data-testid={`view-ticket-${t.ticket_id}`}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
          {!loading && tickets.length === 0 && <div className="text-center py-12 text-neutral-500">No tickets found</div>}
        </div>
      </div>
    );
  };


  const navItems = [
    { path: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", permission: ["analytics", "view"] },
    { path: "/admin/orders", icon: <ShoppingCart className="h-5 w-5" />, label: "Orders", permission: ["orders", "view"] },
    { path: "/admin/influencers", icon: <UserCheck className="h-5 w-5" />, label: "Influencers", permission: ["influencers", "view"] },
    { path: "/admin/affiliates", icon: <Percent className="h-5 w-5" />, label: "Affiliates", permission: ["affiliates", "view"] },
    { path: "/admin/withdrawals", icon: <Wallet className="h-5 w-5" />, label: "Withdrawals", permission: ["wallets", "view"] },
    { path: "/admin/products", icon: <Package className="h-5 w-5" />, label: "Products", permission: ["products", "view"] },
    { path: "/admin/customers", icon: <Users className="h-5 w-5" />, label: "Customers", permission: ["customers", "view"] },
    { path: "/admin/coupons", icon: <Tag className="h-5 w-5" />, label: "Marketing", permission: ["coupons", "view"] },
    { path: "/admin/vendors", icon: <Store className="h-5 w-5" />, label: "Vendors", permission: ["vendors", "view"] },
    { path: "/admin/vendor-products", icon: <FileCheck className="h-5 w-5" />, label: "Product Approvals", permission: ["vendor_products", "view"] },
    { path: "/admin/resellers", icon: <TrendingUp className="h-5 w-5" />, label: "Resellers", permission: ["resellers", "view"] },
    { path: "/admin/action-history", icon: <AlertTriangle className="h-5 w-5" />, label: "Action History", permission: ["analytics", "view"] },
    { path: "/admin/managers", icon: <Shield className="h-5 w-5" />, label: "Managers", permission: ["admin_users", "view"] },
    { path: "/admin/tickets", icon: <LifeBuoy className="h-5 w-5" />, label: "Support Tickets", permission: ["tickets", "view"] },
    { path: "/admin/returns", icon: <Package className="h-5 w-5" />, label: "Returns & Disputes", permission: ["orders", "view"] },
    { path: "/admin/settings", icon: <Settings className="h-5 w-5" />, label: "Settings", permission: ["platform_settings", "view"] },
    { path: "/admin/hero-video", icon: <Eye className="h-5 w-5" />, label: "Hero Video", permission: ["platform_settings", "edit"] },
    { path: "/admin/referral-tiers", icon: <TrendingUp className="h-5 w-5" />, label: "Referral Tiers", permission: ["platform_settings", "view"] },
    { path: "/admin/instagram", icon: <Instagram className="h-5 w-5" />, label: "Instagram DM", permission: ["platform_settings", "edit"] },
    { path: "/admin/whatsapp", icon: <MessageSquare className="h-5 w-5" />, label: "WhatsApp", permission: ["platform_settings", "edit"] },
    { path: "/admin/cart-booster", icon: <TrendingUp className="h-5 w-5" />, label: "Cart Booster", permission: ["platform_settings", "edit"] },
    { path: "/admin/reviews", icon: <Star className="h-5 w-5" />, label: "Reviews", permission: ["products", "edit"] },
    { path: "/admin/users", icon: <Shield className="h-5 w-5" />, label: "Admin Users", permission: ["admin_users", "view"] },
  ];

  // Filter nav items based on permissions
  const filteredNavItems = navItems.filter(item => {
    if (!admin?.permissions) return false;
    const [resource, action] = item.permission;
    const perms = admin.permissions[resource] || [];
    return perms.includes(action);
  });

  if (!admin) {
    return <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white" data-testid="admin-dashboard">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-neutral-950 border-r border-neutral-800 fixed left-0 top-0 bottom-0 overflow-y-auto">
          <div className="p-4 flex flex-col h-full">
          {/* Brand */}
          <div className="mb-4 pb-3 border-b border-neutral-800 flex-shrink-0">
            <h1 className="font-serif text-xl font-bold text-gold tracking-wider">PIGMA</h1>
            <p className="text-xs text-neutral-500">Admin Panel</p>
          </div>
          {/* Admin Info */}
          <div className="mb-4 pb-3 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-black" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{admin.name}</p>
                <p className="text-xs text-neutral-400 capitalize">{admin.role?.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                  currentPath === item.path
                    ? "bg-gold text-black"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-2 flex-shrink-0"
            data-testid="admin-logout-btn"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <Routes>
            <Route index element={<DashboardOverview />} />
            <Route path="orders" element={<AdminOrdersPanel />} />
            <Route path="influencers" element={<InfluencerManagement />} />
            <Route path="affiliates" element={<AffiliatesManagement />} />
            <Route path="withdrawals" element={<WithdrawalManagement />} />
            <Route path="products" element={<ProductsManagement />} />
            <Route path="customers" element={<CustomersManagement />} />
            <Route path="coupons" element={<CouponsManagement />} />
            <Route path="vendors" element={<VendorsManagement />} />
            <Route path="vendor-products" element={<VendorProductApprovals />} />
            <Route path="resellers" element={<ResellersManagement />} />
            <Route path="suspension-history" element={<SuspensionHistoryPage />} />
            <Route path="action-history" element={<ActionHistoryPage />} />
            <Route path="managers" element={<ManagersPage />} />
            <Route path="tickets" element={<SupportTicketsManagement />} />
            <Route path="returns" element={<ReturnsManagement />} />
            <Route path="settings" element={<CommissionSettings />} />
            <Route path="hero-video" element={<HeroVideoManagement />} />
            <Route path="referral-tiers" element={<ReferralTiersManagement />} />
            <Route path="instagram" element={<InstagramDMManagement />} />
            <Route path="whatsapp" element={<WhatsAppRemindersManagement />} />
            <Route path="cart-booster" element={<AdminBoosterPanel />} />
            <Route path="reviews" element={<AdminReviewsPanel />} />
            <Route path="users" element={<AdminUsersManagement />} />
            <Route path="*" element={<DashboardOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
