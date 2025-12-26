import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { tgId, amount, address } = JSON.parse(req.body);

  // 1. Проверяем, хватает ли баланса
  const { data: profile } = await supabase
    .from('profiles')
    .select('internal_balance')
    .eq('telegram_id', tgId)
    .single();

  if (!profile || profile.internal_balance < amount) {
    return res.status(400).json({ error: 'Недостаточно средств' });
  }

  // 2. Списываем баланс и создаем запись в таблице выводов
  await supabase.rpc('increment_balance', { user_id: tgId, increment: -amount });
  
  // Создаем лог вывода (нужно создать таблицу withdrawals в Supabase)
  await supabase.from('withdrawals').insert({
    telegram_id: tgId,
    amount: amount,
    address: address,
    status: 'PENDING'
  });

  return res.status(200).json({ ok: true });
}
