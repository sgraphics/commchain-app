'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Task } from '../data/mockTasks';

// Define the props interface for the Map component
interface MapProps {
  isFullscreen: boolean;
  tasks: Task[];
  selectedTaskId?: string;
  onTaskSelect?: (taskId: string) => void;
}

export default function Map({ isFullscreen, tasks, selectedTaskId, onTaskSelect }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{[key: string]: L.Marker}>({});
  
  useEffect(() => {
    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      // Center on Ukraine by default
      mapRef.current = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([49.0, 31.0], 6);
      
      // Add grayscale map tiles
      L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current);
      
      // Add zoom control to bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => {
      marker.remove();
    });
    markersRef.current = {};

    // Add markers for each task
    tasks.forEach(task => {
      // Create custom icon - different for selected task
      const isSelected = task.id === selectedTaskId;
      
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="marker-pin ${isSelected ? 'selected' : ''}">
                <div class="urgency">${task.urgency}</div>
               </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      // Create marker
      const marker = L.marker(task.coordinates, { icon })
        .addTo(mapRef.current!)
        .bindTooltip(task.name, { 
          className: 'custom-tooltip',
          direction: 'top',
          offset: [0, -15]
        });
      
      // Add click handler
      if (onTaskSelect) {
        marker.on('click', () => {
          onTaskSelect(task.id);
        });
      }
      
      // Store marker reference
      markersRef.current[task.id] = marker;
    });

    // If a task is selected, center the map on it
    if (selectedTaskId && markersRef.current[selectedTaskId]) {
      const selectedTask = tasks.find(task => task.id === selectedTaskId);
      if (selectedTask) {
        mapRef.current.setView(selectedTask.coordinates, 8);
      }
    }

    // Adjust map when fullscreen status changes
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }

    // Cleanup function
    return () => {
      // We don't destroy the map on cleanup to preserve state
      // Just invalidate size in case container changed
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
  }, [isFullscreen, tasks, selectedTaskId, onTaskSelect]);
  
  return (
    <div id="map" className="w-full h-full">
      <style jsx global>{`
        .leaflet-container {
          background-color: #e8e8e8;
          outline: none;
        }
        .leaflet-control-zoom a {
          background-color: #ffffff !important;
          color: #333333 !important;
          border-color: #cccccc !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #f5f5f5 !important;
        }
        .custom-div-icon {
          background: transparent;
          border: none;
        }
        .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          font-weight: bold;
          box-shadow: 0 0 0 2px white, 0 0 0 4px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        .marker-pin.selected {
          background-color: #ffffff;
          transform: scale(1.2);
          box-shadow: 0 0 0 2px white, 0 0 10px 4px rgba(0,0,0,0.3);
          z-index: 1000;
        }
        .urgency {
          font-size: 12px;
          color: black;
        }
        .custom-tooltip {
          background-color: white;
          border: 1px solid #cccccc;
          color: #333333;
          font-family: sans-serif;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
} 