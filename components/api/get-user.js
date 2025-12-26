import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { tgId, wallet } = req.query;

  if (!tgId) return res.status(400).json({ error: 'No tgId' });

  // 1. Ищем пользователя
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', tgId)
    .single();

  // 2. Если нет — создаем
  if (error && error.code === 'PGRST116') {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([{ 
        telegram_id: tgId, 
        wallet_address: wallet, 
        internal_balance: 0 
      }])
      .select()
      .single();
    
    profile = newProfile;
  }

  return res.status(200).json(profile);
}
