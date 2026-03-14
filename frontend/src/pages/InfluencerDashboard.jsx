import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, Link2, TrendingUp, DollarSign, Copy, Instagram, 
  Youtube, Facebook, Award, ArrowRight, Check, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const InfluencerDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [influencer, setInfluencer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);

  const [formData, setFormData] = useState({
    bio: "",
    instagram_handle: "",
    youtube_channel: "",
    snapchat_handle: "",
    facebook_page: "",
    followers_count: "",
    niche: ""
  });

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

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${influencer?.referral_code}`;
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
        </div>

        {influencer ? (
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-neutral-800 border-neutral-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Overview
              </TabsTrigger>
              <TabsTrigger value="links" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Referral Links
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Leaderboard
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
                  <p className="text-3xl font-bold">{influencer.total_clicks}</p>
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
                  <p className="text-3xl font-bold">{influencer.total_conversions}</p>
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
                  <p className="text-3xl font-bold">Rs.{influencer.total_earnings.toLocaleString()}</p>
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
                      <Users className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{influencer.followers_count.toLocaleString()}</p>
                  <p className="text-sm text-neutral-400 mt-1">Followers</p>
                </motion.div>
              </div>

              {/* Profile Card */}
              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6">
                <h2 className="font-serif text-xl font-bold mb-6">Your Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Bio</p>
                    <p>{influencer.bio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">Referral Code</p>
                    <p className="font-mono text-gold">{influencer.referral_code}</p>
                  </div>
                  {influencer.instagram_handle && (
                    <div className="flex items-center gap-2">
                      <Instagram className="h-5 w-5 text-pink-400" />
                      <span>@{influencer.instagram_handle}</span>
                    </div>
                  )}
                  {influencer.youtube_channel && (
                    <div className="flex items-center gap-2">
                      <Youtube className="h-5 w-5 text-red-400" />
                      <span>{influencer.youtube_channel}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="links">
              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6">
                <h2 className="font-serif text-xl font-bold mb-6">Your Referral Link</h2>
                <div className="flex gap-3">
                  <Input
                    value={`${window.location.origin}?ref=${influencer.referral_code}`}
                    readOnly
                    className="bg-neutral-900 border-neutral-700 text-white"
                  />
                  <Button onClick={copyReferralLink} className="bg-gold text-black hover:bg-gold-dark">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-neutral-400 mt-4">
                  Share this link with your followers. You'll earn commission on every sale made through your link!
                </p>
              </div>
            </TabsContent>

            <TabsContent value="leaderboard">
              <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700 p-6">
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
                        <p className="font-bold text-gold">Rs.{inf.total_earnings.toLocaleString()}</p>
                        <p className="text-xs text-neutral-400">earned</p>
                      </div>
                    </div>
                  ))}
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
                      data-testid="influencer-youtube"
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
                      data-testid="influencer-followers"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Niche/Topics</label>
                    <Input
                      value={formData.niche}
                      onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                      placeholder="Fashion, Lifestyle, Beauty"
                      className="bg-neutral-900 border-neutral-700 text-white"
                      data-testid="influencer-niche"
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
