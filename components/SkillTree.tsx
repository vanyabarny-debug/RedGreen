import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGame } from '../context/GameContext';
import { Skill } from '../types';
import { Plus, Trash2, Network, ZoomIn, ZoomOut, Maximize, Rocket, RefreshCw, Zap, Wallet, ArrowUpCircle, X, Calendar, Palette, Tag, Edit2 } from 'lucide-react';
import { playSound } from '../utils/audio';
import { differenceInDays, parseISO, addMonths, format, addYears, subMonths, isBefore, addDays } from 'date-fns';

const SkillTree: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useGame();
  
  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#ffffff');
  
  // Conditions State
  const [useXP, setUseXP] = useState(true);
  const [xpValue, setXpValue] = useState(100);
  const [useMoney, setUseMoney] = useState(false);
  const [moneyValue, setMoneyValue] = useState(0);
  const [deadlineDate, setDeadlineDate] = useState(''); // YYYY-MM-DD

  // Tabs for Modal
  const [activeTab, setActiveTab] = useState<'general' | 'conditions' | 'structure'>('general');

  // --- Helper: Visual Progress ---
  const getCalculatedProgress = (skillId: string, allSkills: Skill[]): number => {
      const skill = allSkills.find(s => s.id === skillId);
      if (!skill) return 0;
      const children = allSkills.filter(s => s.parentId === skillId);
      if (children.length === 0) return Math.min(100, (skill.currentXP / skill.maxXP) * 100);
      const totalChildProgress = children.reduce((sum, child) => sum + getCalculatedProgress(child.id, allSkills), 0);
      return totalChildProgress / children.length;
  };

  // --- D3 Render Effect ---
  useEffect(() => {
    if (state.user?.appMode === 'standard') return; // Skip D3 in Standard Mode

    if (!state.skills.length || !svgRef.current || !containerRef.current || !state.user) {
        return;
    }

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    
    // --- SAFE DATA PREPARATION ---
    // 1. Deep clone or map to avoid mutating state directly
    // 2. Assign SUPER_ROOT_HIDDEN only to nodes that are TRULY roots (parentId === null)
    let allSkillsForTree = state.skills.map(s => ({...s})); 
    const superRootId = 'SUPER_ROOT_HIDDEN';
    
    // Check if we have multiple roots
    const roots = allSkillsForTree.filter(s => !s.parentId);
    
    if (roots.length > 0) {
        // Remap roots to hang off invisible super-root
        allSkillsForTree = allSkillsForTree.map(s => !s.parentId ? { ...s, parentId: superRootId } : s);
        
        // Add the invisible super-root
        allSkillsForTree.push({
            id: superRootId,
            parentId: null,
            name: 'HIDDEN',
            color: '#000',
            level: 0,
            currentXP: 0,
            maxXP: 0
        });
    }

    let rootData;
    try {
        rootData = d3.stratify<Skill>().id(d => d.id).parentId(d => d.parentId)(allSkillsForTree);
    } catch (e) { console.error("D3 Stratify Error:", e); return; }

    const NODE_WIDTH = 140;
    const NODE_HEIGHT = 60;
    const treeLayout = d3.cluster<Skill>()
        .nodeSize([NODE_WIDTH + 20, NODE_HEIGHT + 60]) 
        .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.4));

    treeLayout(rootData);

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width/2, 0, width, height])
      .style("cursor", "grab");

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom)
       .call(zoom.transform, d3.zoomIdentity.translate(0, 50).scale(0.8));

    const descendants = rootData.descendants().filter(d => d.id !== superRootId);
    const links = rootData.links().filter(d => d.source.id !== superRootId);

    // Links
    g.selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
          const childProgress = getCalculatedProgress(d.target.data.id, state.skills);
          return childProgress > 0 ? (d.target.data.color || '#fff') : '#333';
      })
      .attr('stroke-width', (d: any) => getCalculatedProgress(d.target.data.id, state.skills) > 0 ? 2 : 1)
      .attr('stroke-opacity', 0.5)
      .attr('d', d3.linkVertical().x((d: any) => d.x).y((d: any) => d.y) as any);

    // Nodes
    const nodeSelection = g.selectAll('.node')
      .data(descendants)
      .enter()
      .append('g')
      .attr('class', 'node cursor-pointer')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => {
         if (event.defaultPrevented) return; 
         event.stopPropagation(); // Stop zoom
         
         // CRITICAL FIX: Fetch the ORIGINAL skill from state, NOT the D3 modified data
         const cleanSkill = state.skills.find(s => s.id === d.data.id);
         if (cleanSkill) {
             openEditModal(cleanSkill);
             playSound('click');
         }
      });

    // Visuals
    nodeSelection.each(function(d: any) {
        const progress = getCalculatedProgress(d.data.id, state.skills);
        const nodeGroup = d3.select(this);
        const color = d.data.color;
        
        // Rect
        nodeGroup.append('rect')
            .attr('x', -NODE_WIDTH/2).attr('y', -NODE_HEIGHT/2)
            .attr('width', NODE_WIDTH).attr('height', NODE_HEIGHT)
            .attr('rx', 6)
            .attr('fill', color).attr('fill-opacity', 0.15)
            .attr('stroke', progress >= 100 ? '#fff' : color)
            .attr('stroke-width', progress >= 100 ? 2 : 1);

        // Progress Fill
        if (progress > 0) {
            nodeGroup.append('rect')
                .attr('x', -NODE_WIDTH/2).attr('y', NODE_HEIGHT/2 - 4)
                .attr('width', NODE_WIDTH * (progress / 100)).attr('height', 4)
                .attr('rx', 2).attr('fill', color);
        }

        // Text
        nodeGroup.append('text')
            .attr('dy', -5).attr('text-anchor', 'middle')
            .text(d.data.name.length > 18 ? d.data.name.substring(0,16)+'...' : d.data.name)
            .attr('fill', 'white').style('font-size', '12px').style('font-weight', 'bold').style('font-family', 'monospace')
            .style('pointer-events', 'none');

        // Percent
        nodeGroup.append('text')
            .attr('dy', 15).attr('text-anchor', 'middle')
            .text(`${Math.round(progress)}%`)
            .attr('fill', '#9ca3af').style('font-size', '10px').style('font-weight', 'bold')
            .style('pointer-events', 'none');
            
        // Deadline Label
        if (d.data.deadline) {
            const daysLeft = differenceInDays(parseISO(d.data.deadline), new Date());
            let timeText = '!';
            if (daysLeft >= 0) {
                if (daysLeft > 30) {
                    const months = Math.floor(daysLeft / 30);
                    const days = daysLeft % 30;
                    timeText = `${months}м ${days}д`;
                } else {
                    timeText = `${daysLeft}д`;
                }
            } else {
                 timeText = 'Истек';
            }
            
            nodeGroup.append('text')
                .attr('x', NODE_WIDTH/2 - 6).attr('y', -NODE_HEIGHT/2 + 14)
                .attr('text-anchor', 'end')
                .text(timeText)
                .attr('fill', daysLeft < 30 ? '#ef4444' : '#f59e0b')
                .style('font-size', '10px').style('font-weight', 'bold').style('font-family', 'monospace');
        }
    });

  }, [state.skills, state.user]);

  // --- ACTIONS & LOGIC ---

  const openEditModal = (skill: Skill) => {
      setSelectedSkill(skill);
      setEditName(skill.name);
      setEditColor(skill.color);
      
      // Init Conditions
      setUseXP(true);
      setXpValue(skill.maxXP);
      
      const hasMoney = !!skill.requiredMoney && skill.requiredMoney > 0;
      setUseMoney(hasMoney);
      setMoneyValue(skill.requiredMoney || 0);
      
      // Init Deadline String (YYYY-MM-DD)
      if (skill.deadline) {
          try {
              const dateStr = format(parseISO(skill.deadline), 'yyyy-MM-dd');
              setDeadlineDate(dateStr);
          } catch(e) {
              setDeadlineDate('');
          }
      } else {
          setDeadlineDate('');
      }

      setActiveTab('general');
      setModalOpen(true);
  };

  const handleSave = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); 
      
      if (!selectedSkill) return;
      
      console.log('[DEBUG] Saving Skill. ID:', selectedSkill.id);

      const updatedSkill: Skill = {
          ...selectedSkill,
          name: editName,
          color: editColor,
          maxXP: Number(xpValue),
          requiredMoney: useMoney ? Number(moneyValue) : undefined,
          deadline: deadlineDate ? new Date(deadlineDate).toISOString() : undefined
      };
      
      dispatch({ type: 'UPDATE_SKILL', payload: updatedSkill });
      setModalOpen(false);
  };

  const calculateSmartDeadline = (parent: Skill): string => {
      const siblings = state.skills.filter(s => s.parentId === parent.id);
      if (siblings.length > 0 && siblings[0].deadline) {
          return siblings[0].deadline;
      }
      if (parent.deadline) {
          const parentDate = parseISO(parent.deadline);
          let newDate = subMonths(parentDate, 2);
          if (isBefore(newDate, new Date())) {
              newDate = addDays(new Date(), 7);
          }
          return newDate.toISOString();
      }
      return addMonths(new Date(), 1).toISOString();
  };

  const handleAddChild = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(!selectedSkill) return;
      
      const smartDeadline = calculateSmartDeadline(selectedSkill);

      const newSkill: Skill = {
          id: `node_${Date.now()}`,
          parentId: selectedSkill.id,
          name: "Новый этап",
          color: selectedSkill.color,
          level: selectedSkill.level + 1,
          currentXP: 0,
          maxXP: 100,
          deadline: smartDeadline
      };
      
      dispatch({ type: 'ADD_SKILL', payload: newSkill });
      setModalOpen(false);
  };

  const handleAddParent = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(!selectedSkill) return;
      
      let parentDeadline = undefined;
      if (selectedSkill.deadline) {
          parentDeadline = addMonths(parseISO(selectedSkill.deadline), 2).toISOString();
      }

      const newParent: Skill = {
          id: `node_parent_${Date.now()}`,
          parentId: selectedSkill.parentId,
          name: "Новая Вершина",
          color: selectedSkill.color,
          level: Math.max(0, selectedSkill.level - 1),
          currentXP: 0,
          maxXP: 500,
          deadline: parentDeadline
      };
      dispatch({ type: 'ADD_SKILL', payload: newParent });

      const updatedCurrent: Skill = {
          ...selectedSkill,
          parentId: newParent.id
      };
      dispatch({ type: 'UPDATE_SKILL', payload: updatedCurrent });
      
      setModalOpen(false);
  };

  const handleAddRoot = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Logic for Standard Mode (Just a Tag)
      if (state.user?.appMode === 'standard') {
          const newTag: Skill = {
              id: `tag_${Date.now()}`,
              parentId: null,
              name: "Новая Категория",
              color: '#3b82f6',
              level: 1,
              currentXP: 0,
              maxXP: 100,
              startDate: new Date().toISOString()
          };
          dispatch({ type: 'ADD_SKILL', payload: newTag });
          return;
      }

      // Logic for Advanced Mode (Goal Root)
      const defaultRootDeadline = addYears(new Date(), 1).toISOString();
      const newRoot: Skill = {
          id: `root_${Date.now()}`,
          parentId: null,
          name: "Новая Цель",
          color: '#f59e0b',
          level: 0,
          currentXP: 0,
          maxXP: 2000,
          deadline: defaultRootDeadline
      };
      dispatch({ type: 'ADD_SKILL', payload: newRoot });
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(selectedSkill && window.confirm("Удалить?")) {
          dispatch({ type: 'DELETE_SKILL', payload: selectedSkill.id });
          setModalOpen(false);
      }
  };

  // --- STANDARD MODE RENDER ---
  if (state.user?.appMode === 'standard') {
      return (
          <div className="w-full h-full p-4 md:p-8 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Tag className="text-rpg-primary"/> Категории
                  </h2>
                  <button onClick={handleAddRoot} className="bg-rpg-primary text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-white transition-colors">
                      <Plus size={18}/> Добавить
                  </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
                  {state.skills.map(skill => (
                      <div 
                        key={skill.id} 
                        onClick={() => openEditModal(skill)}
                        className="bg-rpg-panel border border-rpg-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-rpg-primary transition-all group"
                      >
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full shadow-sm shrink-0" style={{backgroundColor: skill.color}}></div>
                              <span className="font-bold text-white truncate">{skill.name}</span>
                          </div>
                          <Edit2 size={16} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </div>
                  ))}
                  
                  {state.skills.length === 0 && (
                      <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                          Создайте категории для сортировки задач (Работа, Учеба, Спорт...)
                      </div>
                  )}
              </div>

              {/* Simple Edit Modal for Standard Mode */}
              {modalOpen && selectedSkill && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
                    <div className="bg-rpg-panel w-full max-w-sm rounded-lg border border-rpg-border shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-white">Редактировать Категорию</h3>
                            <button onClick={() => setModalOpen(false)}><X className="text-gray-500"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-gray-500 mb-1">Название</label>
                                <input 
                                    className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-500 mb-2">Цвет</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={editColor} 
                                        onChange={e => setEditColor(e.target.value)}
                                        className="h-10 w-full cursor-pointer bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-8 border-t border-rpg-border pt-4">
                            <button onClick={handleDelete} className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2"><Trash2 size={16}/> Удалить</button>
                            <button onClick={handleSave} className="bg-rpg-primary text-black px-6 py-2 rounded font-bold hover:bg-white text-sm">Сохранить</button>
                        </div>
                    </div>
                </div>
              )}
          </div>
      );
  }

  // --- ADVANCED MODE RENDER (EXISTING D3) ---
  return (
    <div className="w-full h-full bg-rpg-panel border border-rpg-border rounded-lg shadow-sm p-0 md:p-4 overflow-hidden flex flex-col relative">
      {/* UI Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10">
        <div className="pointer-events-auto bg-black/40 backdrop-blur px-4 py-2 rounded-lg border border-rpg-border">
            <h2 className="text-lg font-bold text-rpg-text flex items-center gap-2">
                <Network className="text-rpg-primary" size={20}/> Система Целей
            </h2>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
          <button 
            onClick={handleAddRoot}
            className="bg-rpg-primary text-black font-bold p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-2"
            title="Создать новую глобальную цель"
          >
              <Plus size={24}/>
          </button>
      </div>

      {/* D3 Container */}
      <div ref={containerRef} className="w-full h-full bg-rpg-bg relative shadow-inner overflow-hidden touch-none flex items-center justify-center">
        {state.skills.length === 0 ? (
            <div className="text-center p-8 bg-rpg-card/50 rounded-xl border border-dashed border-rpg-border backdrop-blur-sm max-w-md mx-4">
                <Rocket size={64} className="mx-auto text-rpg-primary mb-6 opacity-80" />
                <h3 className="text-2xl font-bold text-white mb-2">Система не построена</h3>
                <button 
                    onClick={handleAddRoot}
                    className="bg-rpg-primary text-black font-bold py-3 px-8 rounded-lg hover:bg-white transition-all shadow-lg shadow-rpg-primary/20 flex items-center gap-2 mx-auto mt-4"
                >
                    <Plus size={20}/> Создать Главную Цель
                </button>
            </div>
        ) : (
            <svg ref={svgRef} style={{width: '100%', height: '100%'}}></svg>
        )}
      </div>

      {/* EDIT MODAL */}
      {modalOpen && selectedSkill && (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4" 
            onClick={(e) => { e.stopPropagation(); }}
        >
            <div 
                className="bg-rpg-panel w-full max-w-md rounded-xl border border-rpg-border shadow-2xl flex flex-col overflow-hidden animate-fade-in" 
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="p-4 flex justify-between items-center text-black" style={{backgroundColor: editColor}}>
                    <h3 className="text-lg font-bold font-mono uppercase tracking-wider mix-blend-hard-light">{selectedSkill.name}</h3>
                    <button onClick={() => setModalOpen(false)} className="hover:bg-black/20 p-1 rounded text-black"><X size={20}/></button>
                </div>

                <div className="flex border-b border-rpg-border bg-rpg-card">
                    <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'general' ? 'text-rpg-primary border-b-2 border-rpg-primary' : 'text-gray-500'}`}>Общее</button>
                    <button onClick={() => setActiveTab('conditions')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'conditions' ? 'text-rpg-primary border-b-2 border-rpg-primary' : 'text-gray-500'}`}>Условия</button>
                    <button onClick={() => setActiveTab('structure')} className={`flex-1 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'structure' ? 'text-rpg-primary border-b-2 border-rpg-primary' : 'text-gray-500'}`}>Структура</button>
                </div>

                <div className="p-6 flex-1 bg-rpg-bg overflow-y-auto">
                    {/* TAB: GENERAL */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 uppercase font-mono mb-1">Название узла</label>
                                <input 
                                    className="w-full bg-rpg-card border border-rpg-border rounded p-3 text-white focus:border-rpg-primary outline-none" 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 uppercase font-mono mb-2 flex items-center gap-2">
                                    <Palette size={14}/> Цвет ветки
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-105">
                                        <input 
                                            type="color" 
                                            value={editColor} 
                                            onChange={e => setEditColor(e.target.value)}
                                            className="absolute -top-2 -left-2 w-20 h-20 p-0 border-0 outline-none cursor-pointer bg-transparent"
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">{editColor}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: CONDITIONS */}
                    {activeTab === 'conditions' && (
                        <div className="space-y-6">
                            <p className="text-xs text-gray-400">Настройте условия, необходимые для завершения этого этапа.</p>
                            
                            {/* XP */}
                            <div className="bg-rpg-card p-4 rounded border border-rpg-border">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 font-bold text-rpg-primary">
                                        <Zap size={18}/> Опыт (XP)
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Сложность</span>
                                        <span>{xpValue} XP</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" max="5000" step="10" 
                                        className="w-full accent-rpg-primary" 
                                        value={xpValue} 
                                        onChange={e => setXpValue(Number(e.target.value))} 
                                    />
                                </div>
                            </div>

                            {/* MONEY */}
                            <div className="bg-rpg-card p-4 rounded border border-rpg-border">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2 font-bold text-green-500">
                                        <Wallet size={18}/> Бюджет ($)
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={useMoney} 
                                        onChange={e => setUseMoney(e.target.checked)} 
                                        className="accent-green-500 w-5 h-5"
                                    />
                                </div>
                                {useMoney && (
                                    <input 
                                        type="number" 
                                        className="w-full bg-rpg-panel border border-rpg-border rounded p-2 text-white outline-none" 
                                        placeholder="Сумма" 
                                        value={moneyValue} 
                                        onChange={e => setMoneyValue(Number(e.target.value))} 
                                    />
                                )}
                            </div>

                            {/* DEADLINE (Customizable) */}
                            <div className="bg-rpg-card p-4 rounded border border-rpg-border">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2 font-bold text-orange-500">
                                        <Calendar size={18}/> Дедлайн
                                    </div>
                                </div>
                                <input 
                                    type="date" 
                                    className="w-full bg-rpg-panel border border-rpg-border rounded p-2 text-white outline-none" 
                                    value={deadlineDate} 
                                    onChange={e => setDeadlineDate(e.target.value)} 
                                />
                                <p className="text-[10px] text-gray-500 mt-2">
                                    По умолчанию: родитель минус 2 месяца. Вы можете изменить дату вручную.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB: STRUCTURE */}
                    {activeTab === 'structure' && (
                        <div className="space-y-4">
                            <button onClick={handleAddParent} className="w-full bg-rpg-card hover:bg-rpg-border text-white py-3 rounded border border-rpg-border flex items-center justify-center gap-2 font-bold transition-colors">
                                <ArrowUpCircle size={18}/> Сделать Подцелью...
                            </button>
                            <button onClick={handleAddChild} className="w-full bg-rpg-card hover:bg-rpg-border text-white py-3 rounded border border-rpg-border flex items-center justify-center gap-2 font-bold transition-colors">
                                <Plus size={18}/> Добавить Дочернюю
                            </button>
                            <div className="h-px bg-rpg-border my-4"></div>
                            <button onClick={handleDelete} className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 py-3 rounded border border-red-900/50 flex items-center justify-center gap-2 font-bold transition-colors">
                                <Trash2 size={18}/> Удалить Узел
                            </button>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-rpg-border bg-rpg-card flex justify-end">
                    <button onClick={handleSave} className="bg-rpg-primary text-black font-bold px-6 py-2 rounded hover:bg-white transition-colors">
                        Применить
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SkillTree;