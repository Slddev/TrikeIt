"use client";

import { useActionState, useEffect, useState } from "react";
import { ImageUpload } from "./image-upload";
import { saveStore, type FormState } from "./merchant-actions";

export const field =
  "h-11 w-full rounded-xl border-2 border-brand-navy/20 bg-white px-3 text-sm font-normal outline-none focus:border-brand-navy";
export const primary =
  "h-11 rounded-xl bg-brand-navy px-5 text-sm font-semibold text-brand-yellow hover:opacity-90 disabled:opacity-40";

type Store = {
  name: string;
  description: string;
  phone: string;
  addressTitle: string;
  addressSubtitle: string;
  lng: number | null;
  lat: number | null;
  coverUrl: string;
  logoUrl: string;
  open: boolean;
};

type Place = { lng: number; lat: number; title: string; subtitle: string };

// Photon: the same free OpenStreetMap geocoder the app uses.
const PHOTON = "https://photon.komoot.io";
const PH_BBOX = "116.9,4.5,126.7,21.2";

type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

function toPlace({ geometry, properties: p }: PhotonFeature): Place {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const title = p.name || street || p.locality || p.district || p.city || "Pinned location";
  const subtitle = [title === street ? undefined : street, p.locality, p.district, p.city, p.state]
    .filter((part, i, all) => part && part !== title && all.indexOf(part) === i)
    .join(", ");
  const [lng, lat] = geometry.coordinates;
  return { lng, lat, title, subtitle };
}

async function photon(path: string, params: Record<string, string>, signal?: AbortSignal) {
  const res = await fetch(`${PHOTON}${path}?${new URLSearchParams(params)}`, { signal });
  if (!res.ok) throw new Error("Address search is unavailable right now.");
  const data: { features: PhotonFeature[] } = await res.json();
  return data.features.map(toPlace);
}

export function StoreForm({ store, uploadFolder }: { store: Store; uploadFolder: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveStore, {});
  const [place, setPlace] = useState<Place | null>(
    store.lng !== null && store.lat !== null
      ? { lng: store.lng, lat: store.lat, title: store.addressTitle, subtitle: store.addressSubtitle }
      : null,
  );

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Store name
          <input name="name" required defaultValue={store.name} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Contact number for riders
          <input name="phone" type="tel" required defaultValue={store.phone} placeholder="0917 123 4567" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
          Short description
          <input name="description" defaultValue={store.description} placeholder="Fresh cookies and pastries" className={field} />
        </label>
      </div>

      <LocationPicker place={place} onChange={setPlace} />
      <input type="hidden" name="addressTitle" value={place?.title ?? ""} />
      <input type="hidden" name="addressSubtitle" value={place?.subtitle ?? ""} />
      <input type="hidden" name="lng" value={place?.lng ?? ""} />
      <input type="hidden" name="lat" value={place?.lat ?? ""} />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <ImageUpload name="coverUrl" label="Cover photo" shape="wide" folder={uploadFolder} defaultValue={store.coverUrl} />
        <ImageUpload name="logoUrl" label="Logo" folder={uploadFolder} defaultValue={store.logoUrl} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="open" type="checkbox" defaultChecked={store.open} className="h-5 w-5 accent-brand-navy" />
          Open for orders
        </label>
        <button disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save store"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.saved && !pending && <p className="text-sm text-green-800">Saved.</p>}
    </form>
  );
}

function LocationPicker({ place, onChange }: { place: Place | null; onChange: (place: Place) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      photon("/api/", { q: query, limit: "6", bbox: PH_BBOX }, controller.signal).then(
        (found) => {
          setResults(found);
          setError(found.length ? null : "No matches. Try a street or landmark.");
        },
        (e: Error) => e.name !== "AbortError" && setError(e.message),
      );
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function useMyLocation() {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const [found] = await photon("/reverse", { lon: String(coords.longitude), lat: String(coords.latitude), limit: "1" });
          onChange({ ...(found ?? { title: "Pinned location", subtitle: "" }), lng: coords.longitude, lat: coords.latitude });
        } catch (e) {
          setError((e as Error).message);
        }
      },
      () => setError("Couldn't get your location. Search for the address instead."),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium">Store location (riders pick up here)</span>
      {place && (
        <p className="rounded-xl bg-brand-cream px-3 py-2 text-sm">
          <b>{place.title}</b>
          {place.subtitle && <span className="block text-xs text-brand-navy/60">{place.subtitle}</span>}
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) setResults([]);
          }}
          placeholder="Search the store's address"
          aria-label="Search the store's address"
          className={field}
        />
        <button type="button" onClick={useMyLocation} className="h-11 whitespace-nowrap rounded-xl border-2 border-brand-navy px-3 text-sm font-semibold">
          I&apos;m at the store
        </button>
      </div>
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-xl border-2 border-brand-navy/10">
          {results.map((r) => (
            <li key={`${r.lng},${r.lat}`}>
              <button
                type="button"
                onClick={() => {
                  onChange(r);
                  setQuery("");
                  setResults([]);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-brand-cream"
              >
                <b>{r.title}</b>
                {r.subtitle && <span className="block text-xs text-brand-navy/60">{r.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
