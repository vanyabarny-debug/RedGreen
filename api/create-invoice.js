export default async function handler(req, res) {
  const token = process.env.BOT_TOKEN; // Токен возьмем из настроек Vercel
  
  const response = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "100 Звезд",
      description: "Пополнение баланса",
      payload: "user_123_payload", // ID игрока
      currency: "XTR",
      prices: [{ label: "100 Stars", amount: 100 }],
      provider_token: "" 
    })
  });

  const data = await response.json();
  res.status(200).json(data);
}
