import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Task } from '../types';
import { Plus, Target, Calendar, CheckCircle, Trash2, Clock, Hourglass } from 'lucide-react';
import { format, differenceInMinutes, parseISO, addDays, addHours, addMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';

const Goals: React.FC = () => {
  const { state, dispatch } = useGame();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [xp, setXp] = useState(100);
  const [daysDur, setDaysDur] = useState(0);
  const [hoursDur, setHoursDur] = useState(0);
  const [skill, setSkill] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
      const interval = setInterval(() => setCurrentTime(Date.now()), 60000); // Update every minute
      return () => clearInterval(interval);
  }, []);

  // Sort: Active first, then by urgency (deadline asc), then Completed last
  const goals = state.tasks
    .filter(t => t.type === 'goal')
    .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const handleAddGoal = (e: React.FormEvent) => {
      e.preventDefault();
      if (daysDur === 0 && hoursDur === 0) return;

      const now = new Date();
      const deadlineDate = addHours(addDays(now, daysDur), hoursDur);

      const newGoal: Task = {
          id: `goal_${Date.now()}`,
          type: 'goal',
          title,
          description: desc,
          xpReward: Math.min(200, Math.max(20, xp)),
          skillId: skill,
          completed: false,
          createdAt: now.toISOString(),
          deadline: deadlineDate.toISOString(),
      };
      dispatch({type: 'ADD_TASK', payload: newGoal});
      setModalOpen(false);
      resetForm();
  };

  const resetForm = () => {
      setTitle(''); setDesc(''); setXp(100); setDaysDur(0); setHoursDur(0);
  };

  const setPresetDuration = (days: number, hours: number) => {
      setDaysDur(days);
      setHoursDur(hours);
  };

  const toggleGoal = (id: string, e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      dispatch({type: 'TOGGLE_TASK', payload: { id, x: rect.x, y: rect.y }});
  }

  const getProgressStats = (goal: Task) => {
      if (!goal.createdAt || !goal.deadline) return { percent: 0, timeLeft: 'N/A', color: 'bg-gray-700' };
      
      const start = parseISO(goal.createdAt).getTime();
      const end = parseISO(goal.deadline).getTime();
      const now = currentTime;
      const totalDuration = end - start;
      const elapsed = now - start;
      const remaining = end - now;

      // Calculate percentage for the bar (how much time has passed)
      const percentPassed = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      
      // Determine Color based on absolute REMAINING time urgency
      // < 2 hours: Red
      // < 1 day: Orange
      // < 3 days: Yellow
      // > 3 days: Green
      const remainingHours = remaining / (1000 * 60 * 60);
      let color = 'bg-rpg-success';
      if (remainingHours < 72) color = 'bg-yellow-400';
      if (remainingHours < 24) color = 'bg-orange-500';
      if (remainingHours < 2) color = 'bg-red-500';

      // Format time left
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      let timeLeftStr = "Истекло";
      if (remaining > 0) {
          if (days > 0) timeLeftStr = `${days}д ${hours}ч`;
          else if (hours > 0) timeLeftStr = `${hours}ч ${minutes}м`;
          else timeLeftStr = `${minutes}м`;
      }

      return { percent: percentPassed, timeLeft: timeLeftStr, color };
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                <Target className="text-rpg-primary"/> Несрочные Задачи
            </h2>
            <button onClick={() => setModalOpen(true)} className="bg-rpg-primary text-black hover:bg-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm">
                <Plus size={16} /> Новая
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => {
                const { percent, timeLeft, color } = getProgressStats(goal);
                
                return (
                    <div key={goal.id} className={`bg-rpg-panel p-6 rounded-lg border ${goal.completed ? 'border-rpg-success/50 opacity-40 order-last' : 'border-rpg-border hover:border-rpg-primary/50'} transition-all group shadow-sm flex flex-col`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1 mr-4">
                                <h3 className={`text-xl font-bold ${goal.completed ? 'line-through text-gray-500' : 'text-white'}`}>{goal.title}</h3>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="block text-xl font-bold text-rpg-primary">+{goal.xpReward} XP</span>
                                <span className="text-xs text-gray-500 bg-rpg-card px-2 py-1 rounded mt-1 inline-block border border-rpg-border">
                                    {state.skills.find(s => s.id === goal.skillId)?.name}
                                </span>
                            </div>
                        </div>
                        
                        {!goal.completed && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs font-mono mb-1 text-gray-400">
                                    <span className={`flex items-center gap-1 font-bold ${color === 'bg-red-500' ? 'text-red-500 animate-pulse' : 'text-white'}`}><Hourglass size={12}/> {timeLeft}</span>
                                    <span className="opacity-50">Прошло {Math.round(percent)}%</span>
                                </div>
                                <div className="h-2 bg-black rounded-full overflow-hidden border border-rpg-border">
                                    {/* The bar shows elapsed time, but the color shows urgency */}
                                    <div className={`h-full ${color} transition-all duration-1000 shadow-[0_0_10px_currentColor]`} style={{width: `${100 - percent}%`}}></div>
                                </div>
                            </div>
                        )}

                        <p className="text-gray-300 mb-6 text-sm leading-relaxed flex-1">{goal.description}</p>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-rpg-border mt-auto">
                             <button onClick={() => dispatch({type: 'DELETE_TASK', payload: goal.id})} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
                             <button 
                                onClick={(e) => toggleGoal(goal.id, e)}
                                className={`px-6 py-2 rounded font-bold flex items-center gap-2 transition-all text-sm ${goal.completed ? 'bg-rpg-success text-black' : 'bg-rpg-card text-gray-300 hover:bg-rpg-primary hover:text-black'}`}
                            >
                                {goal.completed ? <><CheckCircle size={16}/> Выполнено</> : 'Завершить'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {goals.length === 0 && (
            <div className="text-center py-20 text-gray-500 border border-dashed border-rpg-border rounded-lg">
                <Target size={64} className="mx-auto mb-4 opacity-20"/>
                <p>Список несрочных задач пуст.</p>
            </div>
        )}

        {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <form onSubmit={handleAddGoal} className="bg-rpg-panel w-full max-w-lg p-8 rounded-lg border border-rpg-border shadow-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-2xl font-bold mb-6 text-white tracking-tight">Создать Задачу</h3>
                    <div className="space-y-4">
                        <input className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} required/>
                        <textarea className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white h-24 resize-none focus:border-rpg-primary outline-none" placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)}/>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Награда XP (Max 200)</label>
                                 <input type="number" max="200" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={xp} onChange={e => setXp(Number(e.target.value))}/>
                             </div>
                             <div>
                                 <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Связанный навык</label>
                                 <select className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={skill} onChange={e => setSkill(e.target.value)} required>
                                     <option value="">Выбрать...</option>
                                     {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                 </select>
                             </div>
                        </div>
                        
                        <div className="border-t border-rpg-border pt-4">
                             <label className="text-xs text-gray-500 mb-2 block uppercase font-mono flex items-center gap-2"><Clock size={12}/> Время на выполнение</label>
                             <div className="flex flex-wrap gap-2 mb-3">
                                 {[
                                     {l: '1 Час', d: 0, h: 1}, 
                                     {l: '1 День', d: 1, h: 0},
                                     {l: '3 Дня', d: 3, h: 0},
                                     {l: '1 Нед', d: 7, h: 0},
                                     {l: '1 Мес', d: 30, h: 0}
                                 ].map((p, i) => (
                                     <button 
                                        key={i} type="button" 
                                        onClick={() => setPresetDuration(p.d, p.h)}
                                        className="bg-rpg-card border border-rpg-border text-xs text-gray-400 hover:text-white hover:border-rpg-primary px-2 py-1 rounded"
                                     >
                                         {p.l}
                                     </button>
                                 ))}
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <input type="number" min="0" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={daysDur} onChange={e => setDaysDur(Number(e.target.value))}/>
                                     <span className="text-[10px] text-gray-500 uppercase">Дней</span>
                                 </div>
                                 <div>
                                     <input type="number" min="0" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={hoursDur} onChange={e => setHoursDur(Number(e.target.value))}/>
                                     <span className="text-[10px] text-gray-500 uppercase">Часов</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-white px-4 text-sm">Отмена</button>
                        <button type="submit" className="bg-white text-black font-bold px-6 py-2 rounded text-sm hover:bg-gray-200">Создать</button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default Goals;