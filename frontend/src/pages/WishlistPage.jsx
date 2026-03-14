import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const response = await axios.get(`${API}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [token]);

  const removeFromWishlist = async (productId) => {
    try {
      await axios.delete(`${API}/wishlist/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Removed from wishlist");
      fetchWishlist();
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50" data-testid="wishlist-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">My Wishlist</h1>

        {products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Heart className="h-16 w-16 mx-auto text-neutral-300 mb-6" />
            <h2 className="font-serif text-2xl font-bold mb-4">Your wishlist is empty</h2>
            <p className="text-neutral-500 mb-8">Save items you love by clicking the heart icon</p>
            <Button
              onClick={() => navigate("/products")}
              className="bg-black text-white hover:bg-neutral-800 uppercase tracking-widest px-8 py-6"
              data-testid="browse-products-btn"
            >
              Browse Products
            </Button>
          </motion.div>
        ) : (
          <>
            <p className="text-neutral-500 mb-6">{products.length} item{products.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {products.map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                >
                  <ProductCard product={product} />
                  <button
                    onClick={() => removeFromWishlist(product.product_id)}
                    className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                    data-testid={`remove-wishlist-${product.product_id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
