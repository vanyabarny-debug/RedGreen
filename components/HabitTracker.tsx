import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Habit } from '../types';
import { Plus, Trash2, Calendar, Repeat, Palette } from 'lucide-react';
import { format, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

const HabitTracker: React.FC = () => {
    const { state, dispatch } = useGame();
    const [modalOpen, setModalOpen] = useState(false);
    const [habitName, setHabitName] = useState('');
    const [xp, setXp] = useState(10);
    const [color, setColor] = useState('#10b981');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if(!habitName) return;

        const newHabit: Habit = {
            id: `habit_${Date.now()}`,
            title: habitName,
            xpReward: Number(xp),
            createdAt: new Date().toISOString(),
            color: color
        };

        dispatch({ type: 'ADD_HABIT', payload: newHabit });
        setModalOpen(false);
        setHabitName('');
        setXp(10);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Удалить привычку? Будущие задачи также будут удалены.')) {
            dispatch({ type: 'DELETE_HABIT', payload: id });
        }
    };

    // Contribution Grid Component (Next 14 Days)
    const ContributionGrid: React.FC<{ habitId: string, color: string }> = ({ habitId, color }) => {
        // Next 14 days for visualization (including today)
        const days = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));
        
        return (
            <div className="flex gap-1 flex-wrap max-w-full">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const task = state.tasks.find(t => t.habitId === habitId && t.date === dateStr);
                    const isCompleted = task?.completed;
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div 
                            key={dateStr}
                            title={`${format(day, 'dd MMM')}: ${isCompleted ? 'Выполнено' : 'Ожидает'}`}
                            className={`w-6 h-6 md:w-8 md:h-8 rounded-md border border-black/20 flex items-center justify-center transition-all ${isCompleted ? '' : 'bg-gray-800/30'} ${isToday ? 'ring-2 ring-white scale-110' : ''}`}
                            style={{ backgroundColor: isCompleted ? color : undefined }}
                        >
                            <span className="text-[8px] text-gray-500 font-mono select-none">{format(day, 'd')}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl md:text-3xl font-bold font-mono text-rpg-text flex items-center gap-2">
                    <Repeat className="text-white"/> Трекер Привычек
                </h2>
                <button onClick={() => setModalOpen(true)} className="bg-white text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                    <Plus size={18}/> <span className="hidden md:inline">Создать</span>
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {state.habits.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-rpg-border rounded-lg text-gray-500">
                        <Repeat size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Список привычек пуст. Создайте новую для автоматического отслеживания.</p>
                    </div>
                )}
                {state.habits.map(habit => (
                    <div key={habit.id} className="bg-rpg-panel border border-rpg-border rounded-lg p-6 relative group hover:border-white/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{habit.title}</h3>
                                <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                    <span className="text-rpg-warning">+{habit.xpReward} XP</span>
                                    <span>•</span>
                                    <span className="uppercase text-purple-400">ПРИВЫЧКА</span>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(habit.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                        
                        <div className="bg-black/20 p-4 rounded-lg overflow-x-auto">
                            <ContributionGrid habitId={habit.id} color={habit.color} />
                        </div>
                    </div>
                ))}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleCreate} className="bg-rpg-panel w-full max-w-md p-6 rounded-lg border border-rpg-border shadow-2xl animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6">Новая Привычка</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-gray-500 mb-1">Название</label>
                                <input className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-white outline-none" value={habitName} onChange={e => setHabitName(e.target.value)} placeholder="Например: Чтение 20 мин" autoFocus required/>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-mono text-gray-500 mb-1">Награда (XP)</label>
                                <input type="number" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-white outline-none" value={xp} onChange={e => setXp(Number(e.target.value))}/>
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-gray-500 mb-2 flex items-center gap-2">
                                    <Palette size={14}/> Цвет в сетке
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-105">
                                        <input 
                                            type="color" 
                                            value={color} 
                                            onChange={e => setColor(e.target.value)}
                                            className="absolute -top-2 -left-2 w-20 h-20 p-0 border-0 outline-none cursor-pointer bg-transparent"
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">{color}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button type="button" onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-white px-4">Отмена</button>
                            <button type="submit" className="bg-white text-black font-bold px-6 py-2 rounded hover:bg-gray-200">Создать</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default HabitTracker;