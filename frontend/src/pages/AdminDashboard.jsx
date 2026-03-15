import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ShoppingCart, Users, UserCheck, 
  Percent, Tag, TrendingUp, DollarSign, AlertTriangle, ChevronRight,
  Plus, Edit2, Trash2, Check, X, Eye, Wallet, CreditCard, LogOut,
  Shield, Instagram, Settings, User, Lock
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

// Influencer Management
const InfluencerManagement = () => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        const response = await axios.get(`${API}/influencers`, {
          headers: getAdminHeaders()
        });
        setInfluencers(response.data);
      } catch (error) {
        toast.error("Failed to load influencers");
      } finally {
        setLoading(false);
      }
    };
    fetchInfluencers();
  }, []);

  const updateStatus = async (influencerId, status) => {
    try {
      await axios.put(
        `${API}/influencers/${influencerId}/status?status=${status}`,
        {},
        { headers: getAdminHeaders() }
      );
      toast.success(`Influencer ${status}`);
      setInfluencers(influencers.map(i => 
        i.influencer_id === influencerId ? { ...i, status } : i
      ));
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update status");
    }
  };

  const canApprove = hasPermission("influencers", "approve");

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-6">Influencer Management</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead className="text-neutral-400">Name</TableHead>
              <TableHead className="text-neutral-400">Instagram</TableHead>
              <TableHead className="text-neutral-400">Connected</TableHead>
              <TableHead className="text-neutral-400">Clicks</TableHead>
              <TableHead className="text-neutral-400">Sales</TableHead>
              <TableHead className="text-neutral-400">Earnings</TableHead>
              <TableHead className="text-neutral-400">Wallet</TableHead>
              <TableHead className="text-neutral-400">Status</TableHead>
              {canApprove && <TableHead className="text-neutral-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {influencers.map((inf) => (
              <TableRow key={inf.influencer_id} className="border-neutral-700">
                <TableCell className="text-white">{inf.name}</TableCell>
                <TableCell className="text-neutral-300">@{inf.instagram_handle || "-"}</TableCell>
                <TableCell>
                  {inf.instagram_connected ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <Instagram className="h-4 w-4" /> Yes
                    </span>
                  ) : (
                    <span className="text-neutral-500">No</span>
                  )}
                </TableCell>
                <TableCell className="text-neutral-300">{inf.total_clicks}</TableCell>
                <TableCell className="text-neutral-300">{inf.total_conversions}</TableCell>
                <TableCell className="text-gold">₹{inf.total_earnings?.toLocaleString()}</TableCell>
                <TableCell className="text-emerald-400">₹{inf.wallet_balance?.toLocaleString() || 0}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    inf.status === "approved" ? "bg-green-500/20 text-green-400" :
                    inf.status === "rejected" ? "bg-red-500/20 text-red-400" : 
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {inf.status}
                  </span>
                </TableCell>
                {canApprove && (
                  <TableCell>
                    {inf.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => updateStatus(inf.influencer_id, "approved")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => updateStatus(inf.influencer_id, "rejected")}
                        >
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
        {!loading && influencers.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No influencers found</div>
        )}
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

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await axios.get(`${API}/admin/users`, {
          headers: getAdminHeaders()
        });
        setAdmins(response.data);
      } catch (error) {
        toast.error("Failed to load admin users");
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: "bg-gold/20 text-gold",
      marketing_manager: "bg-blue-500/20 text-blue-400",
      finance_manager: "bg-green-500/20 text-green-400",
      support_manager: "bg-purple-500/20 text-purple-400"
    };
    return colors[role] || "bg-neutral-500/20 text-neutral-400";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl font-bold text-white">Admin Users</h2>
        <Button className="bg-gold text-black hover:bg-gold-dark">
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.admin_id} className="border-neutral-700">
                <TableCell className="text-white">{admin.name}</TableCell>
                <TableCell className="text-neutral-300">{admin.email}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${getRoleBadge(admin.role)}`}>
                    {admin.role.replace("_", " ")}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <div className="text-center py-8 text-neutral-500">Loading...</div>}
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

  const navItems = [
    { path: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview", permission: ["analytics", "view"] },
    { path: "/admin/orders", icon: <ShoppingCart className="h-5 w-5" />, label: "Orders", permission: ["orders", "view"] },
    { path: "/admin/influencers", icon: <UserCheck className="h-5 w-5" />, label: "Influencers", permission: ["influencers", "view"] },
    { path: "/admin/affiliates", icon: <Percent className="h-5 w-5" />, label: "Affiliates", permission: ["affiliates", "view"] },
    { path: "/admin/withdrawals", icon: <Wallet className="h-5 w-5" />, label: "Withdrawals", permission: ["wallets", "view"] },
    { path: "/admin/products", icon: <Package className="h-5 w-5" />, label: "Products", permission: ["products", "view"] },
    { path: "/admin/customers", icon: <Users className="h-5 w-5" />, label: "Customers", permission: ["customers", "view"] },
    { path: "/admin/coupons", icon: <Tag className="h-5 w-5" />, label: "Coupons", permission: ["coupons", "view"] },
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
    <div className="min-h-screen pt-20 bg-neutral-900 text-white" data-testid="admin-dashboard">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-neutral-950 border-r border-neutral-800 p-4 fixed left-0 top-20">
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
            <Route path="withdrawals" element={<WithdrawalManagement />} />
            <Route path="users" element={<AdminUsersManagement />} />
            <Route path="*" element={<DashboardOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
