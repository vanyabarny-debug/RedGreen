import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Target, ArrowRight, Brain, Clock, Check, Plus, ChevronDown, ChevronRight, X, Coffee, Hourglass, Zap, Layers, Network, Shield, Sword, LayoutList } from 'lucide-react';
import { Skill } from '../types';
import { useNavigate } from 'react-router-dom';
import { addYears, addMonths, format, differenceInMilliseconds, addMilliseconds } from 'date-fns';
import { ru } from 'date-fns/locale';

// Temporary type for local state construction
interface BlueprintNode {
    id: string;
    name: string;
    type: 'root' | 'pillar' | 'sub' | 'routine';
    children: BlueprintNode[];
    color: string;
}

// --- BUILDER NODE ---
const BuilderNode: React.FC<{ 
    node: BlueprintNode, 
    expandedNodes: Set<string>, 
    toggleExpand: (id: string) => void,
    updateName: (id: string, name: string) => void,
    addChild: (id: string, type: 'sub' | 'routine') => void,
    deleteNode: (id: string) => void
}> = ({ node, expandedNodes, toggleExpand, updateName, addChild, deleteNode }) => {
    const isExpanded = expandedNodes.has(node.id);
    const indent = node.type === 'root' ? 0 : node.type === 'pillar' ? 4 : node.type === 'sub' ? 8 : 12;

    return (
        <div className="mb-2 animate-fade-in font-sans">
            <div className="flex items-center gap-2" style={{ marginLeft: `${indent * 4}px` }}>
                {(node.type === 'root' || node.type === 'pillar' || node.type === 'sub') && (
                    <button onClick={() => toggleExpand(node.id)} className="text-gray-500 hover:text-white">
                        {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                    </button>
                )}
                
                <input 
                    className={`bg-transparent border-b border-transparent hover:border-gray-700 focus:border-rpg-primary outline-none transition-colors px-1 py-0.5 text-white placeholder-gray-600 ${node.type === 'root' ? 'text-xl font-bold text-rpg-primary' : node.type === 'pillar' ? 'text-lg font-bold' : 'text-sm'}`}
                    value={node.name}
                    onChange={e => updateName(node.id, e.target.value)}
                    placeholder={node.type === 'root' ? 'Главная Цель' : 'Назовите этап...'}
                    autoFocus={node.name === ''}
                />

                <div className="flex items-center gap-1">
                    {node.type !== 'routine' && (
                        <button 
                            onClick={() => addChild(node.id, node.type === 'pillar' ? 'sub' : 'routine')} 
                            className="text-white hover:bg-white/10 p-1 rounded transition-colors"
                            title="Добавить подпункт"
                        >
                            <Plus size={14}/>
                        </button>
                    )}
                    {node.type !== 'root' && (
                        <button onClick={() => deleteNode(node.id)} className="text-gray-500 hover:text-white p-1 rounded transition-colors">
                            <X size={14}/>
                        </button>
                    )}
                </div>
            </div>
            
            {isExpanded && (
                <div className="mt-1 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-800" style={{ marginLeft: `${indent * 4 + 7}px` }}></div>
                    {node.children.map(child => (
                        <BuilderNode 
                            key={child.id} 
                            node={child} 
                            expandedNodes={expandedNodes}
                            toggleExpand={toggleExpand}
                            updateName={updateName}
                            addChild={addChild}
                            deleteNode={deleteNode}
                        />
                    ))}
                    
                    {node.children.length === 0 && node.type !== 'routine' && (
                        <div 
                            onClick={() => addChild(node.id, node.type === 'pillar' ? 'sub' : 'routine')}
                            className="text-gray-600 text-xs italic cursor-pointer hover:text-gray-400 py-1 flex items-center gap-2"
                            style={{ marginLeft: `${(indent + 4) * 4}px` }}
                        >
                            <Plus size={10}/> Добавить {node.type === 'pillar' ? 'подцель' : 'действие'}...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const OnboardingWizard: React.FC = () => {
    // ... (rest of the component remains exactly the same, reusing existing code)
    const { state, dispatch } = useGame();
    const navigate = useNavigate();
    const [step, setStep] = useState(state.user?.onboardingStep && state.user.onboardingStep < 4 ? state.user.onboardingStep : 0);
    const [selectedModeInfo, setSelectedModeInfo] = useState<'standard' | 'advanced' | null>(null);
    const [mainGoal, setMainGoal] = useState('');
    const [years, setYears] = useState<number | null>(null);
    const [pillars, setPillars] = useState(['Здоровье', 'Финансы', 'Отношения', 'Мастерство']); 
    const [blueprint, setBlueprint] = useState<BlueprintNode | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6'];

    const initBlueprint = () => {
        const rootId = 'temp_root';
        const root: BlueprintNode = {
            id: rootId,
            name: mainGoal,
            type: 'root',
            color: '#f59e0b',
            children: pillars.filter(p => p.trim()).map((p, i) => ({
                id: `temp_pillar_${i}`,
                name: p,
                type: 'pillar',
                color: COLORS[i % COLORS.length],
                children: [] 
            }))
        };
        setBlueprint(root);
        setExpandedNodes(new Set([rootId]));
    };

    const toggleExpand = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const addChild = (parentId: string, type: 'sub' | 'routine') => {
        if (!blueprint) return;
        const newChild: BlueprintNode = {
            id: `temp_node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: '', type: type, color: '#fff', children: []
        };
        const updateTree = (node: BlueprintNode): BlueprintNode => {
            if (node.id === parentId) return { ...node, children: [...node.children, newChild] };
            return { ...node, children: node.children.map(updateTree) };
        };
        setBlueprint(updateTree(blueprint));
        setExpandedNodes(prev => new Set(prev).add(parentId));
    };

    const updateName = (id: string, name: string) => {
        if (!blueprint) return;
        const updateTree = (node: BlueprintNode): BlueprintNode => {
            if (node.id === id) return { ...node, name };
            return { ...node, children: node.children.map(updateTree) };
        };
        setBlueprint(updateTree(blueprint));
    };

    const deleteNode = (id: string) => {
        if (!blueprint) return;
        const updateTree = (node: BlueprintNode): BlueprintNode => {
            return { ...node, children: node.children.filter(c => c.id !== id).map(updateTree) };
        };
        setBlueprint(updateTree(blueprint));
    };

    const setupStandardMode = () => {
        const defaultTags = [
            { name: 'Работа', color: '#3b82f6' },
            { name: 'Учеба', color: '#f59e0b' },
            { name: 'Здоровье', color: '#ef4444' },
            { name: 'Спорт', color: '#10b981' },
            { name: 'Творчество', color: '#d946ef' },
            { name: 'Быт', color: '#64748b' }
        ];

        const skillsToAdd: Skill[] = defaultTags.map(tag => ({
            id: `skill_${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
            parentId: null, // Root level tags
            name: tag.name,
            color: tag.color,
            level: 1,
            currentXP: 0,
            maxXP: 100,
            startDate: new Date().toISOString()
        }));

        dispatch({ type: 'ADD_SKILLS_BATCH', payload: skillsToAdd });
        dispatch({ type: 'SET_APP_MODE', payload: 'standard' });
        dispatch({ type: 'SET_ONBOARDING_STEP', payload: 4 });
        
        setTimeout(() => navigate('/'), 100);
    };

    const finishOnboarding = () => {
        if (!blueprint) return;

        const skillsToAdd: Skill[] = [];
        const timestamp = Date.now();
        const rootStartDate = new Date();
        const finalDeadline = addYears(rootStartDate, years || 1);
        
        const processNode = (node: BlueprintNode, parentId: string | null, inheritedColor: string, depth: number) => {
            const finalId = node.type === 'root' 
                ? `goal_root_${timestamp}` 
                : `skill_${timestamp}_${Math.random().toString(36).substr(2, 6)}`;
            
            const skillName = node.name.trim() || (node.type === 'root' ? 'Главная Цель' : 'Новый Этап');
            const finalColor = node.type === 'root' ? '#f59e0b' : (node.type === 'pillar' ? node.color : inheritedColor);

            let maxXP = 100;
            if (node.type === 'root') maxXP = 5000;
            else if (node.type === 'pillar') maxXP = 2000;
            else if (node.type === 'sub') maxXP = 500;

            const newSkill: Skill = {
                id: finalId,
                parentId: parentId,
                name: skillName,
                color: finalColor,
                level: 1,
                currentXP: 0,
                maxXP: maxXP,
                deadline: finalDeadline.toISOString(),
                startDate: rootStartDate.toISOString()
            };

            skillsToAdd.push(newSkill);

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => processNode(child, finalId, finalColor, depth + 1));
            }
        };

        try {
            processNode(blueprint, null, '#ffffff', 0);
            if (skillsToAdd.length > 0) {
                dispatch({ type: 'ADD_SKILLS_BATCH', payload: skillsToAdd });
            }
            dispatch({ type: 'SET_APP_MODE', payload: 'advanced' });
            dispatch({ type: 'SET_ONBOARDING_STEP', payload: 4 });
            setTimeout(() => { navigate('/skills'); }, 100);
        } catch (e) {
            console.error("Critical Error:", e);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 text-white font-sans">
            <div className="w-full max-w-3xl bg-rpg-panel border border-rpg-border rounded-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Step 0: Welcome */}
                {step === 0 && (
                    <div className="p-8 md:p-12 flex flex-col items-center text-center animate-fade-in h-full justify-center">
                        <Coffee size={80} className="text-white mb-6 animate-pulse"/>
                        <h2 className="text-2xl md:text-3xl font-bold font-mono text-white mb-4 uppercase tracking-widest">Добро пожаловать</h2>
                        <div className="bg-rpg-card border border-rpg-border p-6 rounded-lg max-w-xl text-left space-y-4 mb-8">
                            <p className="text-white leading-relaxed text-sm md:text-base">
                                GRIND — это система управления жизнью, которая превращает рутину в увлекательную RPG.
                            </p>
                            <p className="text-white leading-relaxed text-sm md:text-base">
                                Ставьте цели, получайте опыт за выполнение задач, повышайте уровень и отслеживайте свой прогресс через наглядную аналитику.
                            </p>
                        </div>
                        <button 
                            onClick={() => setStep(1)}
                            className="bg-white text-black font-bold py-3 px-10 rounded hover:bg-gray-200 transition-transform hover:scale-105 uppercase tracking-widest"
                        >
                            Начать Настройку
                        </button>
                    </div>
                )}

                {/* Step 1: Mode Selection */}
                {step === 1 && (
                    <div className="p-6 h-full flex flex-col justify-center animate-fade-in overflow-y-auto">
                        <h2 className="text-2xl md:text-3xl font-bold font-mono text-white mb-6 text-center uppercase tracking-widest">Выберите Режим</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mx-auto flex-1 md:flex-none">
                            {/* Standard Mode Card */}
                            <div 
                                onClick={() => setSelectedModeInfo('standard')}
                                className="bg-rpg-card border border-gray-700 rounded-xl p-5 cursor-pointer hover:bg-white/5 hover:border-white transition-all group flex flex-col relative overflow-hidden min-h-[160px]"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-gray-700/50 rounded-full text-white">
                                        <LayoutList size={24}/>
                                    </div>
                                    <ArrowRight size={20} className="text-gray-600 group-hover:text-white transition-colors"/>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gray-200 transition-colors">Стандартный</h3>
                                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
                                    Классический планировщик. Простые списки, теги и быстрый старт без лишних настроек.
                                </p>
                            </div>

                            {/* Advanced Mode Card */}
                            <div 
                                onClick={() => setSelectedModeInfo('advanced')}
                                className="bg-rpg-card border border-rpg-primary/50 rounded-xl p-5 cursor-pointer hover:bg-rpg-primary/10 hover:border-rpg-primary transition-all group flex flex-col relative overflow-hidden min-h-[160px]"
                            >
                                <div className="absolute top-0 right-0 p-2">
                                    <span className="bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase">Рекомендуем</span>
                                </div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-rpg-primary/20 rounded-full text-rpg-primary">
                                        <Sword size={24}/>
                                    </div>
                                    <ArrowRight size={20} className="text-rpg-primary/50 group-hover:text-rpg-primary transition-colors"/>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-rpg-primary transition-colors">Продвинутый</h3>
                                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
                                    Полная RPG система. Дерево навыков, квесты, уровни и архитектура личности.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mode Details Modal */}
                {selectedModeInfo && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in">
                        <div className="w-full max-w-lg bg-rpg-panel border border-rpg-border rounded-xl p-6 relative shadow-2xl">
                            <button onClick={() => setSelectedModeInfo(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                                <X size={24}/>
                            </button>

                            {selectedModeInfo === 'standard' ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                                        <LayoutList size={32}/>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-4">Стандартный Режим</h3>
                                    <div className="text-left text-sm text-gray-300 space-y-3 bg-rpg-card p-4 rounded mb-6 border border-rpg-border">
                                        <p>Идеально для тех, кто хочет просто вести список дел.</p>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2"><Check size={14} className="text-gray-400"/> Простые категории (Работа, Дом...)</li>
                                            <li className="flex items-center gap-2"><Check size={14} className="text-gray-400"/> Привычки и Финансы доступны</li>
                                            <li className="flex items-center gap-2"><X size={14} className="text-red-500"/> Нет Дерева Навыков</li>
                                            <li className="flex items-center gap-2"><X size={14} className="text-red-500"/> Нет Квестов</li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={setupStandardMode}
                                        className="w-full py-3 bg-rpg-card border border-rpg-border text-gray-400 font-bold rounded hover:bg-white hover:text-black transition-colors"
                                    >
                                        Выбрать Стандартный
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-rpg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rpg-primary">
                                        <Sword size={32}/>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-4">Продвинутый Режим</h3>
                                    <div className="text-left text-sm text-gray-300 space-y-3 bg-rpg-card p-4 rounded mb-6 border border-rpg-primary/30">
                                        <p>Для тех, кто хочет превратить жизнь в игру и построить сложную систему.</p>
                                        <ul className="space-y-2">
                                            <li className="flex items-center gap-2"><Check size={14} className="text-rpg-primary"/> Древовидная система целей</li>
                                            <li className="flex items-center gap-2"><Check size={14} className="text-rpg-primary"/> Игровые квесты и челленджи</li>
                                            <li className="flex items-center gap-2"><Check size={14} className="text-rpg-primary"/> Глубокая настройка профиля</li>
                                            <li className="flex items-center gap-2"><Clock size={14} className="text-yellow-500"/> Требует 10-15 минут на настройку</li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            dispatch({type: 'SET_APP_MODE', payload: 'advanced'});
                                            setSelectedModeInfo(null);
                                            setStep(2);
                                        }}
                                        className="w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
                                    >
                                        Выбрать Продвинутый
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Advanced Warning */}
                {step === 2 && (
                    <div className="p-8 md:p-12 flex flex-col items-center text-center animate-fade-in h-full justify-center">
                        <Shield size={80} className="text-white mb-6"/>
                        <h2 className="text-2xl md:text-3xl font-bold font-mono text-white mb-4 uppercase tracking-widest">Архитектура Личности</h2>
                        <div className="bg-rpg-card border border-rpg-border p-6 rounded-lg max-w-xl text-left space-y-4 mb-8">
                            <p className="text-white leading-relaxed font-medium">
                                Внимание. Это не просто настройка. Мы строим фундамент вашей жизни.
                            </p>
                            <p className="text-white leading-relaxed">
                                Если подойти к этому неосознанно — система не сработает. Потребуется время и честность с самим собой.
                            </p>
                        </div>
                        <button 
                            onClick={() => setStep(3)}
                            className="bg-white text-black font-bold py-3 px-10 rounded hover:bg-gray-200 transition-transform hover:scale-105 uppercase tracking-widest"
                        >
                            Я готов
                        </button>
                    </div>
                )}

                {/* Step 3: Main Goal */}
                {step === 3 && (
                    <div className="p-8 flex flex-col items-center justify-center h-full animate-fade-in">
                        <Target size={64} className="text-white mb-6"/>
                        <h3 className="text-2xl md:text-3xl font-bold font-mono text-center mb-4 text-white uppercase tracking-widest">Главная Цель</h3>
                        <p className="text-gray-400 text-center mb-8">Ваша Полярная Звезда.</p>
                        <input 
                            className="w-full max-w-lg bg-rpg-card border border-rpg-border p-4 rounded text-xl text-center text-white focus:border-white outline-none mb-8 placeholder-gray-600 transition-colors"
                            placeholder="Например: Стать Senior Developer"
                            value={mainGoal}
                            onChange={e => setMainGoal(e.target.value)}
                            autoFocus
                        />
                        <button 
                            onClick={() => { if(mainGoal) setStep(4); }}
                            disabled={!mainGoal}
                            className={`px-8 py-3 rounded font-bold transition-all ${
                                mainGoal 
                                    ? 'bg-white text-black hover:scale-105' 
                                    : 'bg-rpg-card border border-rpg-border text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Далее <ArrowRight size={16} className="inline ml-2"/>
                        </button>
                    </div>
                )}

                {/* Step 4: Deadline */}
                {step === 4 && (
                    <div className="p-4 md:p-8 flex flex-col items-center justify-center h-full animate-fade-in overflow-y-auto font-sans">
                        <Hourglass size={64} className="text-white mb-4 md:mb-6 shrink-0"/>
                        <h3 className="text-2xl md:text-3xl font-bold font-mono text-center mb-4 text-white shrink-0 uppercase tracking-widest">Временной Горизонт</h3>
                        
                        <div className="mb-8 max-w-lg text-center bg-rpg-card border border-rpg-border p-4 rounded-lg shrink-0">
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                                "При должной дисциплине и усердии, года более чем достаточно, чтобы изменить жизнь до неузнаваемости."
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-2xl mb-8 shrink-0">
                            {[1, 2, 3, 4, 5].map(y => (
                                <button
                                    key={y}
                                    onClick={() => setYears(y)}
                                    className={`
                                        h-20 md:h-32 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300
                                        ${years === y 
                                            ? 'bg-white text-black border-white shadow-xl scale-105' 
                                            : 'bg-rpg-card border-rpg-border text-white hover:border-white hover:text-gray-300'
                                        }
                                    `}
                                >
                                    <span className="text-2xl md:text-4xl font-bold mb-1">{y}</span>
                                    <span className="text-[10px] md:text-xs uppercase font-mono tracking-widest">{y === 1 ? 'ГОД' : 'ГОДА'}</span>
                                    {y === 5 && <span className="text-[10px] md:text-xs uppercase font-mono tracking-widest">ЛЕТ</span>}
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => { if(years) setStep(5); }}
                            disabled={!years}
                            className={`px-8 py-3 rounded font-bold transition-all uppercase tracking-widest shrink-0 ${
                                years 
                                    ? 'bg-white text-black hover:bg-gray-200' 
                                    : 'bg-rpg-card border border-rpg-border text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Далее
                        </button>
                    </div>
                )}

                {/* Step 5: Pillars */}
                {step === 5 && (
                    <div className="p-8 flex flex-col items-center justify-center h-full animate-fade-in">
                        <Brain size={64} className="text-white mb-6"/>
                        <h3 className="text-2xl md:text-3xl font-bold font-mono text-center mb-4 text-white uppercase tracking-widest">Опоры Цели</h3>
                        <p className="text-gray-400 text-center mb-8">Разбейте цель на 4 ключевых направления.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                            {pillars.map((p, i) => (
                                <div key={i} className="relative group">
                                    <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l" style={{backgroundColor: COLORS[i]}}></div>
                                    <input 
                                        className="w-full bg-rpg-card border border-rpg-border p-3 pl-5 rounded text-white focus:border-white outline-none"
                                        placeholder={`Этап ${i + 1}`}
                                        value={p}
                                        onChange={e => {
                                            const newP = [...pillars];
                                            newP[i] = e.target.value;
                                            setPillars(newP);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => { 
                                if(pillars.every(p => p.trim())) {
                                    initBlueprint();
                                    setStep(6); 
                                }
                            }}
                            className="bg-white text-black font-bold py-3 px-8 rounded hover:bg-gray-200 transition-all"
                        >
                            Построить Карту <ArrowRight size={16} className="inline ml-2"/>
                        </button>
                    </div>
                )}

                {/* Step 6: Interactive Builder */}
                {step === 6 && blueprint && (
                    <div className="flex flex-col h-full animate-fade-in">
                        <div className="p-6 border-b border-rpg-border bg-rpg-card flex flex-col justify-center items-center text-center shrink-0">
                            <h3 className="text-2xl md:text-3xl font-bold font-mono text-white flex items-center gap-2 mb-2 uppercase tracking-widest">
                                <Clock size={32} className="text-white"/> Карта Целей
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                                Детализируйте план. Добавьте конкретные шаги. Вы всегда сможете отредактировать это дерево позже.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-rpg-bg">
                            <div className="max-w-3xl mx-auto">
                                <BuilderNode 
                                    node={blueprint} 
                                    expandedNodes={expandedNodes}
                                    toggleExpand={toggleExpand}
                                    updateName={updateName}
                                    addChild={addChild}
                                    deleteNode={deleteNode}
                                />
                            </div>
                        </div>

                        {/* Footer Launch Button */}
                        <div className="p-6 border-t border-rpg-border bg-rpg-card flex justify-center">
                            <button 
                                onClick={finishOnboarding}
                                className="bg-white text-black px-8 py-3 rounded font-bold shadow-lg hover:bg-gray-200 transition-all flex items-center gap-2 uppercase tracking-widest"
                            >
                                <Check size={18}/> Запуск Системы
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnboardingWizard;