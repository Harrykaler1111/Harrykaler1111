import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Mail, Lock, User, Phone, FileText, Eye, EyeOff } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const VendorAuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetStep, setResetStep] = useState(1);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "", password: "", store_name: "", owner_name: "",
    phone: "", store_description: "", gst_number: ""
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/vendors/login`, loginForm);
      localStorage.setItem("pigma_vendor_token", res.data.token);
      localStorage.setItem("pigma_vendor", JSON.stringify(res.data.vendor));
      toast.success("Welcome back!");
      navigate("/vendor");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/vendors/register`, registerForm);
      localStorage.setItem("pigma_vendor_token", res.data.token);
      localStorage.setItem("pigma_vendor", JSON.stringify(res.data.vendor));
      toast.success("Registration successful! Complete KYC to start selling.");
      navigate("/vendor");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4" data-testid="vendor-auth-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="h-8 w-8 text-gold" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-white">Pigma Vendor</h1>
          <p className="text-neutral-400 mt-1">{isLogin ? "Sign in to your vendor dashboard" : "Register your store on Pigma"}</p>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <Button onClick={() => setIsLogin(true)} variant={isLogin ? "default" : "ghost"}
              className={isLogin ? "flex-1 bg-gold text-black" : "flex-1 text-neutral-400"} data-testid="vendor-login-tab">
              Login
            </Button>
            <Button onClick={() => setIsLogin(false)} variant={!isLogin ? "default" : "ghost"}
              className={!isLogin ? "flex-1 bg-gold text-black" : "flex-1 text-neutral-400"} data-testid="vendor-register-tab">
              Register
            </Button>
          </div>

          {isLogin ? (
            <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input type="email" value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    className="pl-10 bg-neutral-800 border-neutral-700 text-white" placeholder="vendor@example.com" required data-testid="vendor-login-email" />
                </div>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                  <Input type={showPassword ? "text" : "password"} value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="pl-10 pr-10 bg-neutral-800 border-neutral-700 text-white" required data-testid="vendor-login-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-500">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gold text-black hover:bg-gold/90 h-11 font-semibold" data-testid="vendor-login-submit">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <button type="button" onClick={() => setShowReset(true)} className="w-full text-sm text-gold hover:text-gold/80 transition-colors text-center mt-1" data-testid="vendor-forgot-password">
                Forgot Password?
              </button>
            </form>
            {showReset && (
              <div className="mt-4 pt-4 border-t border-neutral-700">
                <h3 className="text-white font-semibold mb-3">Reset Password</h3>
                {resetStep === 1 ? (
                  <div className="space-y-3">
                    <Input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="Your email" className="bg-neutral-800 border-neutral-700 text-white" data-testid="vendor-reset-email" />
                    <Button onClick={async () => {
                      try {
                        const res = await axios.post(`${API}/auth/password/reset-request`, { email: resetEmail });
                        setResetStep(2); toast.success("OTP sent!");
                      } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
                    }} className="w-full bg-gold hover:bg-gold/90 text-black" data-testid="vendor-send-otp-btn">Send Reset OTP</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input type="text" value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} placeholder="Enter OTP" className="bg-neutral-800 border-neutral-700 text-white text-center tracking-widest" maxLength={6} data-testid="vendor-reset-otp" />
                    <Input type="password" value={resetNewPw} onChange={(e) => setResetNewPw(e.target.value)} placeholder="New password (min 6 chars)" className="bg-neutral-800 border-neutral-700 text-white" data-testid="vendor-reset-new-pw" />
                    <Button onClick={async () => {
                      try {
                        await axios.post(`${API}/auth/password/reset-confirm`, { email: resetEmail, otp: resetOtp, new_password: resetNewPw });
                        toast.success("Password reset!"); setShowReset(false); setResetStep(1);
                      } catch (err) { toast.error(err.response?.data?.detail || "Reset failed"); }
                    }} className="w-full bg-gold hover:bg-gold/90 text-black" data-testid="vendor-reset-confirm-btn">Reset Password</Button>
                  </div>
                )}
                <button type="button" onClick={() => { setShowReset(false); setResetStep(1); }} className="w-full text-xs text-neutral-500 mt-2 text-center">Back to Sign In</button>
              </div>
            )}
            </>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Store Name *</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <Input value={registerForm.store_name} onChange={(e) => setRegisterForm({...registerForm, store_name: e.target.value})}
                      className="pl-10 bg-neutral-800 border-neutral-700 text-white text-sm" required data-testid="vendor-reg-store-name" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Owner Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <Input value={registerForm.owner_name} onChange={(e) => setRegisterForm({...registerForm, owner_name: e.target.value})}
                      className="pl-10 bg-neutral-800 border-neutral-700 text-white text-sm" required data-testid="vendor-reg-owner-name" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Email *</label>
                <Input type="email" value={registerForm.email} onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm" required data-testid="vendor-reg-email" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Password *</label>
                <Input type="password" value={registerForm.password} onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className="bg-neutral-800 border-neutral-700 text-white text-sm" required data-testid="vendor-reg-password" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Phone *</label>
                  <Input value={registerForm.phone} onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                    className="bg-neutral-800 border-neutral-700 text-white text-sm" required data-testid="vendor-reg-phone" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">GST Number</label>
                  <Input value={registerForm.gst_number} onChange={(e) => setRegisterForm({...registerForm, gst_number: e.target.value})}
                    className="bg-neutral-800 border-neutral-700 text-white text-sm" placeholder="Optional" data-testid="vendor-reg-gst" />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Store Description *</label>
                <textarea value={registerForm.store_description} onChange={(e) => setRegisterForm({...registerForm, store_description: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-white text-sm rounded-md resize-none"
                  rows={2} required data-testid="vendor-reg-description" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gold text-black hover:bg-gold/90 h-11 font-semibold" data-testid="vendor-register-submit">
                {loading ? "Registering..." : "Register Store"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-neutral-500 text-xs mt-4">
          By continuing, you agree to Pigma's Vendor Terms of Service
        </p>
      </motion.div>
    </div>
  );
};
