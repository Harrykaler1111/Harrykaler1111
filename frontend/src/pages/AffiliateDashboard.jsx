import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Link2, TrendingUp, DollarSign, Copy, Globe, 
  Percent, ArrowRight, Check, Clock, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    website: "",
    marketing_channels: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/affiliates/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAffiliate(response.data);
      } catch (error) {
        // Not an affiliate yet
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleApply = async (e) => {
    e.preventDefault();

    setApplying(true);
    try {
      const response = await axios.post(
        `${API}/affiliates/apply`,
        {
          company_name: formData.company_name || null,
          website: formData.website || null,
          marketing_channels: formData.marketing_channels
            .split(",")
            .map(c => c.trim())
            .filter(Boolean)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAffiliate(response.data);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${affiliate?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-900 text-white" data-testid="affiliate-dashboard">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold mb-2">
              Partner Program
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">Affiliate Dashboard</h1>
          </div>
          {affiliate?.status === "approved" && (
            <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
              <Check className="h-4 w-4" />
              <span className="text-sm">Approved Affiliate</span>
            </div>
          )}
          {affiliate?.status === "pending" && (
            <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Application Pending</span>
            </div>
          )}
        </div>

        {affiliate ? (
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-neutral-800 border-neutral-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Overview
              </TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Referral Links
              </TabsTrigger>
              <TabsTrigger value="coupons" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Coupon Codes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{affiliate.total_clicks}</p>
                  <p className="text-sm text-neutral-400 mt-1">Total Clicks</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{affiliate.total_conversions}</p>
                  <p className="text-sm text-neutral-400 mt-1">Conversions</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gold/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-gold" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">Rs.{affiliate.total_earnings.toLocaleString()}</p>
                  <p className="text-sm text-neutral-400 mt-1">Total Earnings</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Percent className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{affiliate.commission_rate}%</p>
                  <p className="text-sm text-neutral-400 mt-1">Commission Rate</p>
                </motion.div>
              </div>

              {/* Profile Card */}
              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6">
                <h2 className="font-serif text-xl font-bold mb-6">Your Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Company Name</p>
                    <p>{affiliate.company_name || "Individual"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Referral Code</p>
                    <p className="font-mono text-gold">{affiliate.referral_code}</p>
                  </div>
                  {affiliate.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-400" />
                      <span>{affiliate.website}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Marketing Channels</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {affiliate.marketing_channels?.map((channel, idx) => (
                        <span key={idx} className="bg-neutral-700 px-2 py-1 text-xs rounded">
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="links">
              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6">
                <h2 className="font-serif text-xl font-bold mb-6">Your Referral Link</h2>
                <div className="flex gap-3">
                  <Input
                    value={`${window.location.origin}?ref=${affiliate.referral_code}`}
                    readOnly
                    className="bg-neutral-900 border-neutral-700 text-white"
                  />
                  <Button onClick={copyReferralLink} className="bg-gold text-black hover:bg-gold-dark">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-neutral-400 mt-4">
                  Share this link on your website or marketing channels. You'll earn {affiliate.commission_rate}% commission on every sale!
                </p>
              </div>
            </TabsContent>

            <TabsContent value="coupons">
              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6">
                <h2 className="font-serif text-xl font-bold mb-6">Your Coupon Codes</h2>
                <div className="flex items-center justify-center py-12 text-center">
                  <div>
                    <Tag className="h-12 w-12 mx-auto text-neutral-600 mb-4" />
                    <p className="text-neutral-400">No coupon codes assigned yet</p>
                    <p className="text-sm text-neutral-500 mt-2">
                      Contact admin to get custom coupon codes for your audience
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Application Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-8">
              <div className="text-center mb-8">
                <Percent className="h-16 w-16 mx-auto text-gold mb-4" />
                <h2 className="font-serif text-2xl font-bold mb-2">Join Our Affiliate Program</h2>
                <p className="text-neutral-400">
                  Earn commissions by promoting Pigma products to your audience
                </p>
              </div>

              <form onSubmit={handleApply} className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Company Name (Optional)</label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Your company or brand name"
                    className="bg-neutral-900 border-neutral-700 text-white"
                    data-testid="affiliate-company"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    Website (Optional)
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="bg-neutral-900 border-neutral-700 text-white"
                    data-testid="affiliate-website"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Marketing Channels</label>
                  <Input
                    value={formData.marketing_channels}
                    onChange={(e) => setFormData({ ...formData, marketing_channels: e.target.value })}
                    placeholder="Blog, Email, Social Media, Ads"
                    className="bg-neutral-900 border-neutral-700 text-white"
                    data-testid="affiliate-channels"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Separate multiple channels with commas</p>
                </div>

                <div className="bg-neutral-900/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Program Benefits</h3>
                  <ul className="space-y-2 text-sm text-neutral-400">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      5% base commission on all sales
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      Custom coupon codes for your audience
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      Real-time tracking and analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      Monthly payouts
                    </li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={applying}
                  className="w-full btn-gold py-6"
                  data-testid="apply-affiliate-btn"
                >
                  {applying ? "Submitting..." : "Join Affiliate Program"}
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
