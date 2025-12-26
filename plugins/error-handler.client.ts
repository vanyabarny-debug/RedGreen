export default defineNuxtPlugin(() => {
  if (process.client) {
    // Слушаем глобальные ошибки загрузки ресурсов
    window.addEventListener('error', (e) => {
      const msg = e.message.toLowerCase();
      // Список типичных ошибок, когда файл не найден из-за нового билда
      if (
        msg.includes('failed to fetch dynamically imported module') ||
        msg.includes('loading chunk') ||
        msg.includes('unexpected token <') // Это когда вместо JS прилетает HTML 404-й ошибки
      ) {
        console.warn('Обнаружена старая версия кэша, перезагружаем...');
        window.location.reload();
      }
    }, true); // true нужен, чтобы поймать ошибку на стадии захвата
  }
});
