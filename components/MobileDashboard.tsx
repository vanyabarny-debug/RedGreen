import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { format, isSameDay, startOfDay, subDays, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, Flame, Activity, Scroll, Target, XCircle, Wallet, TrendingUp, Moon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, CartesianGrid, YAxis } from 'recharts';
import { playSound } from '../utils/audio';
import DayReview from './DayReview';

const MobileDashboard: React.FC = () => {
    const { state, dispatch } = useGame();
    const [showDayReview, setShowDayReview] = useState(false);
    const today = startOfDay(new Date());

    // --- FOCUS MODE LOGIC ---
    const todayTasks = state.tasks.filter(t => t.date === format(today, 'yyyy-MM-dd') && t.type === 'daily');
    const completedCount = todayTasks.filter(t => t.completed).length;
    const progress = todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0;

    const toggleTask = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        dispatch({type: 'TOGGLE_TASK', payload: { id, x: rect.x, y: rect.y }});
    }

    const getSkillColor = (id: string) => state.skills.find(s => s.id === id)?.color || '#52525b';

    // --- QUEST LOGIC ---
    const activeQuest = state.quests.find(q => q.status === 'active');
    
    // --- FINANCE SNAPSHOT ---
    const totalIncome = state.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = state.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const netIncome = totalIncome - totalExpense;
    const totalAssets = state.assets.reduce((acc, a) => acc + a.value, 0);
    const capital = totalAssets + netIncome;

    const startMonth = startOfMonth(new Date());
    const endMonth = endOfMonth(new Date());
    const monthIncome = state.transactions
        .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), {start: startMonth, end: endMonth}))
        .reduce((acc, t) => acc + t.amount, 0);
    const monthExpense = state.transactions
        .filter(t => t.type === 'expense' && isWithinInterval(parseISO(t.date), {start: startMonth, end: endMonth}))
        .reduce((acc, t) => acc + t.amount, 0);

    // --- ANALYTICS LOGIC (Weekly Efficiency) ---
    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i); // Last 7 days
        const dateStr = format(d, 'yyyy-MM-dd');
        const tasks = state.tasks.filter(t => t.date === dateStr);
        const done = tasks.filter(t => t.completed).length;
        const total = tasks.length;
        const eff = total > 0 ? (done / total) * 100 : 0;
        
        // Mood data
        const moodEntry = state.user?.moodHistory?.find(m => m.date === dateStr);
        const mood = moodEntry ? moodEntry.value : null;

        return { 
            name: format(d, 'dd'), 
            efficiency: eff,
            mood: mood
        };
    });

    return (
        <div className="space-y-6 pb-24 relative">
            {/* Header / Date */}
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-rpg-text uppercase tracking-tight">Оперативный Центр</h2>
                    <p className="text-rpg-primary font-mono text-xs">{format(today, 'EEEE, d MMMM', {locale: ru})}</p>
                </div>
            </div>

            {/* 1. FOCUS MODE (Top Layer) */}
            <section className="bg-rpg-panel border border-rpg-primary/50 rounded-lg p-4 shadow-[0_0_15px_rgba(250,250,250,0.1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Target size={80} />
                </div>
                
                <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="font-bold text-rpg-text flex items-center gap-2">
                        <Flame className="text-rpg-primary" size={18}/> Фокус Дня
                    </h3>
                    <span className="text-xs font-mono text-gray-400">{completedCount} / {todayTasks.length}</span>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden mb-4 relative z-10">
                    <div className="h-full bg-rpg-primary transition-all duration-500" style={{width: `${progress}%`}}></div>
                </div>

                <div className="space-y-3 relative z-10 mb-4">
                    {todayTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">На сегодня задач нет. Отдыхайте.</div>
                    ) : (
                        todayTasks.map(task => (
                            <div 
                                key={task.id} 
                                onClick={(e) => toggleTask(e, task.id)}
                                className={`flex items-center gap-3 p-3 rounded border transition-all active:scale-[0.98] ${task.completed ? 'bg-gray-900/50 border-gray-800 opacity-60' : 'bg-rpg-card border-rpg-border hover:border-rpg-primary'}`}
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.completed ? 'bg-rpg-success border-rpg-success' : 'border-gray-600'}`}>
                                    {task.completed && <Check size={14} className="text-black"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-500' : 'text-rpg-text'}`}>{task.title}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                         <span className="text-[9px] uppercase font-bold px-1 rounded text-black" style={{backgroundColor: getSkillColor(task.skillId)}}>
                                             {state.skills.find(s => s.id === task.skillId)?.name}
                                         </span>
                                         <span className="text-[9px] text-rpg-warning font-mono">+{task.xpReward} XP</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Close Day Button (Inside Card) */}
                <button 
                    onClick={() => setShowDayReview(true)}
                    className="w-full py-3 rounded-lg bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-lg relative z-20"
                >
                    <Moon size={16} fill="black"/> Завершить День
                </button>
            </section>

            {/* 2. FINANCE SNAPSHOT (New) */}
            <section className="bg-rpg-panel border border-rpg-border rounded-lg p-4 relative">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-gray-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                        <Wallet size={14} className="text-green-500"/> Финансы
                    </h3>
                    <span className="font-mono text-xl font-bold text-rpg-text">{capital.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                        <div className="text-[10px] text-gray-500 uppercase">Доход (Мес)</div>
                        <div className="text-green-500 font-mono font-bold">+{monthIncome.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                        <div className="text-[10px] text-gray-500 uppercase">Расход (Мес)</div>
                        <div className="text-red-500 font-mono font-bold">-{monthExpense.toLocaleString()}</div>
                    </div>
                </div>
            </section>

            {/* 3. ACTIVE QUEST (Middle Layer) */}
            <section className="bg-rpg-panel border border-rpg-secondary/50 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Scroll size={80} />
                </div>
                <h3 className="font-bold text-rpg-text flex items-center gap-2 mb-3 relative z-10 text-sm uppercase tracking-wider">
                    <Scroll className="text-rpg-secondary" size={16}/> Активный Протокол
                </h3>

                {activeQuest ? (
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                             <h4 className="font-bold text-lg text-rpg-text">{activeQuest.title}</h4>
                             <span className="text-xs font-mono text-rpg-warning">+{activeQuest.xpReward} XP</span>
                        </div>
                        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{activeQuest.description}</p>
                        
                        <div className="bg-black/40 rounded-full h-4 w-full mb-1 border border-rpg-border overflow-hidden relative">
                            <div 
                                className="bg-rpg-secondary h-full transition-all duration-700" 
                                style={{width: `${Math.min(100, (activeQuest.currentProgress / activeQuest.requirementValue) * 100)}%`}}
                            ></div>
                        </div>
                        <div className="text-right text-[10px] font-mono text-gray-500 mb-3">
                            {activeQuest.currentProgress} / {activeQuest.requirementValue}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500 text-xs border border-dashed border-gray-700 rounded relative z-10">
                        Нет активных квестов. Посетите доску заданий.
                    </div>
                )}
            </section>

             {/* 4. MOOD TRACKER */}
             <section className="bg-rpg-panel border border-purple-500/30 rounded-lg p-4">
                 <h3 className="font-bold text-purple-400 flex items-center gap-2 mb-4 text-xs uppercase tracking-wider">
                    <Activity size={14}/> Эмоциональный Фон
                </h3>
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <Area type="step" dataKey="mood" stroke="#d946ef" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} connectNulls/>
                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--muted-color)" fontSize={10} domain={[1, 6]} hide/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </section>

             {showDayReview && <DayReview onClose={() => setShowDayReview(false)} />}
        </div>
    );
};

export default MobileDashboard;