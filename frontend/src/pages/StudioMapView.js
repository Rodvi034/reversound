import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom purple marker
const purpleIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#8b5cf6"/>
      <circle cx="12" cy="12" r="6" fill="white"/>
    </svg>
  `),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
});

const StudioMapView = ({ studios = [], onStudioClick }) => {
  const navigate = useNavigate();
  const center = studios.length > 0
    ? [studios[0].lat || 41.0082, studios[0].lng || 28.9784]
    : [41.0082, 28.9784]; // Istanbul default

  return (
    <MapContainer
      center={center}
      zoom={11}
      style={{ height: '100%', width: '100%', background: '#141416' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        className="map-tiles"
      />
      {studios.map(studio => (
        studio.lat && studio.lng ? (
          <Marker
            key={studio.id}
            position={[studio.lat, studio.lng]}
            icon={purpleIcon}
          >
            <Popup className="studio-popup">
              <div style={{ fontFamily: 'Manrope, sans-serif', minWidth: 180 }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: 14 }}>{studio.name}</p>
                <p style={{ color: '#6b7280', margin: '0 0 4px', fontSize: 12 }}>{studio.city}</p>
                <p style={{ color: '#10b981', fontWeight: 'bold', margin: '0 0 8px', fontSize: 14 }}>
                  ₺{studio.total_rate?.toFixed(0) || studio.hourly_rate?.toFixed(0)}/saat
                </p>
                <button
                  onClick={() => onStudioClick?.(studio.id)}
                  style={{ background: '#8b5cf6', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
                >
                  Görüntüle
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
};

export default StudioMapView;
