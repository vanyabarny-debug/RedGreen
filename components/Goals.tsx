import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Task } from '../types';
import { Plus, Target, Calendar, CheckCircle, Trash2, Clock, Hourglass, GitMerge, ChevronRight, Save, X, ExternalLink, Check } from 'lucide-react';
import { format, differenceInSeconds, parseISO, addDays, addHours } from 'date-fns';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import GoalCreatorModal from './GoalCreatorModal';

const Goals: React.FC = () => {
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Task | null>(null);
  
  // Sort: Active first, then by urgency (deadline asc), then Completed last
  const goals = state.tasks
    .filter(t => t.type === 'goal')
    .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const toggleGoal = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      dispatch({type: 'TOGGLE_TASK', payload: { id, x: rect.x, y: rect.y }});
  }

  const handleUpdateGoal = () => {
      if (selectedGoal) {
          dispatch({ type: 'UPDATE_TASK', payload: selectedGoal });
          setSelectedGoal(null);
      }
  };

  const handleDeleteGoal = () => {
      if (selectedGoal && window.confirm('Удалить цель?')) {
          dispatch({ type: 'DELETE_TASK', payload: selectedGoal.id });
          setSelectedGoal(null);
      }
  };

  // --- Countdown Component ---
  const CountdownTimer: React.FC<{ deadline: string, completed: boolean }> = ({ deadline, completed }) => {
      const [timeLeft, setTimeLeft] = useState('');
      const [isExpired, setIsExpired] = useState(false);

      useEffect(() => {
          if (completed) return;

          const tick = () => {
              const now = new Date();
              const end = parseISO(deadline);
              const diff = differenceInSeconds(end, now);

              if (diff <= 0) {
                  setTimeLeft('00:00:00');
                  setIsExpired(true);
                  return;
              }

              const d = Math.floor(diff / (3600 * 24));
              const h = Math.floor((diff % (3600 * 24)) / 3600);
              const m = Math.floor((diff % 3600) / 60);
              const s = diff % 60;

              const dDisplay = d > 0 ? `${d}д ` : '';
              const hDisplay = h < 10 ? `0${h}` : h;
              const mDisplay = m < 10 ? `0${m}` : m;
              const sDisplay = s < 10 ? `0${s}` : s;

              setTimeLeft(`${dDisplay}${hDisplay}:${mDisplay}:${sDisplay}`);
          };

          tick();
          const timer = setInterval(tick, 1000);
          return () => clearInterval(timer);
      }, [deadline, completed]);

      if (completed) return <span className="text-green-500 font-bold text-xs">ВЫПОЛНЕНО</span>;
      if (isExpired) return <span className="text-red-500 font-bold text-xs">ИСТЕКЛО</span>;

      return (
          <div className="text-white text-xs md:text-sm font-bold tracking-wider drop-shadow-sm font-mono">
              {timeLeft}
          </div>
      );
  };

  const handleStructureClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      navigate('/structures', { state: { focusNodeId: id } });
  };

  return (
    <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                <Target className="text-white"/> Несрочные Задачи
            </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10">
            
            {goals.map(goal => {
                const skill = state.skills.find(s => s.id === goal.skillId);
                const structure = goal.linkedNoteId ? state.structures.find(s => s.id === goal.linkedNoteId) : null;
                const structureColor = structure?.skillId ? state.skills.find(s => s.id === structure.skillId)?.color : structure?.color;

                return (
                    <div 
                        key={goal.id} 
                        onClick={() => setSelectedGoal(goal)}
                        className={`bg-rpg-panel border rounded-xl p-5 transition-all group flex flex-col relative shadow-sm cursor-pointer min-h-[150px] ${goal.completed ? 'border-rpg-success/30 opacity-60' : 'border-rpg-border hover:border-white hover:shadow-lg hover:-translate-y-1'}`}
                    >
                        {/* Header Tags */}
                        <div className="flex justify-between items-center mb-3">
                             <div className="flex items-center gap-2">
                                 {structure && (
                                     <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-gray-800 hover:border-gray-600 transition-colors" onClick={(e) => handleStructureClick(e, structure.id)}>
                                         <GitMerge size={10} className="text-gray-400"/>
                                         <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: structureColor || '#fff'}}></div>
                                         <span className="text-[9px] text-gray-300 font-bold truncate max-w-[80px]">{structure.title}</span>
                                     </div>
                                 )}
                             </div>
                             <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: skill?.color || '#555'}}></div>
                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{skill?.name || 'Без категории'}</span>
                             </div>
                        </div>

                        {/* Main Content */}
                        <div className="mb-2">
                            <h3 className={`text-lg font-bold leading-tight ${goal.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                {goal.title}
                            </h3>
                        </div>

                        {/* Timer Section (Compact) */}
                        {!goal.completed && goal.deadline && (
                            <div className="bg-black/30 rounded-lg p-2 mb-3 border border-gray-800 flex items-center justify-between">
                                <CountdownTimer deadline={goal.deadline} completed={goal.completed} />
                                <Clock size={12} className="text-gray-600"/>
                            </div>
                        )}

                        <p className="text-gray-400 text-xs leading-relaxed mb-4 line-clamp-3 flex-1">
                            {goal.description || <span className="italic opacity-50">Нет описания</span>}
                        </p>
                        
                        {/* Footer */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-800/50 mt-auto">
                             <div className="text-xs font-mono text-rpg-primary font-bold">+{goal.xpReward} XP</div>
                             <div className="flex gap-2 items-center">
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteGoal(); }} className="text-gray-600 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16}/>
                                </button>
                                <button 
                                    onClick={(e) => toggleGoal(goal.id, e)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${goal.completed ? 'bg-rpg-success text-black' : 'bg-rpg-primary text-black hover:bg-white'}`}
                                    title={goal.completed ? "Выполнено" : "Выполнить"}
                                >
                                    {goal.completed ? <Check size={16}/> : <Check size={16}/>}
                                </button>
                             </div>
                        </div>
                    </div>
                );
            })}

            {/* "Add Goal" Card - Acting as the persistent 'Add' button / Empty State */}
            <button 
                onClick={() => setModalOpen(true)}
                className="bg-black/20 border-2 border-dashed border-rpg-border rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white hover:bg-rpg-card transition-all min-h-[150px] group text-center"
            >
                <div className="w-12 h-12 rounded-full bg-rpg-card group-hover:bg-white group-hover:text-black flex items-center justify-center mb-3 transition-colors shadow-lg">
                    <Plus size={24}/>
                </div>
                <span className="font-bold text-sm mb-2">Кликни, чтобы создать задачу</span>
                <p className="text-[10px] text-gray-500 group-hover:text-gray-400 max-w-[200px] leading-relaxed">
                    Сюда можно кидать задачи, которые ты не знаешь на какой день поставить. Просто пусть они будут тут.
                </p>
            </button>
        </div>

        {/* CREATE MODAL (Reused Component) */}
        {modalOpen && (
            <GoalCreatorModal onClose={() => setModalOpen(false)} />
        )}

        {/* EDIT MODAL */}
        {selectedGoal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedGoal(null)}>
                <div className="bg-rpg-panel w-full max-w-lg rounded-xl border border-rpg-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-rpg-border flex justify-between items-start bg-rpg-card">
                        <input 
                            className="bg-transparent text-xl font-bold text-white outline-none flex-1 border-b border-transparent focus:border-rpg-primary transition-colors pb-1 mr-4"
                            value={selectedGoal.title}
                            onChange={e => setSelectedGoal({...selectedGoal, title: e.target.value})}
                        />
                        <button onClick={() => setSelectedGoal(null)}><X className="text-gray-500 hover:text-white"/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-rpg-bg">
                        <textarea 
                            className="w-full bg-black/20 border border-gray-800 rounded-lg p-3 text-gray-300 text-sm leading-relaxed resize-none focus:border-rpg-primary outline-none min-h-[100px]"
                            value={selectedGoal.description}
                            onChange={e => setSelectedGoal({...selectedGoal, description: e.target.value})}
                            placeholder="Описание..."
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Награда XP</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white text-sm" 
                                    value={selectedGoal.xpReward} 
                                    onChange={e => setSelectedGoal({...selectedGoal, xpReward: Number(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Категория</label>
                                <select 
                                    className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white text-sm"
                                    value={selectedGoal.skillId}
                                    onChange={e => setSelectedGoal({...selectedGoal, skillId: e.target.value})}
                                >
                                    {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Structure Link in Edit */}
                        <div>
                             <label className="text-xs text-gray-500 mb-1 block uppercase font-mono flex items-center gap-2"><GitMerge size={12}/> Привязка к структуре</label>
                             <div className="flex gap-2 items-center">
                                 <select 
                                    className="flex-1 bg-rpg-card border border-rpg-border rounded p-2 text-white text-sm"
                                    value={selectedGoal.linkedNoteId || ''}
                                    onChange={e => setSelectedGoal({...selectedGoal, linkedNoteId: e.target.value || undefined})}
                                 >
                                     <option value="">Нет привязки</option>
                                     {state.structures.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                 </select>
                                 {selectedGoal.linkedNoteId && (
                                     <button 
                                        onClick={() => navigate('/structures', { state: { focusNodeId: selectedGoal.linkedNoteId } })}
                                        className="bg-rpg-card border border-rpg-border p-2 rounded text-gray-400 hover:text-white"
                                        title="Перейти к узлу"
                                     >
                                         <ExternalLink size={16}/>
                                     </button>
                                 )}
                             </div>
                        </div>

                        <div className="bg-black/30 p-3 rounded border border-rpg-border/50">
                            <label className="text-xs text-gray-500 uppercase font-bold mb-2 block flex items-center gap-2">
                                <Clock size={12}/> Дедлайн (Таймер)
                            </label>
                            {selectedGoal.deadline ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">{format(parseISO(selectedGoal.deadline), 'dd MMM yyyy, HH:mm')}</span>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                if(window.confirm('Сбросить таймер?')) setSelectedGoal({...selectedGoal, deadline: undefined});
                                            }}
                                            className="text-xs text-red-400 hover:underline"
                                        >
                                            Сбросить
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-500 italic">Таймер не установлен</div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t border-rpg-border bg-rpg-card flex justify-between items-center">
                        <button onClick={handleDeleteGoal} className="text-red-500 hover:text-red-400 flex items-center gap-2 text-sm font-bold">
                            <Trash2 size={16}/> Удалить
                        </button>
                        <div className="flex gap-3">
                            <button onClick={handleUpdateGoal} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-200">
                                <Save size={16}/> Сохранить
                            </button>
                            <button 
                                onClick={(e) => { toggleGoal(selectedGoal.id, e as any); setSelectedGoal(null); }}
                                className={`px-4 py-2 rounded text-sm font-bold ${selectedGoal.completed ? 'bg-rpg-border text-gray-400' : 'bg-rpg-primary text-black hover:opacity-90'}`}
                            >
                                {selectedGoal.completed ? 'Отменить' : 'Выполнить'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

export default Goals;