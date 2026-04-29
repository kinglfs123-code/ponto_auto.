import { useWallpaper } from "@/contexts/WallpaperContext";

/**
 * Renders the user-selected wallpaper as a fixed background.
 * No-op when no wallpaper is set, letting the page's default bg show through.
 */
export default function WallpaperBackground() {
  const { wallpaper } = useWallpaper();
  if (!wallpaper) return null;
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${wallpaper})` }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.30) 100%)",
        }}
      />
    </>
  );
}
