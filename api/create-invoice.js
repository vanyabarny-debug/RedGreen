export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN;

  // Если токен забыли добавить в настройки Vercel
  if (!token) {
    return res.status(500).json({ ok: false, error: "BOT_TOKEN is missing in Vercel settings" });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: "100 Звезд",
        description: "Пополнение баланса для игры",
        payload: "user_123_payload",
        currency: "XTR",
        prices: [{ label: "100 Stars", amount: 100 }],
        provider_token: "" 
      })
    });

    const data = await response.json();
    
    // Возвращаем ответ от Телеграма как есть, чтобы видеть ошибки
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
