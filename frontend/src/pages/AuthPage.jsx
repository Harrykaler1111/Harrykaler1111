import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Timer, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "@/lib/firebase";

export const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const from = location.state?.from?.pathname || "/";

  // Detect ?type=influencer or ?type=affiliate
  const params = new URLSearchParams(location.search);
  const joinType = params.get("type"); // "influencer" or "affiliate"
  const redirectTo = joinType === "influencer" ? "/influencer" : joinType === "affiliate" ? "/affiliate" : from;

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // OTP form (Firebase Phone Auth)
  const [otpPhone, setOtpPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Reset password
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetStep, setResetStep] = useState(1);

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: loginEmail,
        password: loginPassword
      });
      login(response.data.user, response.data.token);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        phone: signupPhone || null
      });
      login(response.data.user, response.data.token);
      toast.success("Account created successfully!");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Initialize reCAPTCHA once on mount, reuse on every send
  const recaptchaWidgetId = useRef(null);

  useEffect(() => {
    // Only create if not already initialized
    if (!window.recaptchaVerifier) {
      const container = document.getElementById("recaptcha-container");
      if (!container) return;
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => setRecaptchaReady(true),
        "expired-callback": () => setRecaptchaReady(false),
      });
      window.recaptchaVerifier.render().then((widgetId) => {
        recaptchaWidgetId.current = widgetId;
      });
    }
    // Cleanup on unmount
    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (_) {}
        window.recaptchaVerifier = null;
        recaptchaWidgetId.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendOtp = async () => {
    const phone = otpPhone.trim().replace(/\s|-/g, "");
    const digits = phone.replace(/^\+91/, "").replace(/^91/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    const fullPhone = `+91${digits}`;

    if (!window.recaptchaVerifier) {
      toast.error("Security check loading. Please wait a moment and try again.");
      return;
    }

    setIsLoading(true);
    try {
      // Reset the reCAPTCHA token for re-use (does NOT re-render the widget)
      if (recaptchaWidgetId.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaWidgetId.current);
      }

      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setResendTimer(30);
      toast.success("OTP sent to your phone via SMS");
    } catch (error) {
      console.error("Firebase OTP error:", error);
      if (error.code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please try again later.");
      } else if (error.code === "auth/invalid-phone-number") {
        toast.error("Invalid phone number format");
      } else if (error.code === "auth/captcha-check-failed") {
        toast.error("reCAPTCHA failed. Please try again.");
      } else if (error.code === "auth/quota-exceeded") {
        toast.error("SMS quota exceeded. Please try later.");
      } else if (error.code === "auth/operation-not-allowed") {
        toast.error("Phone auth not enabled in Firebase Console.");
      } else {
        toast.error(`OTP Error: ${error.code || error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits entered
    const fullOtp = newDigits.join("");
    if (fullOtp.length === 6) {
      verifyFirebaseOtp(fullOtp);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs[focusIdx].current?.focus();
    if (pasted.length === 6) {
      verifyFirebaseOtp(pasted);
    }
  };

  const verifyFirebaseOtp = async (otpCode) => {
    if (!confirmationResult) {
      toast.error("Please send OTP first");
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(otpCode);
      const idToken = await userCredential.user.getIdToken();

      // Send Firebase ID token to our backend
      const response = await axios.post(`${API}/auth/firebase/verify`, { id_token: idToken });
      login(response.data.user, response.data.token);
      toast.success("Welcome!");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("OTP verify error:", error);
      if (error.code === "auth/invalid-verification-code") {
        toast.error("Invalid OTP. Please check and try again.");
      } else if (error.code === "auth/code-expired") {
        toast.error("OTP expired. Please resend.");
      } else {
        toast.error(error.response?.data?.detail || "Verification failed");
      }
      // Clear OTP digits on error
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      toast.error("Enter complete 6-digit OTP");
      return;
    }
    verifyFirebaseOtp(otpCode);
  };

  const handleResendOtp = () => {
    setOtpSent(false);
    setOtpDigits(["", "", "", "", "", ""]);
    setConfirmationResult(null);
    setTimeout(() => handleSendOtp(), 100);
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/auth/password/reset-request`, { email: resetEmail });
      setResetStep(2);
      toast.success("Reset OTP sent to your email");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send reset OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfirm = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${API}/auth/password/reset-confirm`, {
        email: resetEmail, otp: resetOtp, new_password: resetNewPw
      });
      toast.success("Password reset! Please sign in.");
      setShowReset(false);
      setResetStep(1);
      setResetEmail(""); setResetOtp(""); setResetNewPw("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-neutral-50" data-testid="auth-page">
      {/* reCAPTCHA container - always in DOM, never removed */}
      <div id="recaptcha-container" style={{ position: "fixed", top: 0, left: 0, zIndex: 9999 }} />
      <div className="w-full max-w-md mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 shadow-lg"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">Welcome to Pigma</h1>
            <p className="text-neutral-500 text-sm">
              Sign in to access exclusive drops and more
            </p>
          </div>

          {/* Google Login */}
          <Button
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full mb-6 py-6 border-neutral-300 hover:bg-neutral-50"
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">or continue with</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login" data-testid="login-tab">Sign In</TabsTrigger>
              <TabsTrigger value="signup" data-testid="signup-tab">Sign Up</TabsTrigger>
              <TabsTrigger value="otp" data-testid="otp-tab">OTP</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="login-email"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-neutral-800 text-white py-6 uppercase tracking-widest"
                  disabled={isLoading}
                  data-testid="login-submit"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="w-full text-sm text-gold hover:text-gold/80 transition-colors text-center mt-2"
                  data-testid="forgot-password-link"
                >
                  Forgot Password?
                </button>
              </form>

              {showReset && (
                <div className="mt-6 pt-6 border-t" data-testid="reset-password-section">
                  <h3 className="font-serif text-lg font-semibold mb-4">Reset Password</h3>
                  {resetStep === 1 ? (
                    <form onSubmit={handleResetRequest} className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="reset-email-input"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={isLoading} data-testid="reset-send-otp-btn">
                        {isLoading ? "Sending..." : "Send Reset OTP"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetConfirm} className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Enter OTP"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                        className="text-center tracking-widest"
                        maxLength={6}
                        required
                        data-testid="reset-otp-input"
                      />
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <Input
                          type="password"
                          placeholder="New password (min 6 chars)"
                          value={resetNewPw}
                          onChange={(e) => setResetNewPw(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="reset-new-password-input"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-gold hover:bg-gold/90 text-white" disabled={isLoading} data-testid="reset-confirm-btn">
                        {isLoading ? "Resetting..." : "Reset Password"}
                      </Button>
                    </form>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowReset(false); setResetStep(1); }}
                    className="w-full text-xs text-neutral-400 hover:text-neutral-600 mt-2 text-center"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="signup-name"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="signup-email"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="pl-10"
                    data-testid="signup-phone"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    data-testid="signup-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-neutral-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-neutral-400" />
                    )}
                  </button>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-neutral-800 text-white py-6 uppercase tracking-widest"
                  disabled={isLoading}
                  data-testid="signup-submit"
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>

            {/* OTP Tab - Firebase Phone Auth */}
            <TabsContent value="otp">
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <Input
                        type="tel"
                        placeholder="Enter 10-digit mobile number"
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value)}
                        className="pl-10"
                        required
                        autoComplete="tel"
                        data-testid="otp-phone"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> We'll send an SMS with a 6-digit verification code
                    </p>
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full bg-black hover:bg-neutral-800 text-white py-6 uppercase tracking-widest"
                      disabled={isLoading}
                      data-testid="send-otp-btn"
                    >
                      {isLoading ? "Sending..." : "Send OTP"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-2">
                      <p className="text-sm text-neutral-600">OTP sent to <span className="font-semibold text-black">+91 {otpPhone.replace(/^\+?91/, "").replace(/(\d{5})(\d{5})/, "$1 $2")}</span></p>
                    </div>

                    {/* 6-digit OTP input boxes */}
                    <div className="flex justify-center gap-2" data-testid="otp-boxes">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={otpRefs[i]}
                          type="text"
                          inputMode="numeric"
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={i === 0 ? handleOtpPaste : undefined}
                          className="w-11 h-12 text-center text-lg font-bold rounded-xl border-2 border-neutral-200 focus:border-black focus:ring-0 outline-none transition-colors bg-neutral-50"
                          data-testid={`otp-digit-${i}`}
                        />
                      ))}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-neutral-800 text-white py-6 uppercase tracking-widest"
                      disabled={isLoading || otpDigits.join("").length < 6}
                      data-testid="verify-otp-btn"
                    >
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </Button>

                    {/* Resend / Change number */}
                    <div className="flex items-center justify-between text-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => { setOtpSent(false); setOtpDigits(["","","","","",""]); setConfirmationResult(null); }}
                        className="text-neutral-500 hover:text-black text-xs px-0"
                      >
                        Change Number
                      </Button>
                      {resendTimer > 0 ? (
                        <span className="text-neutral-400 text-xs flex items-center gap-1">
                          <Timer className="h-3 w-3" /> Resend in {resendTimer}s
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleResendOtp}
                          disabled={isLoading}
                          className="text-gold hover:text-gold-dark text-xs px-0 font-semibold"
                          data-testid="resend-otp-btn"
                        >
                          Resend OTP
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>

          {/* Admin hint */}
          <p className="mt-6 text-xs text-center text-neutral-400">
            Admin? Use the <a href="/admin-login" className="text-gold hover:underline">Admin Portal</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
