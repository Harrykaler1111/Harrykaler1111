import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Truck, ArrowLeft, Shield, MapPin, Check, X,
  Banknote, Sparkles, AlertTriangle, ChevronDown, ChevronUp,
  Loader2, Lock, Package, Zap, Tag, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, API } from "@/App";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import axios from "axios";
import { normalizeImageUrl, handleImageError } from "@/utils/imageUtils";

// ========== PIN CODE INPUT WITH AUTO-FILL ==========
const PincodeInput = ({ value, onChange, onAutoFill }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const validatePin = useCallback(async (pin) => {
    if (pin.length !== 6) { setResult(null); setError(""); return; }
    setChecking(true);
    setError("");
    try {
      const res = await axios.get(`${API}/checkout/validate-pincode/${pin}`);
      setResult(res.data);
      onAutoFill(res.data.city, res.data.state);
    } catch (e) {
      setError(e.response?.data?.detail || "Invalid PIN code");
      setResult(null);
    } finally { setChecking(false); }
  }, [onAutoFill]);

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(v);
    if (v.length === 6) validatePin(v);
    else { setResult(null); setError(""); }
  };

  return (
    <div>
      <Label className="text-neutral-400 text-xs uppercase tracking-wider">PIN Code *</Label>
      <div className="relative mt-1.5">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input
          value={value}
          onChange={handleChange}
          placeholder="Enter 6-digit PIN"
          maxLength={6}
          className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
          data-testid="input-pincode"
        />
        {checking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold animate-spin" />}
        {result && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-400" />}
        {error && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />}
      </div>
      {result && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
          <Check className="h-3 w-3" /> {result.city ? `${result.city}, ` : ""}{result.state}
        </motion.p>
      )}
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

// ========== PAYMENT METHOD CARD ==========
const PaymentMethodCard = ({ method, selected, onClick, savings, charge, disabled, reason }) => {
  const isPrepaid = method === "prepaid";
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
      className={`relative w-full text-left p-4 rounded-xl border-2 transition-all ${
        disabled ? "opacity-50 cursor-not-allowed border-neutral-800 bg-neutral-900/50" :
        selected
          ? isPrepaid
            ? "border-green-500 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
            : "border-gold bg-gold/5 shadow-[0_0_20px_rgba(201,160,80,0.1)]"
          : "border-neutral-700 bg-neutral-900 hover:border-neutral-500"
      }`}
      data-testid={`payment-method-${method}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
          selected
            ? isPrepaid ? "border-green-500" : "border-gold"
            : "border-neutral-600"
        }`}>
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-2.5 h-2.5 rounded-full ${isPrepaid ? "bg-green-500" : "bg-gold"}`}
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isPrepaid ? <CreditCard className="h-4 w-4 text-green-400" /> : <Banknote className="h-4 w-4 text-gold" />}
            <span className="font-semibold text-white text-sm">
              {isPrepaid ? "Pay Online" : "Cash on Delivery"}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isPrepaid ? "UPI, Credit/Debit Card, Net Banking, Wallets" : "Pay when your order arrives"}
          </p>
          {disabled && reason && <p className="text-xs text-red-400 mt-1">{reason}</p>}
        </div>
        {savings > 0 && isPrepaid && !disabled && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> SAVE Rs.{savings}
          </motion.div>
        )}
        {charge > 0 && !isPrepaid && !disabled && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
            +Rs.{charge} fee
          </div>
        )}
      </div>
    </motion.button>
  );
};

// ========== MAIN CHECKOUT PAGE ==========
export const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const { refreshCart } = useCart();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("prepaid");
  const [codEligibility, setCodEligibility] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(true);

  const couponCode = location.state?.coupon;
  const couponDiscount = location.state?.discount || 0;

  const searchParams = new URLSearchParams(location.search);
  const refCode = searchParams.get("ref") || localStorage.getItem("pigma_ref") || "";

  const [form, setForm] = useState({
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
    const fetchAll = async () => {
      try {
        const [cartRes, settingsRes] = await Promise.all([
          axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/checkout/settings`)
        ]);
        setCart(cartRes.data);
        setCheckoutSettings(settingsRes.data);
        if (!cartRes.data?.items?.length) navigate("/");

        // Check COD eligibility
        try {
          const eligRes = await axios.get(`${API}/checkout/cod-eligibility`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCodEligibility(eligRes.data);
        } catch {}
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAll();
  }, [token, navigate]);

  const handleInput = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handlePinAutoFill = useCallback((city, state) => {
    setForm(f => ({
      ...f,
      city: city || f.city,
      state: state || f.state
    }));
  }, []);

  // ============== CALCULATIONS ==============
  const cfg = checkoutSettings || {};
  const subtotal = cart?.total || 0;
  const freeShipThreshold = cfg.free_shipping_threshold || 2999;
  const shippingCharge = subtotal >= freeShipThreshold ? 0 : (cfg.shipping_charge || 199);

  const isPrepaid = paymentMethod === "prepaid";
  const isCod = paymentMethod === "cod";

  const prepaidDiscount = isPrepaid && cfg.prepaid_discount_enabled ? (cfg.prepaid_discount || 0) : 0;
  const codCharge = isCod ? (cfg.cod_charge || 0) : 0;

  const total = subtotal - couponDiscount - prepaidDiscount + codCharge + shippingCharge;

  const codAdvanceRequired = isCod && cfg.cod_advance_enabled && subtotal >= (cfg.cod_advance_threshold || 1000);
  const codAdvanceAmount = codAdvanceRequired ? (cfg.cod_advance_amount || 500) : 0;
  const codRemaining = isCod ? Math.max(0, total - codAdvanceAmount) : 0;

  const totalSavings = couponDiscount + prepaidDiscount + (subtotal >= freeShipThreshold ? (cfg.shipping_charge || 199) : 0);

  const codDisabled = !cfg.cod_enabled || (codEligibility && !codEligibility.eligible);
  const codDisabledReason = !cfg.cod_enabled
    ? "COD is currently unavailable"
    : codEligibility && !codEligibility.eligible
      ? codEligibility.reason
      : "";

  // Check if subtotal exceeds COD max
  const codOverMax = subtotal > (cfg.cod_max_order_value || 10000);

  const handlePlaceOrder = async () => {
    const required = ["fullName", "phone", "address", "city", "state", "pincode"];
    for (const field of required) {
      if (!form[field]) {
        toast.error(`Please fill ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return;
      }
    }
    if (form.pincode.length !== 6) {
      toast.error("Enter a valid 6-digit PIN code");
      return;
    }

    setPlacing(true);
    try {
      const refParam = refCode ? `?ref=${encodeURIComponent(refCode)}` : "";
      const res = await axios.post(
        `${API}/orders${refParam}`,
        {
          shipping_address: {
            name: form.fullName, email: form.email, phone: form.phone,
            address: form.address, city: form.city, state: form.state,
            pincode: form.pincode, country: form.country
          },
          payment_method: paymentMethod,
          coupon_code: couponCode
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderId = res.data.order_id;

      // For prepaid or COD advance: simulate payment
      if (isPrepaid || codAdvanceRequired) {
        await axios.post(
          `${API}/orders/${orderId}/payment/verify?razorpay_payment_id=demo_${Date.now()}&razorpay_signature=demo_sig`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      refreshCart();
      toast.success("Order placed successfully!");
      navigate(`/order-success?id=${orderId}&method=${paymentMethod}${codAdvanceRequired ? "&advance=" + codAdvanceAmount : ""}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20 md:pt-24 pb-32" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-neutral-900 transition-colors" data-testid="back-to-cart-btn">
            <ArrowLeft className="h-5 w-5 text-neutral-400" />
          </button>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">Checkout</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Secure checkout powered by Pigma</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ====== LEFT: FORM ====== */}
          <div className="lg:col-span-3 space-y-6">
            {/* SHIPPING */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 md:p-6" data-testid="shipping-section">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 bg-gold text-black rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="font-semibold text-white">Shipping Address</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">Full Name *</Label>
                  <Input name="fullName" value={form.fullName} onChange={handleInput}
                    className="mt-1.5 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
                    placeholder="Enter your full name" data-testid="input-fullName" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">Email</Label>
                  <Input name="email" type="email" value={form.email} onChange={handleInput}
                    className="mt-1.5 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
                    placeholder="your@email.com" data-testid="input-email" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">Phone *</Label>
                  <Input name="phone" type="tel" value={form.phone} onChange={handleInput}
                    className="mt-1.5 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
                    placeholder="+91 XXXXX XXXXX" data-testid="input-phone" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">Address *</Label>
                  <Input name="address" value={form.address} onChange={handleInput}
                    className="mt-1.5 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
                    placeholder="House/Flat, Street, Landmark" data-testid="input-address" />
                </div>
                <PincodeInput
                  value={form.pincode}
                  onChange={(v) => setForm(f => ({ ...f, pincode: v }))}
                  onAutoFill={handlePinAutoFill}
                />
                <div>
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">City *</Label>
                  <Input name="city" value={form.city} onChange={handleInput}
                    className="mt-1.5 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
                    placeholder="City" data-testid="input-city" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">State *</Label>
                  <Input name="state" value={form.state} onChange={handleInput}
                    className="mt-1.5 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 h-11"
                    placeholder="State" data-testid="input-state" />
                </div>
                <div>
                  <Label className="text-neutral-400 text-xs uppercase tracking-wider">Country</Label>
                  <Input name="country" value={form.country} disabled
                    className="mt-1.5 bg-neutral-800 border-neutral-700 text-neutral-400 h-11" data-testid="input-country" />
                </div>
              </div>
            </div>

            {/* PAYMENT METHOD */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 md:p-6" data-testid="payment-section">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 bg-gold text-black rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="font-semibold text-white">Payment Method</h2>
              </div>

              <div className="space-y-3">
                {/* Prepaid Option */}
                <PaymentMethodCard
                  method="prepaid"
                  selected={isPrepaid}
                  onClick={() => setPaymentMethod("prepaid")}
                  savings={cfg.prepaid_discount_enabled ? cfg.prepaid_discount : 0}
                  charge={0}
                />

                {/* Prepaid savings highlight */}
                <AnimatePresence>
                  {isPrepaid && prepaidDiscount > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-400 shrink-0" />
                        <p className="text-xs text-green-400">
                          <span className="font-bold">Rs.{prepaidDiscount} OFF</span> applied for online payment
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* COD Option */}
                <PaymentMethodCard
                  method="cod"
                  selected={isCod}
                  onClick={() => setPaymentMethod("cod")}
                  savings={0}
                  charge={cfg.cod_charge || 0}
                  disabled={codDisabled || codOverMax}
                  reason={codOverMax ? `COD not available for orders above Rs.${cfg.cod_max_order_value?.toLocaleString()}` : codDisabledReason}
                />

                {/* COD advance notice */}
                <AnimatePresence>
                  {isCod && codAdvanceRequired && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-300">
                            {(cfg.cod_advance_message || "")
                              .replace("{advance}", codAdvanceAmount.toLocaleString())}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-neutral-900 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pay Now</p>
                            <p className="text-lg font-bold text-gold mt-0.5">Rs.{codAdvanceAmount.toLocaleString()}</p>
                          </div>
                          <div className="bg-neutral-900 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pay on Delivery</p>
                            <p className="text-lg font-bold text-white mt-0.5">Rs.{codRemaining.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* COD charge highlight if selected */}
                <AnimatePresence>
                  {isCod && codCharge > 0 && !codDisabled && !codOverMax && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                        <p className="text-xs text-neutral-400">
                          COD handling fee applied
                        </p>
                        <p className="text-xs font-bold text-amber-400">+Rs.{codCharge}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Switch to prepaid nudge */}
                {isCod && !codDisabled && !codOverMax && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-xl p-3 cursor-pointer hover:bg-green-500/10 transition-colors"
                    onClick={() => setPaymentMethod("prepaid")}
                    data-testid="switch-to-prepaid-nudge"
                  >
                    <Sparkles className="h-4 w-4 text-green-400 shrink-0" />
                    <p className="text-xs text-green-400">
                      <span className="font-bold">Switch to online payment</span> & save Rs.{(prepaidDiscount || 0) + codCharge} instantly
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* ====== RIGHT: ORDER SUMMARY ====== */}
          <div className="lg:col-span-2">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 md:p-6 lg:sticky lg:top-28" data-testid="order-summary">
              <h2 className="font-serif text-lg font-bold text-white mb-5">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-3 pb-5 border-b border-neutral-800 max-h-[260px] overflow-y-auto">
                {cart?.items?.map((item) => (
                  <div key={`${item.product_id}-${item.size}-${item.color}`} className="flex gap-3">
                    <div className="w-14 h-16 bg-neutral-800 rounded-lg shrink-0 overflow-hidden">
                      <img
                        src={normalizeImageUrl(item.product?.images?.[0])}
                        alt="" className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-neutral-200 truncate">{item.product?.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{item.size} | {item.color} | Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-white whitespace-nowrap">
                      Rs.{((item.product?.price || 0) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="py-4 border-b border-neutral-800">
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="flex items-center justify-between w-full text-sm"
                  data-testid="toggle-breakdown"
                >
                  <span className="text-neutral-400">Price Details</span>
                  {showBreakdown ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                </button>

                <AnimatePresence>
                  {showBreakdown && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 mt-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Subtotal ({cart?.items?.length} items)</span>
                          <span className="text-white">Rs.{subtotal.toLocaleString()}</span>
                        </div>
                        {couponDiscount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-green-400">Coupon ({couponCode})</span>
                            <span className="text-green-400">-Rs.{couponDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        {prepaidDiscount > 0 && (
                          <div className="flex justify-between text-xs" data-testid="prepaid-discount-line">
                            <span className="text-green-400">Prepaid Discount</span>
                            <span className="text-green-400">-Rs.{prepaidDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        {codCharge > 0 && (
                          <div className="flex justify-between text-xs" data-testid="cod-charge-line">
                            <span className="text-amber-400">COD Fee</span>
                            <span className="text-amber-400">+Rs.{codCharge}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-500">Shipping</span>
                          <span className={shippingCharge === 0 ? "text-green-400" : "text-white"}>
                            {shippingCharge === 0 ? "FREE" : `Rs.${shippingCharge}`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-4" data-testid="order-total">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-gold">Rs.{total.toLocaleString()}</span>
              </div>

              {/* Savings */}
              {totalSavings > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 mb-4 text-center" data-testid="total-savings">
                  <p className="text-xs text-green-400 font-semibold">
                    You're saving Rs.{totalSavings.toLocaleString()} on this order
                  </p>
                </div>
              )}

              {/* COD Advance breakdown */}
              {isCod && codAdvanceRequired && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4" data-testid="cod-advance-summary">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-amber-300">Advance Payment</span>
                    <span className="text-amber-400 font-bold">Rs.{codAdvanceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Remaining (on delivery)</span>
                    <span className="text-white font-bold">Rs.{codRemaining.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={placing}
                className="w-full h-12 bg-gold hover:bg-yellow-500 text-black font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(201,160,80,0.2)]"
                data-testid="place-order-btn"
              >
                {placing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    {isPrepaid
                      ? `Pay Rs.${total.toLocaleString()}`
                      : codAdvanceRequired
                        ? `Pay Advance Rs.${codAdvanceAmount.toLocaleString()}`
                        : `Place COD Order  Rs.${total.toLocaleString()}`
                    }
                  </>
                )}
              </Button>

              {/* Trust Signals */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { icon: Shield, label: "Secure\nCheckout" },
                  { icon: Truck, label: "Fast\nShipping" },
                  { icon: Package, label: "Easy\nReturns" }
                ].map((t, i) => (
                  <div key={i} className="text-center py-2">
                    <t.icon className="h-4 w-4 text-neutral-500 mx-auto mb-1" />
                    <p className="text-[9px] text-neutral-500 leading-tight whitespace-pre-line">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
