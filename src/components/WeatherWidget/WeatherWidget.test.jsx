import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WeatherWidget } from './WeatherWidget'

let container
let root

function renderWidget() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<WeatherWidget />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('WeatherWidget (로딩 스피너)', () => {
  it('로딩 중에는 텍스트 대신 회전 스피너(.weather-spinner)가 보인다', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    renderWidget()

    expect(container.querySelector('.weather-spinner')).toBeTruthy()
    expect(container.textContent).not.toContain('불러오는 중')
  })

  it('날씨 로딩이 끝나면 스피너가 사라지고 온도가 표시된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ current_weather: { temperature: 21.4, weathercode: 0 } }),
        }),
      ),
    )

    renderWidget()
    await act(async () => {})

    expect(container.querySelector('.weather-spinner')).toBeNull()
    expect(container.textContent).toContain('21°C')
  })

  it('날씨 로딩이 실패하면 스피너 대신 에러 문구가 보인다', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))))

    renderWidget()
    await act(async () => {})

    expect(container.querySelector('.weather-spinner')).toBeNull()
    expect(container.textContent).toContain('불러올 수 없습니다')
  })
})
