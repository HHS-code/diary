import { Rect } from 'fabric'

const PREVIEW_BACKGROUND_FILL = '#c0c0c0'

/**
 * 지우개(EraserBrush) 미리보기가 필요로 하는 "지울 수 없는 기준점"을 캔버스에 채워 넣는다.
 * 평소에는 투명(fill:'transparent')이라 화면에 안 보이고 저장/크롭 결과에도 찍히지 않는다.
 * 지우개로 드래그하는 동안(setEraserPreviewBackgroundVisible(bg, true))에만 회색으로
 * 바뀌어, "지워진 뒤 이 회색이 드러난다"는 실시간 미리보기가 눈에 보이게 한다 — 마우스를
 * 떼면 다시 투명으로 되돌려야 한다(캔버스 렌더링 결과에는 excludeFromExport가 적용되지
 * 않으므로, 색이 있는 채로 남으면 완성/크롭 결과물에 그대로 찍힌다).
 * isEraserPreviewBackground로 식별 가능한 커스텀 플래그를 붙여둔다 — 캔버스를 통째로
 * 비우고 다시 이 함수로 배경을 새로 만드는 지점(크롭 적용, 스티커 재편집)이 여러 곳이라,
 * 호출부가 매번 반환값을 어딘가에 저장해 동기화하는 대신 findEraserPreviewBackground로
 * 캔버스에서 항상 최신 배경을 다시 찾을 수 있게 한다.
 * @param {import('fabric').Canvas} canvas
 * @returns {import('fabric').Rect} 추가된 배경 오브젝트
 */
export function addUnerasableBackground(canvas) {
  const background = new Rect({
    left: 0,
    top: 0,
    width: canvas.getWidth(),
    height: canvas.getHeight(),
    fill: 'transparent',
    selectable: false,
    evented: false,
    erasable: false,
    excludeFromExport: true,
    isEraserPreviewBackground: true,
  })
  canvas.insertAt(0, background)
  return background
}

/**
 * addUnerasableBackground가 만든 배경을 캔버스에서 찾는다. 없으면 null.
 * @param {import('fabric').Canvas} canvas
 * @returns {import('fabric').Rect | null}
 */
export function findEraserPreviewBackground(canvas) {
  return canvas.getObjects().find((object) => object.isEraserPreviewBackground) ?? null
}

/**
 * addUnerasableBackground가 만든 배경의 미리보기 가시성을 토글한다.
 * @param {import('fabric').Rect} background
 * @param {boolean} visible
 */
export function setEraserPreviewBackgroundVisible(background, visible) {
  background.set('fill', visible ? PREVIEW_BACKGROUND_FILL : 'transparent')
}
