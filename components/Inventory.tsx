import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Backpack, Plus, Trash2, CheckSquare } from 'lucide-react';

const Inventory: React.FC = () => {
  const { state, dispatch } = useGame();
  const [text, setText] = useState('');

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if(!text) return;
      dispatch({type: 'ADD_INVENTORY', payload: { id: `item_${Date.now()}`, text, checked: false }});
      setText('');
  }

  return (
    <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-rpg-card border border-rpg-border rounded-lg text-white"><Backpack size={24}/></div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Ресурсы & Инвентарь</h2>
            </div>
        </div>

        <form onSubmit={handleAdd} className="mb-8 relative">
            <input 
                className="w-full bg-rpg-card border border-rpg-border rounded-lg p-4 text-white pl-4 pr-14 focus:border-rpg-primary outline-none transition-colors"
                placeholder="Добавить предмет..."
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-white text-black hover:bg-gray-200 rounded px-3 flex items-center justify-center transition-colors">
                <Plus size={20}/>
            </button>
        </form>

        <div className="space-y-2">
            {state.inventory.length === 0 && (
                <div className="text-center py-20 border border-dashed border-rpg-border rounded-lg">
                    <p className="text-gray-500 font-mono text-sm">Инвентарь пуст</p>
                </div>
            )}
            {state.inventory.map(item => (
                <div key={item.id} className="bg-rpg-panel px-4 py-3 rounded-lg border border-rpg-border flex items-center gap-4 group hover:border-rpg-border/80 transition-colors">
                    <button 
                        onClick={() => dispatch({type: 'TOGGLE_INVENTORY', payload: item.id})}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-rpg-success border-rpg-success text-black' : 'border-gray-600 hover:border-white'}`}
                    >
                        {item.checked && <CheckSquare size={14}/>}
                    </button>
                    <span className={`flex-1 font-medium text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                        {item.text}
                    </span>
                    <button onClick={() => dispatch({type: 'DELETE_INVENTORY', payload: item.id})} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16}/>
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};

export default Inventory;