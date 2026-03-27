import { useState, useRef, useCallback } from "react";
import { Upload, X, Image, Film, Loader2 } from "lucide-react";
import { ImageCropModal } from "@/components/ImageCropModal";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export const MediaUploader = ({ value = [], onChange, maxFiles = 8, userId = "anonymous", cropAspect = 4 / 5, enableCrop = true }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [cropQueue, setCropQueue] = useState([]);
  const [croppedFiles, setCroppedFiles] = useState([]);
  const [pendingVideos, setPendingVideos] = useState([]);
  const fileRef = useRef(null);

  const validateVideoDuration = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("video/")) { resolve(true); return; }
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > 10) {
          toast.error(`${file.name}: Video must be 10 seconds or less (${Math.round(video.duration)}s)`);
          resolve(false);
        } else { resolve(true); }
      };
      video.onerror = () => resolve(true);
      video.src = URL.createObjectURL(file);
    });
  };

  // Upload files to server
  const uploadFiles = useCallback(async (files) => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    try {
      const res = await axios.post(`${API}/uploads/multiple?user_id=${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const uploaded = res.data.uploaded || [];
      const errors = res.data.errors || [];

      if (uploaded.length > 0) {
        const newUrls = uploaded.map(u => ({
          url: `${process.env.REACT_APP_BACKEND_URL}${u.url}`,
          type: u.file_type,
          filename: u.filename
        }));
        onChange([...value, ...newUrls]);
        toast.success(`${uploaded.length} file(s) uploaded`);
      }
      if (errors.length > 0) {
        errors.forEach(e => toast.error(`${e.filename}: ${e.error}`));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [value, onChange, userId]);

  // Handle file selection
  const handleFiles = useCallback(async (files) => {
    if (!files?.length) return;
    const remaining = maxFiles - value.length;
    if (remaining <= 0) { toast.error(`Max ${maxFiles} files allowed`); return; }

    const candidates = Array.from(files).slice(0, remaining);
    const images = [];
    const videos = [];

    for (const f of candidates) {
      if (f.type.startsWith("video/")) {
        const ok = await validateVideoDuration(f);
        if (ok) videos.push(f);
      } else if (f.type.startsWith("image/")) {
        images.push(f);
      }
    }

    // Videos go straight to upload
    if (videos.length > 0) {
      if (images.length === 0 && !enableCrop) {
        uploadFiles(videos);
        return;
      }
      setPendingVideos(videos);
    }

    // Images: show crop modal if enabled
    if (images.length > 0 && enableCrop) {
      const cropItems = images.map(f => ({
        file: f,
        src: URL.createObjectURL(f),
      }));
      setCropQueue(cropItems);
      setCroppedFiles([]);
    } else if (images.length > 0) {
      uploadFiles([...images, ...videos]);
    } else if (videos.length > 0) {
      uploadFiles(videos);
    }
  }, [value, maxFiles, enableCrop, uploadFiles]);

  // Handle crop complete for current image
  const handleCropDone = useCallback((blob) => {
    const current = cropQueue[0];
    const file = new File([blob], current.file.name, { type: "image/jpeg" });
    URL.revokeObjectURL(current.src);

    const remaining = cropQueue.slice(1);
    const allCropped = [...croppedFiles, file];

    if (remaining.length > 0) {
      setCropQueue(remaining);
      setCroppedFiles(allCropped);
    } else {
      setCropQueue([]);
      setCroppedFiles([]);
      uploadFiles([...allCropped, ...pendingVideos]);
      setPendingVideos([]);
    }
  }, [cropQueue, croppedFiles, pendingVideos, uploadFiles]);

  // Skip crop for current image
  const handleCropSkip = useCallback(() => {
    const current = cropQueue[0];
    URL.revokeObjectURL(current.src);

    const remaining = cropQueue.slice(1);
    const allCropped = [...croppedFiles, current.file];

    if (remaining.length > 0) {
      setCropQueue(remaining);
      setCroppedFiles(allCropped);
    } else {
      setCropQueue([]);
      setCroppedFiles([]);
      uploadFiles([...allCropped, ...pendingVideos]);
      setPendingVideos([]);
    }
  }, [cropQueue, croppedFiles, pendingVideos, uploadFiles]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const isVideo = (item) => {
    if (typeof item === "object" && item.type === "video") return true;
    const url = typeof item === "string" ? item : item.url;
    return /\.(mp4|webm|mov)(\?|$)/i.test(url);
  };

  const getUrl = (item) => typeof item === "string" ? item : item.url;

  return (
    <>
      {/* Crop Modal */}
      {cropQueue.length > 0 && (
        <ImageCropModal
          imageSrc={cropQueue[0].src}
          aspect={cropAspect}
          onCropDone={handleCropDone}
          onCancel={handleCropSkip}
        />
      )}

      <div className="space-y-3" data-testid="media-uploader">
        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver ? "border-gold bg-gold/5" : "border-neutral-600 hover:border-neutral-500"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          data-testid="media-dropzone"
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            data-testid="media-file-input"
          />
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto text-gold animate-spin" />
              <p className="text-sm text-neutral-400">Uploading... {progress}%</p>
              <div className="w-48 mx-auto h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-neutral-500 mb-2" />
              <p className="text-sm text-neutral-400">
                Drop images/videos here or <span className="text-gold">browse</span>
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                JPG, PNG, WebP, MP4 - Max 10MB images, 100MB videos (10s max) ({value.length}/{maxFiles})
              </p>
            </>
          )}
        </div>

        {/* Preview grid */}
        {value.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2" data-testid="media-previews">
            {value.map((item, idx) => (
              <div key={idx} className="relative group aspect-square bg-neutral-800 rounded-md overflow-hidden border border-neutral-700">
                {isVideo(item) ? (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                    <Film className="h-6 w-6 text-neutral-500" />
                    <span className="absolute bottom-1 left-1 text-[9px] text-neutral-500 truncate max-w-[90%]">
                      {typeof item === "object" ? item.filename : "video"}
                    </span>
                  </div>
                ) : (
                  <img src={getUrl(item)} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`remove-media-${idx}`}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
