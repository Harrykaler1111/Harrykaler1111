import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, User, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const CheckoutAuthModal = ({ open, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState("phone"); // phone | otp | email | signup
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const verifyingRef = useRef(false);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPw, setSignupPw] = useState("");

  const resetState = () => {
    setPhone(""); setOtp(["","","","","",""]);
    setEmail(""); setPassword("");
    setSignupName(""); setSignupEmail(""); setSignupPhone(""); setSignupPw("");
    setLoading(false); setMode("phone"); setShowPw(false);
    verifyingRef.current = false;
  };

  useEffect(() => { if (!open) resetState(); }, [open]);

  // ============== OTP FLOW ==============
  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Enter a valid 10-digit phone number"); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/otp/send`, { phone: cleanPhone });
      setMode("otp");
      toast.success("OTP sent to your WhatsApp!");
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    // Auto-verify when all 6 digits entered
    if (value && index === 5) {
      const code = newOtp.join("");
      if (code.length === 6) verifyOtp(code);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits);
      otpRefs.current[5]?.focus();
      verifyOtp(pasted);
    }
  };

  const verifyOtp = async (code) => {
    if (verifyingRef.current || loading) return;
    verifyingRef.current = true;
    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/otp/verify`, { phone: cleanPhone, otp: code || otp.join("") });
      if (res.data.needs_registration) {
        // Phone verified but no account — switch to signup form
        setSignupPhone(cleanPhone);
        setMode("signup");
        toast.success("Phone verified! Complete your registration below.");
        return;
      }
      // Existing user — login directly
      login(res.data.user, res.data.token);
      toast.success("Logged in successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
      setOtp(["","","","","",""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
      verifyingRef.current = false;
    }
  };

  // ============== EMAIL LOGIN ==============
  const handleEmailLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { toast.error("Enter email and password"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      login(res.data.user, res.data.token);
      toast.success("Logged in!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally { setLoading(false); }
  };

  // ============== SIGNUP ==============
  const handleSignup = async (e) => {
    e?.preventDefault();
    if (!signupName || !signupEmail || !signupPw) { toast.error("Fill all required fields"); return; }
    if (!signupPhone) { toast.error("Phone number is required. Verify via WhatsApp OTP first."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: signupName, email: signupEmail, password: signupPw,
        phone: signupPhone
      });
      login(res.data.user, res.data.token);
      toast.success("Account created!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        data-testid="checkout-auth-modal"
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
          className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold" data-testid="auth-modal-title">
                  {mode === "signup" ? "Create Account" : "Almost there!"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {mode === "signup" ? "Fill in your details to complete signup"
                    : mode === "otp" ? "Enter the OTP sent to your WhatsApp"
                    : "Sign in to complete your order"}
                </p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100" data-testid="auth-modal-close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ============ PHONE ENTRY ============ */}
            {mode === "phone" && (
              <div className="space-y-4" data-testid="phone-entry-section">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1.5 block">WhatsApp Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-neutral-100 rounded-lg px-3 text-sm font-medium text-neutral-700 shrink-0">
                      +91
                    </div>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter your phone number"
                      className="h-11 text-lg tracking-wider"
                      data-testid="phone-input"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    />
                  </div>
                </div>

                <Button onClick={handleSendOtp} disabled={loading || phone.replace(/\D/g, "").length < 10}
                  className="w-full h-11 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold"
                  data-testid="send-otp-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><Phone className="h-4 w-4 mr-2" /> Send OTP via WhatsApp</>
                  )}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-xs text-neutral-400">or sign in with</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                {/* Email Login Button */}
                <Button variant="outline" onClick={() => setMode("email")}
                  className="w-full h-11 border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  data-testid="goto-email-btn">
                  <Mail className="h-4 w-4 mr-2" /> Continue with Email
                </Button>

                <p className="text-center text-xs text-neutral-400 mt-2">
                  New here?{" "}
                  <button type="button" onClick={() => setMode("signup")}
                    className="text-black font-medium hover:underline" data-testid="goto-signup-from-phone">
                    Create an account
                  </button>
                </p>
              </div>
            )}

            {/* ============ OTP VERIFICATION ============ */}
            {mode === "otp" && (
              <div className="space-y-4" data-testid="otp-verify-section">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm text-neutral-600">
                    OTP sent to <strong>+91 {phone.replace(/\D/g, "")}</strong>
                  </p>
                  <button onClick={() => { setMode("phone"); setOtp(["","","","","",""]); }}
                    className="text-xs text-green-600 hover:underline mt-1" data-testid="change-number-btn">
                    Change number
                  </button>
                </div>

                {/* OTP Input Boxes */}
                <div className="flex justify-center gap-2" data-testid="otp-inputs">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-11 h-12 text-center text-lg font-bold border-2 border-neutral-200 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors"
                      data-testid={`otp-input-${i}`}
                    />
                  ))}
                </div>

                <Button onClick={() => verifyOtp()} disabled={loading || otp.join("").length < 6}
                  className="w-full h-11 bg-black hover:bg-neutral-800 text-white"
                  data-testid="verify-otp-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
                </Button>

                <button onClick={handleSendOtp}
                  className="w-full text-xs text-neutral-500 hover:text-black text-center"
                  data-testid="resend-otp-btn">
                  Didn't receive? <span className="font-medium">Resend OTP</span>
                </button>
              </div>
            )}

            {/* ============ EMAIL LOGIN ============ */}
            {mode === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4" data-testid="email-login-section">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input value={email} onChange={(e) => setEmail(e.target.value)}
                      type="email" placeholder="your@email.com" className="pl-10 h-11" data-testid="auth-email-input" autoFocus />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input value={password} onChange={(e) => setPassword(e.target.value)}
                      type={showPw ? "text" : "password"} placeholder="Your password" className="pl-10 pr-10 h-11" data-testid="auth-password-input" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading}
                  className="w-full h-11 bg-black hover:bg-neutral-800 text-white" data-testid="email-login-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-xs text-neutral-400">or</span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                <Button type="button" variant="outline" onClick={() => setMode("phone")}
                  className="w-full h-11 border-neutral-200 text-neutral-700 hover:bg-neutral-50">
                  <Phone className="h-4 w-4 mr-2" /> Login with WhatsApp OTP
                </Button>

                <p className="text-center text-xs text-neutral-500">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-black font-medium hover:underline" data-testid="goto-signup">
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ============ SIGNUP ============ */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3" data-testid="signup-section">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input value={signupName} onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Your name" className="pl-10 h-11" data-testid="signup-name" autoFocus />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Email *</label>
                  <Input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                    type="email" placeholder="your@email.com" className="h-11" data-testid="signup-email" />
                  <p className="text-[10px] text-neutral-400 mt-0.5">No temporary/disposable emails allowed</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">
                    WhatsApp Number * {signupPhone && <span className="text-green-600 font-semibold ml-1">Verified</span>}
                  </label>
                  {signupPhone ? (
                    <div className="flex items-center gap-2">
                      <Input value={`+91 ${signupPhone}`} readOnly
                        className="h-11 bg-green-50 border-green-200 text-green-800 font-medium" data-testid="signup-phone" />
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-amber-700">
                        Phone verification required.{" "}
                        <button type="button" onClick={() => setMode("phone")}
                          className="underline font-semibold text-amber-900" data-testid="verify-phone-link">
                          Verify via WhatsApp OTP
                        </button>
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Password *</label>
                  <Input value={signupPw} onChange={(e) => setSignupPw(e.target.value)}
                    type="password" placeholder="Min 6 characters" className="h-11" data-testid="signup-password" />
                </div>
                <Button type="submit" disabled={loading || !signupPhone}
                  className="w-full h-11 bg-black hover:bg-neutral-800 text-white" data-testid="signup-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account & Continue"}
                </Button>
                <p className="text-center text-xs text-neutral-500">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("email")} className="text-black font-medium hover:underline">Sign in</button>
                </p>
              </form>
            )}

            {/* Trust Footer */}
            <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-neutral-100 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure</span>
              <span>|</span>
              <span>COD Available</span>
              <span>|</span>
              <span>Free Delivery 2999+</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
