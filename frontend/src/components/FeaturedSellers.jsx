import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Store, Crown } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import axios from "axios";
import { API } from "@/App";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

export const FeaturedSellers = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${API}/vendor-credits/featured-sellers-with-products?products_per_vendor=4`)
      .then((r) => setSellers(r.data?.sellers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (loading || sellers.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-neutral-950 text-white" data-testid="featured-sellers-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-2 flex items-center gap-2">
              <Crown className="h-3.5 w-3.5" />
              Curated Stores
            </p>
            <h2 className="font-serif text-2xl md:text-4xl font-bold">Featured Sellers</h2>
          </motion.div>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-10 h-10 border border-neutral-700 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
              data-testid="featured-sellers-prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-10 h-10 border border-neutral-700 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
              data-testid="featured-sellers-next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sellers horizontal scroll */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          data-testid="featured-sellers-scroll"
        >
          {sellers.map((seller, idx) => (
            <motion.div
              key={seller.vendor_id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="snap-start shrink-0 w-[75vw] sm:w-[300px] md:w-[340px]"
            >
              <SellerCard seller={seller} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SellerCard = ({ seller }) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group hover:border-gold/30 transition-colors duration-300"
      data-testid={`featured-seller-card-${seller.vendor_id}`}
    >
      {/* Seller header */}
      <div className="p-4 flex items-center gap-3 border-b border-neutral-800">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center flex-shrink-0">
          {seller.vendor_logo ? (
            <img
              src={normalizeImageUrl(seller.vendor_logo)}
              alt={seller.vendor_name}
              className="w-full h-full rounded-full object-cover"
              onError={handleImageError}
            />
          ) : (
            <span className="font-serif text-lg font-bold text-gold">
              {seller.vendor_name?.charAt(0)?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">{seller.vendor_name}</h3>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
            {seller.product_count} product{seller.product_count !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => navigate(`/store/${seller.vendor_id}`)}
          className="text-[10px] uppercase tracking-wider text-gold border border-gold/30 px-3 py-1.5 rounded-full hover:bg-gold hover:text-black transition-all font-semibold flex-shrink-0"
          data-testid={`visit-store-${seller.vendor_id}`}
        >
          Visit
        </button>
      </div>

      {/* Product grid */}
      <div className="p-2">
        {seller.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {seller.products.slice(0, 4).map((product) => (
              <div
                key={product.product_id}
                onClick={() => navigate(`/product/${product.product_id}`)}
                className="cursor-pointer group/item"
                data-testid={`featured-product-${product.product_id}`}
              >
                <div className="aspect-[3/4] bg-neutral-800 rounded-md overflow-hidden relative">
                  <img
                    src={normalizeImageUrl(product.images?.[0]) || FALLBACK_IMAGE}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={handleImageError}
                  />
                  {product.compare_price && product.compare_price > product.price && (
                    <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[7px] font-bold px-1 py-[1px] rounded">
                      -{Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1.5 truncate">{product.name}</p>
                <p className="text-xs font-bold text-white">Rs.{product.price?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-neutral-600 text-xs">
            <Store className="h-4 w-4 mr-2" /> Products coming soon
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-4 pb-4">
        <button
          onClick={() => navigate(`/store/${seller.vendor_id}`)}
          className="w-full text-center text-xs text-neutral-400 hover:text-gold transition-colors py-2 flex items-center justify-center gap-1 group/cta"
          data-testid={`shop-store-${seller.vendor_id}`}
        >
          Shop all from {seller.vendor_name}
          <ArrowRight className="h-3 w-3 group-hover/cta:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
