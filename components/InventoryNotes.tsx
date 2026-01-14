import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trash2, Plus, StickyNote, CheckSquare, X, Calendar, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { Note } from '../types';

const InventoryNotes: React.FC = () => {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<'inventory' | 'notes'>('inventory');
  
  // Inputs
  const [invText, setInvText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Modal State
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const addInventory = (e: React.FormEvent) => {
      e.preventDefault();
      if(!invText) return;
      dispatch({ type: 'ADD_INVENTORY', payload: { id: `inv_${Date.now()}`, text: invText, checked: false } });
      setInvText('');
  };

  const addNote = (e: React.FormEvent) => {
      e.preventDefault();
      if(!noteTitle) return;
      dispatch({ type: 'ADD_NOTE', payload: { id: `note_${Date.now()}`, title: noteTitle, content: noteContent, createdAt: new Date().toISOString() } });
      setNoteTitle('');
      setNoteContent('');
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
      // Prevent opening the modal when clicking delete
      console.log('--- ACTION: Attempting to delete note (Inventory View):', id);
      if (e) {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
      }
      
      if(window.confirm('Вы уверены, что хотите удалить эту заметку?')) {
          console.log('--- ACTION CONFIRMED: Deleting note:', id);
          dispatch({ type: 'DELETE_NOTE', payload: id });
          setSelectedNote(null); // Close modal if open
      } else {
          console.log('--- ACTION CANCELLED: Note deletion cancelled by user');
      }
  };

  return (
    <div className="h-full flex flex-col">
        <div className="flex border-b border-gray-700 mb-4">
            <button 
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-2 font-mono text-sm flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'text-rpg-primary border-b-2 border-rpg-primary' : 'text-gray-400 hover:text-white'}`}
            >
                <CheckSquare size={16}/> Инвентарь
            </button>
            <button 
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-2 font-mono text-sm flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'text-rpg-secondary border-b-2 border-rpg-secondary' : 'text-gray-400 hover:text-white'}`}
            >
                <StickyNote size={16}/> Заметки
            </button>
        </div>

        <div className="flex-1 overflow-auto space-y-4 custom-scrollbar pr-1">
            {activeTab === 'inventory' ? (
                <>
                    <form onSubmit={addInventory} className="flex gap-2">
                        <input 
                            className="flex-1 bg-rpg-panel border border-gray-700 rounded p-2 text-sm text-white focus:border-rpg-primary outline-none" 
                            placeholder="Взять с собой..."
                            value={invText}
                            onChange={(e) => setInvText(e.target.value)}
                        />
                        <button type="submit" className="bg-rpg-primary text-black p-2 rounded hover:bg-cyan-300"><Plus size={18}/></button>
                    </form>
                    <div className="space-y-1">
                        {state.inventory.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-800/30 rounded group hover:bg-gray-800/60 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={item.checked} 
                                    onChange={() => dispatch({type: 'TOGGLE_INVENTORY', payload: item.id})}
                                    className="accent-rpg-primary w-4 h-4 cursor-pointer"
                                />
                                <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-500' : 'text-white'}`}>{item.text}</span>
                                <button onClick={() => dispatch({type: 'DELETE_INVENTORY', payload: item.id})} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                     <form onSubmit={addNote} className="space-y-2 bg-gray-800/30 p-3 rounded border border-gray-700">
                        <input 
                            className="w-full bg-transparent border-b border-gray-700 p-1 text-sm text-white focus:border-rpg-secondary outline-none font-bold" 
                            placeholder="Заголовок"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                        />
                        <textarea 
                            className="w-full bg-transparent p-1 text-sm text-gray-300 focus:outline-none resize-none h-16"
                            placeholder="Текст заметки..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                        />
                        <button type="submit" className="w-full bg-rpg-secondary/20 text-rpg-secondary py-1 text-xs uppercase font-bold hover:bg-rpg-secondary/40 rounded transition-colors">Сохранить</button>
                    </form>
                    <div className="space-y-3 pb-4">
                         {state.notes.map(note => (
                             <div 
                                key={note.id} 
                                onClick={() => setSelectedNote(note)}
                                className="bg-yellow-100/10 border-l-4 border-yellow-500 p-3 rounded relative group cursor-pointer hover:bg-yellow-100/20 transition-all active:scale-[0.98]"
                             >
                                 <div className="pr-6">
                                     <h4 className="font-bold text-white text-sm truncate">{note.title}</h4>
                                     <p className="text-xs text-gray-400 mt-1 line-clamp-2">{note.content}</p>
                                     <div className="mt-2 text-[10px] text-gray-600 font-mono flex items-center gap-1">
                                        <Calendar size={10}/> {format(new Date(note.createdAt), 'dd.MM HH:mm')}
                                     </div>
                                 </div>
                                 
                                 {/* Delete Button directly on card */}
                                 <button 
                                    type="button"
                                    onClick={(e) => handleDeleteNote(note.id, e)}
                                    className="absolute top-2 right-2 text-gray-500 hover:text-red-400 z-10 p-1.5 rounded-full hover:bg-black/40 transition-colors"
                                    title="Удалить"
                                 >
                                     <Trash2 size={14}/>
                                 </button>
                             </div>
                         ))}
                    </div>
                </>
            )}
        </div>

        {/* Modal for Note Details (Similar to Task Details) */}
        {selectedNote && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedNote(null)}>
                <div className="bg-rpg-panel w-full max-w-lg rounded-lg border border-rpg-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="p-4 border-b border-rpg-border flex justify-between items-center bg-rpg-card">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <StickyNote size={18} className="text-rpg-secondary shrink-0"/>
                            <h3 className="font-bold text-lg text-white truncate">{selectedNote.title}</h3>
                        </div>
                        <button onClick={() => setSelectedNote(null)} className="text-gray-500 hover:text-white p-1 hover:bg-white/10 rounded transition-colors"><X size={20}/></button>
                    </div>
                    
                    {/* Modal Content */}
                    <div className="p-6 overflow-y-auto flex-1 bg-rpg-bg">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mb-6 pb-2 border-b border-gray-800">
                            <Calendar size={12}/> Создано: {format(new Date(selectedNote.createdAt), 'dd MMMM yyyy, HH:mm')}
                        </div>
                        <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm font-sans">
                            {selectedNote.content}
                        </p>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-rpg-border bg-rpg-card flex justify-between items-center">
                        <span className="text-xs text-gray-500">ID: {selectedNote.id}</span>
                        <button 
                            onClick={(e) => handleDeleteNote(selectedNote.id, e)} 
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded text-sm font-bold transition-colors border border-transparent hover:border-red-500/30"
                        >
                            <Trash2 size={16}/> Удалить заметку
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default InventoryNotes;