import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { startOfWeek, addDays, addWeeks, subWeeks, format, isSameDay, isBefore, startOfDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Plus, X, Trash2, ExternalLink, ListChecks, TrendingUp, TrendingDown, Square, AlertTriangle, Save, StickyNote, Backpack, Link as LinkIcon, Minus, GitMerge, Clock, ArrowLeft } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Task, Note, TaskChecklistItem, Transaction } from '../types';
import { playSound } from '../utils/audio';
import { useNavigate, useLocation } from 'react-router-dom';
import DayReview from './DayReview';
import TaskCreatorModal from './TaskCreatorModal';
import TransactionCard from './TransactionCard';

const WeeklyCalendar: React.FC = () => {
  const { state, dispatch } = useGame();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [showDayReview, setShowDayReview] = useState(false);
  const [confirmCloseDay, setConfirmCloseDay] = useState(false);
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeType, setFinanceType] = useState<'income' | 'expense'>('expense');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeCategory, setFinanceCategory] = useState('');
  
  const todayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const today = startOfDay(new Date());

  const EXPENSE_CATEGORIES = ['Еда', 'Жилье', 'Транспорт', 'Здоровье', 'Отдых', 'Образование', 'Другое'];
  const INCOME_CATEGORIES = ['Зарплата', 'Фриланс', 'Подарок', 'Продажа', 'Другое'];

  useEffect(() => {
      if (todayRef.current && !focusDay) {
          todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [currentWeekStart, focusDay]); 

  useEffect(() => {
      if (location.state?.openTaskId) {
          const task = state.tasks.find(t => t.id === location.state.openTaskId);
          if (task) {
               const tDate = parseISO(task.date || task.createdAt || new Date().toISOString());
               setCurrentWeekStart(startOfWeek(tDate, { weekStartsOn: 1 }));
               setSelectedTask(task);
               // Removed setFocusDay(tDate) to keep user in calendar view initially unless requested
          }
          window.history.replaceState({}, document.title);
      }
  }, [location.state, state.tasks]);

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
      setTimeout(() => {
          setDraggedTaskId(taskId);
      }, 0);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
      if (isBefore(parseISO(dateStr), today)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverDate !== dateStr) {
          setDragOverDate(dateStr);
      }
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
      e.preventDefault();
      setDragOverDate(null);
      setDraggedTaskId(null);
      if (isBefore(parseISO(targetDate), today)) return;

      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) {
          const task = state.tasks.find(t => t.id === taskId);
          if (task && task.date !== targetDate) {
               dispatch({ type: 'UPDATE_TASK_DATE', payload: { id: taskId, date: targetDate } });
               playSound('click');
          }
      }
  };

  const handleDragEnd = () => {
      setDraggedTaskId(null);
      setDragOverDate(null);
  };

  // --- ACTIONS ---
  const handleDeleteTask = (id: string) => {
      if(window.confirm('Удалить задачу?')) {
          dispatch({type: 'DELETE_TASK', payload: id});
          setSelectedTask(null);
      }
  }

  const toggleTask = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      dispatch({type: 'TOGGLE_TASK', payload: { id, x: rect.x, y: rect.y }});
  }

  const handleUpdateTaskDetails = () => {
      if (selectedTask) {
          dispatch({ type: 'UPDATE_TASK', payload: selectedTask });
          playSound('click');
      }
  };

  const openFinanceModal = (e: React.MouseEvent, dateStr: string, type: 'income' | 'expense') => {
      e.stopPropagation();
      setQuickAddDate(dateStr); 
      setFinanceType(type);
      setFinanceAmount('');
      setFinanceCategory(type === 'income' ? 'Фриланс' : 'Еда');
      setFinanceModalOpen(true);
  };

  const submitFinance = (e: React.FormEvent) => {
      e.preventDefault();
      if (!financeAmount || !quickAddDate) return;

      dispatch({
          type: 'ADD_TRANSACTION',
          payload: {
              id: `trans_${Date.now()}`,
              amount: Number(financeAmount),
              type: financeType,
              category: financeCategory,
              date: quickAddDate, 
              description: ''
          }
      });
      setFinanceModalOpen(false);
      setQuickAddDate(null);
  };

  const handleViewNote = (noteId: string) => {
      const note = state.notes.find(n => n.id === noteId);
      if (note) setViewingNote(note);
  }

  const handleOpenInNotesApp = (noteId: string) => {
      setViewingNote(null);
      setSelectedTask(null);
      navigate('/notes', { state: { openNoteId: noteId } });
  }

  const handleOpenStructureNode = (nodeId: string) => {
      setSelectedTask(null);
      navigate('/structures', { state: { focusNodeId: nodeId } });
  }

  const addChecklistItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTask || !newChecklistItem.trim()) return;
      const newItem: TaskChecklistItem = { id: `cli_${Date.now()}`, text: newChecklistItem, completed: false };
      const updatedChecklist = [...(selectedTask.checklist || []), newItem];
      
      const updatedTask = { ...selectedTask, checklist: updatedChecklist };
      setSelectedTask(updatedTask);
      
      dispatch({ type: 'UPDATE_TASK_CHECKLIST', payload: { taskId: selectedTask.id, checklist: updatedChecklist } });
      setNewChecklistItem('');
  };

  const toggleChecklistItem = (itemId: string) => {
      if (!selectedTask) return;
      const updatedChecklist = (selectedTask.checklist || []).map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
      const updatedTask = { ...selectedTask, checklist: updatedChecklist };
      setSelectedTask(updatedTask);
      dispatch({ type: 'UPDATE_TASK_CHECKLIST', payload: { taskId: selectedTask.id, checklist: updatedChecklist } });
  };

  const deleteChecklistItem = (itemId: string) => {
      if (!selectedTask) return;
      const updatedChecklist = (selectedTask.checklist || []).filter(item => item.id !== itemId);
      const updatedTask = { ...selectedTask, checklist: updatedChecklist };
      setSelectedTask(updatedTask);
      dispatch({ type: 'UPDATE_TASK_CHECKLIST', payload: { taskId: selectedTask.id, checklist: updatedChecklist } });
  };

  const isTaskDirty = () => {
      if (!selectedTask) return false;
      const original = state.tasks.find(t => t.id === selectedTask.id);
      if (!original) return false;
      return JSON.stringify(original) !== JSON.stringify(selectedTask);
  };

  // Helper logic for modal
  const isSelectedTaskPast = selectedTask && selectedTask.date && selectedTask.type === 'daily' 
        ? isBefore(parseISO(selectedTask.date), today) 
        : false;

  // --- COMPONENT: Small Card for Grid ---
  const TaskCard: React.FC<{ task: Task, compact?: boolean }> = ({ task, compact = false }) => {
      const taskDate = parseISO(task.date!);
      const isPastDay = isBefore(taskDate, today);
      const skill = state.skills.find(s => s.id === task.skillId);
      const skillColor = skill?.color || '#52525b';
      const structureNode = task.linkedNoteId ? state.structures.find(s => s.id === task.linkedNoteId) : null;
      const nodeSkill = structureNode?.skillId ? state.skills.find(s => s.id === structureNode.skillId) : null;
      const nodeColor = nodeSkill?.color || structureNode?.color;

      let cardStyle = "bg-rpg-panel border-rpg-border hover:border-rpg-border/80"; 
      if (task.completed) cardStyle = "bg-rpg-panel/50 border-rpg-primary/20 opacity-60";
      else if (isPastDay) cardStyle = "bg-rpg-panel border-rpg-border opacity-40 grayscale";

      const isDragging = draggedTaskId === task.id;

      return (
        <div 
            draggable={!isPastDay}
            onDragStart={(e) => !isPastDay && handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            className={`flex flex-col group mb-1 ${isDragging ? 'opacity-30' : ''} transition-all duration-200`}
        >
            <div className="flex justify-between px-1 pb-1">
                 {structureNode ? (
                     <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                         <GitMerge size={10} className="text-gray-400"/>
                         <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: nodeColor || '#fff'}}></div>
                     </div>
                 ) : <div></div>}

                 {task.skillId === 'habit' ? (
                      <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Привычка
                      </span>
                  ) : (
                      <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: skillColor}}></div>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider truncate max-w-[100px]">
                              {skill?.name}
                          </span>
                      </div>
                  )}
            </div>
            <div 
                onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                className={`relative border rounded-lg p-3 transition-all cursor-pointer flex flex-col gap-2 z-0 ${cardStyle} ${compact ? 'text-xs' : 'text-sm'} hover:shadow-lg shadow-sm active:cursor-grabbing`}
            >
                <div className="flex justify-between items-start gap-3">
                    <div className={`font-bold text-base leading-tight break-words flex-1 min-w-0 ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {task.title}
                    </div>
                </div>
                {task.description && <p className="text-gray-500 text-[10px] line-clamp-2 leading-relaxed">{task.description}</p>}
                <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-800/50">
                     <div className="flex flex-wrap gap-2 text-gray-500 items-center flex-1 min-w-0 pr-2">
                        {(task.externalLink) && <ExternalLink size={12} className="text-blue-400 shrink-0"/>}
                        {task.linkedNoteId && !structureNode && <StickyNote size={12} className="text-yellow-500 shrink-0"/>}
                        {task.linkedInventoryId && <Backpack size={12} className="text-rpg-primary shrink-0"/>}
                        {task.checklist && task.checklist.length > 0 && <ListChecks size={12} className="text-gray-400 shrink-0"/>}
                        {task.startTime && <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-black/30 px-1 rounded whitespace-nowrap">{task.startTime}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono text-gray-700 opacity-50 group-hover:opacity-100 transition-opacity">+{task.xpReward}xp</span>
                        <div 
                            onClick={(e) => !isPastDay && toggleTask(e, task.id)} 
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-rpg-primary border-rpg-primary text-black' : 'border-gray-600 hover:border-white bg-black'} ${isPastDay ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                            {task.completed && <Check size={12} className="text-black" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  // Helper to find connected structure for modal
  const linkedStructureNode = selectedTask?.linkedNoteId ? state.structures.find(s => s.id === selectedTask.linkedNoteId) : null;
  const linkedStructureColor = linkedStructureNode?.skillId ? state.skills.find(s => s.id === linkedStructureNode.skillId)?.color : linkedStructureNode?.color;

  // === RENDER: FOCUS DAY VIEW (List Mode) ===
  if (focusDay) {
      const dateKey = format(focusDay, 'yyyy-MM-dd');
      const isToday = isSameDay(focusDay, today);
      const isPast = isBefore(focusDay, today);
      const dayTasks = state.tasks.filter(t => t.date === dateKey && t.type === 'daily');
      
      const sortedFocusTasks = [...dayTasks].sort((a, b) => {
          if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return 0;
      });

      return (
          <div className="flex flex-col h-full bg-rpg-bg animate-fade-in">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8 pt-4">
                  <button 
                    onClick={() => setFocusDay(null)}
                    className="p-3 bg-rpg-panel border border-rpg-border rounded-xl text-gray-400 hover:text-white hover:border-white transition-all shadow-lg"
                  >
                      <ArrowLeft size={24} />
                  </button>
                  <div>
                      <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight capitalize">
                          {format(focusDay, 'd MMMM', { locale: ru })}
                      </h2>
                      <p className={`text-lg font-mono ${isToday ? 'text-rpg-primary' : 'text-gray-500'}`}>
                          {format(focusDay, 'EEEE', { locale: ru })} {isToday && '• Сегодня'}
                      </p>
                  </div>
                  {isToday && (
                      <button 
                        onClick={() => setConfirmCloseDay(true)}
                        className="ml-auto bg-rpg-card border border-rpg-border px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:border-white flex items-center gap-2"
                      >
                          <Square size={18}/> <span className="hidden md:inline font-bold">Завершить День</span>
                      </button>
                  )}
              </div>

              {/* Task List */}
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pb-24">
                  {sortedFocusTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500 border-2 border-dashed border-rpg-border rounded-2xl bg-black/20">
                          <span className="text-xl mb-4 font-bold">День свободен</span>
                          <button 
                            onClick={() => { setQuickAddDate(dateKey); setModalOpen(true); }}
                            className="bg-rpg-primary text-black px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors"
                          >
                              <Plus size={20} className="inline mr-2"/> Добавить Задачу
                          </button>
                      </div>
                  ) : (
                      sortedFocusTasks.map(task => {
                          const skill = state.skills.find(s => s.id === task.skillId);
                          
                          return (
                              <div 
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={`
                                    flex items-center gap-6 p-6 rounded-2xl border transition-all cursor-pointer group
                                    ${task.completed ? 'bg-gray-900/30 border-gray-800 opacity-60' : 'bg-rpg-panel border-rpg-border hover:border-rpg-primary/50 hover:bg-rpg-card'}
                                    ${isPast ? 'grayscale opacity-70 hover:border-gray-700' : ''}
                                `}
                              >
                                  {/* Time Column */}
                                  <div className="w-16 md:w-24 text-right shrink-0">
                                      {task.startTime ? (
                                          <div className="text-xl md:text-2xl font-mono text-gray-500 font-bold">{task.startTime}</div>
                                      ) : (
                                          <div className="text-gray-700 text-sm font-mono">–:–</div>
                                      )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-2">
                                          <div className={`w-3 h-3 rounded-full shrink-0`} style={{ backgroundColor: skill?.color || '#555' }}></div>
                                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{skill?.name || 'Без категории'}</span>
                                          {task.skillId === 'habit' && <span className="bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold">HABIT</span>}
                                      </div>
                                      <h3 className={`text-2xl md:text-3xl font-bold truncate leading-tight ${task.completed ? 'line-through text-gray-600' : 'text-white'}`}>
                                          {task.title}
                                      </h3>
                                      {task.description && <p className="text-gray-500 mt-1 text-sm line-clamp-1">{task.description}</p>}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-4 shrink-0">
                                      <span className="text-sm font-mono text-rpg-primary/50 font-bold group-hover:text-rpg-primary transition-colors">+{task.xpReward} XP</span>
                                      
                                      <div 
                                          onClick={(e) => !isPast && toggleTask(e, task.id)}
                                          className={`
                                              w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all
                                              ${task.completed 
                                                  ? 'bg-rpg-success border-rpg-success text-black shadow-[0_0_15px_#10b981]' 
                                                  : 'border-gray-600 hover:border-white bg-black text-transparent'}
                                              ${isPast ? 'cursor-not-allowed border-gray-800' : 'cursor-pointer'}
                                          `}
                                      >
                                          <Check size={28} strokeWidth={3} />
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                  )}
                  
                  {/* Add Button at Bottom of List */}
                  {!isPast && (
                      <button 
                        onClick={() => { setQuickAddDate(dateKey); setModalOpen(true); }}
                        className="w-full py-6 border-2 border-dashed border-gray-800 rounded-2xl text-gray-600 hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2 font-bold text-lg"
                      >
                          <Plus size={24}/> Добавить задачу
                      </button>
                  )}
              </div>

              {/* Re-using Modals */}
              {confirmCloseDay && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 animate-fade-in">
                    <div className="bg-rpg-panel border border-rpg-border p-8 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-rpg-primary"></div>
                        <h3 className="text-3xl font-bold text-white mb-4">Завершить день?</h3>
                        <p className="text-gray-400 text-lg mb-8">
                            Вы не сможете изменить статус задач после закрытия.
                        </p>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setConfirmCloseDay(false)} className="px-6 py-3 text-gray-500 hover:text-white font-bold text-lg">Отмена</button>
                            <button onClick={() => { setConfirmCloseDay(false); setShowDayReview(true); }} className="px-8 py-3 bg-rpg-primary text-black font-bold rounded-lg hover:bg-white transition-colors text-lg">Подтвердить</button>
                        </div>
                    </div>
                </div>, document.body
              )}
              {modalOpen && (<TaskCreatorModal onClose={() => { setModalOpen(false); setQuickAddDate(null); }} initialDate={quickAddDate || format(new Date(), 'yyyy-MM-dd')}/>)}
              {/* Note: Reuse existing SelectedTask Modal below in main return, just logic handles it */}
          </div>
      );
  }

  // === RENDER: STANDARD GRID VIEW ===
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-rpg-text capitalize tracking-tight">{format(currentWeekStart, 'LLLL yyyy', { locale: ru })}</h2>
          <div className="flex gap-3">
              <div className="flex gap-1 bg-rpg-card rounded-lg p-1 border border-rpg-border">
                  <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-2 hover:bg-rpg-border rounded-md text-gray-400 hover:text-rpg-text transition-colors"><ChevronLeft size={16}/></button>
                  <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-2 hover:bg-rpg-border rounded-md text-gray-400 hover:text-rpg-text transition-colors"><ChevronRight size={16}/></button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1 items-start">
          {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = state.tasks.filter(t => t.date === dateKey && t.type === 'daily');
              const dayTransactions = state.transactions.filter(t => t.date.startsWith(dateKey));
              const isToday = isSameDay(day, today);
              const isPast = isBefore(day, today);
              const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
              const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
              const dayTotal = dayIncome - dayExpense;
              const sortedDayTasks = [...dayTasks].sort((a, b) => {
                  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                  if (a.startTime) return -1;
                  if (b.startTime) return 1;
                  return 0;
              });

              return (
                  <div 
                    key={dateKey} 
                    id={`day-${dateKey}`} 
                    ref={isToday ? todayRef : null} 
                    onDragOver={(e) => handleDragOver(e, dateKey)}
                    onDrop={(e) => handleDrop(e, dateKey)}
                    className={`rounded-xl flex flex-col transition-all border group relative min-h-[200px] 
                        ${dragOverDate === dateKey ? 'bg-white/5 border-white ring-2 ring-white/30' : 'bg-black/40 border-rpg-border hover:border-rpg-border/80'} 
                        ${isToday ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : ''} 
                        ${isPast ? 'opacity-80' : ''}
                    `}
                  >
                      <div className="flex justify-between items-center p-3 border-b border-rpg-border bg-rpg-card/10 rounded-t-xl shrink-0">
                            <div className="flex items-center gap-2"><span onClick={() => setFocusDay(day)} className={`text-sm font-bold cursor-pointer hover:underline ${isToday ? 'text-rpg-primary' : 'text-gray-400'}`}>{format(day, 'EEE, d', { locale: ru })}</span></div>
                            {isToday && <button onClick={() => setConfirmCloseDay(true)} className="text-gray-500 hover:text-rpg-primary transition-colors p-1" title="Завершить день"><Square size={16} strokeWidth={2} /></button>}
                      </div>
                      <div className="p-2 space-y-2 flex flex-col flex-1">
                          {dayTransactions.map(trans => <TransactionCard key={trans.id} transaction={trans} />)}
                          {sortedDayTasks.map(task => <TaskCard key={task.id} task={task} compact />)}
                          <div className="pt-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1 mt-auto">
                                <div className="flex gap-2">
                                    <button onClick={(e) => openFinanceModal(e, dateKey, 'income')} className="text-gray-600 hover:text-green-400 transition-colors"><TrendingUp size={14}/></button>
                                    <button onClick={(e) => openFinanceModal(e, dateKey, 'expense')} className="text-gray-600 hover:text-red-400 transition-colors"><TrendingDown size={14}/></button>
                                </div>
                                <button onClick={() => { setQuickAddDate(dateKey); setModalOpen(true); }} className="text-gray-500 hover:text-white transition-colors"><Plus size={18}/></button>
                          </div>
                      </div>
                      {(dayTotal !== 0) && <div className={`mt-auto p-2 text-center border-t border-rpg-border/30 text-xs font-mono font-bold ${dayTotal > 0 ? 'text-green-500' : 'text-red-500'}`}>{dayTotal > 0 ? '+' : ''}${Math.abs(dayTotal)}</div>}
                  </div>
              );
          })}
      </div>

      {/* --- MODALS (Shared between views) --- */}
      
      {/* CONFIRM CLOSE DAY (Only for Grid View context, focus view has its own) */}
      {confirmCloseDay && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4 animate-fade-in">
            <div className="bg-rpg-panel border border-rpg-border p-6 rounded-lg max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-rpg-primary"></div>
                <div className="flex items-center gap-3 mb-4 text-white"><AlertTriangle className="text-rpg-primary" size={24}/><h3 className="text-xl font-bold">Завершить день?</h3></div>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">После завершения изменить карточку дня будет невозможно. Все незаконченные дела останутся в статусе <span className="text-red-400">не выполнено</span>.</p>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setConfirmCloseDay(false)} className="px-4 py-2 text-gray-500 hover:text-white text-sm font-bold">Отмена</button>
                    <button onClick={() => { setConfirmCloseDay(false); setShowDayReview(true); }} className="px-6 py-2 bg-rpg-primary text-black font-bold rounded text-sm hover:bg-white transition-colors">Подтвердить</button>
                </div>
            </div>
        </div>, document.body
      )}

      {modalOpen && (<TaskCreatorModal onClose={() => { setModalOpen(false); setQuickAddDate(null); }} initialDate={quickAddDate || format(new Date(), 'yyyy-MM-dd')}/>)}

      {/* FULL SELECTED TASK MODAL */}
      {selectedTask && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4" onClick={() => setSelectedTask(null)}>
              <div className="bg-rpg-panel w-full max-w-lg rounded-lg border border-rpg-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 pb-0 flex-shrink-0">
                      <div className="flex justify-between items-start mb-6">
                          <div className="flex-1">
                              <input 
                                className={`text-2xl font-bold text-rpg-text leading-tight bg-transparent border-b border-transparent outline-none w-full transition-colors pb-1 ${isSelectedTaskPast ? 'cursor-not-allowed text-gray-400' : 'hover:border-gray-700 focus:border-rpg-primary'}`}
                                value={selectedTask.title}
                                onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                                readOnly={isSelectedTaskPast}
                              />
                          </div>
                          <button onClick={() => setSelectedTask(null)}><X className="text-gray-500 hover:text-rpg-text" /></button>
                      </div>
                  </div>
                  <div className="p-6 pt-0 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      
                      {/* Structure Link Banner */}
                      {linkedStructureNode && (
                          <div 
                            className="flex items-center gap-3 bg-black/30 border border-gray-800 rounded p-3 cursor-pointer hover:bg-black/50 transition-colors group"
                            onClick={() => handleOpenStructureNode(linkedStructureNode.id)}
                          >
                              <div className="p-2 bg-gray-800 rounded text-gray-400 group-hover:text-white">
                                  <GitMerge size={18}/>
                              </div>
                              <div className="flex-1">
                                  <div className="text-[10px] text-gray-500 uppercase font-mono mb-0.5">Структура</div>
                                  <div className="text-sm font-bold text-white flex items-center gap-2">
                                      {linkedStructureNode.title}
                                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: linkedStructureColor || '#fff'}}></div>
                                  </div>
                              </div>
                              <div className="text-gray-600 group-hover:text-white">
                                  <ExternalLink size={14}/>
                              </div>
                          </div>
                      )}

                      <textarea 
                          className={`w-full bg-black/20 border border-gray-800 rounded-lg p-3 text-sm leading-relaxed resize-none outline-none min-h-[80px] ${isSelectedTaskPast ? 'text-gray-500 cursor-not-allowed' : 'text-gray-300 focus:border-rpg-primary'}`}
                          value={selectedTask.description}
                          onChange={(e) => setSelectedTask({...selectedTask, description: e.target.value})}
                          placeholder="Описание задачи..."
                          readOnly={isSelectedTaskPast}
                      />

                      {/* EDIT: Category Select */}
                      <div>
                          <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Категория</label>
                          <select 
                              className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white text-sm outline-none focus:border-rpg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              value={selectedTask.skillId}
                              onChange={e => setSelectedTask({...selectedTask, skillId: e.target.value})}
                              disabled={isSelectedTaskPast}
                          >
                              {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Начало</label>
                              <input 
                                type="time" 
                                className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white disabled:opacity-50" 
                                value={selectedTask.startTime || ''} 
                                onChange={e => setSelectedTask({...selectedTask, startTime: e.target.value})} 
                                readOnly={isSelectedTaskPast}
                              />
                          </div>
                          <div>
                              <label className="text-xs text-gray-500 mb-1 block uppercase font-mono">Конец</label>
                              <input 
                                type="time" 
                                className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white disabled:opacity-50" 
                                value={selectedTask.endTime || ''} 
                                onChange={e => setSelectedTask({...selectedTask, endTime: e.target.value})} 
                                readOnly={isSelectedTaskPast}
                              />
                          </div>
                      </div>
                      
                      {/* Checklist */}
                      <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs text-gray-500 uppercase tracking-wider"><span>Чеклист</span><span>{selectedTask.checklist?.filter(i => i.completed).length || 0} / {selectedTask.checklist?.length || 0}</span></div>
                          {!isSelectedTaskPast && (
                              <form onSubmit={addChecklistItem} className="flex gap-2"><input className="flex-1 bg-rpg-card border border-rpg-border rounded p-2 text-sm text-white focus:border-rpg-primary outline-none" placeholder="Добавить пункт..." value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} /><button type="submit" className="bg-rpg-card hover:bg-white/10 p-2 rounded text-white border border-rpg-border"><Plus size={16}/></button></form>
                          )}
                          <div className="space-y-1">
                              {selectedTask.checklist?.map(item => (
                                  <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 group">
                                      <button 
                                        onClick={() => !isSelectedTaskPast && toggleChecklistItem(item.id)} 
                                        disabled={isSelectedTaskPast}
                                        className={`w-4 h-4 rounded border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'} ${isSelectedTaskPast ? 'cursor-not-allowed opacity-50' : ''}`}
                                      >
                                          {item.completed && <Check size={10} className="text-black"/>}
                                      </button>
                                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>{item.text}</span>
                                      {!isSelectedTaskPast && (
                                          <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Attachments Section (EDITABLE) */}
                      <div className="space-y-4 pt-4 border-t border-gray-800">
                          <label className="text-xs text-gray-500 uppercase font-bold">Ресурсы / Вложения</label>
                          
                          {/* Link Input */}
                          <div className="relative">
                               <input 
                                  type="url" 
                                  className="w-full bg-rpg-card border border-rpg-border rounded p-3 pl-10 text-white text-sm outline-none focus:border-rpg-primary transition-colors disabled:opacity-50"
                                  placeholder="Ссылка (URL)..."
                                  value={selectedTask.externalLink || ''}
                                  onChange={e => setSelectedTask({...selectedTask, externalLink: e.target.value})}
                                  readOnly={isSelectedTaskPast}
                               />
                               <LinkIcon className="absolute left-3 top-3 text-gray-500" size={16}/>
                               {selectedTask.externalLink && (
                                   <a 
                                      href={selectedTask.externalLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="absolute right-3 top-3 text-rpg-primary hover:text-white"
                                      title="Открыть"
                                   >
                                       <ExternalLink size={16}/>
                                   </a>
                               )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              {/* Note Select */}
                              <div>
                                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Заметка</label>
                                  {!linkedStructureNode ? (
                                      <select 
                                          className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-sm text-white outline-none focus:border-rpg-primary disabled:opacity-50"
                                          value={selectedTask.linkedNoteId || ''}
                                          onChange={e => setSelectedTask({...selectedTask, linkedNoteId: e.target.value})}
                                          disabled={isSelectedTaskPast}
                                      >
                                          <option value="">Нет</option>
                                          {state.notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                                      </select>
                                  ) : (
                                      <div className="text-xs text-gray-500 italic p-2 border border-gray-800 rounded bg-black/20 flex items-center gap-2">
                                          <GitMerge size={12}/> Привязано к структуре
                                      </div>
                                  )}
                              </div>

                              {/* Backpack Select */}
                              <div>
                                  <label className="text-[10px] text-gray-500 uppercase mb-1 block">Рюкзак</label>
                                  <select 
                                      className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-sm text-white outline-none focus:border-rpg-primary disabled:opacity-50"
                                      value={selectedTask.linkedInventoryId || ''}
                                      onChange={e => setSelectedTask({...selectedTask, linkedInventoryId: e.target.value})}
                                      disabled={isSelectedTaskPast}
                                  >
                                      <option value="">Нет</option>
                                      {state.inventory.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 md:p-6 pt-4 border-t border-rpg-border flex justify-between bg-rpg-panel shrink-0 items-center">
                      <button 
                        onClick={() => handleDeleteTask(selectedTask.id)} 
                        disabled={isSelectedTaskPast}
                        className={`text-red-500 hover:text-red-400 text-sm font-medium flex items-center gap-2 p-2 hover:bg-red-900/10 rounded transition-colors ${isSelectedTaskPast ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                          <Trash2 size={18}/>
                      </button>
                      <div className="flex gap-3">
                          {!isSelectedTaskPast && isTaskDirty() && (
                              <button onClick={handleUpdateTaskDetails} className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold bg-white text-black hover:bg-gray-200 transition-colors animate-fade-in">
                                  <Save size={16}/> Сохранить
                              </button>
                          )}
                          <button 
                            onClick={(e) => { !isSelectedTaskPast && toggleTask(e as any, selectedTask.id); setSelectedTask(null); }} 
                            disabled={isSelectedTaskPast}
                            className={`px-4 md:px-6 py-2 rounded text-sm font-bold transition-colors ${
                                isSelectedTaskPast 
                                    ? 'bg-rpg-border text-gray-500 cursor-not-allowed' 
                                    : selectedTask.completed 
                                        ? 'bg-rpg-border text-gray-400 hover:text-rpg-text' 
                                        : 'bg-rpg-primary text-black hover:opacity-90'
                            }`}
                          >
                              {selectedTask.completed ? 'Отменить' : 'Выполнить'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>, document.body
      )}

      {viewingNote && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4" onClick={() => setViewingNote(null)}>
              <div className="bg-rpg-panel w-full max-w-lg rounded-lg border border-rpg-border shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-rpg-text truncate pr-4">{viewingNote.title}</h3><button onClick={() => setViewingNote(null)}><X className="text-gray-500 hover:text-rpg-text"/></button></div>
                  <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-gray-500 mb-6">{viewingNote.content}</div>
                  <div className="flex justify-end border-t border-rpg-border pt-4"><button onClick={() => handleOpenInNotesApp(viewingNote.id)} className="flex items-center gap-2 bg-rpg-secondary/10 border border-rpg-secondary text-rpg-secondary hover:bg-rpg-secondary hover:text-white px-4 py-2 rounded text-sm font-bold transition-all"><ExternalLink size={16}/> Открыть в Заметках</button></div>
              </div>
          </div>, document.body
      )}

      {financeModalOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black p-4"><form onSubmit={submitFinance} className="bg-rpg-panel p-6 rounded-lg w-full max-w-sm border border-rpg-border shadow-2xl"><h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${financeType === 'income' ? 'text-green-500' : 'text-red-500'}`}>{financeType === 'income' ? <Plus size={24}/> : <Minus size={24}/>}{financeType === 'income' ? 'Доход' : 'Расход'}</h3><div className="space-y-4"><div><label className="block text-xs font-mono text-gray-500 mb-1">Сумма</label><input type="number" autoFocus className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white text-lg font-bold focus:border-rpg-primary outline-none" value={financeAmount} onChange={e => setFinanceAmount(e.target.value)} placeholder="0"/></div><div><label className="block text-xs font-mono text-gray-500 mb-1">Категория</label><select className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={financeCategory} onChange={e => setFinanceCategory(e.target.value)}>{financeType === 'expense' ? EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>) : INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div><div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setFinanceModalOpen(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button><button type="submit" className={`px-6 py-2 rounded font-bold text-black ${financeType === 'income' ? 'bg-green-500' : 'bg-red-500'}`}>Добавить</button></div></form></div>, document.body
      )}

      {showDayReview && <DayReview onClose={() => setShowDayReview(false)} />}
    </div>
  );
};

export default WeeklyCalendar;