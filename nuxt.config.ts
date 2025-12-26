export default defineNuxtConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Все сторонние библиотеки (React, Three.js, и т.д.) улетят в отдельный файл
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
