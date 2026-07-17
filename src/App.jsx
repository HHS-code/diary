import { useEffect, useState } from 'react'
import { Desktop } from './components/Desktop/Desktop'
import { Window } from './components/Window/Window'
import { Taskbar } from './components/Taskbar/Taskbar'
import { DiaryApp } from './components/DiaryApp/DiaryApp'

function App() {
  const [isDiaryOpen, setIsDiaryOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking backend...')

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(`backend: ${data.status}`))
      .catch(() => setBackendStatus('backend: unreachable'))
  }, [])

  return (
    <>
      <Desktop onOpenDiary={() => setIsDiaryOpen(true)} />
      <Taskbar />
      {isDiaryOpen && (
        <Window title="diary" onClose={() => setIsDiaryOpen(false)}>
          <DiaryApp />
        </Window>
      )}
      <div style={{ position: 'fixed', top: 8, right: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, zIndex: 9999 }}>
        {backendStatus}
      </div>
    </>
  )
}

export default App
