import { useEffect, useState } from 'react'
import { Desktop } from './components/Desktop/Desktop'
import { Window } from './components/Window/Window'
import { Taskbar } from './components/Taskbar/Taskbar'
import { DiaryApp } from './components/DiaryApp/DiaryApp'
import { StickerStudio } from './components/StickerStudio/StickerStudio'
import { runAssetMigration } from './storage/assetMigration'

function App() {
  const [isDiaryOpen, setIsDiaryOpen] = useState(false)
  const [isStickerStudioOpen, setIsStickerStudioOpen] = useState(false)

  // 기존 localStorage(base64) 데이터를 IndexedDB로 1회성 이관. 렌더링을 막지
  // 않도록 fire-and-forget으로 실행 — 완료 전에도 기존 base64 데이터는
  // 그대로 렌더링되므로 화면이 비어 보이지 않는다.
  useEffect(() => {
    runAssetMigration()
  }, [])

  return (
    <>
      <Desktop
        onOpenDiary={() => setIsDiaryOpen(true)}
        onOpenStickerStudio={() => setIsStickerStudioOpen(true)}
      />
      <Taskbar />
      {isDiaryOpen && (
        <Window title="diary" onClose={() => setIsDiaryOpen(false)}>
          <DiaryApp />
        </Window>
      )}
      {isStickerStudioOpen && (
        <Window title="sticker studio" onClose={() => setIsStickerStudioOpen(false)}>
          <StickerStudio />
        </Window>
      )}
    </>
  )
}

export default App
