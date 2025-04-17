import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Navigation, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Initialize Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Casablanca center
const CASABLANCA_CENTER = [-7.589843, 33.573109];

interface AddressMapProps {
  pickupAddress: string;
  deliveryAddress: string;
  onPickupAddressChange: (address: string, coordinates: [number, number]) => void;
  onDeliveryAddressChange: (address: string, coordinates: [number, number]) => void;
}

export default function AddressMap({
  pickupAddress,
  deliveryAddress,
  onPickupAddressChange,
  onDeliveryAddressChange,
}: AddressMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [currentMode, setCurrentMode] = useState<"pickup" | "delivery">("pickup");
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeMarker, setActiveMarker] = useState<"pickup" | "delivery" | null>(null);
  
  // Refs for markers
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const centerMarkerRef = useRef<HTMLDivElement | null>(null);

  // Initialize map
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

    // Create center marker (fixed pin at center)
    const centerMarkerEl = document.createElement('div');
    centerMarkerEl.className = 'center-marker-container';
    centerMarkerEl.style.position = 'absolute';
    centerMarkerEl.style.left = '50%';
    centerMarkerEl.style.top = '50%';
    centerMarkerEl.style.transform = 'translate(-50%, -100%)';
    centerMarkerEl.style.pointerEvents = 'none';
    centerMarkerEl.style.display = 'none';
    centerMarkerEl.style.zIndex = '10';
    
    // Add the pin icon as a fully contained element
    const pinIcon = document.createElement('div');
    pinIcon.style.width = '40px';
    pinIcon.style.height = '40px';
    pinIcon.style.backgroundColor = currentMode === 'pickup' ? '#2563eb' : '#10b981'; // blue or green
    pinIcon.style.borderRadius = '50%';
    pinIcon.style.display = 'flex';
    pinIcon.style.alignItems = 'center';
    pinIcon.style.justifyContent = 'center';
    pinIcon.style.color = 'white';
    
    // Add the appropriate icon
    pinIcon.innerHTML = currentMode === 'pickup' 
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="currentColor"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
         </svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" fill="currentColor"/>
          <path d="M9 22V12h6v10" stroke="white" stroke-width="2"/>
         </svg>`;
         
    centerMarkerEl.appendChild(pinIcon);
    centerMarkerRef.current = centerMarkerEl;
    mapContainer.current.appendChild(centerMarkerEl);

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation([longitude, latitude]);
          
          // Center map on user's location
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 14,
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

    // Add existing markers if addresses already exist
    if (pickupAddress) {
      reverseGeocode(CASABLANCA_CENTER).then(address => {
        createPickupMarker(CASABLANCA_CENTER, address);
      });
    }
    
    if (deliveryAddress) {
      reverseGeocode(CASABLANCA_CENTER).then(address => {
        createDeliveryMarker(CASABLANCA_CENTER, address);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
      }
    };
  }, []);

  // Update center marker when mode changes
  useEffect(() => {
    if (centerMarkerRef.current && centerMarkerRef.current.firstChild) {
      const pinIcon = centerMarkerRef.current.firstChild as HTMLElement;
      pinIcon.style.backgroundColor = currentMode === 'pickup' ? '#2563eb' : '#10b981';
      
      pinIcon.innerHTML = currentMode === 'pickup' 
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="currentColor"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
           </svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" fill="currentColor"/>
            <path d="M9 22V12h6v10" stroke="white" stroke-width="2"/>
           </svg>`;
    }
  }, [currentMode, activeMarker]);

  // Function to reverse geocode coordinates to address
  const reverseGeocode = async (coordinates: [number, number]): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxgl.accessToken}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      
      return `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`;
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      return `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`;
    }
  };

  // Function to create pickup marker
  const createPickupMarker = (coordinates: [number, number], address: string) => {
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
    }
    
    // Create custom HTML element for marker
    const el = document.createElement("div");
    el.className = "pickup-marker";
    el.style.cursor = "pointer";
    
    // Create icon container
    const iconContainer = document.createElement("div");
    iconContainer.style.backgroundColor = '#2563eb'; // Blue
    iconContainer.style.color = 'white';
    iconContainer.style.borderRadius = '50%';
    iconContainer.style.width = '40px';
    iconContainer.style.height = '40px';
    iconContainer.style.display = 'flex';
    iconContainer.style.alignItems = 'center';
    iconContainer.style.justifyContent = 'center';
    
    // Add pin icon
    iconContainer.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="currentColor"/>
        <circle cx="12" cy="10" r="3" fill="white"/>
      </svg>
    `;
    
    el.appendChild(iconContainer);
    
    // Tooltip for the marker
    const tooltip = document.createElement("div");
    tooltip.className = "marker-tooltip hidden";
    tooltip.style.position = "absolute";
    tooltip.style.bottom = "45px";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.backgroundColor = "#2563eb";
    tooltip.style.color = "white";
    tooltip.style.padding = "8px 12px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    tooltip.style.maxWidth = "250px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "10";
    tooltip.style.textAlign = "left";
    
    const tooltipTitle = document.createElement("p");
    tooltipTitle.style.fontWeight = "600";
    tooltipTitle.style.margin = "0 0 4px 0";
    tooltipTitle.textContent = "Point de ramassage";
    
    const tooltipAddress = document.createElement("p");
    tooltipAddress.style.fontSize = "12px";
    tooltipAddress.style.margin = "0";
    tooltipAddress.style.overflow = "hidden";
    tooltipAddress.style.textOverflow = "ellipsis";
    tooltipAddress.style.whiteSpace = "nowrap";
    tooltipAddress.textContent = address;
    
    tooltip.appendChild(tooltipTitle);
    tooltip.appendChild(tooltipAddress);
    el.appendChild(tooltip);
    
    // Show tooltip on hover
    el.addEventListener("mouseenter", () => {
      tooltip.classList.remove("hidden");
    });
    el.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
    });
    
    // Create the marker
    pickupMarkerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(coordinates)
      .addTo(map.current!);
    
    // Pan to the marker
    map.current?.panTo(coordinates);
  };

  // Function to create delivery marker
  const createDeliveryMarker = (coordinates: [number, number], address: string) => {
    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.remove();
    }
    
    // Create custom HTML element for marker
    const el = document.createElement("div");
    el.className = "delivery-marker";
    el.style.cursor = "pointer";
    
    // Create icon container
    const iconContainer = document.createElement("div");
    iconContainer.style.backgroundColor = '#10b981'; // Green
    iconContainer.style.color = 'white';
    iconContainer.style.borderRadius = '50%';
    iconContainer.style.width = '40px';
    iconContainer.style.height = '40px';
    iconContainer.style.display = 'flex';
    iconContainer.style.alignItems = 'center';
    iconContainer.style.justifyContent = 'center';
    
    // Add home icon
    iconContainer.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" fill="currentColor"/>
        <path d="M9 22V12h6v10" stroke="white" stroke-width="2"/>
      </svg>
    `;
    
    el.appendChild(iconContainer);
    
    // Tooltip for the marker
    const tooltip = document.createElement("div");
    tooltip.className = "marker-tooltip hidden";
    tooltip.style.position = "absolute";
    tooltip.style.bottom = "45px";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.backgroundColor = "#10b981";
    tooltip.style.color = "white";
    tooltip.style.padding = "8px 12px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    tooltip.style.maxWidth = "250px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "10";
    tooltip.style.textAlign = "left";
    
    const tooltipTitle = document.createElement("p");
    tooltipTitle.style.fontWeight = "600";
    tooltipTitle.style.margin = "0 0 4px 0";
    tooltipTitle.textContent = "Point de livraison";
    
    const tooltipAddress = document.createElement("p");
    tooltipAddress.style.fontSize = "12px";
    tooltipAddress.style.margin = "0";
    tooltipAddress.style.overflow = "hidden";
    tooltipAddress.style.textOverflow = "ellipsis";
    tooltipAddress.style.whiteSpace = "nowrap";
    tooltipAddress.textContent = address;
    
    tooltip.appendChild(tooltipTitle);
    tooltip.appendChild(tooltipAddress);
    el.appendChild(tooltip);
    
    // Show tooltip on hover
    el.addEventListener("mouseenter", () => {
      tooltip.classList.remove("hidden");
    });
    el.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
    });
    
    // Create the marker
    deliveryMarkerRef.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(coordinates)
      .addTo(map.current!);
    
    // Pan to the marker
    map.current?.panTo(coordinates);
  };

  // Function to start placement mode (Glovo style)
  const startPlacementMode = (mode: "pickup" | "delivery") => {
    setActiveMarker(mode);
    setCurrentMode(mode);
    
    // Show center marker
    if (centerMarkerRef.current) {
      centerMarkerRef.current.style.display = 'block';
    }
    
    // Notify user they are in placement mode
    setError("Déplacez la carte pour positionner le marqueur au centre");
  };

  // Function to confirm marker placement
  const confirmMarkerPlacement = async () => {
    if (!map.current || !activeMarker) return;
    
    setLoading(true);
    
    try {
      // Get center coordinates
      const center = map.current.getCenter();
      const coordinates: [number, number] = [center.lng, center.lat];
      
      // Get address from coordinates
      const address = await reverseGeocode(coordinates);
      
      // Create marker based on active mode
      if (activeMarker === 'pickup') {
        createPickupMarker(coordinates, address);
        onPickupAddressChange(address, coordinates);
      } else {
        createDeliveryMarker(coordinates, address);
        onDeliveryAddressChange(address, coordinates);
      }
      
      // Hide center marker and exit placement mode
      if (centerMarkerRef.current) {
        centerMarkerRef.current.style.display = 'none';
      }
      
      setActiveMarker(null);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la récupération de l'adresse. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Function to cancel marker placement
  const cancelMarkerPlacement = () => {
    if (centerMarkerRef.current) {
      centerMarkerRef.current.style.display = 'none';
    }
    
    setActiveMarker(null);
    setError(null);
  };

  // Function to center map on user's location
  const centerMapOnUserLocation = () => {
    if (!userLocation) {
      setError("Impossible d'obtenir votre position actuelle");
      return;
    }
    
    setError(null);
    map.current?.flyTo({
      center: userLocation,
      zoom: 15,
      essential: true
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sélectionnez vos adresses</CardTitle>
        <CardDescription>
          Choisissez les adresses de ramassage et de livraison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="pickup" className="w-full" onValueChange={(value) => setCurrentMode(value as "pickup" | "delivery")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pickup" className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              Adresse de ramassage
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Home size={16} className="text-green-600" />
              Adresse de livraison
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pickup" className="mt-4">
            <div className="space-y-4">
              <Button 
                onClick={() => startPlacementMode("pickup")}
                className="w-full flex items-center justify-center gap-2"
                disabled={activeMarker !== null}
              >
                <MapPin size={16} />
                Placer le point de ramassage sur la carte
              </Button>
              
              {pickupAddress && (
                <div className="flex items-center p-2 border rounded-md bg-blue-50 border-blue-200">
                  <MapPin size={16} className="text-blue-600 mr-2 flex-shrink-0" />
                  <p className="text-sm truncate flex-1">{pickupAddress}</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="delivery" className="mt-4">
            <div className="space-y-4">
              <Button 
                onClick={() => startPlacementMode("delivery")}
                className="w-full flex items-center justify-center gap-2"
                disabled={activeMarker !== null}
              >
                <Home size={16} />
                Placer le point de livraison sur la carte
              </Button>
              
              {deliveryAddress && (
                <div className="flex items-center p-2 border rounded-md bg-green-50 border-green-200">
                  <Home size={16} className="text-green-600 mr-2 flex-shrink-0" />
                  <p className="text-sm truncate flex-1">{deliveryAddress}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Action buttons for location */}
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
        
        {error && (
          <Alert variant={activeMarker ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{activeMarker ? "Mode placement actif" : "Erreur"}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div 
          ref={mapContainer} 
          className="w-full h-[400px] rounded-lg border border-gray-200 relative"
        />
        
        {/* Confirmation buttons during placement mode */}
        {activeMarker && (
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={confirmMarkerPlacement} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span>
              ) : (
                <Check size={16} className="mr-2" />
              )}
              Confirmer cet emplacement
            </Button>
            <Button 
              onClick={cancelMarkerPlacement} 
              variant="outline"
            >
              Annuler
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}