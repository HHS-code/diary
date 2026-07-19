import { LOGICAL_CANVAS } from '../hooks/useFabricCanvas'
import { YoutubeCard } from './YoutubeCard'

/**
 * videoId로 YoutubeCard 인스턴스를 만들어 캔버스 중앙에 배치할 좌표를 설정해 반환한다.
 * canvas.add()는 호출부(DiaryCanvas)가 담당한다 — 이 함수는 인스턴스 생성과 좌표 계산까지만
 * 책임진다(assetLibrary 등록을 거치는 addImageAssetToCanvas와 달리 videoId만 있으면 충분하므로).
 * @param {string} videoId
 * @returns {Promise<YoutubeCard>}
 */
export async function createYoutubeCardObject(videoId) {
  const card = await YoutubeCard.create(videoId)
  card.set({
    left: (LOGICAL_CANVAS.width - card.getScaledWidth()) / 2,
    top: (LOGICAL_CANVAS.height - card.getScaledHeight()) / 2,
  })
  return card
}
