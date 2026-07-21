import React, { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import {
  Upload,
  Type,
  Square,
  Circle,
  Eye,
  Eraser,
  PenTool,
  Highlighter,
  Download,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  Image as ImageIcon,
  Check
} from "lucide-react";
import { motion } from "motion/react";
import { formatBytes, saveRecentFile, readAsArrayBuffer } from "../utils";

interface EditingAction {
  type: "pen" | "text" | "rect" | "circle" | "highlight" | "whiteout" | "note";
  id: string;
  pageIndex: number;
  // Specific properties
  points?: { x: number; y: number }[]; // for pen
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string; // Hex color
  fontSize?: number;
  strokeWidth?: number;
  author?: string;
}

export default function EditPDF() {
  const [file, setFile] = useState<{ name: string; buffer: ArrayBuffer; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Editing state
  const [activeTool, setActiveTool] = useState<"view" | "pen" | "text" | "rect" | "circle" | "highlight" | "whiteout" | "note">("view");
  const [actions, setActions] = useState<EditingAction[]>([]);
  const [strokeColor, setStrokeColor] = useState("#ef4444"); // Tailwind red-500
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [textInput, setTextInput] = useState("Enter text here");
  const [textSize, setTextSize] = useState(16);
  
  // Pen drawing temporary state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) {
      renderCurrentPage();
    }
  }, [file, currentPageIndex, actions]);

  // Handle document upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setLoading(true);
      setProgress("Loading PDF document...");
      
      try {
        const buffer = await readAsArrayBuffer(selectedFile);
        const pdfjsLib = (window as any).pdfjsLib;
        
        if (!pdfjsLib) {
          throw new Error("PDF.js library not loaded in window scope.");
        }

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const pdf = await loadingTask.promise;
        
        setFile({ name: selectedFile.name, buffer, size: selectedFile.size });
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPageIndex(0);
        setActions([]); // reset edit history
        saveRecentFile({ name: selectedFile.name, size: selectedFile.size, type: "PDF" });
      } catch (err) {
        console.error("Error loading PDF:", err);
        alert("Failed to parse PDF document.");
      } finally {
        setLoading(false);
        setProgress("");
      }
    }
  };

  // Render a specific page using PDF.js and paint any user overlays on top of the canvas
  const renderCurrentPage = async () => {
    if (!pdfDoc || !canvasRef.current || !file) return;

    try {
      const page = await pdfDoc.getPage(currentPageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 }); // High resolution render
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page background
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;

      // Paint user actions on top
      const pageActions = actions.filter((a) => a.pageIndex === currentPageIndex);
      
      for (const action of pageActions) {
        context.save();
        
        if (action.type === "pen" && action.points && action.points.length > 0) {
          context.beginPath();
          context.strokeStyle = action.color || "#000000";
          context.lineWidth = action.strokeWidth || 3;
          context.lineCap = "round";
          context.lineJoin = "round";
          
          context.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length; i++) {
            context.lineTo(action.points[i].x, action.points[i].y);
          }
          context.stroke();
        } 
        else if (action.type === "text" && action.x !== undefined && action.y !== undefined) {
          context.font = `${action.fontSize || 16}px Inter, sans-serif`;
          context.fillStyle = action.color || "#000";
          context.fillText(action.text || "", action.x, action.y);
        }
        else if (action.type === "rect" && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
          context.strokeStyle = action.color || "#000";
          context.lineWidth = action.strokeWidth || 2;
          context.strokeRect(action.x, action.y, action.width, action.height);
        }
        else if (action.type === "circle" && action.x !== undefined && action.y !== undefined && action.width !== undefined) {
          context.strokeStyle = action.color || "#000";
          context.lineWidth = action.strokeWidth || 2;
          context.beginPath();
          context.arc(action.x, action.y, action.width, 0, 2 * Math.PI);
          context.stroke();
        }
        else if (action.type === "highlight" && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
          context.fillStyle = "rgba(253, 224, 71, 0.4)"; // Yellow highlight
          context.fillRect(action.x, action.y, action.width, action.height);
        }
        else if (action.type === "whiteout" && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
          context.fillStyle = "#ffffff";
          context.fillRect(action.x, action.y, action.width, action.height);
        }
        else if (action.type === "note" && action.x !== undefined && action.y !== undefined) {
          // Draw sticky note indicator
          context.fillStyle = "#facc15"; // yellow-400
          context.strokeStyle = "#eab308"; // yellow-500
          context.lineWidth = 1;
          context.beginPath();
          context.arc(action.x, action.y, 10, 0, 2 * Math.PI);
          context.fill();
          context.stroke();
          
          // Draw mini comment icon
          context.fillStyle = "#854d0e"; // yellow-800
          context.font = "bold 10px monospace";
          context.fillText("?", action.x - 3, action.y + 3);
        }
        
        context.restore();
      }
    } catch (err) {
      console.error("Error rendering page overlays:", err);
    }
  };

  // Canvas Mouse Actions for Editing
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "view") return;
    const { x, y } = getCanvasCoordinates(e);

    if (activeTool === "pen") {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (activeTool === "text") {
      const newAction: EditingAction = {
        type: "text",
        id: Math.random().toString(36).substr(2, 5),
        pageIndex: currentPageIndex,
        x,
        y,
        text: textInput,
        color: strokeColor,
        fontSize: textSize,
      };
      setActions([...actions, newAction]);
    } else if (activeTool === "rect") {
      // Add a rectangle at click position
      const newAction: EditingAction = {
        type: "rect",
        id: Math.random().toString(36).substr(2, 5),
        pageIndex: currentPageIndex,
        x: x - 40,
        y: y - 25,
        width: 80,
        height: 50,
        color: strokeColor,
        strokeWidth: strokeWidth,
      };
      setActions([...actions, newAction]);
    } else if (activeTool === "circle") {
      const newAction: EditingAction = {
        type: "circle",
        id: Math.random().toString(36).substr(2, 5),
        pageIndex: currentPageIndex,
        x,
        y,
        width: 30, // Radius
        color: strokeColor,
        strokeWidth: strokeWidth,
      };
      setActions([...actions, newAction]);
    } else if (activeTool === "highlight") {
      const newAction: EditingAction = {
        type: "highlight",
        id: Math.random().toString(36).substr(2, 5),
        pageIndex: currentPageIndex,
        x: x - 50,
        y: y - 10,
        width: 100,
        height: 20,
      };
      setActions([...actions, newAction]);
    } else if (activeTool === "whiteout") {
      const newAction: EditingAction = {
        type: "whiteout",
        id: Math.random().toString(36).substr(2, 5),
        pageIndex: currentPageIndex,
        x: x - 50,
        y: y - 15,
        width: 100,
        height: 30,
      };
      setActions([...actions, newAction]);
    } else if (activeTool === "note") {
      const noteText = prompt("Enter comment text:");
      if (noteText) {
        const newAction: EditingAction = {
          type: "note",
          id: Math.random().toString(36).substr(2, 5),
          pageIndex: currentPageIndex,
          x,
          y,
          text: noteText,
        };
        setActions([...actions, newAction]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "pen") return;
    const { x, y } = getCanvasCoordinates(e);
    
    const newPath = [...currentPath, { x, y }];
    setCurrentPath(newPath);

    // Draw lines temporarily in canvas for instant feedback
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (context && newPath.length > 1) {
      context.beginPath();
      context.strokeStyle = strokeColor;
      context.lineWidth = strokeWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.moveTo(newPath[newPath.length - 2].x, newPath[newPath.length - 2].y);
      context.lineTo(x, y);
      context.stroke();
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && activeTool === "pen") {
      setIsDrawing(false);
      if (currentPath.length > 1) {
        const newAction: EditingAction = {
          type: "pen",
          id: Math.random().toString(36).substr(2, 5),
          pageIndex: currentPageIndex,
          points: currentPath,
          color: strokeColor,
          strokeWidth: strokeWidth,
        };
        setActions([...actions, newAction]);
      }
      setCurrentPath([]);
    }
  };

  const clearPageEdits = () => {
    setActions(actions.filter((a) => a.pageIndex !== currentPageIndex));
  };

  // Compile overlays back onto the PDF using PDF-lib and download the completed file
  const handleSaveAndExport = async () => {
    if (!file) return;
    setLoading(true);
    setProgress("Applying and baking visual edits into PDF...");

    try {
      // 1. Load original PDF document with pdf-lib
      const outputPdf = await PDFDocument.load(file.buffer);
      const pages = outputPdf.getPages();
      const helveticaFont = await outputPdf.embedFont(StandardFonts.Helvetica);

      // We need to match coordinates from PDFJS canvas render to PDF Document coordinates.
      // Canvas height is rendered page height. PDF-lib uses 72 DPI coordinate space from BOTTOM LEFT.
      // Canvas uses coordinate space from TOP LEFT.
      // So we have to scale and invert the Y-axis.
      
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const pdfPage = pages[pageIdx];
        const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();
        
        // Find corresponding edits
        const pageEdits = actions.filter((a) => a.pageIndex === pageIdx);
        if (pageEdits.length === 0) continue;

        // Since canvas and PDF coordinates may differ slightly in size, 
        // we'll fetch actual dimensions from the PDFJS rendering of that page.
        const pdfjsPage = await pdfDoc.getPage(pageIdx + 1);
        const viewport = pdfjsPage.getViewport({ scale: 1.5 });
        const canvasWidth = viewport.width;
        const canvasHeight = viewport.height;

        const scaleX = pdfWidth / canvasWidth;
        const scaleY = pdfHeight / canvasHeight;

        for (const action of pageEdits) {
          // Convert hex color string to RGB object
          const convertColor = (hexStr?: string) => {
            if (!hexStr) return rgb(0, 0, 0);
            const hex = hexStr.replace("#", "");
            return rgb(
              parseInt(hex.substring(0, 2), 16) / 255,
              parseInt(hex.substring(2, 4), 16) / 255,
              parseInt(hex.substring(4, 6), 16) / 255
            );
          };

          const colorRgb = convertColor(action.color);

          if (action.type === "pen" && action.points && action.points.length > 1) {
            for (let i = 0; i < action.points.length - 1; i++) {
              const p1 = action.points[i];
              const p2 = action.points[i + 1];

              // Invert Y axis for pdf-lib (bottom-left origin)
              const x1 = p1.x * scaleX;
              const y1 = pdfHeight - (p1.y * scaleY);
              const x2 = p2.x * scaleX;
              const y2 = pdfHeight - (p2.y * scaleY);

              pdfPage.drawLine({
                start: { x: x1, y: y1 },
                end: { x: x2, y: y2 },
                thickness: (action.strokeWidth || 3) * scaleX,
                color: colorRgb,
                opacity: 1,
              });
            }
          } 
          else if (action.type === "text" && action.x !== undefined && action.y !== undefined) {
            const x = action.x * scaleX;
            const y = pdfHeight - (action.y * scaleY);
            
            pdfPage.drawText(action.text || "", {
              x,
              y,
              size: (action.fontSize || 16) * scaleX,
              font: helveticaFont,
              color: colorRgb,
            });
          }
          else if (action.type === "rect" && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
            const x = action.x * scaleX;
            const y = pdfHeight - ((action.y + action.height) * scaleY);
            const width = action.width * scaleX;
            const height = action.height * scaleY;

            pdfPage.drawRectangle({
              x,
              y,
              width,
              height,
              borderWidth: (action.strokeWidth || 2) * scaleX,
              borderColor: colorRgb,
            });
          }
          else if (action.type === "circle" && action.x !== undefined && action.y !== undefined && action.width !== undefined) {
            const x = action.x * scaleX;
            const y = pdfHeight - (action.y * scaleY);
            const radius = action.width * scaleX;

            pdfPage.drawCircle({
              x,
              y,
              size: radius,
              borderWidth: (action.strokeWidth || 2) * scaleX,
              borderColor: colorRgb,
            });
          }
          else if (action.type === "highlight" && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
            const x = action.x * scaleX;
            const y = pdfHeight - ((action.y + action.height) * scaleY);
            const width = action.width * scaleX;
            const height = action.height * scaleY;

            pdfPage.drawRectangle({
              x,
              y,
              width,
              height,
              color: rgb(1, 0.9, 0), // Yellow
              opacity: 0.35,
            });
          }
          else if (action.type === "whiteout" && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
            const x = action.x * scaleX;
            const y = pdfHeight - ((action.y + action.height) * scaleY);
            const width = action.width * scaleX;
            const height = action.height * scaleY;

            pdfPage.drawRectangle({
              x,
              y,
              width,
              height,
              color: rgb(1, 1, 1), // Pure solid white
              opacity: 1,
            });
          }
        }
      }

      const pdfBytes = await outputPdf.save();
      
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `edited_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export save error", err);
      alert("Failed to burn edits onto original PDF.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div id="edit-pdf-container" class="space-y-6">
      <div class="border-b border-slate-200 pb-4">
        <h2 class="text-2xl font-semibold text-slate-800 font-display">PDF Visual Editor & Markup</h2>
        <p class="text-sm text-slate-500">Draw with a pen, insert shapes, add text overlays, highlight content, or whiteout elements securely.</p>
      </div>

      {!file ? (
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div
            onClick={() => fileInputRef.current?.click()}
            class="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-12 text-center cursor-pointer transition-colors group bg-slate-50/50"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              class="hidden"
            />
            <div class="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p class="text-sm font-semibold text-slate-700">
              Upload PDF document to start editing
            </p>
            <p class="text-xs text-slate-400 mt-1">
              Processes completely locally inside browser. Max privacy.
            </p>
          </div>
        </div>
      ) : (
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Editing Toolbar Sidebar */}
          <div class="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-left space-y-5 h-fit">
            <div class="space-y-1">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Toolbar Tools</h3>
              <p class="text-[10px] text-slate-500">Select a markup action below</p>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTool("view")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "view" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <Eye size={16} /> View Mode
              </button>

              <button
                onClick={() => setActiveTool("pen")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "pen" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <PenTool size={16} /> Draw Pen
              </button>

              <button
                onClick={() => setActiveTool("text")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "text" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <Type size={16} /> Add Text
              </button>

              <button
                onClick={() => setActiveTool("highlight")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "highlight" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <Highlighter size={16} /> Highlight
              </button>

              <button
                onClick={() => setActiveTool("rect")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "rect" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <Square size={16} /> Rectangle
              </button>

              <button
                onClick={() => setActiveTool("circle")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "circle" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <Circle size={16} /> Circle
              </button>

              <button
                onClick={() => setActiveTool("whiteout")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "whiteout" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <Eraser size={16} /> Whiteout
              </button>

              <button
                onClick={() => setActiveTool("note")}
                class={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all ${activeTool === "note" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <MessageSquare size={16} /> Sticky Note
              </button>
            </div>

            {/* Customizer Settings depending on selected tool */}
            {activeTool !== "view" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                class="border-t border-slate-100 pt-4 space-y-4 text-xs"
              >
                <div class="space-y-1">
                  <span class="font-bold text-slate-600 uppercase tracking-wide">Tool Settings</span>
                </div>

                {activeTool === "text" && (
                  <div class="space-y-2">
                    <div>
                      <label class="font-semibold text-slate-500">Overlay Text</label>
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        class="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label class="font-semibold text-slate-500 font-display">Font Size ({textSize}px)</label>
                      <input
                        type="range"
                        min="10"
                        max="48"
                        value={textSize}
                        onChange={(e) => setTextSize(parseInt(e.target.value))}
                        class="w-full accent-emerald-600 cursor-pointer mt-1"
                      />
                    </div>
                  </div>
                )}

                {activeTool === "pen" && (
                  <div>
                    <label class="font-semibold text-slate-500">Pen Thickness ({strokeWidth}px)</label>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                      class="w-full accent-emerald-600 cursor-pointer mt-1"
                    />
                  </div>
                )}

                {(activeTool === "pen" || activeTool === "text" || activeTool === "rect" || activeTool === "circle") && (
                  <div class="space-y-1">
                    <label class="font-semibold text-slate-500">Color Palette</label>
                    <div class="flex gap-2 flex-wrap mt-1">
                      {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#000000", "#ffffff"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setStrokeColor(c)}
                          style={{ backgroundColor: c }}
                          class={`w-6 h-6 rounded-full border ${strokeColor === c ? "border-slate-800 scale-110 shadow-sm" : "border-slate-200"}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        class="w-6 h-6 p-0.5 border border-slate-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {activeTool === "view" ? null : (
                  <p class="text-[10px] text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                    💡 Click on the document page to apply or place your mark.
                  </p>
                )}
              </motion.div>
            )}

            {/* Document stats / Info */}
            <div class="border-t border-slate-100 pt-4 text-xs space-y-2">
              <div class="flex justify-between">
                <span class="text-slate-400">Filename:</span>
                <span class="font-bold text-slate-700 truncate max-w-[140px]">{file.name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Total Size:</span>
                <span class="font-bold text-slate-700">{formatBytes(file.size)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Markup History:</span>
                <span class="font-bold text-slate-700">{actions.length} edits</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="space-y-2 border-t border-slate-100 pt-4">
              <button
                onClick={clearPageEdits}
                disabled={actions.length === 0}
                class={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border ${actions.length > 0 ? "border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600" : "border-slate-100 text-slate-300 cursor-not-allowed"}`}
              >
                <Trash2 size={14} /> Clear Active Edits
              </button>

              <button
                onClick={handleSaveAndExport}
                class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download size={14} /> Burn & Download PDF
              </button>
            </div>
          </div>

          {/* PDF Interactive Canvas Editor Workspace */}
          <div class="lg:col-span-3 space-y-4">
            {/* Page Navigation & Tooltips */}
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

              {/* Tips */}
              <div class="text-[10px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full font-mono">
                {activeTool === "view" ? "Mode: VIEWING DOCUMENT" : `Mode: PLACE ${activeTool.toUpperCase()}`}
              </div>
            </div>

            {/* Editing Page Box */}
            <div
              ref={containerRef}
              class="bg-slate-800 p-6 rounded-2xl shadow-inner border border-slate-700 overflow-auto flex justify-center items-center min-h-[500px]"
            >
              <div class="relative bg-white shadow-xl rounded-sm">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  class={`max-w-full ${activeTool === "view" ? "cursor-default" : "cursor-crosshair"}`}
                />
                
                {/* Overlay Interactive Sticky Note Boxes */}
                {actions
                  .filter((a) => a.pageIndex === currentPageIndex && a.type === "note" && a.x !== undefined && a.y !== undefined)
                  .map((a) => {
                    // Match coordinates to viewport scaling on absolute page container
                    const canvas = canvasRef.current;
                    if (!canvas) return null;
                    const rX = (a.x / canvas.width) * 100;
                    const rY = (a.y / canvas.height) * 100;
                    
                    return (
                      <div
                        key={a.id}
                        style={{ left: `${rX}%`, top: `${rY}%` }}
                        class="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                      >
                        <div class="relative">
                          {/* Mini balloon hover comment content */}
                          <div class="absolute bottom-5 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-300 text-yellow-900 text-[10px] p-2.5 rounded-lg shadow-md w-48 text-left hidden group-hover:block transition-all">
                            <p class="font-bold flex justify-between">
                              <span>Comment:</span>
                              <button
                                onClick={() => setActions(actions.filter((item) => item.id !== a.id))}
                                class="text-red-500 hover:text-red-700 text-[9px]"
                              >
                                Delete
                              </button>
                            </p>
                            <p class="mt-1 break-words">{a.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
