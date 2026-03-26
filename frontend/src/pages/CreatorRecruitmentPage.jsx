import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, DollarSign, Users, Zap, Star,
  ArrowRight, CheckCircle, Instagram, ChevronRight
} from "lucide-react";

const BENEFITS = [
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Earn Commissions",
    desc: "Get up to 20% commission on every sale through your referral code"
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Growth Dashboard",
    desc: "Track your earnings, clicks, and conversions in real-time"
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Brand Collaborations",
    desc: "Connect with top vendors and receive fixed payments for promotions"
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Reward Campaigns",
    desc: "Hit sales targets and earn exclusive rewards like trips and dinners"
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: "Featured Creator",
    desc: "Top performers get featured on the platform, boosting your visibility"
  },
  {
    icon: <Instagram className="h-6 w-6" />,
    title: "Instagram Integration",
    desc: "Seamlessly connect your Instagram for auto-tracking and analytics"
  }
];

const STEPS = [
  { num: "01", title: "Sign Up", desc: "Create your free creator account in under 2 minutes" },
  { num: "02", title: "Get Approved", desc: "Our team reviews your profile and approves within 24 hours" },
  { num: "03", title: "Start Earning", desc: "Share products, collaborate with brands, earn commissions" },
];

const TESTIMONIALS = [
  {
    name: "Priya S.",
    role: "Fashion Influencer",
    text: "Pigma made it so easy to monetize my audience. I earned Rs. 45,000 in my first month!",
    followers: "120K followers"
  },
  {
    name: "Rahul M.",
    role: "Tech Reviewer",
    text: "The dashboard is incredible. I can see exactly which products convert and optimize my content.",
    followers: "85K followers"
  },
  {
    name: "Ananya K.",
    role: "Lifestyle Creator",
    text: "The vendor collaborations are a game changer. Fixed payments + commissions = consistent income.",
    followers: "200K followers"
  }
];

export const CreatorRecruitmentPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white" data-testid="creator-recruitment-page">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/20 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 md:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-center">
            <span className="inline-block text-xs uppercase tracking-[0.3em] text-amber-400 font-medium mb-4 px-4 py-1.5 border border-amber-400/30 rounded-full">
              Creator Program
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Turn Your Influence<br />Into <span className="text-amber-400">Income</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
              Join thousands of creators earning commissions, landing brand deals, and growing their business on Pigma.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300 text-base px-8"
                onClick={() => navigate("/auth?type=influencer")} data-testid="join-as-influencer-btn">
                Join as Influencer <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-neutral-600 text-white hover:bg-neutral-800 text-base px-8"
                onClick={() => navigate("/auth?type=affiliate")} data-testid="join-as-affiliate-btn">
                Join as Affiliate
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-neutral-950" data-testid="benefits-section">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">Why Creators Love Pigma</h2>
            <p className="text-neutral-400 text-base">Everything you need to monetize your audience</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="border border-neutral-800 rounded-2xl p-6 hover:border-amber-400/30 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center mb-4 group-hover:bg-amber-400/20 transition-colors">
                  {b.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-neutral-400">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20" data-testid="how-it-works-section">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-14">How It Works</h2>
          <div className="space-y-8">
            {STEPS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-serif text-2xl font-bold">
                  {s.num}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">{s.title}</h3>
                  <p className="text-neutral-400">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-neutral-950" data-testid="testimonials-section">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-center mb-14">Creator Stories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-neutral-300 text-sm mb-4 italic">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-neutral-500">{t.role} - {t.followers}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" data-testid="cta-section">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-neutral-400 mb-8 text-lg">Join Pigma's creator community today. No minimum followers required.</p>
          <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300 text-base px-10"
            onClick={() => navigate("/auth?type=influencer")} data-testid="cta-join-btn">
            Apply Now <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </section>
    </div>
  );
};
