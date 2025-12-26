import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MY_WALLET = "ТВОЙ_АДРЕС_КОШЕЛЬКА"; // Куда приходят деньги

export default async function handler(req, res) {
  const { userId, hash, amount } = req.body; // hash транзакции от TonConnect

  try {
    // 1. Запрос к TON API для проверки транзакции
    const response = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${MY_WALLET}&limit=10&api_key=${process.env.TONCENTER_API_KEY}`);
    const data = await response.json();

    // 2. Ищем транзакцию с нужным хэшем
    const tx = data.result.find(t => t.transaction_id.hash === hash);

    if (tx && parseInt(tx.in_msg.value) >= (amount * 1000000000)) { // Проверка суммы в нанотонах
      
      // 3. Начисляем баланс в Supabase
      const { data: profile, error } = await supabase
        .rpc('increment_balance', { user_id: userId, increment: amount });

      return res.status(200).json({ ok: true, newBalance: profile });
    }
    
    return res.status(400).json({ ok: false, error: "Transaction not found or invalid" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
