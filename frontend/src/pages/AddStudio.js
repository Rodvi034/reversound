import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Search, Plus, Trash2, Loader, ChevronLeft, Info } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import Layout from '@/components/Layout';
import DragDropZone from '@/components/DragDropZone';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'leaflet/dist/leaflet.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const pinIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="30" height="45">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#8b5cf6"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [30, 45],
  iconAnchor: [15, 45],
  popupAnchor: [0, -45],
});

// Component to handle map clicks and update position
const DraggableMarker = ({ position, onPositionChange }) => {
  const map = useMap();

  useMapEvents({
    click(e) { onPositionChange([e.latlng.lat, e.latlng.lng]); }
  });

  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position]);

  if (!position) return null;
  return (
    <Marker
      position={position}
      icon={pinIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => onPositionChange([e.target.getLatLng().lat, e.target.getLatLng().lng])
      }}
    />
  );
};

const AMENITIES_LIST = [
  "Grand Piyano", "Full Davul Seti", "Vokal Kabini", "Canlı Oda", "Kontrol Odası",
  "Pro Tools", "Logic Pro X", "Ableton Live", "SSL Console", "Genelec Monitör",
  "Neumann Mikrofon", "Yüksek Hızlı WiFi", "Otopark", "Klima", "Lounge Alan", "Catering"
];

const AddStudio = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: '', description: '', address: '', city: '', country: 'Türkiye',
    hourly_rate: 250, max_capacity: 5, rules: '',
    amenities: [], equipment: [], photos: [],
  });
  const [mapPosition, setMapPosition] = useState([39.9043, 32.7560]); // Turkey center
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [equipInput, setEquipInput] = useState('');

  const geocodeAddress = useCallback(async (address) => {
    if (!address || address.length < 5) return;
    setGeocoding(true);
    try {
      const encoded = encodeURIComponent(address + ', Türkiye');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        setMapPosition([parseFloat(lat), parseFloat(lon)]);
      }
    } catch {} finally { setGeocoding(false); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.photos.length === 0) { setError('En az 1 fotoğraf ekleyin'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/studios`, {
        ...form,
        lat: mapPosition[0],
        lng: mapPosition[1],
      }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      navigate('/studios');
    } catch (err) {
      setError(err.response?.data?.detail || 'Stüdyo eklenemedi');
    } finally { setLoading(false); }
  };

  const toggleAmenity = (a) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
    }));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/studios')} className="flex items-center gap-2 text-[#a1a1aa] hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft size={16} /> Stüdyo Market
        </button>
        <h1 className="font-heading font-bold text-2xl text-white mb-6 flex items-center gap-2">
          <MapPin size={20} className="text-[#8b5cf6]" /> Stüdyo Ekle
        </h1>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Stüdyo Bilgileri</h3>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Stüdyo Adı *</label>
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="rs-input text-sm" placeholder="Istanbul Sound Studio" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Açıklama *</label>
              <textarea required rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Stüdyonuzu detaylıca tanıtın..." className="rs-input resize-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Saatlik Ücret (₺) *</label>
                <input required type="number" min={50} value={form.hourly_rate}
                  onChange={e => setForm(f => ({ ...f, hourly_rate: parseFloat(e.target.value) }))}
                  className="rs-input text-sm h-9" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Maks. Kapasite</label>
                <input type="number" min={1} max={50} value={form.max_capacity}
                  onChange={e => setForm(f => ({ ...f, max_capacity: parseInt(e.target.value) }))}
                  className="rs-input text-sm h-9" />
              </div>
            </div>
          </div>

          {/* Address + Map */}
          <div className="rs-card p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Konum</h3>
            <div className="flex items-start gap-2 p-3 bg-[#8b5cf6]/5 border border-[#8b5cf6]/20 rounded-md">
              <Info size={13} className="text-[#8b5cf6] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#a1a1aa]">Adres yazınca pin otomatik yerleşir. Pini sürükleyerek tam konumu ayarlayabilirsiniz.</p>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Tam Adres *</label>
              <div className="flex gap-2">
                <input required type="text" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  onBlur={e => geocodeAddress(e.target.value)}
                  className="rs-input flex-1 text-sm h-9"
                  placeholder="Rıhtım Cad. No:12, Karaköy" />
                <button type="button" onClick={() => geocodeAddress(form.address)}
                  disabled={geocoding}
                  className="px-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-md hover:bg-[#8b5cf6]/20 transition-colors flex-shrink-0">
                  {geocoding ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-1.5">Şehir *</label>
              <input required type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="rs-input text-sm h-9" placeholder="İstanbul" />
            </div>

            {/* Interactive Map */}
            <div>
              <label className="block text-xs font-mono uppercase text-[#a1a1aa] mb-2">
                Konumu Haritada Doğrula <span className="text-[#8b5cf6]">(pini sürükleyebilirsiniz)</span>
              </label>
              <div className="rounded-xl overflow-hidden border border-white/10 h-52">
                <MapContainer center={mapPosition} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <DraggableMarker position={mapPosition} onPositionChange={setMapPosition} />
                </MapContainer>
              </div>
              <p className="text-[10px] text-[#a1a1aa] mt-1 font-mono">
                Lat: {mapPosition[0].toFixed(6)}, Lng: {mapPosition[1].toFixed(6)}
              </p>
            </div>
          </div>

          {/* Photos */}
          <div className="rs-card p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Fotoğraflar *</h3>
            <DragDropZone
              type="image"
              label="Stüdyo fotoğrafı ekle"
              onUploaded={r => setForm(f => ({ ...f, photos: [...f.photos, r.url] }))}
              uploadEndpoint={`${API}/upload/image`}
              token={token}
              compact
            />
            <div className="flex gap-2 mt-2">
              <input type="url" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), photoUrl && (setForm(f => ({ ...f, photos: [...f.photos, photoUrl] })), setPhotoUrl('')))}
                placeholder="Veya URL girin..." className="rs-input flex-1 text-sm h-9" />
              <button type="button" onClick={() => { if (photoUrl) { setForm(f => ({ ...f, photos: [...f.photos, photoUrl] })); setPhotoUrl(''); } }}
                className="px-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-md hover:bg-[#8b5cf6]/20">
                <Plus size={14} />
              </button>
            </div>
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden h-20 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                      className="absolute top-1 right-1 w-5 h-5 bg-[#ec4899] rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="rs-card p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Olanaklar</h3>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_LIST.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all ${form.amenities.includes(a) ? 'bg-[#8b5cf6] text-white' : 'bg-[#0d0d0f] border border-white/10 text-[#a1a1aa] hover:border-white/20 hover:text-white'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="rs-card p-5 space-y-3">
            <h3 className="text-xs font-mono uppercase text-[#a1a1aa] tracking-wider">Ekipman</h3>
            <div className="flex gap-2">
              <input type="text" value={equipInput} onChange={e => setEquipInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && equipInput.trim()) { e.preventDefault(); setForm(f => ({ ...f, equipment: [...f.equipment, equipInput.trim()] })); setEquipInput(''); } }}
                placeholder="Neumann U87, SSL Console..." className="rs-input flex-1 text-sm h-9" />
              <button type="button" onClick={() => { if (equipInput.trim()) { setForm(f => ({ ...f, equipment: [...f.equipment, equipInput.trim()] })); setEquipInput(''); } }}
                className="px-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 text-[#8b5cf6] rounded-md hover:bg-[#8b5cf6]/20">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.equipment.map((eq, i) => (
                <span key={i} className="badge-genre flex items-center gap-1">
                  {eq}
                  <button type="button" onClick={() => setForm(f => ({ ...f, equipment: f.equipment.filter((_, j) => j !== i) }))} className="hover:text-[#ec4899]">
                    <Trash2 size={9} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all hover:shadow-glow flex items-center justify-center gap-2 text-base"
            data-testid="add-studio-submit">
            {loading ? <Loader size={18} className="animate-spin" /> : <><MapPin size={18} /> Stüdyoyu Yayınla</>}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default AddStudio;
