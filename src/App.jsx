// App.js
import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import shelters from './shelters.json'
import { supabase } from './supabaseClient'

// --- ピン色 ---
const getIcon = (type) => {
  let color = 'blue'
  if (type === '広域') color = 'green'
  if (type === '指定') color = 'red'
  if (type === '帰宅困難') color = 'orange'

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })
}

// --- 現在地 ---
function LocationMarker() {
  const [position, setPosition] = useState(null)
  const map = useMap()

  const handleClick = () => {
    map.locate().on('locationfound', (e) => {
      setPosition(e.latlng)
      map.flyTo(e.latlng, 15)
    })
  }

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
      <button onClick={handleClick}>📍 現在地</button>
      {position && <Marker position={position}><Popup>現在地</Popup></Marker>}
    </div>
  )
}

// --- Googleログイン ---
function GoogleLoginButton() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div style={{ position: 'absolute', top: 100, left: 20, zIndex: 1000 }}>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
    </div>
  )
}

// --- 1対1チャット（テスト用） ---
function ChatBox({ userName }) {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const ROOM_NAME = 'private-room-test'

  useEffect(() => {
    const channel = supabase.channel(ROOM_NAME)

    channel.on('broadcast', { event: 'private-message' }, ({ payload }) => {
      if (payload?.msg) {
        setMessages(prev => [...prev, payload])
      }
    })

    channel.subscribe()
    return () => channel.unsubscribe()
  }, [])

  const sendMessage = async () => {
    if (!text) return

    const channel = supabase.channel(ROOM_NAME)
    await channel.send({
      type: 'broadcast',
      event: 'private-message',
      payload: { msg: text, from: userName || '名無し' },
    })

    setMessages(prev => [...prev, { msg: text, from: userName || '名無し' }])
    setText('')
  }

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
  )
}

// --- メニュー画面 ---
function Menu({ closeMenu, userName, setUserName, passcodes, setPasscodes }) {
  const [newPasscode, setNewPasscode] = useState('')

  const addPasscode = () => {
    if (newPasscode && !passcodes.includes(newPasscode)) {
      setPasscodes([...passcodes, newPasscode])
      setNewPasscode('')
    }
  }

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
        width: 250,
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

      <div>
        <h4>登録済み合言葉:</h4>
        <ul>
          {passcodes.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>
    </div>
  )
}

// --- メイン ---
function App() {
  const center = [35.1709, 136.8815]

  const [menuOpen, setMenuOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [passcodes, setPasscodes] = useState([])

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* マップ */}
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <LocationMarker />
        <GoogleLoginButton />

        {shelters.map((s) => (
          <Marker key={s.id} position={s.pos} icon={getIcon(s.type)}>
            <Popup>{s.name}</Popup>
          </Marker>
        ))}
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
        />
      )}

      {/* 歯車ボタン */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1500 }}>
        <button onClick={() => setMenuOpen(true)}>⚙️</button>
      </div>
    </div>
  )
}

export default App
