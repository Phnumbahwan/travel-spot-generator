"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { TouristSpot } from "@/types/spot";

// Fix broken default marker icons in webpack / Next.js builds
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/** Teardrop pin using a styled div — no external assets needed */
function createPinIcon(color: string, size = 22) {
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.35);
    "></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -(size + 2)],
  });
}

const CENTER_ICON = createPinIcon("#2C1810", 24); // dark warm-text
const SPOT_ICON = createPinIcon("#C4714A", 20);   // terracotta

/** Syncs map center when the `center` prop changes after mount */
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface LeafletMapProps {
  center: [number, number];
  locationName: string;
  spots: TouristSpot[];
}

export function LeafletMap({ center, locationName, spots }: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="w-full h-full"
    >
      <MapUpdater center={center} />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      />

      {/* Search-location pin */}
      <Marker position={center} icon={CENTER_ICON}>
        <Popup>
          <strong>{locationName}</strong>
        </Popup>
      </Marker>

      {/* One pin per spot that has coordinates */}
      {spots.map((spot) =>
        spot.coordinates ? (
          <Marker
            key={spot.id}
            position={[spot.coordinates.lat, spot.coordinates.lng]}
            icon={SPOT_ICON}
          >
            <Popup>
              <div style={{ minWidth: 170, lineHeight: 1.5 }}>
                <p style={{ fontWeight: 700, marginBottom: 3 }}>{spot.name}</p>
                <p style={{ fontSize: 12, color: "#8B7355", marginBottom: 3 }}>
                  {spot.shortDescription}
                </p>
                <p style={{ fontSize: 12 }}>
                  ⭐ {spot.rating.toFixed(1)}&ensp;·&ensp;{spot.entranceFee}
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
