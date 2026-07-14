import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Fabric.js+jsdom 초기화가 무거워 병렬 워커가 서로 리소스를 뺏으면
    // 첫 테스트가 5초 타임아웃으로 플레이크한다 — 순차 실행이 오히려 빠르고 안정적.
    fileParallelism: false,
  },
})
