import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, Archive, CheckCircle2, XCircle, AlertTriangle,
  Download, Loader2, Eye, Trash2, Package, ArrowRight, RefreshCw, History, Undo2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { API } from "@/App";
import { toast } from "sonner";
import axios from "axios";

export const BulkUpload = ({ mode = "admin" }) => {
  const [view, setView] = useState("upload"); // upload | history
  const [step, setStep] = useState("upload"); // upload | preview | publishing | done
  const [csvFile, setCsvFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const csvRef = useRef(null);
  const zipRef = useRef(null);

  const getHeaders = () => {
    const tokenKey = mode === "vendor" ? "pigma_vendor_token" : "pigma_admin_token";
    const token = localStorage.getItem(tokenKey);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/products/bulk/sample-csv`, {
        headers: getHeaders(),
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_upload_template.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to download template");
    }
  };

  const handlePreview = async () => {
    if (!csvFile) { toast.error("Please select a CSV or Excel file"); return; }
    setLoading(true);

    const formData = new FormData();
    formData.append("file", csvFile);
    if (zipFile) formData.append("zip_file", zipFile);

    try {
      const res = await axios.post(`${API}/products/bulk/preview`, formData, {
        headers: getHeaders(),
        timeout: 300000,
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      setPreviewData(res.data);
      setStep("preview");
      setUploadProgress(0);
      toast.success(`Parsed ${res.data.total} products (${res.data.valid_count} valid)`);
    } catch (e) {
      setUploadProgress(0);
      const msg = e.response?.data?.detail || e.message || "Failed to parse file";
      toast.error(msg, { duration: 8000 });
    } finally { setLoading(false); }
  };

  const handlePublish = async () => {
    if (!previewData?.session_id) return;
    setStep("publishing");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API}/products/bulk/publish/${previewData.session_id}`,
        {},
        { headers: getHeaders(), timeout: 300000 }
      );
      setPublishResult(res.data);
      setStep("done");
      toast.success(`Created ${res.data.total_created} products!`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to publish");
      setStep("preview");
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep("upload");
    setCsvFile(null);
    setZipFile(null);
    setPreviewData(null);
    setPublishResult(null);
    if (csvRef.current) csvRef.current.value = "";
    if (zipRef.current) zipRef.current.value = "";
  };

  const handleDrop = useCallback((e, type) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (type === "csv") {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["csv", "xlsx", "xls"].includes(ext)) {
        toast.error("Please drop a CSV or Excel file"); return;
      }
      setCsvFile(file);
    } else {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        toast.error("Please drop a ZIP file"); return;
      }
      setZipFile(file);
    }
  }, []);

  return (
    <div className="space-y-6" data-testid="bulk-upload-section">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-white">Bulk Product Upload</h2>
          <p className="text-sm text-neutral-400 mt-1">Upload products via CSV/Excel with optional image ZIP</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-neutral-800/50 border border-neutral-700 rounded-lg p-0.5">
            <button
              onClick={() => setView("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "upload" ? "bg-gold text-black" : "text-neutral-400 hover:text-white"
              }`}
              data-testid="bulk-tab-upload"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
            <button
              onClick={() => setView("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === "history" ? "bg-gold text-black" : "text-neutral-400 hover:text-white"
              }`}
              data-testid="bulk-tab-history"
            >
              <History className="h-3.5 w-3.5" /> Import History
            </button>
          </div>
          {view === "upload" && (
            <>
              <Button variant="outline" size="sm"
                className="border-neutral-600 text-neutral-300 hover:text-white hover:border-neutral-400 bg-transparent"
                onClick={handleDownloadTemplate} data-testid="download-template-btn">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download Template
              </Button>
              {step !== "upload" && (
                <Button variant="outline" size="sm"
                  className="border-neutral-600 text-neutral-300 hover:text-white hover:border-neutral-400 bg-transparent"
                  onClick={reset} data-testid="reset-bulk-btn">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Start Over
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {view === "upload" && (
        <>
      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {["Upload Files", "Preview & Validate", "Publish"].map((s, i) => {
          const stepIdx = { upload: 0, preview: 1, publishing: 2, done: 2 }[step];
          const isActive = i === stepIdx;
          const isDone = i < stepIdx || step === "done";
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-neutral-600" />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isDone ? "bg-green-500/20 text-green-400" :
                isActive ? "bg-gold/20 text-gold" :
                "bg-neutral-800 text-neutral-500"
              }`}>
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                 isActive && loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {s}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Upload */}
        {step === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CSV/Excel Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver === "csv" ? "border-gold bg-gold/5" :
                  csvFile ? "border-green-500/50 bg-green-500/5" :
                  "border-neutral-600 hover:border-neutral-400"
                }`}
                onClick={() => csvRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver("csv"); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, "csv")}
                data-testid="csv-dropzone"
              >
                <input
                  ref={csvRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  data-testid="csv-file-input"
                />
                <FileSpreadsheet className={`h-10 w-10 mx-auto mb-3 ${csvFile ? "text-green-400" : "text-neutral-500"}`} />
                {csvFile ? (
                  <div>
                    <p className="text-sm font-semibold text-green-400">{csvFile.name}</p>
                    <p className="text-xs text-neutral-400 mt-1">{(csvFile.size / 1024).toFixed(1)} KB</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-red-400 hover:text-red-300"
                      onClick={e => { e.stopPropagation(); setCsvFile(null); if(csvRef.current) csvRef.current.value=""; }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-neutral-300">Drop CSV or Excel file here</p>
                    <p className="text-xs text-neutral-500 mt-1">Supports .csv, .xlsx, .xls</p>
                    <p className="text-[10px] text-neutral-600 mt-2">Required columns: sku, name, description, price, category</p>
                  </div>
                )}
              </div>

              {/* ZIP Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver === "zip" ? "border-gold bg-gold/5" :
                  zipFile ? "border-green-500/50 bg-green-500/5" :
                  "border-neutral-600 hover:border-neutral-400"
                }`}
                onClick={() => zipRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver("zip"); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, "zip")}
                data-testid="zip-dropzone"
              >
                <input
                  ref={zipRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={e => setZipFile(e.target.files?.[0] || null)}
                  data-testid="zip-file-input"
                />
                <Archive className={`h-10 w-10 mx-auto mb-3 ${zipFile ? "text-green-400" : "text-neutral-500"}`} />
                {zipFile ? (
                  <div>
                    <p className="text-sm font-semibold text-green-400">{zipFile.name}</p>
                    <p className="text-xs text-neutral-400 mt-1">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-red-400 hover:text-red-300"
                      onClick={e => { e.stopPropagation(); setZipFile(null); if(zipRef.current) zipRef.current.value=""; }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-neutral-300">Drop ZIP of product images</p>
                    <p className="text-xs text-neutral-500 mt-1">Optional - images matched by SKU filename</p>
                    <p className="text-[10px] text-neutral-600 mt-2">e.g. SKU001.jpg, SKU001-2.png</p>
                  </div>
                )}
              </div>
            </div>

            {/* CSV Format Guide */}
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gold mb-3">CSV Column Guide</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {[
                  { col: "sku", desc: "Unique ID (required)", req: true },
                  { col: "name", desc: "Product name (required)", req: true },
                  { col: "description", desc: "Product details (required)", req: true },
                  { col: "price", desc: "Selling price (required)", req: true },
                  { col: "category", desc: "Category name (required)", req: true },
                  { col: "compare_price", desc: "MRP / original price", req: false },
                  { col: "sizes", desc: "Comma-separated", req: false },
                  { col: "colors", desc: "Comma-separated", req: false },
                  { col: "stock", desc: "Total quantity", req: false },
                  { col: "tags", desc: "Comma-separated", req: false },
                  { col: "is_limited_edition", desc: "true/false", req: false },
                  { col: "variants", desc: "Color:Size:Qty;...", req: false },
                ].map(c => (
                  <div key={c.col} className="flex items-start gap-1.5">
                    <code className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${c.req ? "bg-gold/20 text-gold" : "bg-neutral-700 text-neutral-300"}`}>
                      {c.col}
                    </code>
                    <span className="text-neutral-500 leading-tight">{c.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-500 mt-3">
                <strong className="text-neutral-400">Variants format:</strong> Color:Size:Qty separated by semicolons.
                Example: <code className="text-gold/80">Black:36:20;Black:37:25;White:36:10</code>
              </p>
              <p className="text-[10px] text-neutral-600 mt-2">
                Column names are flexible — e.g. "Product Name" or "title" works for name, "Selling Price" for price, "Quantity" for stock.
              </p>
            </div>

            <div className="mt-4">
              <Button
                className="bg-gold text-black font-bold hover:bg-yellow-400 px-8"
                onClick={handlePreview}
                disabled={!csvFile || loading}
                data-testid="preview-upload-btn"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                {loading ? (uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : "Processing...") : "Preview & Validate"}
              </Button>
              {loading && uploadProgress > 0 && (
                <div className="mt-3 w-64">
                  <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">{uploadProgress}% uploaded</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Preview */}
        {step === "preview" && previewData && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{previewData.total}</p>
                <p className="text-xs text-neutral-400 mt-1">Total Products</p>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{previewData.valid_count}</p>
                <p className="text-xs text-neutral-400 mt-1">Ready to Publish</p>
              </div>
              <div className={`rounded-xl p-4 text-center ${
                previewData.error_count > 0 ? "bg-red-500/5 border border-red-500/20" : "bg-neutral-800/50 border border-neutral-700"
              }`}>
                <p className={`text-2xl font-bold ${previewData.error_count > 0 ? "text-red-400" : "text-neutral-500"}`}>
                  {previewData.error_count}
                </p>
                <p className="text-xs text-neutral-400 mt-1">With Errors</p>
              </div>
            </div>

            {/* Error Summary */}
            {previewData.errors?.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <p className="text-sm font-semibold text-red-400">Validation Errors ({previewData.errors.length})</p>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {previewData.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300/80 font-mono">{err}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-neutral-800 z-10">
                    <TableRow className="border-neutral-700 hover:bg-transparent">
                      <TableHead className="text-neutral-400 font-semibold w-10">#</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Status</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">SKU</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Name</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Category</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Price</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Stock</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Sizes</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Colors</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Variants</TableHead>
                      <TableHead className="text-neutral-400 font-semibold">Images</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.products?.map((p, i) => (
                      <TableRow key={i} className={`border-neutral-700 ${!p.valid ? "bg-red-500/5" : "hover:bg-neutral-700/30"}`}
                        data-testid={`preview-row-${i}`}>
                        <TableCell className="text-neutral-500 text-xs">{p.row}</TableCell>
                        <TableCell>
                          {p.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded">{p.sku || "—"}</code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-white font-medium">{p.name || "—"}</span>
                          {!p.valid && p.errors?.length > 0 && (
                            <div className="mt-1">
                              {p.errors.map((e, ei) => (
                                <p key={ei} className="text-[10px] text-red-400">{e}</p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-neutral-600 text-neutral-300 text-[10px]">
                            {p.category || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-gold font-semibold text-sm">
                            {p.price ? `Rs.${Number(p.price).toLocaleString()}` : "—"}
                          </span>
                          {p.compare_price && (
                            <span className="text-xs text-neutral-500 line-through ml-1">
                              Rs.{Number(p.compare_price).toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium text-sm ${
                            p.stock < 10 ? "text-red-400" : p.stock < 30 ? "text-amber-400" : "text-green-400"
                          }`}>{p.stock}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5 flex-wrap max-w-[120px]">
                            {p.sizes?.slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" className="text-[9px] border-neutral-600 text-neutral-400 px-1">{s}</Badge>
                            ))}
                            {p.sizes?.length > 3 && <Badge variant="outline" className="text-[9px] border-neutral-600 text-neutral-500 px-1">+{p.sizes.length - 3}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5 flex-wrap max-w-[120px]">
                            {p.colors?.slice(0, 2).map(c => (
                              <Badge key={c} variant="outline" className="text-[9px] border-neutral-600 text-neutral-400 px-1">{c}</Badge>
                            ))}
                            {p.colors?.length > 2 && <Badge variant="outline" className="text-[9px] border-neutral-600 text-neutral-500 px-1">+{p.colors.length - 2}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.variants?.length > 0 ? (
                            <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-0">
                              {p.variants.length} variants
                            </Badge>
                          ) : (
                            <span className="text-xs text-neutral-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.image_count > 0 ? (
                            <Badge className="text-[9px] bg-blue-500/20 text-blue-300 border-0">
                              {p.image_count} img{p.image_count > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-neutral-500">No images</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <Button
                className="bg-gold text-black font-bold hover:bg-yellow-400 px-8"
                onClick={handlePublish}
                disabled={previewData.valid_count === 0}
                data-testid="publish-products-btn"
              >
                <Package className="h-4 w-4 mr-2" />
                Publish {previewData.valid_count} Product{previewData.valid_count !== 1 ? "s" : ""}
              </Button>
              {previewData.error_count > 0 && (
                <p className="text-xs text-amber-400">
                  {previewData.error_count} product{previewData.error_count !== 1 ? "s" : ""} with errors will be skipped
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 2.5: Publishing */}
        {step === "publishing" && (
          <motion.div key="publishing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-16">
            <Loader2 className="h-12 w-12 text-gold animate-spin mb-4" />
            <p className="text-lg font-semibold text-white">Publishing products...</p>
            <p className="text-sm text-neutral-400 mt-1">Uploading images and creating products. This may take a moment.</p>
          </motion.div>
        )}

        {/* STEP 3: Done */}
        {step === "done" && publishResult && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 text-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">Bulk Upload Complete!</h3>
              <p className="text-sm text-neutral-400 mt-1">
                {publishResult.total_created} product{publishResult.total_created !== 1 ? "s" : ""} created successfully
                {publishResult.total_failed > 0 && `, ${publishResult.total_failed} failed`}
              </p>
            </div>

            {/* Created Products */}
            {publishResult.created?.length > 0 && (
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3">
                  Created Products ({publishResult.created.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {publishResult.created.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                      <code className="text-[10px] font-mono text-gold bg-gold/10 px-1.5 rounded">{p.sku}</code>
                      <span className="text-neutral-200">{p.name}</span>
                      {p.images > 0 && (
                        <Badge className="text-[9px] bg-blue-500/20 text-blue-300 border-0 ml-auto">{p.images} images</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Products */}
            {publishResult.failed?.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">
                  Failed ({publishResult.failed.length})
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {publishResult.failed.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                      <code className="text-[10px] font-mono text-neutral-400 bg-neutral-700 px-1.5 rounded">{p.sku}</code>
                      <span className="text-red-300 text-xs">{p.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="bg-gold text-black font-bold hover:bg-yellow-400" onClick={reset} data-testid="upload-more-btn">
              <Upload className="h-4 w-4 mr-2" /> Upload More Products
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}

      {view === "history" && <ImportHistory mode={mode} />}
    </div>
  );
};

// ==================== IMPORT HISTORY ====================
const ImportHistory = ({ mode }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reverting, setReverting] = useState(null);

  const getHeaders = () => {
    const tokenKey = mode === "vendor" ? "pigma_vendor_token" : "pigma_admin_token";
    const token = localStorage.getItem(tokenKey);
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/products/bulk/sessions`, { headers: getHeaders() });
      setSessions(res.data || []);
    } catch { toast.error("Failed to load import history"); }
    finally { setLoading(false); }
  }, [mode]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleRevert = async (sessionId, createdCount) => {
    if (!window.confirm(`This will deactivate ${createdCount} product(s) from this batch. Continue?`)) return;
    setReverting(sessionId);
    try {
      const res = await axios.post(`${API}/products/bulk/revert/${sessionId}`, {}, { headers: getHeaders() });
      toast.success(`Reverted ${res.data.reverted_count} products`);
      fetchSessions();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to revert");
    } finally { setReverting(null); }
  };

  const statusConfig = {
    published: { label: "Published", color: "bg-green-500/20 text-green-400", icon: CheckCircle2 },
    reverted: { label: "Reverted", color: "bg-red-500/20 text-red-400", icon: Undo2 },
    preview: { label: "Preview", color: "bg-amber-500/20 text-amber-400", icon: Eye },
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <div className="py-12 text-center text-neutral-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading history...</div>;

  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center">
        <History className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-400 font-medium">No import history yet</p>
        <p className="text-xs text-neutral-500 mt-1">Your bulk uploads will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="import-history-section">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">{sessions.length} import session{sessions.length !== 1 ? "s" : ""}</p>
        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white" onClick={() => { setLoading(true); fetchSessions(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-neutral-700 hover:bg-transparent">
              <TableHead className="text-neutral-400 font-semibold">Date</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Session</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Status</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Products</TableHead>
              <TableHead className="text-neutral-400 font-semibold">Valid / Errors</TableHead>
              <TableHead className="text-neutral-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map(s => {
              const cfg = statusConfig[s.status] || statusConfig.preview;
              const StatusIcon = cfg.icon;
              return (
                <TableRow key={s.session_id} className="border-neutral-700 hover:bg-neutral-700/30" data-testid={`history-row-${s.session_id}`}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      {formatDate(s.published_at || s.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-[10px] font-mono text-neutral-400 bg-neutral-700 px-1.5 py-0.5 rounded">{s.session_id}</code>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] border-0 ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-white">{s.created_count || s.total || 0}</span>
                    {s.reverted_at && (
                      <span className="text-xs text-red-400 ml-1.5">({s.reverted_count || 0} reverted)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-green-400 text-sm">{s.valid_count || 0}</span>
                    <span className="text-neutral-600 mx-1">/</span>
                    <span className={`text-sm ${s.error_count > 0 ? "text-red-400" : "text-neutral-500"}`}>{s.error_count || 0}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.status === "published" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => handleRevert(s.session_id, s.created_count || 0)}
                        disabled={reverting === s.session_id}
                        data-testid={`revert-btn-${s.session_id}`}
                      >
                        {reverting === s.session_id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          : <Undo2 className="h-3.5 w-3.5 mr-1" />}
                        Revert
                      </Button>
                    )}
                    {s.status === "reverted" && (
                      <span className="text-xs text-neutral-500 italic">Reverted {formatDate(s.reverted_at)}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
