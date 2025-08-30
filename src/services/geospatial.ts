import { geoToH3, kRing } from 'h3-js';
import { Location } from '../types/app';
import { CONFIG } from '../config/environment';

export const getH3Index = (location: Location): string => {
  return geoToH3(location.latitude, location.longitude, CONFIG.H3_RESOLUTION);
};

export const getNeighborCells = (h3Index: string, ringSize: number = 1): string[] => {
  return kRing(h3Index, ringSize);
};

export const getLocationH3Neighbors = (location: Location, ringSize: number = 1): string[] => {
  const centerCell = getH3Index(location);
  return getNeighborCells(centerCell, ringSize);
};

export const simpleGeohash = (lat: number, lng: number, precision: number = 8): string => {
  const latFloor = Math.floor(lat * Math.pow(10, precision / 2));
  const lngFloor = Math.floor(lng * Math.pow(10, precision / 2));
  return `${latFloor}_${lngFloor}`;
};
