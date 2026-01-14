import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { StickyNote, Plus, Trash2, Search, Calendar, X, ExternalLink, CheckCircle, Check, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { Note } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

const Notes: React.FC = () => {
  const { state, dispatch } = useGame();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal Editing State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  
  // Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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
          images: [],
          createdAt: new Date().toISOString() 
      };
      dispatch({type: 'ADD_NOTE', payload: newNote});
      openModal(newNote);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation(); 
      if(window.confirm('Удалить заметку навсегда?')) {
          dispatch({type: 'DELETE_NOTE', payload: id});
          if (selectedNote?.id === id) {
              setSelectedNote(null);
          }
      }
  };

  const openModal = (note: Note) => {
      setSelectedNote(note);
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditImages(note.images || []);
  };

  const closeModal = () => {
      if (!selectedNote) return;

      const exists = state.notes.find(n => n.id === selectedNote.id);
      
      if (exists) {
          dispatch({
              type: 'UPDATE_NOTE', 
              payload: { id: selectedNote.id, title: editTitle, content: editContent, images: editImages }
          });
      }
      setSelectedNote(null);
  };
  
  const handleUpdate = (title: string, content: string, images: string[]) => {
      setEditTitle(title);
      setEditContent(content);
      setEditImages(images);
      
      if (selectedNote && state.notes.some(n => n.id === selectedNote.id)) {
          dispatch({
              type: 'UPDATE_NOTE', 
              payload: { id: selectedNote.id, title, content, images }
          });
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach((file: File) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64 = reader.result as string;
                  setEditImages(prev => {
                      const newImgs = [...prev, base64];
                      handleUpdate(editTitle, editContent, newImgs);
                      return newImgs;
                  });
              };
              reader.readAsDataURL(file);
          });
      }
  };

  const removeImage = (index: number) => {
      const newImages = editImages.filter((_, i) => i !== index);
      handleUpdate(editTitle, editContent, newImages);
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
                <StickyNote className="text-white"/> Заметки
            </h2>
            <div className="flex gap-4 w-full md:w-auto">
                 <div className="relative flex-1 md:flex-none">
                    <Search size={16} className="absolute left-3 top-3 text-gray-500"/>
                    <input 
                        className="bg-rpg-card border border-rpg-border rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-white outline-none transition-colors w-full md:w-64"
                        placeholder="Поиск заметок..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button onClick={handleCreate} className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 transition-colors shrink-0">
                    <Plus size={18}/> <span className="hidden md:inline">Создать</span>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10">
            {/* Create Card */}
            <button 
                onClick={handleCreate}
                className="bg-rpg-panel border-2 border-dashed border-rpg-border rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white hover:bg-rpg-card transition-all min-h-[150px] group"
            >
                <div className="w-12 h-12 rounded-full bg-rpg-card group-hover:bg-white group-hover:text-black flex items-center justify-center mb-3 transition-colors">
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
                        className="bg-rpg-panel border border-rpg-border rounded-xl p-6 cursor-pointer hover:border-white hover:shadow-lg hover:-translate-y-1 transition-all group relative flex flex-col min-h-[150px]"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-white text-lg truncate pr-8">{note.title || 'Без названия'}</h4>
                            {isLinked && <div className="w-2 h-2 rounded-full bg-rpg-secondary absolute top-6 right-12" title="Привязана к задаче"></div>}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-4 whitespace-pre-wrap mb-4 flex-1">
                            {note.content || <span className="italic opacity-50">Нет текста...</span>}
                        </p>
                        
                        {/* Image Preview in Card */}
                        {note.images && note.images.length > 0 && (
                            <div className="mb-4 flex gap-1 overflow-hidden h-12 rounded opacity-80">
                                {note.images.slice(0, 3).map((img, i) => (
                                    <img key={i} src={img} className="h-full w-auto object-cover"/>
                                ))}
                                {note.images.length > 3 && (
                                    <div className="h-full w-12 bg-gray-800 flex items-center justify-center text-xs text-gray-500">+{note.images.length - 3}</div>
                                )}
                            </div>
                        )}

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
                            className="bg-transparent text-xl font-bold text-white outline-none flex-1 mr-4 placeholder-gray-600 focus:text-white transition-colors"
                            value={editTitle}
                            onChange={(e) => handleUpdate(e.target.value, editContent, editImages)}
                            placeholder="Заголовок..."
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                multiple
                                onChange={handleImageUpload} 
                             />
                             <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center gap-1"
                                title="Прикрепить фото"
                             >
                                 <ImageIcon size={20}/>
                             </button>

                             <button 
                                onClick={(e) => handleDelete(selectedNote.id, e)} 
                                className="text-red-400 hover:text-white hover:bg-red-500/20 p-2 rounded-full transition-colors"
                                title="Удалить"
                            >
                                 <Trash2 size={20}/>
                             </button>
                             <div className="w-px h-6 bg-rpg-border mx-2"></div>
                             
                             <button 
                                onClick={closeModal} 
                                className="text-white hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors flex items-center gap-1"
                                title="Готово"
                             >
                                 <Check size={24}/>
                             </button>

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
                            <div className="flex items-center gap-2 text-xs text-white font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                Перейти <ExternalLink size={14}/>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex-1 bg-rpg-bg p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        <textarea 
                            className="w-full bg-transparent text-gray-200 text-base leading-relaxed resize-none outline-none placeholder-gray-700 font-sans min-h-[200px]"
                            value={editContent}
                            onChange={(e) => handleUpdate(editTitle, e.target.value, editImages)}
                            placeholder="Начните писать здесь..."
                        />
                        
                        {/* Image Grid */}
                        {editImages.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-800">
                                {editImages.map((img, index) => (
                                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-700 bg-black/50 aspect-video">
                                        <img 
                                            src={img} 
                                            className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-300"
                                            onClick={() => setZoomedImage(img)}
                                        />
                                        <button 
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                        >
                                            <X size={14}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Lightbox / Zoom View */}
        {zoomedImage && (
            <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
                <div className="relative max-w-full max-h-full">
                    <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"/>
                    <button 
                        onClick={() => setZoomedImage(null)}
                        className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-white hover:text-black transition-colors"
                    >
                        <X size={32}/>
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default Notes;