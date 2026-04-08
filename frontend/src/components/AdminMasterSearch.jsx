import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, Package, CreditCard, Zap, AlertCircle, Activity, ShoppingCart, Crown, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pigma_admin_token")}` });

const ROLE_COLORS = {
  vendor: "bg-blue-500/20 text-blue-400",
  reseller: "bg-emerald-500/20 text-emerald-400",
  affiliate: "bg-purple-500/20 text-purple-400",
  influencer: "bg-pink-500/20 text-pink-400",
  admin: "bg-red-500/20 text-red-400",
};

export const AdminMasterSearch = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 1) { setSuggestions([]); return; }
    try {
      const { data } = await axios.get(`${API}/admin/master/search-autocomplete?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {}
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  const doSearch = async (displayId) => {
    if (!displayId) return;
    setLoading(true);
    setShowSuggestions(false);
    try {
      const { data } = await axios.get(`${API}/admin/master/search/${encodeURIComponent(displayId)}`, { headers: getHeaders() });
      setResult(data);
      setQuery(displayId);
      setActiveSection("profile");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Not found");
      setResult(null);
    }
    setLoading(false);
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied ${id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") doSearch(query.trim().toUpperCase());
  };

  const isUserResult = result?.type === "user";
  const profile = result?.profile || {};
  const summary = result?.summary || {};

  const sections = [
    { id: "profile", label: "Profile", icon: User, count: null },
    { id: "products", label: "Products", icon: Package, count: summary.total_products },
    { id: "credits", label: "Credits", icon: CreditCard, count: result?.credit_transactions?.length },
    { id: "promotions", label: "Promotions", icon: Zap, count: summary.total_promotions },
    { id: "issues", label: "Issues", icon: AlertCircle, count: summary.total_issues },
    { id: "activity", label: "Activity", icon: Activity, count: summary.total_activity },
    { id: "orders", label: "Orders", icon: ShoppingCart, count: summary.total_orders },
  ];

  return (
    <div className="space-y-6" data-testid="admin-master-search">
      <div>
        <h2 className="text-2xl font-bold text-white">Master Search</h2>
        <p className="text-neutral-400 text-sm mt-1">Enter any ID (VND-0001, RSL-0001, etc.) to see full data</p>
      </div>

      {/* Search bar */}
      <div className="relative" data-testid="master-search-bar">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search by ID, name, or email..."
              className="pl-10 bg-neutral-900 border-neutral-700 text-white h-11 text-sm"
              data-testid="master-search-input"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResult(null); setSuggestions([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={() => doSearch(query.trim().toUpperCase())} disabled={loading} className="bg-gold text-black hover:bg-gold/90 h-11 px-6" data-testid="master-search-btn">
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" /> : "Search"}
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-16 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden z-50 shadow-xl" data-testid="search-suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { doSearch(s.display_id); setShowSuggestions(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-700 text-left transition-colors"
              >
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${ROLE_COLORS[s.role] || "bg-neutral-600 text-neutral-300"}`}>{s.role}</span>
                <span className="text-xs font-mono text-gold">{s.display_id}</span>
                <span className="text-xs text-white truncate flex-1">{s.name}</span>
                <span className="text-[10px] text-neutral-500 truncate">{s.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {isUserResult && (
        <div className="space-y-4">
          {/* Profile Header Card */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5" data-testid="search-result-header">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center flex-shrink-0">
                <span className="font-serif text-xl font-bold text-gold">{(profile.store_name || profile.name || "?")[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-lg font-semibold text-white truncate">{profile.store_name || profile.name || profile.email}</h3>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${ROLE_COLORS[profile.user_role] || ""}`}>{profile.user_role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => copyId(profile.display_id)} className="flex items-center gap-1 text-gold text-sm font-mono hover:underline" data-testid="copy-display-id">
                    {profile.display_id} <Copy className="h-3 w-3" />
                  </button>
                  <span className="text-neutral-500 text-xs">{profile.email}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded ${profile.status === "approved" || profile.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{profile.status}</span>
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-4">
              {[
                { label: "Products", value: summary.total_products, color: "text-blue-400" },
                { label: "Promotions", value: summary.total_promotions, color: "text-purple-400" },
                { label: "Active Boosts", value: summary.active_boosts, color: "text-amber-400" },
                { label: "Balance", value: summary.credit_balance, color: "text-gold" },
                { label: "Spent", value: summary.credits_spent, color: "text-red-400" },
                { label: "Issues", value: `${summary.open_issues}/${summary.total_issues}`, color: "text-orange-400" },
                { label: "Orders", value: summary.total_orders, color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="bg-neutral-900 rounded-lg p-2 text-center">
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-neutral-500 uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-neutral-800/50 p-1 rounded-lg overflow-x-auto">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeSection === s.id ? "bg-gold/20 text-gold" : "text-neutral-400 hover:text-white"}`}
                data-testid={`section-${s.id}`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
                {s.count !== null && s.count !== undefined && <span className="text-[9px] bg-neutral-700 px-1.5 py-0.5 rounded-full">{s.count}</span>}
              </button>
            ))}
          </div>

          {/* Section content */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
            {activeSection === "profile" && <ProfileSection profile={profile} />}
            {activeSection === "products" && <TableSection items={result.products} columns={["product_id", "name", "price", "is_active", "approval_status", "created_at"]} />}
            {activeSection === "credits" && <CreditsSection wallet={result.wallet} transactions={result.credit_transactions} />}
            {activeSection === "promotions" && <TableSection items={result.promotions} columns={["display_id", "request_type", "product_name", "status", "estimated_cost", "cost_unit", "created_at"]} />}
            {activeSection === "issues" && <TableSection items={result.issues} columns={["display_id", "ticket_id", "category", "subject", "status", "priority", "created_at"]} />}
            {activeSection === "activity" && <TableSection items={result.activity} columns={["action", "entity_type", "details", "timestamp"]} />}
            {activeSection === "orders" && <TableSection items={result.orders} columns={["order_id", "status", "total", "created_at"]} />}
          </div>
        </div>
      )}

      {/* Non-user results (ISS, PRM, CRD) */}
      {result && !isUserResult && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gold mb-3 capitalize">{result.type?.replace("_", " ")}</h3>
          <ProfileSection profile={result.data} />
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ── */

const ProfileSection = ({ profile }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid="profile-section">
    {Object.entries(profile).filter(([k]) => !["_id", "password", "password_hash", "hashed_password", "collection"].includes(k)).map(([k, v]) => (
      <div key={k} className="bg-neutral-900 rounded-lg p-3">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">{k.replace(/_/g, " ")}</p>
        <p className="text-sm text-white break-all">{typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v ?? "-")}</p>
      </div>
    ))}
  </div>
);

const CreditsSection = ({ wallet, transactions }) => (
  <div className="space-y-4" data-testid="credits-section">
    {wallet && (
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gold">{wallet.balance || 0}</p>
          <p className="text-[10px] text-neutral-500 uppercase">Balance</p>
        </div>
        <div className="bg-neutral-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{wallet.total_purchased || 0}</p>
          <p className="text-[10px] text-neutral-500 uppercase">Purchased</p>
        </div>
        <div className="bg-neutral-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{wallet.total_spent || 0}</p>
          <p className="text-[10px] text-neutral-500 uppercase">Spent</p>
        </div>
      </div>
    )}
    <TableSection items={transactions} columns={["display_id", "type", "credits", "duration", "source", "status", "created_at"]} />
  </div>
);

const TableSection = ({ items, columns }) => {
  if (!items || items.length === 0) return <p className="text-neutral-400 text-sm">No data</p>;
  return (
    <div className="overflow-x-auto" data-testid="data-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-neutral-400 border-b border-neutral-700 text-xs">
            {columns.map(c => (
              <th key={c} className="text-left py-2 px-3 uppercase tracking-wider">{c.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-neutral-800 text-neutral-300 hover:bg-neutral-800/50">
              {columns.map(c => (
                <td key={c} className="py-2 px-3 text-xs max-w-[200px] truncate">
                  {c === "is_active" ? (item[c] ? "Active" : "Inactive") :
                   c.includes("created_at") || c === "timestamp" ? (item[c] ? new Date(item[c]).toLocaleString() : "-") :
                   c === "price" || c === "total" ? `Rs.${(item[c] || 0).toLocaleString()}` :
                   typeof item[c] === "object" ? JSON.stringify(item[c]).slice(0, 60) :
                   String(item[c] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
