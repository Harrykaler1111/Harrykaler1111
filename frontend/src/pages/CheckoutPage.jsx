import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Truck, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const couponCode = location.state?.coupon;
  const discount = location.state?.discount || 0;

  // Capture referral code from URL params or localStorage
  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get("ref") || localStorage.getItem("pigma_ref") || "";

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India"
  });

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await axios.get(`${API}/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCart(response.data);
        if (!response.data?.items?.length) {
          navigate("/cart");
        }
      } catch (error) {
        console.error("Error fetching cart:", error);
        navigate("/cart");
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, [token, navigate]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async () => {
    // Validate form
    const required = ["fullName", "phone", "address", "city", "state", "pincode"];
    for (const field of required) {
      if (!formData[field]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return;
      }
    }

    setPlacing(true);
    try {
      const refParam = refCode ? `?ref=${encodeURIComponent(refCode)}` : "";
      const response = await axios.post(
        `${API}/orders${refParam}`,
        {
          shipping_address: {
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: formData.country
          },
          payment_method: "razorpay",
          coupon_code: couponCode
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // For demo, simulate payment verification
      await axios.post(
        `${API}/orders/${response.data.order_id}/payment/verify?razorpay_payment_id=demo_${Date.now()}&razorpay_signature=demo_sig`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Order placed successfully!");
      navigate(`/order-success?id=${response.data.order_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  const subtotal = cart?.total || 0;
  const shipping = subtotal >= 2999 ? 0 : 199;
  const total = subtotal - discount + shipping;

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50" data-testid="checkout-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/cart")}
          className="mb-6"
          data-testid="back-to-cart-btn"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Shipping Form */}
          <div>
            <h1 className="font-serif text-3xl font-bold mb-8">Checkout</h1>

            <div className="bg-white p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm">
                  1
                </div>
                <h2 className="font-semibold">Shipping Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-fullName"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-phone"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-address"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-state"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="mt-1"
                    data-testid="input-pincode"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="mt-1"
                    disabled
                    data-testid="input-country"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm">
                  2
                </div>
                <h2 className="font-semibold">Payment Method</h2>
              </div>

              <div className="border-2 border-black p-4 flex items-center gap-4 cursor-pointer">
                <CreditCard className="h-6 w-6" />
                <div className="flex-1">
                  <p className="font-medium">Razorpay</p>
                  <p className="text-sm text-neutral-500">Credit/Debit Card, UPI, Net Banking</p>
                </div>
                <Check className="h-5 w-5 text-gold" />
              </div>

              <p className="text-xs text-neutral-500 mt-4">
                Payment is processed securely via Razorpay. Your payment details are encrypted.
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white p-6 sticky top-28">
              <h2 className="font-serif text-xl font-bold mb-6">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 pb-6 border-b">
                {cart?.items?.map((item) => (
                  <div key={`${item.product_id}-${item.size}-${item.color}`} className="flex gap-4">
                    <div className="w-16 h-20 bg-neutral-100 flex-shrink-0 overflow-hidden">
                      <img
                        src={item.product?.images?.[0] || "https://via.placeholder.com/100"}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product?.name}</p>
                      <p className="text-xs text-neutral-500">
                        {item.size} | {item.color} | Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium">
                      Rs.{((item.product?.price || 0) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 py-6 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span>Rs.{subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({couponCode})</span>
                    <span>-Rs.{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Shipping</span>
                  <span>{shipping === 0 ? "Free" : `Rs.${shipping}`}</span>
                </div>
              </div>

              <div className="flex justify-between py-6 text-lg font-semibold">
                <span>Total</span>
                <span>Rs.{total.toLocaleString()}</span>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full btn-gold py-6"
                data-testid="place-order-btn"
              >
                {placing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black" />
                ) : (
                  <>
                    Place Order
                    <CreditCard className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-neutral-500">
                <Truck className="h-4 w-4" />
                <span>Free shipping on orders over Rs.2999</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
