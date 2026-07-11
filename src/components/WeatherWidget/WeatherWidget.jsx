import { useEffect, useState } from 'react'

const SEOUL_LATITUDE = 37.5665
const SEOUL_LONGITUDE = 126.978
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

function describeWeatherCode(weathercode) {
  if (weathercode === 0) {
    return { icon: '☀️', label: '맑음' }
  }
  if (weathercode <= 3) {
    return { icon: '⛅', label: '구름' }
  }
  if (weathercode === 45 || weathercode === 48) {
    return { icon: '🌫️', label: '안개' }
  }
  if (weathercode <= 67) {
    return { icon: '🌧️', label: '비' }
  }
  if (weathercode <= 86) {
    return { icon: '❄️', label: '눈' }
  }
  return { icon: '⛈️', label: '뇌우' }
}

function requestCurrentCoordinates() {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve({ latitude: SEOUL_LATITUDE, longitude: SEOUL_LONGITUDE })
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve({ latitude: SEOUL_LATITUDE, longitude: SEOUL_LONGITUDE })
    )
  })
}

async function fetchCurrentWeather(latitude, longitude) {
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('weather fetch failed')
  }
  const data = await response.json()
  return data.current_weather
}

function renderWeatherContent(status, weather) {
  if (status === 'loading') {
    return <p style={{ margin: 0, fontSize: '13px', color: '#333' }}>날씨 정보를 불러오는 중...</p>
  }
  if (status === 'error' || weather === null) {
    return <p style={{ margin: 0, fontSize: '13px', color: '#333' }}>날씨 정보를 불러올 수 없습니다.</p>
  }
  const { icon, label } = describeWeatherCode(weather.weathercode)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '32px' }}>{icon}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0a246a' }}>
        {Math.round(weather.temperature)}°C
      </div>
      <div style={{ fontSize: '13px', color: '#333' }}>{label}</div>
    </div>
  )
}

/**
 * 현재 위치(Geolocation, 실패 시 서울 fallback)의 실시간 날씨를 Open-Meteo API로 보여준다. props 없음.
 */
export function WeatherWidget() {
  const [status, setStatus] = useState('loading')
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    let isCancelled = false

    async function loadCurrentWeather() {
      const { latitude, longitude } = await requestCurrentCoordinates()
      try {
        const currentWeather = await fetchCurrentWeather(latitude, longitude)
        if (isCancelled) {
          return
        }
        setWeather(currentWeather)
        setStatus('ready')
      } catch {
        if (isCancelled) {
          return
        }
        setStatus('error')
      }
    }

    loadCurrentWeather()

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        border: '1px solid #7d7d64',
        borderRadius: 3,
        background: '#ece9d8',
        boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {renderWeatherContent(status, weather)}
    </div>
  )
}
