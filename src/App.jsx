import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import shelterData from './shelters.json';

// アイコン設定
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 現在地へ飛ぶボタンの部品
function LocationButton() {
  const map = useMap();
  const handleClick = () => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, 16);
      L.marker(e.latlng).addTo(map).bindPopup("あなたの現在地").openPopup();
    });
  };
  return (
    <button onClick={handleClick} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
      現在地を表示
    </button>
  );
}

function App() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <LocationButton />
      <MapContainer center={[35.1709, 136.8815]} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {shelterData.map((s) => (
          <Marker key={s.id} position={s.pos}>
            <Popup><strong>{s.name}</strong><br/>種別: {s.type}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
export default App;
