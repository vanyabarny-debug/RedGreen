export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN; // Убедись, что токен в Environment Variables на Vercel
  
  // Данные счета
  const invoiceData = {
    title: "100 Звезд",
    description: "Пополнение баланса для игры Red Light Green Light",
    payload: "stars_topup_100", // Твой внутренний ID транзакции
    currency: "XTR", // Валюта для Telegram Stars
    prices: [{ label: "100 Stars", amount: 100 }], // Для XTR amount = количеству звезд
    provider_token: "" // Для звезд ВСЕГДА пусто
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData),
    });

    const data = await response.json();

    if (data.ok) {
      return res.status(200).json(data);
    } else {
      console.error("Telegram API Error:", data);
      return res.status(500).json({ ok: false, error: data.description });
    }
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
