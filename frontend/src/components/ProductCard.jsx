import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const handleAddToWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to add to wishlist");
      navigate("/auth");
      return;
    }

    try {
      await axios.post(
        `${API}/wishlist/add`,
        { product_id: product.product_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Added to wishlist");
    } catch (error) {
      toast.error("Failed to add to wishlist");
    }
  };

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <Link
      to={`/product/${product.product_id}`}
      className="group block product-card-hover"
      data-testid={`product-card-${product.product_id}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <img
          src={product.images?.[0] || "https://via.placeholder.com/400x600"}
          alt={product.name}
          className="w-full h-full object-cover product-image"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.is_limited_edition && (
            <span className="font-mono text-[10px] uppercase tracking-widest bg-gold text-black px-3 py-1">
              Limited
            </span>
          )}
          {discount > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-widest bg-black text-white px-3 py-1">
              -{discount}%
            </span>
          )}
          {product.stock < 10 && product.stock > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-widest bg-red-500 text-white px-3 py-1">
              Low Stock
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gold hover:text-black"
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className="h-5 w-5" />
        </button>

        {/* Quick View on Hover */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm py-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-white text-center text-sm uppercase tracking-widest">
            View Details
          </p>
        </div>
      </div>

      <div className="pt-4 space-y-2">
        <h3 className="font-medium text-sm md:text-base truncate group-hover:text-gold transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">
          {product.category}
        </p>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg">
            Rs.{product.price.toLocaleString()}
          </span>
          {product.compare_price && (
            <span className="text-sm text-neutral-400 line-through">
              Rs.{product.compare_price.toLocaleString()}
            </span>
          )}
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-1 pt-1">
            {product.colors.slice(0, 4).map((color, idx) => (
              <span
                key={idx}
                className="text-[10px] text-neutral-400 uppercase"
              >
                {color}{idx < Math.min(product.colors.length, 4) - 1 ? ", " : ""}
              </span>
            ))}
            {product.colors.length > 4 && (
              <span className="text-[10px] text-neutral-400">
                +{product.colors.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};
