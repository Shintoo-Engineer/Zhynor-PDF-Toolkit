import React, { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import {
  Upload,
  ArrowRight,
  RotateCw,
  Trash2,
  Plus,
  ArrowDown,
  ArrowUp,
  Hash,
  Download,
  Loader2,
  FileText,
  Copy,
  Scissors,
  Check,
  LayoutGrid,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatBytes, saveRecentFile, readAsArrayBuffer } from "../utils";
import PDFPreviewModal from "./PDFPreviewModal";

interface PageItem {
  id: string;
  originalFileIndex: number;
  originalPageIndex: number;
  rotation: number; // degrees
  thumbnail?: string; // Data URL of the page canvas
}

export default function OrganizePDF() {
  const [selectedTool, setSelectedTool] = useState<"merge" | "split" | "manager">("merge");
  interface PDFFile {
  name: string;
  bytes: Uint8Array;
  size: number;
  }
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  
  // Preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState<Uint8Array | null>(null);
  const [previewName, setPreviewName] = useState("");
  
  // Split tool state
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [splitRange, setSplitRange] = useState("1-3, 4");
  
  // Page Manager state
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  
  // Page numbering state
  const [showPageNumbering, setShowPageNumbering] = useState(false);
  const [numberPosition, setNumberPosition] = useState<"bottom-center" | "bottom-right" | "top-center" | "top-right">("bottom-center");
  const [numberFormat, setNumberFormat] = useState<"simple" | "of">("simple"); // "1" vs "Page 1 of 10"
  const [numberFontSize, setNumberFontSize] = useState(12);
  const [numberColor, setNumberColor] = useState("#4b5563"); // gray-600

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger loading of page previews if page manager is active and files exist
  useEffect(() => {
    if (selectedTool === "manager" && files.length > 0) {
      loadPageThumbnails();
    }
  }, [selectedTool, files]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
  if (!e.target.files) return;

  setLoading(true);
  setProgress("Reading uploaded file(s)...");

  try {
    const uploaded: PDFFile[] = [];

    for (const file of Array.from(e.target.files)) {

      const buffer = await readAsArrayBuffer(file);

      uploaded.push({
        name: file.name,
        bytes: new Uint8Array(buffer),
        size: file.size,
      });

      saveRecentFile({
        name: file.name,
        size: file.size,
        type: "PDF",
      });
    }

    setFiles(prev => [...prev, ...uploaded]);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
    setProgress("");

    if (fileInputRef.current)
      fileInputRef.current.value = "";
  }
};

  // Convert PDF pages to images (thumbnails) using PDF.js in the browser
  const loadPageThumbnails = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress("Loading document pages...");
    
    try {
      const allPages: PageItem[] = [];
      const pdfjsLib = (window as any).pdfjsLib;
      
      if (!pdfjsLib) {
        throw new Error("PDFJS library not loaded");
      }

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const loadingTask = pdfjsLib.getDocument({data: file.bytes.slice()});
        const pdf = await loadingTask.promise;
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.3 }); // low scale for thumbnail
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
            allPages.push({
              id: `${fileIdx}-${pageNum}-${Math.random().toString(36).substr(2, 5)}`,
              originalFileIndex: fileIdx,
              originalPageIndex: pageNum - 1, // 0-based index for pdf-lib
              rotation: 0,
              thumbnail,
            });
          }
        }
      }
      setPages(allPages);
    } catch (err) {
      console.error("Error rendering thumbnails:", err);
      // Fallback: create pages without thumbnails
      const allPagesFallback: PageItem[] = [];
      try {
        for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
          const doc = await PDFDocument.load(files[fileIdx].bytes.slice());
          const count = doc.getPageCount();
          for (let p = 0; p < count; p++) {
            allPagesFallback.push({
              id: `${fileIdx}-${p}-${Math.random()}`,
              originalFileIndex: fileIdx,
              originalPageIndex: p,
              rotation: 0,
            });
          }
        }
        setPages(allPagesFallback);
      } catch (innerErr) {
        console.error("Critical PDF-lib error:", innerErr);
      }
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const removeFile = (index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
    // Clear page list if all files removed
    if (updated.length === 0) {
      setPages([]);
    }
  };

  const generateMergedBytes = async (): Promise<Uint8Array | null> => {
    if (files.length < 2) return null;
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        const doc = await PDFDocument.load(
            file.bytes.slice()
        );
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      return await mergedPdf.save();
    } catch (err) {
      console.error("Merge error", err);
      alert("Failed to merge PDF files. Please verify that the files are not encrypted.");
      return null;
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setLoading(true);
    setProgress("Merging PDF files...");
    const bytes = await generateMergedBytes();
    if (bytes) {
      downloadFile(bytes, "merged_document.pdf", "application/pdf");
    }
    setLoading(false);
    setProgress("");
  };

  const handlePreviewMerge = async () => {
    if (files.length < 2) return;
    setLoading(true);
    setProgress("Compiling preview document...");
    const bytes = await generateMergedBytes();
    if (bytes) {
      setPreviewBuffer(bytes);
      setPreviewName("merged_document.pdf");
      setPreviewOpen(true);
    }
    setLoading(false);
    setProgress("");
  };

  const handleSplit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress("Splitting PDF document...");
    
    try {
      const sourceFile = files[0];
      const sourceDoc = await PDFDocument.load(
          sourceFile.bytes.slice()
      );
      const totalPages = sourceDoc.getPageCount();
      const zip = new JSZip();

      if (splitMode === "all") {
        // Extract every page individually
        for (let i = 0; i < totalPages; i++) {
          const newDoc = await PDFDocument.create();
          const [copiedPage] = await newDoc.copyPages(sourceDoc, [i]);
          newDoc.addPage(copiedPage);
          const pdfBytes = await newDoc.save();
          zip.file(`${sourceFile.name.replace(".pdf", "")}_page_${i + 1}.pdf`, pdfBytes);
        }
        
        const zipContent = await zip.generateAsync({ type: "blob" });
        downloadFile(zipContent, `${sourceFile.name.replace(".pdf", "")}_split_pages.zip`, "application/zip");
      } else {
        // Range-based split (e.g. "1-3, 5, 7-10")
        const ranges = splitRange.split(",").map(r => r.trim());
        const newDoc = await PDFDocument.create();
        const pagesToExtract: number[] = [];

        for (const range of ranges) {
          if (range.includes("-")) {
            const [start, end] = range.split("-").map(n => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
                pagesToExtract.push(p - 1);
              }
            }
          } else {
            const pageNum = parseInt(range, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
              pagesToExtract.push(pageNum - 1);
            }
          }
        }

        if (pagesToExtract.length === 0) {
          alert("Invalid page range specified");
          setLoading(false);
          setProgress("");
          return;
        }

        const copiedPages = await newDoc.copyPages(sourceDoc, pagesToExtract);
        copiedPages.forEach(p => newDoc.addPage(p));
        const pdfBytes = await newDoc.save();
        downloadFile(pdfBytes, `${sourceFile.name.replace(".pdf", "")}_extracted.pdf`, "application/pdf");
      }
    } catch (err) {
      console.error("Split error", err);
      alert("Failed to split document.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const generateOrganizedBytes = async (): Promise<Uint8Array | null> => {
    if (pages.length === 0) return null;
    try {
      const outputPdf = await PDFDocument.create();
      const helveticaFont = await outputPdf.embedFont(StandardFonts.Helvetica);
      
      // Load all source documents
      const docs: PDFDocument[] = [];
      for (const f of files) {
        docs.push(
             await PDFDocument.load(
                 f.bytes.slice()
             )
        );
      }

      // Track running total pages for formatting page numbers
      const totalOutPages = pages.length;

      for (let index = 0; index < pages.length; index++) {
        const pageItem = pages[index];
        
        if (pageItem.originalFileIndex === -1) {
          // It's a blank page
          const blankPage = outputPdf.addPage();
          if (pageItem.rotation !== 0) {
            blankPage.setRotation(degrees(pageItem.rotation));
          }
        } else {
          // Copy page from corresponding document
          const sourceDoc = docs[pageItem.originalFileIndex];
          const [copiedPage] = await outputPdf.copyPages(sourceDoc, [pageItem.originalPageIndex]);
          
          // Apply rotation (cumulative rotation)
          const currentRotation = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
          
          const addedPage = outputPdf.addPage(copiedPage);

          // Optionally add page numbering
          if (showPageNumbering) {
            const text = numberFormat === "simple" 
              ? `${index + 1}` 
              : `Page ${index + 1} of ${totalOutPages}`;
            
            const { width, height } = addedPage.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(text, numberFontSize);
            
            // Calculate coordinates
            let x = width / 2 - textWidth / 2;
            let y = 30; // standard margin from bottom

            if (numberPosition === "bottom-right") {
              x = width - textWidth - 40;
            } else if (numberPosition === "top-center") {
              y = height - 40;
            } else if (numberPosition === "top-right") {
              x = width - textWidth - 40;
              y = height - 40;
            }

            // Convert hex color to rgb
            const hex = numberColor.replace("#", "");
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;

            addedPage.drawText(text, {
              x,
              y,
              size: numberFontSize,
              font: helveticaFont,
              color: rgb(r, g, b),
            });
          }
        }
      }

      return await outputPdf.save();
    } catch (err) {
        console.error("Page manager save error:", err);

        if (err instanceof Error) {
          alert(err.message);
        } else {
          alert(JSON.stringify(err));
        }

        return null;
      }
  };

  const handlePageManagerAction = async () => {
    if (pages.length === 0) return;
    setLoading(true);
    setProgress("Applying changes and re-assembling PDF...");
    const bytes = await generateOrganizedBytes();
    if (bytes) {
      downloadFile(bytes, "organized_document.pdf", "application/pdf");
    }
    setLoading(false);
    setProgress("");
  };

  const handlePreviewOrganized = async () => {
    if (pages.length === 0) return;
    setLoading(true);
    setProgress("Rendering organized book preview...");
    const bytes = await generateOrganizedBytes();
    if (bytes) {
      setPreviewBuffer(bytes);
      setPreviewName("organized_document.pdf");
      setPreviewOpen(true);
    }
    setLoading(false);
    setProgress("");
  };

  const rotatePage = (id: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const deletePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  const duplicatePage = (index: number) => {
    const pageToDup = pages[index];
    const newPage: PageItem = {
      ...pageToDup,
      id: `${pageToDup.originalFileIndex}-${pageToDup.originalPageIndex}-${Math.random().toString(36).substr(2, 5)}`,
    };
    const updated = [...pages];
    updated.splice(index + 1, 0, newPage);
    setPages(updated);
  };

  const insertBlankPage = (index: number) => {
    const newPage: PageItem = {
      id: `blank-${Math.random().toString(36).substr(2, 5)}`,
      originalFileIndex: -1,
      originalPageIndex: -1,
      rotation: 0,
    };
    const updated = [...pages];
    updated.splice(index + 1, 0, newPage);
    setPages(updated);
  };

  const movePage = (index: number, direction: "left" | "right") => {
    if (direction === "left" && index === 0) return;
    if (direction === "right" && index === pages.length - 1) return;
    
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPages(updated);
  };

  const downloadFile = (data: ArrayBuffer | Blob, name: string, mimeType: string) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="organize-container" class="space-y-6">
      {/* Title & Tool Selection tabs */}
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800 font-display">Organize & Manage Pages</h2>
          <p class="text-sm text-slate-500">Merge, split, rotate, delete, or rearrange pages natively in your browser.</p>
        </div>
        
        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedTool("merge")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedTool === "merge" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          >
            Merge PDFs
          </button>
          <button
            onClick={() => setSelectedTool("split")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedTool === "split" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          >
            Split PDF
          </button>
          <button
            onClick={() => setSelectedTool("manager")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedTool === "manager" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
          >
            Page Manager & Numbering
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div
          onClick={() => fileInputRef.current?.click()}
          class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors group bg-slate-50/50"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple={selectedTool === "merge" || selectedTool === "manager"}
            accept=".pdf"
            class="hidden"
          />
          <div class="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <p class="text-sm font-semibold text-slate-700">
            Click to upload or drag & drop files
          </p>
          <p class="text-xs text-slate-400 mt-1">
            Accepts PDF files up to 100MB. Runs completely offline.
          </p>
        </div>

        {/* Selected Files List */}
        {files.length > 0 && (
          <div class="mt-6 space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Files</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {files.map((file, idx) => (
                <div key={idx} class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="flex items-center gap-3 overflow-hidden">
                    <div class="p-2 bg-red-50 text-red-500 rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div class="truncate text-left">
                      <p class="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                      <p class="text-[10px] text-slate-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                      setPreviewBuffer(file.bytes.slice());
                        setPreviewName(file.name);
                        setPreviewOpen(true);
                      }}
                      className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded transition-colors mr-1 cursor-pointer"
                      title="Preview PDF"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => removeFile(idx)}
                      class="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading state overlay */}
      {loading && (
        <div class="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100">
          <Loader2 class="animate-spin text-emerald-600 mb-3" size={32} />
          <p class="text-sm font-medium text-slate-600">{progress}</p>
        </div>
      )}

      {/* MERGE INTERFACE */}
      {!loading && selectedTool === "merge" && files.length > 0 && (
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm text-slate-500">
              Ready to merge <span class="font-bold text-slate-700">{files.length}</span> PDF documents into a single file.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePreviewMerge}
                disabled={files.length < 2}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${files.length >= 2 ? "bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
              >
                <Eye size={14} />
                Preview Merge
              </button>
              <button
                onClick={handleMerge}
                disabled={files.length < 2}
                class={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${files.length >= 2 ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
              >
                <LayoutGrid size={14} />
                Merge Documents
              </button>
            </div>
          </div>
          {files.length < 2 && (
            <p class="text-xs text-amber-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
              Please upload at least 2 PDF files to use the merge utility.
            </p>
          )}
        </div>
      )}

      {/* SPLIT INTERFACE */}
      {!loading && selectedTool === "split" && files.length > 0 && (
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <h3 class="font-semibold text-slate-700">Split Parameters</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setSplitMode("all")}
              class={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${splitMode === "all" ? "border-emerald-500 bg-emerald-50/20" : "border-slate-100 hover:border-slate-200 bg-slate-50/30"}`}
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold text-slate-800">Split All Pages</p>
                <input type="radio" checked={splitMode === "all"} readOnly class="text-emerald-600 focus:ring-emerald-500" />
              </div>
              <p class="text-xs text-slate-400">Extracts every page in this PDF as an individual standalone PDF file, bundled into a ZIP file.</p>
            </div>

            <div
              onClick={() => setSplitMode("range")}
              class={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${splitMode === "range" ? "border-emerald-500 bg-emerald-50/20" : "border-slate-100 hover:border-slate-200 bg-slate-50/30"}`}
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-bold text-slate-800">Custom Extract Range</p>
                <input type="radio" checked={splitMode === "range"} readOnly class="text-emerald-600 focus:ring-emerald-500" />
              </div>
              <p class="text-xs text-slate-400">Enter page ranges to combine into a new PDF. Example: "1-3, 5, 7-10".</p>
            </div>
          </div>

          {splitMode === "range" && (
            <div class="text-left space-y-1.5">
              <label class="text-xs font-bold text-slate-600">Extract Ranges</label>
              <input
                type="text"
                value={splitRange}
                onChange={(e) => setSplitRange(e.target.value)}
                placeholder="e.g. 1-3, 5"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          )}

          <div class="flex justify-end pt-2">
            <button
              onClick={handleSplit}
              class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
            >
              <Scissors size={18} />
              Execute Split & Export
            </button>
          </div>
        </div>
      )}

      {/* PAGE MANAGER GRID */}
      {!loading && selectedTool === "manager" && pages.length > 0 && (
        <div class="space-y-6">
          {/* Settings Panel: Page Numbers */}
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Hash size={18} class="text-emerald-500" />
                  Add Page Numbers to Export
                </h3>
                <p class="text-xs text-slate-400">Automatically stamp sequential numbering onto the bottom or top of every page.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPageNumbering}
                  onChange={(e) => setShowPageNumbering(e.target.checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {showPageNumbering && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs"
              >
                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-600">Placement Position</label>
                  <select
                    value={numberPosition}
                    onChange={(e: any) => setNumberPosition(e.target.value)}
                    class="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-600">Format</label>
                  <select
                    value={numberFormat}
                    onChange={(e: any) => setNumberFormat(e.target.value)}
                    class="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="simple">Plain Number (e.g. 1)</option>
                    <option value="of">Total (e.g. Page 1 of 10)</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-600">Font Size (px)</label>
                  <input
                    type="number"
                    value={numberFontSize}
                    onChange={(e) => setNumberFontSize(Math.max(6, parseInt(e.target.value, 10)))}
                    class="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-600">Text Color</label>
                  <div class="flex gap-2">
                    <input
                      type="color"
                      value={numberColor}
                      onChange={(e) => setNumberColor(e.target.value)}
                      class="h-8 w-10 p-0.5 border border-slate-200 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={numberColor}
                      onChange={(e) => setNumberColor(e.target.value)}
                      class="w-full p-1.5 bg-white border border-slate-200 rounded-lg outline-none text-center"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick Actions Header */}
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-600">Total Pages: {pages.length}</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePreviewOrganized}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <Eye size={14} />
                Preview Layout
              </button>
              <button
                onClick={handlePageManagerAction}
                class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                <Download size={14} />
                Re-Assemble & Export
              </button>
            </div>
          </div>

          {/* Grid Layout of PDF Pages */}
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <AnimatePresence>
              {pages.map((page, index) => (
                <motion.div
                  key={page.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  class="bg-white p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div class="relative bg-slate-50 rounded-xl overflow-hidden aspect-[3/4] flex items-center justify-center border border-slate-100">
                    {page.thumbnail ? (
                      <img
                        src={page.thumbnail}
                        referrerPolicy="no-referrer"
                        alt={`Page ${index + 1}`}
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                        class="max-h-full max-w-full object-contain shadow-sm transition-transform duration-200"
                      />
                    ) : (
                      <div class="flex flex-col items-center justify-center text-slate-400">
                        <FileText size={32} />
                        <span class="text-[10px] font-bold mt-1">BLANK PAGE</span>
                      </div>
                    )}

                    {/* Page Number Badge */}
                    <div class="absolute bottom-2 left-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-bold">
                      {index + 1}
                    </div>

                    {/* Source label */}
                    <div class="absolute top-2 left-2 bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded-sm max-w-[80%] truncate">
                      {page.originalFileIndex === -1 ? "Blank" : files[page.originalFileIndex]?.name}
                    </div>
                  </div>

                  {/* Page Controls */}
                  <div class="mt-3 space-y-2">
                    <div class="flex items-center justify-between gap-1">
                      {/* Left Reorder */}
                      <button
                        onClick={() => movePage(index, "left")}
                        disabled={index === 0}
                        class="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:text-slate-200 disabled:hover:bg-transparent rounded-lg transition-colors"
                        title="Move left"
                      >
                        <ArrowUp size={14} class="-rotate-90" />
                      </button>

                      {/* Rotate */}
                      <button
                        onClick={() => rotatePage(page.id)}
                        class="p-1.5 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw size={14} />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={() => duplicatePage(index)}
                        class="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition-colors"
                        title="Duplicate page"
                      >
                        <Copy size={14} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deletePage(page.id)}
                        class="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete page"
                      >
                        <Trash2 size={14} />
                      </button>

                      {/* Right Reorder */}
                      <button
                        onClick={() => movePage(index, "right")}
                        disabled={index === pages.length - 1}
                        class="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 disabled:text-slate-200 disabled:hover:bg-transparent rounded-lg transition-colors"
                        title="Move right"
                      >
                        <ArrowDown size={14} class="-rotate-90" />
                      </button>
                    </div>

                    {/* Insert Blank Page Button below this card */}
                    <button
                      onClick={() => insertBlankPage(index)}
                      class="w-full flex items-center justify-center gap-1 py-1 px-2 border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-slate-400 hover:text-emerald-600 text-[10px] rounded-lg transition-all"
                    >
                      <Plus size={10} /> Insert Blank Page
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* PDF Sandbox Previewer Modal */}
      <PDFPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileBuffer={previewBuffer}
        fileName={previewName}
      />
    </div>
  );
}