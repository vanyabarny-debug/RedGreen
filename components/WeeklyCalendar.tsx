import React, { useState, useRef, useEffect } from 'react';
import { startOfWeek, addDays, addWeeks, addMonths, addYears, subWeeks, format, isSameDay, isBefore, startOfDay, parseISO, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, Plus, Paperclip, StickyNote, X, Trash2, Image as ImageIcon, Upload, Repeat, RefreshCw, ExternalLink, ListChecks } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Task, Note, TaskChecklistItem } from '../types';
import { playSound } from '../utils/audio';
import { useNavigate, useLocation } from 'react-router-dom';

const WeeklyCalendar: React.FC = () => {
  const { state, dispatch } = useGame();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [modalOpen, setModalOpen] = useState(false);
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  
  // Checklist State
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  // Task Form State
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskXP, setTaskXP] = useState(10);
  const [taskSkill, setTaskSkill] = useState('');
  const [taskFile, setTaskFile] = useState<string | null>(null);
  const [taskImage, setTaskImage] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [repeatType, setRepeatType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none');
  
  const imageInputRef = useRef<HTMLInputElement>(null);

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const today = startOfDay(new Date());

  // --- Auto-open task from Navigation (Notes -> Planner) ---
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
        fileName: taskFile || undefined,
        taskImage: taskImage || undefined,
        linkedNoteId: selectedNoteId || undefined,
        checklist: []
    };

    if (repeatType === 'none') {
        dispatch({ type: 'ADD_TASK', payload: baseTask });
    } else {
        const tasksToCreate: Task[] = [baseTask];
        let limit = 0;
        let incrementFunction: (d: Date, i: number) => Date;

        if (repeatType === 'daily') {
            limit = 30; 
            incrementFunction = addDays;
        } else if (repeatType === 'weekly') {
            limit = 12;
            incrementFunction = addWeeks;
        } else if (repeatType === 'monthly') {
            limit = 12;
            incrementFunction = addMonths;
        } else {
            limit = 5;
            incrementFunction = addYears;
        }

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
    setTaskFile(null);
    setTaskImage(null);
    setSelectedNoteId('');
    setRepeatType('none');
  }

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setTaskImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  }

  const handleViewNote = (noteId: string) => {
      const note = state.notes.find(n => n.id === noteId);
      if (note) setViewingNote(note);
  }

  const handleOpenInNotesApp = (noteId: string) => {
      setViewingNote(null);
      setSelectedTask(null);
      navigate('/notes', { state: { openNoteId: noteId } });
  }

  // --- Checklist Logic ---
  const addChecklistItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTask || !newChecklistItem.trim()) return;

      const newItem: TaskChecklistItem = {
          id: `cli_${Date.now()}`,
          text: newChecklistItem,
          completed: false
      };
      
      const updatedChecklist = [...(selectedTask.checklist || []), newItem];
      dispatch({ 
          type: 'UPDATE_TASK_CHECKLIST', 
          payload: { taskId: selectedTask.id, checklist: updatedChecklist } 
      });
      setSelectedTask({...selectedTask, checklist: updatedChecklist});
      setNewChecklistItem('');
  };

  const toggleChecklistItem = (itemId: string) => {
      if (!selectedTask) return;
      const updatedChecklist = (selectedTask.checklist || []).map(item => 
          item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      dispatch({ 
          type: 'UPDATE_TASK_CHECKLIST', 
          payload: { taskId: selectedTask.id, checklist: updatedChecklist } 
      });
      setSelectedTask({...selectedTask, checklist: updatedChecklist});
  };

  const deleteChecklistItem = (itemId: string) => {
      if (!selectedTask) return;
      const updatedChecklist = (selectedTask.checklist || []).filter(item => item.id !== itemId);
      dispatch({ 
          type: 'UPDATE_TASK_CHECKLIST', 
          payload: { taskId: selectedTask.id, checklist: updatedChecklist } 
      });
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
                <span className="font-bold font-mono text-[10px] uppercase px-1.5 py-0.5 rounded text-white shadow-sm" style={{backgroundColor: getSkillColor(task.skillId)}}>
                    {state.skills.find(s => s.id === task.skillId)?.name}
                </span>
                <span className="text-rpg-warning font-mono text-[10px] px-1.5 border border-rpg-warning/30 rounded">+{task.xpReward} XP</span>
            </div>
            
            <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-rpg-text'}`}>
                {task.title}
            </div>

             {task.taskImage && (
                 <div className="h-20 w-full rounded bg-black overflow-hidden border border-rpg-border">
                     <img src={task.taskImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                 </div>
             )}

            <div className="flex justify-between items-center mt-auto pt-2 border-t border-rpg-border/50">
                 <div className="flex gap-2 text-gray-500">
                    {task.fileName && <Paperclip size={12}/>}
                    {(task.description || (task.checklist && task.checklist.length > 0)) && <StickyNote size={12}/>}
                    {task.linkedNoteId && <StickyNote size={12} className="text-rpg-secondary"/>}
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
          <div className="flex gap-1 bg-rpg-card rounded-lg p-1 border border-rpg-border">
              <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-2 hover:bg-rpg-border rounded-md text-gray-400 hover:text-rpg-text transition-colors"><ChevronLeft size={16}/></button>
              <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-2 hover:bg-rpg-border rounded-md text-gray-400 hover:text-rpg-text transition-colors"><ChevronRight size={16}/></button>
          </div>
      </div>

      {/* Week Grid - Responsive: Single Column on Mobile, 7 Columns on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1 h-full min-h-0 overflow-y-auto">
          {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = state.tasks.filter(t => t.date === dateKey && t.type === 'daily');
              const isToday = isSameDay(day, today);
              const isPast = isBefore(day, today);

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
                            <button 
                                onClick={() => { setQuickAddDate(dateKey); setModalOpen(true); }}
                                className="opacity-100 md:opacity-0 group-hover:opacity-100 p-1 hover:bg-rpg-border rounded text-gray-400 hover:text-rpg-text transition-all"
                            >
                                <Plus size={14}/>
                            </button>
                      </div>
                      <div className="flex-1 space-y-2">
                          {dayTasks.map(task => <TaskCard key={task.id} task={task} compact />)}
                      </div>
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
                      {state.tasks.filter(t => t.date === format(focusDay, 'yyyy-MM-dd') && t.type === 'daily').map(task => (
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
                             <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Навык</label>
                             <select className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-rpg-text focus:border-rpg-primary outline-none" value={taskSkill} onChange={e => setTaskSkill(e.target.value)} required>
                                 <option value="">Выбрать...</option>
                                 {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
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

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                         <div>
                            <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Прикрепить Изображение</label>
                            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload}/>
                            <button type="button" onClick={() => imageInputRef.current?.click()} className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-sm text-gray-400 hover:text-rpg-text flex items-center justify-center gap-2">
                                <ImageIcon size={16}/> {taskImage ? 'Изменить' : 'Выбрать'}
                            </button>
                         </div>
                         <div>
                            <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Связать заметку</label>
                            <select className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-sm text-rpg-text focus:border-rpg-primary outline-none" value={selectedNoteId} onChange={e => setSelectedNoteId(e.target.value)}>
                                 <option value="">Нет</option>
                                 {state.notes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                             </select>
                         </div>
                     </div>
                     
                     <div>
                        <label className="text-xs font-mono uppercase text-gray-500 mb-1 block">Прикрепить файл</label>
                        <input type="file" className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-rpg-card file:text-rpg-text hover:file:bg-rpg-border" 
                            onChange={(e) => setTaskFile(e.target.files?.[0]?.name || null)}
                        />
                     </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-8">
                     <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                     <button type="submit" className="px-6 py-2 bg-rpg-primary text-rpg-bg text-sm font-bold rounded hover:opacity-90">Создать</button>
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
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-white uppercase tracking-wider shadow-sm" style={{backgroundColor: getSkillColor(selectedTask.skillId)}}>{state.skills.find(s => s.id === selectedTask.skillId)?.name}</span>
                                  <span className="px-2 py-0.5 rounded border border-rpg-warning text-rpg-warning text-[10px] font-mono font-bold">+{selectedTask.xpReward} XP</span>
                              </div>
                              <h2 className="text-2xl font-bold text-rpg-text leading-tight">{selectedTask.title}</h2>
                          </div>
                          <button onClick={() => setSelectedTask(null)}><X className="text-gray-500 hover:text-rpg-text" /></button>
                      </div>
                  </div>

                  <div className="p-6 pt-0 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                      {selectedTask.description && (
                          <p className="text-gray-500 whitespace-pre-wrap text-sm leading-relaxed">{selectedTask.description}</p>
                      )}
                      
                      {selectedTask.taskImage && (
                          <div className="rounded border border-rpg-border overflow-hidden">
                              <img src={selectedTask.taskImage} className="w-full max-h-64 object-cover" />
                          </div>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTask.fileName && (
                              <div className="p-3 bg-rpg-card rounded border border-rpg-border flex items-center gap-2 text-sm text-gray-500">
                                  <Paperclip size={16} className="text-rpg-primary"/> <span className="truncate">{selectedTask.fileName}</span>
                              </div>
                          )}
                          {selectedTask.linkedNoteId && (
                              <div 
                                onClick={() => handleViewNote(selectedTask.linkedNoteId!)}
                                className="p-3 bg-rpg-card rounded border border-rpg-border flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:border-rpg-secondary hover:text-rpg-text transition-colors"
                              >
                                  <StickyNote size={16} className="text-rpg-warning"/> 
                                  <span className="truncate">{state.notes.find(n => n.id === selectedTask.linkedNoteId)?.title || 'Linked Note'}</span>
                              </div>
                          )}
                      </div>
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
    </div>
  );
};

export default WeeklyCalendar;