import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL fragment
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        toast.error("Authentication failed - no session found");
        navigate("/auth", { replace: true });
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const response = await axios.post(`${API}/auth/google/callback?session_id=${sessionId}`);
        login(response.data.user, response.data.token);
        toast.success("Welcome!");
        
        // Clear the hash from URL and navigate
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Authentication failed");
        navigate("/auth", { replace: true });
      }
    };

    processAuth();
  }, [login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold mx-auto mb-4"></div>
        <p className="text-neutral-500">Completing authentication...</p>
      </div>
    </div>
  );
};
