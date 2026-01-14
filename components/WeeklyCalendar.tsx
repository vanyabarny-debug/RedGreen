import React, { useState, useRef, useEffect } from 'react';
import { startOfWeek, addDays, addWeeks, addMonths, addYears, subWeeks, format, isSameDay, isBefore, startOfDay, parseISO, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Plus, Paperclip, StickyNote, X, Trash2, Image as ImageIcon, Upload, Repeat, RefreshCw, ExternalLink, ListChecks, DollarSign, Minus, TrendingUp, TrendingDown, Tag, Clock, Link as LinkIcon, Backpack, Moon } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Task, Note, TaskChecklistItem, Transaction, Skill } from '../types';
import { playSound } from '../utils/audio';
import { useNavigate, useLocation } from 'react-router-dom';
import DayReview from './DayReview';

const WeeklyCalendar: React.FC = () => {
  const { state, dispatch } = useGame();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [showDayReview, setShowDayReview] = useState(false);
  
  // Finance Modal State
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [financeType, setFinanceType] = useState<'income' | 'expense'>('expense');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeCategory, setFinanceCategory] = useState('');
  
  // Checklist State
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Task Form State
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskXP, setTaskXP] = useState(10);
  const [taskSkill, setTaskSkill] = useState('');
  const [taskStartTime, setTaskStartTime] = useState('');
  const [taskEndTime, setTaskEndTime] = useState('');
  const [taskLink, setTaskLink] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [repeatType, setRepeatType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none');
  
  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const today = startOfDay(new Date());

  const EXPENSE_CATEGORIES = ['Еда', 'Жилье', 'Транспорт', 'Здоровье', 'Отдых', 'Образование', 'Другое'];
  const INCOME_CATEGORIES = ['Зарплата', 'Фриланс', 'Подарок', 'Продажа', 'Другое'];

  // --- Flatten Skills for Dropdown ---
  const getFlattenedSkills = () => {
      const flat: { skill: Skill, depth: number }[] = [];
      const traverse = (parentId: string | null, depth: number) => {
          const children = state.skills.filter(s => s.parentId === parentId);
          children.forEach(child => {
              flat.push({ skill: child, depth });
              traverse(child.id, depth + 1);
          });
      };
      traverse(null, 0);
      return flat;
  };
  const flatSkills = getFlattenedSkills();

  // --- Auto-open task from Navigation ---
  useEffect(() => {
      if (location.state?.openTaskId) {
          const task = state.tasks.find(t => t.id === location.state.openTaskId);
          if (task) {
               const tDate = parseISO(task.date || task.createdAt || new Date().toISOString());
               setCurrentWeekStart(startOfWeek(tDate, { weekStartsOn: 1 }));
               setSelectedTask(task);
               setFocusDay(tDate);
          }
          window.history.replaceState({}, document.title);
      }
  }, [location.state, state.tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const dateToUse = quickAddDate ? parseISO(quickAddDate) : focusDay;
    if (!taskName || !taskSkill || !dateToUse) return;

    const baseTask: Task = {
        id: `task_${Date.now()}`,
        type: 'daily',
        date: format(dateToUse, 'yyyy-MM-dd'),
        title: taskName,
        description: taskDesc,
        xpReward: Math.min(20, Math.max(1, Number(taskXP))),
        skillId: taskSkill,
        completed: false,
        startTime: taskStartTime || undefined,
        endTime: taskEndTime || undefined,
        externalLink: taskLink || undefined,
        linkedNoteId: selectedNoteId || undefined,
        linkedInventoryId: selectedInventoryId || undefined,
        checklist: []
    };

    if (repeatType === 'none') {
        dispatch({ type: 'ADD_TASK', payload: baseTask });
    } else {
        const tasksToCreate: Task[] = [baseTask];
        let limit = 0;
        let incrementFunction: (d: Date, i: number) => Date;

        if (repeatType === 'daily') { limit = 30; incrementFunction = addDays; }
        else if (repeatType === 'weekly') { limit = 12; incrementFunction = addWeeks; }
        else if (repeatType === 'monthly') { limit = 12; incrementFunction = addMonths; }
        else { limit = 5; incrementFunction = addYears; }

        for (let i = 1; i <= limit; i++) {
            const nextDate = incrementFunction(dateToUse, i);
            tasksToCreate.push({
                ...baseTask,
                id: `task_${Date.now()}_${i}`,
                date: format(nextDate, 'yyyy-MM-dd')
            });
        }
        dispatch({ type: 'ADD_TASKS_BATCH', payload: tasksToCreate });
    }

    setModalOpen(false);
    setQuickAddDate(null);
    resetForm();
  };

  const resetForm = () => {
    setTaskName('');
    setTaskDesc('');
    setTaskXP(10);
    setTaskStartTime('');
    setTaskEndTime('');
    setTaskLink('');
    setSelectedNoteId('');
    setSelectedInventoryId('');
    setRepeatType('none');
  }

  const handleDeleteTask = (id: string) => {
      if(window.confirm('Удалить задачу?')) {
          dispatch({type: 'DELETE_TASK', payload: id});
          setSelectedTask(null);
      }
  }

  const handleDeleteTransaction = (id: string) => {
      if(window.confirm('Удалить запись о финансах?')) {
          dispatch({type: 'DELETE_TRANSACTION', payload: id});
      }
  }

  const toggleTask = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      dispatch({type: 'TOGGLE_TASK', payload: { id, x: rect.x, y: rect.y }});
  }

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

  const handleOpenBackpack = (listId: string) => {
      setSelectedTask(null);
      navigate('/inventory', { state: { openListId: listId } });
  }

  const addChecklistItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTask || !newChecklistItem.trim()) return;
      const newItem: TaskChecklistItem = { id: `cli_${Date.now()}`, text: newChecklistItem, completed: false };
      const updatedChecklist = [...(selectedTask.checklist || []), newItem];
      dispatch({ type: 'UPDATE_TASK_CHECKLIST', payload: { taskId: selectedTask.id, checklist: updatedChecklist } });
      setSelectedTask({...selectedTask, checklist: updatedChecklist});
      setNewChecklistItem('');
  };

  const toggleChecklistItem = (itemId: string) => {
      if (!selectedTask) return;
      const updatedChecklist = (selectedTask.checklist || []).map(item => item.id === itemId ? { ...item, completed: !item.completed } : item);
      dispatch({ type: 'UPDATE_TASK_CHECKLIST', payload: { taskId: selectedTask.id, checklist: updatedChecklist } });
      setSelectedTask({...selectedTask, checklist: updatedChecklist});
  };

  const deleteChecklistItem = (itemId: string) => {
      if (!selectedTask) return;
      const updatedChecklist = (selectedTask.checklist || []).filter(item => item.id !== itemId);
      dispatch({ type: 'UPDATE_TASK_CHECKLIST', payload: { taskId: selectedTask.id, checklist: updatedChecklist } });
      setSelectedTask({...selectedTask, checklist: updatedChecklist});
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
      const targetDate = parseISO(dateStr);
      if (isBefore(targetDate, today)) return;
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      const targetDate = parseISO(dateStr);
      if (isBefore(targetDate, today)) return;
      if (taskId) {
          dispatch({ type: 'UPDATE_TASK_DATE', payload: { id: taskId, date: dateStr } });
          playSound('click');
      }
  };

  const getSkillColor = (id: string) => state.skills.find(s => s.id === id)?.color || '#52525b';

  const getFaviconUrl = (url: string) => {
      try {
          const domain = new URL(url).hostname;
          return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch (e) {
          return '';
      }
  };

  const TransactionCard: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
      const isIncome = transaction.type === 'income';
      return (
          <div className={`
              border rounded-lg p-3 flex flex-col gap-1 relative group cursor-default
              ${isIncome ? 'bg-green-900/10 border-green-800 hover:border-green-600' : 'bg-red-900/10 border-red-800 hover:border-red-600'}
          `}>
              <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isIncome ? 'bg-green-800 text-white' : 'bg-red-800 text-white'}`}>
                      {transaction.category}
                  </span>
                  <button onClick={() => handleDeleteTransaction(transaction.id)} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
              </div>
              <div className={`font-mono font-bold text-lg ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                  {isIncome ? '+ $' : '- $'}{transaction.amount}
              </div>
          </div>
      );
  };

  const TaskCard: React.FC<{ task: Task, compact?: boolean }> = ({ task, compact = false }) => {
      const isExpired = !task.completed && isBefore(parseISO(task.date!), today);
      const isLocked = task.completed || isExpired;
      
      return (
        <div 
            draggable={!isLocked}
            onDragStart={(e) => !isLocked && handleDragStart(e, task.id)}
            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
            className={`
                group relative border rounded-lg p-3 transition-all cursor-pointer flex flex-col gap-2
                ${task.completed ? 'bg-rpg-card/50 border-rpg-success/20 opacity-60' : isExpired ? 'bg-rpg-card border-rpg-border opacity-40 grayscale' : 'bg-rpg-card border-rpg-border hover:border-rpg-primary hover:bg-rpg-card/80'}
                ${compact ? 'text-xs' : 'text-sm'}
                ${!isLocked ? 'active:cursor-grabbing hover:cursor-grab' : 'cursor-default'}
            `}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1">
                    {task.skillId === 'habit' ? (
                        <span className="font-bold font-mono text-[10px] uppercase px-1.5 py-0.5 rounded text-purple-200 bg-purple-900/50 shadow-sm border border-purple-500/30">
                            ПРИВЫЧКА
                        </span>
                    ) : (
                        <span className="font-bold font-mono text-[10px] uppercase px-1.5 py-0.5 rounded text-white shadow-sm flex items-center gap-1" style={{backgroundColor: getSkillColor(task.skillId)}}>
                            <Tag size={8} className="inline"/>
                            {state.skills.find(s => s.id === task.skillId)?.name}
                        </span>
                    )}
                </div>
                <span className="text-rpg-warning font-mono text-[10px] px-1.5 border border-rpg-warning/30 rounded">+{task.xpReward} XP</span>
            </div>
            
            <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-rpg-text'}`}>
                {task.title}
            </div>

            {/* Time & Link Row */}
            {(task.startTime || task.externalLink) && (
                <div className="flex items-center gap-2 mt-1">
                    {task.startTime && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-black/20 px-1.5 py-0.5 rounded">
                            <Clock size={10}/>
                            {task.startTime} {task.endTime ? `- ${task.endTime}` : ''}
                        </div>
                    )}
                    {task.externalLink && (
                        <a 
                            href={task.externalLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded hover:bg-blue-900/40 transition-colors"
                        >
                            <img src={getFaviconUrl(task.externalLink)} className="w-3 h-3 rounded-sm" alt=""/>
                            Открыть
                        </a>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center mt-auto pt-2 border-t border-rpg-border/50">
                 <div className="flex gap-2 text-gray-500">
                    {(task.description || (task.checklist && task.checklist.length > 0)) && <StickyNote size={12}/>}
                    {task.linkedNoteId && <StickyNote size={12} className="text-rpg-secondary"/>}
                    {task.linkedInventoryId && <Backpack size={12} className="text-rpg-primary"/>}
                </div>
                <div 
                    onClick={(e) => !isExpired && toggleTask(e, task.id)}
                    className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all
                        ${task.completed ? 'bg-rpg-success border-rpg-success' : 'border-gray-500 hover:border-rpg-text'}
                        ${isExpired ? 'cursor-not-allowed' : 'cursor-pointer'}
                    `}
                >
                    {task.completed && <Check size={10} className="text-black" />}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-rpg-text capitalize tracking-tight">{format(currentWeekStart, 'LLLL yyyy', { locale: ru })}</h2>
          <div className="flex gap-3">
              <button 
                onClick={() => setShowDayReview(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-colors"
              >
                  <Moon size={16}/> <span className="hidden md:inline">Завершить день</span>
              </button>
              
              <div className="flex gap-1 bg-rpg-card rounded-lg p-1 border border-rpg-border">
                  <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-2 hover:bg-rpg-border rounded-md text-gray-400 hover:text-rpg-text transition-colors"><ChevronLeft size={16}/></button>
                  <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-2 hover:bg-rpg-border rounded-md text-gray-400 hover:text-rpg-text transition-colors"><ChevronRight size={16}/></button>
              </div>
          </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1 h-full min-h-0 overflow-y-auto">
          {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = state.tasks.filter(t => t.date === dateKey && t.type === 'daily');
              const dayTransactions = state.transactions.filter(t => t.date.startsWith(dateKey));
              
              const isToday = isSameDay(day, today);
              const isPast = isBefore(day, today);
              
              const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
              const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
              const dayTotal = dayIncome - dayExpense;

              // SORT TASKS: By Time (Ascending), then Created At
              const sortedDayTasks = [...dayTasks].sort((a, b) => {
                  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                  if (a.startTime) return -1; // Time first
                  if (b.startTime) return 1;
                  return 0;
              });

              return (
                  <div 
                    key={dateKey} 
                    onDragOver={(e) => handleDragOver(e, dateKey)}
                    onDrop={(e) => handleDrop(e, dateKey)}
                    className={`
                        rounded-lg p-3 flex flex-col transition-all border group relative h-auto md:min-h-0
                        ${isToday ? 'bg-rpg-card border-rpg-primary/50' : 'bg-rpg-panel border-rpg-border hover:border-rpg-border/80'}
                        ${isPast ? 'opacity-80' : ''}
                    `}
                  >
                      <div className="flex justify-between items-center mb-3">
                            <span onClick={() => setFocusDay(day)} className={`text-sm font-bold cursor-pointer hover:underline ${isToday ? 'text-rpg-primary' : 'text-gray-500'}`}>
                                {format(day, 'EEE, d', { locale: ru })}
                            </span>
                            <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setQuickAddDate(dateKey); setModalOpen(true); }}
                                    className="p-1 hover:bg-rpg-border rounded text-gray-400 hover:text-rpg-text"
                                    title="Добавить задачу"
                                >
                                    <Plus size={14}/>
                                </button>
                                <button 
                                    onClick={(e) => openFinanceModal(e, dateKey, 'income')}
                                    className="p-1 hover:bg-green-900/30 rounded text-gray-400 hover:text-green-400"
                                    title="Доход"
                                >
                                    <TrendingUp size={14}/>
                                </button>
                                <button 
                                    onClick={(e) => openFinanceModal(e, dateKey, 'expense')}
                                    className="p-1 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400"
                                    title="Расход"
                                >
                                    <TrendingDown size={14}/>
                                </button>
                            </div>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                          {dayTransactions.map(trans => <TransactionCard key={trans.id} transaction={trans} />)}
                          {sortedDayTasks.map(task => <TaskCard key={task.id} task={task} compact />)}
                      </div>
                      
                      {(dayTotal !== 0) && (
                          <div className={`mt-3 text-lg font-mono font-bold text-center border-t border-gray-800 pt-2 ${dayTotal > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {dayTotal > 0 ? '+' : ''}${Math.abs(dayTotal)}
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      {/* Focus Day Modal */}
      {focusDay && (
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-rpg-panel w-full max-w-5xl h-[90vh] rounded-lg border border-rpg-border flex flex-col overflow-hidden relative shadow-2xl animate-fade-in">
                  <div className="p-4 md:p-6 border-b border-rpg-border flex justify-between items-center bg-rpg-card">
                      <div>
                        <h2 className="text-xl md:text-3xl font-bold text-rpg-text capitalize tracking-tight">{format(focusDay, 'EEEE, d MMMM', { locale: ru })}</h2>
                        <p className="text-sm text-gray-500 font-mono">Фокус Режим</p>
                      </div>
                      <button onClick={() => setFocusDay(null)} className="p-2 hover:bg-rpg-border rounded text-gray-400 hover:text-rpg-text"><X /></button>
                  </div>
                  
                  <div className="flex-1 p-4 md:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 content-start bg-rpg-bg">
                      {state.tasks
                        .filter(t => t.date === format(focusDay, 'yyyy-MM-dd') && t.type === 'daily')
                        .sort((a, b) => {
                            if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                            return 0;
                        })
                        .map(task => (
                          <TaskCard key={task.id} task={task} />
                      ))}
                      <button 
                        onClick={() => { setQuickAddDate(format(focusDay, 'yyyy-MM-dd')); setModalOpen(true); }}
                        className="border border-dashed border-rpg-border rounded-lg flex flex-col items-center justify-center text-gray-600 hover:text-rpg-text hover:border-rpg-text hover:bg-rpg-card transition-all min-h-[150px]"
                      >
                          <Plus size={32} />
                          <span className="mt-2 text-sm font-medium">Новая задача</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Add Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <form onSubmit={handleAddTask} className="bg-rpg-panel p-6 md:p-8 rounded-lg w-full max-w-lg border border-rpg-border shadow-2xl max-h-[90vh] overflow-y-auto">
                 <h3 className="text-xl font-bold mb-6 text-rpg-text tracking-tight">Создать Задачу</h3>
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
                                    required
                                 >
                                     <option value="">Выбрать цель...</option>
                                     {flatSkills.map(({skill, depth}) => (
                                         <option key={skill.id} value={skill.id} className="text-black" style={{color: skill.color}}>
                                             {'\u00A0'.repeat(depth * 3)} {'●'} {skill.name}
                                         </option>
                                     ))}
                                 </select>
                                 <div className="absolute right-3 top-3 pointer-events-none text-gray-500"><ChevronRight size={16} className="rotate-90"/></div>
                             </div>
                         </div>
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
                     
                     {/* Recurrence Options */}
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
                     <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                     <button type="submit" className="px-6 py-2 bg-rpg-primary text-rpg-bg text-sm font-bold rounded hover:opacity-90">Создать</button>
                 </div>
             </form>
        </div>
      )}

      {/* Finance Modal */}
      {financeModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <form onSubmit={submitFinance} className="bg-rpg-panel p-6 rounded-lg w-full max-w-sm border border-rpg-border shadow-2xl">
                   <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${financeType === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                       {financeType === 'income' ? <Plus size={24}/> : <Minus size={24}/>}
                       {financeType === 'income' ? 'Доход' : 'Расход'}
                   </h3>
                   <div className="space-y-4">
                       <div>
                           <label className="block text-xs font-mono text-gray-500 mb-1">Сумма</label>
                           <input type="number" autoFocus className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white text-lg font-bold focus:border-rpg-primary outline-none" value={financeAmount} onChange={e => setFinanceAmount(e.target.value)} placeholder="0"/>
                       </div>
                       <div>
                           <label className="block text-xs font-mono text-gray-500 mb-1">Категория</label>
                           <select className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" value={financeCategory} onChange={e => setFinanceCategory(e.target.value)}>
                               {financeType === 'expense' ? 
                                   EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>) :
                                   INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                               }
                           </select>
                       </div>
                   </div>
                   <div className="flex justify-end gap-3 mt-6">
                       <button type="button" onClick={() => setFinanceModalOpen(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
                       <button type="submit" className={`px-6 py-2 rounded font-bold text-black ${financeType === 'income' ? 'bg-green-500' : 'bg-red-500'}`}>
                           Добавить
                       </button>
                   </div>
               </form>
          </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedTask(null)}>
              <div className="bg-rpg-panel w-full max-w-lg rounded-lg border border-rpg-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="p-6 pb-0 flex-shrink-0">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <div className="flex gap-2 mb-2">
                                  {selectedTask.skillId === 'habit' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-purple-200 bg-purple-900/50 uppercase tracking-wider shadow-sm border border-purple-500/30">
                                          ПРИВЫЧКА
                                      </span>
                                  ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-white uppercase tracking-wider shadow-sm flex items-center gap-1" style={{backgroundColor: getSkillColor(selectedTask.skillId)}}>
                                          <Tag size={8}/> {state.skills.find(s => s.id === selectedTask.skillId)?.name}
                                      </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded border border-rpg-warning text-rpg-warning text-[10px] font-mono font-bold">+{selectedTask.xpReward} XP</span>
                              </div>
                              <h2 className="text-2xl font-bold text-rpg-text leading-tight">{selectedTask.title}</h2>
                          </div>
                          <button onClick={() => setSelectedTask(null)}><X className="text-gray-500 hover:text-rpg-text" /></button>
                      </div>
                  </div>

                  <div className="p-6 pt-0 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      
                      {/* Time & Link Info Block */}
                      {(selectedTask.startTime || selectedTask.externalLink) && (
                          <div className="flex flex-wrap gap-4 bg-black/20 p-3 rounded-lg border border-gray-800">
                              {selectedTask.startTime && (
                                  <div className="flex items-center gap-2 text-sm text-gray-300">
                                      <Clock size={16} className="text-gray-500"/>
                                      <span className="font-mono">{selectedTask.startTime} {selectedTask.endTime ? `- ${selectedTask.endTime}` : ''}</span>
                                  </div>
                              )}
                              {selectedTask.externalLink && (
                                  <a 
                                    href={selectedTask.externalLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                      <img src={getFaviconUrl(selectedTask.externalLink)} className="w-4 h-4 rounded-sm" alt=""/>
                                      Открыть ссылку <ExternalLink size={14}/>
                                  </a>
                              )}
                          </div>
                      )}

                      {selectedTask.description && (
                          <p className="text-gray-500 whitespace-pre-wrap text-sm leading-relaxed">{selectedTask.description}</p>
                      )}

                      {/* Checklist Section */}
                      <div className="bg-rpg-card rounded border border-rpg-border p-4">
                          <h4 className="text-xs font-mono uppercase text-gray-500 mb-3 flex items-center gap-2">
                              <ListChecks size={14}/> Чеклист
                          </h4>
                          <div className="space-y-2 mb-3">
                              {(selectedTask.checklist || []).map(item => (
                                  <div key={item.id} className="flex items-center gap-2 group">
                                      <input 
                                        type="checkbox" 
                                        checked={item.completed} 
                                        onChange={() => toggleChecklistItem(item.id)}
                                        className="w-4 h-4 accent-rpg-primary rounded cursor-pointer shrink-0"
                                      />
                                      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-600' : 'text-gray-300'}`}>{item.text}</span>
                                      <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-600 hover:text-red-500 transition-opacity"><Trash2 size={14}/></button>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={addChecklistItem} className="flex gap-2">
                              <input 
                                className="flex-1 bg-rpg-panel border border-rpg-border rounded px-2 py-1 text-sm text-rpg-text focus:border-rpg-primary outline-none"
                                placeholder="Добавить пункт..."
                                value={newChecklistItem}
                                onChange={(e) => setNewChecklistItem(e.target.value)}
                              />
                              <button type="submit" className="bg-rpg-panel border border-rpg-border hover:bg-rpg-border text-gray-400 rounded px-2"><Plus size={16}/></button>
                          </form>
                      </div>

                      {/* Linked Items */}
                      {(selectedTask.linkedNoteId || selectedTask.linkedInventoryId) && (
                          <div className="space-y-2">
                              {selectedTask.linkedNoteId && (
                                  <div 
                                    onClick={() => handleViewNote(selectedTask.linkedNoteId!)}
                                    className="p-3 bg-rpg-card rounded border border-rpg-border flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:border-rpg-secondary hover:text-rpg-text transition-colors"
                                  >
                                      <StickyNote size={16} className="text-rpg-warning"/> 
                                      <span className="truncate">{state.notes.find(n => n.id === selectedTask.linkedNoteId)?.title || 'Заметка'}</span>
                                  </div>
                              )}
                              {selectedTask.linkedInventoryId && (
                                  <div 
                                    onClick={() => handleOpenBackpack(selectedTask.linkedInventoryId!)}
                                    className="p-3 bg-rpg-card rounded border border-rpg-border flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:border-rpg-primary hover:text-white transition-colors"
                                  >
                                      <Backpack size={16} className="text-rpg-primary"/>
                                      <span className="truncate flex-1">{state.inventory.find(l => l.id === selectedTask.linkedInventoryId)?.title || 'Рюкзак'}</span>
                                      <ExternalLink size={14} className="opacity-50"/>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  <div className="p-4 md:p-6 pt-4 border-t border-rpg-border flex justify-between bg-rpg-panel shrink-0">
                      <button onClick={() => handleDeleteTask(selectedTask.id)} className="text-red-500 hover:text-red-400 text-sm font-medium flex items-center gap-2"><Trash2 size={16}/> Удалить</button>
                      <button onClick={(e) => { toggleTask(e as any, selectedTask.id); setSelectedTask(null); }} className={`px-4 md:px-6 py-2 rounded text-sm font-bold transition-colors ${selectedTask.completed ? 'bg-rpg-border text-gray-400 hover:text-rpg-text' : 'bg-rpg-success text-black hover:bg-emerald-400'}`}>
                          {selectedTask.completed ? 'Отменить' : 'Выполнить'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Note View Modal */}
      {viewingNote && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setViewingNote(null)}>
              <div className="bg-rpg-panel w-full max-w-lg rounded-lg border border-rpg-border shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-rpg-text truncate pr-4">{viewingNote.title}</h3>
                      <button onClick={() => setViewingNote(null)}><X className="text-gray-500 hover:text-rpg-text"/></button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-gray-500 mb-6">
                      {viewingNote.content}
                  </div>
                  <div className="flex justify-end border-t border-rpg-border pt-4">
                       <button 
                            onClick={() => handleOpenInNotesApp(viewingNote.id)}
                            className="flex items-center gap-2 bg-rpg-secondary/10 border border-rpg-secondary text-rpg-secondary hover:bg-rpg-secondary hover:text-white px-4 py-2 rounded text-sm font-bold transition-all"
                       >
                           <ExternalLink size={16}/> Открыть в Заметках
                       </button>
                  </div>
              </div>
          </div>
      )}

      {showDayReview && <DayReview onClose={() => setShowDayReview(false)} />}
    </div>
  );
};

export default WeeklyCalendar;