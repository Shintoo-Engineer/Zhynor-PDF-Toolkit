import { RecentFile } from "./types";

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function saveRecentFile(file: Omit<RecentFile, "id" | "date">) {
  try {
    const history = getRecentFiles();
    const newFile: RecentFile = {
      ...file,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isFavorite: false,
    };
    
    // Check if duplicate name to avoid clutter
    const filtered = history.filter(f => f.name !== file.name);
    const updated = [newFile, ...filtered].slice(0, 15); // keep last 15 files
    localStorage.setItem("zhynor_recent_files", JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recent file", e);
  }
}

export function getRecentFiles(): RecentFile[] {
  try {
    const data = localStorage.getItem("zhynor_recent_files");
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function toggleFavoriteFile(id: string): RecentFile[] {
  try {
    const files = getRecentFiles();
    const updated = files.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f);
    localStorage.setItem("zhynor_recent_files", JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

export function clearRecentFiles() {
  localStorage.removeItem("zhynor_recent_files");
}

export async function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
