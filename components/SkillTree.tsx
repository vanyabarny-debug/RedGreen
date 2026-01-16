import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Skill } from '../types';
import { Plus, Trash2, Tag, Edit2, X, Palette } from 'lucide-react';
import { playSound } from '../utils/audio';

// RENAMED LOGICALLY TO "CATEGORIES MANAGER", BUT FILE IS KEPT AS SkillTree.tsx TO AVOID BREAKING IMPORTS
const SkillTree: React.FC = () => {
  const { state, dispatch } = useGame();
  
  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#ffffff');

  const openEditModal = (skill: Skill) => {
      setSelectedSkill(skill);
      setEditName(skill.name);
      setEditColor(skill.color);
      setModalOpen(true);
  };

  const handleSave = () => {
      if (!selectedSkill) {
          // Create New
          const newSkill: Skill = {
              id: `skill_${Date.now()}`,
              parentId: null,
              name: editName,
              color: editColor,
              level: 1,
              currentXP: 0,
              maxXP: 100,
              startDate: new Date().toISOString()
          };
          dispatch({ type: 'ADD_SKILL', payload: newSkill });
      } else {
          // Update
          const updatedSkill: Skill = {
              ...selectedSkill,
              name: editName,
              color: editColor
          };
          dispatch({ type: 'UPDATE_SKILL', payload: updatedSkill });
      }
      setModalOpen(false);
      playSound('click');
  };

  const handleDelete = () => {
      if(selectedSkill && window.confirm("Удалить категорию?")) {
          dispatch({ type: 'DELETE_SKILL', payload: selectedSkill.id });
          setModalOpen(false);
      }
  };

  const handleCreateNew = () => {
      setSelectedSkill(null);
      setEditName('');
      setEditColor('#3b82f6');
      setModalOpen(true);
  };

  return (
      <div className="w-full h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                  <Tag className="text-white"/> Категории
              </h2>
              <button onClick={handleCreateNew} className="bg-white text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                  <Plus size={18}/> <span className="hidden md:inline">Добавить</span>
              </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10">
              {state.skills.map(skill => (
                  <div 
                    key={skill.id} 
                    onClick={() => openEditModal(skill)}
                    className="bg-rpg-panel border border-rpg-border rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-white hover:shadow-lg transition-all group min-h-[100px]"
                  >
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full shadow-sm shrink-0 border border-white/10" style={{backgroundColor: skill.color}}></div>
                          <span className="font-bold text-white text-lg truncate">{skill.name}</span>
                      </div>
                      <Edit2 size={18} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
              ))}
              
              {state.skills.length === 0 && (
                  <div className="col-span-full text-center py-20 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                      Создайте категории для сортировки задач (Работа, Учеба, Спорт...)
                  </div>
              )}
          </div>

          {/* Edit Modal */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
                <div className="bg-rpg-panel w-full max-w-sm rounded-xl border border-rpg-border shadow-2xl p-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xl text-white">{selectedSkill ? 'Редактировать' : 'Создать'} Категорию</h3>
                        <button onClick={() => setModalOpen(false)}><X className="text-gray-500 hover:text-white"/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-1">Название</label>
                            <input 
                                className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" 
                                value={editName} 
                                onChange={e => setEditName(e.target.value)} 
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-gray-500 mb-2">Цвет</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="color" 
                                    value={editColor} 
                                    onChange={e => setEditColor(e.target.value)}
                                    className="h-10 w-10 cursor-pointer bg-transparent border-none p-0"
                                />
                                <span className="text-xs text-gray-400 font-mono">{editColor}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between mt-8 border-t border-rpg-border pt-4">
                        {selectedSkill && (
                            <button onClick={handleDelete} className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2"><Trash2 size={16}/> Удалить</button>
                        )}
                        <div className="flex-1"></div>
                        <button onClick={handleSave} className="bg-rpg-primary text-black px-6 py-2 rounded font-bold hover:bg-white text-sm">Сохранить</button>
                    </div>
                </div>
            </div>
          )}
      </div>
  );
};

export default SkillTree;