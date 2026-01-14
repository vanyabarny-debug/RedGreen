import React, { useState } from 'react';
import { useGame, THEME_COLORS } from '../context/GameContext';
import { ShoppingBag, MessageSquare, Palette, Check } from 'lucide-react';
import { playSound } from '../utils/audio';

const Shop: React.FC = () => {
  const { state, dispatch } = useGame();
  const { user, shopItems } = state;
  const [activeTab, setActiveTab] = useState<'style' | 'theme'>('theme');

  if (!user) return null;

  const filteredItems = shopItems.filter(i => i.category === activeTab);

  const handleEquip = (item: any) => {
    dispatch({ type: 'EQUIP_ITEM', payload: { category: item.category, value: item.value } });
    playSound('click');
  };

  const isEquipped = (item: any) => {
      if (item.category === 'style') return user.communicationStyle === item.value;
      if (item.category === 'theme') return user.themeId === item.value;
      return false;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8">
           <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
               <ShoppingBag className="text-rpg-primary"/> Магазин
           </h2>
      </header>

      <div className="flex gap-4 mb-6 border-b border-slate-700 pb-1">
          <button 
            onClick={() => setActiveTab('theme')}
            className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'theme' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <Palette size={18}/> Темы
               {activeTab === 'theme' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rpg-primary rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('style')}
            className={`pb-3 px-2 font-medium flex items-center gap-2 transition-colors relative ${activeTab === 'style' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
              <MessageSquare size={18}/> Стиль Общения
              {activeTab === 'style' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rpg-primary rounded-t-full"></div>}
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map(item => (
              <div key={item.id} className="bg-rpg-panel border border-slate-700 p-6 rounded-2xl flex flex-col justify-between hover:border-rpg-primary transition-all group">
                  <div className="mb-6">
                      <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-white flex items-center gap-3">
                              {item.category === 'theme' && (
                                  <div 
                                    className="w-6 h-6 rounded-full border border-white shadow-sm" 
                                    style={{ backgroundColor: THEME_COLORS[item.value] || '#fff' }}
                                  ></div>
                              )}
                              {item.name}
                          </h3>
                          {isEquipped(item) && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">Активно</span>}
                      </div>
                      <p className="text-gray-400 text-sm h-10">{item.description}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleEquip(item)}
                    disabled={isEquipped(item)}
                    className={`w-full py-3 rounded-xl font-bold transition-colors ${isEquipped(item) ? 'bg-slate-700 text-gray-500 cursor-default' : 'bg-white text-black hover:bg-gray-200'}`}
                  >
                      {isEquipped(item) ? 'Выбрано' : 'Выбрать'}
                  </button>
              </div>
          ))}
      </div>
    </div>
  );
};

export default Shop;