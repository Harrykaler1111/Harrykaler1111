import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, FileText } from "lucide-react";
import { API } from "@/App";
import axios from "axios";

export const PolicyPage = () => {
  const { slug } = useParams();
  const [policy, setPolicy] = useState(null);
  const [allPolicies, setAllPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [pRes, aRes] = await Promise.all([
          axios.get(`${API}/policies/${slug}`),
          axios.get(`${API}/policies`)
        ]);
        setPolicy(pRes.data);
        setAllPolicies(aRes.data);
      } catch {
        setPolicy(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen pt-28 text-center px-4">
        <h1 className="font-serif text-3xl font-bold mb-4">Page Not Found</h1>
        <p className="text-neutral-500">This policy page doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 bg-white" data-testid="policy-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-neutral-400 mb-8">
          <Link to="/" className="hover:text-black transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-black">{policy.title}</span>
        </nav>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2" data-testid="policy-title">
            {policy.title}
          </h1>
          <p className="text-xs text-neutral-400 mb-8">
            Last updated: {new Date(policy.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          {/* Markdown-style content rendering */}
          <div className="prose prose-neutral max-w-none" data-testid="policy-content">
            {policy.content.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-8 mb-4 font-serif">{line.replace("## ", "")}</h2>;
              if (line.startsWith("**") && line.endsWith("**")) return <h3 key={i} className="text-base font-bold mt-6 mb-2">{line.replace(/\*\*/g, "")}</h3>;
              if (line.startsWith("- ")) return <li key={i} className="text-sm text-neutral-600 ml-4 mb-1.5 list-disc">{line.replace("- ", "")}</li>;
              if (line.match(/^\d+\.\s/)) return <li key={i} className="text-sm text-neutral-600 ml-4 mb-1.5 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm text-neutral-600 leading-relaxed mb-2">{line}</p>;
            })}
          </div>
        </motion.div>

        {/* Other policies sidebar */}
        {allPolicies.length > 1 && (
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <h3 className="text-xs uppercase tracking-widest text-neutral-400 font-medium mb-4">Other Policies</h3>
            <div className="flex flex-wrap gap-3">
              {allPolicies.filter(p => p.slug !== slug).map(p => (
                <Link
                  key={p.slug}
                  to={`/policy/${p.slug}`}
                  className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black bg-neutral-50 hover:bg-neutral-100 px-4 py-2 rounded-lg transition-colors"
                  data-testid={`policy-link-${p.slug}`}
                >
                  <FileText className="h-3.5 w-3.5" /> {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyPage;
