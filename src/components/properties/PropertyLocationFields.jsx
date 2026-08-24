import React, { useState } from "react";
import { Navigation, Search, ExternalLink, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const coordsToMapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

function parseCoords(str) {
  if (!str) return null;
  const parts = String(str).split(",").map((s) => parseFloat(s.trim()));
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default function PropertyLocationFields({ values, setField }) {
  const [locating, setLocating] = useState(false);
  const [locMsg, setLocMsg] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [coordsDirty, setCoordsDirty] = useState(false);

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocMsg("Geolocation is not supported on this device. Enter coordinates manually.");
      return;
    }
    setLocating(true);
    setLocMsg("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = latitude.toFixed(6);
        const lng = longitude.toFixed(6);
        setField("gps_coordinates", `${lat}, ${lng}`);
        setField("maps_link", coordsToMapsLink(lat, lng));
        setLocating(false);
        setLocMsg("Location captured.");
        setCoordsDirty(false);
      },
      (err) => {
        setLocating(false);
        setLocMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. You can enter coordinates manually."
            : "Could not get your location. Enter coordinates manually."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const findFromAddress = async () => {
    const addr = (values.address || "").trim();
    if (!addr) {
      setGeoMsg("Enter a full address first.");
      return;
    }
    setGeocoding(true);
    setGeoMsg("Finding address…");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(addr)}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setGeocoding(false);
        setGeoMsg("That address could not be confidently located. Please enter the coordinates manually.");
        return;
      }
      const hit = data[0];
      const lat = parseFloat(hit.lat);
      const lon = parseFloat(hit.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        setGeocoding(false);
        setGeoMsg("That address could not be confidently located. Please enter the coordinates manually.");
        return;
      }
      const latS = lat.toFixed(6);
      const lonS = lon.toFixed(6);
      setField("gps_coordinates", `${latS}, ${lonS}`);
      setField("maps_link", coordsToMapsLink(latS, lonS));
      setGeocoding(false);
      setGeoMsg(`Located: ${hit.display_name}`);
      setCoordsDirty(false);
    } catch (e) {
      setGeocoding(false);
      setGeoMsg("Geocoding failed. Check your connection or enter coordinates manually.");
    }
  };

  const onCoordsChange = (e) => {
    setField("gps_coordinates", e.target.value);
    setCoordsDirty(true);
  };

  const onCoordsBlur = () => {
    if (!coordsDirty) return;
    const c = parseCoords(values.gps_coordinates);
    if (c) setField("maps_link", coordsToMapsLink(c.lat.toFixed(6), c.lng.toFixed(6)));
    setCoordsDirty(false);
  };

  const hasLink = !!(values.maps_link && values.maps_link.startsWith("http"));

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Address</Label>
        <Textarea value={values.address || ""} onChange={(e) => setField("address", e.target.value)} placeholder="Street, town, region, postcode, country" rows={2} />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={findFromAddress} disabled={geocoding} className="gap-1.5">
            {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {geocoding ? "Finding…" : "Find from Address"}
          </Button>
          {geoMsg && <span className="text-xs text-muted-foreground truncate">{geoMsg}</span>}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">GPS Coordinates</Label>
        <Input value={values.gps_coordinates || ""} onChange={onCoordsChange} onBlur={onCoordsBlur} placeholder="latitude, longitude" />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating} className="gap-1.5">
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {locating ? "Getting location…" : "Use Current Location"}
          </Button>
          {locMsg && !locating && <span className="text-xs text-muted-foreground truncate">{locMsg}</span>}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Google Maps Link</Label>
        <Input value={values.maps_link || ""} onChange={(e) => setField("maps_link", e.target.value)} placeholder="Auto-generated from coordinates" />
        <div className="mt-2 flex items-center gap-2">
          {hasLink ? (
            <a href={values.maps_link} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="w-4 h-4" /> Open in Google Maps
              </Button>
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">Use a button above or enter coordinates to generate a link.</span>
          )}
        </div>
      </div>
    </div>
  );
}