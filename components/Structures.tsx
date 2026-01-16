import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { StructureNode, StructureCondition, Task, StructureMap, MapRole } from '../types';
import { Plus, X, Trash2, Link as LinkIcon, Save, Edit2, GripHorizontal, RefreshCcw, Calendar, Check, Tag, CheckSquare, Wallet, Target, HelpCircle, Map, Layout, ChevronDown, Lock, ArrowLeft, LayoutGrid, Users, UserPlus, Crown, Mail, UserX, Shield, Eye, RotateCcw, Image as ImageIcon, Briefcase } from 'lucide-react';
import { playSound } from '../utils/audio';
import { format, parseISO } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import TaskCreatorModal from './TaskCreatorModal';
import CalendarPicker from './CalendarPicker';
import GoalCreatorModal from './GoalCreatorModal';
import { GlobalMapDB } from '../utils/gameLogic';

// --- GEOMETRY HELPERS FOR ARROW TO EDGE ---
const getNodeEdgePoint = (x1: number, y1: number, w1: number, h1: number, x2: number, y2: number) => {
    const cx1 = x1 + w1 / 2;
    const cy1 = y1 + h1 / 2;
    const dx = x2 - cx1;
    const dy = y2 - cy1;
    if (dx === 0 && dy === 0) return { x: cx1, y: cy1 };
    const hw = w1 / 2;
    const hh = h1 / 2;
    const m = dy / dx;
    let ix, iy;
    if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
        ix = dx > 0 ? cx1 + hw : cx1 - hw;
        iy = cy1 + m * (ix - cx1);
    } else {
        iy = dy > 0 ? cy1 + hh : cy1 - hh;
        ix = cx1 + (iy - cy1) / m;
    }
    return { x: ix, y: iy };
};

const getBezierPathToEdge = (node1: StructureNode, node2: StructureNode | { x: number, y: number, width: number, height: number }) => {
    const n2w = 'width' in node2 ? node2.width : 0;
    const n2h = 'height' in node2 ? node2.height : 0;
    const start = getNodeEdgePoint(node1.x, node1.y, node1.width, node1.height, node2.x + n2w/2, node2.y + n2h/2);
    const end = getNodeEdgePoint(node2.x, node2.y, n2w, n2h, node1.x + node1.width/2, node1.y + node1.height/2);
    const dx = Math.abs(end.x - start.x);
    const cp1x = start.x + dx * 0.5;
    const cp1y = start.y;
    const cp2x = end.x - dx * 0.5;
    const cp2y = end.y;
    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
};

const Structures: React.FC = () => {
    const { state, dispatch } = useGame();
    const location = useLocation();
    const navigate = useNavigate();
    
    // View State
    const [viewMode, setViewMode] = useState<'gallery' | 'canvas'>(location.state?.focusNodeId ? 'canvas' : 'gallery');
    
    // Map State
    const [currentMapId, setCurrentMapId] = useState<string>('');
    const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Board State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

    // Interaction State
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [connectionMousePos, setConnectionMousePos] = useState({ x: 0, y: 0 });
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    
    // Modals
    const [editNode, setEditNode] = useState<StructureNode | null>(null);
    const [newMapName, setNewMapName] = useState('');
    const [creatingMap, setCreatingMap] = useState(false);
    
    // Rename/Edit Map
    const [isRenamingMap, setIsRenamingMap] = useState(false);
    const [renameMapTitle, setRenameMapTitle] = useState('');
    const [renameMapAvatar, setRenameMapAvatar] = useState('');
    const mapFileRef = useRef<HTMLInputElement>(null);

    // Participants Modal
    const [showParticipants, setShowParticipants] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteType, setInviteType] = useState<'friend' | 'virtual'>('friend');
    const [inviteRole, setInviteRole] = useState<MapRole>('viewer'); // Default to subordinate/viewer
    
    // Task Flow
    const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
    const [showTaskWizard, setShowTaskWizard] = useState(false);
    const [showGoalWizard, setShowGoalWizard] = useState(false);
    const [activeConditionId, setActiveConditionId] = useState<string | null>(null); 
    const [pendingTaskBatchConfig, setPendingTaskBatchConfig] = useState<Record<string, number> | null>(null);
    
    const [viewDatesConfig, setViewDatesConfig] = useState<Record<string, number> | null>(null);

    // Menu Navigation State
    const [focusedMapIndex, setFocusedMapIndex] = useState(-1);
    const mapListRef = useRef<HTMLDivElement>(null);

    // Initialize map
    useEffect(() => {
        if (!currentMapId && state.structureMaps.length > 0) {
            setCurrentMapId(state.structureMaps[0].id);
        }
    }, [state.structureMaps, currentMapId]);

    // Handle incoming navigation
    useEffect(() => {
        if (location.state?.focusNodeId) {
            const nodeId = location.state.focusNodeId;
            const node = state.structures.find(n => n.id === nodeId);
            if (node) {
                if (node.mapId && node.mapId !== currentMapId) {
                    setCurrentMapId(node.mapId);
                }
                setViewMode('canvas');
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const nodeCenterX = node.x + node.width / 2;
                const nodeCenterY = node.y + node.height / 2;
                const newPanX = centerX - (nodeCenterX * scale);
                const newPanY = centerY - (nodeCenterY * scale);
                setPan({ x: newPanX, y: newPanY });
                setEditNode(node);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, state.structures, scale, navigate, location.pathname, currentMapId]);

    const isAdvanced = state.user?.appMode === 'advanced';
    const invites = state.user?.structureInvites || [];

    // Filtered Data
    const myMaps = state.structureMaps.filter(m => 
        m.ownerId === state.user?.username || (m.members && m.members.includes(state.user?.username || ''))
    );

    // KEYBOARD NAVIGATION FOR MENU
    useEffect(() => {
        if (isMapMenuOpen) {
            const idx = myMaps.findIndex(m => m.id === currentMapId);
            setFocusedMapIndex(idx >= 0 ? idx : 0);
        }
    }, [isMapMenuOpen, currentMapId, myMaps]);

    useEffect(() => {
        if (!isMapMenuOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedMapIndex(prev => (prev + 1) % myMaps.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedMapIndex(prev => (prev - 1 + myMaps.length) % myMaps.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedMapIndex >= 0 && myMaps[focusedMapIndex]) {
                    setCurrentMapId(myMaps[focusedMapIndex].id);
                    setIsMapMenuOpen(false);
                    playSound('click');
                }
            } else if (e.key === 'Escape') {
                setIsMapMenuOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMapMenuOpen, myMaps, focusedMapIndex]);

    useEffect(() => {
        if (isMapMenuOpen && mapListRef.current) {
            const activeItem = mapListRef.current.children[focusedMapIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedMapIndex, isMapMenuOpen]);


    const currentNodes = state.structures.filter(s => s.mapId === currentMapId);
    const currentConnections = state.structureConnections.filter(c => c.mapId === currentMapId);
    const currentMap = state.structureMaps.find(m => m.id === currentMapId);
    
    // --- PERMISSION LOGIC ---
    const isOwner = currentMap?.ownerId === state.user?.username;
    const myRole = currentMap?.roles?.[state.user?.username || ''] || 'viewer';
    const canEditStructure = isOwner || myRole === 'editor'; // Can move, connect, resize, delete nodes

    // Helper to check if current user can edit a specific node content
    const canEditNode = (node: StructureNode) => {
        if (canEditStructure) return true; // Editors/Owners can edit everything
        // Subordinates can only edit if assigned
        return node.assignees?.includes(state.user?.username || '');
    };

    // --- MANUAL REFRESH (Simulating Real-Time) ---
    const handleRefresh = () => {
        if (!state.user) return;
        dispatch({ type: 'LOAD_GAME', payload: state });
        playSound('click');
    };

    // --- LOGIC ---
    const handleAddMap = () => {
        if (!newMapName.trim()) return;
        const newMap: StructureMap = {
            id: `map_${Date.now()}`,
            title: newMapName,
            ownerId: state.user?.username
        };
        dispatch({ type: 'ADD_STRUCTURE_MAP', payload: newMap });
        setCurrentMapId(newMap.id);
        setViewMode('canvas');
        setCreatingMap(false);
        setNewMapName('');
    };

    const handleDeleteMap = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.structureMaps.length <= 1) {
            alert("Нельзя удалить последнюю карту.");
            return;
        }
        if (window.confirm("Удалить карту? Все узлы на ней будут удалены.")) {
            dispatch({ type: 'DELETE_STRUCTURE_MAP', payload: id });
            if (currentMapId === id) {
                setCurrentMapId(state.structureMaps[0].id);
            }
        }
    };

    const handleSaveMapEdit = () => {
        if (currentMap && renameMapTitle.trim()) {
            dispatch({
                type: 'UPDATE_STRUCTURE_MAP',
                payload: { ...currentMap, title: renameMapTitle, avatar: renameMapAvatar }
            });
            setIsRenamingMap(false);
            setRenameMapTitle('');
            setRenameMapAvatar('');
        }
    };

    const handleMapAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setRenameMapAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInvite = () => {
        if (!currentMapId || !inviteUsername) return;
        
        dispatch({
            type: 'INVITE_TO_MAP',
            payload: {
                mapId: currentMapId,
                targetUsername: inviteUsername,
                isVirtual: inviteType === 'virtual',
                role: inviteRole
            }
        });
        setInviteUsername('');
        playSound('success');
    };

    const handleRemoveMember = (username: string) => {
        if (confirm(`Удалить участника ${username}?`)) {
            dispatch({
                type: 'REMOVE_MAP_MEMBER',
                payload: { mapId: currentMapId, username }
            });
        }
    };

    const toggleNodeAssignee = (username: string) => {
        if (!editNode) return;
        const currentAssignees = editNode.assignees || [];
        let newAssignees;
        if (currentAssignees.includes(username)) {
            newAssignees = currentAssignees.filter(u => u !== username);
        } else {
            newAssignees = [...currentAssignees, username];
        }
        setEditNode({ ...editNode, assignees: newAssignees });
    };

    // --- GRAPH LOGIC ---
    const calculateProgress = (node: StructureNode, visitedIds = new Set<string>()): number => {
        if (!node.conditions || node.conditions.length === 0) return 0;
        if (visitedIds.has(node.id)) return 0;
        const newVisited = new Set(visitedIds).add(node.id);
        let totalProgress = 0;
        node.conditions.forEach(cond => {
            let condProgress = 0;
            if (cond.type === 'node' && cond.targetId) {
                const target = state.structures.find(s => s.id === cond.targetId);
                if (target) {
                    const targetProg = calculateProgress(target, newVisited);
                    condProgress = Math.min(100, (targetProg / cond.value) * 100);
                }
            } else if (cond.type === 'balance') {
                const totalAssets = state.assets.reduce((acc, a) => acc + a.value, 0);
                const netIncome = state.transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
                const balance = totalAssets + netIncome;
                condProgress = Math.min(100, (balance / Math.max(1, cond.value)) * 100);
            } else if (cond.type === 'task') {
                const linkedTasks = state.tasks.filter(t => t.linkedConditionId === cond.id || (!t.linkedConditionId && t.linkedNoteId === node.id));
                const completed = linkedTasks.filter(t => t.completed).length;
                condProgress = linkedTasks.length > 0 ? Math.min(100, (completed / Math.max(1, cond.value)) * 100) : 0;
            } else if (cond.type === 'checklist') {
                condProgress = cond.value === 1 ? 100 : 0;
            }
            totalProgress += condProgress;
        });
        return Math.min(100, Math.round(totalProgress / node.conditions.length));
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const newScale = Math.max(0.2, Math.min(3, scale - e.deltaY * 0.001));
            setScale(newScale);
        } else {
            setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleCanvasDoubleClick = (e: React.MouseEvent) => {
        if (!canEditStructure) return; // Restricted users can't add nodes
        if (e.button !== 0) return;
        const locX = (e.nativeEvent.offsetX - pan.x) / scale;
        const locY = (e.nativeEvent.offsetY - pan.y) / scale;
        const newNode: StructureNode = {
            id: `struct_${Date.now()}`,
            title: 'Новый Узел',
            description: '',
            color: '#000000',
            skillId: '',
            x: locX - 90, y: locY - 60, width: 180, height: 120,
            conditions: [],
            mapId: currentMapId,
            assignees: []
        };
        dispatch({ type: 'ADD_STRUCTURE', payload: newNode });
        playSound('click');
    };

    const handleBgMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) {
            if (connectingNodeId) { setConnectingNodeId(null); return; }
            if (selectedConnectionId) { setSelectedConnectionId(null); return; }
            if (!draggingNodeId && !resizingNodeId) {
                setIsPanning(true);
                setLastMouse({ x: e.clientX, y: e.clientY });
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMouse.x;
            const dy = e.clientY - lastMouse.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMouse({ x: e.clientX, y: e.clientY });
        }
        const locX = (e.nativeEvent.offsetX - pan.x) / scale;
        const locY = (e.nativeEvent.offsetY - pan.y) / scale;

        if (draggingNodeId && canEditStructure) {
            const node = state.structures.find(n => n.id === draggingNodeId);
            if (node) dispatch({ type: 'UPDATE_STRUCTURE', payload: { ...node, x: locX - node.width/2, y: locY - node.height/2 } });
        }
        if (resizingNodeId && canEditStructure) {
            const node = state.structures.find(n => n.id === resizingNodeId);
            if (node) dispatch({ type: 'UPDATE_STRUCTURE', payload: { ...node, width: Math.max(100, locX - node.x), height: Math.max(60, locY - node.y) } });
        }
        if (connectingNodeId && canEditStructure) setConnectionMousePos({ x: locX, y: locY });
    };

    const handleMouseUp = () => { setIsPanning(false); setDraggingNodeId(null); setResizingNodeId(null); };

    const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!canEditStructure && connectingNodeId) { setConnectingNodeId(null); return; } // Viewers can't connect

        if (connectingNodeId) {
            if (connectingNodeId !== id) {
                const exists = state.structureConnections.some(c => (c.fromId === connectingNodeId && c.toId === id) || (c.fromId === id && c.toId === connectingNodeId));
                if (!exists) {
                    dispatch({ type: 'ADD_STRUCTURE_CONNECTION', payload: { id: `conn_${Date.now()}`, fromId: connectingNodeId, toId: id, mapId: currentMapId } });
                    const sourceNode = state.structures.find(s => s.id === connectingNodeId);
                    if (sourceNode) dispatch({ type: 'UPDATE_STRUCTURE', payload: { ...sourceNode, conditions: [...sourceNode.conditions, { id: `cond_auto_${Date.now()}`, type: 'node', targetId: id, value: 100 }] } });
                    playSound('success');
                } else playSound('fail');
                setConnectingNodeId(null);
            }
            return;
        }
        if (canEditStructure) setDraggingNodeId(id);
    };

    const handleDeleteConnection = () => {
        if (!canEditStructure) return;
        if (selectedConnectionId) { dispatch({ type: 'DELETE_STRUCTURE_CONNECTION', payload: selectedConnectionId }); setSelectedConnectionId(null); playSound('click'); }
    };

    // Task Creators Handlers
    const startTaskCreationFlow = (condId: string) => { setActiveConditionId(condId); setCalendarPickerOpen(true); };
    const startGoalCreationFlow = (condId: string) => { setActiveConditionId(condId); setShowGoalWizard(true); };
    const handleCalendarConfirm = (dates: Record<string, number>) => { setPendingTaskBatchConfig(dates); setCalendarPickerOpen(false); setShowTaskWizard(true); };
    const handleTaskCreated = (createdTasks: Task[]) => {
        if (activeConditionId && editNode && createdTasks.length > 0) {
             const updatedConditions = editNode.conditions.map(c => c.id === activeConditionId ? { ...c, value: Math.max(c.value, createdTasks.length) } : c);
            setEditNode({ ...editNode, conditions: updatedConditions });
            setShowTaskWizard(false); setActiveConditionId(null); setPendingTaskBatchConfig(null);
        }
    };
    const handleGoalCreated = (goal: Task) => {
        if (activeConditionId && editNode) {
            const updatedConditions = editNode.conditions.map(c => c.id === activeConditionId ? { ...c, value: Math.max(c.value, 1) } : c);
            setEditNode({ ...editNode, conditions: updatedConditions });
            setShowGoalWizard(false); setActiveConditionId(null);
        }
    };
    const handleViewDates = (condId: string) => {
        const tasks = state.tasks.filter(t => t.linkedConditionId === condId);
        const dates: Record<string, number> = {};
        tasks.forEach(t => { if (t.date) dates[t.date] = (dates[t.date] || 0) + 1; });
        setViewDatesConfig(dates);
    };
    const getTaskLabel = (condId: string) => {
        const tasks = state.tasks.filter(t => t.linkedConditionId === condId);
        if (tasks.length === 0) return 'Нет привязанных задач';
        return tasks.length === 1 ? tasks[0].title : `${tasks[0].title} (+${tasks.length - 1})`;
    };
    const getTaskCount = (condId: string) => state.tasks.filter(t => t.linkedConditionId === condId).length;

    // --- HELPER COMPONENT: MEMBER AVATARS ---
    const MemberAvatars = ({ map, limit = 3 }: { map: StructureMap, limit?: number }) => {
        const allMembers = [map.ownerId, ...(map.members || [])].filter(Boolean) as string[];
        const uniqueMembers = Array.from(new Set(allMembers));
        
        return (
            <div className="flex -space-x-2">
                {uniqueMembers.slice(0, limit).map((m, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border border-rpg-panel bg-rpg-card flex items-center justify-center text-[10px] font-bold text-white uppercase relative" title={m}>
                        {m.charAt(0)}
                    </div>
                ))}
                {uniqueMembers.length > limit && (
                    <div className="w-6 h-6 rounded-full border border-rpg-panel bg-gray-700 flex items-center justify-center text-[8px] text-white">
                        +{uniqueMembers.length - limit}
                    </div>
                )}
            </div>
        );
    };

    // --- RENDER ---

    // 1. GALLERY VIEW
    if (viewMode === 'gallery') {
        return (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <LayoutGrid className="text-white"/> Архитектор Систем
                    </h2>
                </div>

                {/* INVITES SECTION */}
                {invites.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Mail size={16}/> Приглашения ({invites.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {invites.map(invite => (
                                <div key={invite.id} className="bg-rpg-panel border border-rpg-primary/50 rounded-xl p-4 flex items-center justify-between shadow-[0_0_10px_rgba(0,209,193,0.1)]">
                                    <div>
                                        <h4 className="font-bold text-white">{invite.mapTitle}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>Пригласил: <span className="text-rpg-primary">{invite.inviter}</span></span>
                                            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] uppercase">{invite.role === 'editor' ? 'Редактор' : 'Участник'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { dispatch({type: 'ACCEPT_MAP_INVITE', payload: invite}); playSound('success'); }}
                                            className="p-2 bg-rpg-primary rounded-full text-black hover:scale-110 transition-transform" title="Принять"
                                        >
                                            <Check size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => { dispatch({type: 'REJECT_MAP_INVITE', payload: invite.id}); playSound('click'); }}
                                            className="p-2 bg-white rounded-full text-black hover:bg-gray-200 hover:scale-110 transition-transform" title="Отклонить"
                                        >
                                            <X size={16}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-10">
                    
                    {/* CREATE CARD */}
                    <button 
                        onClick={() => { if(isAdvanced) setCreatingMap(true); else alert('В Продвинутом режиме можно создавать неограниченное количество карт.'); }}
                        className={`bg-rpg-panel border-2 border-dashed border-rpg-border rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white hover:bg-rpg-card transition-all min-h-[150px] group ${!isAdvanced ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <div className="w-12 h-12 rounded-full bg-rpg-card group-hover:bg-white group-hover:text-black flex items-center justify-center mb-3 transition-colors">
                            <Plus size={24}/>
                        </div>
                        <span className="font-bold text-sm">Новая Карта</span>
                    </button>

                    {/* Maps List */}
                    {myMaps.map(map => {
                        const isOwner = map.ownerId === state.user?.username;
                        const myRole = map.roles?.[state.user?.username || ''];
                        
                        return (
                            <div 
                                key={map.id} 
                                onClick={() => { setCurrentMapId(map.id); setViewMode('canvas'); }}
                                className="bg-rpg-panel border border-rpg-border hover:border-white hover:bg-rpg-card/50 rounded-xl p-5 cursor-pointer transition-all group relative flex flex-col min-h-[150px]"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    {/* Avatar or Icon */}
                                    <div className="w-10 h-10 rounded-full border border-rpg-border group-hover:border-white transition-colors relative overflow-hidden bg-rpg-card flex items-center justify-center">
                                        {map.avatar ? (
                                            <img src={map.avatar} alt="Map Logo" className="w-full h-full object-cover"/>
                                        ) : (
                                            <Map size={20} className="text-white"/>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        {/* Role Badge (Fixed) */}
                                        {isOwner ? (
                                            <div className="bg-rpg-primary text-black rounded px-1.5 py-0.5 text-[10px] font-bold h-fit uppercase">ВЛАДЕЛЕЦ</div>
                                        ) : myRole === 'editor' ? (
                                            <div className="bg-blue-500 text-white rounded px-1.5 py-0.5 text-[10px] font-bold h-fit uppercase">РЕДАКТОР</div>
                                        ) : (
                                            <div className="bg-gray-600 text-white rounded px-1.5 py-0.5 text-[10px] font-bold h-fit uppercase">УЧАСТНИК</div>
                                        )}

                                        {isOwner && (
                                            <button 
                                                onClick={(e) => handleDeleteMap(map.id, e)} 
                                                className="text-gray-600 hover:text-red-500 rounded-full hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <h3 className="text-lg font-bold text-white truncate mb-2">{map.title}</h3>
                                <p className="text-xs text-gray-500 line-clamp-3 mb-auto">
                                    {map.description || 'Карта структур и связей.'}
                                </p>

                                {/* Member Avatars in Gallery Card */}
                                <div className="mt-4 pt-3 border-t border-rpg-border flex justify-between items-center">
                                    <MemberAvatars map={map} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // 2. CANVAS VIEW
    return (
        <div className="h-full w-full bg-[#09090b] relative overflow-hidden">
            {/* --- MAP SELECTOR BAR --- */}
            {/* Responsive: top-2/left-2 on mobile, larger gaps on desktop. Flex-wrap to prevent overflow. */}
            <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex gap-1 md:gap-2 items-center flex-wrap max-w-[75%] md:max-w-none">
                <button 
                    onClick={() => setViewMode('gallery')} 
                    className="bg-rpg-panel border border-rpg-border text-gray-400 hover:text-white p-1.5 md:p-2 rounded-lg transition-colors shadow-lg"
                    title="Назад в галерею"
                >
                    <ArrowLeft size={window.innerWidth < 768 ? 16 : 20}/>
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setIsMapMenuOpen(!isMapMenuOpen)}
                        className="bg-rpg-panel border border-rpg-border text-white px-2 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-2 hover:bg-rpg-card transition-colors shadow-lg"
                    >
                        {/* Avatar in Header */}
                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center border border-gray-600">
                            {currentMap?.avatar ? <img src={currentMap.avatar} className="w-full h-full object-cover"/> : <Map size={12} className="text-rpg-primary"/>}
                        </div>
                        <span className="font-bold text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{currentMap?.title || 'Карта'}</span>
                        <ChevronDown size={12}/>
                    </button>
                    
                    {isMapMenuOpen && (
                        <div ref={mapListRef} className="absolute top-full left-0 mt-2 w-56 bg-rpg-panel border border-rpg-border rounded-lg shadow-xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto">
                            {myMaps.map((map, index) => (
                                <div key={map.id} className="flex justify-between items-center group transition-colors">
                                    <button 
                                        onClick={() => { setCurrentMapId(map.id); setIsMapMenuOpen(false); }}
                                        className={`flex-1 text-left px-4 py-2 text-sm flex items-center gap-2 ${
                                            currentMapId === map.id ? 'text-rpg-primary font-bold' : 'text-gray-300'
                                        } ${index === focusedMapIndex ? 'bg-rpg-card' : 'hover:bg-rpg-card'}`}
                                    >
                                        <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                                            {map.avatar ? <img src={map.avatar} className="w-full h-full object-cover"/> : <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>}
                                        </div>
                                        {map.title}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* EDIT BUTTON (Pencil) - Only Owner/Editor */}
                {canEditStructure && (
                    <button 
                        onClick={() => {
                            if (currentMap) {
                                setRenameMapTitle(currentMap.title);
                                setRenameMapAvatar(currentMap.avatar || '');
                                setIsRenamingMap(true);
                            }
                        }}
                        className="bg-rpg-panel border border-rpg-border text-gray-400 hover:text-white p-1.5 md:p-2 rounded-lg transition-colors shadow-lg"
                        title="Настройки карты"
                    >
                        <Edit2 size={window.innerWidth < 768 ? 16 : 20}/>
                    </button>
                )}

                {/* REFRESH BUTTON */}
                <button 
                    onClick={handleRefresh}
                    className="bg-rpg-panel border border-rpg-border text-gray-400 hover:text-white p-1.5 md:p-2 rounded-lg transition-colors shadow-lg ml-1 md:ml-2"
                    title="Обновить (Синхронизация)"
                >
                    <RotateCcw size={window.innerWidth < 768 ? 16 : 20}/>
                </button>
            </div>

            {/* --- TOP RIGHT: PARTICIPANTS --- */}
            {currentMap && (
                // Responsive positioning: tighter on mobile
                <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 flex items-center gap-2">
                    <div 
                        className="bg-rpg-panel border border-rpg-border p-1 md:p-1.5 rounded-lg flex items-center gap-2 shadow-lg cursor-pointer hover:border-white transition-colors"
                        onClick={() => setShowParticipants(true)}
                    >
                        <MemberAvatars map={currentMap} limit={3} />
                        {canEditStructure && <div className="w-px h-4 bg-rpg-border mx-1"></div>}
                        {canEditStructure && <UserPlus size={16} className="text-rpg-primary"/>}
                    </div>
                </div>
            )}

            {/* --- PARTICIPANTS MODAL --- */}
            {showParticipants && currentMap && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowParticipants(false)}>
                    <div className="bg-rpg-panel w-full max-w-md rounded-xl border border-rpg-border shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-rpg-card border-b border-rpg-border flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users size={20}/> Участники</h3>
                            <button onClick={() => setShowParticipants(false)}><X className="text-gray-500 hover:text-white"/></button>
                        </div>
                        
                        <div className="p-6">
                            {/* Member List */}
                            <div className="space-y-3 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
                                {[currentMap.ownerId, ...(currentMap.members || [])].filter(Boolean).map((m, i) => {
                                    const role = currentMap.roles?.[m!] || (m === currentMap.ownerId ? 'editor' : 'viewer');
                                    return (
                                        <div key={i} className="flex justify-between items-center bg-rpg-bg p-2 rounded border border-rpg-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-rpg-card flex items-center justify-center text-xs font-bold text-white uppercase relative">
                                                    {m?.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={m === state.user?.username ? 'text-rpg-primary font-bold text-sm' : 'text-white text-sm'}>
                                                        {m} {m === state.user?.username && '(Вы)'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 uppercase">
                                                        {m === currentMap.ownerId ? 'Владелец' : role === 'editor' ? 'Редактор' : 'Участник'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isOwner && m !== currentMap.ownerId && (
                                                <button onClick={() => handleRemoveMember(m!)} className="text-gray-600 hover:text-red-500 p-1">
                                                    <UserX size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Invite Form (Only Owner/Editor) */}
                            {canEditStructure && (
                                <div className="border-t border-rpg-border pt-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Добавить участника</h4>
                                    <div className="flex bg-rpg-bg rounded p-1 mb-3 border border-rpg-border">
                                        <button onClick={() => setInviteType('friend')} className={`flex-1 py-1 text-xs rounded transition-colors ${inviteType === 'friend' ? 'bg-rpg-card text-white' : 'text-gray-500'}`}>Друг</button>
                                        <button onClick={() => setInviteType('virtual')} className={`flex-1 py-1 text-xs rounded transition-colors ${inviteType === 'virtual' ? 'bg-rpg-card text-white' : 'text-gray-500'}`}>Виртуальный</button>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="text-[10px] text-gray-500 uppercase block mb-1">Роль</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setInviteRole('editor')} className={`flex-1 py-1 text-xs rounded border transition-colors ${inviteRole === 'editor' ? 'bg-rpg-primary text-black border-rpg-primary' : 'bg-transparent border-gray-600 text-gray-400'}`}>Редактор</button>
                                            <button onClick={() => setInviteRole('viewer')} className={`flex-1 py-1 text-xs rounded border transition-colors ${inviteRole === 'viewer' ? 'bg-white text-black border-white' : 'bg-transparent border-gray-600 text-gray-400'}`}>Участник</button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {inviteType === 'friend' ? (
                                            <select 
                                                className="flex-1 bg-rpg-bg border border-rpg-border rounded p-2 text-white text-sm outline-none"
                                                value={inviteUsername}
                                                onChange={e => setInviteUsername(e.target.value)}
                                            >
                                                <option value="">Выберите друга...</option>
                                                {state.user?.friends.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                        ) : (
                                            <input 
                                                className="flex-1 bg-rpg-bg border border-rpg-border rounded p-2 text-white text-sm outline-none"
                                                placeholder="Имя участника..."
                                                value={inviteUsername}
                                                onChange={e => setInviteUsername(e.target.value)}
                                            />
                                        )}
                                        <button 
                                            onClick={handleInvite}
                                            disabled={!inviteUsername}
                                            className="bg-rpg-primary text-black px-4 py-2 rounded font-bold text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus size={18}/>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- HELP / CONTROLS BUTTON --- */}
            {/* Moved UP on mobile (bottom-20) to avoid overlapping the bottom nav bar, kept at bottom-6 for desktop */}
            <div className="absolute bottom-20 right-4 md:bottom-6 md:right-6 z-20">
                <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className="bg-rpg-panel border border-rpg-border text-gray-400 hover:text-white p-2 md:p-3 rounded-full shadow-lg hover:shadow-rpg-primary/20 transition-all hover:scale-110"
                >
                    <HelpCircle size={window.innerWidth < 768 ? 20 : 24}/>
                </button>
                
                {showHelp && (
                    <div className="absolute bottom-full right-0 mb-4 w-64 md:w-72 bg-rpg-panel border border-rpg-border rounded-lg p-4 shadow-2xl animate-fade-in text-sm text-gray-300">
                        <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Layout size={16}/> Управление</h4>
                        <ul className="space-y-1 mb-4 text-xs">
                            <li>• <b>Двойной клик:</b> Создать узел (Редактор)</li>
                            <li>• <b>Драг фона:</b> Перемещение карты</li>
                            <li>• <b>Колесо мыши:</b> Масштаб (с Ctrl)</li>
                            <li>• <b>Тянуть точку:</b> Создать связь (Редактор)</li>
                            <li>• <b>Delete:</b> Удалить связь (Редактор)</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* --- RENAME/EDIT MAP MODAL --- */}
            {isRenamingMap && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-rpg-panel w-full max-w-sm p-6 rounded-xl border border-rpg-border shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Настройки Карты</h3>
                        
                        <div className="flex justify-center mb-4">
                            <div className="relative group cursor-pointer" onClick={() => mapFileRef.current?.click()}>
                                <div className="w-20 h-20 rounded-full border-2 border-rpg-border overflow-hidden bg-black flex items-center justify-center">
                                    {renameMapAvatar ? (
                                        <img src={renameMapAvatar} className="w-full h-full object-cover"/>
                                    ) : (
                                        <ImageIcon size={24} className="text-gray-500"/>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={16} className="text-white"/>
                                </div>
                                <input type="file" ref={mapFileRef} className="hidden" accept="image/*" onChange={handleMapAvatarUpload}/>
                            </div>
                        </div>

                        <input 
                            autoFocus
                            className="w-full bg-rpg-card border border-rpg-border rounded p-2 text-white outline-none focus:border-rpg-primary mb-4"
                            placeholder="Название карты"
                            value={renameMapTitle}
                            onChange={e => setRenameMapTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveMapEdit()}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsRenamingMap(false)} className="px-4 py-2 text-gray-500 hover:text-white text-sm">Отмена</button>
                            <button onClick={handleSaveMapEdit} className="px-6 py-2 bg-rpg-primary text-black rounded text-sm font-bold">Сохранить</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <svg 
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleBgMouseDown}
                onDoubleClick={handleCanvasDoubleClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            >
                <defs>
                    <pattern id="grid" width={40 * scale} height={40 * scale} patternUnits="userSpaceOnUse" x={pan.x} y={pan.y}>
                        <path d={`M ${40 * scale} 0 L 0 0 0 ${40 * scale}`} fill="none" stroke="#18181b" strokeWidth="1"/>
                    </pattern>
                    <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#71717a" />
                    </marker>
                    <marker id="arrowhead-selected" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <polygon points="0 0, 6 3, 0 6" fill="#fff" />
                    </marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                    {currentConnections.map(conn => {
                        const from = currentNodes.find(s => s.id === conn.fromId);
                        const to = currentNodes.find(s => s.id === conn.toId);
                        if (!from || !to) return null;
                        const isSelected = selectedConnectionId === conn.id;
                        const pathD = getBezierPathToEdge(from, to);
                        return (
                            <g key={conn.id} onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(conn.id); }} className="cursor-pointer group">
                                <path d={pathD} stroke="transparent" strokeWidth="15" fill="none" />
                                <path d={pathD} stroke={isSelected ? "#fff" : "#71717a"} strokeWidth={isSelected ? "3" : "1.5"} fill="none" markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"} className="transition-colors duration-200" />
                                {isSelected && canEditStructure && (
                                    <foreignObject x={(from.x + to.x)/2 + (from.width/2)} y={(from.y + to.y)/2 + (from.height/2)} width="30" height="30">
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteConnection(); }} className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"><Trash2 size={12}/></button>
                                    </foreignObject>
                                )}
                            </g>
                        );
                    })}
                    {connectingNodeId && (
                        <line x1={currentNodes.find(s => s.id === connectingNodeId)!.x + currentNodes.find(s => s.id === connectingNodeId)!.width / 2} y1={currentNodes.find(s => s.id === connectingNodeId)!.y + currentNodes.find(s => s.id === connectingNodeId)!.height / 2} x2={connectionMousePos.x} y2={connectionMousePos.y} stroke="#fff" strokeWidth="1" strokeDasharray="4,4" />
                    )}
                    {currentNodes.map(node => {
                        const progress = calculateProgress(node);
                        const fillHeight = (node.height * progress) / 100;
                        const skill = state.skills.find(s => s.id === node.skillId);
                        const categoryColor = skill?.color;
                        const isDefault = !categoryColor; 
                        const activeFillColor = isDefault ? '#71717a' : categoryColor; 
                        const isCompleted = progress === 100;
                        const canInteract = canEditNode(node);

                        return (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} onDoubleClick={(e) => { e.stopPropagation(); if (canInteract) setEditNode(node); }}>
                                <rect 
                                    width={node.width} 
                                    height={node.height} 
                                    rx="8" 
                                    fill="#18181b"
                                    stroke={connectingNodeId === node.id ? '#fff' : isCompleted ? activeFillColor : '#333'} 
                                    strokeWidth={connectingNodeId === node.id ? 2 : isCompleted ? 2 : 1}
                                    className={`shadow-lg transition-colors ${isCompleted ? 'animate-pulse' : ''}`}
                                    style={isCompleted ? { filter: `drop-shadow(0 0 10px ${activeFillColor})` } : {}}
                                />
                                <clipPath id={`clip-${node.id}`}><rect width={node.width} height={node.height} rx="8" /></clipPath>
                                <rect x="0" y={node.height - fillHeight} width={node.width} height={fillHeight} fill={activeFillColor} opacity={0.3} clipPath={`url(#clip-${node.id})`} />
                                
                                <foreignObject x="0" y="0" width={node.width} height={node.height} className="pointer-events-none">
                                    <div className="w-full h-full p-3 flex flex-col justify-between relative">
                                        
                                        <div>
                                            <div className="text-xs font-bold text-white uppercase tracking-wider truncate mb-1 pr-6">{node.title}</div>
                                            {skill && <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mb-1" style={{ backgroundColor: `${skill.color}20`, color: skill.color, border: `1px solid ${skill.color}40` }}><Tag size={8}/> {skill.name}</div>}
                                            {node.description && <div className="text-[9px] text-gray-400 line-clamp-2 leading-tight">{node.description}</div>}
                                        </div>
                                        <div className="text-xl font-bold font-mono text-white text-right drop-shadow-md">{progress}%</div>
                                    </div>
                                </foreignObject>
                                
                                {/* ASSIGNEES - ABSOLUTE POSITION OUTSIDE OF PADDING (FLUSH CORNER) */}
                                {node.assignees && node.assignees.length > 0 && (
                                    <foreignObject x="0" y={node.height - 20} width={node.width} height="20" className="pointer-events-none">
                                        <div className="w-full h-full relative">
                                            <div className="absolute bottom-0 left-0 p-1 bg-black/60 rounded-tr-lg backdrop-blur-sm flex gap-1 pointer-events-auto border-t border-r border-white/10" title="Ответственные">
                                                {node.assignees.map((u, i) => (
                                                    <div key={i} className="w-4 h-4 rounded-full bg-rpg-card flex items-center justify-center text-[8px] font-bold text-white uppercase overflow-hidden border border-white/20">
                                                        {u.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </foreignObject>
                                )}
                                
                                {/* Connection Point - Only if can edit structure */}
                                {canEditStructure && (
                                    <g transform={`translate(${node.width - 20}, 10)`} onClick={(e) => { e.stopPropagation(); setConnectingNodeId(node.id); }} className="cursor-pointer hover:opacity-80">
                                        <circle r="8" fill="#27272a" stroke="#52525b" />
                                        <foreignObject x="-5" y="-5" width="10" height="10" className="pointer-events-none"><LinkIcon size={10} className="text-gray-400"/></foreignObject>
                                    </g>
                                )}
                                
                                {/* Resize Handle - Only if can edit structure */}
                                {canEditStructure && (
                                    <g transform={`translate(${node.width}, ${node.height})`} onMouseDown={(e) => { e.stopPropagation(); setResizingNodeId(node.id); }} className="cursor-se-resize hover:opacity-100 opacity-0 group-hover:opacity-100">
                                        <path d="M-10 0 L0 0 L0 -10 Z" fill="#52525b" />
                                    </g>
                                )}
                            </g>
                        )
                    })}
                </g>
            </svg>

            {/* ... Modals (Edit Node, Create Map, etc) ... */}
            {editNode && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-rpg-panel w-full max-w-lg rounded-xl border border-rpg-border shadow-2xl flex flex-col max-h-[85vh] animate-fade-in relative" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-rpg-border flex justify-between items-center bg-rpg-card rounded-t-xl">
                            <input 
                                className="bg-transparent text-xl font-bold text-white outline-none flex-1 border-b border-transparent focus:border-rpg-primary transition-colors"
                                value={editNode.title}
                                onChange={e => setEditNode({ ...editNode, title: e.target.value })}
                                autoFocus
                            />
                            <button onClick={() => setEditNode(null)} className="hover:bg-white/10 p-1 rounded transition-colors ml-4 text-red-400 hover:text-red-300" title="Закрыть без сохранения"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-rpg-bg">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-mono text-gray-500 mb-1">Описание</label>
                                    <textarea className="w-full bg-black/50 border border-rpg-border rounded p-2 text-white outline-none focus:border-rpg-primary h-20 resize-none text-xs" value={editNode.description} onChange={e => setEditNode({ ...editNode, description: e.target.value })} />
                                </div>
                                
                                {/* ASSIGNEES SECTION */}
                                <div>
                                    <label className="block text-xs font-mono text-gray-500 mb-1">Ответственные</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {editNode.assignees && editNode.assignees.map(u => (
                                            <div key={u} className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded text-xs text-white">
                                                <span>{u}</span>
                                                {canEditStructure && (
                                                    <button onClick={() => toggleNodeAssignee(u)} className="text-gray-500 hover:text-white"><X size={10}/></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {/* Assign Logic (Only Editor/Owner) */}
                                    {canEditStructure && currentMap && (
                                        <div className="relative group inline-block">
                                            <button className="text-xs text-rpg-primary hover:underline flex items-center gap-1"><Plus size={10}/> Назначить</button>
                                            <div className="absolute top-full left-0 mt-1 bg-rpg-card border border-rpg-border rounded shadow-lg p-2 hidden group-hover:block z-50 w-40 max-h-40 overflow-y-auto">
                                                {[currentMap.ownerId, ...(currentMap.members || [])].filter(Boolean).map(m => (
                                                    <button 
                                                        key={m} 
                                                        onClick={() => toggleNodeAssignee(m!)}
                                                        className={`w-full text-left px-2 py-1 text-xs hover:bg-white/10 rounded flex justify-between ${editNode.assignees?.includes(m!) ? 'text-green-400' : 'text-gray-300'}`}
                                                    >
                                                        {m}
                                                        {editNode.assignees?.includes(m!) && <Check size={10}/>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-gray-500 mb-1">Категория</label>
                                    <select 
                                        className="w-full bg-black/50 border border-rpg-border rounded p-2 text-white text-xs outline-none"
                                        value={editNode.skillId || ''}
                                        onChange={e => setEditNode({ ...editNode, skillId: e.target.value })}
                                    >
                                        <option value="">Без категории (Серый)</option>
                                        {state.skills.map(s => <option key={s.id} value={s.id} style={{color: s.color}}>● {s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-rpg-border pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-mono text-rpg-primary uppercase font-bold">Условия</label>
                                    <div className="flex gap-1 flex-wrap justify-end">
                                        <button onClick={() => setEditNode({ ...editNode, conditions: [...editNode.conditions, { id: `c_${Date.now()}`, type: 'node', value: 100 }] })} className="px-2 py-1 bg-gray-800 rounded text-[10px] hover:bg-gray-700 border border-gray-700">+ Узел</button>
                                        <button onClick={() => setEditNode({ ...editNode, conditions: [...editNode.conditions, { id: `c_${Date.now()}`, type: 'task', value: 1 }] })} className="px-2 py-1 bg-gray-800 rounded text-[10px] hover:bg-gray-700 border border-gray-700">+ Задача</button>
                                        <button onClick={() => setEditNode({ ...editNode, conditions: [...editNode.conditions, { id: `c_${Date.now()}`, type: 'checklist', value: 0 }] })} className="px-2 py-1 bg-gray-800 rounded text-[10px] hover:bg-gray-700 border border-gray-700">+ Чекбокс</button>
                                        <button onClick={() => setEditNode({ ...editNode, conditions: [...editNode.conditions, { id: `c_${Date.now()}`, type: 'balance', value: 1000 }] })} className="px-2 py-1 bg-gray-800 rounded text-[10px] hover:bg-gray-700 border border-gray-700">+ Баланс</button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    {editNode.conditions.map(cond => (
                                        <div key={cond.id}>
                                            {/* BALANCE CONDITION SPECIAL UI */}
                                            {cond.type === 'balance' ? (
                                                <div className="bg-green-900/30 border border-green-500/30 rounded p-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Wallet size={16} className="text-green-500"/>
                                                        <input 
                                                            type="number"
                                                            className="bg-transparent text-green-300 font-mono font-bold outline-none w-24"
                                                            value={cond.value}
                                                            onChange={e => {
                                                                const newConds = editNode.conditions.map(c => c.id === cond.id ? { ...c, value: Number(e.target.value) } : c);
                                                                setEditNode({ ...editNode, conditions: newConds });
                                                            }}
                                                        />
                                                    </div>
                                                    <button onClick={() => { const newConds = editNode.conditions.filter(c => c.id !== cond.id); setEditNode({ ...editNode, conditions: newConds }); }}><X size={14} className="text-green-500/50 hover:text-green-500"/></button>
                                                </div>
                                            ) : (
                                                /* STANDARD UI FOR OTHER CONDITIONS */
                                                <div className="bg-black/30 p-2 rounded border border-gray-700 flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {cond.type !== 'checklist' && (
                                                            <span className={`text-[10px] font-bold uppercase px-1.5 rounded w-16 text-center bg-gray-800 text-gray-300`}>
                                                                {cond.type === 'node' ? 'Узел' : 'Задача'}
                                                            </span>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            {cond.type === 'node' ? (
                                                                <div className="flex gap-2 items-center">
                                                                    <select className="flex-1 bg-transparent text-white text-xs outline-none border-b border-gray-700 pb-1" value={cond.targetId || ''} onChange={e => { const newConds = editNode.conditions.map(c => c.id === cond.id ? { ...c, targetId: e.target.value } : c); setEditNode({ ...editNode, conditions: newConds }); }}>
                                                                        <option value="">Выберите узел...</option>
                                                                        {state.structures.filter(s => s.id !== editNode.id).map(s => (<option key={s.id} value={s.id}>{s.title}</option>))}
                                                                    </select>
                                                                    <input type="number" min="1" max="100" className="w-10 bg-black/50 border border-gray-700 rounded text-xs text-center text-white" value={cond.value} onChange={e => { const newConds = editNode.conditions.map(c => c.id === cond.id ? { ...c, value: Number(e.target.value) } : c); setEditNode({ ...editNode, conditions: newConds }); }} />
                                                                    <span className="text-xs text-gray-500">%</span>
                                                                </div>
                                                            ) : cond.type === 'task' ? (
                                                                <div className="flex justify-between items-center text-xs text-gray-400 w-full">
                                                                    {getTaskCount(cond.id) > 0 ? (
                                                                        <div className="flex items-center justify-between w-full">
                                                                            <span className="text-white truncate max-w-[150px]">{getTaskLabel(cond.id)}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-mono text-rpg-primary">{cond.value} шт.</span>
                                                                                <button onClick={() => handleViewDates(cond.id)} className="hover:text-white p-1"><Calendar size={14}/></button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <button onClick={() => startTaskCreationFlow(cond.id)} className="flex items-center gap-1 bg-rpg-primary/20 text-rpg-primary px-3 py-1.5 rounded hover:bg-rpg-primary hover:text-black transition-colors" title="По дням"><Calendar size={12}/> В календарь</button>
                                                                            <button onClick={() => startGoalCreationFlow(cond.id)} className="flex items-center gap-1 bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600 transition-colors" title="Несрочная задача"><Target size={12}/> Без срока</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : cond.type === 'checklist' ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input 
                                                                        className="flex-1 bg-transparent border-b border-gray-700 text-xs text-white pb-1 outline-none" 
                                                                        placeholder="Название условия..." 
                                                                        value={cond.targetId || ''}
                                                                        onChange={e => {
                                                                            const newConds = editNode.conditions.map(c => c.id === cond.id ? { ...c, targetId: e.target.value } : c);
                                                                            setEditNode({ ...editNode, conditions: newConds });
                                                                        }}
                                                                    />
                                                                    <button 
                                                                        onClick={() => {
                                                                            const newConds = editNode.conditions.map(c => c.id === cond.id ? { ...c, value: cond.value === 1 ? 0 : 1 } : c);
                                                                            setEditNode({ ...editNode, conditions: newConds });
                                                                        }}
                                                                        className={`w-5 h-5 rounded border flex items-center justify-center ${cond.value === 1 ? 'bg-rpg-primary border-rpg-primary' : 'border-gray-500'}`}
                                                                    >
                                                                        {cond.value === 1 && <Check size={12} className="text-black"/>}
                                                                    </button>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        <button onClick={() => { const newConds = editNode.conditions.filter(c => c.id !== cond.id); setEditNode({ ...editNode, conditions: newConds }); }}><X size={14} className="text-gray-500 hover:text-red-500"/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-rpg-border bg-rpg-card flex justify-between rounded-b-xl">
                            {canEditStructure && (
                                <button onClick={() => { if(window.confirm('Удалить узел?')) { dispatch({ type: 'DELETE_STRUCTURE', payload: editNode.id }); setEditNode(null); } }} className="text-red-500 flex items-center gap-2 text-sm font-bold"><Trash2 size={16}/> Удалить</button>
                            )}
                            <div className="flex-1"></div>
                            <button onClick={() => { dispatch({ type: 'UPDATE_STRUCTURE', payload: editNode }); setEditNode(null); }} className="bg-rpg-primary text-black px-6 py-2 rounded font-bold hover:bg-white text-sm">Сохранить</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {calendarPickerOpen && (<CalendarPicker onClose={() => setCalendarPickerOpen(false)} onConfirm={handleCalendarConfirm} themeColor={state.user?.themeId ? '#00D1C1' : '#00D1C1'} />)}
            
            {showGoalWizard && (
                <GoalCreatorModal 
                    onClose={() => setShowGoalWizard(false)} 
                    onGoalCreated={handleGoalCreated} 
                    linkedStructureId={editNode?.id} 
                    linkedConditionId={activeConditionId || undefined} 
                />
            )}

            {viewDatesConfig && (
                <CalendarPicker 
                    onClose={() => setViewDatesConfig(null)}
                    onConfirm={() => setViewDatesConfig(null)}
                    themeColor="#52525b"
                />
            )}

            {showTaskWizard && (
                <TaskCreatorModal 
                    onClose={() => setShowTaskWizard(false)} 
                    onTaskCreated={handleTaskCreated} 
                    linkedStructureId={editNode?.id} 
                    linkedConditionId={activeConditionId || undefined} 
                    specificDates={pendingTaskBatchConfig || undefined} 
                />
            )}
        </div>
    );
};

export default Structures;