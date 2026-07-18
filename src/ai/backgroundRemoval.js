import { newSession, remove } from '@bunnio/rembg-web'

const MODEL_NAME = 'u2netp'

let cachedSessionPromise = null

function getOrCreateSession(onProgress) {
  if (!cachedSessionPromise) {
    cachedSessionPromise = newSession(MODEL_NAME, undefined, { onProgress })
  }
  return cachedSessionPromise
}

/**
 * source 이미지를 u2netp(경량, ADR-2) 모델로 세그멘테이션해 배경을 투명하게 만든 PNG Blob을
 * 반환한다. 세션은 모듈 스코프에 캐싱되어(ADR-4) 같은 탭에서 여러 번 호출해도 모델을
 * 한 번만 다운로드한다.
 * @param {HTMLCanvasElement | Blob} source
 * @param {(info: { step: string, progress: number, message: string }) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function removeBackgroundFromImage(source, onProgress) {
  const session = await getOrCreateSession(onProgress)
  return remove(source, { session, onProgress })
}
