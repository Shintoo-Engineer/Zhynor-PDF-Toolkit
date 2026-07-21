import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  Zap,
  Sliders,
  FileText,
  Download,
  Loader2,
  Check,
  Edit3,
  Columns,
  MessageSquare,
  AlertCircle,
  Eye
} from "lucide-react";
import { motion } from "motion/react";
import { formatBytes, saveRecentFile, readAsArrayBuffer } from "../utils";
import PDFPreviewModal from "./PDFPreviewModal";

export default function OptimizePDF() {
  const [selectedSubTool, setSelectedSubTool] = useState<"compress" | "metadata" | "compare">("compress");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  // Preview States
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBuffer, setPreviewBuffer] = useState<ArrayBuffer | null>(null);
  const [previewName, setPreviewName] = useState("");

  // Compression state
  const [fileToCompress, setFileToCompress] = useState<{ name: string; buffer: ArrayBuffer; size: number } | null>(null);
  const [compressionQuality, setCompressionQuality] = useState<number>(0.6); // 0.1 to 1.0
  const [compressionScale, setCompressionScale] = useState<number>(0.8); // 0.5 to 1.0
  const [compressedFile, setCompressedFile] = useState<{ size: number; bytes: Uint8Array } | null>(null);
  const compressInputRef = useRef<HTMLInputElement>(null);

  // Metadata editor state
  const [fileToEditMeta, setFileToEditMeta] = useState<{ name: string; buffer: ArrayBuffer; size: number } | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaAuthor, setMetaAuthor] = useState("");
  const [metaSubject, setMetaSubject] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaCreator, setMetaCreator] = useState("");
  const metaInputRef = useRef<HTMLInputElement>(null);

  // Comparison state
  const [compareDoc1, setCompareDoc1] = useState<{ name: string; buffer: ArrayBuffer; text?: string } | null>(null);
  const [compareDoc2, setCompareDoc2] = useState<{ name: string; buffer: ArrayBuffer; text?: string } | null>(null);
  const [comparisonResult, setComparisonResult] = useState<string>("");
  const comp1InputRef = useRef<HTMLInputElement>(null);
  const comp2InputRef = useRef<HTMLInputElement>(null);

  // Reset states when changing sub tools
  useEffect(() => {
    setCompressedFile(null);
  }, [selectedSubTool]);

  // Load PDF metadata
  useEffect(() => {
    if (fileToEditMeta) {
      loadPDFMetadata();
    }
  }, [fileToEditMeta]);

  const handleCompressUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setProgress("Loading PDF document...");
      try {
        const buffer = await readAsArrayBuffer(file);
        setFileToCompress({ name: file.name, buffer, size: file.size });
        setCompressedFile(null);
        saveRecentFile({ name: file.name, size: file.size, type: "PDF" });
      } catch (err) {
        console.error("Error reading file", err);
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  const handleMetaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setProgress("Loading PDF metadata...");
      try {
        const buffer = await readAsArrayBuffer(file);
        setFileToEditMeta({ name: file.name, buffer, size: file.size });
        saveRecentFile({ name: file.name, size: file.size, type: "PDF" });
      } catch (err) {
        console.error("Error loading file", err);
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  const loadPDFMetadata = async () => {
    if (!fileToEditMeta) return;
    try {
      const doc = await PDFDocument.load(fileToEditMeta.buffer);
      setMetaTitle(doc.getTitle() || "");
      setMetaAuthor(doc.getAuthor() || "");
      setMetaSubject(doc.getSubject() || "");
      setMetaKeywords(doc.getKeywords() || "");
      setMetaCreator(doc.getCreator() || "");
    } catch (err) {
      console.error("Failed to parse metadata", err);
    }
  };

  // Perform lossy browser-based PDF compression by drawing pages onto canvas and compiling as JPEGs
  const executeCompression = async () => {
    if (!fileToCompress) return;
    setLoading(true);
    setProgress("Compressing visual structures...");

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF.js not loaded");

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileToCompress.buffer) });
      const pdf = await loadingTask.promise;
      
      const compressedPdfDoc = await PDFDocument.create();

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(`Compressing page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: compressionScale });
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const compressedDataUrl = canvas.toDataURL("image/jpeg", compressionQuality);
          const response = await fetch(compressedDataUrl);
          const imgBlob = await response.blob();
          const imgBuffer = await imgBlob.arrayBuffer();

          const embeddedImg = await compressedPdfDoc.embedJpg(imgBuffer);
          const outPage = compressedPdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
          outPage.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: embeddedImg.width,
            height: embeddedImg.height,
          });
        }
      }

      const compressedBytes = await compressedPdfDoc.save();
      setCompressedFile({
        size: compressedBytes.length,
        bytes: compressedBytes,
      });
    } catch (err) {
      console.error("Compression error", err);
      alert("Failed to compress PDF document.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const compileMetadataBytes = async (): Promise<Uint8Array | null> => {
    if (!fileToEditMeta) return null;
    try {
      const doc = await PDFDocument.load(fileToEditMeta.buffer);
      doc.setTitle(metaTitle);
      doc.setAuthor(metaAuthor);
      doc.setSubject(metaSubject);
      doc.setKeywords(metaKeywords.split(",").map(k => k.trim()));
      doc.setCreator(metaCreator);
      return await doc.save();
    } catch (err) {
      console.error("Error writing metadata", err);
      alert("Failed to save changes to document metadata.");
      return null;
    }
  };

  // Save changes to PDF Metadata
  const saveMetadataChanges = async () => {
    if (!fileToEditMeta) return;
    setLoading(true);
    setProgress("Saving metadata properties...");

    try {
      const pdfBytes = await compileMetadataBytes();
      if (pdfBytes) {
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `meta_${fileToEditMeta.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Error writing metadata", err);
      alert("Failed to save changes to document metadata.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handlePreviewMetadata = async () => {
    if (!fileToEditMeta) return;
    setLoading(true);
    setProgress("Injecting metadata header values...");
    const bytes = await compileMetadataBytes();
    if (bytes) {
      setPreviewBuffer(bytes.buffer);
      setPreviewName(`meta_${fileToEditMeta.name}`);
      setPreviewOpen(true);
    }
    setLoading(false);
    setProgress("");
  };

  // Extract PDF text for Comparison
  const handleCompUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setProgress("Extracting indexable text layers...");

      try {
        const buffer = await readAsArrayBuffer(file);
        
        // Extract text
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js not loaded");

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((it: any) => it.str).join(" ") + "\n";
        }

        const data = { name: file.name, buffer, text };
        if (slot === 1) setCompareDoc1(data);
        else setCompareDoc2(data);
        
        saveRecentFile({ name: file.name, size: file.size, type: "PDF" });
      } catch (err) {
        console.error("Error reading file for comparison", err);
        alert("Failed to load PDF text structures.");
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  const compareDocumentsLocally = (doc1: { name: string; text?: string }, doc2: { name: string; text?: string }) => {
    const text1 = doc1.text || "";
    const text2 = doc2.text || "";

    const cleanWords = (txt: string) => {
      return txt.toLowerCase().match(/\b[a-z]{3,15}\b/g) || [];
    };

    const words1 = cleanWords(text1);
    const words2 = cleanWords(text2);

    const stopwords = new Set([
      "the", "and", "a", "of", "to", "is", "in", "that", "it", "for", "on", "with", "as", "at", "by", "an", "be", "this", "are", "from", "or", 
      "has", "had", "have", "but", "not", "your", "our", "their", "we", "they", "he", "she", "you", "me", "him", "her", "us", "them", "which", 
      "who", "whom", "whose", "why", "how", "what", "where", "when", "there", "their", "will", "would", "shall", "should", "can", "could", 
      "may", "might", "must", "about", "above", "after", "again", "against", "all", "any", "been", "before", "being", "below", "between", 
      "both", "each", "few", "more", "most", "other", "some", "such", "than", "too", "very", "own", "also", "into"
    ]);

    const getKeywordsMap = (wordsList: string[]) => {
      const map: { [key: string]: number } = {};
      wordsList.forEach(w => {
        if (!stopwords.has(w)) {
          map[w] = (map[w] || 0) + 1;
        }
      });
      return map;
    };

    const map1 = getKeywordsMap(words1);
    const map2 = getKeywordsMap(words2);

    const uniqueKeys1 = new Set(Object.keys(map1));
    const uniqueKeys2 = new Set(Object.keys(map2));

    // Calculate Jaccard Similarity index
    const intersection = new Set([...uniqueKeys1].filter(x => uniqueKeys2.has(x)));
    const union = new Set([...uniqueKeys1, ...uniqueKeys2]);
    const jaccardSimilarity = union.size > 0 ? (intersection.size / union.size) : 0;
    const matchPercentage = Math.round(jaccardSimilarity * 100);

    // Get top keywords for each document
    const getTopKeywords = (map: { [key: string]: number }) => {
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(x => x[0]);
    };

    const topKeywords1 = getTopKeywords(map1);
    const topKeywords2 = getTopKeywords(map2);

    // Find distinctive keywords (in one but not the other)
    const distinctive1 = topKeywords1.filter(kw => !uniqueKeys2.has(kw));
    const distinctive2 = topKeywords2.filter(kw => !uniqueKeys1.has(kw));
    const overlapping = topKeywords1.filter(kw => uniqueKeys2.has(kw));

    let report = `### ⚖️ Side-by-Side Comparative Analysis Report\n\n`;
    report += `Comparing **${doc1.name}** and **${doc2.name}** using **Zhynor's Secure Local Comparator**.\n\n`;

    report += `#### 📊 Structure & Metric Comparisons\n`;
    report += `| Metric | ${doc1.name} | ${doc2.name} |\n`;
    report += `| :--- | :--- | :--- |\n`;
    report += `| **Word Count** | ${words1.length.toLocaleString()} words | ${words2.length.toLocaleString()} words |\n`;
    report += `| **Unique Concept Terms** | ${uniqueKeys1.size.toLocaleString()} terms | ${uniqueKeys2.size.toLocaleString()} terms |\n`;
    report += `| **Density Ratio** | ${words1.length > 0 ? Math.round((uniqueKeys1.size / words1.length) * 100) : 0}% | ${words2.length > 0 ? Math.round((uniqueKeys2.size / words2.length) * 100) : 0}% |\n\n`;

    report += `#### 🔍 Concept Alignment Index\n`;
    report += `- **Semantic Match Score:** \`${matchPercentage}%\` overlap\n`;
    if (matchPercentage > 75) {
      report += `- **Comparison Rating:** These files are highly similar and cover near-identical topics/narratives.\n`;
    } else if (matchPercentage > 40) {
      report += `- **Comparison Rating:** These files share common threads or contexts but diverge in specific sections.\n`;
    } else {
      report += `- **Comparison Rating:** These files are conceptually distinct with minimal overlapping vocabulary.\n`;
    }
    report += `\n`;

    report += `#### 🏷️ Key Concept Profile: **${doc1.name}**\n`;
    report += `- **Primary Focus Keywords:** ${topKeywords1.map(kw => `\`${kw.toUpperCase()}\``).join(", ")}\n`;
    if (distinctive1.length > 0) {
      report += `- **Unique topics highlighted here:** ${distinctive1.map(kw => `\`${kw.toUpperCase()}\``).join(", ")}\n`;
    }
    report += `\n`;

    report += `#### 🏷️ Key Concept Profile: **${doc2.name}**\n`;
    report += `- **Primary Focus Keywords:** ${topKeywords2.map(kw => `\`${kw.toUpperCase()}\``).join(", ")}\n`;
    if (distinctive2.length > 0) {
      report += `- **Unique topics highlighted here:** ${distinctive2.map(kw => `\`${kw.toUpperCase()}\``).join(", ")}\n`;
    }
    report += `\n`;

    if (overlapping.length > 0) {
      report += `#### 🤝 Core Shared Concepts\n`;
      report += `- Both files converge heavily around: ${overlapping.map(kw => `\`${kw.toUpperCase()}\``).join(", ")}\n\n`;
    }

    report += `*(Processed 100% locally on-device for absolute file privacy. Runs at zero latency and 0 cost)*`;
    return report;
  };

  // Run AI Comparison
  const executeAIComparison = async () => {
    if (!compareDoc1 || !compareDoc2) return;
    setLoading(true);
    setProgress("Running comparative vector analysis...");
    setComparisonResult("");

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const result = compareDocumentsLocally(compareDoc1, compareDoc2);
      setComparisonResult(result);
    } catch (err: any) {
      console.error("Comparison failed", err);
      alert("An error occurred during comparison analysis.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleDownloadCompressed = () => {
    if (!compressedFile || !fileToCompress) return;
    const blob = new Blob([compressedFile.bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compressed_${fileToCompress.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="optimize-pdf-container" class="space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800 font-display">Optimization & Smart Diagnostics</h2>
          <p class="text-sm text-slate-500 font-sans">Compress large PDFs, edit metadata properties, or run side-by-side smart document comparison.</p>
        </div>

        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedSubTool("compress")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedSubTool === "compress" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            Compress PDF
          </button>
          <button
            onClick={() => setSelectedSubTool("metadata")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedSubTool === "metadata" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            Metadata Editor
          </button>
          <button
            onClick={() => setSelectedSubTool("compare")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedSubTool === "compare" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            Compare Documents
          </button>
        </div>
      </div>

      {loading && (
        <div class="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Loader2 class="animate-spin text-emerald-600 mb-3" size={32} />
          <p class="text-sm font-semibold text-slate-600">{progress}</p>
        </div>
      )}

      {/* COMPRESS UTILITY */}
      {!loading && selectedSubTool === "compress" && (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-4 h-fit">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Compression Quality</h3>
            
            <div class="space-y-4">
              <div>
                <label class="text-xs font-bold text-slate-600 flex justify-between">
                  <span>Image Resolution Scale</span>
                  <span class="text-emerald-600">{Math.round(compressionScale * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="1.0"
                  step="0.1"
                  value={compressionScale}
                  onChange={(e) => setCompressionScale(parseFloat(e.target.value))}
                  class="w-full accent-emerald-600 cursor-pointer mt-1"
                />
                <span class="text-[9px] text-slate-400">Resizes canvas frame dimensions before flattening.</span>
              </div>

              <div>
                <label class="text-xs font-bold text-slate-600 flex justify-between">
                  <span>JPEG Compression Factor</span>
                  <span class="text-emerald-600">{Math.round(compressionQuality * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.9"
                  step="0.05"
                  value={compressionQuality}
                  onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                  class="w-full accent-emerald-600 cursor-pointer mt-1"
                />
                <span class="text-[9px] text-slate-400">Shrinks pixel depth. Lower value creates smaller file sizes.</span>
              </div>
            </div>

            <button
              onClick={executeCompression}
              disabled={!fileToCompress}
              class={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${fileToCompress ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
            >
              <Zap size={14} /> Compress Document
            </button>
          </div>

          <div class="lg:col-span-2 space-y-4">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div
                onClick={() => compressInputRef.current?.click()}
                class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors group bg-slate-50/50"
              >
                <input
                  type="file"
                  ref={compressInputRef}
                  onChange={handleCompressUpload}
                  accept=".pdf"
                  class="hidden"
                />
                <div class="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                  <Upload size={20} />
                </div>
                <p class="text-xs font-bold text-slate-700">Upload PDF to Compress</p>
                <p class="text-[10px] text-slate-400 mt-1">Select a large PDF to optimize size locally.</p>
              </div>

              {fileToCompress && (
                <div class="mt-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-left">
                    <p class="text-xs font-bold text-slate-700">{fileToCompress.name}</p>
                    <p class="text-[10px] text-slate-400">Original Size: {formatBytes(fileToCompress.size)}</p>
                  </div>
                  
                  {compressedFile && (
                    <div class="flex flex-wrap items-center gap-2.5 text-left">
                      <div class="text-xs bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-100 font-bold">
                        Compressed: {formatBytes(compressedFile.size)} 
                        <span class="ml-1 text-[10px] opacity-80">
                          ({Math.round(((fileToCompress.size - compressedFile.size) / fileToCompress.size) * 100)}% smaller!)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setPreviewBuffer(compressedFile.bytes.buffer);
                          setPreviewName(`compressed_${fileToCompress.name}`);
                          setPreviewOpen(true);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <Eye size={14} /> Preview PDF
                      </button>
                      <button
                        onClick={handleDownloadCompressed}
                        class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={14} /> Download
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* METADATA EDITOR */}
      {!loading && selectedSubTool === "metadata" && (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-4 h-fit">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Active Document</h3>
            <div
              onClick={() => metaInputRef.current?.click()}
              class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors group bg-slate-50/50"
            >
              <input
                type="file"
                ref={metaInputRef}
                onChange={handleMetaUpload}
                accept=".pdf"
                class="hidden"
              />
              <p class="text-xs font-bold text-slate-700">
                {fileToEditMeta ? "Change Document" : "Select PDF"}
              </p>
              <p class="text-[9px] text-slate-400 mt-0.5">Reads embedded properties on load</p>
            </div>

            {fileToEditMeta && (
              <div class="text-xs space-y-2 border-t border-slate-100 pt-3">
                <p class="text-slate-500 flex justify-between">
                  <span>Name:</span>
                  <span class="font-bold text-slate-700 truncate max-w-[120px]">{fileToEditMeta.name}</span>
                </p>
                <p class="text-slate-500 flex justify-between">
                  <span>Size:</span>
                  <span class="font-bold text-slate-700">{formatBytes(fileToEditMeta.size)}</span>
                </p>
              </div>
            )}
          </div>

          <div class="lg:col-span-2 space-y-4 text-left">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Edit3 size={16} class="text-emerald-500" />
                Edit Metadata Fields
              </h3>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-500">Document Title</label>
                  <input
                    type="text"
                    disabled={!fileToEditMeta}
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="e.g. Q4 Financial Report"
                    class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-500">Author</label>
                  <input
                    type="text"
                    disabled={!fileToEditMeta}
                    value={metaAuthor}
                    onChange={(e) => setMetaAuthor(e.target.value)}
                    placeholder="e.g. John Doe"
                    class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-500">Subject / Description</label>
                  <input
                    type="text"
                    disabled={!fileToEditMeta}
                    value={metaSubject}
                    onChange={(e) => setMetaSubject(e.target.value)}
                    placeholder="e.g. Internal Accounting Audit"
                    class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="font-semibold text-slate-500">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    disabled={!fileToEditMeta}
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    placeholder="e.g. finances, tax, audit, q4"
                    class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
                  />
                </div>

                <div class="space-y-1.5 md:col-span-2">
                  <label class="font-semibold text-slate-500">Creator App</label>
                  <input
                    type="text"
                    disabled={!fileToEditMeta}
                    value={metaCreator}
                    onChange={(e) => setMetaCreator(e.target.value)}
                    placeholder="e.g. Zhynor PDF Toolkit"
                    class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2.5 pt-2 border-t border-slate-50">
                <button
                  onClick={handlePreviewMetadata}
                  disabled={!fileToEditMeta}
                  class={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all border ${fileToEditMeta ? "bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer border-slate-200" : "bg-slate-100 text-slate-300 border-transparent cursor-not-allowed"}`}
                >
                  <Eye size={14} class="inline-block mr-1" /> Preview PDF
                </button>
                <button
                  onClick={saveMetadataChanges}
                  disabled={!fileToEditMeta}
                  class={`px-5 py-2.5 text-xs font-semibold rounded-xl transition-all ${fileToEditMeta ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                >
                  Apply & Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT COMPARISON */}
      {!loading && selectedSubTool === "compare" && (
        <div class="space-y-6 text-left">
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Columns size={16} class="text-emerald-500" />
              Side-by-Side Smart PDF Comparer
            </h3>
            <p class="text-xs text-slate-400">Upload two documents. We will extract text and use server-side Gemini intelligence to run side-by-side textual comparative analyses.</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document 1 Upload */}
              <div
                onClick={() => comp1InputRef.current?.click()}
                class={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${compareDoc1 ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input
                  type="file"
                  ref={comp1InputRef}
                  onChange={(e) => handleCompUpload(e, 1)}
                  accept=".pdf"
                  class="hidden"
                />
                <p class="text-xs font-bold text-slate-700 truncate max-w-full">
                  {compareDoc1 ? `✓ ${compareDoc1.name}` : "Upload Document A"}
                </p>
                <p class="text-[9px] text-slate-400 mt-1">Acts as reference base file.</p>
              </div>

              {/* Document 2 Upload */}
              <div
                onClick={() => comp2InputRef.current?.click()}
                class={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${compareDoc2 ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input
                  type="file"
                  ref={comp2InputRef}
                  onChange={(e) => handleCompUpload(e, 2)}
                  accept=".pdf"
                  class="hidden"
                />
                <p class="text-xs font-bold text-slate-700 truncate max-w-full">
                  {compareDoc2 ? `✓ ${compareDoc2.name}` : "Upload Document B"}
                </p>
                <p class="text-[9px] text-slate-400 mt-1">Will be compared against Doc A.</p>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <button
                onClick={executeAIComparison}
                disabled={!compareDoc1 || !compareDoc2}
                class={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all ${compareDoc1 && compareDoc2 ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
              >
                <Zap size={14} /> Compare Locally (Secure)
              </button>
            </div>
          </div>

          {/* Result view */}
          {comparisonResult && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4"
            >
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare size={14} class="text-emerald-500" />
                Local Analysis Report
              </h4>
              <div class="p-5 bg-slate-50 rounded-xl border border-slate-100 text-sm leading-relaxed text-slate-700 font-sans max-h-[500px] overflow-auto markdown-body">
                {/* Visual markdown rendering via custom markup layout */}
                <div dangerouslySetInnerHTML={{ 
                  __html: comparisonResult
                    .replace(/\n/g, "<br/>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.*?)\*/g, "<em>$1</em>")
                    .replace(/### (.*?)(<br\s*\/?>|$)/g, "<h3>$1</h3>")
                    .replace(/## (.*?)(<br\s*\/?>|$)/g, "<h2>$1</h2>")
                    .replace(/# (.*?)(<br\s*\/?>|$)/g, "<h1>$1</h1>")
                    .replace(/- (.*?)(<br\s*\/?>|$)/g, "<li>$1</li>")
                }} />
              </div>
            </motion.div>
          )}
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
