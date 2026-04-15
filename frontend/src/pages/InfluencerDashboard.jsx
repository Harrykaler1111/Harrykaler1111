import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Link2, TrendingUp, DollarSign, Copy, Instagram, 
  Youtube, Facebook, Award, ArrowRight, Check, Clock, Wallet,
  CreditCard, ExternalLink, Plus, Settings, Power, AlertCircle,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";
import { InstagramHealthDashboard } from "@/components/InstagramHealthDashboard";

const CollabsSection = ({ token }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/collaborations/influencer/received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch { /* no requests */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const respond = async (requestId, action) => {
    try {
      const res = await axios.put(`${API}/collaborations/${requestId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (action === "accept" && res.data.vendor_contact) {
        toast.success("Collaboration accepted! Contact details shared below.");
      } else {
        toast.success(`Collaboration ${action}ed!`);
      }
      fetchRequests();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const statusStyle = {
    pending: "bg-yellow-500/10 border-yellow-500/30",
    accepted: "bg-green-500/10 border-green-500/30",
    rejected: "bg-red-500/10 border-red-500/30"
  };
  const statusText = { pending: "text-yellow-400", accepted: "text-green-400", rejected: "text-red-400" };

  if (loading) return <div className="text-center py-8 text-neutral-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white mb-4">Collaboration Requests</h3>
      {requests.length === 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8 text-center">
          <Users className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-400">No collaboration requests yet.</p>
          <p className="text-sm text-neutral-500 mt-1">Vendors will find you based on your profile and send collaboration offers.</p>
        </div>
      )}
      {requests.map((req) => (
        <div key={req.request_id} className={`border rounded-xl p-5 ${statusStyle[req.status] || "border-neutral-700 bg-neutral-800/50"}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-white font-semibold text-lg">{req.vendor_name || "Vendor"}</h4>
              <p className="text-sm text-neutral-400">{req.campaign_name || "General Collaboration"}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full capitalize font-medium ${statusText[req.status]}`}>
              {req.status}
            </span>
          </div>
          <p className="text-neutral-300 mb-4 bg-neutral-900/50 rounded-lg p-3 text-sm italic">"{req.message}"</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400 mb-4">
            {req.commission_rate && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-gold" />
                <span className="text-gold font-medium">{req.commission_rate}% commission</span>
              </span>
            )}
            {req.fixed_payment && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">Fixed: ₹{req.fixed_payment.toLocaleString()}</span>
              </span>
            )}
            <span>Received: {new Date(req.created_at).toLocaleDateString()}</span>
          </div>
          {req.status === "pending" && (
            <div className="flex gap-3">
              <button onClick={() => respond(req.request_id, "accept")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition-colors text-sm"
                data-testid={`accept-${req.request_id}`}>
                Accept Collaboration
              </button>
              <button onClick={() => respond(req.request_id, "reject")}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2.5 rounded-lg font-medium transition-colors text-sm"
                data-testid={`reject-${req.request_id}`}>
                Decline
              </button>
            </div>
          )}
          {req.status === "accepted" && req.vendor_contact && (
            <div className="bg-neutral-900/80 border border-green-500/20 rounded-lg p-4 mt-3 space-y-2">
              <p className="text-green-400 font-medium text-sm flex items-center gap-2">
                <Check className="h-4 w-4" /> Vendor Contact Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div><span className="text-neutral-500">Store:</span> <span className="text-white">{req.vendor_contact.name}</span></div>
                <div><span className="text-neutral-500">Email:</span> <span className="text-white">{req.vendor_contact.email}</span></div>
                <div><span className="text-neutral-500">Phone:</span> <span className="text-white">{req.vendor_contact.phone || "N/A"}</span></div>
              </div>
              {req.referral_code && (
                <div className="mt-3 p-3 bg-gold/10 border border-gold/30 rounded-lg">
                  <p className="text-gold text-xs font-mono uppercase tracking-wider mb-1">Your Referral Code</p>
                  <p className="text-white font-bold text-lg tracking-widest" data-testid={`referral-code-${req.request_id}`}>{req.referral_code}</p>
                  <p className="text-neutral-400 text-xs mt-1">Share this code to track sales from your promotion</p>
                </div>
              )}
              {req.platform_collab_fee && (
                <p className="text-xs text-neutral-400 mt-1">Platform fee: {req.platform_collab_fee}% on collab sales</p>
              )}
            </div>
          )}
          {req.status === "accepted" && req.responded_at && !req.vendor_contact && (
            <p className="text-xs text-green-400 mt-2">Accepted on {new Date(req.responded_at).toLocaleDateString()}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export const InfluencerDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [referralLinks, setReferralLinks] = useState([]);
  const [igPosts, setIgPosts] = useState([]);

  const [formData, setFormData] = useState({
    bio: "",
    instagram_handle: "",
    youtube_channel: "",
    snapchat_handle: "",
    facebook_page: "",
    followers_count: "",
    niche: ""
  });

  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: ""
  });

  const [newPostForm, setNewPostForm] = useState({
    post_url: "",
    post_id: "",
    product_id: "",
    auto_dm_enabled: true,
    dm_message: ""
  });

  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, leaderboardRes] = await Promise.all([
          axios.get(`${API}/influencers/me`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null),
          axios.get(`${API}/influencers/leaderboard?limit=10`)
        ]);
        
        if (profileRes?.data) {
          setInfluencer(profileRes.data);
          
          // Fetch additional data if influencer exists
          const [txnRes, wdRes, linksRes, postsRes, productsRes] = await Promise.all([
            axios.get(`${API}/influencers/wallet/transactions`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] })),
            axios.get(`${API}/influencers/withdrawals`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] })),
            axios.get(`${API}/influencers/referral-links`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] })),
            axios.get(`${API}/influencers/instagram/posts`, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => ({ data: [] })),
            axios.get(`${API}/products?limit=50`)
          ]);
          
          setTransactions(txnRes.data);
          setWithdrawals(wdRes.data);
          setReferralLinks(linksRes.data);
          setIgPosts(postsRes.data);
          setProducts(productsRes.data);
        }
        setLeaderboard(leaderboardRes.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!formData.bio || !formData.instagram_handle) {
      toast.error("Please fill in bio and Instagram handle");
      return;
    }

    setApplying(true);
    try {
      const response = await axios.post(
        `${API}/influencers/apply`,
        {
          bio: formData.bio,
          instagram_handle: formData.instagram_handle,
          youtube_channel: formData.youtube_channel || null,
          snapchat_handle: formData.snapchat_handle || null,
          facebook_page: formData.facebook_page || null,
          followers_count: parseInt(formData.followers_count) || 0,
          niche: formData.niche.split(",").map(n => n.trim()).filter(Boolean)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInfluencer(response.data);
      toast.success("Application submitted! We'll review it shortly.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (parseFloat(withdrawForm.amount) < 1000) {
      toast.error("Minimum withdrawal amount is ₹1000");
      return;
    }
    if (parseFloat(withdrawForm.amount) > (influencer?.wallet_balance || 0)) {
      toast.error("Insufficient wallet balance");
      return;
    }

    try {
      const response = await axios.post(
        `${API}/influencers/wallet/withdraw`,
        withdrawForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Withdrawal request submitted!");
      setWithdrawals([response.data, ...withdrawals]);
      setInfluencer({ ...influencer, wallet_balance: influencer.wallet_balance - parseFloat(withdrawForm.amount) });
      setWithdrawForm({
        amount: "",
        bank_account_name: "",
        bank_account_number: "",
        bank_ifsc: "",
        bank_name: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit withdrawal");
    }
  };

  const connectInstagram = async () => {
    try {
      const response = await axios.get(`${API}/influencers/instagram/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Redirect to real Instagram OAuth
      window.location.href = response.data.oauth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to connect Instagram");
    }
  };

  // Check for successful OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast.success("Instagram connected successfully!");
      // Clean URL
      window.history.replaceState({}, "", "/influencer?tab=instagram");
      // Refresh data
      if (token) {
        axios.get(`${API}/influencers/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => setInfluencer(res.data))
          .catch(() => {});
      }
    }
  }, [token]);

  const toggleAutomation = async () => {
    try {
      const newStatus = !influencer.automation_enabled;
      await axios.post(
        `${API}/influencers/instagram/toggle-automation?enabled=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInfluencer({ ...influencer, automation_enabled: newStatus });
      toast.success(`Automation ${newStatus ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to toggle automation");
    }
  };

  const registerPost = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${API}/influencers/instagram/posts`,
        newPostForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Post registered for automation!");
      setIgPosts([response.data, ...igPosts]);
      setNewPostForm({
        post_url: "",
        post_id: "",
        product_id: "",
        auto_dm_enabled: true,
        dm_message: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to register post");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-900 text-white" data-testid="influencer-dashboard">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold mb-2">
              Partner Program
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">Influencer Dashboard</h1>
          </div>
          {influencer?.status === "approved" && (
            <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
              <Check className="h-4 w-4" />
              <span className="text-sm">Approved Influencer</span>
            </div>
          )}
          {influencer?.status === "pending" && (
            <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Application Pending</span>
            </div>
          )}
          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
            onClick={() => { logout(); navigate("/"); }}
            data-testid="influencer-logout-btn">
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>

        {/* Status warning for suspended/disconnected accounts */}
        {influencer && ["suspended", "disconnected", "discontinued"].includes(influencer.status) && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-300">Account {influencer.status.charAt(0).toUpperCase() + influencer.status.slice(1)}</p>
              <p className="text-sm text-neutral-400">Your influencer account has been {influencer.status} by admin. Features are restricted. Contact support for assistance.</p>
            </div>
          </div>
        )}
        {influencer?.status === "rejected" && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-orange-300">Application Rejected</p>
              <p className="text-sm text-neutral-400">Your influencer application was not approved. You may reapply or contact support for details.</p>
            </div>
          </div>
        )}

        {influencer ? (
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-neutral-800 border-neutral-700 flex-wrap">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Overview
              </TabsTrigger>
              <TabsTrigger value="wallet" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Wallet
              </TabsTrigger>
              <TabsTrigger value="instagram" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Instagram
              </TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Referral Links
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="collabs" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Collaborations
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={<Link2 className="h-5 w-5 text-emerald-400" />}
                  label="Total Clicks"
                  value={influencer.total_clicks}
                  bg="bg-emerald-500/20"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5 text-blue-400" />}
                  label="Conversions"
                  value={influencer.total_conversions}
                  bg="bg-blue-500/20"
                />
                <StatCard
                  icon={<DollarSign className="h-5 w-5 text-gold" />}
                  label="Total Earnings"
                  value={`₹${influencer.total_earnings.toLocaleString()}`}
                  bg="bg-gold/20"
                />
                <StatCard
                  icon={<Wallet className="h-5 w-5 text-purple-400" />}
                  label="Wallet Balance"
                  value={`₹${(influencer.wallet_balance || 0).toLocaleString()}`}
                  bg="bg-purple-500/20"
                />
              </div>

              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6 rounded-xl">
                <h2 className="font-serif text-xl font-bold mb-6">Your Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Bio</p>
                    <p>{influencer.bio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Referral Code</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gold">{influencer.referral_code}</span>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(influencer.referral_code)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Commission Rate</p>
                    <p className="text-2xl font-bold text-gold">{influencer.commission_rate || 10}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Instagram Status</p>
                    {influencer.instagram_connected ? (
                      <p className="flex items-center gap-2 text-green-400">
                        <Instagram className="h-5 w-5" /> Connected (@{influencer.instagram_username})
                      </p>
                    ) : (
                      <p className="text-neutral-500">Not connected</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 p-6 rounded-xl">
                  <Wallet className="h-8 w-8 text-gold mb-4" />
                  <p className="text-sm text-neutral-400">Available Balance</p>
                  <p className="text-3xl font-bold text-gold">₹{(influencer.wallet_balance || 0).toLocaleString()}</p>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl">
                  <DollarSign className="h-8 w-8 text-emerald-400 mb-4" />
                  <p className="text-sm text-neutral-400">Total Earnings</p>
                  <p className="text-3xl font-bold text-emerald-400">₹{influencer.total_earnings.toLocaleString()}</p>
                </div>
                <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl">
                  <CreditCard className="h-8 w-8 text-blue-400 mb-4" />
                  <p className="text-sm text-neutral-400">Min Withdrawal</p>
                  <p className="text-3xl font-bold text-blue-400">₹1,000</p>
                </div>
              </div>

              {/* Withdrawal Form */}
              {influencer.status === "approved" && (
                <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl mb-8">
                  <h3 className="font-serif text-xl font-bold mb-4">Request Withdrawal</h3>
                  {influencer.wallet_balance >= 1000 ? (
                    <form onSubmit={handleWithdraw} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Amount (₹)</label>
                        <Input
                          type="number"
                          value={withdrawForm.amount}
                          onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                          placeholder="Minimum ₹1000"
                          className="bg-neutral-900 border-neutral-700"
                          min="1000"
                          max={influencer.wallet_balance}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Account Holder Name</label>
                        <Input
                          value={withdrawForm.bank_account_name}
                          onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account_name: e.target.value })}
                          placeholder="As per bank records"
                          className="bg-neutral-900 border-neutral-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Bank Account Number</label>
                        <Input
                          value={withdrawForm.bank_account_number}
                          onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_account_number: e.target.value })}
                          placeholder="Account number"
                          className="bg-neutral-900 border-neutral-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">IFSC Code</label>
                        <Input
                          value={withdrawForm.bank_ifsc}
                          onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_ifsc: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFC0001234"
                          className="bg-neutral-900 border-neutral-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Bank Name</label>
                        <Input
                          value={withdrawForm.bank_name}
                          onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                          placeholder="e.g. HDFC Bank"
                          className="bg-neutral-900 border-neutral-700"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" className="w-full bg-gold text-black hover:bg-gold-dark">
                          Request Withdrawal
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3 text-yellow-400 bg-yellow-500/10 p-4 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <p>You need at least ₹1,000 in your wallet to request a withdrawal.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions */}
              <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl mb-8">
                <h3 className="font-serif text-xl font-bold mb-4">Transaction History</h3>
                <div className="space-y-3">
                  {transactions.length > 0 ? transactions.map((txn) => (
                    <div key={txn.transaction_id} className="flex items-center justify-between py-3 border-b border-neutral-700 last:border-0">
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        <p className="text-xs text-neutral-400">{new Date(txn.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${txn.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {txn.amount >= 0 ? "+" : ""}₹{Math.abs(txn.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-neutral-500">Balance: ₹{txn.balance_after.toLocaleString()}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-neutral-500 py-8">No transactions yet</p>
                  )}
                </div>
              </div>

              {/* Withdrawal History */}
              <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl">
                <h3 className="font-serif text-xl font-bold mb-4">Withdrawal History</h3>
                <div className="space-y-3">
                  {withdrawals.length > 0 ? withdrawals.map((wd) => (
                    <div key={wd.withdrawal_id} className="flex items-center justify-between py-3 border-b border-neutral-700 last:border-0">
                      <div>
                        <p className="font-medium">₹{wd.amount.toLocaleString()}</p>
                        <p className="text-xs text-neutral-400">{new Date(wd.requested_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        wd.status === "completed" ? "bg-green-500/20 text-green-400" :
                        wd.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                        wd.status === "rejected" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {wd.status}
                      </span>
                    </div>
                  )) : (
                    <p className="text-center text-neutral-500 py-8">No withdrawal requests yet</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Instagram Tab */}
            <TabsContent value="instagram">
              {/* Connection Status */}
              <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 p-6 rounded-xl mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Instagram Connection</h3>
                      {influencer.instagram_connected ? (
                        <p className="text-sm text-green-400">Connected as @{influencer.instagram_username}</p>
                      ) : (
                        <p className="text-sm text-neutral-400">Connect your Instagram to enable automation</p>
                      )}
                    </div>
                  </div>
                  {!influencer.instagram_connected ? (
                    <Button onClick={connectInstagram} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                      <Instagram className="h-4 w-4 mr-2" />
                      Connect Instagram
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Auto DM</span>
                        <Switch
                          checked={influencer.automation_enabled}
                          onCheckedChange={toggleAutomation}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {influencer.instagram_connected && (
                <>
                  {/* Health Dashboard */}
                  <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6 rounded-xl mb-8">
                    <InstagramHealthDashboard />
                  </div>

                  {/* Register New Post */}
                  <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl mb-8">
                    <h3 className="font-serif text-xl font-bold mb-4">Register Post for Automation</h3>
                    <p className="text-neutral-400 mb-4">
                      Register your Instagram posts promoting Pigma products. When someone comments, they'll automatically receive a DM with your referral link.
                    </p>
                    <form onSubmit={registerPost} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Post URL</label>
                        <Input
                          value={newPostForm.post_url}
                          onChange={(e) => setNewPostForm({ ...newPostForm, post_url: e.target.value })}
                          placeholder="https://instagram.com/p/..."
                          className="bg-neutral-900 border-neutral-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Post ID</label>
                        <Input
                          value={newPostForm.post_id}
                          onChange={(e) => setNewPostForm({ ...newPostForm, post_id: e.target.value })}
                          placeholder="Media ID from Instagram"
                          className="bg-neutral-900 border-neutral-700"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Product</label>
                        <select
                          value={newPostForm.product_id}
                          onChange={(e) => setNewPostForm({ ...newPostForm, product_id: e.target.value })}
                          className="w-full h-10 bg-neutral-900 border border-neutral-700 rounded-md px-3 text-white"
                          required
                        >
                          <option value="">Select product</option>
                          {products.map(p => (
                            <option key={p.product_id} value={p.product_id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-neutral-400 mb-1 block">Custom DM Message (optional)</label>
                        <Input
                          value={newPostForm.dm_message}
                          onChange={(e) => setNewPostForm({ ...newPostForm, dm_message: e.target.value })}
                          placeholder="Thanks for your interest! Here's the link..."
                          className="bg-neutral-900 border-neutral-700"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Button type="submit" className="bg-gold text-black hover:bg-gold-dark">
                          <Plus className="h-4 w-4 mr-2" />
                          Register Post
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Registered Posts */}
                  <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl">
                    <h3 className="font-serif text-xl font-bold mb-4">Registered Posts</h3>
                    <div className="space-y-4">
                      {igPosts.length > 0 ? igPosts.map((post) => (
                        <div key={post.post_record_id} className="bg-neutral-900/50 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-medium">{post.product_name}</p>
                            <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 flex items-center gap-1">
                              View Post <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{post.total_comments} comments</p>
                            <p className="text-xs text-green-400">{post.total_dms_sent} DMs sent</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-neutral-500 py-8">No posts registered yet</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Referral Links Tab */}
            <TabsContent value="links">
              <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl">
                <h2 className="font-serif text-xl font-bold mb-6">Your Referral Links</h2>
                <div className="space-y-3">
                  {referralLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-neutral-700 last:border-0">
                      <div>
                        <p className="font-medium">{link.product_name}</p>
                        <p className="text-xs text-neutral-400 truncate max-w-md">{link.link}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(link.link)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard">
              <div className="bg-neutral-800/50 border border-neutral-700 p-6 rounded-xl">
                <h2 className="font-serif text-xl font-bold mb-6">Top Performers</h2>
                <div className="space-y-4">
                  {leaderboard.map((inf, index) => (
                    <div
                      key={inf.influencer_id}
                      className={`flex items-center gap-4 p-4 rounded-lg ${
                        inf.influencer_id === influencer.influencer_id
                          ? "bg-gold/20 border border-gold/30"
                          : "bg-neutral-900/50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? "bg-gold text-black" :
                        index === 1 ? "bg-neutral-400 text-black" :
                        index === 2 ? "bg-amber-700 text-white" :
                        "bg-neutral-700 text-white"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{inf.name}</p>
                        <p className="text-sm text-neutral-400">
                          {inf.total_conversions} conversions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gold">₹{inf.total_earnings.toLocaleString()}</p>
                        <p className="text-xs text-neutral-400">earned</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Collaborations Tab */}
            <TabsContent value="collabs">
              <CollabsSection token={token} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Application Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-8 rounded-xl">
              <div className="text-center mb-8">
                <Award className="h-16 w-16 mx-auto text-gold mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Become a Pigma Influencer</h2>
                <p className="text-neutral-400">
                  Join our exclusive program and earn commissions by promoting luxury boots
                </p>
              </div>

              <form onSubmit={handleApply} className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Bio *</label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself and your content..."
                    className="bg-neutral-900 border-neutral-700 text-white min-h-24"
                    data-testid="influencer-bio"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-400" />
                      Instagram Handle *
                    </label>
                    <Input
                      value={formData.instagram_handle}
                      onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                      placeholder="@yourhandle"
                      className="bg-neutral-900 border-neutral-700 text-white"
                      data-testid="influencer-instagram"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-400" />
                      YouTube Channel
                    </label>
                    <Input
                      value={formData.youtube_channel}
                      onChange={(e) => setFormData({ ...formData, youtube_channel: e.target.value })}
                      placeholder="Channel name"
                      className="bg-neutral-900 border-neutral-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Total Followers</label>
                    <Input
                      type="number"
                      value={formData.followers_count}
                      onChange={(e) => setFormData({ ...formData, followers_count: e.target.value })}
                      placeholder="e.g. 10000"
                      className="bg-neutral-900 border-neutral-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Niche/Topics</label>
                    <Input
                      value={formData.niche}
                      onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                      placeholder="Fashion, Lifestyle, Beauty"
                      className="bg-neutral-900 border-neutral-700 text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={applying}
                  className="w-full btn-gold py-6"
                  data-testid="apply-influencer-btn"
                >
                  {applying ? "Submitting..." : "Submit Application"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, bg }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6 rounded-xl"
  >
    <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-4`}>
      {icon}
    </div>
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-sm text-neutral-400 mt-1">{label}</p>
  </motion.div>
);
