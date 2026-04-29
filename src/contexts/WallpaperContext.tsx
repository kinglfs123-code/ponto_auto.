import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "app-wallpaper";

interface WallpaperContextType {
  wallpaper: string | null;
  setWallpaperFromFile: (file: File) => Promise<void>;
  clearWallpaper: () => void;
}

const WallpaperContext = createContext<WallpaperContextType>({
  wallpaper: null,
  setWallpaperFromFile: async () => {},
  clearWallpaper: () => {},
});

/** Resize/compress an image file to a max width and return a JPEG data URL. */
async function fileToCompressedDataUrl(file: File, maxWidth = 1920, quality = 0.82): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [wallpaper, setWallpaper] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (wallpaper) localStorage.setItem(STORAGE_KEY, wallpaper);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage may be full; ignore
    }
  }, [wallpaper]);

  const setWallpaperFromFile = useCallback(async (file: File) => {
    const url = await fileToCompressedDataUrl(file);
    setWallpaper(url);
  }, []);

  const clearWallpaper = useCallback(() => setWallpaper(null), []);

  const value = useMemo(
    () => ({ wallpaper, setWallpaperFromFile, clearWallpaper }),
    [wallpaper, setWallpaperFromFile, clearWallpaper],
  );

  return <WallpaperContext.Provider value={value}>{children}</WallpaperContext.Provider>;
}

export const useWallpaper = () => useContext(WallpaperContext);
