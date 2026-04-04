import { useState, useEffect, useCallback } from "react";
import { Zap, CreditCard, ShoppingBag, TrendingUp, Plus, History, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

const getVendorHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("pigma_vendor_token")}`
});

const CREDIT_PACKS = [
  { credits: 100, price: 100, label: "Starter", tag: null },
  { credits: 500, price: 450, label: "Growth", tag: "10% OFF" },
  { credits: 1000, price: 800, label: "Pro", tag: "20% OFF" },
  { credits: 5000, price: 3500, label: "Enterprise", tag: "30% OFF" },
];

export const VendorCartBooster = ({ vendor }) => {
  const [wallet, setWallet] = useState({ balance: 0, total_purchased: 0, total_spent: 0 });
  const [promotions, setPromotions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("boost");
  const [buying, setBuying] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [spendForm, setSpendForm] = useState({ product_id: "", credits: "50", placement: "upsell" });

  const fetchData = useCallback(async () => {
    try {
      const [walletRes, promoRes, txnRes, prodRes] = await Promise.all([
        axios.get(`${API}/vendor-credits/wallet`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendor-credits/promotions`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendor-credits/transactions`, { headers: getVendorHeaders() }),
        axios.get(`${API}/vendors/products`, { headers: getVendorHeaders() }).catch(() => ({ data: [] }))
      ]);
      setWallet(walletRes.data);
      setPromotions(promoRes.data || []);
      setTransactions(txnRes.data || []);
      const prods = prodRes.data;
      setProducts(Array.isArray(prods) ? prods : prods?.products || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buyCredits = async (credits, price) => {
    setBuying(true);
    try {
      await axios.post(`${API}/vendor-credits/purchase`, {
        amount: price,
        credits: credits
      }, { headers: getVendorHeaders() });
      toast.success(`${credits} credits added! (Mock Payment)`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Purchase failed");
    } finally { setBuying(false); }
  };

  const buyCustom = async () => {
    const amt = parseInt(customAmount);
    if (!amt || amt < 10) { toast.error("Minimum 10 credits"); return; }
    await buyCredits(amt, amt);
    setCustomAmount("");
  };

  const spendCredits = async () => {
    if (!spendForm.product_id) { toast.error("Select a product"); return; }
    const credits = parseInt(spendForm.credits);
    if (!credits || credits < 10) { toast.error("Minimum 10 credits"); return; }

    try {
      await axios.post(`${API}/vendor-credits/spend`, {
        product_id: spendForm.product_id,
        credits: credits,
        placement: spendForm.placement
      }, { headers: getVendorHeaders() });
      toast.success("Product promoted in Cart Booster!");
      setSpendForm({ product_id: "", credits: "50", placement: "upsell" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to promote");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
    </div>
  );

  const approvedProducts = products.filter(p => p.approval_status === "approved");

  return (
    <div className="space-y-6" data-testid="vendor-cart-booster-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-gold" /> Cart Booster Credits
          </h2>
          <p className="text-sm text-neutral-400 mt-1">Buy credits to promote your products in cart upsells</p>
        </div>
        <div className="flex gap-2">
          {["boost", "history"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${tab === t ? "bg-gold text-black font-medium" : "text-neutral-400 hover:bg-neutral-800"}`}
              data-testid={`booster-tab-${t}`}>
              {t === "boost" ? "Boost Products" : "History"}
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/30 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-gold text-xs font-mono uppercase tracking-wider mb-1">Cart Booster Wallet</p>
            <p className="text-4xl font-bold text-white" data-testid="booster-balance">{wallet.balance}</p>
            <p className="text-neutral-400 text-xs mt-1">
              Credits &bull; Purchased: {wallet.total_purchased} &bull; Spent: {wallet.total_spent}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-neutral-900/50 rounded-lg px-3 py-2 border border-neutral-700">
            <CreditCard className="h-4 w-4 text-neutral-500" />
            <span className="text-xs text-neutral-400">1 Credit = ₹1</span>
          </div>
        </div>
      </div>

      {tab === "boost" && (
        <>
          {/* Credit Packs */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-neutral-400" /> Buy Credits
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.credits}
                  onClick={() => buyCredits(pack.credits, pack.price)}
                  disabled={buying}
                  className="relative bg-neutral-800 border border-neutral-700 hover:border-gold/50 rounded-xl p-4 text-left transition-all group"
                  data-testid={`credit-pack-${pack.credits}`}
                >
                  {pack.tag && (
                    <span className="absolute -top-2 right-3 bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pack.tag}
                    </span>
                  )}
                  <p className="text-2xl font-bold text-white group-hover:text-gold transition-colors">{pack.credits}</p>
                  <p className="text-xs text-neutral-500 mt-1">{pack.label}</p>
                  <p className="text-sm font-medium text-gold mt-2">₹{pack.price}</p>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="flex items-center gap-3 mt-3">
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Custom credits amount"
                className="bg-neutral-800 border-neutral-700 text-white max-w-xs"
                data-testid="custom-credits-input"
              />
              <Button onClick={buyCustom} disabled={buying}
                className="bg-gold hover:bg-gold/90 text-black"
                data-testid="buy-custom-credits-btn">
                {buying ? "Processing..." : "Buy"}
              </Button>
            </div>
          </div>

          {/* Promote Product */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-gold" /> Promote in Cart Booster
            </h3>
            <p className="text-xs text-neutral-500">
              Spend credits to have your product appear in the Cart Booster upsell section when customers open their cart.
              Higher credits = more visibility.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Select value={spendForm.product_id} onValueChange={(v) => setSpendForm(f => ({ ...f, product_id: v }))}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white" data-testid="booster-product-select">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {approvedProducts.map((p) => (
                    <SelectItem key={p.product_id} value={p.product_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={spendForm.placement} onValueChange={(v) => setSpendForm(f => ({ ...f, placement: v }))}>
                <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white" data-testid="booster-placement-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upsell">Cart Upsell</SelectItem>
                  <SelectItem value="featured">Featured Spotlight</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                value={spendForm.credits}
                onChange={(e) => setSpendForm(f => ({ ...f, credits: e.target.value }))}
                placeholder="Credits to spend"
                min="10"
                className="bg-neutral-900 border-neutral-700 text-white"
                data-testid="booster-credits-input"
              />

              <Button onClick={spendCredits} className="bg-gold hover:bg-gold/90 text-black" data-testid="booster-promote-btn">
                <Zap className="h-4 w-4 mr-1" /> Boost Product
              </Button>
            </div>
          </div>

          {/* Active Promotions */}
          {promotions.filter(p => p.is_active).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" /> Active Boosts
              </h3>
              <div className="space-y-2">
                {promotions.filter(p => p.is_active).map((promo) => (
                  <div
                    key={promo.promo_id}
                    className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-5 py-3 flex items-center justify-between"
                    data-testid={`active-boost-${promo.promo_id}`}
                  >
                    <div>
                      <p className="text-white font-medium">{promo.product_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                        <span className="text-xs text-neutral-500 capitalize">{promo.placement}</span>
                        <span className="text-xs text-neutral-500">{promo.credits_spent} credits</span>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {new Date(promo.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-neutral-400" /> Transaction History
          </h3>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">No transactions yet</div>
          ) : (
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-700">
                    <TableHead className="text-neutral-400">Date</TableHead>
                    <TableHead className="text-neutral-400">Type</TableHead>
                    <TableHead className="text-neutral-400">Credits</TableHead>
                    <TableHead className="text-neutral-400">Details</TableHead>
                    <TableHead className="text-neutral-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.txn_id} className="border-neutral-700" data-testid={`booster-txn-${txn.txn_id}`}>
                      <TableCell className="text-neutral-300 text-sm">
                        {new Date(txn.created_at).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          txn.type === "purchase" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {txn.type === "purchase" ? "Purchase" : "Spent"}
                        </span>
                      </TableCell>
                      <TableCell className={`font-medium ${txn.type === "purchase" ? "text-green-400" : "text-amber-400"}`}>
                        {txn.type === "purchase" ? "+" : ""}{txn.credits}
                      </TableCell>
                      <TableCell className="text-neutral-400 text-xs">
                        {txn.type === "purchase"
                          ? `₹${txn.amount_inr} payment`
                          : `${txn.placement || "upsell"} promotion`
                        }
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">{txn.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
