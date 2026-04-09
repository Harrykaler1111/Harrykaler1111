import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Search, Filter, Check, CheckCheck, Trash2, ChevronLeft, ChevronRight,
  ShoppingCart, Ticket, Megaphone, Coins, FileText, Cog, ExternalLink, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "order", label: "Orders", icon: ShoppingCart },
  { value: "issue", label: "Issues", icon: Ticket },
  { value: "promotion", label: "Promotions", icon: Megaphone },
  { value: "credit", label: "Credits", icon: Coins },
  { value: "kyc", label: "KYC", icon: FileText },
  { value: "system", label: "System", icon: Cog },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TYPE_ICONS = {
  order: ShoppingCart,
  issue: Ticket,
  promotion: Megaphone,
  credit: Coins,
  kyc: FileText,
  system: Cog,
};

const PRIORITY_STYLES = {
  high: "border-l-red-500 bg-red-500/5",
  medium: "border-l-amber-500 bg-amber-500/5",
  low: "border-l-neutral-600 bg-neutral-600/5",
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const PER_PAGE = 20;

export const NotificationCenter = ({ prefix = "admin" }) => {
  const tokenKey = prefix === "vendor" ? "pigma_vendor_token" : prefix === "user" ? "pigma_token" : "pigma_admin_token";
  const token = localStorage.getItem(tokenKey);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Selection
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const fetchNotifications = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String((pg - 1) * PER_PAGE),
        limit: String(PER_PAGE),
      });
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (dateFrom) params.set("date_from", new Date(dateFrom).toISOString());
      if (dateTo) params.set("date_to", new Date(dateTo + "T23:59:59").toISOString());

      const { data } = await axios.get(`${API}/notifications/${prefix}/center?${params}`, { headers });
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unread_count || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, priorityFilter, dateFrom, dateTo, prefix, token]);

  useEffect(() => {
    fetchNotifications(1);
  }, [typeFilter, statusFilter, priorityFilter, dateFrom, dateTo]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSelected(new Set());
    setSelectAll(false);
    fetchNotifications(1);
  };

  const goPage = (pg) => {
    setSelected(new Set());
    setSelectAll(false);
    fetchNotifications(pg);
  };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      setSelected(new Set(notifications.map(n => n.notification_id)));
      setSelectAll(true);
    }
  };

  // Bulk operations
  const bulkMarkRead = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await axios.put(`${API}/notifications/${prefix}/bulk-read`, { notification_ids: ids }, { headers });
      toast.success(`Marked ${ids.length} as read`);
      setSelected(new Set());
      setSelectAll(false);
      fetchNotifications(page);
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await axios.delete(`${API}/notifications/${prefix}/bulk-delete`, { data: { notification_ids: ids }, headers });
      toast.success(`Deleted ${ids.length} notifications`);
      setSelected(new Set());
      setSelectAll(false);
      fetchNotifications(page);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/${prefix}/read-all`, {}, { headers });
      toast.success("All notifications marked as read");
      fetchNotifications(page);
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await axios.put(`${API}/notifications/${prefix}/read/${notif.notification_id}`, {}, { headers });
        setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        toast.error("Failed to mark as read");
      }
    }
    if (notif.redirect_url) {
      navigate(notif.redirect_url);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = search || typeFilter !== "all" || statusFilter !== "all" || priorityFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-5" data-testid="notification-center">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2" data-testid="nc-title">
            <Bell className="h-5 w-5 text-[#C9A050]" />
            Notification Center
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {total} total &middot; {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs"
              data-testid="nc-mark-all-read">
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 space-y-3" data-testid="nc-filters">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:border-[#C9A050] focus:outline-none transition-colors"
              data-testid="nc-search-input"
            />
          </div>
          <Button type="submit" size="sm" className="bg-[#C9A050] text-black hover:bg-[#b8903f] px-4" data-testid="nc-search-btn">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 items-center">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 px-3 py-1.5 focus:border-[#C9A050] focus:outline-none"
            data-testid="nc-filter-type">
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 px-3 py-1.5 focus:border-[#C9A050] focus:outline-none"
            data-testid="nc-filter-status">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 px-3 py-1.5 focus:border-[#C9A050] focus:outline-none"
            data-testid="nc-filter-priority">
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 px-3 py-1.5 focus:border-[#C9A050] focus:outline-none"
            data-testid="nc-filter-date-from" />
          <span className="text-neutral-600 text-xs">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 px-3 py-1.5 focus:border-[#C9A050] focus:outline-none"
            data-testid="nc-filter-date-to" />

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 ml-1" data-testid="nc-clear-filters">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#C9A050]/10 border border-[#C9A050]/30 rounded-lg" data-testid="nc-bulk-bar">
          <span className="text-xs text-[#C9A050] font-medium">{selected.size} selected</span>
          <Button size="sm" variant="ghost" onClick={bulkMarkRead}
            className="text-xs text-neutral-300 hover:text-white h-7 px-2" data-testid="nc-bulk-read">
            <Check className="h-3 w-3 mr-1" /> Mark read
          </Button>
          <Button size="sm" variant="ghost" onClick={bulkDelete}
            className="text-xs text-red-400 hover:text-red-300 h-7 px-2" data-testid="nc-bulk-delete">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          <button onClick={() => { setSelected(new Set()); setSelectAll(false); }} className="text-xs text-neutral-500 hover:text-white ml-auto">
            Cancel
          </button>
        </div>
      )}

      {/* Notification List */}
      <div className="border border-neutral-800 rounded-xl overflow-hidden" data-testid="nc-list">
        {/* List Header */}
        <div className="bg-neutral-900 px-4 py-2.5 border-b border-neutral-800 flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={toggleSelectAll}
            className="rounded border-neutral-600 bg-neutral-800 text-[#C9A050] focus:ring-[#C9A050] h-3.5 w-3.5"
            data-testid="nc-select-all"
          />
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
            {total} notification{total !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-[#C9A050]/30 border-t-[#C9A050] rounded-full mx-auto" />
            <p className="text-xs text-neutral-500 mt-3">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center" data-testid="nc-empty">
            <Bell className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">{hasFilters ? "No notifications match your filters" : "No notifications yet"}</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-[#C9A050] mt-2 hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            const isSelected = selected.has(n.notification_id);
            return (
              <div
                key={n.notification_id}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-neutral-800/60 border-l-2 transition-all hover:bg-neutral-800/40 ${
                  n.is_read ? "border-l-transparent opacity-70" : PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.medium
                } ${isSelected ? "bg-[#C9A050]/5" : ""}`}
                data-testid={`nc-item-${n.notification_id}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(n.notification_id)}
                  className="rounded border-neutral-600 bg-neutral-800 text-[#C9A050] focus:ring-[#C9A050] h-3.5 w-3.5 mt-1 flex-shrink-0"
                  data-testid={`nc-check-${n.notification_id}`}
                />
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                  n.is_read ? "bg-neutral-800" : "bg-[#C9A050]/10"
                }`}>
                  <Icon className={`h-4 w-4 ${n.is_read ? "text-neutral-500" : "text-[#C9A050]"}`} />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNotifClick(n)}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold truncate ${n.is_read ? "text-neutral-400" : "text-white"}`}>
                      {n.title}
                    </span>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A050] flex-shrink-0" />}
                    {n.priority === "high" && (
                      <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold flex-shrink-0">URGENT</span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-neutral-500">{formatDate(n.created_at)}</span>
                    <span className="text-[10px] text-neutral-600">{timeAgo(n.created_at)}</span>
                    {n.type && (
                      <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase tracking-wider">{n.type}</span>
                    )}
                    {n.redirect_url && <ExternalLink className="h-2.5 w-2.5 text-neutral-600" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between" data-testid="nc-pagination">
          <span className="text-xs text-neutral-500">
            Page {page} of {pages} &middot; {total} total
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => goPage(page - 1)}
              className="border-neutral-700 text-neutral-300 h-8 w-8 p-0 disabled:opacity-30" data-testid="nc-prev">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              let pg;
              if (pages <= 5) pg = i + 1;
              else if (page <= 3) pg = i + 1;
              else if (page >= pages - 2) pg = pages - 4 + i;
              else pg = page - 2 + i;
              return (
                <Button key={pg} size="sm" variant={pg === page ? "default" : "outline"} onClick={() => goPage(pg)}
                  className={`h-8 w-8 p-0 text-xs ${pg === page ? "bg-[#C9A050] text-black" : "border-neutral-700 text-neutral-300"}`}
                  data-testid={`nc-page-${pg}`}>
                  {pg}
                </Button>
              );
            })}
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => goPage(page + 1)}
              className="border-neutral-700 text-neutral-300 h-8 w-8 p-0 disabled:opacity-30" data-testid="nc-next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
