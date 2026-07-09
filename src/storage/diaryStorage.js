const STORAGE_KEY = 'diary-app-data'

/**
 * @typedef {{ diary: { canvasJSON: object | null }, movie: { canvasJSON: object | null } }} DatePageData
 * @typedef {{ [dateKey: string]: DatePageData }} DiaryData
 */

/**
 * localStorage에서 전체 다이어리 데이터를 읽어 파싱한다.
 * 키가 없거나 파싱 실패 시 빈 객체 {}를 반환한다 (예외를 던지지 않음).
 * @returns {DiaryData}
 */
export function loadAllDiaryData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    return {}
  }
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * 전체 다이어리 데이터를 JSON.stringify해 localStorage에 저장한다.
 * @param {DiaryData} data
 * @returns {void}
 */
export function saveAllDiaryData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * 특정 날짜·탭의 데이터를 꺼낸다.
 * 해당 날짜나 탭이 없으면 { canvasJSON: null }을 반환한다.
 * @param {DiaryData} data
 * @param {string} dateKey - 'YYYY-MM-DD' 형식
 * @param {'diary' | 'movie'} tab
 * @returns {{ canvasJSON: object | null }}
 */
export function getDatePageData(data, dateKey, tab) {
  const page = data[dateKey]
  if (!page) {
    return { canvasJSON: null }
  }
  const tabData = page[tab]
  if (!tabData) {
    return { canvasJSON: null }
  }
  return { canvasJSON: tabData.canvasJSON ?? null }
}

/**
 * 특정 날짜·탭의 canvasJSON을 갱신한 새 객체를 반환한다.
 * 인자 data를 직접 변경하지 않는다.
 * @param {DiaryData} data
 * @param {string} dateKey - 'YYYY-MM-DD' 형식
 * @param {'diary' | 'movie'} tab
 * @param {object} canvasJSON
 * @returns {DiaryData}
 */
export function setDatePageData(data, dateKey, tab, canvasJSON) {
  const existingPage = data[dateKey] ?? {}
  const updatedPage = {
    ...existingPage,
    [tab]: { canvasJSON },
  }
  return {
    ...data,
    [dateKey]: updatedPage,
  }
}
