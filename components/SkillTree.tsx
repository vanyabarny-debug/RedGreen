import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useGame } from '../context/GameContext';
import { Skill } from '../types';
import { Plus, Trash2, Network, BarChart2, Edit3, X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { playSound } from '../utils/audio';

const SkillTree: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useGame();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('#ffffff');

  useEffect(() => {
    if (!state.skills.length || !svgRef.current || !containerRef.current || !state.user) return;

    // 1. Setup Dimensions
    // We use the container's physical size for the viewport...
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // ...But we calculate the tree layout on a much larger "virtual" canvas
    // to ensure nodes are not squished together on mobile.
    // Dynamic height based on number of nodes to prevent vertical overlap.
    const rootSkill: Skill = { id: 'USER_ROOT', parentId: null, name: state.user.username, color: 'var(--text-color)', level: state.user?.level || 1, currentXP: 0, maxXP: 0 };
    const treeDataWithRoot = [
      rootSkill,
      ...state.skills.map(s => ({...s, parentId: s.parentId || 'USER_ROOT'}))
    ];

    let root;
    try {
        root = d3.stratify<Skill>().id(d => d.id).parentId(d => d.parentId)(treeDataWithRoot);
    } catch (e) { return; }

    // Count leaves to determine necessary height
    let leaves = 0;
    root.eachBefore(d => { if(!d.children) leaves++; });
    
    // Virtual Dimensions: Spacious layout settings
    const virtualHeight = Math.max(height, leaves * 60); // At least 60px per leaf node vertically
    const virtualWidth = 1200; // Fixed wide width so names fit horizontally

    // 2. Clear Previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("cursor", "move");

    // 3. Create Container Group for Zooming
    const g = svg.append("g");

    // 4. Setup Zoom & Pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3]) // Allow zooming out to 0.2x and in to 3x
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom)
       .call(zoom.transform, d3.zoomIdentity.translate(50, height / 2 - virtualHeight / 2).scale(0.8)); // Initial center

    // 5. Calculate Layout
    const treeLayout = d3.tree<Skill>()
        .size([virtualHeight, virtualWidth - 300]) // Reserve space for right-side text
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5)); // More space between different branches

    treeLayout(root);

    // 6. Draw Links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'var(--border-color)')
      .attr('stroke-width', 1.5)
      .attr('d', d3.linkHorizontal().x((d: any) => d.y).y((d: any) => d.x) as any);

    // 7. Draw Nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', (d: any) => `node cursor-pointer`)
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      // Add touchstart for better mobile response
      .on('click touchend', (event, d) => {
         // Prevent zoom drag from triggering click immediately if moved, 
         // but D3 usually handles click vs drag well.
         // We use a small timeout or check if it was a drag gesture if needed, 
         // but simple click handler usually works for tap.
         if (d.data.id !== 'USER_ROOT') {
             setSelectedSkill(d.data);
             setDetailsOpen(true);
             playSound('click');
         } else {
             setSelectedParentId('USER_ROOT');
             setModalOpen(true);
         }
      });

    // Node Circle
    nodes.append('circle')
      .attr('r', (d: any) => d.data.id === 'USER_ROOT' ? 8 : 6)
      .attr('fill', 'var(--panel-color)')
      .attr('stroke', (d: any) => d.data.color)
      .attr('stroke-width', (d: any) => d.data.id === 'USER_ROOT' ? 3 : 2);

    // Node Text (Name)
    nodes.append('text')
      .attr('dy', 4)
      .attr('x', (d: any) => d.children ? -12 : 12)
      .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
      .text((d: any) => d.data.id === 'USER_ROOT' ? d.data.name : d.data.name)
      .attr('fill', (d: any) => d.data.id === 'USER_ROOT' ? 'var(--text-color)' : 'var(--text-color)')
      .style('font-size', '14px') // Larger font for mobile readability
      .style('font-family', 'monospace')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none') // Let clicks pass through text to the group
      .style('text-shadow', '0 2px 4px var(--bg-color)'); // Legibility

    // Level Badge
    nodes.append('text')
      .attr('dy', 20)
      .attr('x', (d: any) => d.children ? -12 : 12)
      .style('text-anchor', (d: any) => d.children ? 'end' : 'start')
      .text((d: any) => d.data.id === 'USER_ROOT' ? '' : `Lv.${d.data.level}`)
      .attr('fill', 'var(--muted-color)')
      .style('font-size', '10px')
      .style('font-family', 'monospace');

  }, [state.skills, state.user, state.user?.themeId]);

  // Handler for manual zoom buttons
  const handleZoom = (factor: number) => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (e) => svg.select('g').attr('transform', e.transform)).scaleBy as any, factor);
  };

  const handleResetZoom = () => {
      if (!svgRef.current || !containerRef.current) return;
      const height = containerRef.current.clientHeight;
      const svg = d3.select(svgRef.current);
      // Re-center logic approximate
      svg.transition().duration(750).call(
          d3.zoom<SVGSVGElement, unknown>().on("zoom", (e) => svg.select('g').attr('transform', e.transform)).transform as any, 
          d3.zoomIdentity.translate(50, height / 2).scale(0.8)
      );
  };

  const handleAddSkill = () => {
     if(!newSkillName) return;
     const parentId = selectedParentId || (selectedSkill ? selectedSkill.id : null);
     const parent = state.skills.find(s => s.id === parentId);
     const color = parent ? parent.color : customColor;

     const newSkill: Skill = {
         id: `skill_${Date.now()}`,
         parentId: parentId === 'USER_ROOT' ? null : parentId,
         name: newSkillName,
         color,
         level: 1,
         currentXP: 0,
         maxXP: 50
     };
     dispatch({ type: 'ADD_SKILL', payload: newSkill });
     setModalOpen(false);
     setNewSkillName('');
     if (detailsOpen) setDetailsOpen(false);
  };

  const handleDeleteSkill = () => {
      if(selectedSkill && window.confirm(`Удалить навык "${selectedSkill.name}" и все дочерние элементы?`)) {
          dispatch({type: 'DELETE_SKILL', payload: selectedSkill.id});
          setDetailsOpen(false);
          setSelectedSkill(null);
      }
  };

  const getSkillStats = (skillId: string) => {
      const tasks = state.tasks.filter(t => t.skillId === skillId && t.completed).length;
      return { tasks };
  };

  return (
    <div className="w-full h-full bg-rpg-panel border border-rpg-border rounded-lg shadow-sm p-0 md:p-4 overflow-hidden flex flex-col relative">
      {/* Header overlay for mobile */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-10 bg-gradient-to-b from-rpg-panel/80 to-transparent">
        <div className="pointer-events-auto">
            <h2 className="text-xl font-bold text-rpg-text flex items-center gap-2 tracking-tight">
                <Network className="text-rpg-secondary"/> Карта Навыков
            </h2>
            <div className="flex gap-4 text-xs text-gray-500 font-mono mt-1">
                <span>Узлов: {state.skills.length}</span>
            </div>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex flex-col gap-2 pointer-events-auto">
             <button onClick={() => handleZoom(1.2)} className="bg-rpg-card p-2 rounded border border-rpg-border text-gray-400 hover:text-white"><ZoomIn size={16}/></button>
             <button onClick={() => handleZoom(0.8)} className="bg-rpg-card p-2 rounded border border-rpg-border text-gray-400 hover:text-white"><ZoomOut size={16}/></button>
             <button onClick={handleResetZoom} className="bg-rpg-card p-2 rounded border border-rpg-border text-gray-400 hover:text-white"><Maximize size={16}/></button>
        </div>
      </div>

      {/* Floating Action Button for Adding */}
      <button 
          onClick={() => { setSelectedParentId('USER_ROOT'); setModalOpen(true); }}
          className="absolute bottom-6 right-6 z-20 w-14 h-14 bg-rpg-primary text-black rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
          <Plus size={24}/>
      </button>

      {/* D3 Canvas */}
      <div ref={containerRef} className="w-full h-full bg-rpg-bg md:rounded border-none md:border border-rpg-border relative shadow-inner overflow-hidden touch-none">
        <svg ref={svgRef} style={{width: '100%', height: '100%'}}></svg>
      </div>

      {/* New Skill Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
            <div className="bg-rpg-panel p-6 md:p-8 rounded-lg border border-rpg-border w-full max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold mb-6 text-rpg-text tracking-tight">
                    Добавить узел к: <span className="text-rpg-secondary font-mono">{selectedParentId === 'USER_ROOT' || !selectedParentId ? state.user?.username : state.skills.find(s => s.id === selectedParentId)?.name}</span>
                </h3>
                
                <input 
                    type="text" 
                    placeholder="Название навыка..." 
                    className="w-full bg-rpg-card border border-rpg-border rounded p-3 mb-6 text-rpg-text outline-none focus:border-rpg-primary transition-colors"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    autoFocus
                />

                {(!selectedParentId || selectedParentId === 'USER_ROOT') && (
                    <div className="mb-6">
                        <label className="block text-xs text-gray-400 mb-2 font-mono uppercase">Цвет Кластера</label>
                        <div className="flex gap-2 flex-wrap">
                            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#d946ef', '#06b6d4', '#ffffff'].map(c => (
                                <button 
                                    key={c}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${customColor === c ? 'border-white' : 'border-transparent'}`}
                                    style={{backgroundColor: c}}
                                    onClick={() => setCustomColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-500 hover:text-rpg-text text-sm">Отмена</button>
                    <button onClick={handleAddSkill} className="px-6 py-2 bg-rpg-primary text-rpg-bg rounded text-sm font-bold hover:opacity-90">Создать</button>
                </div>
            </div>
        </div>
      )}

      {/* Skill Details Modal */}
      {detailsOpen && selectedSkill && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
               <div className="bg-rpg-panel w-full max-w-md rounded-lg border border-rpg-border shadow-2xl relative overflow-hidden animate-fade-in">
                   <div className="h-2 w-full" style={{backgroundColor: selectedSkill.color}}></div>
                   <button onClick={() => setDetailsOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-rpg-text"><X size={20}/></button>
                   
                   <div className="p-6 md:p-8">
                       <h2 className="text-2xl md:text-3xl font-bold text-rpg-text mb-2">{selectedSkill.name}</h2>
                       <div className="flex items-center gap-4 mb-6">
                           <span className="px-3 py-1 bg-rpg-card rounded border border-rpg-border text-xs font-mono text-gray-400">Level {selectedSkill.level}</span>
                           <span className="text-xs text-gray-500">Родитель: {state.skills.find(s => s.id === selectedSkill.parentId)?.name || state.user?.username}</span>
                       </div>

                       <div className="space-y-6">
                           <div>
                               <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
                                   <span>XP PROGRESS</span>
                                   <span>{selectedSkill.currentXP} / {selectedSkill.maxXP}</span>
                               </div>
                               <div className="h-2 bg-rpg-card rounded-full overflow-hidden">
                                   <div className="h-full bg-rpg-text transition-all" style={{width: `${(selectedSkill.currentXP / selectedSkill.maxXP) * 100}%`}}></div>
                               </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div className="p-4 bg-rpg-card rounded border border-rpg-border flex items-center gap-3">
                                   <div className="p-2 bg-blue-500/10 text-blue-400 rounded"><BarChart2 size={20}/></div>
                                   <div>
                                       <div className="text-xl font-bold text-rpg-text">{getSkillStats(selectedSkill.id).tasks}</div>
                                       <div className="text-xs text-gray-500 font-mono uppercase">Задач вып.</div>
                                   </div>
                               </div>
                           </div>

                           <div className="pt-6 border-t border-rpg-border flex justify-between items-center">
                               <button onClick={handleDeleteSkill} className="text-red-500 hover:text-red-400 text-sm flex items-center gap-2"><Trash2 size={16}/> Удалить</button>
                               <button 
                                    onClick={() => { setSelectedParentId(selectedSkill.id); setDetailsOpen(false); setModalOpen(true); }}
                                    className="px-4 py-2 bg-rpg-card hover:bg-rpg-border text-rpg-text border border-rpg-border rounded text-sm font-medium flex items-center gap-2"
                               >
                                   <Plus size={16}/> Добавить ветку
                               </button>
                           </div>
                       </div>
                   </div>
               </div>
          </div>
      )}
    </div>
  );
};

export default SkillTree;