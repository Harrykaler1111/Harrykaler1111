import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const CheckoutAuthModal = ({ open, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState("phone"); // phone | email | signup
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [demoOtp, setDemoOtp] = useState("");
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
    setPhone(""); setOtpSent(false); setOtp(["","","","","",""]); setDemoOtp("");
    setEmail(""); setPassword("");
    setSignupName(""); setSignupEmail(""); setSignupPhone(""); setSignupPw("");
    setLoading(false); setMode("phone");
  };

  useEffect(() => { if (!open) resetState(); }, [open]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) { toast.error("Enter a valid 10-digit phone number"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/otp/send`, { phone: cleanPhone });
      setOtpSent(true);
      if (res.data.demo_otp) setDemoOtp(res.data.demo_otp);
      toast.success("OTP sent to your WhatsApp!");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
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

  const verifyOtp = async (code) => {
    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/otp/verify`, { phone: cleanPhone, otp: code || otp.join("") });
      login(res.data.user, res.data.token);
      toast.success("Logged in successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
      setOtp(["","","","","",""]);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

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

  const handleSignup = async (e) => {
    e?.preventDefault();
    if (!signupName || !signupEmail || !signupPw) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        name: signupName, email: signupEmail, password: signupPw,
        phone: signupPhone || undefined
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
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-2xl"
          data-testid="checkout-auth-modal"
        >
          {/* Header */}
          <div className="relative bg-black text-white px-6 py-5">
            <button onClick={onClose} className="absolute right-4 top-4 text-white/60 hover:text-white" data-testid="auth-modal-close">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold">Almost there!</h2>
            <p className="text-sm text-white/60 mt-0.5">Sign in to complete your order</p>
          </div>

          <div className="p-6">
            {/* Mode Tabs */}
            <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-5">
              {[
                { key: "phone", label: "WhatsApp OTP", icon: Phone },
                { key: "email", label: "Email", icon: Mail },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => { setMode(key); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    mode === key ? "bg-white shadow-sm text-black" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  data-testid={`auth-tab-${key}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Phone OTP Flow */}
            {mode === "phone" && !otpSent && (
              <div className="space-y-4" data-testid="phone-input-section">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1.5 block">WhatsApp Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-neutral-100 rounded-lg px-3 text-sm font-medium text-neutral-600 shrink-0">+91</div>
                    <Input
                      value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      className="h-11" maxLength={10}
                      data-testid="auth-phone-input"
                    />
                  </div>
                </div>
                <Button onClick={handleSendOtp} disabled={loading || phone.length < 10}
                  className="w-full h-11 bg-black hover:bg-neutral-800 text-white"
                  data-testid="send-otp-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send OTP <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
                {demoOtp && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-lg p-2" data-testid="demo-otp-display">
                    Demo OTP: <strong>{demoOtp}</strong>
                  </p>
                )}
              </div>
            )}

            {mode === "phone" && otpSent && (
              <div className="space-y-4" data-testid="otp-verify-section">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm text-neutral-700">OTP sent to <strong>+91 {phone}</strong></p>
                  <button onClick={() => { setOtpSent(false); setOtp(["","","","","",""]); }}
                    className="text-xs text-blue-600 hover:underline mt-1">Change number</button>
                </div>
                <div className="flex justify-center gap-2" data-testid="otp-input-group">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => otpRefs.current[idx] = el}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-bold border-2 border-neutral-200 rounded-xl focus:border-black focus:outline-none transition-colors"
                      data-testid={`otp-digit-${idx}`}
                    />
                  ))}
                </div>
                {demoOtp && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 rounded-lg p-2" data-testid="demo-otp-reminder">
                    Demo OTP: <strong>{demoOtp}</strong>
                  </p>
                )}
                <Button onClick={() => verifyOtp()} disabled={loading || otp.join("").length < 6}
                  className="w-full h-11 bg-black hover:bg-neutral-800 text-white"
                  data-testid="verify-otp-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
                </Button>
                <button onClick={handleSendOtp}
                  className="w-full text-xs text-neutral-500 hover:text-black text-center"
                  data-testid="resend-otp-btn">
                  Didn't receive? Resend OTP
                </button>
              </div>
            )}

            {/* Email Login */}
            {mode === "email" && (
              <form onSubmit={handleEmailLogin} className="space-y-4" data-testid="email-login-section">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input value={email} onChange={(e) => setEmail(e.target.value)}
                      type="email" placeholder="your@email.com" className="pl-10 h-11" data-testid="auth-email-input" />
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
                <p className="text-center text-xs text-neutral-500">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-black font-medium hover:underline" data-testid="goto-signup">
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* Signup */}
            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3" data-testid="signup-section">
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input value={signupName} onChange={(e) => setSignupName(e.target.value)}
                      placeholder="Your name" className="pl-10 h-11" data-testid="signup-name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Email *</label>
                  <Input value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                    type="email" placeholder="your@email.com" className="h-11" data-testid="signup-email" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Phone</label>
                  <Input value={signupPhone} onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number" className="h-11" data-testid="signup-phone" />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 mb-1 block">Password *</label>
                  <Input value={signupPw} onChange={(e) => setSignupPw(e.target.value)}
                    type="password" placeholder="Create password" className="h-11" data-testid="signup-password" />
                </div>
                <Button type="submit" disabled={loading}
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
