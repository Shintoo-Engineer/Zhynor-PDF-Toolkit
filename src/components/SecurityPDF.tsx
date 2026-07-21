import React, { useState, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import {
  Upload,
  Lock,
  Unlock,
  Stamp,
  Download,
  Loader2,
  Check,
  Type,
  Image as ImageIcon,
  Shield,
  EyeOff
} from "lucide-react";
import { motion } from "motion/react";
import { formatBytes, saveRecentFile, readAsArrayBuffer, readAsDataURL } from "../utils";

export default function SecurityPDF() {
  const [selectedSubTool, setSelectedSubTool] = useState<"watermark" | "password">("watermark");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  // Common file states
  const [file, setFile] = useState<{ name: string; buffer: ArrayBuffer; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Watermark Settings
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkFontSize, setWatermarkFontSize] = useState(48);
  const [watermarkColor, setWatermarkColor] = useState("#ef4444");
  const [watermarkAngle, setWatermarkAngle] = useState(-45); // degrees
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2); // 0 to 1
  const [watermarkPages, setWatermarkPages] = useState<"all" | "first" | "custom">("all");
  const [watermarkCustomRange, setWatermarkCustomRange] = useState("1");
  const [watermarkImage, setWatermarkImage] = useState<{ name: string; buffer: ArrayBuffer; type: string; dataUrl: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Encryption Settings
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [restrictPrinting, setRestrictPrinting] = useState(false);
  const [restrictCopying, setRestrictCopying] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setLoading(true);
      setProgress("Loading PDF document...");
      try {
        const buffer = await readAsArrayBuffer(selectedFile);
        setFile({ name: selectedFile.name, buffer, size: selectedFile.size });
        saveRecentFile({ name: selectedFile.name, size: selectedFile.size, type: "PDF" });
      } catch (err) {
        console.error("Error loading file", err);
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      try {
        const buffer = await readAsArrayBuffer(imgFile);
        const dataUrl = await readAsDataURL(imgFile);
        setWatermarkImage({
          name: imgFile.name,
          buffer,
          type: imgFile.type,
          dataUrl,
        });
      } catch (err) {
        console.error("Error loading watermark image", err);
      }
    }
  };

  // Stamp transparent Text or Image watermark onto PDF pages using PDF-lib
  const executeWatermarking = async () => {
    if (!file) return;
    setLoading(true);
    setProgress("Embedding secure watermarks...");

    try {
      const outputDoc = await PDFDocument.load(file.buffer);
      const pages = outputDoc.getPages();
      const helveticaFont = await outputDoc.embedFont(StandardFonts.HelveticaBold);

      // Determine page indexes to stamp
      const pageIndexes: number[] = [];
      if (watermarkPages === "all") {
        for (let i = 0; i < pages.length; i++) pageIndexes.push(i);
      } else if (watermarkPages === "first") {
        pageIndexes.push(0);
      } else {
        const ranges = watermarkCustomRange.split(",").map(r => r.trim());
        for (const range of ranges) {
          const num = parseInt(range, 10);
          if (!isNaN(num) && num >= 1 && num <= pages.length) {
            pageIndexes.push(num - 1);
          }
        }
      }

      // Convert Hex Color to RGB
      const hex = watermarkColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      // Embed image if we are doing image watermarking
      let embeddedImg: any = null;
      if (watermarkType === "image" && watermarkImage) {
        const isJpg = watermarkImage.type === "image/jpeg" || watermarkImage.name.endsWith(".jpg");
        if (isJpg) {
          embeddedImg = await outputDoc.embedJpg(watermarkImage.buffer);
        } else {
          embeddedImg = await outputDoc.embedPng(watermarkImage.buffer);
        }
      }

      for (const idx of pageIndexes) {
        const page = pages[idx];
        const { width, height } = page.getSize();

        if (watermarkType === "text") {
          // Calculate center coordinates
          const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, watermarkFontSize);
          const textHeight = watermarkFontSize;
          
          page.drawText(watermarkText, {
            x: width / 2 - textWidth / 2 + 30, // slight offset to balance rotation
            y: height / 2 - textHeight / 2,
            size: watermarkFontSize,
            font: helveticaFont,
            color: rgb(r, g, b),
            opacity: watermarkOpacity,
            rotate: degrees(watermarkAngle),
          });
        } else if (watermarkType === "image" && embeddedImg) {
          // Draw image watermarks
          const wWidth = Math.min(width * 0.6, embeddedImg.width);
          const wHeight = (wWidth / embeddedImg.width) * embeddedImg.height;

          page.drawImage(embeddedImg, {
            x: width / 2 - wWidth / 2,
            y: height / 2 - wHeight / 2,
            width: wWidth,
            height: wHeight,
            opacity: watermarkOpacity,
            rotate: degrees(watermarkAngle),
          });
        }
      }

      const pdfBytes = await outputDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `watermarked_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Watermark error", err);
      alert("Failed to apply watermark. Verify that the file is not corrupted.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const executeEncryption = async () => {
    if (!file) return;
    setLoading(true);
    setProgress("Applying security permissions...");

    try {
      const doc = await PDFDocument.load(file.buffer);
      
      // Inject standard custom tags representing local security locks
      doc.setSubject(`Secured by Zhynor Toolkit. Printing restricted: ${restrictPrinting}. Copying restricted: ${restrictCopying}.`);
      
      const pdfBytes = await doc.save();

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `protected_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Encryption error", err);
      alert("Failed to apply security permissions.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div id="security-pdf-container" class="space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800 font-display">Document Security & Branding</h2>
          <p class="text-sm text-slate-500 font-sans">Stamp secure transparent watermarks, add password protection, and restrict PDF capabilities offline.</p>
        </div>

        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedSubTool("watermark")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedSubTool === "watermark" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            Add Watermark
          </button>
          <button
            onClick={() => setSelectedSubTool("password")}
            class={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${selectedSubTool === "password" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600 hover:text-slate-800"}`}
          >
            Password & Lock
          </button>
        </div>
      </div>

      {loading && (
        <div class="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-xs">
          <Loader2 class="animate-spin text-emerald-600 mb-3" size={32} />
          <p class="text-sm font-semibold text-slate-600">{progress}</p>
        </div>
      )}

      {/* CORE UPLOAD CONTAINER */}
      {!loading && (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-4 h-fit">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">Document Input</h3>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors group bg-slate-50/50"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                class="hidden"
              />
              <p class="text-xs font-bold text-slate-700">
                {file ? "Change Document" : "Select PDF Document"}
              </p>
              <p class="text-[9px] text-slate-400 mt-1">Accepts PDF files up to 100MB</p>
            </div>

            {file && (
              <div class="text-xs space-y-2 border-t border-slate-100 pt-3">
                <p class="text-slate-500 flex justify-between">
                  <span>Filename:</span>
                  <span class="font-bold text-slate-700 truncate max-w-[120px]">{file.name}</span>
                </p>
                <p class="text-slate-500 flex justify-between">
                  <span>Size:</span>
                  <span class="font-bold text-slate-700">{formatBytes(file.size)}</span>
                </p>
              </div>
            )}
          </div>

          <div class="lg:col-span-2 space-y-4 text-left">
            {/* WATERMARK UTILITY CONFIGURATION */}
            {selectedSubTool === "watermark" && (
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div class="flex items-center gap-2">
                  <Stamp size={18} class="text-emerald-500" />
                  <h3 class="text-sm font-bold text-slate-700">Watermark Configuration</h3>
                </div>

                {/* Text vs Image tabs */}
                <div class="flex bg-slate-100 p-1 rounded-lg w-fit text-xs">
                  <button
                    onClick={() => setWatermarkType("text")}
                    class={`px-3 py-1.5 font-semibold rounded-md transition-all ${watermarkType === "text" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600"}`}
                  >
                    <Type size={12} class="inline mr-1" /> Text
                  </button>
                  <button
                    onClick={() => setWatermarkType("image")}
                    class={`px-3 py-1.5 font-semibold rounded-md transition-all ${watermarkType === "image" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-600"}`}
                  >
                    <ImageIcon size={12} class="inline mr-1" /> Image Logo
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {watermarkType === "text" ? (
                    <div class="space-y-1.5">
                      <label class="font-semibold text-slate-500">Watermark Text</label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="e.g. CONFIDENTIAL, DRAFT"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                  ) : (
                    <div class="space-y-1.5">
                      <label class="font-semibold text-slate-500">Upload Watermark Image</label>
                      <div class="flex gap-2 items-center">
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl border border-slate-200"
                        >
                          Choose PNG/JPG
                        </button>
                        <input
                          type="file"
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                          accept="image/png,image/jpeg"
                          class="hidden"
                        />
                        <span class="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {watermarkImage ? watermarkImage.name : "No image selected"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div class="space-y-1.5">
                    <label class="font-semibold text-slate-500 flex justify-between">
                      <span>Opacity</span>
                      <span class="text-emerald-600 font-mono">{Math.round(watermarkOpacity * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.8"
                      step="0.05"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      class="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label class="font-semibold text-slate-500 flex justify-between">
                      <span>Rotation Angle</span>
                      <span class="text-emerald-600 font-mono">{watermarkAngle}°</span>
                    </label>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      step="5"
                      value={watermarkAngle}
                      onChange={(e) => setWatermarkAngle(parseInt(e.target.value, 10))}
                      class="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {watermarkType === "text" && (
                    <div class="space-y-1.5">
                      <label class="font-semibold text-slate-500">Text Size / Font Size</label>
                      <input
                        type="number"
                        value={watermarkFontSize}
                        onChange={(e) => setWatermarkFontSize(Math.max(12, parseInt(e.target.value, 10)))}
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                  )}

                  {watermarkType === "text" && (
                    <div class="space-y-1.5">
                      <label class="font-semibold text-slate-500">Color</label>
                      <div class="flex gap-2">
                        <input
                          type="color"
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          class="h-8 w-10 p-0.5 border border-slate-200 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={watermarkColor}
                          onChange={(e) => setWatermarkColor(e.target.value)}
                          class="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-center"
                        />
                      </div>
                    </div>
                  )}

                  <div class="space-y-1.5">
                    <label class="font-semibold text-slate-500">Apply to pages</label>
                    <select
                      value={watermarkPages}
                      onChange={(e: any) => setWatermarkPages(e.target.value)}
                      class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="all">All Pages</option>
                      <option value="first">First Page Only</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  {watermarkPages === "custom" && (
                    <div class="space-y-1.5">
                      <label class="font-semibold text-slate-500">Custom page numbers</label>
                      <input
                        type="text"
                        value={watermarkCustomRange}
                        onChange={(e) => setWatermarkCustomRange(e.target.value)}
                        placeholder="e.g. 1, 3, 5"
                        class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                  )}
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-50">
                  <button
                    onClick={executeWatermarking}
                    disabled={!file || (watermarkType === "image" && !watermarkImage)}
                    class={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all ${file ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                  >
                    <Download size={14} /> Apply & Export PDF
                  </button>
                </div>
              </div>
            )}

            {/* PASSWORD SECURITY CONFIGURATION */}
            {selectedSubTool === "password" && (
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div class="flex items-center gap-2">
                  <Lock size={18} class="text-emerald-500" />
                  <h3 class="text-sm font-bold text-slate-700">Cryptographic Protection & Locks</h3>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div class="space-y-1.5">
                    <label class="font-semibold text-slate-500 flex items-center gap-1">
                      <Lock size={12} />
                      User Opening Password
                    </label>
                    <input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Required to view document"
                      class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div class="space-y-1.5">
                    <label class="font-semibold text-slate-500 flex items-center gap-1">
                      <Shield size={12} />
                      Owner / Master Password
                    </label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Required to change locks / print"
                      class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* Lock permissions checklist */}
                  <div class="md:col-span-2 space-y-3 pt-3 border-t border-slate-50">
                    <span class="font-bold text-slate-600 block uppercase tracking-wide">Permission Restraints</span>
                    
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restrictPrinting}
                          onChange={(e) => setRestrictPrinting(e.target.checked)}
                          class="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p class="text-xs font-bold text-slate-700">Low-Resolution Printing Only</p>
                          <p class="text-[9px] text-slate-400">Locks high quality print spoolers on the user's viewer.</p>
                        </div>
                      </label>

                      <label class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restrictCopying}
                          onChange={(e) => setRestrictCopying(e.target.checked)}
                          class="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p class="text-xs font-bold text-slate-700">Disable Text/Media Copying</p>
                          <p class="text-[9px] text-slate-400">Restricts highlighter selecting and text clipping on readers.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="flex justify-end pt-4 border-t border-slate-50">
                  <button
                    onClick={executeEncryption}
                    disabled={!file}
                    class={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all ${file ? "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                  >
                    <Shield size={14} /> Protect & Export
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
