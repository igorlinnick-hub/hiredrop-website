"use client";

import { useState } from "react";
import RadiusMap, { type RadiusMiles } from "@/components/dashboard/RadiusMap";

// TEMPORARY preview — public, so the interactive search-area map can be seen in
// isolation (light + dark) without the dashboard's auth/campaign state. Safe to delete.
export default function PreviewRadiusMap() {
  const [radius, setRadius] = useState<RadiusMiles | null>(25);
  const [dark, setDark] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className={`hd-dash-root ${dark ? "dark" : ""} min-h-screen bg-background flex flex-col items-center justify-start gap-4 p-6`}>
      <button
        onClick={() => setDark((d) => !d)}
        className="text-xs font-medium text-text2 border border-border rounded-full px-3 py-1 hover:text-text"
      >
        {dark ? "☀︎ Day" : "☾ Night"}
      </button>
      <div className="w-full max-w-sm">
        <RadiusMap
          value={radius}
          onChange={setRadius}
          areaLabel="United States"
          onPick={(label, lat, lng) => setPicked(`${label}  (${lat.toFixed(3)}, ${lng.toFixed(3)})`)}
        />
      </div>
      <p className="text-xs text-text2/60">
        {picked ? `Picked → ${picked}` : "Search a city or drag the pin. Radius = real miles."}
      </p>
    </div>
  );
}
