import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';
import L from 'leaflet';

// MUI
import { IconButton, Menu as MuiMenu } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

// --- マーカー修正（スマホ対応） ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// --- Googleログイン ---
function GoogleLoginButton() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div style={{ position: 'absolute', top: 100, left: 20, zIndex: 4000 }}>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
    </div>
  );
}

// --- チャット ---
function ChatBox({ userName }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    const channel = supabase.channel('private-room-test');
    channel.on('broadcast', { event: 'private-message' }, ({ payload }) => {
      if (payload?.msg) setMessages((prev) => [...prev, payload]);
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => channel.unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!text || !channelRef.current) return;
    const payload = { msg: text, from: userName || '名無し' };
    await channelRef.current.send({
      type: 'broadcast',
      event: 'private-message',
      payload,
    });
    setMessages((prev) => [...prev, payload]);
    setText('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 4000,
        background: '#fff',
        padding: 10,
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={sendMessage}>送信</button>
      <ul style={{ maxHeight: 120, overflowY: 'auto', color: '#000' }}>
        {messages.map((m, i) => (
          <li key={i}>
            <strong>{m.from}:</strong> {m.msg}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- メニュー ---
function MenuContent({ userName, setUserName, passcodes, setPasscodes, flyToLocation }) {
  const [newPasscode, setNewPasscode] = useState('');

  const addPasscode = () => {
    if (!newPasscode || passcodes.includes(newPasscode)) return;
    if (passcodes.length >= 10) return alert('最大10個');

    setPasscodes([...passcodes, newPasscode]);
    setNewPasscode('');
  };

  return (
    <div style={{ padding: 10, width: 220 }}>
      <input
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="名前"
        style={{ width: '100%', marginBottom: 8 }}
      />
      <input
        value={newPasscode}
        onChange={(e) => setNewPasscode(e.target.value)}
        placeholder="合言葉"
        style={{ width: '100%', marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={addPasscode}>追加</button>
        <button onClick={flyToLocation}>現在地</button>
      </div>
    </div>
  );
}

// --- bounds監視 ---
function MapBoundsUpdater({ onBoundsChange }) {
  useMapEvent('moveend', (e) => {
    onBoundsChange(e.target.getBounds());
  });
  return null;
}

// --- メイン ---
function App() {
  const center = [35.1815, 136.9066];
  const mapRef = useRef();

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [userName, setUserName] = useState('');
  const [passcodes, setPasscodes] = useState([]);
  const [position, setPosition] = useState(null);
  const [adminData, setAdminData] = useState([]);
  const [bounds, setBounds] = useState(null);

  // API取得
  useEffect(() => {
    if (!bounds) return;
    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://192.168.2.114:3000/api/data?north=${bounds.getNorth()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&west=${bounds.getWest()}`
        );
        const data = await res.json();
        setAdminData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setAdminData([]);
      }
    };
    fetchData();
  }, [bounds]);

  const flyToLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        mapRef.current?.flyTo([latitude, longitude], 15);
      },
      () => alert('位置取得失敗')
    );
  };

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(map) => {
          mapRef.current = map;
          setBounds(map.getBounds());
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {adminData.map((a, i) => (
          <Marker key={i} position={[Number(a.lat), Number(a.lng)]} zIndexOffset={0}>
            <Popup>
              <strong>{a.name}</strong>
              <br />
              {a.address}
            </Popup>
          </Marker>
        ))}

        {position && (
          <Marker position={position} zIndexOffset={0}>
            <Popup>現在地</Popup>
          </Marker>
        )}

        <MapBoundsUpdater onBoundsChange={setBounds} />
      </MapContainer>

      {/* メニュー */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 3500 }}>
        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <SettingsIcon />
        </IconButton>

        <MuiMenu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{ style: { padding: 0 } }}
        >
          <MenuContent
            userName={userName}
            setUserName={setUserName}
            passcodes={passcodes}
            setPasscodes={setPasscodes}
            flyToLocation={flyToLocation}
          />
        </MuiMenu>
      </div>

      <ChatBox userName={userName} />
      <GoogleLoginButton />
    </div>
  );
}

export default App;
