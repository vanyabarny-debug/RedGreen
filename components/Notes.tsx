import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { StickyNote, Plus, Trash2, Search, Calendar, X, ExternalLink, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Note } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

const Notes: React.FC = () => {
  const { state, dispatch } = useGame();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Modal Editing State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Handle auto-open from navigation
  useEffect(() => {
      if (location.state?.openNoteId) {
          const noteToOpen = state.notes.find(n => n.id === location.state.openNoteId);
          if (noteToOpen) {
              openModal(noteToOpen);
          }
          window.history.replaceState({}, document.title);
      }
  }, [location.state, state.notes]);

  const filteredNotes = state.notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = () => {
      const id = `note_${Date.now()}`;
      const newNote: Note = { 
          id, 
          title: '', 
          content: '', 
          createdAt: new Date().toISOString() 
      };
      dispatch({type: 'ADD_NOTE', payload: newNote});
      openModal(newNote);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation(); // Standard practice: don't click the card underneath
      console.log('--- ACTION: Attempting to delete note (Main Notes View):', id);

      if(window.confirm('Удалить заметку навсегда?')) {
          console.log('--- ACTION CONFIRMED: Deleting note:', id);
          dispatch({type: 'DELETE_NOTE', payload: id});
          if (selectedNote?.id === id) {
              setSelectedNote(null);
          }
      } else {
          console.log('--- ACTION CANCELLED: Note deletion cancelled by user');
      }
  };

  const openModal = (note: Note) => {
      setSelectedNote(note);
      setEditTitle(note.title);
      setEditContent(note.content);
  };

  const closeModal = () => {
      if (!selectedNote) return;

      const exists = state.notes.find(n => n.id === selectedNote.id);
      
      if (exists) {
          dispatch({
              type: 'UPDATE_NOTE', 
              payload: { id: selectedNote.id, title: editTitle, content: editContent }
          });
      }
      setSelectedNote(null);
  };
  
  const handleUpdate = (title: string, content: string) => {
      setEditTitle(title);
      setEditContent(content);
      // Live save
      if (selectedNote && state.notes.some(n => n.id === selectedNote.id)) {
          dispatch({
              type: 'UPDATE_NOTE', 
              payload: { id: selectedNote.id, title, content }
          });
      }
  };

  const linkedTask = selectedNote ? state.tasks.find(t => t.linkedNoteId === selectedNote.id) : null;
  const linkedSkill = linkedTask ? state.skills.find(s => s.id === linkedTask.skillId) : null;

  const goToTask = () => {
      if (linkedTask) {
          closeModal();
          navigate('/', { state: { openTaskId: linkedTask.id } });
      }
  };

  return (
    <div className="h-full flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                <StickyNote className="text-rpg-secondary"/> Заметки
            </h2>
            <div className="flex gap-4 w-full md:w-auto">
                 <div className="relative flex-1 md:flex-none">
                    <Search size={16} className="absolute left-3 top-3 text-gray-500"/>
                    <input 
                        className="bg-rpg-card border border-rpg-border rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-rpg-primary outline-none transition-colors w-full md:w-64"
                        placeholder="Поиск заметок..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button onClick={handleCreate} className="bg-rpg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-white flex items-center gap-2 transition-colors shrink-0">
                    <Plus size={18}/> <span className="hidden md:inline">Создать</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10">
            {/* Create Card */}
            <button 
                onClick={handleCreate}
                className="bg-rpg-panel border-2 border-dashed border-rpg-border rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-rpg-primary hover:border-rpg-primary hover:bg-rpg-card transition-all min-h-[150px] group"
            >
                <div className="w-12 h-12 rounded-full bg-rpg-card group-hover:bg-rpg-primary group-hover:text-black flex items-center justify-center mb-3 transition-colors">
                    <Plus size={24}/>
                </div>
                <span className="font-bold">Новая заметка</span>
            </button>

            {filteredNotes.map(note => {
                const isLinked = state.tasks.some(t => t.linkedNoteId === note.id);
                return (
                    <div 
                        key={note.id} 
                        onClick={() => openModal(note)}
                        className="bg-rpg-panel border border-rpg-border rounded-xl p-6 cursor-pointer hover:border-rpg-secondary hover:shadow-lg hover:-translate-y-1 transition-all group relative flex flex-col min-h-[150px]"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-white text-lg truncate pr-8">{note.title || 'Без названия'}</h4>
                            {isLinked && <div className="w-2 h-2 rounded-full bg-rpg-secondary absolute top-6 right-12" title="Привязана к задаче"></div>}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-4 whitespace-pre-wrap mb-4 flex-1">
                            {note.content || <span className="italic opacity-50">Нет текста...</span>}
                        </p>
                        <div className="flex justify-between items-end border-t border-rpg-border pt-4 mt-auto">
                            <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                <Calendar size={12}/> {format(new Date(note.createdAt), 'dd MMM yyyy')}
                            </div>
                        </div>
                        
                        <div 
                            className="absolute top-4 right-4 z-20"
                            onClick={(e) => handleDelete(note.id, e)}
                        >
                            <button 
                                className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Удалить"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Note Detail Modal */}
        {selectedNote && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeModal}>
                <div className="bg-rpg-panel w-full max-w-4xl h-[85vh] rounded-xl border border-rpg-border shadow-2xl overflow-hidden flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                    {/* Toolbar */}
                    <div className="h-16 border-b border-rpg-border bg-rpg-card flex items-center justify-between px-4 md:px-6 shrink-0">
                         <input 
                            className="bg-transparent text-xl font-bold text-white outline-none flex-1 mr-4 placeholder-gray-600 focus:text-rpg-secondary transition-colors"
                            value={editTitle}
                            onChange={(e) => handleUpdate(e.target.value, editContent)}
                            placeholder="Заголовок..."
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                             <div className="text-xs text-gray-500 font-mono px-4 py-1.5 bg-black/20 rounded border border-rpg-border mr-2 hidden md:block">
                                 {editContent.length} симв.
                             </div>
                             <button 
                                onClick={(e) => handleDelete(selectedNote.id, e)} 
                                className="text-red-400 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded transition-colors flex items-center gap-2 text-sm font-bold"
                            >
                                 <Trash2 size={16}/> <span className="hidden md:inline">Удалить</span>
                             </button>
                             <div className="w-px h-6 bg-rpg-border mx-2"></div>
                             <button onClick={closeModal} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                                 <X size={24}/>
                             </button>
                        </div>
                    </div>

                    {/* Linked Task Banner */}
                    {linkedTask && (
                        <div 
                            className="bg-gray-900/50 border-b border-rpg-border px-6 py-3 flex items-center justify-between cursor-pointer group hover:bg-gray-800 transition-colors"
                            onClick={goToTask}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="text-xs font-mono uppercase px-2 py-0.5 rounded text-white shadow-sm shrink-0" style={{backgroundColor: linkedSkill?.color || '#666'}}>
                                    {linkedSkill?.name || 'Skill'}
                                </div>
                                <span className="text-sm font-bold text-gray-300 truncate group-hover:text-white flex items-center gap-2">
                                    {linkedTask.title}
                                    {linkedTask.completed && <CheckCircle size={14} className="text-rpg-success"/>}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-rpg-primary font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                Перейти <ExternalLink size={14}/>
                            </div>
                        </div>
                    )}

                    {/* Editor */}
                    <div className="flex-1 bg-rpg-bg p-4 md:p-8 overflow-hidden relative">
                        <textarea 
                            className="w-full h-full bg-transparent text-gray-200 text-base leading-relaxed resize-none outline-none custom-scrollbar placeholder-gray-700 font-sans"
                            value={editContent}
                            onChange={(e) => handleUpdate(editTitle, e.target.value)}
                            placeholder="Начните писать здесь..."
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Notes;