import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { Task, TaskChecklistItem } from '../types';
import { X, ChevronRight, ListChecks, Plus, Link as LinkIcon, StickyNote, Backpack, Repeat } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';

interface TaskCreatorModalProps {
    onClose: () => void;
    initialDate?: string;
    initialSkillId?: string;
    linkedStructureId?: string;
    linkedConditionId?: string; // New prop
    // Map of dateString -> count. If provided, overrides repeat logic
    specificDates?: Record<string, number>; 
    onTaskCreated?: (tasks: Task[]) => void;
}

const TaskCreatorModal: React.FC<TaskCreatorModalProps> = ({ onClose, initialDate, initialSkillId, linkedStructureId, linkedConditionId, specificDates, onTaskCreated }) => {
    const { state, dispatch } = useGame();
    const [taskName, setTaskName] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskXP, setTaskXP] = useState(10);
    const [taskSkill, setTaskSkill] = useState(initialSkillId || '');
    const [taskStartTime, setTaskStartTime] = useState('');
    const [taskEndTime, setTaskEndTime] = useState('');
    const [taskLink, setTaskLink] = useState('');
    const [selectedNoteId, setSelectedNoteId] = useState('');
    const [selectedInventoryId, setSelectedInventoryId] = useState('');
    const [repeatType, setRepeatType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none');
    const [creationChecklistItems, setCreationChecklistItems] = useState<string[]>([]);
    const [creationChecklistInput, setCreationChecklistInput] = useState('');

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
    const flatSkills = getFlattenedSkills();

    const handleAddCreationChecklistItem = () => {
        if (!creationChecklistInput.trim()) return;
        setCreationChecklistItems([...creationChecklistItems, creationChecklistInput.trim()]);
        setCreationChecklistInput('');
    };

    const handleRemoveCreationChecklistItem = (index: number) => {
        setCreationChecklistItems(creationChecklistItems.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dateToUse = initialDate || format(new Date(), 'yyyy-MM-dd');
        
        if (!taskName) return;

        const checklist: TaskChecklistItem[] = creationChecklistItems.map((text, idx) => ({
            id: `cli_${Date.now()}_${idx}`,
            text,
            completed: false
        }));

        const baseTask: Task = {
            id: `task_${Date.now()}`,
            type: 'daily',
            date: dateToUse,
            title: taskName,
            description: taskDesc,
            xpReward: Math.min(20, Math.max(1, Number(taskXP))),
            skillId: taskSkill || (flatSkills[0]?.id || 'misc'),
            completed: false,
            startTime: taskStartTime || undefined,
            endTime: taskEndTime || undefined,
            externalLink: taskLink || undefined,
            linkedNoteId: linkedStructureId || selectedNoteId || undefined,
            linkedConditionId: linkedConditionId || undefined, // Save condition ID
            linkedInventoryId: selectedInventoryId || undefined,
            checklist: checklist,
        };

        const createdTasks: Task[] = [];

        if (specificDates) {
            // Batch Creation from Calendar Picker
            Object.entries(specificDates).forEach(([dateStr, count]) => {
                const numCount = count as number;
                for (let i = 0; i < numCount; i++) {
                    const t = {
                        ...baseTask,
                        id: `task_${Date.now()}_${dateStr}_${i}_${Math.random().toString(36).substr(2, 5)}`,
                        date: dateStr,
                        checklist: checklist.map(item => ({...item, id: `cli_${Date.now()}_${i}_${Math.random()}`}))
                    };
                    createdTasks.push(t);
                }
            });
            dispatch({ type: 'ADD_TASKS_BATCH', payload: createdTasks });
        } else if (repeatType === 'none') {
            dispatch({ type: 'ADD_TASK', payload: baseTask });
            createdTasks.push(baseTask);
        } else {
            // Standard Repeat Logic
            const tasksToCreate: Task[] = [baseTask];
            createdTasks.push(baseTask);
            
            let limit = 0;
            let incrementFunction: (d: Date, i: number) => Date;

            if (repeatType === 'daily') { limit = 30; incrementFunction = addDays; }
            else if (repeatType === 'weekly') { limit = 12; incrementFunction = addWeeks; }
            else if (repeatType === 'monthly') { limit = 12; incrementFunction = addMonths; }
            else { limit = 5; incrementFunction = addYears; }

            const baseDateObj = new Date(dateToUse);

            for (let i = 1; i <= limit; i++) {
                const nextDate = incrementFunction(baseDateObj, i);
                const t = {
                    ...baseTask,
                    id: `task_${Date.now()}_${i}`,
                    date: format(nextDate, 'yyyy-MM-dd'),
                    checklist: checklist.map(item => ({...item, id: `cli_${Date.now()}_${i}_${Math.random()}`}))
                };
                tasksToCreate.push(t);
                createdTasks.push(t);
            }
            dispatch({ type: 'ADD_TASKS_BATCH', payload: tasksToCreate });
        }

        if (onTaskCreated) onTaskCreated(createdTasks);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
             <form onSubmit={handleSubmit} className="bg-rpg-panel p-6 md:p-8 rounded-lg w-full max-w-lg border border-rpg-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-rpg-text tracking-tight">Создать Задачу</h3>
                    <button type="button" onClick={onClose}><X className="text-gray-500 hover:text-white"/></button>
                 </div>
                 
                 <div className="space-y-5">
                     <input className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text focus:border-rpg-primary outline-none" placeholder="Название задачи" value={taskName} onChange={e => setTaskName(e.target.value)} required autoFocus/>
                     <textarea className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text h-24 resize-none focus:border-rpg-primary outline-none" placeholder="Описание" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">XP (Max 20)</label>
                             <input type="number" max="20" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text focus:border-rpg-primary outline-none" value={taskXP} onChange={e => setTaskXP(Number(e.target.value))} />
                         </div>
                         <div>
                             <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Тег (Цель)</label>
                             <div className="relative">
                                 <select 
                                    className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text focus:border-rpg-primary outline-none appearance-none" 
                                    value={taskSkill} 
                                    onChange={e => setTaskSkill(e.target.value)} 
                                 >
                                     <option value="">Выбрать цель...</option>
                                     {flatSkills.map(({id, name, color, depth}) => (
                                         <option key={id} value={id} className="text-black" style={{color: color}}>
                                             {'\u00A0'.repeat(depth * 3)} {'●'} {name}
                                         </option>
                                     ))}
                                 </select>
                                 <div className="absolute right-3 top-3 pointer-events-none text-gray-500"><ChevronRight size={16} className="rotate-90"/></div>
                             </div>
                         </div>
                     </div>

                     {/* Checklist */}
                     <div className="bg-black/20 border border-rpg-border rounded p-3">
                         <label className="text-xs font-mono uppercase text-gray-500 mb-2 block flex items-center gap-2">
                             <ListChecks size={12}/> Чеклист
                         </label>
                         <div className="flex gap-2 mb-2">
                             <input 
                                className="flex-1 bg-rpg-card border border-rpg-border rounded p-2 text-sm text-rpg-text focus:border-rpg-primary outline-none"
                                placeholder="Добавить подзадачу..."
                                value={creationChecklistInput}
                                onChange={e => setCreationChecklistInput(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddCreationChecklistItem(); }}}
                             />
                             <button type="button" onClick={handleAddCreationChecklistItem} className="bg-rpg-card border border-rpg-border hover:bg-white/10 text-white rounded px-3 transition-colors">
                                 <Plus size={16}/>
                             </button>
                         </div>
                         {creationChecklistItems.length > 0 && (
                             <div className="space-y-1 mt-2">
                                 {creationChecklistItems.map((item, idx) => (
                                     <div key={idx} className="flex items-center justify-between text-sm bg-rpg-card/50 p-2 rounded border border-gray-800">
                                         <span className="text-gray-300">{item}</span>
                                         <button type="button" onClick={() => handleRemoveCreationChecklistItem(idx)} className="text-gray-500 hover:text-red-400">
                                             <X size={14}/>
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>

                     {/* Time Inputs */}
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Начало</label>
                             <input type="time" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text focus:border-rpg-primary outline-none" value={taskStartTime} onChange={e => setTaskStartTime(e.target.value)} />
                         </div>
                         <div>
                             <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Конец</label>
                             <input type="time" className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text focus:border-rpg-primary outline-none" value={taskEndTime} onChange={e => setTaskEndTime(e.target.value)} />
                         </div>
                     </div>

                     {/* Link Input */}
                     <div>
                         <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Ссылка (URL)</label>
                         <div className="relative">
                             <input type="url" className="w-full bg-rpg-card border border-rpg-border rounded p-3 pl-10 text-rpg-text focus:border-rpg-primary outline-none" placeholder="https://..." value={taskLink} onChange={e => setTaskLink(e.target.value)} />
                             <LinkIcon className="absolute left-3 top-3 text-gray-500" size={18}/>
                         </div>
                     </div>
                     
                     {/* Recurrence - Only show if specificDates is NOT provided */}
                     {!specificDates && (
                         <div>
                             <label className="text-xs font-mono uppercase text-gray-500 mb-2 block flex items-center gap-2"><Repeat size={12}/> Повторение</label>
                             <div className="flex bg-rpg-card rounded border border-rpg-border p-1 overflow-x-auto">
                                 <button type="button" onClick={() => setRepeatType('none')} className={`flex-1 min-w-[50px] py-1.5 text-xs rounded transition-colors ${repeatType === 'none' ? 'bg-rpg-panel border border-rpg-border text-rpg-text' : 'text-gray-500'}`}>Нет</button>
                                 <button type="button" onClick={() => setRepeatType('daily')} className={`flex-1 min-w-[50px] py-1.5 text-xs rounded transition-colors ${repeatType === 'daily' ? 'bg-rpg-panel border border-rpg-border text-rpg-text' : 'text-gray-500'}`}>День</button>
                                 <button type="button" onClick={() => setRepeatType('weekly')} className={`flex-1 min-w-[50px] py-1.5 text-xs rounded transition-colors ${repeatType === 'weekly' ? 'bg-rpg-panel border border-rpg-border text-rpg-text' : 'text-gray-500'}`}>Неделя</button>
                                 <button type="button" onClick={() => setRepeatType('monthly')} className={`flex-1 min-w-[50px] py-1.5 text-xs rounded transition-colors ${repeatType === 'monthly' ? 'bg-rpg-panel border border-rpg-border text-rpg-text' : 'text-gray-500'}`}>Месяц</button>
                                 <button type="button" onClick={() => setRepeatType('yearly')} className={`flex-1 min-w-[50px] py-1.5 text-xs rounded transition-colors ${repeatType === 'yearly' ? 'bg-rpg-panel border border-rpg-border text-rpg-text' : 'text-gray-500'}`}>Год</button>
                             </div>
                         </div>
                     )}

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Связать заметку</label>
                            <select className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-sm text-rpg-text focus:border-rpg-primary outline-none" value={selectedNoteId} onChange={e => setSelectedNoteId(e.target.value)}>
                                    <option value="">Нет</option>
                                    {state.notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Прикрепить Рюкзак</label>
                            <select className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-sm text-rpg-text focus:border-rpg-primary outline-none" value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}>
                                    <option value="">Нет</option>
                                    {state.inventory.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                            </select>
                        </div>
                     </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-8">
                     <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                     <button type="submit" className="px-6 py-2 bg-rpg-primary text-rpg-bg text-sm font-bold rounded hover:opacity-90">Создать</button>
                 </div>
             </form>
        </div>,
        document.body
    );
};

export default TaskCreatorModal;
