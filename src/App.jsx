import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';

// MUI
import { IconButton, Menu as MuiMenu, MenuItem } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings'; // 歯車アイコン

// --- Googleログイン ---
function GoogleLoginButton() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };
  return (
    <div style={{ position: 'absolute', top: 100, left: 20, zIndex: 3000 }}>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
    </div>
  );
}

// --- チャット ---
function ChatBox({ userName }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([]);
  const ROOM_NAME = 'private-room-test';

  useEffect(() => {
    const channel = supabase.channel(ROOM_NAME);
    channel.on('broadcast', { event: 'private-message' }, ({ payload }) => {
      if (payload?.msg) setMessages(prev => [...prev, payload]);
    });
    channel.subscribe();
    return () => channel.unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!text) return;
    const channel = supabase.channel(ROOM_NAME);
    await channel.send({
      type: 'broadcast',
      event: 'private-message',
      payload: { msg: text, from: userName || '名無し' },
    });
    setMessages(prev => [...prev, { msg: text, from: userName || '名無し' }]);
    setText('');
  };

  return (
    <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 3000, background: '#fff', padding: 10 }}>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={sendMessage}>送信</button>
      <ul style={{ maxHeight: 120, overflowY: 'auto', color: '#000' }}>
        {messages.map((m, i) => (
          <li key={i}><strong>{m.from}:</strong> {m.msg}</li>
        ))}
      </ul>
    </div>
  );
}

// --- メニュー内容 ---
function MenuContent({ closeMenu, userName, setUserName, passcodes, setPasscodes, flyToLocation }) {
  const [newPasscode, setNewPasscode] = useState('');
  const addPasscode = () => {
    if (!newPasscode || passcodes.includes(newPasscode)) return;
    if (passcodes.length >= 10) return alert('合言葉は最大10個までです');
    setPasscodes([...passcodes, newPasscode]);
    setNewPasscode('');
  };
  return (
    <div style={{ padding: 10, width: 200 }}>
      <input
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="名前"
        style={{ display: 'block', marginBottom: 8, width: '100%' }}
      />
      <input
        value={newPasscode}
        onChange={(e) => setNewPasscode(e.target.value)}
        placeholder="合言葉"
        style={{ display: 'block', marginBottom: 8, width: '100%' }}
      />
      <button onClick={addPasscode} style={{ marginRight: 8 }}>追加</button>
      <button onClick={flyToLocation}>現在地</button>
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

  // bounds に応じてデータ取得
  useEffect(() => {
    if (!bounds) return;
    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://localhost:3000/api/data?north=${bounds.getNorth()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&west=${bounds.getWest()}`
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

  // 現在地取得
  const flyToLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        mapRef.current?.flyTo([latitude, longitude], 15);
      },
      () => alert('位置情報取得に失敗')
    );
  };

  const handleMenuOpen = (event) => setMenuAnchor(event.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);

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
          <Marker key={i} position={[a.lat, a.lng]}>
            <Popup>
              <strong>{a.name}</strong><br />
              {a.address}
            </Popup>
          </Marker>
        ))}

        {position && (
          <Marker position={position}>
            <Popup>現在地</Popup>
          </Marker>
        )}

        <MapBoundsUpdater onBoundsChange={setBounds} />
      </MapContainer>

      {/* 歯車ボタン（枠線付き・白背景・ホバー） */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 3000 }}>
        <IconButton
          onClick={handleMenuOpen}
          sx={{
            border: '1px solid #888',
            borderRadius: 2,
            backgroundColor: '#fff',
            '&:hover': { backgroundColor: '#f0f0f0' },
            padding: 1,
          }}
        >
          <SettingsIcon />
        </IconButton>

        <MuiMenu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem>
            <MenuContent
              closeMenu={handleMenuClose}
              userName={userName}
              setUserName={setUserName}
              passcodes={passcodes}
              setPasscodes={setPasscodes}
              flyToLocation={flyToLocation}
            />
          </MenuItem>
        </MuiMenu>
      </div>

      <ChatBox userName={userName} />
      <GoogleLoginButton />
    </div>
  );
}

export default App;
