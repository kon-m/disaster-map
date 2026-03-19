// App.js
import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import shelters from './shelters.json'
import { supabase } from './supabaseClient'

// --- ピンの色を種類ごとに決定する関数 ---
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
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })
}

// --- 現在地ボタン ---
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
    <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
      <button
        onClick={handleClick}
        style={{
          padding: '12px 20px',
          backgroundColor: '#fff',
          border: '2px solid #007bff',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          fontSize: '16px',
        }}
      >
        📍 現在地を表示
      </button>
      {position && (
        <Marker position={position}>
          <Popup>あなたは今ここにいます！</Popup>
        </Marker>
      )}
    </div>
  )
}

// --- Googleログインボタン ---
function GoogleLoginButton() {
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) console.log('Login Error:', error)
    else console.log('Redirecting to Google...', data)
  }

  return (
    <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000 }}>
      <button
        onClick={signInWithGoogle}
        style={{
          padding: '12px 20px',
          backgroundColor: '#4285F4',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          fontSize: '16px',
        }}
      >
        Sign in with Google
      </button>
    </div>
  )
}

// --- メイン App ---
function App() {
  const center = [35.1709, 136.8815] // 名古屋駅中心

  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 現在地ボタン */}
        <LocationMarker />

        {/* Googleログインボタン */}
        <GoogleLoginButton />

        {/* 避難所マーカー */}
        {shelters.map((s) => (
          <Marker key={s.id} position={s.pos} icon={getIcon(s.type)}>
            <Popup>
              <div style={{ fontSize: '14px' }}>
                <strong style={{ fontSize: '16px', color: '#333' }}>{s.name}</strong>
                <br />
                <span style={{ color: '#666' }}>種別: {s.type}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default App
