import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Task } from '../types';
import { playSound } from '../utils/audio';
import { X, ChevronLeft, Link as LinkIcon, StickyNote, Backpack, Check, CheckSquare, Square, Calendar, Repeat, ArrowRight } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface QuickTaskWizardProps {
    onClose: () => void;
    onTaskCreated?: (task: Task) => void;
}

const QuickTaskWizard: React.FC<QuickTaskWizardProps> = ({ onClose, onTaskCreated }) => {
    const { state, dispatch } = useGame();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [taskLink, setTaskLink] = useState('');
    const [selectedNoteId, setSelectedNoteId] = useState('');
    const [selectedInventoryId, setSelectedInventoryId] = useState('');
    const [skillId, setSkillId] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [dateMode, setDateMode] = useState<'today'|'tomorrow'|'custom'>('today');
    const [customDate, setCustomDate] = useState('');
    const [repeat, setRepeat] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none');

    // Helper for skills
    const getFlattenedSkills = () => {
        const flat: { id: string, name: string, color: string, depth: number }[] = [];
        const traverse = (parentId: string | null, depth: number) => {
            const children = state.skills.filter(s => s.parentId === parentId);
            children.forEach(child => {
                flat.push({ id: child.id, name: child.name, color: child.color, depth });
                traverse(child.id, depth + 1);
            });
        };
        traverse(null, 0);
        return flat;
    };
    const skills = getFlattenedSkills();

    const handleNext = () => {
        if (step === 1 && !name) return;
        if (step === 2 && !skillId) return;
        
        if (step === 2 && isCompleted) {
            handleSubmit(); // Skip date selection if already done
        } else {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = () => {
        const selectedDate = dateMode === 'today' ? new Date() 
                             : dateMode === 'tomorrow' ? addDays(new Date(), 1)
                             : customDate ? new Date(customDate) : new Date();

        const baseTask: Task = {
            id: `qt_${Date.now()}`,
            type: 'daily',
            date: format(selectedDate, 'yyyy-MM-dd'),
            title: name,
            description: desc,
            xpReward: 10,
            skillId: skillId,
            completed: isCompleted,
            checklist: [],
            // Attachments
            externalLink: taskLink || undefined,
            linkedNoteId: selectedNoteId || undefined,
            linkedInventoryId: selectedInventoryId || undefined
        };

        if (repeat === 'none' || isCompleted) {
            dispatch({ type: 'ADD_TASK', payload: baseTask });
            if (onTaskCreated) onTaskCreated(baseTask);
        } else {
            const tasksToCreate: Task[] = [baseTask];
            let limit = 0;
            let incrementFunction: (d: Date, i: number) => Date;

            if (repeat === 'daily') { limit = 30; incrementFunction = addDays; }
            else if (repeat === 'weekly') { limit = 12; incrementFunction = addWeeks; }
            else if (repeat === 'monthly') { limit = 12; incrementFunction = addMonths; }
            else { limit = 5; incrementFunction = addYears; }

            for (let i = 1; i <= limit; i++) {
                const nextDate = incrementFunction(selectedDate, i);
                tasksToCreate.push({
                    ...baseTask,
                    id: `qt_${Date.now()}_${i}`,
                    date: format(nextDate, 'yyyy-MM-dd'),
                    completed: false 
                });
            }
            dispatch({ type: 'ADD_TASKS_BATCH', payload: tasksToCreate });
            if (onTaskCreated) onTaskCreated(baseTask);
        }

        if (isCompleted) playSound('success');
        else playSound('click');
        
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[500] bg-black/95 flex flex-col animate-fade-in">
             <div className="p-4 flex justify-between items-center bg-rpg-panel border-b border-rpg-border">
                 <button onClick={step === 1 ? onClose : handleBack} className="text-gray-400 p-2">
                     {step === 1 ? <X size={24}/> : <ChevronLeft size={24}/>}
                 </button>
                 <h2 className="text-white font-bold font-mono">
                     {step === 1 ? 'НОВАЯ ЗАДАЧА' : step === 2 ? 'ВЫБОР ЦЕЛИ' : 'НАСТРОЙКА ВРЕМЕНИ'}
                 </h2>
                 <div className="w-10"></div> 
             </div>
             <div className="h-1 bg-gray-800 w-full">
                 <div 
                    className="h-full bg-rpg-primary transition-all duration-300" 
                    style={{ width: isCompleted && step === 2 ? '100%' : `${(step / 3) * 100}%` }}
                 ></div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                 {step === 1 && (
                     <div className="space-y-6 animate-fade-in">
                         <div>
                             <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Название</label>
                             <input 
                                autoFocus
                                className="w-full bg-transparent border-b-2 border-gray-700 text-2xl py-2 text-white outline-none focus:border-white placeholder-gray-700 transition-colors"
                                placeholder="Что нужно сделать?"
                                value={name}
                                onChange={e => setName(e.target.value)}
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Описание (Опционально)</label>
                             <textarea 
                                className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white h-24 resize-none outline-none focus:border-white"
                                placeholder="Детали, ссылки, заметки..."
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                             />
                         </div>
                         <div className="space-y-3 pt-2 border-t border-gray-800">
                             <div className="relative">
                                 <input 
                                    type="url"
                                    className="w-full bg-rpg-card border border-rpg-border rounded p-3 pl-10 text-white outline-none focus:border-white transition-colors text-sm"
                                    placeholder="Прикрепить ссылку (https://...)"
                                    value={taskLink}
                                    onChange={e => setTaskLink(e.target.value)}
                                 />
                                 <LinkIcon className="absolute left-3 top-3 text-gray-500" size={16}/>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Заметка</label>
                                     <div className="relative">
                                         <select 
                                            className="w-full bg-rpg-card border border-rpg-border rounded p-2 pl-8 text-sm text-white appearance-none outline-none focus:border-white transition-colors"
                                            value={selectedNoteId}
                                            onChange={e => setSelectedNoteId(e.target.value)}
                                         >
                                             <option value="">Нет</option>
                                             {state.notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                                         </select>
                                         <StickyNote size={14} className="absolute left-2.5 top-2.5 text-gray-500 pointer-events-none"/>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-[10px] font-mono text-gray-500 mb-1 uppercase">Рюкзак</label>
                                     <div className="relative">
                                         <select 
                                            className="w-full bg-rpg-card border border-rpg-border rounded p-2 pl-8 text-sm text-white appearance-none outline-none focus:border-white transition-colors"
                                            value={selectedInventoryId}
                                            onChange={e => setSelectedInventoryId(e.target.value)}
                                         >
                                             <option value="">Нет</option>
                                             {state.inventory.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                         </select>
                                         <Backpack size={14} className="absolute left-2.5 top-2.5 text-gray-500 pointer-events-none"/>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
                 {step === 2 && (
                     <div className="flex-1 flex flex-col animate-fade-in">
                         <div className="flex-1 overflow-y-auto mb-4">
                             <label className="block text-xs font-mono text-gray-500 mb-4 uppercase">К какой цели это относится?</label>
                             <div className="space-y-2">
                                 {skills.map(s => (
                                     <button
                                        key={s.id}
                                        onClick={() => setSkillId(s.id)}
                                        className={`w-full text-left p-3 rounded border flex items-center gap-3 transition-all ${skillId === s.id ? 'bg-white border-white text-black' : 'bg-rpg-card border-rpg-border text-gray-400 hover:border-gray-500'}`}
                                     >
                                         <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div>
                                         <span style={{ marginLeft: s.depth * 10 }} className="truncate font-medium">
                                             {s.name}
                                         </span>
                                         {skillId === s.id && <Check size={16} className="ml-auto text-black"/>}
                                     </button>
                                 ))}
                             </div>
                         </div>
                         <div className="mt-auto border-t border-rpg-border pt-4">
                             <button 
                                onClick={() => setIsCompleted(!isCompleted)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${isCompleted ? 'bg-green-500/20 border-green-500 text-white' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                             >
                                 <div className="flex items-center gap-3">
                                     {isCompleted ? <CheckSquare className="text-green-500"/> : <Square/>}
                                     <span className="font-bold">Уже выполнил?</span>
                                 </div>
                                 {isCompleted && <span className="text-xs uppercase font-bold text-green-500">Завершить сейчас</span>}
                             </button>
                         </div>
                     </div>
                 )}
                 {step === 3 && (
                     <div className="space-y-8 animate-fade-in">
                         <div>
                             <label className="block text-xs font-mono text-gray-500 mb-4 uppercase flex items-center gap-2">
                                 <Calendar size={14}/> Когда?
                             </label>
                             <div className="grid grid-cols-2 gap-3 mb-4">
                                 <button 
                                    onClick={() => setDateMode('today')}
                                    className={`p-4 rounded border font-bold text-sm transition-all ${dateMode === 'today' ? 'bg-white text-black border-white' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                                 >
                                     Сегодня
                                 </button>
                                 <button 
                                    onClick={() => setDateMode('tomorrow')}
                                    className={`p-4 rounded border font-bold text-sm transition-all ${dateMode === 'tomorrow' ? 'bg-white text-black border-white' : 'bg-rpg-card border-rpg-border text-gray-400'}`}
                                 >
                                     Завтра
                                 </button>
                             </div>
                             <div className="relative">
                                 <input 
                                    type="date"
                                    className={`w-full p-3 bg-rpg-card border rounded text-white outline-none focus:border-white transition-colors ${dateMode === 'custom' ? 'border-white' : 'border-rpg-border'}`}
                                    onChange={(e) => { setCustomDate(e.target.value); setDateMode('custom'); }}
                                    value={customDate}
                                 />
                                 {!customDate && <span className="absolute right-4 top-3 text-gray-500 text-xs pointer-events-none">Выбрать дату</span>}
                             </div>
                         </div>
                         <div>
                             <label className="block text-xs font-mono text-gray-500 mb-4 uppercase flex items-center gap-2">
                                 <Repeat size={14}/> Повторение
                             </label>
                             <div className="grid grid-cols-3 gap-2">
                                 {['none', 'daily', 'weekly', 'monthly', 'yearly'].map(r => (
                                     <button
                                        key={r}
                                        onClick={() => setRepeat(r as any)}
                                        className={`py-2 px-1 text-xs font-bold rounded border uppercase transition-all ${repeat === r ? 'bg-white text-black border-white' : 'bg-rpg-card border-rpg-border text-gray-500'}`}
                                     >
                                         {r === 'none' ? 'Нет' : r === 'daily' ? 'День' : r === 'weekly' ? 'Неделя' : r === 'monthly' ? 'Месяц' : 'Год'}
                                     </button>
                                 ))}
                             </div>
                         </div>
                     </div>
                 )}
             </div>
             <div className="p-4 bg-rpg-panel border-t border-rpg-border">
                 <button 
                    onClick={step === 3 || (step === 2 && isCompleted) ? handleSubmit : handleNext}
                    disabled={step === 1 && !name || step === 2 && !skillId}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                        (step === 1 && !name) || (step === 2 && !skillId) 
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                            : 'bg-white text-black hover:bg-gray-200'
                    }`}
                 >
                     {step === 3 || (step === 2 && isCompleted) ? (
                         <>
                             {isCompleted ? 'Сохранить и Завершить' : 'Создать Задачу'} <Check size={20}/>
                         </>
                     ) : (
                         <>
                             Далее <ArrowRight size={20}/>
                         </>
                     )}
                 </button>
             </div>
        </div>
    );
};

export default QuickTaskWizard;