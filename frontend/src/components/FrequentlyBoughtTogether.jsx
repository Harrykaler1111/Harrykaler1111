import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ShoppingBag, Check, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";

// ========== PRODUCT CARD IN BUNDLE ==========
const BundleProductCard = ({ product, selected, onToggle, isSource }) => {
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`relative bg-white rounded-xl border-2 transition-all overflow-hidden cursor-pointer ${
        selected ? "border-black shadow-md" : "border-neutral-100 hover:border-neutral-300"
      } ${isSource ? "ring-2 ring-gold/30" : ""}`}
      onClick={isSource ? undefined : onToggle}
      data-testid={`fbt-card-${product.product_id}`}
    >
      {/* Checkbox */}
      {!isSource && (
        <div className={`absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          selected ? "bg-black border-black" : "bg-white/90 border-neutral-300"
        }`}>
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
      )}

      {/* "This Item" badge on source product */}
      {isSource && (
        <div className="absolute top-2 left-2 z-10 bg-gold text-black text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
          This Item
        </div>
      )}

      {/* Discount badge */}
      {discount > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded-sm">
          -{discount}%
        </div>
      )}

      {/* Image */}
      <div className="aspect-[3/4] bg-neutral-50 overflow-hidden">
        <img
          src={product.images?.[0] || ""}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={e => { e.target.style.display = "none"; }}
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <Link
          to={`/product/${product.product_id}`}
          className="text-xs font-medium text-neutral-800 hover:text-gold transition-colors line-clamp-2 leading-tight block"
          onClick={e => e.stopPropagation()}
        >
          {product.name}
        </Link>

        {/* Rating */}
        {product.average_rating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-gold text-gold" />
            <span className="text-[10px] text-neutral-400">{product.average_rating.toFixed(1)}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-sm font-bold text-black">Rs.{product.price?.toLocaleString()}</span>
          {product.compare_price && (
            <span className="text-[10px] text-neutral-400 line-through">Rs.{product.compare_price?.toLocaleString()}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ========== PLUS SEPARATOR ==========
const PlusSeparator = () => (
  <div className="flex items-center justify-center shrink-0 self-center">
    <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
      <Plus className="h-4 w-4 text-neutral-400" />
    </div>
  </div>
);

// ========== MAIN COMPONENT (PRODUCT DETAIL PAGE) ==========
export const FrequentlyBoughtTogether = ({ productId, currentProduct }) => {
  const { user, token } = useAuth();
  const { addToCart, openCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/products/frequently-bought-together/${productId}?limit=3`);
        setProducts(res.data || []);
        // Select all by default
        setSelectedIds(new Set((res.data || []).map(p => p.product_id)));
      } catch {}
      finally { setLoading(false); }
    };
    if (productId) fetch();
  }, [productId]);

  const toggleProduct = (pid) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const selectedProducts = products.filter(p => selectedIds.has(p.product_id));
  const bundleTotal = (currentProduct?.price || 0) + selectedProducts.reduce((s, p) => s + p.price, 0);
  const bundleCompareTotal = (currentProduct?.compare_price || currentProduct?.price || 0) +
    selectedProducts.reduce((s, p) => s + (p.compare_price || p.price), 0);
  const bundleSavings = bundleCompareTotal - bundleTotal;
  const itemCount = 1 + selectedProducts.length;

  const handleAddAll = async () => {
    if (!user) { toast.error("Please sign in to add to cart"); return; }
    setAdding(true);
    let added = 0;
    try {
      // Add current product
      const ok1 = await addToCart(
        currentProduct.product_id, 1,
        currentProduct.sizes?.[0] || "M",
        currentProduct.colors?.[0] || "Default"
      );
      if (ok1) added++;

      // Add selected FBT products
      for (const p of selectedProducts) {
        const ok = await addToCart(p.product_id, 1, p.sizes?.[0] || "M", p.colors?.[0] || "Default");
        if (ok) added++;
      }

      if (added > 0) {
        toast.success(`${added} item${added > 1 ? "s" : ""} added to cart!`);
        openCart();
      }
    } catch {
      toast.error("Failed to add items");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <div className="mt-12 mb-8" data-testid="frequently-bought-together">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-serif text-xl md:text-2xl font-bold text-neutral-900">
          Frequently Bought Together
        </h2>
        <p className="text-sm text-neutral-400 mt-1">Customers who bought this also bought</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Product Cards Row */}
        <div className="flex-1">
          <div className="flex items-stretch gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {/* Source product (always selected) */}
            <div className="min-w-[150px] max-w-[180px] shrink-0">
              <BundleProductCard product={currentProduct} selected={true} isSource={true} />
            </div>

            {products.map((p, i) => (
              <div key={p.product_id} className="contents">
                <PlusSeparator />
                <div className="min-w-[150px] max-w-[180px] shrink-0">
                  <BundleProductCard
                    product={p}
                    selected={selectedIds.has(p.product_id)}
                    onToggle={() => toggleProduct(p.product_id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bundle Summary & CTA */}
        <div className="lg:w-[240px] shrink-0">
          <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-5 lg:sticky lg:top-36" data-testid="fbt-summary">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">
              Bundle Price ({itemCount} items)
            </p>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-black" data-testid="fbt-total">
                  Rs.{bundleTotal.toLocaleString()}
                </span>
              </div>
              {bundleSavings > 0 && (
                <p className="text-xs text-green-600 font-semibold" data-testid="fbt-savings">
                  Save Rs.{bundleSavings.toLocaleString()} buying together
                </p>
              )}
              {bundleCompareTotal > bundleTotal && (
                <p className="text-[10px] text-neutral-400 line-through">
                  Rs.{bundleCompareTotal.toLocaleString()}
                </p>
              )}
            </div>

            <Button
              onClick={handleAddAll}
              disabled={adding || selectedProducts.length === 0}
              className="w-full btn-gold font-bold py-5 rounded-lg text-sm"
              data-testid="fbt-add-all-btn"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Add {itemCount} to Cart
                </>
              )}
            </Button>

            <p className="text-[10px] text-neutral-400 text-center mt-2">
              Click items to add or remove from bundle
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== COMPACT VERSION FOR CART DRAWER ==========
export const FrequentlyBoughtTogetherCompact = ({ cartItems }) => {
  const { addToCart } = useCart();
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!cartItems?.length || !token) return;
    setLoading(true);

    // Use the first cart item to get FBT suggestions
    const firstProductId = cartItems[0]?.product_id;
    if (!firstProductId) { setLoading(false); return; }

    axios.get(`${API}/products/frequently-bought-together/${firstProductId}?limit=4`)
      .then(res => {
        // Filter out items already in cart
        const cartPids = new Set(cartItems.map(i => i.product_id));
        setProducts((res.data || []).filter(p => !cartPids.has(p.product_id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cartItems, token]);

  const handleQuickAdd = async (product) => {
    setAddingId(product.product_id);
    try {
      const ok = await addToCart(product.product_id, 1, product.sizes?.[0] || "M", product.colors?.[0] || "Default");
      if (ok) toast.success(`${product.name} added!`);
    } catch {}
    finally { setAddingId(null); }
  };

  if (loading || products.length === 0) return null;

  return (
    <div className="px-4 pb-3" data-testid="fbt-compact">
      <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
        Frequently Bought Together
      </h3>
      <div className="space-y-2">
        {products.slice(0, 3).map(p => (
          <div key={p.product_id}
            className="flex items-center gap-2.5 p-2 bg-neutral-50 rounded-lg border border-neutral-100"
            data-testid={`fbt-compact-${p.product_id}`}
          >
            <div className="w-10 h-12 bg-neutral-100 rounded-md overflow-hidden shrink-0">
              <img src={p.images?.[0] || ""} alt="" className="w-full h-full object-cover"
                onError={e => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 96'%3E%3Crect fill='%23f5f5f5' width='80' height='96'/%3E%3Ctext fill='%23ccc' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='10'%3ENo Img%3C/text%3E%3C/svg%3E"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-neutral-700 truncate">{p.name}</p>
              <p className="text-xs font-bold text-black mt-0.5">Rs.{p.price?.toLocaleString()}</p>
            </div>
            <button
              onClick={() => handleQuickAdd(p)}
              disabled={addingId === p.product_id}
              className="bg-black text-white text-[9px] font-bold px-2.5 py-1.5 rounded-md hover:bg-gold hover:text-black transition-colors uppercase shrink-0 disabled:opacity-50"
              data-testid={`fbt-compact-add-${p.product_id}`}
            >
              {addingId === p.product_id ? "..." : "+ Add"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
