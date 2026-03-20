// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './supabaseClient';

// --- ピン色 ---
const getIcon = (type) => {
  let color = 'blue';
  if (type === '広域') color = 'green';
  if (type === '指定') color = 'red';
  if (type === '帰宅困難') color = 'orange';
  if (type === '行政') color = 'purple';

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
};

// --- Googleログイン ---
function GoogleLoginButton() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div style={{ position: 'absolute', top: 100, left: 20, zIndex: 1000 }}>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
    </div>
  );
}

// --- 1対1チャット ---
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
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        background: '#fff',
        padding: 10,
        borderRadius: 8,
        width: 260,
        maxWidth: '90vw',
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="メッセージ"
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6 }}
      />
      <button onClick={sendMessage} style={{ width: '100%' }}>送信</button>
      <ul style={{ maxHeight: 120, overflowY: 'auto', color: '#000' }}>
        {messages.map((m, i) => (
          <li key={i}><strong>{m.from}:</strong> {m.msg}</li>
        ))}
      </ul>
    </div>
  );
}

// --- メニュー画面 ---
function Menu({ closeMenu, userName, setUserName, passcodes, setPasscodes, flyToLocation }) {
  const [newPasscode, setNewPasscode] = useState('');

  const addPasscode = () => {
    if (!newPasscode) return;
    if (passcodes.includes(newPasscode)) return;
    if (passcodes.length >= 10) return alert('合言葉は最大10個までです');
    setPasscodes([...passcodes, newPasscode]);
    setNewPasscode('');
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 2000,
        background: '#fff',
        padding: 20,
        borderRadius: 8,
        width: 280,
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
      }}
    >
      <button onClick={closeMenu} style={{ float: 'right' }}>✖</button>
      <h3>設定メニュー</h3>

      <div style={{ marginBottom: 10 }}>
        <label>ユーザー名:</label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>合言葉:</label>
        <input
          value={newPasscode}
          onChange={(e) => setNewPasscode(e.target.value)}
          placeholder="新しい合言葉"
          style={{ width: '100%' }}
        />
        <button onClick={addPasscode} style={{ marginTop: 5, width: '100%' }}>追加</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <button onClick={flyToLocation} style={{ width: '100%' }}>📍 現在地取得</button>
      </div>

      <div>
        <h4>登録済み合言葉:</h4>
        <ul>
          {passcodes.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>
    </div>
  );
}

// --- 現在地取得＆マップ範囲変更時に更新するカスタムフック ---
function MapBoundsUpdater({ mapRef, onBoundsChange }) {
  useMapEvent('moveend', () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      onBoundsChange(bounds);
    }
  });
  return null;
}

// --- メイン ---
function App() {
  const center = [35.1815, 136.9066]; // 名古屋中心
  const mapRef = useRef();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [passcodes, setPasscodes] = useState([]);
  const [position, setPosition] = useState(null);
  const [adminData, setAdminData] = useState([]); // 行政APIデータ
  const [bounds, setBounds] = useState(null); // 表示範囲

  // 行政API取得
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/data');
        const data = await res.json();
        setAdminData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('行政API取得エラー', err);
        setAdminData([]);
      }
    };
    fetchAdminData();
  }, []);

  const flyToLocation = () => {
    if (!navigator.geolocation) {
      alert('このブラウザでは位置情報が使えません');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        if (mapRef.current) mapRef.current.flyTo([latitude, longitude], 15);
        if (mapRef.current) setBounds(mapRef.current.getBounds());
      },
      (err) => {
        console.error(err);
        alert('位置情報を取得できませんでした');
      },
      { enableHighAccuracy: true }
    );
  };

  // 表示範囲内の避難所だけにフィルター
  const visibleAdminData = bounds
    ? adminData.filter(a => bounds.contains([a.lat, a.lng]))
    : adminData;

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
          setBounds(mapInstance.getBounds());
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 表示範囲内の行政マーカー */}
        {visibleAdminData.map((a, i) => (
          <Marker key={i} position={[a.lat, a.lng]} icon={getIcon('行政')}>
            <Popup>
              <strong>{a.name}</strong><br/>
              種類: {a.type || '行政'}<br/>
              住所: {a.address || '不明'}<br/>
              詳細: {a.note || '-'}
            </Popup>
          </Marker>
        ))}

        {/* 現在地マーカー */}
        {position && <Marker position={position}><Popup>現在地</Popup></Marker>}

        {/* bounds 更新 */}
        <MapBoundsUpdater mapRef={mapRef} onBoundsChange={setBounds} />
      </MapContainer>

      {/* チャット */}
      <ChatBox userName={userName} />

      {/* メニュー */}
      {menuOpen && (
        <Menu
          closeMenu={() => setMenuOpen(false)}
          userName={userName}
          setUserName={setUserName}
          passcodes={passcodes}
          setPasscodes={setPasscodes}
          flyToLocation={flyToLocation}
        />
      )}

      {/* 歯車ボタン */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1500 }}>
        <button onClick={() => setMenuOpen(true)}>⚙️</button>
      </div>

      {/* Googleログイン */}
      <GoogleLoginButton />
    </div>
  );
}

export default App;
