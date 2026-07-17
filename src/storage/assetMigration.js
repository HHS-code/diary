import { loadAllDiaryData, saveAllDiaryData } from './diaryStorage'
import { saveAsset } from './assetStorage'

const MIGRATION_DONE_KEY = 'diary-asset-migration-done'
const TABS = ['diary', 'movie']

function isBase64ImageObject(object) {
  return typeof object.src === 'string' && object.src.startsWith('data:')
}

/**
 * base64 이미지 오브젝트 하나를 Blob으로 변환해 IndexedDB에 저장하고,
 * src를 제거한 뒤 assetId를 추가한 새 오브젝트를 반환한다.
 * @param {object} object
 * @param {string} filename
 * @returns {Promise<object>}
 */
async function migrateBase64ImageObject(object, filename) {
  const response = await fetch(object.src)
  const blob = await response.blob()
  const assetId = await saveAsset({ type: 'image', filename, mimeType: blob.type, blob })

  const { src: _src, ...rest } = object
  return { ...rest, assetId }
}

/**
 * canvasJSON.objects 배열을 순회하며 base64 이미지 오브젝트를 assetId 참조로 교체한다.
 * 개별 오브젝트 변환이 실패하면 원본 그대로 두고 다음 오브젝트를 계속 처리한다.
 * @param {object[]} objects
 * @param {string} migrationKey
 * @returns {Promise<object[]>}
 */
async function migrateCanvasObjects(objects, migrationKey) {
  const migratedObjects = []
  for (let index = 0; index < objects.length; index++) {
    const object = objects[index]
    if (!isBase64ImageObject(object)) {
      migratedObjects.push(object)
      continue
    }

    try {
      const filename = `migrated-${migrationKey}-${index}`
      migratedObjects.push(await migrateBase64ImageObject(object, filename))
    } catch {
      migratedObjects.push(object)
    }
  }
  return migratedObjects
}

async function migrateTabData(tabData, migrationKey) {
  if (!tabData?.canvasJSON?.objects) {
    return tabData
  }
  const objects = await migrateCanvasObjects(tabData.canvasJSON.objects, migrationKey)
  return { ...tabData, canvasJSON: { ...tabData.canvasJSON, objects } }
}

async function migrateDatePage(page, dateKey) {
  const migratedPage = { ...page }
  for (const tab of TABS) {
    if (page[tab]) {
      migratedPage[tab] = await migrateTabData(page[tab], `${dateKey}-${tab}`)
    }
  }
  return migratedPage
}

/**
 * localStorage(diary-app-data)에 base64로 박혀 있던 이미지를 IndexedDB(assetStorage)로
 * 1회성 이관한다. 이미 완료된 경우(diary-asset-migration-done === 'true') 아무 것도 하지 않는다.
 * 개별 이미지 변환 실패는 해당 오브젝트만 건너뛰고 전체를 롤백하지 않는다.
 * @returns {Promise<void>}
 */
export async function runAssetMigration() {
  if (localStorage.getItem(MIGRATION_DONE_KEY) === 'true') {
    return
  }

  const data = loadAllDiaryData()
  const migratedData = {}
  for (const dateKey of Object.keys(data)) {
    migratedData[dateKey] = await migrateDatePage(data[dateKey], dateKey)
  }

  saveAllDiaryData(migratedData)
  localStorage.setItem(MIGRATION_DONE_KEY, 'true')
}
