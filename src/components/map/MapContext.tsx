// MapContext.tsx - React context for sharing map state
import React, { createContext, useContext } from 'react';

export const MapContext = createContext<any>(null);
export const useMapContext = () => useContext(MapContext);
