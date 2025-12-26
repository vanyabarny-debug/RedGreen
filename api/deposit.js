import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { hash, tgId } = JSON.parse(req.body);

  // ВАЖНО: Тут должна быть логика проверки хэша через TON API (Toncenter/TonAPI)
  // Для начала сделаем упрощенное начисление (но в продакшене проверяй hash!)
  
  const { data, error } = await supabase.rpc('increment_balance', { 
    user_id: tgId, 
    increment: 1.0 // Сумма из транзакции
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
