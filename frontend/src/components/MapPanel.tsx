import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { FoodShelter } from '../types';

const CAMPUS = { lat: 44.94356, lng: -93.19163 };

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface MapPanelProps {
  shelters: FoodShelter[];
}

export function MapPanel({ shelters }: MapPanelProps) {
  return (
    <div className="map-panel">
      <MapContainer
        center={[CAMPUS.lat, CAMPUS.lng]}
        zoom={12}
        className="map-container map-locked"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {shelters.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <strong>{s.name}</strong>
              <br />
              {s.address}, {s.city}
              <br />
              {s.distanceMiles} mi from campus
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
