import { createClient } from '@supabase/supabase-js';

// Инициализация клиента с Service Role Key для обхода защиты RLS
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { winners, pot, secretKey } = req.body;

  // ЗАЩИТА: проверяем секретный ключ, чтобы никто не мог сам себе начислить баланс
  if (secretKey !== process.env.GAME_ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // Рассчитываем долю каждого победителя (например, 90% банка делим на всех, 10% комиссия сервиса)
    const winAmount = (pot * 0.9) / winners.length;

    const updates = winners.map(async (userId) => {
      // 1. Обновляем баланс
      await supabase.rpc('increment_balance', { 
        user_id: userId, 
        increment: winAmount 
      });

      // 2. Записываем транзакцию
      await supabase.from('transactions').insert({
        telegram_id: userId,
        amount: winAmount,
        type: 'WIN'
      });
    });

    await Promise.all(updates);

    return res.status(200).json({ success: true, amountPerUser: winAmount });
  } catch (error) {
    console.error('Sync Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
