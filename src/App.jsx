import { useState } from 'react'
import { Desktop } from './components/Desktop/Desktop'
import { Window } from './components/Window/Window'
import { Taskbar } from './components/Taskbar/Taskbar'
import { DiaryApp } from './components/DiaryApp/DiaryApp'

function App() {
  const [isDiaryOpen, setIsDiaryOpen] = useState(false)

  return (
    <>
      <Desktop onOpenDiary={() => setIsDiaryOpen(true)} />
      <Taskbar />
      {isDiaryOpen && (
        <Window title="diary" onClose={() => setIsDiaryOpen(false)}>
          <DiaryApp />
        </Window>
      )}
    </>
  )
}

export default App
