import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Link2, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export const ResellerRegisterPage = () => {
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [platforms, setPlatforms] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("pigma_token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { toast.error("Please login first"); navigate("/auth"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/resellers/register`, {
        bio,
        social_platforms: platforms.split(",").map(s => s.trim()).filter(Boolean)
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Reseller application submitted! Awaiting approval.");
      navigate("/reseller/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center px-4 relative" data-testid="reseller-register-page">
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors z-10"
        data-testid="reseller-back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs">Back to Home</span>
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-gold tracking-wider mb-2">Become a Reseller</h1>
          <p className="text-neutral-400">Earn commission by sharing Pigma products with your audience</p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: <DollarSign className="h-5 w-5 text-gold" />, text: "Earn 5% commission" },
            { icon: <Link2 className="h-5 w-5 text-blue-400" />, text: "Unique referral links" },
            { icon: <TrendingUp className="h-5 w-5 text-green-400" />, text: "Track your sales" },
            { icon: <Users className="h-5 w-5 text-purple-400" />, text: "Real-time dashboard" },
          ].map((b, i) => (
            <div key={i} className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-3 flex items-center gap-2">
              {b.icon}
              <span className="text-sm text-neutral-300">{b.text}</span>
            </div>
          ))}
        </div>

        {!token ? (
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-8 text-center">
            <p className="text-neutral-400 mb-4">You need to be logged in as a customer to register as a reseller.</p>
            <Button className="bg-gold text-black hover:bg-gold-dark" onClick={() => navigate("/auth")} data-testid="login-to-register-btn">
              Login / Sign Up
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-5">
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Short Bio</label>
              <Input value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself and your audience..."
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="reseller-bio-input" />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1 block">Social Platforms (comma-separated)</label>
              <Input value={platforms} onChange={(e) => setPlatforms(e.target.value)}
                placeholder="Instagram, YouTube, WhatsApp..."
                className="bg-neutral-900 border-neutral-700 text-white" data-testid="reseller-platforms-input" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gold text-black hover:bg-gold-dark font-semibold" data-testid="reseller-register-submit">
              {submitting ? "Submitting..." : "Apply as Reseller"}
            </Button>
          </form>
        )}

        <div className="text-center mt-6">
          <button onClick={() => navigate("/")} className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
            Back to Store
          </button>
        </div>
      </motion.div>
    </div>
  );
};
