import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Truck, RefreshCw, Shield, Minus, Plus, Check, Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductReviews } from "@/components/ProductReviews";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API}/products/${productId}`);
        setProduct(response.data);
        if (response.data.sizes?.length > 0) {
          setSelectedSize(response.data.sizes[0]);
        }
        if (response.data.colors?.length > 0) {
          setSelectedColor(response.data.colors[0]);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Product not found");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigate]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error("Please sign in to add to cart");
      navigate("/auth");
      return;
    }

    if (!selectedSize || !selectedColor) {
      toast.error("Please select size and color");
      return;
    }

    setAddingToCart(true);
    try {
      await axios.post(
        `${API}/cart/add`,
        {
          product_id: product.product_id,
          quantity,
          size: selectedSize,
          color: selectedColor
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Added to cart!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = async () => {
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

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!product) return null;

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <div className="min-h-screen pt-20 md:pt-24" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Combine images + videos into media array */}
            {(() => {
              const allMedia = [
                ...(product.images || []).map(u => ({ url: u, type: "image" })),
                ...(product.videos || []).map(u => ({ url: u, type: "video" })),
              ];
              if (allMedia.length === 0) allMedia.push({ url: "https://via.placeholder.com/800x1000", type: "image" });
              const current = allMedia[activeImage] || allMedia[0];
              return (
                <>
                  <motion.div key={activeImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="aspect-[3/4] bg-neutral-100 overflow-hidden">
                    {current.type === "video" ? (
                      <video src={current.url} controls className="w-full h-full object-contain bg-black" data-testid="product-main-video" />
                    ) : (
                      <img src={current.url} alt={product.name} className="w-full h-full object-cover" data-testid="product-main-image" />
                    )}
                  </motion.div>
                  {allMedia.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {allMedia.map((m, idx) => (
                        <button key={idx} onClick={() => setActiveImage(idx)}
                          className={`flex-shrink-0 w-20 h-24 overflow-hidden border-2 transition-colors relative ${
                            activeImage === idx ? "border-black" : "border-transparent"
                          }`} data-testid={`product-thumbnail-${idx}`}>
                          {m.type === "video" ? (
                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                              <Play className="h-5 w-5 text-neutral-400" />
                            </div>
                          ) : (
                            <img src={m.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Product Info */}
          <div className="lg:sticky lg:top-28 lg:self-start space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              {product.is_limited_edition && (
                <span className="font-mono text-[10px] uppercase tracking-widest bg-gold text-black px-3 py-1">
                  Limited Edition
                </span>
              )}
              {discount > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-widest bg-black text-white px-3 py-1">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Title & Category */}
            <div>
              <p className="text-sm text-neutral-500 uppercase tracking-wider mb-2">
                {product.category}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-bold" data-testid="product-name">
                {product.name}
              </h1>
              {product.average_rating > 0 && (
                <div className="flex items-center gap-2 mt-2" data-testid="product-rating-summary">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.average_rating) ? "fill-gold text-gold" : "fill-none text-neutral-300"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-neutral-500">
                    {product.average_rating.toFixed(1)} ({product.review_count || 0} review{(product.review_count || 0) !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              {product.vendor_name && (
                <Link to={`/store/${product.vendor_id}`} className="text-sm text-gold hover:text-gold/80 transition-colors mt-1 inline-block" data-testid="product-vendor">
                  Sold by <span className="font-medium underline underline-offset-2">{product.vendor_name}</span>
                </Link>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-semibold" data-testid="product-price">
                Rs.{product.price.toLocaleString()}
              </span>
              {product.compare_price && (
                <span className="text-xl text-neutral-400 line-through">
                  Rs.{product.compare_price.toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-neutral-600 leading-relaxed" data-testid="product-description">
              {product.description}
            </p>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.stock > 0 ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">
                    {product.stock < 10 ? `Only ${product.stock} left` : "In Stock"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-red-500">Out of Stock</span>
              )}
            </div>

            {/* Size Selection */}
            {product.sizes?.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Size: <span className="text-neutral-500">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 border text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? "border-black bg-black text-white"
                          : "border-neutral-300 hover:border-black"
                      }`}
                      data-testid={`size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors?.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Color: <span className="text-neutral-500">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border text-sm transition-colors ${
                        selectedColor === color
                          ? "border-black bg-black text-white"
                          : "border-neutral-300 hover:border-black"
                      }`}
                      data-testid={`color-${color}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium mb-3 block">Quantity</label>
              <div className="flex items-center border border-neutral-300 w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  data-testid="qty-decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-medium" data-testid="qty-value">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 transition-colors"
                  data-testid="qty-increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart & Wishlist */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || addingToCart}
                className="flex-1 btn-gold py-6 text-base"
                data-testid="add-to-cart-btn"
              >
                {addingToCart ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black" />
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </Button>
              <Button
                onClick={handleAddToWishlist}
                variant="outline"
                className="w-14 h-14 p-0 border-neutral-300 hover:border-gold hover:text-gold"
                data-testid="wishlist-btn"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Truck className="h-5 w-5 text-gold" />
                <span>Free shipping on orders over Rs.2999</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <RefreshCw className="h-5 w-5 text-gold" />
                <span>14-day hassle-free returns</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-5 w-5 text-gold" />
                <span>100% authentic guarantee</span>
              </div>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="pt-6 border-t">
                <p className="text-sm text-neutral-500 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <ProductReviews productId={product.product_id} vendorId={product.vendor_id} />
      </div>
    </div>
  );
};
