import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Task, Skill } from '../types';
import { format, addDays, getDaysInMonth, getDayOfYear, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { X, Check, ArrowRight, Calendar, TrendingUp, Activity, Target, ChevronRight, Plus, Moon, Sparkles, Clock, Quote } from 'lucide-react';
import { playSound, startAmbient, stopAmbient } from '../utils/audio';
import { getGlobalLeaderboard, getMotivationMessage } from '../utils/gameLogic';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

interface DayReviewProps {
    onClose: () => void;
}

const MOTIVATIONAL_QUOTES = [
    "Дисциплина — это свобода.",
    "Мы то, что мы делаем постоянно.",
    "Трудности закаляют разум, как огонь закаляет сталь.",
    "Не жди вдохновения. Стань дисциплиной.",
    "Вчера ты говорил «завтра».",
    "Боль временна. Триумф вечен.",
    "Управляй своим разумом, или он будет управлять тобой.",
    "Маленькие шаги ведут к великим целям.",
    "Фокус. Действие. Результат.",
    "Твой единственный соперник — ты вчерашний."
];

const DayReview: React.FC<DayReviewProps> = ({ onClose }) => {
    const { state, dispatch } = useGame();
    const [step, setStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [quote, setQuote] = useState('');
    
    // Planning State
    const [planTaskName, setPlanTaskName] = useState('');
    const [planSkillId, setPlanSkillId] = useState('');
    const [planTimeStart, setPlanTimeStart] = useState('');
    const [planTimeEnd, setPlanTimeEnd] = useState('');
    const [addedTasks, setAddedTasks] = useState<Task[]>([]);

    // --- DATA CALCULATION ---
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    // 1. Day Stats
    const todayTasks = state.tasks.filter(t => t.date === todayStr && t.type === 'daily');
    const completedCount = todayTasks.filter(t => t.completed).length;
    const totalCount = todayTasks.length;
    const efficiency = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const dayXP = state.tasks
        .filter(t => t.date === todayStr && t.completed)
        .reduce((acc, t) => acc + t.xpReward, 0);

    // 2. Period Stats
    const currentDayOfMonth = new Date().getDate();
    const daysInMonth = getDaysInMonth(new Date());
    const monthProgress = (currentDayOfMonth / daysInMonth) * 100;
    
    const dayOfYear = getDayOfYear(new Date());
    const yearProgress = (dayOfYear / 365) * 100;

    // 3. User Stats
    const userLevel = state.user?.level || 1;
    const currentXP = state.user?.currentXP || 0;
    const maxXP = state.user?.maxXP || 100;
    const xpPercent = (currentXP / maxXP) * 100;
    
    const leaderboard = getGlobalLeaderboard(state.user);
    const myRank = leaderboard.find(p => p.username === state.user?.username);

    // 4. Mood Data
    const moodData = state.user?.moodHistory?.slice(-7).map(m => ({
        name: format(parseISO(m.date), 'dd'),
        value: m.value
    })) || [];

    // Animation trigger
    useEffect(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 500);
        return () => clearTimeout(timer);
    }, [step]);

    // Initial Sound & Ambient & Quote
    useEffect(() => {
        startAmbient();
        setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
        return () => {
            stopAmbient();
        };
    }, []);

    const nextStep = () => {
        playSound('click');
        if (step < 5) setStep(step + 1);
        else onClose();
    };

    const handleAddPlan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!planTaskName) return;

        const newTask: Task = {
            id: `plan_${Date.now()}`,
            type: 'daily',
            date: tomorrowStr,
            title: planTaskName,
            description: 'Запланировано во время закрытия дня',
            xpReward: 10,
            skillId: planSkillId || (state.skills[0]?.id) || 'misc',
            startTime: planTimeStart || undefined,
            endTime: planTimeEnd || undefined,
            completed: false,
            checklist: []
        };

        dispatch({ type: 'ADD_TASK', payload: newTask });
        setAddedTasks([...addedTasks, newTask]);
        setPlanTaskName('');
        setPlanTimeStart('');
        setPlanTimeEnd('');
        playSound('success');
    };

    const steps = [
        // SLIDE 0: INTRO / DAY STATS
        <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-10 animate-fade-in font-sans">
            <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-1 bg-rpg-primary rounded-full mb-2"></div>
                <div className="text-rpg-primary uppercase font-mono tracking-[0.3em] text-xs">Ежедневный Отчет</div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-lg">
                ДЕНЬ<br/><span className="text-rpg-primary">ЗАВЕРШЕН</span>
            </h2>
            
            <div className="relative w-56 h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={[{value: efficiency}, {value: 100 - efficiency}]} 
                            dataKey="value" 
                            innerRadius={70} 
                            outerRadius={90} 
                            startAngle={90} 
                            endAngle={-270}
                            stroke="none"
                        >
                            <Cell fill="var(--primary-color)" />
                            <Cell fill="var(--card-color)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-mono font-medium text-white">{efficiency}%</span>
                    <span className="text-xs text-rpg-muted font-mono uppercase tracking-widest mt-2">Эффективность</span>
                </div>
            </div>
            
            <div className="text-sm font-mono text-rpg-muted bg-rpg-card px-4 py-2 rounded-full border border-rpg-border">
                {completedCount} из {totalCount} протоколов выполнено
            </div>
        </div>,

        // SLIDE 1: TIME ANALYSIS
        <div className="flex flex-col justify-center h-full p-8 max-w-2xl mx-auto w-full animate-slide-in-right font-sans">
            <h3 className="text-3xl font-bold text-white mb-12 flex items-center gap-4">
                <Calendar className="text-rpg-primary" size={32}/> 
                <span>Синхронизация</span>
            </h3>
            
            <div className="space-y-10">
                <div className="group">
                    <div className="flex justify-between text-xs text-rpg-muted mb-3 font-mono uppercase tracking-widest">
                        <span>Месяц</span>
                        <span className="text-rpg-primary">{Math.round(monthProgress)}%</span>
                    </div>
                    <div className="h-1 bg-rpg-card rounded-full overflow-hidden">
                        <div className="h-full bg-rpg-primary group-hover:shadow-[0_0_15px_var(--primary-color)] transition-all duration-1000" style={{width: `${monthProgress}%`}}></div>
                    </div>
                </div>
                
                <div className="group">
                    <div className="flex justify-between text-xs text-rpg-muted mb-3 font-mono uppercase tracking-widest">
                        <span>Год</span>
                        <span className="text-rpg-secondary">{Math.round(yearProgress)}%</span>
                    </div>
                    <div className="h-1 bg-rpg-card rounded-full overflow-hidden">
                        <div className="h-full bg-rpg-secondary group-hover:shadow-[0_0_15px_var(--secondary-color)] transition-all duration-1000" style={{width: `${yearProgress}%`}}></div>
                    </div>
                </div>

                <div className="bg-rpg-card/80 border-l-4 border-rpg-primary p-6 rounded-r-lg backdrop-blur-sm shadow-xl">
                    <div className="text-rpg-primary font-bold mb-3 text-xs uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={14}/> Рекомендация Системы
                    </div>
                    <p className="text-white font-normal leading-relaxed text-lg italic opacity-90">
                        "{getMotivationMessage(efficiency, state.user?.communicationStyle || 'intellectual')}"
                    </p>
                </div>
            </div>
        </div>,

        // SLIDE 2: HERO GROWTH
        <div className="flex flex-col justify-center h-full p-8 max-w-2xl mx-auto w-full animate-fade-in font-sans">
            <div className="text-center mb-16 relative">
                <div className="absolute inset-0 bg-rpg-primary/10 blur-3xl rounded-full scale-150"></div>
                <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-rpg-card text-rpg-primary mb-6 border border-rpg-primary shadow-[0_0_30px_rgba(0,209,193,0.3)]">
                    <TrendingUp size={48}/>
                </div>
                <h3 className="text-3xl font-bold text-white tracking-tight uppercase">Уровень Доступа</h3>
                <div className="text-rpg-success font-mono text-xl mt-3 font-bold bg-rpg-card/50 inline-block px-4 py-1 rounded">+{dayXP} XP ПОЛУЧЕНО</div>
            </div>

            <div className="space-y-6 bg-rpg-card/50 p-8 rounded-2xl border border-rpg-border backdrop-blur-md">
                <div className="flex justify-between items-end">
                    <span className="text-white font-bold text-2xl tracking-tighter">LVL {userLevel}</span>
                    <span className="text-rpg-muted font-mono text-sm">{currentXP} / {maxXP} XP</span>
                </div>
                <div className="h-3 bg-rpg-bg rounded-full overflow-hidden border border-rpg-border relative">
                    <div className="h-full bg-gradient-to-r from-rpg-primary to-rpg-secondary transition-all duration-1000 relative" style={{width: `${xpPercent}%`}}>
                        <div className="absolute inset-0 bg-white/30 animate-pulse-fast"></div>
                    </div>
                </div>
                
                <div className="pt-6 border-t border-rpg-border flex justify-between items-center">
                    <span className="text-rpg-muted text-xs uppercase tracking-widest">Глобальный Ранг</span>
                    <span className="text-yellow-500 font-bold font-mono text-2xl flex items-center gap-2">
                        #{myRank?.rank || '-'} <span className="text-xs text-gray-500 font-normal">({myRank?.percentile || '-'})</span>
                    </span>
                </div>
            </div>
        </div>,

        // SLIDE 3: MOOD
        <div className="flex flex-col justify-center h-full p-8 max-w-3xl mx-auto w-full animate-fade-in font-sans">
            <h3 className="text-3xl font-bold text-white mb-12 flex items-center gap-4">
                <Activity className="text-purple-500" size={32}/> 
                <span>Биоритмы</span>
            </h3>
            
            <div className="h-72 w-full bg-rpg-card/30 rounded-xl border border-rpg-border p-6 backdrop-blur-sm">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={moodData}>
                        <defs>
                            <linearGradient id="colorReviewMood" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="var(--muted-color)" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                        <YAxis hide domain={[1, 6]}/>
                        <Area type="monotone" dataKey="value" stroke="#d946ef" strokeWidth={3} fill="url(#colorReviewMood)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-8 text-center text-rpg-muted text-sm max-w-md mx-auto">
                Отслеживание эмоционального фона позволяет прогнозировать пики продуктивности.
            </div>
        </div>,

        // SLIDE 4: PLANNING TOMORROW (ADVANCED)
        <div className="flex flex-col h-full p-6 md:p-12 max-w-3xl mx-auto w-full animate-fade-in font-sans">
            <div className="text-center mb-8">
                <div className="text-rpg-primary font-mono text-xs uppercase tracking-[0.2em] mb-3">Загрузка данных...</div>
                <h3 className="text-3xl font-bold text-white">ПЛАН: {format(tomorrow, 'd MMM', {locale: ru}).toUpperCase()}</h3>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 bg-rpg-card/50 rounded-xl border border-rpg-border p-4 space-y-2 custom-scrollbar backdrop-blur-sm">
                {addedTasks.length === 0 && (
                    <div className="text-center text-rpg-muted py-20 flex flex-col items-center">
                        <Target size={48} className="mb-4 opacity-20"/>
                        <p>Список пуст. Определите приоритеты.</p>
                    </div>
                )}
                {addedTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-rpg-panel p-4 rounded-lg border border-rpg-border animate-slide-in-right">
                        <div className="flex items-center gap-4">
                            <div className="w-2 h-2 rounded-full bg-rpg-primary shadow-[0_0_5px_var(--primary-color)]"></div>
                            <div className="flex flex-col">
                                <span className="text-white font-medium">{t.title}</span>
                                {(t.startTime) && <span className="text-[10px] text-gray-400 font-mono">{t.startTime}{t.endTime ? ` - ${t.endTime}` : ''}</span>}
                            </div>
                        </div>
                        <span className="text-xs text-rpg-muted font-mono uppercase bg-rpg-bg px-2 py-1 rounded">
                            {state.skills.find(s => s.id === t.skillId)?.name || 'Общее'}
                        </span>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddPlan} className="mb-4 space-y-3 bg-rpg-card border border-rpg-border p-4 rounded-xl">
                <input 
                    className="w-full bg-transparent border-b border-gray-700 pb-2 text-white font-bold text-lg placeholder-gray-600 focus:border-rpg-primary outline-none transition-colors"
                    placeholder="Название задачи..."
                    value={planTaskName}
                    onChange={e => setPlanTaskName(e.target.value)}
                    autoFocus
                />
                
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Clock size={14} className="absolute left-2 top-2.5 text-gray-500"/>
                        <input 
                            type="time" 
                            className="w-full bg-rpg-bg border border-rpg-border rounded p-2 pl-7 text-white text-sm outline-none focus:border-white"
                            value={planTimeStart}
                            onChange={e => setPlanTimeStart(e.target.value)}
                        />
                    </div>
                    <div className="relative flex-1">
                        <select 
                            className="w-full bg-rpg-bg border border-rpg-border rounded p-2 text-white text-sm outline-none focus:border-white appearance-none"
                            value={planSkillId}
                            onChange={e => setPlanSkillId(e.target.value)}
                        >
                            <option value="">Цель...</option>
                            {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronRight className="absolute right-2 top-2.5 text-gray-500 rotate-90" size={14}/>
                    </div>
                    <button type="submit" className="bg-white text-black px-4 rounded font-bold hover:bg-gray-200 transition-colors shadow-lg">
                        <Plus size={20}/>
                    </button>
                </div>
            </form>
        </div>,

        // SLIDE 5: FINAL QUOTE (New)
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in font-sans">
            <div className="max-w-2xl text-center">
                <Quote size={48} className="text-rpg-primary opacity-30 mx-auto mb-8"/>
                <h2 className="text-2xl md:text-4xl font-medium text-white leading-relaxed tracking-wide italic mb-12">
                    "{quote}"
                </h2>
                <div className="w-24 h-1 bg-rpg-primary rounded-full mx-auto opacity-50"></div>
            </div>
        </div>
    ];

    return (
        <div className="fixed inset-0 z-[200] bg-rpg-bg/95 backdrop-blur-xl flex flex-col text-white font-sans">
            {/* Background Gradient Mesh */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-rpg-primary/30 blur-[150px] rounded-full"></div>
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-rpg-secondary/30 blur-[150px] rounded-full"></div>
            </div>

            {/* Progress Line */}
            <div className="h-1 w-full bg-rpg-card flex z-10">
                {steps.map((_, i) => (
                    <div key={i} className="flex-1 h-full mx-0.5 bg-rpg-border rounded-full overflow-hidden">
                        <div 
                            className={`h-full bg-rpg-primary transition-all duration-500 shadow-[0_0_10px_var(--primary-color)] ${i < step ? 'w-full' : i === step ? 'w-full animate-progress-fill' : 'w-0'}`}
                        ></div>
                    </div>
                ))}
            </div>

            {/* Close Button */}
            <button onClick={onClose} className="absolute top-6 right-6 text-rpg-muted hover:text-white z-50 p-2 hover:bg-rpg-card rounded-full transition-all">
                <X size={28}/>
            </button>

            {/* Content */}
            <div className="flex-1 relative overflow-hidden z-10">
                {steps[step]}
            </div>

            {/* Controls */}
            <div className="p-8 flex justify-center items-center z-10 pb-safe">
                <button 
                    onClick={nextStep}
                    className="group flex items-center gap-6 text-xl md:text-2xl font-bold uppercase tracking-widest hover:text-rpg-primary transition-colors"
                >
                    {step === steps.length - 1 ? 'Вернуться в систему' : 'Далее'}
                    <div className="w-16 h-16 rounded-full border-2 border-rpg-border flex items-center justify-center group-hover:border-rpg-primary group-hover:bg-rpg-primary group-hover:text-black transition-all shadow-lg">
                        {step === steps.length - 1 ? <Check size={32}/> : <ChevronRight size={32}/>}
                    </div>
                </button>
            </div>
        </div>
    );
};

export default DayReview;