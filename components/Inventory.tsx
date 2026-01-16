import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Backpack, Plus, Trash2, CheckSquare, Edit2, ArrowLeft, ExternalLink, Link as LinkIcon, FolderOpen, MoreVertical, Search, X } from 'lucide-react';
import { InventoryList, InventoryItem } from '../types';
import { useLocation } from 'react-router-dom';

const Inventory: React.FC = () => {
  const { state, dispatch } = useGame();
  const location = useLocation();
  
  // View State
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  // Create List Form (Modal now)
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Inside List State
  const [newItemText, setNewItemText] = useState('');
  const [editingListName, setEditingListName] = useState(false);
  const [tempListName, setTempListName] = useState('');

  // Auto-open from navigation
  useEffect(() => {
      if (location.state?.openListId) {
          const list = state.inventory.find(l => l.id === location.state.openListId);
          if (list) setActiveListId(list.id);
          window.history.replaceState({}, document.title);
      }
  }, [location.state, state.inventory]);

  const activeList = activeListId ? state.inventory.find(l => l.id === activeListId) : null;

  // Handle case where active list is deleted or not found
  useEffect(() => {
      if (activeListId && !activeList) {
          setActiveListId(null);
      }
  }, [activeListId, activeList]);

  const getFaviconUrl = (url: string) => {
      try {
          const domain = new URL(url).hostname;
          return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch (e) {
          return '';
      }
  };

  const getYouTubeId = (url: string) => {
      const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[1].length >= 11) ? match[1] : null;
  };

  const isImageUrl = (url: string) => {
      return /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(url);
  };

  const handleCreateList = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newListName.trim()) return;
      
      const newList: InventoryList = {
          id: `list_${Date.now()}`,
          title: newListName,
          items: []
      };
      
      dispatch({ type: 'ADD_INVENTORY_LIST', payload: newList });
      setNewListName('');
      setIsCreatingList(false);
  };

  const handleDeleteList = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm('Удалить этот рюкзак и все его содержимое?')) {
          dispatch({ type: 'DELETE_INVENTORY_LIST', payload: id });
          if (activeListId === id) setActiveListId(null);
      }
  };

  const handleAddItem = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newItemText.trim() || !activeListId) return;

      const isLink = newItemText.startsWith('http://') || newItemText.startsWith('https://');

      const newItem: InventoryItem = {
          id: `item_${Date.now()}`,
          text: newItemText,
          checked: false,
          type: isLink ? 'link' : 'text'
      };

      dispatch({ type: 'ADD_INVENTORY_ITEM', payload: { listId: activeListId, item: newItem } });
      setNewItemText('');
  };

  const handleRenameList = () => {
      if(activeListId && tempListName.trim()) {
          dispatch({ type: 'UPDATE_INVENTORY_LIST_NAME', payload: { id: activeListId, name: tempListName } });
          setEditingListName(false);
      }
  };

  const renderLinkContent = (url: string) => {
      const youtubeId = getYouTubeId(url);
      
      if (youtubeId) {
          return (
              <div className="w-full mt-1">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-black mb-2 shadow-sm border border-gray-800 relative group-hover:border-gray-600 transition-colors">
                      <iframe 
                          width="100%" 
                          height="100%" 
                          src={`https://www.youtube.com/embed/${youtubeId}`} 
                          title="YouTube video player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                      ></iframe>
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      <ExternalLink size={10}/> {url}
                  </a>
              </div>
          );
      }

      if (isImageUrl(url)) {
          return (
              <div className="w-full mt-1">
                  <div className="rounded-lg overflow-hidden border border-gray-800 bg-black/20 max-h-64 flex justify-center mb-2 group-hover:border-gray-600 transition-colors">
                      <img src={url} alt="Preview" className="max-h-64 object-contain" />
                  </div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      <ExternalLink size={10}/> {url}
                  </a>
              </div>
          );
      }

      let domain = '';
      try { domain = new URL(url).hostname; } catch(e) {}

      return (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-gray-900/50 hover:bg-gray-800 border border-gray-700 rounded-lg p-3 w-full transition-colors group mt-1"
          >
              <div className="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700 overflow-hidden">
                  <img src={getFaviconUrl(url)} className="w-6 h-6 rounded-sm opacity-80" alt=""/>
              </div>
              <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-blue-400 truncate group-hover:underline">{url}</div>
                  <div className="text-xs text-gray-500 font-mono">{domain}</div>
              </div>
              <ExternalLink size={16} className="text-gray-500 group-hover:text-white transition-colors"/>
          </a>
      );
  };

  return (
    <div className="h-full flex flex-col">
        {!activeListId ? (
            // === MAIN VIEW: GRID OF BACKPACKS ===
            <>
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <Backpack className="text-white"/> Склад
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10">
                    {/* CREATE CARD */}
                    <button 
                        onClick={() => setIsCreatingList(true)}
                        className="bg-rpg-panel border-2 border-dashed border-rpg-border rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white hover:bg-rpg-card transition-all min-h-[150px] group"
                    >
                        <div className="w-12 h-12 rounded-full bg-rpg-card group-hover:bg-white group-hover:text-black flex items-center justify-center mb-3 transition-colors">
                            <Plus size={24}/>
                        </div>
                        <span className="font-bold text-sm">Новый рюкзак</span>
                    </button>

                    {/* BACKPACK CARDS */}
                    {state.inventory.map(list => (
                        <div 
                            key={list.id} 
                            onClick={() => setActiveListId(list.id)}
                            className="bg-rpg-panel border border-rpg-border hover:border-white hover:shadow-lg rounded-xl p-6 cursor-pointer transition-all group relative flex flex-col min-h-[150px]"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-rpg-card rounded-lg text-white border border-rpg-border group-hover:border-white transition-colors">
                                    <Backpack size={20}/>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteList(list.id, e)} 
                                    className="text-gray-600 hover:text-red-500 p-1.5 rounded-full hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white truncate mb-2">{list.title}</h3>
                            
                            {/* Content Preview */}
                            <div className="flex-1 overflow-hidden space-y-1 mb-2">
                                {list.items.slice(0, 3).map(item => (
                                    <div key={item.id} className="text-xs text-gray-400 truncate flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.checked ? 'bg-gray-700' : 'bg-rpg-primary'}`}></div>
                                        <span className={item.checked ? 'line-through opacity-50' : ''}>{item.text}</span>
                                    </div>
                                ))}
                                {list.items.length === 0 && <span className="text-xs text-gray-600 italic">Пусто</span>}
                                {list.items.length > 3 && <span className="text-xs text-gray-500 italic pl-3">...и еще {list.items.length - 3}</span>}
                            </div>

                            <div className="text-xs text-gray-500 font-mono border-t border-rpg-border pt-3 flex justify-between items-center mt-auto">
                                <span>Предметов:</span>
                                <span className="text-white font-bold">{list.items.length}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            // === DETAIL VIEW: INSIDE BACKPACK ===
            activeList && (
                <div className="flex flex-col flex-1 min-h-0 bg-rpg-panel border border-rpg-border rounded-xl overflow-hidden animate-fade-in h-full">
                    {/* Backpack Header */}
                    <div className="p-4 border-b border-rpg-border bg-rpg-card flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setActiveListId(null)} className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                                <ArrowLeft size={20}/>
                            </button>
                            {editingListName ? (
                                <input 
                                    autoFocus
                                    className="bg-transparent border-b border-white text-xl font-bold text-white outline-none w-full"
                                    value={tempListName}
                                    onChange={e => setTempListName(e.target.value)}
                                    onBlur={handleRenameList}
                                    onKeyDown={e => e.key === 'Enter' && handleRenameList()}
                                />
                            ) : (
                                <h3 
                                    onClick={() => { setTempListName(activeList.title); setEditingListName(true); }}
                                    className="text-xl font-bold text-white cursor-pointer hover:underline decoration-dashed decoration-gray-500 flex items-center gap-2"
                                >
                                    <Backpack className="text-white" size={24}/>
                                    {activeList.title} <Edit2 size={14} className="text-gray-600"/>
                                </h3>
                            )}
                        </div>
                        <button onClick={(e) => handleDeleteList(activeList.id, e)} className="text-gray-500 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeList.items.length === 0 && (
                            <div className="text-center text-gray-500 mt-10 italic">
                                Рюкзак пуст. Добавьте что-нибудь полезное.
                            </div>
                        )}
                        
                        {activeList.items.map(item => (
                            <div key={item.id} className="flex items-start gap-3 p-3 bg-rpg-bg border border-rpg-border rounded-lg group hover:border-gray-600 transition-colors">
                                {item.type === 'link' ? (
                                    <div className="flex-1 min-w-0">
                                        {renderLinkContent(item.text)}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 flex-1">
                                        <button 
                                            onClick={() => dispatch({ type: 'TOGGLE_INVENTORY_ITEM', payload: { listId: activeList.id, itemId: item.id } })}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${item.checked ? 'bg-green-500 border-green-500 text-black' : 'border-gray-500 hover:border-white'}`}
                                        >
                                            {item.checked && <CheckSquare size={14}/>}
                                        </button>
                                        <span className={`flex-1 text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-white'}`}>
                                            {item.text}
                                        </span>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={() => dispatch({ type: 'DELETE_INVENTORY_ITEM', payload: { listId: activeList.id, itemId: item.id } })}
                                    className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 self-start"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add Item Form */}
                    <form onSubmit={handleAddItem} className="p-4 border-t border-rpg-border bg-rpg-card relative">
                        <input 
                            className="w-full bg-rpg-bg border border-rpg-border rounded-lg p-3 pr-12 text-white outline-none focus:border-white transition-colors"
                            placeholder="Добавить предмет или ссылку..."
                            value={newItemText}
                            onChange={e => setNewItemText(e.target.value)}
                        />
                        <button type="submit" className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:scale-110 p-1">
                            <Plus size={24}/>
                        </button>
                    </form>
                </div>
            )
        )}

        {/* Create Modal */}
        {isCreatingList && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                <form onSubmit={handleCreateList} className="bg-rpg-panel w-full max-w-sm p-6 rounded-lg border border-white shadow-2xl animate-fade-in">
                    <h3 className="text-lg font-bold text-white mb-4">Создать Рюкзак</h3>
                    <input 
                        autoFocus
                        className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-white outline-none mb-4"
                        placeholder="Название (напр. Аптечка)"
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsCreatingList(false)} className="text-gray-500 hover:text-white px-4 py-2 text-sm">Отмена</button>
                        <button type="submit" className="bg-white text-black px-6 py-2 rounded font-bold text-sm hover:bg-gray-200">Создать</button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default Inventory;