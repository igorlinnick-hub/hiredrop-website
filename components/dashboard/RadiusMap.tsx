"use client";

// Real interactive search-area control for non-remote campaigns: a live MapLibre GL
// vector map (premium "Google-like" feel) served by OpenFreeMap — free, no API key,
// no usage limits, commercial-ok, and self-hostable later (swap the style URL via env;
// if self-hosting PMTiles, Supabase Storage is the host — it serves the HTTP range
// requests PMTiles needs). Picking a city reports it up so it becomes the campaign
// location (flows to Indeed l= via the extension); the radius (true miles) is threaded
// to the extension too (campaign filters → Indeed radius=).
//
// SSR-safe: maplibre-gl touches `window` at import time, so it's imported ONLY inside
// useEffect (browser-only). Only the CSS is imported statically (safe).

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

const STEPS = [10, 25, 50, 100] as const;
export type RadiusMiles = (typeof STEPS)[number];

// Free, no-key, no-limit tiles. Overridable via env for a future self-hosted swap.
const DAY_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";
const DARK_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_DARK_URL || "https://tiles.openfreemap.org/styles/dark";
// Fallback view = geographic center of the contiguous US.
const US_CENTER: [number, number] = [-98.58, 39.83]; // [lng, lat] for MapLibre

const RADIUS_SRC = "hd-radius";

type LatLng = { lat: number; lng: number };

// Geodesic-ish circle polygon (miles) so the ring reads as a true radius, not pixels.
function circleGeoJSON(lng: number, lat: number, miles: number, points = 72) {
  const km = miles * 1.60934;
  const dX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const dY = km / 110.574;
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * 2 * Math.PI;
    ring.push([lng + dX * Math.cos(t), lat + dY * Math.sin(t)]);
  }
  return { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [ring] }, properties: {} };
}

function labelFromAddress(a: Record<string, string> | undefined, fallback: string): string {
  if (!a) return fallback;
  const city = a.city || a.town || a.village || a.county || a.state_district;
  const region = a.state || a.region;
  const cc = (a.country_code || "").toUpperCase();
  return [city, region, cc].filter(Boolean).join(", ") || fallback;
}

export default function RadiusMap({
  value,
  onChange,
  areaLabel,
  onPick,
  initialQuery,
}: {
  value: RadiusMiles | null;
  onChange: (miles: RadiusMiles) => void;
  areaLabel?: string;
  onPick?: (label: string, lat: number, lng: number) => void;
  initialQuery?: string;
}) {
  const active = (value && (STEPS as readonly number[]).includes(value) ? value : 25) as RadiusMiles;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const centerRef = useRef<LatLng>({ lat: US_CENTER[1], lng: US_CENTER[0] });
  const accentRef = useRef<string>("#6c5ce7");

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fitToRadius() {
    const map = mapRef.current;
    if (!map) return;
    const { lat, lng } = centerRef.current;
    const km = active * 1.60934;
    const dLat = km / 110.574;
    const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180));
    map.fitBounds(
      [[lng - dLng, lat - dLat], [lng + dLng, lat + dLat]],
      { padding: 26, duration: 350, maxZoom: 12 }
    );
  }

  function drawRadius() {
    const map = mapRef.current;
    const src = map?.getSource(RADIUS_SRC) as import("maplibre-gl").GeoJSONSource | undefined;
    if (!src) return;
    const { lat, lng } = centerRef.current;
    src.setData(circleGeoJSON(lng, lat, active) as GeoJSON.Feature);
  }

  async function geocode(query: string): Promise<(LatLng & { label: string }) | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const hit = data[0];
    return {
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      label: labelFromAddress(hit.address, (hit.display_name?.split(",").slice(0, 2).join(",")) || query),
    };
  }

  async function reverseGeocode(p: LatLng): Promise<string> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${p.lat}&lon=${p.lng}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      return labelFromAddress(data.address, `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`);
    } catch {
      return `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`;
    }
  }

  function place(p: LatLng, label: string, report: boolean) {
    centerRef.current = p;
    markerRef.current?.setLngLat([p.lng, p.lat]);
    drawRadius();
    fitToRadius();
    setPickedLabel(label);
    if (report) onPick?.(label, p.lat, p.lng);
  }

  async function runSearch() {
    const q = search.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const hit = await geocode(q);
      if (!hit) { setError("Couldn’t find that place — try “City, State”."); return; }
      place({ lat: hit.lat, lng: hit.lng }, hit.label, true);
    } catch {
      setError("Search failed — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  // ── init map once ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Brand accent for the ring — read the CSS var (WebGL paint can't use var()).
      const cs = getComputedStyle(containerRef.current);
      accentRef.current = (cs.getPropertyValue("--accent").trim() || "#6c5ce7");
      const dark = !!containerRef.current.closest(".dark");

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: dark ? DARK_STYLE : DAY_STYLE,
        center: US_CENTER,
        zoom: 3.2,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.scrollZoom.disable(); // don't hijack page scroll

      const el = document.createElement("div");
      el.className = "hd-map-pin";
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(US_CENTER)
        .addTo(map);
      markerRef.current = marker;

      marker.on("dragend", async () => {
        const ll = marker.getLngLat();
        centerRef.current = { lat: ll.lat, lng: ll.lng };
        drawRadius();
        const label = await reverseGeocode({ lat: ll.lat, lng: ll.lng });
        setPickedLabel(label);
        onPick?.(label, ll.lat, ll.lng);
      });

      map.on("load", async () => {
        const accent = accentRef.current;
        map.addSource(RADIUS_SRC, { type: "geojson", data: circleGeoJSON(US_CENTER[0], US_CENTER[1], active) as GeoJSON.Feature });
        map.addLayer({ id: "hd-radius-fill", type: "fill", source: RADIUS_SRC, paint: { "fill-color": accent, "fill-opacity": 0.12 } });
        map.addLayer({ id: "hd-radius-line", type: "line", source: RADIUS_SRC, paint: { "line-color": accent, "line-width": 1.75 } });

        // Opening view: geocode a saved city / the coarse area; else stay on US.
        const seed = (initialQuery || areaLabel || "").trim();
        if (seed && seed.toLowerCase() !== "remote") {
          const hit = await geocode(seed).catch(() => null);
          if (!cancelled && hit) { place({ lat: hit.lat, lng: hit.lng }, hit.label, false); return; }
        }
        fitToRadius();
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── radius change → resize ring + reframe ────────────────────────────────────
  useEffect(() => {
    drawRadius();
    fitToRadius();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="rounded-xl border border-border bg-surface2/30 p-3">
      <style>{`
        .hd-map-pin{width:16px;height:16px;border-radius:9999px;background:var(--accent);
          box-shadow:0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent),0 1px 5px rgba(0,0,0,.45);cursor:grab;}
        .hd-map-pin:active{cursor:grabbing;}
        .hd-map .maplibregl-ctrl-attrib{background:color-mix(in srgb, var(--surface) 82%, transparent);color:var(--text2);}
        .hd-map .maplibregl-ctrl-attrib a{color:var(--accent);}
      `}</style>

      {/* City search */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center flex-1 min-w-0 rounded-lg border border-border bg-surface px-2.5">
          <svg className="w-3.5 h-3.5 text-text2/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
            placeholder="Search a city — e.g. Austin, TX"
            className="flex-1 min-w-0 bg-transparent py-2 px-2 text-sm text-text outline-none placeholder:text-text2/40"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={busy}
          className="text-xs font-semibold rounded-lg border border-accent bg-accent text-white px-3 py-2 hover:bg-accent2 transition disabled:opacity-50"
        >
          {busy ? "…" : "Find"}
        </button>
      </div>

      {/* The live map */}
      <div className="hd-map">
        <div ref={containerRef} style={{ height: 220 }} className="w-full rounded-lg overflow-hidden border border-border" />
      </div>

      {error && <p className="text-[11px] text-red mt-1.5">{error}</p>}

      {/* Radius selector */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-text">Search radius</p>
          <p className="text-[11px] text-text2/60 truncate">
            {active} mi{pickedLabel ? ` · around ${pickedLabel}` : areaLabel ? ` · around ${areaLabel}` : ""}
          </p>
        </div>
        <div className="mt-2 flex gap-1.5">
          {STEPS.map((m) => {
            const on = active === m;
            return (
              <button key={m} type="button" onClick={() => onChange(m)} aria-pressed={on}
                className={[
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg border transition",
                  on
                    ? "bg-accent text-white border-accent shadow-[0_0_12px_rgba(108,92,231,0.35)]"
                    : "bg-surface text-text2 border-border hover:border-accent/50 hover:text-text",
                ].join(" ")}
              >
                {m}
              </button>
            );
          })}
          <span className="self-center text-[11px] text-text2/50 pl-0.5">mi</span>
        </div>
      </div>
    </div>
  );
}
