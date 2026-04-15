import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, Flame, UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { BundleDealsSection } from "@/components/BundleDeals";
import { FeaturedSellers } from "@/components/FeaturedSellers";
import axios from "axios";
import { API, useAuth } from "@/App";
import { normalizeImageUrl, handleImageError } from "@/utils/imageUtils";
import { toast } from "sonner";

/* ─── Store Profile Card (Social Media Style) ─── */
const GRADIENT_COLORS = [
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-green-600",
  "from-fuchsia-500 to-pink-600",
];

const StoreProfileCard = ({ seller, index, navigate }) => {
  const { user, token } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(seller.followers || 0);
  const [busy, setBusy] = useState(false);

  const initial = seller.store_name?.charAt(0).toUpperCase() || "S";
  const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length];

  const handleFollow = useCallback(async (e) => {
    e.stopPropagation();
    if (!token) { toast.error("Sign in to follow stores"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      const { data } = await axios.post(`${API}/vendors/store/${seller.vendor_id}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(data.following);
      setFollowers(data.followers);
    } catch { toast.error("Try again"); }
    setBusy(false);
  }, [isFollowing, token, seller.vendor_id, busy]);

  // Check follow status on mount
  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/vendors/store/${seller.vendor_id}/follow-status`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setIsFollowing(data.following);
      setFollowers(data.followers);
    }).catch(() => {});
  }, [token, seller.vendor_id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, type: "spring", damping: 20 }}
      className="shrink-0 w-[170px] md:w-[190px]"
      data-testid={`top-vendor-card-${seller.vendor_id}`}
    >
      <div className="relative bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] group">
        {/* Banner */}
        <div className={`h-14 bg-gradient-to-r ${gradientClass} opacity-80 cursor-pointer`} onClick={() => navigate(`/store/${seller.vendor_id}`)} />

        {/* Avatar */}
        <div className="flex justify-center -mt-7 relative z-10">
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center ring-[3px] ring-neutral-900 shadow-lg cursor-pointer group-hover:scale-105 transition-transform duration-300`}
            onClick={() => navigate(`/store/${seller.vendor_id}`)}
          >
            <span className="font-serif text-xl font-bold text-white select-none drop-shadow">{initial}</span>
          </div>
        </div>

        {/* Info */}
        <div className="px-3 pt-1.5 pb-3.5 text-center">
          <h3
            className="text-[13px] font-semibold text-white truncate cursor-pointer hover:text-gold transition-colors"
            onClick={() => navigate(`/store/${seller.vendor_id}`)}
          >
            {seller.store_name}
          </h3>
          {seller.store_description && (
            <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{seller.store_description}</p>
          )}

          {/* Stats: Products · Followers · Rating */}
          <div className="flex items-center justify-evenly mt-3 pt-2.5 border-t border-neutral-800/80">
            <div className="text-center px-1">
              <p className="text-xs font-bold text-white leading-none">{seller.total_products || 0}</p>
              <p className="text-[8px] text-neutral-500 mt-0.5">Products</p>
            </div>
            <div className="w-px h-5 bg-neutral-800" />
            <div className="text-center px-1">
              <p className="text-xs font-bold text-white leading-none">{followers}</p>
              <p className="text-[8px] text-neutral-500 mt-0.5">Followers</p>
            </div>
            <div className="w-px h-5 bg-neutral-800" />
            <div className="text-center px-1">
              {seller.rating > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-0.5">
                    <Star className="h-2 w-2 fill-gold text-gold" />
                    <p className="text-xs font-bold text-white leading-none">{seller.rating.toFixed(1)}</p>
                  </div>
                  <p className="text-[8px] text-neutral-500 mt-0.5">Rating</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-white leading-none">{seller.review_count || 0}</p>
                  <p className="text-[8px] text-neutral-500 mt-0.5">Reviews</p>
                </>
              )}
            </div>
          </div>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            disabled={busy}
            className={`mt-3 w-full py-[6px] rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${
              isFollowing
                ? "bg-white/5 border border-white/15 text-neutral-400 hover:border-red-500/40 hover:text-red-400"
                : "bg-gold/90 text-black border border-gold hover:bg-gold"
            }`}
            data-testid={`follow-btn-${seller.vendor_id}`}
          >
            {isFollowing ? (
              <><UserCheck className="h-3 w-3" /> Following</>
            ) : (
              <><UserPlus className="h-3 w-3" /> Follow</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Influencer Profile Card (Same style as StoreProfileCard) ─── */
const InfluencerProfileCard = ({ influencer, index, navigate }) => {
  const { token } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(influencer.followers || 0);
  const [busy, setBusy] = useState(false);

  const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  const displayName = influencer.name || influencer.instagram_handle?.replace("@", "") || "Creator";
  const initial = displayName.charAt(0).toUpperCase();
  const handle = influencer.instagram_username || influencer.instagram_handle?.replace("@", "") || "";

  const handleFollow = useCallback(async (e) => {
    e.stopPropagation();
    if (!token) { toast.error("Sign in to follow creators"); return; }
    if (busy) return;
    setBusy(true);
    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      const { data } = await axios.post(`${API}/influencers/${influencer.influencer_id}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(data.following);
      setFollowers(data.followers);
    } catch { toast.error("Try again"); }
    setBusy(false);
  }, [isFollowing, token, influencer.influencer_id, busy]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/influencers/${influencer.influencer_id}/follow-status`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setIsFollowing(data.following);
      setFollowers(data.followers);
    }).catch(() => {});
  }, [token, influencer.influencer_id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, type: "spring", damping: 20 }}
      className="shrink-0 w-[170px] md:w-[190px]"
      data-testid={`influencer-card-${influencer.influencer_id}`}
    >
      <div className="relative bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden hover:border-gold/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] group">
        {/* Banner gradient */}
        <div className={`h-14 bg-gradient-to-r ${gradientClass} opacity-80 cursor-pointer`} onClick={() => navigate(`/reels?influencer=${influencer.influencer_id}`)} />

        {/* Avatar */}
        <div className="flex justify-center -mt-7 relative z-10">
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center ring-[3px] ring-neutral-900 shadow-lg cursor-pointer group-hover:scale-105 transition-transform duration-300`}
            onClick={() => navigate(`/reels?influencer=${influencer.influencer_id}`)}
          >
            <span className="font-serif text-xl font-bold text-white select-none drop-shadow">{initial}</span>
          </div>
        </div>

        {/* Info */}
        <div className="px-3 pt-1.5 pb-3.5 text-center">
          <h3
            className="text-[13px] font-semibold text-white truncate cursor-pointer group-hover:text-gold transition-colors"
            onClick={() => navigate(`/reels?influencer=${influencer.influencer_id}`)}
          >{displayName}</h3>
          {handle && <p className="text-[10px] text-neutral-500 truncate">@{handle}</p>}
          {influencer.niche && (
            <span className="inline-block mt-1 text-[8px] uppercase tracking-widest bg-white/5 border border-white/10 text-neutral-400 px-2 py-0.5 rounded-full">
              {Array.isArray(influencer.niche) ? influencer.niche[0] : influencer.niche}
            </span>
          )}

          {/* Stats: Followers · Posts · Sales */}
          <div className="flex items-center justify-evenly mt-3 pt-2.5 border-t border-neutral-800/80">
            <div className="text-center px-1">
              <p className="text-xs font-bold text-white leading-none">{followers}</p>
              <p className="text-[8px] text-neutral-500 mt-0.5">Followers</p>
            </div>
            <div className="w-px h-5 bg-neutral-800" />
            <div className="text-center px-1">
              <p className="text-xs font-bold text-white leading-none">{influencer.posts || 0}</p>
              <p className="text-[8px] text-neutral-500 mt-0.5">Posts</p>
            </div>
            <div className="w-px h-5 bg-neutral-800" />
            <div className="text-center px-1">
              <p className="text-xs font-bold text-white leading-none">{influencer.total_sales || 0}</p>
              <p className="text-[8px] text-neutral-500 mt-0.5">Sales</p>
            </div>
          </div>

          {/* Follow Button */}
          <button
            onClick={handleFollow}
            disabled={busy}
            className={`mt-3 w-full py-[6px] rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${
              isFollowing
                ? "bg-white/5 border border-white/15 text-neutral-400 hover:border-red-500/40 hover:text-red-400"
                : "bg-gold/90 text-black border border-gold hover:bg-gold"
            }`}
            data-testid={`follow-influencer-${influencer.influencer_id}`}
          >
            {isFollowing ? (
              <><UserCheck className="h-3 w-3" /> Following</>
            ) : (
              <><UserPlus className="h-3 w-3" /> Follow</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const HomePage = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroVideo, setHeroVideo] = useState({
    video_url: "https://assets.mixkit.co/videos/52278/52278-720.mp4",
    poster_url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80"
  });
  const carouselRef = useRef(null);

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    const scrollAmount = 320;
    carouselRef.current.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  const [topInfluencers, setTopInfluencers] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [featuredRes, newRes, sellersRes, bestRes, heroRes, influencerRes] = await Promise.all([
          axios.get(`${API}/products/featured?limit=4`),
          axios.get(`${API}/products/new-arrivals?limit=8`),
          axios.get(`${API}/vendors/top-sellers?limit=6`).catch(() => ({ data: [] })),
          axios.get(`${API}/products/best-sellers?limit=10`).catch(() => ({ data: [] })),
          axios.get(`${API}/admin/site/hero-video`).catch(() => ({ data: null })),
          axios.get(`${API}/influencers/featured?limit=8`).catch(() => ({ data: [] }))
        ]);
        setFeaturedProducts(featuredRes.data);
        setNewArrivals(newRes.data);
        setTopSellers(sellersRes.data);
        setBestSellers(bestRes.data);
        if (heroRes.data?.video_url) setHeroVideo(heroRes.data);
        setTopInfluencers(Array.isArray(influencerRes.data) ? influencerRes.data : []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            poster={heroVideo.poster_url}
            data-testid="hero-video"
          >
            <source src={heroVideo.video_url?.startsWith("/") ? `${process.env.REACT_APP_BACKEND_URL}${heroVideo.video_url}` : heroVideo.video_url} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />
        </div>
        
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <motion.p
            {...fadeInUp}
            className="font-mono text-xs md:text-sm uppercase tracking-[0.3em] text-gold mb-6"
          >
            Limited Edition Drop
          </motion.p>
          <motion.h1
            {...fadeInUp}
            transition={{ delay: 0.1 }}
            className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            Walk With
            <br />
            <span className="text-gold-gradient">Confidence</span>
          </motion.h1>
          <motion.p
            {...fadeInUp}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-neutral-200 mb-10 max-w-2xl mx-auto"
          >
            Premium women&apos;s boots crafted for the bold. Limited drops. Exclusive designs.
          </motion.p>
          <motion.div
            {...fadeInUp}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={() => navigate("/products")}
              className="btn-gold text-base px-10 py-6"
              data-testid="shop-now-btn"
            >
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              onClick={() => navigate("/products?limited=true")}
              variant="outline"
              className="border-white text-white hover:bg-white/10 uppercase tracking-widest px-10 py-6"
              data-testid="limited-drops-btn"
            >
              Limited Drops
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/50 flex justify-center p-2">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-white rounded-full"
            />
          </div>
        </motion.div>
      </section>

      {/* Top Vendors - Zomato Style Circles */}
      {topSellers.length > 0 && (
        <section className="py-10 md:py-14 bg-neutral-950 border-b border-neutral-800" data-testid="top-vendors-hero-section">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 flex items-end justify-between"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/60 mb-1">Curated Sellers</p>
                <h2 className="font-serif text-xl md:text-2xl font-bold text-white">Shop by Store</h2>
              </div>
              <button onClick={() => navigate("/stores")} className="text-xs text-gold/70 hover:text-gold tracking-wider uppercase transition-colors hidden md:block">
                View All
              </button>
            </motion.div>

            <div
              className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              data-testid="top-vendors-scroll"
            >
              {topSellers.map((seller, index) => (
                <StoreProfileCard key={seller.vendor_id} seller={seller} index={index} navigate={navigate} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Top Creators / Influencers ─── */}
      {topInfluencers.length > 0 && (
        <section className="py-10 md:py-14 bg-neutral-950 border-b border-neutral-800" data-testid="top-influencers-section">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 flex items-end justify-between"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-pink-400/60 mb-1">Top Creators</p>
                <h2 className="font-serif text-xl md:text-2xl font-bold text-white">Shop via Influencers</h2>
              </div>
              <button onClick={() => navigate("/influencer/apply")} className="text-xs text-pink-400/70 hover:text-pink-400 tracking-wider uppercase transition-colors hidden md:block">
                Become a Creator
              </button>
            </motion.div>

            <div
              className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              data-testid="top-influencers-scroll"
            >
              {topInfluencers.map((inf, index) => (
                <InfluencerProfileCard key={inf.influencer_id} influencer={inf} index={index} navigate={navigate} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Strip */}
      <section className="bg-black text-white py-6 border-y border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-6 md:gap-0">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-gold" />
              <span className="text-sm">Free Shipping Over Rs.2999</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gold" />
              <span className="text-sm">Authentic Guarantee</span>
            </div>
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-gold" />
              <span className="text-sm">14-Day Returns</span>
            </div>
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-gold" />
              <span className="text-sm">Premium Quality</span>
            </div>
          </div>
        </div>
      </section>

      {/* Limited Edition Section */}
      {featuredProducts.length > 0 && (
        <section className="py-12 md:py-16 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8 md:mb-10"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
                Exclusive Collection
              </p>
              <h2 className="font-serif text-2xl md:text-4xl font-bold">
                Limited Edition Drops
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mt-8"
            >
              <Button
                onClick={() => navigate("/products?limited=true")}
                className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-8 py-5"
                data-testid="view-all-limited-btn"
              >
                View All Limited Drops
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
                  Fresh Styles
                </p>
                <h2 className="font-serif text-2xl md:text-4xl font-bold">
                  New Arrivals
                </h2>
              </div>
              <Button
                onClick={() => navigate("/products")}
                variant="ghost"
                className="mt-3 md:mt-0 text-black hover:text-gold uppercase tracking-widest"
                data-testid="view-all-btn"
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {newArrivals.slice(0, 10).map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Sellers */}
      <FeaturedSellers />

      {/* Best Sellers Carousel */}
      {bestSellers.length > 0 && (
        <section className="py-12 md:py-16" data-testid="best-sellers-section">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-2 flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5" />
                  Most Popular
                </p>
                <h2 className="font-serif text-2xl md:text-4xl font-bold">
                  Best Sellers
                </h2>
              </motion.div>
              <div className="hidden md:flex gap-2">
                <button
                  onClick={() => scrollCarousel("left")}
                  className="w-10 h-10 border border-neutral-300 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                  data-testid="carousel-prev-btn"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="w-10 h-10 border border-neutral-300 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                  data-testid="carousel-next-btn"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              data-testid="best-sellers-carousel"
            >
              {bestSellers.map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="snap-start shrink-0 w-[260px] md:w-[280px]"
                >
                  <Link
                    to={`/product/${product.product_id}`}
                    className="group block"
                    data-testid={`best-seller-${product.product_id}`}
                  >
                    <div className="aspect-[3/4] bg-neutral-100 overflow-hidden mb-3 relative">
                      <img
                        src={normalizeImageUrl(product.images?.[0]) || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImageError}
                      />
                      {product.total_sold > 0 && (
                        <div className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-mono uppercase tracking-wider px-2.5 py-1">
                          {product.total_sold} sold
                        </div>
                      )}
                      {product.compare_price && product.compare_price > product.price && (
                        <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-mono uppercase tracking-wider px-2.5 py-1">
                          -{Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">{product.category}</p>
                    <h3 className="font-medium text-sm mt-1 group-hover:text-gold transition-colors line-clamp-1">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-sm">Rs.{product.price?.toLocaleString()}</span>
                      {product.compare_price && product.compare_price > product.price && (
                        <span className="text-xs text-neutral-400 line-through">Rs.{product.compare_price.toLocaleString()}</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Sellers section moved to hero area above */}

      {/* Bundle Deals */}
      <BundleDealsSection />

      {/* Influencer CTA */}
      <section className="py-20 md:py-32 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-6">
              Join Our Community
            </p>
            <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
              Become a Pigma Influencer
            </h2>
            <p className="text-lg text-neutral-300 mb-10 max-w-2xl mx-auto">
              Partner with us to earn commissions, get early access to limited drops, and be part of our exclusive community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/influencer")}
                className="btn-gold text-base px-10 py-6"
                data-testid="join-influencer-btn"
              >
                Apply as Influencer
              </Button>
              <Button
                onClick={() => navigate("/affiliate")}
                variant="outline"
                className="border-white text-white hover:bg-white/10 uppercase tracking-widest px-10 py-6"
                data-testid="join-affiliate-btn"
              >
                Affiliate Program
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 md:py-24 bg-neutral-100">
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-2xl md:text-3xl font-bold mb-4">
              Get Early Access
            </h2>
            <p className="text-neutral-600 mb-8">
              Subscribe to be the first to know about new drops and exclusive offers.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-neutral-300 focus:border-black focus:ring-1 focus:ring-black outline-none"
                data-testid="newsletter-email"
              />
              <Button
                type="submit"
                className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-8 py-3"
                data-testid="newsletter-submit"
              >
                Subscribe
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
