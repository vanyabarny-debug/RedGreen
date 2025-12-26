import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  const { tgId, wallet } = req.query;

  if (!tgId) return res.status(400).json({ error: "Missing tgId" });

  try {
    // Пробуем найти пользователя в базе
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_id', tgId)
      .single();

    // Если пользователя нет — создаем его
    if (!profile) {
      const { data, error: createError } = await supabase
        .from('profiles')
        .insert([{ 
            telegram_id: tgId, 
            wallet_address: wallet || '', 
            internal_balance: 0 
        }])
        .select()
        .single();
      
      profile = data;
    }

    return res.status(200).json(profile);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
