import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  define: {
    'process.env': {},
  },
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5173, // 开发服务器端口
    strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
  },
})
