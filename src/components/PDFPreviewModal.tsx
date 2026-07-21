import React, { useState, useEffect } from "react";
import { X, Download, Fullscreen, ExternalLink, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatBytes } from "../utils";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileBuffer: ArrayBuffer | Uint8Array | null;
  fileName?: string;
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  fileBuffer,
  fileName = "document.pdf",
}: PDFPreviewModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);

  useEffect(() => {
    if (isOpen && fileBuffer) {
      const blob = new Blob([fileBuffer], { type: "application/pdf" });
      setFileSize(blob.size);
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);

      return () => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      };
    }
  }, [isOpen, fileBuffer]);

  if (!isOpen || !fileBuffer) return null;

  const handleDownload = () => {
    if (!objectUrl) return;
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div
        id="pdf-preview-modal-backdrop"
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6 md:p-10"
      >
        <motion.div
          id="pdf-preview-modal-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full h-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden text-left"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                PDF
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm tracking-tight truncate pr-4">{fileName}</h3>
                <p className="text-[10px] text-emerald-400 font-mono">
                  {formatBytes(fileSize)} • Offline Sandbox Preview
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="preview-download-btn"
                onClick={handleDownload}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Download Document"
              >
                <Download size={16} />
              </button>
              {objectUrl && (
                <a
                  id="preview-external-link"
                  href={objectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="Open in New Tab"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              <div className="h-6 w-[1px] bg-slate-800 mx-1" />
              <button
                id="preview-close-btn"
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* PDF Viewer Canvas/Frame */}
          <div className="flex-1 bg-slate-100 relative flex items-center justify-center">
            {objectUrl ? (
              <iframe
                id="pdf-preview-iframe"
                src={`${objectUrl}#toolbar=1&navpanes=0&statusbar=0`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ShieldAlert className="text-amber-500" size={32} />
                <p className="text-xs text-slate-500">Preparing preview document layer...</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% Client-Side Processing • Powered by Zhynor Technologies
            </span>
            <span className="font-mono text-[10px] hidden sm:inline">SECURE LOCAL SANDBOX</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
