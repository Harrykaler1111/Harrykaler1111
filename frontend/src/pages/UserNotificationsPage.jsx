import { useAuth } from "@/App";
import { Navigate } from "react-router-dom";
import { NotificationCenter } from "@/components/NotificationCenter";

export default function UserNotificationsPage() {
  const { user, token } = useAuth();

  if (!user || !token) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-neutral-950 pt-4 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <NotificationCenter prefix="user" />
      </div>
    </div>
  );
}
