import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Edit2, Save, LogOut, Crown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, token, logout, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || ""
  });

  const handleSave = async () => {
    // For now, we'll just update local state
    // In a real app, you'd call an API to update the user
    setUser({ ...user, ...formData });
    setEditing(false);
    toast.success("Profile updated");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-neutral-50" data-testid="profile-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 space-y-4">
              <Link
                to="/profile"
                className="flex items-center gap-3 p-3 bg-neutral-50 font-medium"
              >
                <User className="h-5 w-5" />
                Profile
              </Link>
              <Link
                to="/orders"
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors"
              >
                <MapPin className="h-5 w-5" />
                Orders
              </Link>
              <Link
                to="/wishlist"
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors"
              >
                <Crown className="h-5 w-5" />
                Wishlist
              </Link>
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors text-gold"
                >
                  <Crown className="h-5 w-5" />
                  Admin Dashboard
                </Link>
              )}
              <Link
                to="/influencer"
                className="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors"
              >
                <Users className="h-5 w-5" />
                Influencer Program
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 w-full text-left hover:bg-red-50 text-red-500 transition-colors"
                data-testid="logout-btn"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl font-bold">Profile Information</h2>
                {!editing ? (
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(true)}
                    data-testid="edit-profile-btn"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button onClick={handleSave} data-testid="save-profile-btn">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center text-2xl font-bold text-black">
                    {user?.name?.[0]?.toUpperCase() || "P"}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user?.name}</p>
                    <p className="text-sm text-neutral-500 capitalize">{user?.role}</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm text-neutral-500 mb-1 block">Full Name</label>
                    {editing ? (
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        data-testid="input-name"
                      />
                    ) : (
                      <p className="font-medium">{user?.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-neutral-500 mb-1 block">Email</label>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-500 mb-1 block">Phone</label>
                    {editing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="input-phone"
                      />
                    ) : (
                      <p className="font-medium">{user?.phone || "Not provided"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-neutral-500 mb-1 block">Member Since</label>
                    <p className="font-medium">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
