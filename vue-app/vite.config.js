import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const RENDER_ORIGIN = 'https://flexben.onrender.com'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useRemoteInDev = env.VITE_DEV_REMOTE_API === '1'
  const proxyTarget = useRemoteInDev
    ? RENDER_ORIGIN
    : (env.VITE_DEV_API_PROXY || 'http://127.0.0.1:3333')

  const apiProxy = {
    '/api': {
      target: proxyTarget,
      changeOrigin: true,
      secure: true
    }
  }

  return {
    plugins: [vue()],
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy }
  }
})
