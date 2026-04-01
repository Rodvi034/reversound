import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Price pill marker (Airbnb style)
const createPriceIcon = (price, isSelected = false) => {
  const bg = isSelected ? '#8b5cf6' : '#0d0d0f';
  const border = isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.3)';
  const textColor = '#ffffff';

  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};
      border:1.5px solid ${border};
      color:${textColor};
      font-family:'Manrope',Arial,sans-serif;
      font-size:12px;
      font-weight:700;
      padding:5px 10px;
      border-radius:20px;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      transition:all 0.15s;
      ${isSelected ? 'box-shadow:0 0 12px rgba(139,92,246,0.6);transform:scale(1.1);' : ''}
    ">₺${Math.round(price)}</div>`,
    iconSize: [null, null],
    iconAnchor: [0, 0],
  });
};

// Auto-fit bounds to all markers
const FitBounds = ({ studios }) => {
  const map = useMap();
  useEffect(() => {
    if (studios.length === 0) return;
    const validStudios = studios.filter(s => s.lat && s.lng);
    if (validStudios.length === 0) return;
    if (validStudios.length === 1) {
      map.setView([validStudios[0].lat, validStudios[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(validStudios.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [studios]);
  return null;
};

const StudioMapView = ({ studios = [], selectedId, onStudioClick }) => {
  const navigate = useNavigate();
  const center = studios.length > 0 && studios[0].lat
    ? [studios[0].lat, studios[0].lng]
    : [39.9043, 32.7560]; // Turkey center

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FitBounds studios={studios} />

      {studios.map(studio => (
        studio.lat && studio.lng ? (
          <Marker
            key={studio.id}
            position={[studio.lat, studio.lng]}
            icon={createPriceIcon(studio.total_rate || studio.hourly_rate || 0, selectedId === studio.id)}
          >
            <Popup className="studio-popup" maxWidth={240} minWidth={220}>
              <div style={{ fontFamily: 'Manrope, Arial, sans-serif', padding: '4px' }}>
                {/* Photo */}
                {studio.photos?.[0] && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', height: 130 }}>
                    <img src={studio.photos[0]} alt={studio.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                {/* Info */}
                <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px', color: '#0d0d0f' }}>{studio.name}</p>
                <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 6px' }}>{studio.city}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 15, margin: 0 }}>
                    ₺{(studio.total_rate || studio.hourly_rate || 0).toFixed(0)}<span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280' }}>/saat</span>
                  </p>
                  {studio.rating > 0 && (
                    <span style={{ fontSize: 11, color: '#6b7280' }}>★ {studio.rating}</span>
                  )}
                </div>
                <button
                  onClick={() => onStudioClick?.(studio.id)}
                  style={{
                    marginTop: 10,
                    width: '100%',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 0',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontFamily: 'Manrope, Arial, sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Stüdyoyu Gör
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
