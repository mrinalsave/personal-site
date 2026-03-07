import { resolve } from 'path'

export default {
  build: {
    outDir: 'dist',
    assetsDir: 'audio-visualizer/assets',
    rollupOptions: {
      input: {
        audioVisualizer: resolve(__dirname, 'audio-visualizer/index.html'),
      }
    }
  }
}