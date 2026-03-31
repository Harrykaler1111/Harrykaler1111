import { useState, useEffect, useCallback } from "react";
import { Shield, ChevronDown, ChevronRight, Check, X, RotateCcw, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const getAdminHeaders = () => {
  const token = localStorage.getItem("pigma_admin_token");
  return { Authorization: `Bearer ${token}` };
};

export const PermissionsPanel = () => {
  const [admins, setAdmins] = useState([]);
  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [roleDefaults, setRoleDefaults] = useState({});
  const [hasCustom, setHasCustom] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const [admRes, modRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: getAdminHeaders() }),
        axios.get(`${API}/admin/permissions/modules`, { headers: getAdminHeaders() }),
      ]);
      setAdmins(admRes.data.filter(a => a.role !== "super_admin"));
      setModules(modRes.data.modules || {});
    } catch { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const selectAdmin = async (admin) => {
    setSelectedAdmin(admin);
    try {
      const res = await axios.get(`${API}/admin/permissions/${admin.admin_id}`, { headers: getAdminHeaders() });
      setPermissions(res.data.permissions || {});
      setRoleDefaults(res.data.role_defaults || {});
      setHasCustom(res.data.has_custom);
    } catch { toast.error("Failed to load permissions"); }
  };

  const toggleAction = (module, action) => {
    setPermissions(prev => {
      const current = prev[module] || [];
      const updated = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [module]: updated };
    });
  };

  const toggleModule = (module) => {
    setPermissions(prev => {
      const current = prev[module] || [];
      const allActions = modules[module] || [];
      const allSelected = allActions.every(a => current.includes(a));
      return { ...prev, [module]: allSelected ? [] : [...allActions] };
    });
  };

  const savePermissions = async () => {
    if (!selectedAdmin) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/permissions/${selectedAdmin.admin_id}`, { permissions }, { headers: getAdminHeaders() });
      setHasCustom(true);
      toast.success("Permissions saved successfully");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const resetToDefaults = async () => {
    if (!selectedAdmin) return;
    try {
      await axios.delete(`${API}/admin/permissions/${selectedAdmin.admin_id}`, { headers: getAdminHeaders() });
      setPermissions({ ...roleDefaults });
      setHasCustom(false);
      toast.success("Permissions reset to role defaults");
    } catch { toast.error("Failed to reset"); }
  };

  const roleColors = {
    product_manager: "bg-blue-500/20 text-blue-400",
    marketing_manager: "bg-purple-500/20 text-purple-400",
    finance_manager: "bg-green-500/20 text-green-400",
    support_manager: "bg-amber-500/20 text-amber-400",
    sales_manager: "bg-pink-500/20 text-pink-400",
  };

  if (loading) return <div className="animate-pulse h-40 bg-neutral-800 rounded-xl" />;

  return (
    <div className="space-y-6" data-testid="permissions-panel">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-gold" />
        <h2 className="text-lg font-bold text-white">Permission Management</h2>
      </div>
      <p className="text-sm text-neutral-400">Assign or revoke module access for each manager. Changes override role defaults.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin List */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-2 max-h-[600px] overflow-y-auto" data-testid="admin-list">
          <p className="text-xs text-neutral-400 uppercase font-medium mb-3">Select Manager</p>
          {admins.length === 0 && <p className="text-neutral-500 text-sm">No managers found</p>}
          {admins.map(a => (
            <button key={a.admin_id} onClick={() => selectAdmin(a)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedAdmin?.admin_id === a.admin_id ? "bg-gold/10 border border-gold/30" : "bg-neutral-900/50 border border-transparent hover:border-neutral-600"
              }`} data-testid={`admin-select-${a.admin_id}`}>
              <p className="text-sm font-medium text-white">{a.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-[10px] ${roleColors[a.role] || "bg-neutral-700 text-neutral-300"}`}>
                  {a.role?.replace("_", " ")}
                </Badge>
                <span className="text-[10px] text-neutral-500">{a.email}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-2">
          {!selectedAdmin ? (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-12 text-center">
              <Users className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">Select a manager to view & edit permissions</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{selectedAdmin.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={roleColors[selectedAdmin.role] || "bg-neutral-700 text-neutral-300"}>
                      {selectedAdmin.role?.replace("_", " ")}
                    </Badge>
                    {hasCustom && <Badge className="bg-amber-500/20 text-amber-400">Custom Permissions</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-neutral-600 text-neutral-400 text-xs" onClick={resetToDefaults} data-testid="reset-permissions-btn">
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset to Defaults
                  </Button>
                  <Button size="sm" className="bg-gold text-black hover:bg-gold/80 text-xs" onClick={savePermissions} disabled={saving} data-testid="save-permissions-btn">
                    <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>

              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden max-h-[520px] overflow-y-auto" data-testid="permissions-grid">
                {Object.entries(modules).map(([mod, actions]) => {
                  const currentActions = permissions[mod] || [];
                  const allSelected = actions.every(a => currentActions.includes(a));
                  const someSelected = currentActions.length > 0 && !allSelected;
                  const isDefault = JSON.stringify((roleDefaults[mod] || []).sort()) === JSON.stringify(currentActions.sort());

                  return (
                    <div key={mod} className="border-b border-neutral-700 last:border-b-0">
                      <button onClick={() => toggleModule(mod)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-700/30 transition-colors text-left">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            allSelected ? "bg-green-500 border-green-500" :
                            someSelected ? "bg-amber-500 border-amber-500" : "border-neutral-500"
                          }`}>
                            {(allSelected || someSelected) && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-white capitalize">{mod.replace("_", " ")}</span>
                          {!isDefault && <span className="text-[10px] text-amber-400 ml-1">(modified)</span>}
                        </div>
                        <span className="text-xs text-neutral-500">{currentActions.length}/{actions.length}</span>
                      </button>
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {actions.map(action => {
                          const active = currentActions.includes(action);
                          return (
                            <button key={action} onClick={() => toggleAction(mod, action)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                active ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-neutral-900 text-neutral-500 border border-neutral-700 hover:border-neutral-500"
                              }`} data-testid={`perm-${mod}-${action}`}>
                              {active ? <Check className="h-2.5 w-2.5 inline mr-1" /> : null}
                              {action.replace("_", " ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
