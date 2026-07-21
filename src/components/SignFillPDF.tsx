import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  Signature,
  FileText,
  Download,
  Loader2,
  Check,
  Edit2,
  Trash2,
  Plus,
  ArrowRight,
  User,
  FormInput,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";
import { formatBytes, saveRecentFile, readAsArrayBuffer, readAsDataURL } from "../utils";

interface ReusableSig {
  id: string;
  type: "draw" | "type" | "upload";
  dataUrl: string;
}

export default function SignFillPDF() {
  const [activeTab, setActiveTab] = useState<"sign" | "form">("sign");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  // Reusable signatures in LocalStorage
  const [savedSigs, setSavedSigs] = useState<ReusableSig[]>([]);
  
  // PDF being signed
  const [pdfFile, setPdfFile] = useState<{ name: string; buffer: ArrayBuffer; size: number } | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pdfjsDoc, setPdfjsDoc] = useState<any>(null);

  // Active Placement Signature State
  const [selectedSigId, setSelectedSigId] = useState<string>("");
  const [placedSigs, setPlacedSigs] = useState<{ id: string; sigId: string; pageIndex: number; x: number; y: number; scale: number }[]>([]);
  const [activeScale, setActiveScale] = useState<number>(1.0);

  // Signature Creator Modals / States
  const [creatorType, setCreatorType] = useState<"draw" | "type" | "upload">("draw");
  const [typeText, setTypeText] = useState("");
  const [typeFont, setTypeFont] = useState("font-serif italic");

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const padCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Form Filling States
  const [detectedFields, setDetectedFields] = useState<{ name: string; type: string; value: string }[]>([]);

  // Load saved signatures on mount
  useEffect(() => {
    try {
      const data = localStorage.getItem("zhynor_saved_signatures");
      if (data) setSavedSigs(JSON.parse(data));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Update canvas in Form/Signature Preview if document changes
  useEffect(() => {
    if (pdfFile) {
      renderPage();
    }
  }, [pdfFile, currentPageIndex, placedSigs]);

  // Handle PDF upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLoading(true);
      setProgress("Analyzing PDF layers & form fields...");
      try {
        const buffer = await readAsArrayBuffer(file);
        
        // 1. PDFJS Doc for visual rendering
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js not loaded");
        const docTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const jsDoc = await docTask.promise;

        setPdfFile({ name: file.name, buffer, size: file.size });
        setPdfjsDoc(jsDoc);
        setTotalPages(jsDoc.numPages);
        setCurrentPageIndex(0);
        setPlacedSigs([]);

        // 2. Scan form fields with pdf-lib
        const pdfDoc = await PDFDocument.load(buffer);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const scanned = fields.map((f) => {
          const name = f.getName();
          let type = "unknown";
          let value = "";
          
          try {
            if (f.constructor.name.includes("PDFTextField")) {
              type = "text";
              value = (f as any).getText() || "";
            } else if (f.constructor.name.includes("PDFCheckBox")) {
              type = "checkbox";
              value = (f as any).isChecked() ? "true" : "false";
            } else if (f.constructor.name.includes("PDFRadioGroup")) {
              type = "radio";
              value = (f as any).getSelected() || "";
            } else if (f.constructor.name.includes("PDFDropdown")) {
              type = "dropdown";
              value = (f as any).getSelected()?.[0] || "";
            }
          } catch (innerE) {}

          return { name, type, value };
        });

        setDetectedFields(scanned);
        saveRecentFile({ name: file.name, size: file.size, type: "PDF" });
      } catch (err) {
        console.error(err);
        alert("Failed to load PDF.");
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  // Render visual page preview
  const renderPage = async () => {
    if (!pdfjsDoc || !previewCanvasRef.current) return;
    try {
      const page = await pdfjsDoc.getPage(currentPageIndex + 1);
      const viewport = page.getViewport({ scale: 1.2 });
      
      const canvas = previewCanvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      // Draw active signature overlays
      const pagePlaced = placedSigs.filter((p) => p.pageIndex === currentPageIndex);
      for (const placed of pagePlaced) {
        const sig = savedSigs.find((s) => s.id === placed.sigId);
        if (!sig) continue;

        const img = new Image();
        img.src = sig.dataUrl;
        img.referrerPolicy = "no-referrer";
        await new Promise((res) => { img.onload = res; });

        context.save();
        const drawW = 100 * placed.scale;
        const drawH = (drawW / img.width) * img.height;
        context.drawImage(img, placed.x - drawW / 2, placed.y - drawH / 2, drawW, drawH);
        context.restore();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Signature Draw Pad Canvas Mouse Actions
  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";

    const coords = getPadCoordinates(e);
    ctx.moveTo(coords.x, coords.y);
  };

  const handleDrawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = padCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const coords = getPadCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const getPadCoordinates = (e: any) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const clearDrawPad = () => {
    const canvas = padCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Save Signature Reusably
  const handleSaveSignatureCreator = async () => {
    let dataUrl = "";

    if (creatorType === "draw") {
      const canvas = padCanvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL("image/png");
    } else if (creatorType === "type") {
      if (!typeText) return;
      // Draw text signature on a temporary canvas
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#090d16"; // deep slate black
        ctx.font = "italic 32px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(typeText, canvas.width / 2, canvas.height / 2);
        dataUrl = canvas.toDataURL("image/png");
      }
    } else {
      if (!watermarkImage) return;
      dataUrl = watermarkImage.dataUrl;
    }

    if (dataUrl) {
      const newSig: ReusableSig = {
        id: Math.random().toString(36).substr(2, 5),
        type: creatorType,
        dataUrl,
      };

      const updated = [...savedSigs, newSig];
      setSavedSigs(updated);
      localStorage.setItem("zhynor_saved_signatures", JSON.stringify(updated));
      clearDrawPad();
      setTypeText("");
    }
  };

  const deleteSavedSig = (id: string) => {
    const updated = savedSigs.filter((s) => s.id !== id);
    setSavedSigs(updated);
    localStorage.setItem("zhynor_saved_signatures", JSON.stringify(updated));
    if (selectedSigId === id) setSelectedSigId("");
  };

  // Place Signature overlay on Document Canvas onClick
  const handleDocumentClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedSigId || !previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPlacement = {
      id: Math.random().toString(36).substr(2, 5),
      sigId: selectedSigId,
      pageIndex: currentPageIndex,
      x,
      y,
      scale: activeScale,
    };

    setPlacedSigs([...placedSigs, newPlacement]);
  };

  // Compile placed signatures and form fields back into PDF using pdf-lib
  const handleSignExport = async () => {
    if (!pdfFile) return;
    setLoading(true);
    setProgress("Embedding signatures and form data...");

    try {
      const outputDoc = await PDFDocument.load(pdfFile.buffer);
      const pages = outputDoc.getPages();

      // 1. Stamp visual signatures
      for (const placed of placedSigs) {
        const sig = savedSigs.find((s) => s.id === placed.sigId);
        if (!sig) continue;

        const page = pages[placed.pageIndex];
        const { width: pdfW, height: pdfH } = page.getSize();

        // Get preview page scaling factor
        const jsPage = await pdfjsDoc.getPage(placed.pageIndex + 1);
        const viewport = jsPage.getViewport({ scale: 1.2 });
        const canvasW = viewport.width;
        const canvasH = viewport.height;

        const scaleX = pdfW / canvasW;
        const scaleY = pdfH / canvasH;

        // Embed png signature
        const response = await fetch(sig.dataUrl);
        const imgBlob = await response.blob();
        const imgBuffer = await imgBlob.arrayBuffer();
        const embeddedImg = await outputDoc.embedPng(imgBuffer);

        // Convert coordinates from top-left canvas to bottom-left PDF
        const signatureWidth = 100 * placed.scale * scaleX;
        const signatureHeight = (signatureWidth / embeddedImg.width) * embeddedImg.height;
        
        const x = (placed.x * scaleX) - (signatureWidth / 2);
        const y = pdfH - (placed.y * scaleY) - (signatureHeight / 2);

        page.drawImage(embeddedImg, {
          x,
          y,
          width: signatureWidth,
          height: signatureHeight,
        });
      }

      // 2. Save Form Field Values
      const form = outputDoc.getForm();
      for (const field of detectedFields) {
        try {
          const formField = form.getField(field.name);
          if (field.type === "text") {
            (formField as any).setText(field.value);
          } else if (field.type === "checkbox") {
            if (field.value === "true") {
              (formField as any).check();
            } else {
              (formField as any).uncheck();
            }
          }
        } catch (innerE) {}
      }

      const pdfBytes = await outputDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `signed_${pdfFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export signed PDF.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  // Interactive signature uploader
  const [watermarkImage, setWatermarkImage] = useState<any>(null);
  const handleUploadSignImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await readAsDataURL(file);
      setWatermarkImage({ name: file.name, dataUrl });
    }
  };

  const updateFieldValue = (name: string, value: string) => {
    setDetectedFields(detectedFields.map(f => f.name === name ? { ...f, value } : f));
  };

  return (
    <div id="sign-pdf-container" class="space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800 font-display">Sign & Form Fill</h2>
          <p class="text-sm text-slate-500 font-sans">Create digital signatures, drag-and-place them onto pages, or easily fill PDF interactive fields.</p>
        </div>

        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("sign")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "sign" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            Place Signatures
          </button>
          <button
            onClick={() => setActiveTab("form")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "form" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            PDF Form Filler
          </button>
        </div>
      </div>

      {loading && (
        <div class="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Loader2 class="animate-spin text-emerald-600 mb-3" size={32} />
          <p class="text-sm font-semibold text-slate-600">{progress}</p>
        </div>
      )}

      {!loading && (
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT INTERACTIVE TOOLBAR */}
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-5 h-fit">
            {!pdfFile ? (
              <div class="space-y-4">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Document Input</span>
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50"
                >
                  <input
                    type="file"
                    ref={pdfInputRef}
                    onChange={handlePdfUpload}
                    accept=".pdf"
                    class="hidden"
                  />
                  <p class="text-xs font-bold text-slate-700">Select PDF</p>
                  <p class="text-[9px] text-slate-400 mt-1">Accepts any form-enabled or readable PDF file</p>
                </div>
              </div>
            ) : (
              <div class="text-xs space-y-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Document Details</span>
                <p class="text-slate-500 flex justify-between">
                  <span>Name:</span>
                  <span class="font-bold text-slate-700 truncate max-w-[120px]">{pdfFile.name}</span>
                </p>
                <button
                  onClick={() => setPdfFile(null)}
                  class="w-full mt-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-1.5 rounded-lg text-[10px]"
                >
                  Change File
                </button>
              </div>
            )}

            {/* TAB-SPECIFIC SIDEBAR FIELDS */}
            {activeTab === "sign" && (
              <div class="space-y-4 pt-3 border-t border-slate-100">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Reusable Signatures</span>
                
                {/* Creator Toggle */}
                <div class="flex bg-slate-100 p-1 rounded-lg w-full text-[10px] font-semibold">
                  <button
                    onClick={() => setCreatorType("draw")}
                    class={`flex-1 py-1 rounded-md text-center transition-all ${creatorType === "draw" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600"}`}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => setCreatorType("type")}
                    class={`flex-1 py-1 rounded-md text-center transition-all ${creatorType === "type" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600"}`}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => setCreatorType("upload")}
                    class={`flex-1 py-1 rounded-md text-center transition-all ${creatorType === "upload" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600"}`}
                  >
                    Upload
                  </button>
                </div>

                {/* Draw Canvas pad */}
                {creatorType === "draw" && (
                  <div class="space-y-2">
                    <canvas
                      ref={padCanvasRef}
                      onMouseDown={handleDrawStart}
                      onMouseMove={handleDrawMove}
                      onMouseUp={() => setIsDrawing(false)}
                      onTouchStart={handleDrawStart}
                      onTouchMove={handleDrawMove}
                      onTouchEnd={() => setIsDrawing(false)}
                      class="border border-slate-200 bg-slate-50 rounded-xl w-full h-24 cursor-pointer"
                    />
                    <div class="flex gap-2">
                      <button
                        onClick={clearDrawPad}
                        class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded-lg font-bold"
                      >
                        Clear Pad
                      </button>
                      <button
                        onClick={handleSaveSignatureCreator}
                        class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded-lg font-bold"
                      >
                        Save Signature
                      </button>
                    </div>
                  </div>
                )}

                {/* Type Creator */}
                {creatorType === "type" && (
                  <div class="space-y-3">
                    <input
                      type="text"
                      value={typeText}
                      onChange={(e) => setTypeText(e.target.value)}
                      placeholder="Type your initials or name"
                      class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-700 font-sans"
                    />
                    {typeText && (
                      <div class="p-3 bg-slate-50 border border-slate-100 rounded-lg text-center font-serif text-lg italic text-slate-800">
                        {typeText}
                      </div>
                    )}
                    <button
                      onClick={handleSaveSignatureCreator}
                      disabled={!typeText}
                      class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] rounded-lg font-bold"
                    >
                      Save Type Signature
                    </button>
                  </div>
                )}

                {/* Upload Creator */}
                {creatorType === "upload" && (
                  <div class="space-y-2">
                    <button
                      onClick={() => sigFileInputRef.current?.click()}
                      class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border text-xs"
                    >
                      Select Signature Image
                    </button>
                    <input
                      type="file"
                      ref={sigFileInputRef}
                      onChange={handleUploadSignImage}
                      accept="image/png,image/jpeg"
                      class="hidden"
                    />
                    <button
                      onClick={handleSaveSignatureCreator}
                      disabled={!watermarkImage}
                      class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] rounded-lg font-bold"
                    >
                      Save Uploaded Image
                    </button>
                  </div>
                )}

                {/* Saved list */}
                {savedSigs.length > 0 && (
                  <div class="space-y-2 pt-3 border-t border-slate-100">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Saved signatures</span>
                    <div class="grid grid-cols-2 gap-2">
                      {savedSigs.map((sig) => (
                        <div
                          key={sig.id}
                          onClick={() => setSelectedSigId(sig.id)}
                          class={`p-1.5 rounded-lg border flex items-center justify-center relative cursor-pointer group hover:bg-slate-50 bg-white ${selectedSigId === sig.id ? "border-emerald-500 bg-emerald-50/10" : "border-slate-200"}`}
                        >
                          <img src={sig.dataUrl} referrerPolicy="no-referrer" alt="" class="max-h-12 max-w-full object-contain" />
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSavedSig(sig.id); }}
                            class="absolute top-1 right-1 p-0.5 bg-red-100 hover:bg-red-200 text-red-600 rounded hidden group-hover:block"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSigId && (
                  <div class="space-y-2 pt-3 border-t border-slate-100 text-[10px]">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-slate-500">Signature Scale factor:</span>
                      <span class="font-mono text-emerald-600">{Math.round(activeScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.1"
                      value={activeScale}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setActiveScale(val);
                        // Update scale on placed items if selection changed
                      }}
                      class="w-full accent-emerald-600 cursor-pointer"
                    />
                    <p class="text-[9px] text-amber-500 bg-amber-50 p-2 rounded border border-amber-100 leading-normal">
                      💡 Click on the page to place selected signature. Clear or change pages to edit.
                    </p>
                  </div>
                )}

                {pdfFile && (
                  <button
                    onClick={handleSignExport}
                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={14} /> Export Signed PDF
                  </button>
                )}
              </div>
            )}

            {/* FORM FIELDS INSTRUCTIONS PANEL */}
            {activeTab === "form" && (
              <div class="space-y-4 pt-3 border-t border-slate-100 text-xs">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Interactive Fields</span>
                
                {detectedFields.length === 0 ? (
                  <p class="text-[10px] text-slate-400 bg-slate-50 p-3 rounded-lg text-center">
                    No interactive fields (AcroForms) found in this PDF. Upload a form-fillable PDF or use the Visual Editor to add text blocks.
                  </p>
                ) : (
                  <div class="space-y-3 max-h-96 overflow-auto pr-1">
                    {detectedFields.map((field) => (
                      <div key={field.name} class="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <label class="font-bold text-slate-600 block truncate" title={field.name}>{field.name}</label>
                        {field.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            checked={field.value === "true"}
                            onChange={(e) => updateFieldValue(field.name, e.target.checked ? "true" : "false")}
                            class="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                        ) : (
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => updateFieldValue(field.name, e.target.value)}
                            class="w-full p-2 bg-white border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-emerald-500/20 text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {pdfFile && detectedFields.length > 0 && (
                  <button
                    onClick={handleSignExport}
                    class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={14} /> Burn & Export Form
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PDF CANVAS WORKSPACE */}
          <div class="lg:col-span-3 space-y-4">
            {pdfFile ? (
              <div class="space-y-4">
                {/* Page Navigation */}
                <div class="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                      disabled={currentPageIndex === 0}
                      class="p-2 hover:bg-slate-50 disabled:opacity-30 rounded-lg text-slate-600"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span class="text-xs font-bold text-slate-600">
                      Page {currentPageIndex + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
                      disabled={currentPageIndex === totalPages - 1}
                      class="p-2 hover:bg-slate-50 disabled:opacity-30 rounded-lg text-slate-600"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  {placedSigs.length > 0 && (
                    <button
                      onClick={() => setPlacedSigs([])}
                      class="text-[10px] text-red-500 hover:text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-md"
                    >
                      Reset Placed Sigs
                    </button>
                  )}
                </div>

                {/* Live canvas for placement */}
                <div class="bg-slate-800 p-6 rounded-2xl shadow-inner border border-slate-700 overflow-auto flex justify-center items-center min-h-[500px]">
                  <div class="relative bg-white shadow-xl rounded-sm">
                    <canvas
                      ref={previewCanvasRef}
                      onClick={handleDocumentClick}
                      class={`max-w-full ${selectedSigId ? "cursor-crosshair" : "cursor-default"}`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div class="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Signature size={48} class="text-slate-300 mb-4" />
                <h3 class="font-bold text-slate-700 text-sm">No PDF Document Active</h3>
                <p class="text-xs text-slate-400 max-w-sm mt-1">Please select and upload a PDF document in the left sidebar to start placing signatures or filling forms.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
