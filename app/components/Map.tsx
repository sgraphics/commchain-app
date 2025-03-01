'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Define the props interface for the Map component
interface MapProps {
  isFullscreen?: boolean;
}

export default function Map({ isFullscreen = false }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // This code runs only on the client side
    if (typeof window !== 'undefined' && mapRef.current) {
      // Dynamically import Leaflet to avoid SSR issues
      import('leaflet').then((L) => {
        // Make sure the map container has not been initialized before
        if (mapRef.current && !mapRef.current.classList.contains('leaflet-container')) {
          // Initialize the map
          const map = L.map(mapRef.current, {
            zoomControl: false, // Remove zoom control for cleaner look
            attributionControl: false // Remove attribution for cleaner look
          }).setView([51.505, -0.09], 13);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
          
          // Add some sample markers
          L.marker([51.5, -0.09]).addTo(map)
            .bindPopup('A sample location')
            .openPopup();
            
          L.marker([51.51, -0.1]).addTo(map)
            .bindPopup('Another location');
            
          L.marker([51.49, -0.08]).addTo(map)
            .bindPopup('Third location');
            
          // Add a circle to represent an area
          L.circle([51.508, -0.11], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 500
          }).addTo(map);
          
          // Add zoom control to bottom right
          L.control.zoom({
            position: 'bottomright'
          }).addTo(map);
          
          // Adjust the map when fullscreen status changes
          if (isFullscreen) {
            setTimeout(() => {
              map.invalidateSize();
            }, 100);
          }
        }
      });
    }
    
    // Cleanup function
    return () => {
      if (mapRef.current && mapRef.current.classList.contains('leaflet-container')) {
        // If we had a reference to the map instance, we could destroy it here
      }
    };
  }, [isFullscreen]); // Re-initialize when fullscreen changes
  
  return (
    <div className="map-container h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
} 