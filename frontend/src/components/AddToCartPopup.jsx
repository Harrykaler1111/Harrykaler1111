import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeImageUrl, FALLBACK_IMAGE, handleImageError } from "@/utils/imageUtils";

export const AddToCartPopup = ({ open, onClose, product, size, color }) => {
  const navigate = useNavigate();

  if (!open) return null;

  const imgSrc = normalizeImageUrl(product?.images?.[0]) || FALLBACK_IMAGE;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] md:pt-[20vh] p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            data-testid="add-to-cart-popup"
          >
            {/* Success Banner */}
            <div className="bg-green-50 border-b border-green-100 px-5 py-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-green-800">Added to cart!</span>
            </div>

            {/* Product Info */}
            <div className="p-5">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-20 bg-neutral-100 rounded-lg overflow-hidden shrink-0">
                  <img src={imgSrc} alt={product?.name} className="w-full h-full object-cover" onError={handleImageError} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-neutral-800 line-clamp-2" data-testid="popup-product-name">
                    {product?.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                    {size && <span>Size: {size}</span>}
                    {color && <span>Color: {color}</span>}
                  </div>
                  <p className="font-bold text-base mt-1" data-testid="popup-product-price">
                    Rs.{(product?.price || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-11 text-sm font-medium rounded-xl border-neutral-300 hover:bg-neutral-50"
                  data-testid="popup-continue-shopping"
                >
                  Continue Shopping
                </Button>
                <Button
                  onClick={() => { onClose(); navigate("/cart-page"); }}
                  className="flex-1 h-11 text-sm font-medium bg-black hover:bg-neutral-800 text-white rounded-xl"
                  data-testid="popup-go-to-cart"
                >
                  <ShoppingBag className="h-4 w-4 mr-1.5" /> Go to Cart
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
