import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { Task } from '../types';
import { X, ChevronRight, GitMerge, Clock, Target } from 'lucide-react';
import { addDays, addHours } from 'date-fns';

interface GoalCreatorModalProps {
    onClose: () => void;
    onGoalCreated?: (goal: Task) => void;
    linkedStructureId?: string;
    linkedConditionId?: string; // New Prop
}

const GoalCreatorModal: React.FC<GoalCreatorModalProps> = ({ onClose, onGoalCreated, linkedStructureId, linkedConditionId }) => {
    const { state, dispatch } = useGame();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [xp, setXp] = useState(100);
    const [daysDur, setDaysDur] = useState(0);
    const [hoursDur, setHoursDur] = useState(0);
    const [skill, setSkill] = useState('');
    const [structureId, setStructureId] = useState(linkedStructureId || '');

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Default to 1 week if no duration set, or allow 0 for "Someday"
        const now = new Date();
        let deadlineDate = undefined;
        
        if (daysDur > 0 || hoursDur > 0) {
            deadlineDate = addHours(addDays(now, daysDur), hoursDur).toISOString();
        }

        const newGoal: Task = {
            id: `goal_${Date.now()}`,
            type: 'goal',
            title,
            description: desc,
            xpReward: Math.min(500, Math.max(20, xp)),
            skillId: skill || (state.skills[0]?.id || 'misc'),
            completed: false,
            createdAt: now.toISOString(),
            deadline: deadlineDate,
            linkedNoteId: structureId || undefined,
            linkedConditionId: linkedConditionId || undefined,
        };

        dispatch({type: 'ADD_TASK', payload: newGoal});
        if (onGoalCreated) onGoalCreated(newGoal);
        onClose();
    };

    const setPresetDuration = (days: number, hours: number) => {
        setDaysDur(days);
        setHoursDur(hours);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <form 
                onSubmit={handleAddGoal} 
                className="bg-rpg-panel w-full max-w-lg p-6 md:p-8 rounded-xl border border-rpg-border shadow-2xl max-h-[90vh] overflow-y-auto relative" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Target size={20}/> Новая Цель
                    </h3>
                    <button type="button" onClick={onClose}><X className="text-gray-500 hover:text-white" size={24}/></button>
                </div>

                <div className="space-y-5">
                    <input 
                        className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none transition-colors" 
                        placeholder="Название цели" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                        autoFocus
                    />
                    <textarea 
                        className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white h-24 resize-none focus:border-rpg-primary outline-none transition-colors" 
                        placeholder="Описание и детали..." 
                        value={desc} 
                        onChange={e => setDesc(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Награда XP</label>
                                <input type="number" max="500" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={xp} onChange={e => setXp(Number(e.target.value))}/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Категория</label>
                                <select className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none appearance-none" value={skill} onChange={e => setSkill(e.target.value)}>
                                    <option value="">Без категории</option>
                                    {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                    </div>

                    {/* Structure Linking */}
                    <div>
                            <label className="text-xs text-gray-500 mb-1 block uppercase font-mono flex items-center gap-2"><GitMerge size={12}/> Привязать к Структуре</label>
                            <select 
                            className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none appearance-none"
                            value={structureId}
                            onChange={e => setStructureId(e.target.value)}
                            disabled={!!linkedStructureId}
                            >
                                <option value="">Нет привязки</option>
                                {state.structures.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                    </div>
                    
                    <div className="border-t border-rpg-border pt-4 bg-black/20 p-3 rounded">
                            <label className="text-xs text-rpg-primary mb-2 block uppercase font-bold flex items-center gap-2"><Clock size={14}/> Таймер (Обратный отсчет)</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[
                                    {l: '24ч', d: 1, h: 0},
                                    {l: '3 Дня', d: 3, h: 0},
                                    {l: '1 Нед', d: 7, h: 0},
                                    {l: '2 Нед', d: 14, h: 0},
                                    {l: '1 Мес', d: 30, h: 0}
                                ].map((p, i) => (
                                    <button 
                                    key={i} type="button" 
                                    onClick={() => setPresetDuration(p.d, p.h)}
                                    className="bg-rpg-card border border-rpg-border text-[10px] font-bold text-gray-400 hover:text-white hover:border-white px-3 py-1.5 rounded uppercase"
                                    >
                                        {p.l}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <input type="number" min="0" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={daysDur} onChange={e => setDaysDur(Number(e.target.value))}/>
                                    <span className="absolute right-3 top-3.5 text-[10px] text-gray-500 uppercase font-bold">Дней</span>
                                </div>
                                <div className="relative">
                                    <input type="number" min="0" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={hoursDur} onChange={e => setHoursDur(Number(e.target.value))}/>
                                    <span className="absolute right-3 top-3.5 text-[10px] text-gray-500 uppercase font-bold">Часов</span>
                                </div>
                            </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-white px-4 text-sm font-bold">Отмена</button>
                    <button type="submit" className="bg-rpg-primary text-black font-bold px-8 py-2 rounded text-sm hover:opacity-90">Запустить</button>
                </div>
            </form>
        </div>,
        document.body
    );
};

export default GoalCreatorModal;
