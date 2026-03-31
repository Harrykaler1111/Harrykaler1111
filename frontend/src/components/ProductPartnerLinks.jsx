import { useState, useEffect } from "react";
import { Link2, Copy, Check, DollarSign, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { useAuth, API } from "@/App";

const getHeaders = () => {
  const token = localStorage.getItem("pigma_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const ProductPartnerLinks = ({ product }) => {
  const { user } = useAuth();
  const [affStatus, setAffStatus] = useState(null);
  const [resStatus, setResStatus] = useState(null);
  const [affLink, setAffLink] = useState("");
  const [resLink, setResLink] = useState("");
  const [margin, setMargin] = useState(0);
  const [resPrice, setResPrice] = useState(product.price);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!user) return;
    const h = getHeaders();
    // Check affiliate status for this product
    axios.get(`${API}/affiliates/check-product/${product.product_id}`, { headers: h })
      .then(r => {
        setAffStatus(r.data);
        if (r.data.has_link) setAffLink(r.data.affiliate_link);
      }).catch(() => {});
    // Check reseller status for this product
    axios.get(`${API}/resellers/check-product/${product.product_id}`, { headers: h })
      .then(r => {
        setResStatus(r.data);
        if (r.data.has_link) {
          setResLink(r.data.reseller_link);
          setMargin(r.data.margin || 0);
          setResPrice(r.data.reseller_price || product.price);
        }
      }).catch(() => {});
  }, [user, product.product_id, product.price]);

  const generateAffLink = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/affiliates/generate-link`,
        { product_id: product.product_id }, { headers: getHeaders() });
      setAffLink(res.data.affiliate_link);
      toast.success(`Affiliate link generated! Earn ₹${res.data.estimated_earning} per sale`);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setGenerating(false); }
  };

  const generateResLink = async () => {
    if (margin < 0) { toast.error("Margin must be positive"); return; }
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/resellers/generate-link`,
        { product_id: product.product_id, margin }, { headers: getHeaders() });
      setResLink(res.data.reseller_link);
      setResPrice(res.data.reseller_price);
      toast.success(`Reseller link generated! Selling at ₹${res.data.reseller_price}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setGenerating(false); }
  };

  const copyToClipboard = (link, type) => {
    navigator.clipboard.writeText(link);
    setCopied(type);
    toast.success("Link copied!");
    setTimeout(() => setCopied(""), 2000);
  };

  // Don't show anything if user is not logged in or not an affiliate/reseller
  if (!user) return null;
  const showAff = affStatus?.is_affiliate && affStatus.status === "approved";
  const showRes = resStatus?.is_reseller && resStatus.status === "approved";
  if (!showAff && !showRes) return null;

  return (
    <div className="mt-6 space-y-3" data-testid="product-partner-links">
      {/* Affiliate Section */}
      {showAff && (
        <div className="border-2 border-blue-500 bg-blue-50 rounded-xl p-4" data-testid="product-affiliate-section">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">Affiliate Program</span>
            <span className="text-xs font-semibold text-blue-500 ml-auto">{affStatus.commission_rate}% commission</span>
          </div>
          {affLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg p-2.5">
                <input readOnly value={affLink} className="flex-1 bg-transparent text-xs text-blue-800 font-mono outline-none truncate" data-testid="affiliate-link-display" />
                <button onClick={() => copyToClipboard(affLink, "aff")}
                  className="shrink-0 text-blue-600 hover:text-blue-800 transition-colors" data-testid="copy-affiliate-link">
                  {copied === "aff" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs font-semibold text-blue-600">
                Earn ₹{(product.price * affStatus.commission_rate / 100).toFixed(0)} on each sale
              </p>
            </div>
          ) : (
            <Button size="sm" onClick={generateAffLink} disabled={generating}
              className="bg-blue-600 text-white hover:bg-blue-700 text-xs h-9 font-semibold shadow-md" data-testid="generate-affiliate-link-btn">
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> {generating ? "Generating..." : "Generate Affiliate Link"}
            </Button>
          )}
        </div>
      )}

      {/* Reseller Section */}
      {showRes && (
        <div className="border-2 border-green-500 bg-green-50 rounded-xl p-4" data-testid="product-reseller-section">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">Sell this Product</span>
          </div>
          {resLink ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-600 font-medium">Base: ₹{product.price?.toLocaleString()}</span>
                <span className="text-neutral-600 font-medium">Your margin: ₹{margin}</span>
                <span className="text-green-700 font-bold">Selling at: ₹{resPrice?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-2.5">
                <input readOnly value={resLink} className="flex-1 bg-transparent text-xs text-green-800 font-mono outline-none truncate" data-testid="reseller-link-display" />
                <button onClick={() => copyToClipboard(resLink, "res")}
                  className="shrink-0 text-green-600 hover:text-green-800 transition-colors" data-testid="copy-reseller-link">
                  {copied === "res" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-400 hover:bg-green-100 font-medium"
                onClick={() => { setResLink(""); setResPrice(product.price); }} data-testid="update-reseller-margin">
                Update margin
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-green-700 font-medium mb-1 block">Your Margin (₹)</label>
                  <Input type="number" min="0" value={margin}
                    onChange={e => { const m = parseFloat(e.target.value) || 0; setMargin(m); setResPrice(product.price + m); }}
                    className="bg-white border-green-300 text-green-900 h-9 text-sm font-medium" data-testid="reseller-margin-input" />
                </div>
                <div className="text-right">
                  <label className="text-xs text-green-700 font-medium mb-1 block">Selling Price</label>
                  <p className="text-lg font-bold text-green-700">₹{resPrice?.toLocaleString()}</p>
                </div>
              </div>
              <Button size="sm" onClick={generateResLink} disabled={generating}
                className="bg-green-600 text-white hover:bg-green-700 text-xs h-9 font-semibold shadow-md" data-testid="generate-reseller-link-btn">
                <DollarSign className="h-3.5 w-3.5 mr-1.5" /> {generating ? "Generating..." : "Generate Reseller Link"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
