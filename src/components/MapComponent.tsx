import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';

import { Location, ChatPin } from '../types/app';

interface MapComponentProps {
  location: Location | null;
  chatPins: ChatPin[];
  onPinPress: (pin: ChatPin) => void;
}

const WebMapView: React.FC<MapComponentProps> = ({ location, chatPins, onPinPress }) => {
  return (
    <View style={styles.webMapContainer}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>Interactive Map</Text>
        <Text style={styles.mapSubtitle}>
          {location 
            ? `Your location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
            : 'Getting your location...'
          }
        </Text>
      </View>
      
      <View style={styles.mapContent}>
        <View style={styles.gridOverlay}>
          <Text style={styles.gridText}>
            Current H3 Grid: 882a103631fffff • Coverage: ~900m radius
          </Text>
        </View>
        
        {location && (
          <View style={styles.userLocationIndicator}>
            <Text style={styles.userLocationText}>📍 You are here</Text>
          </View>
        )}
        
        {chatPins.map((pin, index) => (
          <TouchableOpacity
            key={pin.id}
            style={[
              styles.chatPin,
              {
                top: `${30 + (index * 15)}%`,
                left: `${20 + (index * 20)}%`,
              }
            ]}
            onPress={() => onPinPress(pin)}
          >
            <View style={styles.pinIcon} />
            <Text style={styles.pinLabel}>
              {pin.title} ({pin.memberCount})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
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
    backgroundColor: '#85DCBA',
  },
  mapHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 245, 229, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: 12,
    zIndex: 100,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#19323C',
    textAlign: 'center',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#19323C',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
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
    shadowColor: '#FF7E67',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
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
});

export default MapComponent;
