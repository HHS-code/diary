import { useState, useCallback } from 'react'
import { Calendar } from './components/Calendar/Calendar'
import { Tabs } from './components/Tabs/Tabs'
import { DiaryCanvas } from './components/DiaryCanvas/DiaryCanvas'
import { loadAllDiaryData, getDatePageData, saveAllDiaryData, setDatePageData } from './storage/diaryStorage'

function formatToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function App() {
  const [selectedDate, setSelectedDate] = useState(formatToday())
  const [activeTab, setActiveTab] = useState('diary')
  const [refreshKey, setRefreshKey] = useState(0)

  const allData = loadAllDiaryData()
  const { canvasJSON } = getDatePageData(allData, selectedDate, activeTab)

  function handleSelectDate(dateKey) {
    setSelectedDate(dateKey)
    setActiveTab('diary')
  }

  function handleSaveCanvas(newCanvasJSON) {
    const current = loadAllDiaryData()
    const updated = setDatePageData(current, selectedDate, activeTab, newCanvasJSON)
    saveAllDiaryData(updated)
  }

  const handleImportSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px', alignItems: 'flex-start' }}>
      <Calendar selectedDate={selectedDate} onSelectDate={handleSelectDate} />
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{selectedDate}</h2>
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'diary' && (
          <DiaryCanvas
            key={`${selectedDate}-diary-${refreshKey}`}
            canvasJSON={canvasJSON}
            onSave={handleSaveCanvas}
            selectedDate={selectedDate}
            onImportSuccess={handleImportSuccess}
          />
        )}
        {activeTab === 'movie' && (
          <div style={{ padding: '32px', color: '#888', fontSize: '16px' }}>
            영화 리뷰는 곧 추가됩니다.
          </div>
        )}
      </div>
    </div>
  )
}

export default App
