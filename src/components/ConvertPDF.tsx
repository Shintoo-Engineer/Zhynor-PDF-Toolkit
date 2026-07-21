import React, { useState, useRef } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";
import {
  Upload,
  ArrowRight,
  FileImage,
  FileText,
  Download,
  Loader2,
  Check,
  FileSpreadsheet,
  FileCode,
  FileUp,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { motion } from "motion/react";
import { formatBytes, saveRecentFile, readAsArrayBuffer, readAsText, readAsDataURL } from "../utils";

export default function ConvertPDF() {
  const [activeTab, setActiveTab] = useState<"to-pdf" | "from-pdf">("to-pdf");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [conversionType, setConversionType] = useState<string>("image"); // "image", "text", "markdown"
  
  // To PDF input state
  const [toPdfFiles, setToPdfFiles] = useState<{ name: string; type: string; dataUrl?: string; buffer: ArrayBuffer }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // From PDF state
  const [fromPdfFile, setFromPdfFile] = useState<{ name: string; buffer: ArrayBuffer; size: number } | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractedImages, setExtractedImages] = useState<string[]>([]); // page thumbnail image dataURLs
  const fromPdfInputRef = useRef<HTMLInputElement>(null);

  const handleToPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setLoading(true);
      setProgress("Reading uploaded files...");
      const updated = [...toPdfFiles];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        try {
          const buffer = await readAsArrayBuffer(file);
          let dataUrl: string | undefined;
          
          if (file.type.startsWith("image/")) {
            dataUrl = await readAsDataURL(file);
          }

          updated.push({
            name: file.name,
            type: file.type,
            dataUrl,
            buffer,
          });
          saveRecentFile({ name: file.name, size: file.size, type: file.type.split("/")[1]?.toUpperCase() || "FILE" });
        } catch (err) {
          console.error("Error loading upload file:", err);
        }
      }
      setToPdfFiles(updated);
      setLoading(false);
      setProgress("");
    }
  };

  const handleFromPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setProgress("Loading PDF file...");
      try {
        const buffer = await readAsArrayBuffer(file);
        setFromPdfFile({ name: file.name, buffer, size: file.size });
        setExtractedText("");
        setExtractedImages([]);
        saveRecentFile({ name: file.name, size: file.size, type: "PDF" });
      } catch (err) {
        console.error("Error reading PDF:", err);
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  // Convert uploaded JPG, PNG, WEBP, or TXT into a single PDF
  const handleConvertToPdf = async () => {
    if (toPdfFiles.length === 0) return;
    setLoading(true);
    setProgress("Compiling file(s) into PDF document...");

    try {
      const pdfDoc = await PDFDocument.create();

      if (conversionType === "image") {
        for (const file of toPdfFiles) {
          const isJpg = file.type === "image/jpeg" || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg");
          const isPng = file.type === "image/png" || file.name.endsWith(".png");
          
          let embeddedImg;
          if (isJpg) {
            embeddedImg = await pdfDoc.embedJpg(file.buffer);
          } else if (isPng) {
            embeddedImg = await pdfDoc.embedPng(file.buffer);
          } else {
            // WEBP fallback or unrecognized - try embedding as PNG if possible
            try {
              embeddedImg = await pdfDoc.embedPng(file.buffer);
            } catch {
              continue; // skip if fails
            }
          }

          if (embeddedImg) {
            const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
            page.drawImage(embeddedImg, {
              x: 0,
              y: 0,
              width: embeddedImg.width,
              height: embeddedImg.height,
            });
          }
        }
      } else if (conversionType === "text" || conversionType === "markdown") {
        // Plain text to PDF
        for (const file of toPdfFiles) {
          const textDecoder = new TextDecoder("utf-8");
          const fullText = textDecoder.decode(file.buffer);
          
          // Basic page formatting & splitting lines
          const pageLines: string[] = [];
          const words = fullText.split(/\s+/);
          let currentLine = "";
          
          for (const word of words) {
            if ((currentLine + " " + word).length > 80) {
              pageLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = currentLine ? currentLine + " " + word : word;
            }
          }
          if (currentLine) pageLines.push(currentLine);

          // Render into pages
          const linesPerPage = 45;
          for (let i = 0; i < pageLines.length; i += linesPerPage) {
            const slice = pageLines.slice(i, i + linesPerPage);
            const page = pdfDoc.addPage([600, 800]); // standard A4-like
            let y = 750;
            
            for (const line of slice) {
              page.drawText(line, {
                x: 50,
                y,
                size: 11,
                color: rgb(0.15, 0.15, 0.15),
              });
              y -= 15;
            }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      downloadFile(pdfBytes, "converted_document.pdf", "application/pdf");
    } catch (err) {
      console.error("Conversion error", err);
      alert("Failed to compile document into PDF. Please verify your source files.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // Convert PDF to separate page JPEGs
  const handlePdfToImages = async () => {
    if (!fromPdfFile) return;
    setLoading(true);
    setProgress("Extracting PDF pages as high-resolution images...");

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js library not loaded");

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fromPdfFile.buffer) });
      const pdf = await loadingTask.promise;
      const zip = new JSZip();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High-res render for quality
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const imgUrl = canvas.toDataURL("image/jpeg", 0.9);
          const base64Data = imgUrl.split(",")[1];
          
          zip.file(`page_${i}.jpg`, base64Data, { base64: true });
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadFile(zipBlob, `${fromPdfFile.name.replace(".pdf", "")}_images.zip`, "application/zip");
    } catch (err) {
      console.error("PDF to Image conversion failed", err);
      alert("Failed to render PDF pages into JPEG format.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // Convert PDF pages to structured text file
  const handlePdfToText = async () => {
    if (!fromPdfFile) return;
    setLoading(true);
    setProgress("Scraping indexable text from PDF layers...");

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDFJS not loaded");

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fromPdfFile.buffer) });
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `--- PAGE ${i} ---\n\n${pageText}\n\n`;
      }

      setExtractedText(fullText);
    } catch (err) {
      console.error("Text scraping failed", err);
      alert("Failed to extract textual characters. This may be a scanned document (requires OCR tool).");
    } finally {
      setLoading(false);
      setProgress("");
    }
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

  const removeToPdfFile = (index: number) => {
    const updated = [...toPdfFiles];
    updated.splice(index, 1);
    setToPdfFiles(updated);
  };

  return (
    <div id="convert-pdf-container" class="space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800 font-display">Document Converter Suite</h2>
          <p class="text-sm text-slate-500 font-sans">Convert files to PDF, or extract images/text/formats out of existing PDFs instantly.</p>
        </div>

        {/* Tab Selector */}
        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("to-pdf")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "to-pdf" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            To PDF Converter
          </button>
          <button
            onClick={() => setActiveTab("from-pdf")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "from-pdf" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            From PDF Extractor
          </button>
        </div>
      </div>

      {/* TO PDF PANEL */}
      {activeTab === "to-pdf" && (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-4 h-fit">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Settings & Filetypes</h3>
            
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-600">Source Format</label>
              <div class="grid grid-cols-1 gap-2">
                <button
                  onClick={() => { setConversionType("image"); setToPdfFiles([]); }}
                  class={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${conversionType === "image" ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-slate-100 hover:border-slate-200 text-slate-600"}`}
                >
                  <FileImage size={18} />
                  <div>
                    <p class="text-xs font-bold">Images to PDF</p>
                    <p class="text-[9px] opacity-75">PNG, JPG, JPEG, WEBP</p>
                  </div>
                </button>

                <button
                  onClick={() => { setConversionType("text"); setToPdfFiles([]); }}
                  class={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${conversionType === "text" ? "border-emerald-500 bg-emerald-50/20 text-emerald-700" : "border-slate-100 hover:border-slate-200 text-slate-600"}`}
                >
                  <FileText size={18} />
                  <div>
                    <p class="text-xs font-bold">Text to PDF</p>
                    <p class="text-[9px] opacity-75">Plain Text (.txt files)</p>
                  </div>
                </button>
              </div>
            </div>

            <p class="text-[10px] text-slate-400 font-sans">
              All formatting, margins, and page compilation happen directly in the browser. Zero bytes are uploaded to servers.
            </p>

            <button
              onClick={handleConvertToPdf}
              disabled={toPdfFiles.length === 0 || loading}
              class={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${toPdfFiles.length > 0 ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
            >
              <Download size={14} /> Convert & Download PDF
            </button>
          </div>

          <div class="lg:col-span-2 space-y-4">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div
                onClick={() => fileInputRef.current?.click()}
                class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors group bg-slate-50/50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleToPdfUpload}
                  multiple
                  accept={conversionType === "image" ? "image/jpeg,image/png,image/webp" : ".txt"}
                  class="hidden"
                />
                <div class="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                  <FileUp size={20} />
                </div>
                <p class="text-xs font-bold text-slate-700">Upload your source files</p>
                <p class="text-[10px] text-slate-400 mt-1">
                  {conversionType === "image" ? "Accepts PNG, JPG, JPEG, and WEBP image formats" : "Accepts Plain text (.txt) files"}
                </p>
              </div>

              {toPdfFiles.length > 0 && (
                <div class="mt-6 space-y-3 text-left">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Files to compile ({toPdfFiles.length})</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {toPdfFiles.map((file, idx) => (
                      <div key={idx} class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div class="flex items-center gap-2 overflow-hidden">
                          {file.dataUrl ? (
                            <img src={file.dataUrl} referrerPolicy="no-referrer" alt="" class="w-8 h-8 rounded-sm object-cover" />
                          ) : (
                            <div class="p-1.5 bg-slate-200 rounded text-slate-500">
                              <FileText size={16} />
                            </div>
                          )}
                          <p class="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{file.name}</p>
                        </div>
                        <button
                          onClick={() => removeToPdfFile(idx)}
                          class="p-1 text-slate-300 hover:text-red-500 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {loading && (
              <div class="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-xs">
                <Loader2 class="animate-spin text-emerald-600 mb-2" size={24} />
                <p class="text-xs font-bold text-slate-500">{progress}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FROM PDF PANEL */}
      {activeTab === "from-pdf" && (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-4 h-fit">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Extraction Modes</h3>
            
            <div class="space-y-3">
              <button
                onClick={handlePdfToImages}
                disabled={!fromPdfFile || loading}
                class={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${fromPdfFile ? "border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/10 text-slate-700" : "border-slate-100 text-slate-300 cursor-not-allowed"}`}
              >
                <FileImage size={18} class="text-emerald-500" />
                <div>
                  <p class="text-xs font-bold">PDF to JPEGs (ZIP)</p>
                  <p class="text-[9px] opacity-75">Extract every page as high-res JPG</p>
                </div>
              </button>

              <button
                onClick={handlePdfToText}
                disabled={!fromPdfFile || loading}
                class={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${fromPdfFile ? "border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/10 text-slate-700" : "border-slate-100 text-slate-300 cursor-not-allowed"}`}
              >
                <FileText size={18} class="text-emerald-500" />
                <div>
                  <p class="text-xs font-bold">PDF to Plain Text</p>
                  <p class="text-[9px] opacity-75">Extract embedded indexable characters</p>
                </div>
              </button>
            </div>

            {fromPdfFile && (
              <div class="border-t border-slate-100 pt-4 text-xs space-y-2">
                <div class="flex justify-between">
                  <span class="text-slate-400 font-sans">Active Document:</span>
                  <span class="font-bold text-slate-700 truncate max-w-[140px]">{fromPdfFile.name}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400 font-sans">Size:</span>
                  <span class="font-bold text-slate-700">{formatBytes(fromPdfFile.size)}</span>
                </div>
              </div>
            )}
          </div>

          <div class="lg:col-span-2 space-y-4">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div
                onClick={() => fromPdfInputRef.current?.click()}
                class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors group bg-slate-50/50"
              >
                <input
                  type="file"
                  ref={fromPdfInputRef}
                  onChange={handleFromPdfUpload}
                  accept=".pdf"
                  class="hidden"
                />
                <div class="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                  <FolderOpen size={20} />
                </div>
                <p class="text-xs font-bold text-slate-700">
                  {fromPdfFile ? "Change PDF file" : "Upload source PDF document"}
                </p>
                <p class="text-[10px] text-slate-400 mt-1">
                  Upload a PDF to parse and extract files/content from it.
                </p>
              </div>
            </div>

            {loading && (
              <div class="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100">
                <Loader2 class="animate-spin text-emerald-600 mb-2" size={24} />
                <p class="text-xs font-semibold text-slate-500">{progress}</p>
              </div>
            )}

            {/* Extracted content viewer */}
            {extractedText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left space-y-3"
              >
                <div class="flex justify-between items-center">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Scraped Text Output</h3>
                  <button
                    onClick={() => downloadFile(new Blob([extractedText], { type: "text/plain" }), `${fromPdfFile?.name.replace(".pdf", "")}_extracted.txt`, "text/plain")}
                    class="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                  >
                    <Download size={12} /> Download .txt
                  </button>
                </div>
                <textarea
                  readOnly
                  value={extractedText}
                  class="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono outline-none text-slate-700 focus:ring-1 focus:ring-emerald-500/20"
                />
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
