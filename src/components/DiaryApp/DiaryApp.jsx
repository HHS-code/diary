import { useState, useCallback } from 'react'
import { XPCalendar } from '../XPCalendar/XPCalendar'
import { TodoWidget } from '../TodoWidget/TodoWidget'
import { WeatherWidget } from '../WeatherWidget/WeatherWidget'
import { AnalogClockWidget } from '../AnalogClockWidget/AnalogClockWidget'
import { Tabs } from '../Tabs/Tabs'
import { DiaryCanvas } from '../DiaryCanvas/DiaryCanvas'
import { loadAllDiaryData, getDatePageData, saveAllDiaryData, setDatePageData } from '../../storage/diaryStorage'

function formatToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function DiaryApp() {
  const today = new Date()
  const [screen, setScreen] = useState('main')
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(formatToday())
  const [activeTab, setActiveTab] = useState('diary')
  const [refreshKey, setRefreshKey] = useState(0)

  const allData = loadAllDiaryData()
  const { canvasJSON } = getDatePageData(allData, selectedDate, activeTab)

  function handleSelectDate(dateKey) {
    setSelectedDate(dateKey)
    setActiveTab('diary')
    setScreen('edit')
  }

  function handleChangeMonth(year, month) {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  function handleReturnToMain() {
    setScreen('main')
  }

  function handleSaveCanvas(newCanvasJSON) {
    const current = loadAllDiaryData()
    const updated = setDatePageData(current, selectedDate, activeTab, newCanvasJSON)
    saveAllDiaryData(updated)
  }

  const handleImportSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  if (screen === 'main') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          padding: '4px',
          height: '100%',
          minHeight: '520px',
          boxSizing: 'border-box',
        }}
      >
        <XPCalendar
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onChangeMonth={handleChangeMonth}
        />
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '4px', minHeight: 0 }}>
          <TodoWidget selectedDate={selectedDate} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', minHeight: 0 }}>
            <WeatherWidget />
            <AnalogClockWidget />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '24px', padding: '24px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleReturnToMain}
            style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px' }}
          >
            ◀
          </button>
          {selectedDate}
        </h2>
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
