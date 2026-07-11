const STORAGE_KEY = 'diary-app-data'

/**
 * @typedef {{ id: string, text: string, done: boolean }} Todo
 * @typedef {{ width: number, height: number }} CanvasSize
 * @typedef {{ canvasJSON: object | null, canvasSize?: CanvasSize }} TabPageData
 * @typedef {{ diary: TabPageData, movie: TabPageData, todos?: Todo[] }} DatePageData
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
 * 해당 날짜나 탭이 없으면 { canvasJSON: null, canvasSize: null }을 반환한다.
 * canvasSize가 저장돼 있지 않으면(구버전 데이터) null을 반환한다.
 * @param {DiaryData} data
 * @param {string} dateKey - 'YYYY-MM-DD' 형식
 * @param {'diary' | 'movie'} tab
 * @returns {{ canvasJSON: object | null, canvasSize: CanvasSize | null }}
 */
export function getDatePageData(data, dateKey, tab) {
  const page = data[dateKey]
  if (!page) {
    return { canvasJSON: null, canvasSize: null }
  }
  const tabData = page[tab]
  if (!tabData) {
    return { canvasJSON: null, canvasSize: null }
  }
  return { canvasJSON: tabData.canvasJSON ?? null, canvasSize: tabData.canvasSize ?? null }
}

/**
 * 특정 날짜·탭의 canvasJSON(과 저장 당시 캔버스 크기)을 갱신한 새 객체를 반환한다.
 * 인자 data를 직접 변경하지 않는다. canvasSize를 생략하면 저장하지 않는다(기존 호출부 호환).
 * @param {DiaryData} data
 * @param {string} dateKey - 'YYYY-MM-DD' 형식
 * @param {'diary' | 'movie'} tab
 * @param {object} canvasJSON
 * @param {CanvasSize} [canvasSize]
 * @returns {DiaryData}
 */
export function setDatePageData(data, dateKey, tab, canvasJSON, canvasSize) {
  const existingPage = data[dateKey] ?? {}
  let tabData = { canvasJSON }
  if (canvasSize) {
    tabData = { canvasJSON, canvasSize }
  }
  const updatedPage = {
    ...existingPage,
    [tab]: tabData,
  }
  return {
    ...data,
    [dateKey]: updatedPage,
  }
}

/**
 * 특정 날짜의 할 일 목록을 꺼낸다.
 * 해당 날짜에 todos가 없으면 빈 배열을 반환한다.
 * @param {DiaryData} data
 * @param {string} dateKey - 'YYYY-MM-DD' 형식
 * @returns {Todo[]}
 */
export function getDateTodos(data, dateKey) {
  const page = data[dateKey]
  if (!page) {
    return []
  }
  return page.todos ?? []
}

/**
 * 특정 날짜의 todos를 갱신한 새 객체를 반환한다.
 * 인자 data를 직접 변경하지 않는다. 같은 날짜의 기존 diary/movie 필드는 보존한다.
 * @param {DiaryData} data
 * @param {string} dateKey - 'YYYY-MM-DD' 형식
 * @param {Todo[]} todos
 * @returns {DiaryData}
 */
export function setDateTodos(data, dateKey, todos) {
  const existingPage = data[dateKey] ?? {}
  const updatedPage = {
    ...existingPage,
    todos,
  }
  return {
    ...data,
    [dateKey]: updatedPage,
  }
}
