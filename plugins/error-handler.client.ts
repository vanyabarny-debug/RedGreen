export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    window.addEventListener('error', (event) => {
      // Проверяем, связана ли ошибка с тем, что файл не найден (старый кеш)
      const isChunkError = 
        event.message.includes('Loading chunk') || 
        event.message.includes('CSS chunk') ||
        event.message.includes('Failed to fetch dynamically imported module');

      if (isChunkError) {
        console.log('Detected chunk error, reloading...');
        window.location.reload();
      }
    });
  }
});
