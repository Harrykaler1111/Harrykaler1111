import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import axios from "axios";
import { API } from "@/App";

export const HomePage = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    const scrollAmount = 320;
    carouselRef.current.scrollBy({ left: dir === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [featuredRes, newRes, sellersRes, bestRes] = await Promise.all([
          axios.get(`${API}/products/featured?limit=4`),
          axios.get(`${API}/products/new-arrivals?limit=8`),
          axios.get(`${API}/vendors/top-sellers?limit=6`).catch(() => ({ data: [] })),
          axios.get(`${API}/products/best-sellers?limit=10`).catch(() => ({ data: [] }))
        ]);
        setFeaturedProducts(featuredRes.data);
        setNewArrivals(newRes.data);
        setTopSellers(sellersRes.data);
        setBestSellers(bestRes.data);
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
          <img
            src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
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
        <section className="py-20 md:py-32 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 md:mb-16"
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-4">
                Exclusive Collection
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-bold">
                Limited Edition Drops
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
              className="text-center mt-12"
            >
              <Button
                onClick={() => navigate("/products?limited=true")}
                className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-10 py-6"
                data-testid="view-all-limited-btn"
              >
                View All Limited Drops
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* Category Bento Grid */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Platform Boots */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative aspect-[4/5] overflow-hidden bg-neutral-900"
            >
              <img
                src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80"
                alt="Platform Boots"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <p className="font-mono text-xs uppercase tracking-widest text-gold mb-2">Collection</p>
                <h3 className="font-serif text-3xl md:text-4xl text-white font-bold mb-4">
                  Platform Boots
                </h3>
                <Button
                  onClick={() => navigate("/products/Platform Boots")}
                  className="bg-white text-black hover:bg-neutral-100 uppercase tracking-widest"
                  data-testid="shop-platform-btn"
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Stiletto Heels */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="group relative aspect-[4/5] overflow-hidden bg-neutral-900"
            >
              <img
                src="https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800&q=80"
                alt="Stiletto Heels"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <p className="font-mono text-xs uppercase tracking-widest text-gold mb-2">Collection</p>
                <h3 className="font-serif text-3xl md:text-4xl text-white font-bold mb-4">
                  Stiletto Heels
                </h3>
                <Button
                  onClick={() => navigate("/products/Stiletto Heels")}
                  className="bg-white text-black hover:bg-neutral-100 uppercase tracking-widest"
                  data-testid="shop-stiletto-btn"
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-20 md:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-4">
                  Fresh Styles
                </p>
                <h2 className="font-serif text-3xl md:text-5xl font-bold">
                  New Arrivals
                </h2>
              </div>
              <Button
                onClick={() => navigate("/products")}
                variant="ghost"
                className="mt-4 md:mt-0 text-black hover:text-gold uppercase tracking-widest"
                data-testid="view-all-btn"
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {newArrivals.slice(0, 8).map((product, index) => (
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

      {/* Best Sellers Carousel */}
      {bestSellers.length > 0 && (
        <section className="py-20 md:py-32" data-testid="best-sellers-section">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-12 md:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-4 flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5" />
                  Most Popular
                </p>
                <h2 className="font-serif text-3xl md:text-5xl font-bold">
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
                        src={product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                      <span className="font-bold text-sm">${product.price?.toFixed(2)}</span>
                      {product.compare_price && product.compare_price > product.price && (
                        <span className="text-xs text-neutral-400 line-through">${product.compare_price.toFixed(2)}</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Sellers */}
      {topSellers.length > 0 && (
        <section className="py-20 md:py-32 bg-neutral-50" data-testid="top-sellers-section">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12 md:mb-16"
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold mb-4">
                Trusted By Thousands
              </p>
              <h2 className="font-serif text-3xl md:text-5xl font-bold">
                Top Sellers
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {topSellers.map((seller, index) => (
                <motion.div
                  key={seller.vendor_id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/store/${seller.vendor_id}`}
                    className="group block bg-white border border-neutral-200 p-6 hover:border-gold hover:shadow-lg transition-all duration-300"
                    data-testid={`top-seller-${seller.vendor_id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-black text-gold flex items-center justify-center font-serif text-xl font-bold">
                        {seller.store_name.charAt(0).toUpperCase()}
                      </div>
                      {seller.rating > 0 && (
                        <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1 rounded-full">
                          <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                          <span className="text-sm font-medium">{seller.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-serif text-lg font-bold mb-1 group-hover:text-gold transition-colors">
                      {seller.store_name}
                    </h3>
                    <p className="text-sm text-neutral-500 line-clamp-2 mb-4">
                      {seller.store_description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-neutral-400 pt-4 border-t border-neutral-100">
                      <span>{seller.total_products} product{seller.total_products !== 1 ? "s" : ""}</span>
                      {seller.review_count > 0 && (
                        <span>{seller.review_count} review{seller.review_count !== 1 ? "s" : ""}</span>
                      )}
                      <span className="text-gold font-medium group-hover:underline">Visit Store</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

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
