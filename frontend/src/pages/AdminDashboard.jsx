import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Package, ShoppingCart, Users, UserCheck, 
  Percent, Tag, TrendingUp, DollarSign, AlertTriangle, ChevronRight,
  Plus, Edit2, Trash2, Check, X, Eye
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
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

// Dashboard Overview Component
const DashboardOverview = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

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
          value={`Rs.${(stats?.stats?.total_revenue || 0).toLocaleString()}`}
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5 text-blue-400" />}
          label="Total Orders"
          value={stats?.stats?.total_orders || 0}
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={<Package className="h-5 w-5 text-purple-400" />}
          label="Products"
          value={stats?.stats?.total_products || 0}
          bg="bg-purple-500/10"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-gold" />}
          label="Customers"
          value={stats?.stats?.total_customers || 0}
          bg="bg-gold/10"
        />
      </div>

      {/* Pending Actions */}
      {(stats?.stats?.pending_influencers > 0 || stats?.stats?.pending_affiliates > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div className="flex-1">
            <p className="font-medium">Pending Approvals</p>
            <p className="text-sm text-neutral-400">
              {stats?.stats?.pending_influencers || 0} influencer(s), {stats?.stats?.pending_affiliates || 0} affiliate(s)
            </p>
          </div>
          <Link to="/admin/influencers">
            <Button variant="outline" size="sm">Review</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Orders</h3>
            <Link to="/admin/orders" className="text-sm text-gold hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {stats?.recent_orders?.slice(0, 5).map((order) => (
              <div key={order.order_id} className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-0">
                <div>
                  <p className="font-medium text-sm">{order.order_id}</p>
                  <p className="text-xs text-neutral-400">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Rs.{order.total?.toLocaleString()}</p>
                  <Badge variant={order.status === "delivered" ? "success" : "secondary"} className="text-xs">
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
            {(!stats?.recent_orders || stats.recent_orders.length === 0) && (
              <p className="text-neutral-500 text-center py-4">No recent orders</p>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Low Stock Products</h3>
            <Link to="/admin/products" className="text-sm text-gold hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {stats?.low_stock_products?.map((product) => (
              <div key={product.product_id} className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-700 rounded overflow-hidden">
                    <img src={product.images?.[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[150px]">{product.name}</p>
                    <p className="text-xs text-red-400">{product.stock} left</p>
                  </div>
                </div>
              </div>
            ))}
            {(!stats?.low_stock_products || stats.low_stock_products.length === 0) && (
              <p className="text-neutral-500 text-center py-4">All products well stocked</p>
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
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-neutral-400">{label}</p>
  </motion.div>
);

// Orders Management
const OrdersManagement = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API}/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(response.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [token]);

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(
        `${API}/admin/orders/${orderId}/status?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Order status updated");
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status } : o));
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Orders</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.order_id} className="border-neutral-700">
                <TableCell className="font-mono text-sm">{order.order_id}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{order.items?.length || 0}</TableCell>
                <TableCell>Rs.{order.total?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={order.payment_status === "paid" ? "success" : "warning"}>
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateStatus(order.order_id, value)}
                  >
                    <SelectTrigger className="w-32 h-8 bg-neutral-900 border-neutral-700">
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
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No orders found</div>
        )}
      </div>
    </div>
  );
};

// Influencer Management
const InfluencerManagement = () => {
  const { token } = useAuth();
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        const response = await axios.get(`${API}/influencers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInfluencers(response.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInfluencers();
  }, [token]);

  const updateStatus = async (influencerId, status) => {
    try {
      await axios.put(
        `${API}/influencers/${influencerId}/status?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Influencer ${status}`);
      setInfluencers(influencers.map(i => 
        i.influencer_id === influencerId ? { ...i, status } : i
      ));
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Influencers</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead>Name</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Conversions</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {influencers.map((inf) => (
              <TableRow key={inf.influencer_id} className="border-neutral-700">
                <TableCell>{inf.name}</TableCell>
                <TableCell>@{inf.instagram_handle}</TableCell>
                <TableCell>{inf.followers_count?.toLocaleString()}</TableCell>
                <TableCell>{inf.total_clicks}</TableCell>
                <TableCell>{inf.total_conversions}</TableCell>
                <TableCell>Rs.{inf.total_earnings?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={
                    inf.status === "approved" ? "success" :
                    inf.status === "rejected" ? "destructive" : "warning"
                  }>
                    {inf.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {inf.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300"
                        onClick={() => updateStatus(inf.influencer_id, "approved")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => updateStatus(inf.influencer_id, "rejected")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {influencers.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No influencers found</div>
        )}
      </div>
    </div>
  );
};

// Affiliate Management
const AffiliateManagement = () => {
  const { token } = useAuth();
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAffiliates = async () => {
      try {
        const response = await axios.get(`${API}/affiliates`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAffiliates(response.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAffiliates();
  }, [token]);

  const updateStatus = async (affiliateId, status) => {
    try {
      await axios.put(
        `${API}/affiliates/${affiliateId}/status?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Affiliate ${status}`);
      setAffiliates(affiliates.map(a => 
        a.affiliate_id === affiliateId ? { ...a, status } : a
      ));
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Affiliates</h2>
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700">
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Conversions</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.map((aff) => (
              <TableRow key={aff.affiliate_id} className="border-neutral-700">
                <TableCell>{aff.name}</TableCell>
                <TableCell>{aff.company_name || "-"}</TableCell>
                <TableCell>{aff.total_clicks}</TableCell>
                <TableCell>{aff.total_conversions}</TableCell>
                <TableCell>{aff.commission_rate}%</TableCell>
                <TableCell>Rs.{aff.total_earnings?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={
                    aff.status === "approved" ? "success" :
                    aff.status === "rejected" ? "destructive" : "warning"
                  }>
                    {aff.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {aff.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300"
                        onClick={() => updateStatus(aff.affiliate_id, "approved")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => updateStatus(aff.affiliate_id, "rejected")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {affiliates.length === 0 && (
          <div className="text-center py-12 text-neutral-500">No affiliates found</div>
        )}
      </div>
    </div>
  );
};

// Main Admin Dashboard
export const AdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, label: "Overview" },
    { path: "/admin/orders", icon: <ShoppingCart className="h-5 w-5" />, label: "Orders" },
    { path: "/admin/products", icon: <Package className="h-5 w-5" />, label: "Products" },
    { path: "/admin/customers", icon: <Users className="h-5 w-5" />, label: "Customers" },
    { path: "/admin/influencers", icon: <UserCheck className="h-5 w-5" />, label: "Influencers" },
    { path: "/admin/affiliates", icon: <Percent className="h-5 w-5" />, label: "Affiliates" },
    { path: "/admin/coupons", icon: <Tag className="h-5 w-5" />, label: "Coupons" },
  ];

  return (
    <div className="min-h-screen pt-20 bg-neutral-900 text-white" data-testid="admin-dashboard">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-neutral-950 border-r border-neutral-800 p-4 fixed left-0 top-20">
          <nav className="space-y-1">
            {navItems.map((item) => (
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 p-4 md:p-8">
          <Routes>
            <Route index element={<DashboardOverview />} />
            <Route path="orders" element={<OrdersManagement />} />
            <Route path="influencers" element={<InfluencerManagement />} />
            <Route path="affiliates" element={<AffiliateManagement />} />
            <Route path="*" element={<DashboardOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
