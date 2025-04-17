import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Store, Star, Navigation } from "lucide-react";

// Initialize Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Casablanca center
const CASABLANCA_CENTER = [-7.589843, 33.573109];

interface AdminMapProps {
  businesses: User[];
  onSelectBusiness: (businessId: number) => void;
}

export default function AdminMap({ businesses, onSelectBusiness }: AdminMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const markersRef = useRef<{ [key: number]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: CASABLANCA_CENTER,
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl());

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation([longitude, latitude]);
          
          // Center map on user's location
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 13,
            essential: true
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Casablanca if geolocation fails
          setUserLocation(CASABLANCA_CENTER);
        }
      );
    }

    // Wait for the map to load before adding markers
    map.current.on('load', () => {
      addBusinessMarkers();
    });

    return () => map.current?.remove();
  }, []);

  // Add or update business markers when businesses change
  useEffect(() => {
    if (map.current && map.current.loaded() && businesses.length > 0) {
      addBusinessMarkers();
    }
  }, [businesses]);

  // Function to add business markers
  const addBusinessMarkers = () => {
    if (!map.current) return;
    
    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    
    businesses.forEach((business) => {
      // Set coordinates in Casablanca with slight randomization to avoid overlap
      const coordinates = [
        CASABLANCA_CENTER[0] + (Math.random() - 0.5) * 0.02,
        CASABLANCA_CENTER[1] + (Math.random() - 0.5) * 0.02
      ];

      // Create marker element
      const el = document.createElement("div");
      el.className = "business-marker";
      el.style.width = "44px";
      el.style.height = "44px";
      el.style.backgroundImage = `url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23${selectedBusiness === business.id ? 'ef4444' : '6366f1'}" stroke="white" stroke-width="1.5"><path d="M19 9.3V4h-3v2.6L12 3L2 12h3v8h5v-6h4v6h5v-8h3L19 9.3z"/></svg>')`;
      el.style.backgroundSize = "cover";
      el.style.cursor = "pointer";
      el.style.transition = "all 0.2s ease";
      
      // Create tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "business-tooltip hidden";
      tooltip.style.position = "absolute";
      tooltip.style.bottom = "45px";
      tooltip.style.left = "50%";
      tooltip.style.transform = "translateX(-50%)";
      tooltip.style.backgroundColor = "white";
      tooltip.style.color = "#1f2937";
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
      tooltip.style.zIndex = "10";
      tooltip.style.width = "200px";
      tooltip.style.pointerEvents = "none";
      tooltip.style.textAlign = "left";
      tooltip.innerHTML = `
        <div class="flex flex-col gap-1">
          <div class="font-semibold">${business.name}</div>
          <div class="text-xs">${business.address || 'Casablanca'}</div>
          <div class="flex items-center gap-1 text-xs">
            <span class="text-yellow-500">★</span>
            <span>${business.rating}</span>
          </div>
        </div>
      `;
      el.appendChild(tooltip);
      
      // Show tooltip on hover
      el.addEventListener("mouseenter", () => {
        tooltip.classList.remove("hidden");
        el.style.zIndex = "100";
        el.style.transform = "scale(1.1)";
      });
      
      el.addEventListener("mouseleave", () => {
        tooltip.classList.add("hidden");
        el.style.zIndex = "1";
        el.style.transform = "scale(1)";
      });

      // Add click event
      el.addEventListener("click", () => {
        // Remove focus from any previously selected markers
        Object.values(markersRef.current).forEach(marker => {
          const element = marker.getElement();
          element.style.backgroundImage = element.style.backgroundImage.replace('%23ef4444', '%236366f1');
          element.style.zIndex = "1";
        });
        
        // Update the marker state
        setSelectedBusiness(business.id);
        onSelectBusiness(business.id);
        
        // Highlight the selected marker
        el.style.backgroundImage = el.style.backgroundImage.replace('%236366f1', '%23ef4444');
        el.style.zIndex = "100";
        
        // Smooth pan to the marker
        map.current?.panTo(coordinates as [number, number], {
          duration: 800
        });
      });

      // Create and store the marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(coordinates as [number, number])
        .addTo(map.current!);
      
      markersRef.current[business.id] = marker;
    });
  };

  // Function to center map on user's location
  const centerMapOnUserLocation = () => {
    if (!userLocation) return;
    
    if (map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 13,
        essential: true
      });
    }
  };

  // Get selected business name
  const getSelectedBusinessName = () => {
    const business = businesses.find(b => b.id === selectedBusiness);
    return business ? business.name : null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" /> 
          Sélectionnez un pressing
        </CardTitle>
        <CardDescription>
          Cliquez sur un marqueur pour sélectionner un pressing disponible
          {selectedBusiness && (
            <div className="mt-2 p-2 bg-indigo-50 text-indigo-800 rounded-md text-sm font-medium">
              Pressing sélectionné: {getSelectedBusinessName()}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action button for location */}
        <div className="flex justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={centerMapOnUserLocation}
            title="Utiliser ma position actuelle"
            className="flex items-center gap-2"
          >
            <Navigation size={16} />
            Ma position
          </Button>
        </div>
        
        <div 
          ref={mapContainer} 
          className="w-full h-[400px] rounded-lg border border-gray-200 relative" 
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          <div className="col-span-full mb-2 text-sm font-medium text-gray-700">
            Pressings disponibles :
          </div>
          {businesses.map((business) => (
            <Button
              key={business.id}
              variant={selectedBusiness === business.id ? "default" : "outline"}
              className="flex items-center justify-start gap-2 py-2 h-auto"
              onClick={() => {
                setSelectedBusiness(business.id);
                onSelectBusiness(business.id);
                
                // Center on the business marker
                const marker = markersRef.current[business.id];
                if (marker) {
                  const lngLat = marker.getLngLat();
                  map.current?.panTo([lngLat.lng, lngLat.lat], {
                    duration: 800
                  });
                  
                  // Highlight the marker
                  const element = marker.getElement();
                  // Reset all markers first
                  Object.values(markersRef.current).forEach(m => {
                    const el = m.getElement();
                    el.style.backgroundImage = el.style.backgroundImage.replace('%23ef4444', '%236366f1');
                  });
                  // Highlight selected
                  element.style.backgroundImage = element.style.backgroundImage.replace('%236366f1', '%23ef4444');
                  element.style.zIndex = "100";
                }
              }}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{business.name}</span>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span>{business.rating}</span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}