import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, Shield, ShieldAlert, ShieldCheck, Clock, Send,
  XCircle, AlertTriangle, CheckCircle, Zap, BarChart3,
  RefreshCw, Webhook, MessageCircle, Eye
} from "lucide-react";
import { API, useAuth } from "@/App";
import axios from "axios";

const StatusDot = ({ status }) => {
  const colors = {
    healthy: "bg-emerald-400 shadow-emerald-400/50",
    expiring_soon: "bg-amber-400 shadow-amber-400/50",
    expired: "bg-red-400 shadow-red-400/50",
    unknown: "bg-neutral-400 shadow-neutral-400/50",
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-lg ${colors[status] || colors.unknown}`} />
  );
};

const TokenHealthCard = ({ connection }) => {
  const { token_status, token_days_remaining, user_token_expires_at, page_token_note } = connection;

  const statusConfig = {
    healthy: { icon: ShieldCheck, color: "text-emerald-400", bg: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/25", label: "Healthy" },
    expiring_soon: { icon: ShieldAlert, color: "text-amber-400", bg: "from-amber-500/15 to-amber-500/5 border-amber-500/25", label: "Expiring Soon" },
    expired: { icon: ShieldAlert, color: "text-red-400", bg: "from-red-500/15 to-red-500/5 border-red-500/25", label: "Expired" },
    unknown: { icon: Shield, color: "text-neutral-400", bg: "from-neutral-500/10 to-neutral-500/5 border-neutral-700", label: "Unknown" },
  };

  const cfg = statusConfig[token_status] || statusConfig.unknown;
  const Icon = cfg.icon;

  // Progress bar for token days remaining (60 day cycle)
  const maxDays = 60;
  const pct = token_days_remaining >= 0 ? Math.min((token_days_remaining / maxDays) * 100, 100) : 100;
  const barColor = token_status === "healthy" ? "bg-emerald-400" : token_status === "expiring_soon" ? "bg-amber-400" : "bg-red-400";

  return (
    <div className={`bg-gradient-to-br ${cfg.bg} border rounded-xl p-5`} data-testid="token-health-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-neutral-900/50 flex items-center justify-center ${cfg.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-mono">Token Health</p>
            <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>
          </div>
        </div>
        <StatusDot status={token_status} />
      </div>

      {token_days_remaining >= 0 ? (
        <>
          <div className="flex items-end justify-between mb-2">
            <p className="text-3xl font-bold text-white tabular-nums">{token_days_remaining}</p>
            <p className="text-xs text-neutral-500">days remaining</p>
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${barColor} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {user_token_expires_at && (
            <p className="text-[11px] text-neutral-500 mt-2">
              User token expires: {new Date(user_token_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-neutral-400 mt-1">Page Access Token is non-expiring</p>
      )}
      {page_token_note && (
        <p className="text-[11px] text-emerald-500/70 mt-2 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> {page_token_note}
        </p>
      )}
    </div>
  );
};

const DmStatCard = ({ label, sent, failed, icon: Icon, accent }) => {
  const total = sent + failed;
  const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
  return (
    <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-4" data-testid={`dm-stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${accent}`} />
        <p className="text-xs uppercase tracking-wider text-neutral-400 font-mono">{label}</p>
      </div>
      <div className="flex items-end gap-3">
        <p className="text-2xl font-bold text-white tabular-nums">{sent}</p>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 pb-1">
          <span className="text-emerald-400">sent</span>
          <span>/</span>
          <span className="text-red-400">{failed} failed</span>
        </div>
      </div>
      {total > 0 && (
        <div className="mt-2.5">
          <div className="w-full h-1 bg-neutral-700 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full bg-emerald-400 rounded-l-full"
              initial={{ width: 0 }}
              animate={{ width: `${rate}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {failed > 0 && (
              <motion.div
                className="h-full bg-red-400 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${100 - rate}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              />
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">{rate}% success rate</p>
        </div>
      )}
    </div>
  );
};

const WebhookEventRow = ({ event, index }) => {
  const typeIcons = {
    instagram: <MessageCircle className="h-3.5 w-3.5 text-pink-400" />,
    page: <Webhook className="h-3.5 w-3.5 text-blue-400" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 py-2.5 border-b border-neutral-800 last:border-0 group hover:bg-neutral-800/30 rounded px-2 -mx-2 transition-colors"
      data-testid={`webhook-event-${index}`}
    >
      <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0">
        {typeIcons[event.type] || <Eye className="h-3.5 w-3.5 text-neutral-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-200 truncate">{event.summary}</p>
        <p className="text-[11px] text-neutral-500">
          {event.timestamp ? new Date(event.timestamp).toLocaleString("en-IN", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
          }) : "—"}
        </p>
      </div>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 uppercase tracking-wider font-mono flex-shrink-0">
        {event.type}
      </span>
    </motion.div>
  );
};

export const InstagramHealthDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await axios.get(`${API}/instagram/health-dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch {
      // silently fail — user might not be influencer
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(iv);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { connection, dm_stats, webhook_events, automation } = data;

  return (
    <div className="space-y-6" data-testid="instagram-health-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            <Activity className="h-4.5 w-4.5 text-pink-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Connection Health</h3>
            <p className="text-xs text-neutral-500">Real-time monitoring</p>
          </div>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-md hover:bg-neutral-800"
          data-testid="health-refresh-btn"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Token + Automation Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connection.connected && <TokenHealthCard connection={connection} />}

        {/* Automation Status */}
        <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-5" data-testid="automation-status-card">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${automation.enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-700/50 text-neutral-400"}`}>
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-mono">Automation</p>
              <p className={`font-semibold ${automation.enabled ? "text-emerald-400" : "text-neutral-400"}`}>
                {automation.enabled ? "Active" : "Disabled"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-900/40 rounded-lg p-3">
              <p className="text-xl font-bold text-white tabular-nums">{automation.posts_registered}</p>
              <p className="text-[11px] text-neutral-500">Posts Registered</p>
            </div>
            <div className="bg-neutral-900/40 rounded-lg p-3">
              <p className="text-xl font-bold text-white tabular-nums">{automation.active_posts}</p>
              <p className="text-[11px] text-neutral-500">Auto-DM Active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-neutral-500">
            <span>Hourly DMs: {automation.dm_rate_limit_hour}/50</span>
            <span className="text-neutral-700">|</span>
            <span>Daily DMs: {automation.dm_rate_limit_day}/200</span>
          </div>
        </div>
      </div>

      {/* DM Delivery Rates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-neutral-400" />
          <p className="text-sm font-medium text-neutral-300">DM Delivery Rates</p>
        </div>

        {/* All-time banner */}
        <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-4 mb-3" data-testid="dm-alltime-stats">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-mono mb-1">All Time</p>
              <p className="text-3xl font-bold text-white tabular-nums">{dm_stats.total_all}</p>
              <p className="text-xs text-neutral-500">total DMs</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{dm_stats.total_sent}</p>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1"><Send className="h-3 w-3" /> Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400 tabular-nums">{dm_stats.total_failed}</p>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1"><XCircle className="h-3 w-3" /> Failed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400 tabular-nums">{dm_stats.total_pending}</p>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold tabular-nums ${dm_stats.success_rate >= 90 ? "text-emerald-400" : dm_stats.success_rate >= 70 ? "text-amber-400" : "text-red-400"}`}>
                  {dm_stats.success_rate}%
                </p>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Success</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DmStatCard label="Today" sent={dm_stats.today.sent} failed={dm_stats.today.failed} icon={Zap} accent="text-pink-400" />
          <DmStatCard label="This Week" sent={dm_stats.this_week.sent} failed={dm_stats.this_week.failed} icon={BarChart3} accent="text-blue-400" />
          <DmStatCard label="This Month" sent={dm_stats.this_month.sent} failed={dm_stats.this_month.failed} icon={Activity} accent="text-purple-400" />
        </div>
      </div>

      {/* Webhook Event Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-300">Webhook Event Log</p>
          </div>
          <span className="text-[11px] text-neutral-500">{webhook_events.length} recent events</span>
        </div>
        <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl p-4 max-h-72 overflow-y-auto" data-testid="webhook-event-log">
          {webhook_events.length > 0 ? (
            webhook_events.map((evt, i) => <WebhookEventRow key={i} event={evt} index={i} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
              <AlertTriangle className="h-6 w-6 mb-2 text-neutral-600" />
              <p className="text-sm">No webhook events yet</p>
              <p className="text-xs text-neutral-600 mt-1">Events will appear here when Instagram sends notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
