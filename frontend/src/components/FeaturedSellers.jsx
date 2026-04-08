import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Store, Crown } from "lucide-react";
import axios from "axios";
import { API } from "@/App";
import { normalizeImageUrl, handleImageError, FALLBACK_IMAGE } from "@/utils/imageUtils";

export const FeaturedSellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/vendor-credits/featured-sellers-with-products?products_per_vendor=3`)
      .then((r) => setSellers(r.data?.sellers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || sellers.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-neutral-950 text-white" data-testid="featured-sellers-section">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
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
        </div>

        {/* Grid layout like bundles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="featured-sellers-scroll">
          {sellers.map((seller, idx) => (
            <motion.div
              key={seller.vendor_id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
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
      className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden group hover:border-gold/30 transition-colors duration-300"
      data-testid={`featured-seller-card-${seller.vendor_id}`}
    >
      {/* Product images strip — 3 columns like bundle cards */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-px bg-neutral-800">
          {seller.products.slice(0, 3).map((product) => (
            <div
              key={product.product_id}
              onClick={() => navigate(`/product/${product.product_id}`)}
              className="aspect-square bg-neutral-900 overflow-hidden cursor-pointer"
              data-testid={`featured-product-${product.product_id}`}
            >
              <img
                src={normalizeImageUrl(product.images?.[0]) || FALLBACK_IMAGE}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={handleImageError}
              />
            </div>
          ))}
        </div>
        {/* Discount badge on first product */}
        {seller.products[0]?.compare_price && seller.products[0].compare_price > seller.products[0].price && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
            -{Math.round(((seller.products[0].compare_price - seller.products[0].price) / seller.products[0].compare_price) * 100)}%
          </div>
        )}
      </div>

      {/* Seller info */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center flex-shrink-0">
            {seller.vendor_logo ? (
              <img
                src={normalizeImageUrl(seller.vendor_logo)}
                alt={seller.vendor_name}
                className="w-full h-full rounded-full object-cover"
                onError={handleImageError}
              />
            ) : (
              <span className="font-serif text-sm font-bold text-gold">
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

        {/* Shop all CTA */}
        <button
          onClick={() => navigate(`/store/${seller.vendor_id}`)}
          className="w-full text-center text-xs text-neutral-400 hover:text-gold transition-colors pt-3 flex items-center justify-center gap-1 group/cta"
          data-testid={`shop-store-${seller.vendor_id}`}
        >
          Shop all from {seller.vendor_name}
          <ArrowRight className="h-3 w-3 group-hover/cta:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
