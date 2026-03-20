import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ShoppingCart, Users, UserCheck, 
  Percent, Tag, TrendingUp, DollarSign, AlertTriangle, ChevronRight,
  Plus, Edit2, Trash2, Check, X, Eye, Wallet, CreditCard, LogOut,
  Shield, Instagram, Settings, User, Lock, Store, FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products?limit=100`);
        setProducts(response.data);
      } catch (error) {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${productId}`, { headers: getAdminHeaders() });
      toast.success("Product deleted");
      setProducts(products.filter(p => p.product_id !== productId));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete");
    }
  };

  const canDelete = hasPermission("products", "delete");

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Products Management</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Product</TableHead>
              <TableHead className="text-neutral-400">Category</TableHead>
              <TableHead className="text-neutral-400">Price</TableHead>
              <TableHead className="text-neutral-400">Stock</TableHead>
              <TableHead className="text-neutral-400">Limited</TableHead>
              {canDelete && <TableHead className="text-neutral-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.product_id} className="border-neutral-700">
                <TableCell className="text-white">{p.name}</TableCell>
                <TableCell className="text-neutral-300">{p.category}</TableCell>
                <TableCell className="text-gold">{p.price?.toLocaleString()}</TableCell>
                <TableCell className={p.stock < 10 ? "text-red-400" : "text-neutral-300"}>{p.stock}</TableCell>
                <TableCell>{p.is_limited_edition ? <Badge variant="outline" className="border-gold text-gold">Limited</Badge> : "-"}</TableCell>
                {canDelete && (
                  <TableCell>
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteProduct(p.product_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && products.length === 0 && <div className="text-center py-12 text-neutral-500">No products</div>}
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

// Coupons Management
const CouponsManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await axios.get(`${API}/coupons`, { headers: getAdminHeaders() });
        setCoupons(response.data);
      } catch (error) {
        toast.error("Failed to load coupons");
      } finally {
        setLoading(false);
      }
    };
    fetchCoupons();
  }, []);

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Coupons</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Code</TableHead>
              <TableHead className="text-neutral-400">Discount</TableHead>
              <TableHead className="text-neutral-400">Min Order</TableHead>
              <TableHead className="text-neutral-400">Used/Max</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.coupon_id} className="border-neutral-700">
                <TableCell className="font-mono text-gold">{c.code}</TableCell>
                <TableCell className="text-white">
                  {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value}`}
                </TableCell>
                <TableCell className="text-neutral-300">{c.min_order_value?.toLocaleString()}</TableCell>
                <TableCell className="text-neutral-300">{c.used_count}/{c.max_uses}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${c.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
        {!loading && coupons.length === 0 && <div className="text-center py-12 text-neutral-500">No coupons</div>}
      </div>
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
  const admin = getAdmin();

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem("pigma_admin_token");
    if (!token) {
      navigate("/admin-login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("pigma_admin_token");
    localStorage.removeItem("pigma_admin");
    toast.success("Logged out");
    navigate("/admin-login");
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

  const navItems = [
    { path: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", permission: ["analytics", "view"] },
    { path: "/admin/orders", icon: <ShoppingCart className="h-5 w-5" />, label: "Orders", permission: ["orders", "view"] },
    { path: "/admin/influencers", icon: <UserCheck className="h-5 w-5" />, label: "Influencers", permission: ["influencers", "view"] },
    { path: "/admin/affiliates", icon: <Percent className="h-5 w-5" />, label: "Affiliates", permission: ["affiliates", "view"] },
    { path: "/admin/withdrawals", icon: <Wallet className="h-5 w-5" />, label: "Withdrawals", permission: ["wallets", "view"] },
    { path: "/admin/products", icon: <Package className="h-5 w-5" />, label: "Products", permission: ["products", "view"] },
    { path: "/admin/customers", icon: <Users className="h-5 w-5" />, label: "Customers", permission: ["customers", "view"] },
    { path: "/admin/coupons", icon: <Tag className="h-5 w-5" />, label: "Coupons", permission: ["coupons", "view"] },
    { path: "/admin/vendors", icon: <Store className="h-5 w-5" />, label: "Vendors", permission: ["vendors", "view"] },
    { path: "/admin/vendor-products", icon: <FileCheck className="h-5 w-5" />, label: "Product Approvals", permission: ["vendor_products", "view"] },
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
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-neutral-950 border-r border-neutral-800 p-4 fixed left-0 top-0">
          {/* Brand */}
          <div className="mb-4 pb-3 border-b border-neutral-800">
            <h1 className="font-serif text-xl font-bold text-gold tracking-wider">PIGMA</h1>
            <p className="text-xs text-neutral-500">Admin Panel</p>
          </div>
          {/* Admin Info */}
          <div className="mb-6 pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="font-medium text-sm">{admin.name}</p>
                <p className="text-xs text-neutral-400 capitalize">{admin.role?.replace("_", " ")}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-4"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <Routes>
            <Route index element={<DashboardOverview />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="influencers" element={<InfluencerManagement />} />
            <Route path="affiliates" element={<AffiliatesManagement />} />
            <Route path="withdrawals" element={<WithdrawalManagement />} />
            <Route path="products" element={<ProductsManagement />} />
            <Route path="customers" element={<CustomersManagement />} />
            <Route path="coupons" element={<CouponsManagement />} />
            <Route path="vendors" element={<VendorsManagement />} />
            <Route path="vendor-products" element={<VendorProductApprovals />} />
            <Route path="users" element={<AdminUsersManagement />} />
            <Route path="*" element={<DashboardOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
