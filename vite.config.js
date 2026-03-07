import { resolve } from 'path'

export default {
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        audioVisualizer: resolve(__dirname, 'audio-visualizer/index.html'),
      }
    }
  }
}