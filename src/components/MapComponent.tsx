import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';

import { Location, ChatPin } from '../types/app';

interface MapComponentProps {
  location: Location | null;
  chatPins: ChatPin[];
  onPinPress: (pin: ChatPin) => void;
}

const WebMapView: React.FC<MapComponentProps> = ({ location, chatPins, onPinPress }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  console.log('🗺️ WebMapView rendering with:', {
    hasLocation: !!location,
    location: location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'null',
    chatPinsCount: chatPins.length,
    mapLoaded,
    mapError
  });

  useEffect(() => {
    // Only initialize map on web platform
    if (Platform.OS !== 'web' || !mapRef.current || leafletMapRef.current) return;

    const initializeMap = async () => {
      try {
        // Add Leaflet CSS dynamically and wait for it to load
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          
          // Wait for CSS to load
          await new Promise((resolve, reject) => {
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
          });
          
          console.log('✅ Leaflet CSS loaded successfully');
        }

        // Small delay to ensure CSS is applied
        await new Promise(resolve => setTimeout(resolve, 100));

        // Import Leaflet using require for better Metro compatibility
        console.log('📦 Importing Leaflet library...');
        let L;
        try {
          // Try direct require first
          L = require('leaflet');
        } catch (requireError) {
          console.log('⚠️ Direct require failed, trying dynamic import...');
          try {
            // Fallback to dynamic import
            L = await import('leaflet');
          } catch (importError) {
            console.error('❌ Both require and import failed:', { requireError, importError });
            throw new Error('Failed to load Leaflet library');
          }
        }
        
        // Fix default marker icons for Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Create map with default view
        const defaultLat = location?.latitude ?? -33.8737;
        const defaultLng = location?.longitude ?? 151.0947;
        
        console.log('🗺️ Initializing Leaflet map at:', { lat: defaultLat, lng: defaultLng });
        
        const map = L.map(mapRef.current!, {
          center: [defaultLat, defaultLng],
          zoom: 16,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          dragging: true,
          maxZoom: 19,
          minZoom: 10,
        });
        
        // Add tile layer with a modern map style
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 10,
        }).addTo(map);

        // Add custom zoom controls positioning
        map.zoomControl.setPosition('bottomright');

        leafletMapRef.current = map;
        setMapLoaded(true);
        setMapError(false);
        
        console.log('✅ Leaflet map initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Leaflet map:', error);
        setMapError(true);
        setMapLoaded(false);
      }
    };

    initializeMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map center when location changes (with debouncing to prevent excessive updates)
  const lastLocationUpdateRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  
  useEffect(() => {
    if (leafletMapRef.current && location) {
      const currentTime = Date.now();
      
      // Debounce location updates - only update if location changed significantly or enough time passed
      const shouldUpdate = !lastLocationUpdateRef.current || 
        Math.abs(lastLocationUpdateRef.current.lat - location.latitude) > 0.0001 ||
        Math.abs(lastLocationUpdateRef.current.lng - location.longitude) > 0.0001 ||
        (currentTime - lastLocationUpdateRef.current.time) > 10000; // 10 seconds minimum
      
      if (shouldUpdate) {
        console.log('🎯 Updating map center to user location:', location);
        leafletMapRef.current.setView([location.latitude, location.longitude], 16);
        
        lastLocationUpdateRef.current = {
          lat: location.latitude,
          lng: location.longitude,
          time: currentTime
        };
        
        // Add user location marker
        const L = (window as any).L;
        if (L) {
          // Remove existing user marker
          leafletMapRef.current.eachLayer((layer: any) => {
            if (layer.options && layer.options.isUserMarker) {
              leafletMapRef.current.removeLayer(layer);
            }
          });
          
          // Add new user marker
          const userMarker = L.marker([location.latitude, location.longitude], {
            isUserMarker: true
          }).addTo(leafletMapRef.current);
          
          userMarker.bindPopup(`📍 You are here<br/>Accuracy: ${Math.round(location.accuracy || 0)}m`);
        }
      }
    }
  }, [location]);

  // Update chat pins on map
  useEffect(() => {
    if (leafletMapRef.current) {
      console.log('📍 Updating chat pins on map:', chatPins.length);
      
      const L = (window as any).L;
      if (L) {
        // Get current pin IDs
        const currentPinIds = new Set(chatPins.map(pin => pin.id));
        
        // Remove chat markers that are no longer in the current set
        leafletMapRef.current.eachLayer((layer: any) => {
          if (layer.options && layer.options.isChatPin) {
            const pinId = layer.options.chatPinId;
            if (pinId && !currentPinIds.has(pinId)) {
              leafletMapRef.current.removeLayer(layer);
            }
          }
        });
        
        // Add new chat markers that don't exist yet
        const existingPinIds = new Set();
        leafletMapRef.current.eachLayer((layer: any) => {
          if (layer.options && layer.options.isChatPin && layer.options.chatPinId) {
            existingPinIds.add(layer.options.chatPinId);
          }
        });
        
        // Only add pins that don't already exist
        const pinsToAdd = chatPins.filter(pin => !existingPinIds.has(pin.id));
        
        // Add chat pin markers with custom icons
        pinsToAdd.forEach(pin => {
          // Create custom chat icon
          const customIcon = L.divIcon({
            className: 'custom-chat-pin',
            html: `
              <div style="
                position: relative;
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: linear-gradient(135deg, #FF7E67 0%, #FF6B52 100%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 4px 16px rgba(255, 126, 103, 0.4);
                  border: 3px solid white;
                  font-size: 18px;
                  animation: pulse 2s infinite;
                ">
                  💬
                </div>
                <div style="
                  position: absolute;
                  top: -8px;
                  right: -8px;
                  background: #85DCBA;
                  color: white;
                  border-radius: 10px;
                  padding: 2px 6px;
                  font-size: 10px;
                  font-weight: bold;
                  min-width: 18px;
                  text-align: center;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                ">
                  ${pin.memberCount || 1}
                </div>
              </div>
              <style>
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                  100% { transform: scale(1); }
                }
                .custom-chat-pin:hover {
                  z-index: 1000 !important;
                }
              </style>
            `,
            iconSize: [48, 48],
            iconAnchor: [24, 24],
          });

          const chatMarker = L.marker([pin.coordinate.latitude, pin.coordinate.longitude], {
            isChatPin: true,
            chatPinId: pin.id, // Add unique identifier for persistence
            icon: customIcon
          }).addTo(leafletMapRef.current);
          
          const popupContent = `
            <div style="
              min-width: 240px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            ">
              <div style="
                background: linear-gradient(135deg, #FF7E67 0%, #FF6B52 100%);
                padding: 16px;
                color: white;
              ">
                <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700;">${pin.title}</h3>
                ${pin.description ? `<p style="margin: 0; opacity: 0.9; font-size: 13px; line-height: 1.4;">${pin.description}</p>` : ''}
              </div>
              
              <div style="padding: 16px;">
                <div style="
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  margin-bottom: 16px;
                  padding: 12px;
                  background: #F8F9FA;
                  border-radius: 12px;
                ">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="
                      background: #85DCBA; 
                      color: white; 
                      border-radius: 8px; 
                      padding: 4px 8px; 
                      font-size: 11px; 
                      font-weight: 600;
                    ">
                      👥 ${pin.memberCount || 1}
                    </span>
                    <span style="color: #666; font-size: 11px; font-weight: 500;">
                      ${pin.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  ${pin.distance ? `
                    <span style="
                      color: #999; 
                      font-size: 11px; 
                      background: white; 
                      padding: 4px 8px; 
                      border-radius: 6px;
                      border: 1px solid #E8E8E8;
                    ">
                      📍 ${pin.distance}
                    </span>
                  ` : ''}
                </div>
                
                <button 
                  onclick="window.chatPinClicked?.('${pin.id}')" 
                  style="
                    width: 100%; 
                    background: linear-gradient(135deg, #FF7E67 0%, #FF6B52 100%);
                    color: white; 
                    border: none; 
                    border-radius: 12px; 
                    padding: 14px 20px; 
                    font-weight: 600; 
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(255, 126, 103, 0.3);
                  "
                  onmouseover="
                    this.style.transform='translateY(-2px)';
                    this.style.boxShadow='0 6px 20px rgba(255, 126, 103, 0.4)';
                  "
                  onmouseout="
                    this.style.transform='translateY(0)';
                    this.style.boxShadow='0 4px 12px rgba(255, 126, 103, 0.3)';
                  "
                >
                  🚪 Join Chat
                </button>
              </div>
            </div>
          `;
          
          // Add hover popup functionality
          chatMarker.bindPopup(popupContent, {
            maxWidth: 250,
            className: 'chat-popup'
          });
          
          // Show popup on hover, close on mouse leave
          chatMarker.on('mouseover', function(this: any) {
            this.openPopup();
          });
          
          chatMarker.on('mouseout', function(this: any) {
            // Small delay before closing to allow mouse to move to popup
            setTimeout(() => {
              if (!chatMarker.getPopup().isOpen() || !chatMarker.getPopup()._container?.matches(':hover')) {
                this.closePopup();
              }
            }, 100);
          });
        });

        // Set global function for pin clicks
        (window as any).chatPinClicked = (pinId: string) => {
          const pin = chatPins.find(p => p.id === pinId);
          if (pin) onPinPress(pin);
        };
      }
    }
  }, [chatPins, onPinPress]);

  const handleRecenterMap = () => {
    if (leafletMapRef.current && location) {
      console.log('🎯 Recentering map to user location');
      leafletMapRef.current.setView([location.latitude, location.longitude], 16);
    }
  };

  return (
    <View style={styles.webMapContainer}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <View style={styles.headerRow}>
          <Text style={styles.mapTitle}>Live Map</Text>
          <View style={styles.statusIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.mapSubtitle}>
          {location 
            ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
            : 'Getting your location...'
          }
        </Text>
        {location && location.accuracy && (
          <Text style={styles.accuracyText}>
            Accuracy: ±{Math.round(location.accuracy)}m
          </Text>
        )}
      </View>

      {/* My Location Button */}
      {location && mapLoaded && (
        <TouchableOpacity style={styles.myLocationButton} onPress={handleRecenterMap}>
          <Text style={styles.myLocationIcon}>📍</Text>
        </TouchableOpacity>
      )}
      
      {/* Leaflet Map Container */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '0px',
          overflow: 'hidden'
        }} 
      />
      
      {/* Map Loading States */}
      {!mapLoaded && !mapError && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <Text style={styles.loadingText}>Loading interactive map...</Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        </View>
      )}
      
      {/* Map Error State */}
      {mapError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Map temporarily unavailable</Text>
          <Text style={styles.errorText}>
            {location 
              ? `Showing your location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
              : 'Location services ready'
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const MapComponent: React.FC<MapComponentProps> = (props) => {
  // Always use web fallback for now to avoid react-native-maps import issues
  // TODO: Implement native maps properly for mobile platforms
  return <WebMapView {...props} />;
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  webMapContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  mapHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(25, 50, 60, 0.95)',
    borderRadius: 16,
    padding: 16,
    zIndex: 100,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    backgroundColor: '#FF7E67',
    borderRadius: 4,
    boxShadow: '0px 0px 4px rgba(255, 126, 103, 0.8)',
    elevation: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF7E67',
    letterSpacing: 1,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF5E5',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#FFF5E5',
    opacity: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  accuracyText: {
    fontSize: 11,
    color: '#85DCBA',
    opacity: 0.9,
    marginTop: 4,
    fontWeight: '500',
  },
  mapContent: {
    flex: 1,
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 245, 229, 0.9)',
    borderRadius: 12,
    padding: 12,
    zIndex: 50,
  },
  gridText: {
    fontSize: 12,
    color: '#19323C',
    textAlign: 'center',
  },
  userLocationIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    backgroundColor: 'rgba(25, 50, 60, 0.8)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 75,
  },
  userLocationText: {
    color: '#FFF5E5',
    fontSize: 12,
    fontWeight: '600',
  },
  coordinatesText: {
    color: '#FFF5E5',
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    backgroundColor: '#85DCBA',
    borderRadius: 6,
    marginBottom: 4,
    boxShadow: '0px 0px 8px rgba(133, 220, 186, 0.8)',
    elevation: 8,
  },
  chatPin: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 25,
  },
  pinIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#FF7E67',
    borderRadius: 15,
    marginBottom: 4,
    boxShadow: '0px 2px 4px rgba(255, 126, 103, 0.4)',
    elevation: 4,
  },
  pinLabel: {
    backgroundColor: 'rgba(255, 245, 229, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    color: '#19323C',
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 60,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(133, 220, 186, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#19323C',
    fontWeight: '600',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#19323C',
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 0.4,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 126, 103, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    zIndex: 1000,
  },
  errorTitle: {
    fontSize: 20,
    color: '#FFF5E5',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FFF5E5',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    width: 48,
    height: 48,
    backgroundColor: '#19323C',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
    elevation: 6,
  },
  myLocationIcon: {
    fontSize: 18,
  },
});

export default MapComponent;
