import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Crop an image and return a blob
// Images are same-origin (served via /api/uploads/files/), so no crossOrigin or fetch needed
const createCroppedImage = (imageSrc, crop, rotation = 0) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const rRad = (rotation * Math.PI) / 180;
        const { width: bW, height: bH } = getBoundingBox(image.width, image.height, rRad);

        canvas.width = crop.width;
        canvas.height = crop.height;

        ctx.translate(-crop.x, -crop.y);
        ctx.translate(bW / 2, bH / 2);
        ctx.rotate(rRad);
        ctx.translate(-image.width / 2, -image.height / 2);
        ctx.drawImage(image, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        }, "image/jpeg", 0.92);
      } catch (err) {
        reject(err);
      }
    };
    image.onerror = () => {
      reject(new Error("Failed to load image for cropping"));
    };
    image.src = imageSrc;
  });
};

const getBoundingBox = (w, h, rotation) => ({
  width: Math.abs(Math.cos(rotation) * w) + Math.abs(Math.sin(rotation) * h),
  height: Math.abs(Math.sin(rotation) * w) + Math.abs(Math.cos(rotation) * h),
});

export const ImageCropModal = ({ imageSrc, onCropDone, onCancel, aspect = 4 / 5 }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const croppedAreaRef = useRef(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
    croppedAreaRef.current = croppedPixels;
  }, []);

  const handleDone = async () => {
    const area = croppedAreaRef.current || croppedAreaPixels;
    if (!area) {
      toast.error("Please adjust the crop area first");
      return;
    }
    setProcessing(true);
    try {
      const blob = await createCroppedImage(imageSrc, area, rotation);
      onCropDone(blob);
    } catch (err) {
      toast.error("Crop failed: " + (err?.message || "Unknown error"));
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100000] flex flex-col"
        data-testid="image-crop-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-white">
            <Crop className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium">Crop & Position</span>
            <span className="text-xs text-neutral-400 ml-2">
              {aspect === 4/5 ? "4:5" : aspect === 1 ? "1:1" : `${aspect}`} ratio
            </span>
          </div>
          <button onClick={onCancel} className="text-neutral-400 hover:text-white transition-colors" data-testid="crop-cancel">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="flex-1 relative">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
            style={{
              containerStyle: { background: "#111" },
              cropAreaStyle: { border: "2px solid rgba(212, 175, 55, 0.6)" },
            }}
          />
        </div>

        {/* Controls */}
        <div className="bg-black/90 border-t border-neutral-800 px-4 py-3 space-y-3">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-neutral-400" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 appearance-none bg-neutral-700 rounded-full accent-gold cursor-pointer"
              data-testid="crop-zoom-slider"
            />
            <ZoomIn className="h-4 w-4 text-neutral-400" />
            <span className="text-xs text-neutral-400 w-10 text-right">{zoom.toFixed(1)}x</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs transition-colors"
              data-testid="crop-rotate"
            >
              <RotateCw className="h-3.5 w-3.5" /> Rotate
            </button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onCancel} className="text-neutral-400 hover:text-white text-sm" data-testid="crop-skip-btn">
                Skip Crop
              </Button>
              <Button
                onClick={handleDone}
                disabled={processing}
                className="bg-gold text-black hover:bg-gold/90 text-sm font-bold px-6"
                data-testid="crop-done-btn"
              >
                {processing ? "Processing..." : <><Check className="h-4 w-4 mr-1" /> Apply Crop</>}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
