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
      <button>Sign in with Google</button>
    </div>
  )
}

// --- コメント ---
function CommentBox() {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [channel, setChannel] = useState(null)

  useEffect(() => {
    const ch = supabase.channel('pins')

    // ★ 修正：payloadの中身を取り出す
    ch.on('broadcast', { event: 'new-comment' }, ({ payload }) => {
      console.log('受信:', payload)
      if (payload?.msg) {
        setMessages((prev) => [...prev, payload.msg])
      }
    })

    ch.subscribe((status) => {
      console.log('状態:', status)
    })

    setChannel(ch)

    return () => ch.unsubscribe()
  }, [])

  const sendMessage = async () => {
    if (!text || !channel) return

    await channel.send({
      type: 'broadcast',
      event: 'new-comment',
      payload: { msg: text },
    })

    // ★ 自分にも即表示
    setMessages((prev) => [...prev, text])

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
        placeholder="コメント"
        style={{
          width: '100%',
          boxSizing: 'border-box', // ★ はみ出し防止
          marginBottom: 6,
        }}
      />

      <button onClick={sendMessage} style={{ width: '100%' }}>
        送信
      </button>

      <ul style={{ maxHeight: 120, overflowY: 'auto', color: '#000' }}>
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  )
}

// --- メイン ---
function App() {
  const center = [35.1709, 136.8815]

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
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

      <CommentBox />
    </div>
  )
}

export default App
