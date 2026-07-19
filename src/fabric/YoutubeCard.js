import { classRegistry, FabricImage } from 'fabric'

const PLAY_BUTTON_RADIUS_RATIO = 0.15
const PLAY_BUTTON_CIRCLE_FILL = 'rgba(0, 0, 0, 0.6)'
const PLAY_BUTTON_TRIANGLE_FILL = '#ffffff'

function buildThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * 유튜브 썸네일 위에 재생 버튼(▶)을 그려 표시하는 FabricImage 서브클래스.
 * 캔버스에는 항상 정지 썸네일로만 그려진다 — 실제 인라인 재생은 이 오브젝트 위에
 * 겹쳐지는 별도 DOM iframe 오버레이가 담당한다(이 클래스는 관여하지 않는다).
 * JSON 직렬화에는 videoId만 포함한다: 썸네일 URL은 불러올 때 videoId로 재조립하면
 * 충분하고, 재생 상태는 애초에 이 오브젝트가 들고 있지 않기 때문이다.
 */
export class YoutubeCard extends FabricImage {
  static type = 'YoutubeCard'
  static customProperties = ['videoId']

  constructor(element, options) {
    super(element, options)
    this.videoId = options?.videoId
    this.lockUniScaling = true
  }

  _render(ctx) {
    super._render(ctx)
    drawPlayButtonOverlay(ctx, this.width, this.height)
  }

  /**
   * videoId로 유튜브 썸네일 이미지를 로드해 YoutubeCard 인스턴스를 만든다.
   * 이미지 로드는 비동기이므로 Promise를 반환한다.
   * @param {string} videoId
   * @param {object} [options]
   * @returns {Promise<YoutubeCard>}
   */
  static async create(videoId, options) {
    return YoutubeCard.fromURL(buildThumbnailUrl(videoId), {}, { ...options, videoId })
  }

  /**
   * 저장된 videoId로 썸네일 URL을 재조립해 인스턴스를 복원한다.
   * @param {object} object
   * @param {object} [options]
   * @returns {Promise<YoutubeCard>}
   */
  static async fromObject(object, options) {
    const { videoId, ...fabricImageObject } = object
    return YoutubeCard.create(videoId, { ...fabricImageObject, ...options })
  }
}

function drawPlayButtonOverlay(ctx, width, height) {
  const radius = Math.min(width, height) * PLAY_BUTTON_RADIUS_RATIO
  const triangleSize = radius * 0.7

  ctx.save()
  ctx.fillStyle = PLAY_BUTTON_CIRCLE_FILL
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = PLAY_BUTTON_TRIANGLE_FILL
  ctx.beginPath()
  ctx.moveTo(-triangleSize * 0.4, -triangleSize)
  ctx.lineTo(-triangleSize * 0.4, triangleSize)
  ctx.lineTo(triangleSize * 0.8, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

classRegistry.setClass(YoutubeCard)
