import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@shared/schema";

// Initialize Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Moroccan cities coordinates
const CITIES_COORDS = {
  Casablanca: [-7.589843, 33.573109],
  Rabat: [-6.849813, 34.020882],
  Marrakech: [-8.008889, 31.630000],
  Tanger: [-5.833954, 35.759465],
  Fes: [-4.9998, 34.0333],
};

// Center of Morocco
const INITIAL_CENTER = [-6.8498, 32.8832];

interface BusinessMapProps {
  businesses: User[];
  onSelectBusiness: (businessId: number) => void;
}

export default function BusinessMap({ businesses, onSelectBusiness }: BusinessMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: INITIAL_CENTER,
      zoom: 5,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl());

    // Add business markers
    businesses.forEach((business) => {
      // Get coordinates based on city name in address
      let coordinates = INITIAL_CENTER;
      Object.entries(CITIES_COORDS).forEach(([city, coords]) => {
        if (business.address.includes(city)) {
          coordinates = coords;
        }
      });

      // Create marker element
      const el = document.createElement("div");
      el.className = "cursor-pointer";
      el.innerHTML = `
        <div class="bg-primary text-primary-foreground p-2 rounded-lg shadow-lg">
          <p class="font-semibold">${business.name}</p>
          <p class="text-sm">${business.address}</p>
          <p class="text-sm">Rating: ${business.rating}⭐</p>
        </div>
      `;

      // Add click event
      el.addEventListener("click", () => {
        setSelectedBusiness(business.id);
        onSelectBusiness(business.id);
      });

      // Add marker to map
      new mapboxgl.Marker(el)
        .setLngLat(coordinates)
        .addTo(map.current!);
    });

    return () => map.current?.remove();
  }, [businesses, onSelectBusiness]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Select a Business</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className="w-full h-[400px] rounded-lg" />
      </CardContent>
    </Card>
  );
}