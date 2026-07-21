export type ToolCategory = "organize" | "edit" | "convert" | "optimize" | "security" | "sign-fill" | "smart-ai";

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string; // lucide icon name
  badge?: string;
  isPopular?: boolean;
}

export interface RecentFile {
  id: string;
  name: string;
  size: number;
  date: string;
  isFavorite?: boolean;
  type?: string;
}

// Visual drawing and editing overlays for a specific PDF page
export interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
}

export interface ShapeOverlay {
  id: string;
  type: "rect" | "circle" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  fill?: boolean;
}

export interface HighlightOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // rgba
}

export interface WhiteoutOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  author: string;
  timestamp: string;
  isOpen?: boolean;
}

export interface PageEdits {
  paths: DrawPath[];
  texts: TextOverlay[];
  shapes: ShapeOverlay[];
  highlights: HighlightOverlay[];
  whiteouts: WhiteoutOverlay[];
  stickyNotes: StickyNote[];
  rotation: number; // 0, 90, 180, 270
  isDeleted?: boolean;
  isDuplicated?: boolean;
}

export interface SavedSignature {
  id: string;
  type: "draw" | "type" | "upload";
  value: string; // svg path or text or base64 image
  name?: string;
}
