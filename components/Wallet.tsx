import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Asset, Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, PieChart as PieIcon, DollarSign, Building, Bitcoin, Landmark, Briefcase, Settings, Edit2, X, Target, Paperclip, FileImage, Folder, Zap, Filter, Check, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfWeek, endOfWeek, subMonths, isAfter, startOfYear, endOfYear, startOfDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ASSET_TYPES = [
    { type: 'cash', label: 'Наличные', icon: <DollarSign size={16}/> },
    { type: 'bank', label: 'Банк', icon: <Landmark size={16}/> },
    { type: 'crypto', label: 'Крипто', icon: <Bitcoin size={16}/> },
    { type: 'stock', label: 'Акции', icon: <TrendingUp size={16}/> },
    { type: 'real_estate', label: 'Недвижимость', icon: <Building size={16}/> },
    { type: 'other', label: 'Прочее', icon: <Briefcase size={16}/> },
];

const EXPENSE_CATEGORIES = ['Еда', 'Жилье', 'Транспорт', 'Здоровье', 'Отдых', 'Образование', 'Другое'];
const INCOME_CATEGORIES = ['Зарплата', 'Фриланс', 'Подарок', 'Продажа', 'Другое'];

type TimeRange = 'today' | 'week' | 'month' | '3months' | 'year' | 'all';

const WalletPage: React.FC = () => {
    const { state, dispatch } = useGame();
    const [viewMode, setViewMode] = useState<'wallet' | 'assets'>('wallet');
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    
    // Asset Form
    const [assetName, setAssetName] = useState('');
    const [assetValue, setAssetValue] = useState(0);
    const [assetType, setAssetType] = useState('cash');
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    // Goal Setting
    const [incomeGoal, setIncomeGoal] = useState(state.user?.settings.monthlyIncomeGoal || 1000);
    const [showGoalInput, setShowGoalInput] = useState(false);

    // Quick Add Transaction
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [qaAmount, setQaAmount] = useState('');
    const [qaType, setQaType] = useState<'income'|'expense'>('expense');
    const [qaCategory, setQaCategory] = useState(EXPENSE_CATEGORIES[0]);

    // View Receipt Modal
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
    const [showReceiptsFolder, setShowReceiptsFolder] = useState(false);

    // --- CALCULATIONS ---

    // 1. Total Wealth (Global)
    const totalIncomeAll = state.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenseAll = state.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const netIncomeAll = totalIncomeAll - totalExpenseAll;
    const totalAssets = state.assets.reduce((acc, a) => acc + a.value, 0);
    const currentBalance = totalAssets + netIncomeAll; 

    // 2. Filtered Transactions
    const getFilteredTransactions = () => {
        const now = new Date();
        let start: Date, end: Date;

        if (timeRange === 'today') {
            start = startOfDay(now);
            end = now; 
        } else if (timeRange === 'week') {
            start = startOfWeek(now, { weekStartsOn: 1 });
            end = endOfWeek(now, { weekStartsOn: 1 });
        } else if (timeRange === 'month') {
            start = startOfMonth(now);
            end = endOfMonth(now);
        } else if (timeRange === '3months') {
            start = subMonths(now, 3);
            end = now;
        } else if (timeRange === 'year') {
            start = startOfYear(now);
            end = endOfYear(now);
        } else {
            return state.transactions;
        }

        return state.transactions.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    };

    const filteredTransactions = useMemo(getFilteredTransactions, [timeRange, state.transactions]);

    // 3. Period Stats
    const currentMonthIncome = state.transactions
        .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), {start: startOfMonth(new Date()), end: endOfMonth(new Date())}))
        .reduce((acc, t) => acc + t.amount, 0);
    const goalPercent = Math.min(100, Math.round((currentMonthIncome / incomeGoal) * 100));

    // 4. Pie Chart Data
    const categories = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);
    const pieData = Object.entries(categories).map(([name, value]) => ({ name, value }));
    const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#d946ef', '#6366f1'];

    // 5. Receipts
    const allReceipts = state.transactions.filter(t => t.receiptImage);

    // --- HANDLERS ---

    const handleSaveAsset = (e: React.FormEvent) => {
        e.preventDefault();
        if(!assetName) return;
        
        if (editingAsset) {
            dispatch({ 
                type: 'UPDATE_ASSET', 
                payload: { ...editingAsset, name: assetName, value: Number(assetValue), type: assetType as any } 
            });
            setEditingAsset(null);
        } else {
            const newAsset: Asset = {
                id: `asset_${Date.now()}`,
                name: assetName,
                value: Number(assetValue),
                type: assetType as any,
                currency: 'USD'
            };
            dispatch({ type: 'ADD_ASSET', payload: newAsset });
        }
        setAssetName('');
        setAssetValue(0);
    };

    const startEditAsset = (asset: Asset) => {
        setEditingAsset(asset);
        setAssetName(asset.name);
        setAssetValue(asset.value);
        setAssetType(asset.type);
    };

    const handleSaveGoal = () => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { incomeGoal } });
        setShowGoalInput(false);
    };

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!qaAmount) return;
        dispatch({
            type: 'ADD_TRANSACTION',
            payload: {
                id: `trans_qa_${Date.now()}`,
                amount: Number(qaAmount),
                type: qaType,
                category: qaCategory,
                date: new Date().toISOString(),
                description: 'Быстрая запись'
            }
        });
        setQaAmount('');
        setShowQuickAdd(false);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* TOP NAVIGATION SWITCHER (Smaller) */}
            <div className="flex justify-center mb-4 scale-90 origin-top">
                <div className="flex bg-black/40 border border-gray-800 rounded-lg p-1">
                    <button 
                        onClick={() => setViewMode('wallet')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'wallet' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Кошелек
                    </button>
                    <button 
                        onClick={() => setViewMode('assets')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'assets' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Активы
                    </button>
                </div>
            </div>

            {viewMode === 'wallet' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* 1. TIME FILTER (Hidden/Subtle) */}
                    <div className="flex justify-center overflow-x-auto gap-1 no-scrollbar opacity-60 hover:opacity-100 transition-opacity">
                        {(['today', 'week', 'month', '3months', 'year', 'all'] as TimeRange[]).map(r => (
                            <button 
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap border transition-colors ${timeRange === r ? 'text-white border-gray-600 bg-gray-800' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                            >
                                {r === 'today' ? 'Сегодня' : r === 'week' ? 'Неделя' : r === 'month' ? 'Месяц' : r === '3months' ? '3 Мес' : r === 'year' ? 'Год' : 'Все'}
                            </button>
                        ))}
                    </div>

                    {/* 2. FINANCIAL GOAL (Prettier & Larger) */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={100} className="text-white"/></div>
                        <div className="flex justify-between items-end mb-3 relative z-10">
                            <div>
                                <div className="text-sm font-bold text-gray-400 mb-1 flex items-center gap-2 uppercase tracking-wider">
                                    <Target size={16} className="text-rpg-primary"/> Цель (Месяц)
                                    {showGoalInput ? (
                                        <div className="flex items-center gap-1 ml-2">
                                            <input className="w-20 bg-black border border-gray-600 text-white text-sm px-1 rounded" type="number" value={incomeGoal} onChange={e => setIncomeGoal(Number(e.target.value))}/>
                                            <button onClick={handleSaveGoal} className="text-green-500 hover:text-green-400"><Check size={16}/></button>
                                        </div>
                                    ) : (
                                        <Edit2 size={12} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => setShowGoalInput(true)}/>
                                    )}
                                </div>
                                <div className="text-2xl font-black text-white tracking-tight mt-1">
                                    {currentMonthIncome.toLocaleString()} <span className="text-gray-600 text-lg font-normal">/ {incomeGoal.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className={`text-3xl font-black ${goalPercent >= 100 ? 'text-green-400' : 'text-white'}`}>{goalPercent}%</div>
                        </div>
                        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-gray-700 relative z-10">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 transition-all duration-1000 shadow-[0_0_15px_rgba(236,72,153,0.5)]" 
                                style={{width: `${goalPercent}%`}}
                            ></div>
                        </div>
                    </div>

                    {/* 3. TOTAL BALANCE + QUICK ADD */}
                    <div className="flex flex-col items-center justify-center gap-6 py-4">
                        <div className="text-center">
                            <div className="text-xs text-gray-500 uppercase font-mono mb-2 tracking-widest">Общий Баланс</div>
                            <div className="text-6xl md:text-7xl font-black text-white tracking-tighter shadow-black drop-shadow-2xl">
                                {currentBalance.toLocaleString()}
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowQuickAdd(!showQuickAdd)}
                            className="bg-white text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform active:scale-95 text-sm uppercase tracking-wide"
                        >
                            <Zap size={18} fill="black"/> Операция
                        </button>
                    </div>

                    {/* Quick Add Form (Collapsible) */}
                    {showQuickAdd && (
                        <div className="bg-rpg-card border border-rpg-border p-4 rounded-lg animate-fade-in mx-auto max-w-md w-full">
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => setQaType('expense')} className={`flex-1 py-2 text-xs font-bold rounded uppercase ${qaType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-500'}`}>Расход</button>
                                <button onClick={() => setQaType('income')} className={`flex-1 py-2 text-xs font-bold rounded uppercase ${qaType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-500'}`}>Доход</button>
                            </div>
                            <div className="flex gap-2">
                                <input type="number" className="flex-1 bg-black border border-gray-700 rounded px-3 text-white outline-none focus:border-white" placeholder="Сумма" value={qaAmount} onChange={e => setQaAmount(e.target.value)} autoFocus/>
                                <select className="bg-black border border-gray-700 rounded px-2 text-white outline-none text-xs w-24" value={qaCategory} onChange={e => setQaCategory(e.target.value)}>
                                    {(qaType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={handleQuickAdd} className="bg-white text-black px-4 rounded font-bold hover:bg-gray-200"><Check size={18}/></button>
                            </div>
                        </div>
                    )}

                    {/* 4. HISTORY */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-gray-800 pb-2">
                            <Clock size={12}/> История Операций
                        </h3>
                        <div className="space-y-2">
                            {filteredTransactions.length === 0 && <div className="text-center text-gray-600 text-xs py-4">Нет операций за этот период</div>}
                            {filteredTransactions.slice().reverse().map(t => (
                                <div key={t.id} className="bg-transparent border-b border-gray-800 p-3 flex justify-between items-center group hover:bg-white/5 transition-colors rounded">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {t.type === 'income' ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                {t.category}
                                                {t.receiptImage && <Paperclip size={10} className="text-gray-500"/>}
                                            </div>
                                            <div className="text-[10px] text-gray-500">{format(parseISO(t.date), 'dd MMM')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-mono font-bold text-lg ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'income' ? '+' : '-'}{t.amount}
                                        </span>
                                        <button onClick={() => dispatch({type: 'DELETE_TRANSACTION', payload: t.id})} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. RECEIPTS FOLDER */}
                    <div 
                        onClick={() => setShowReceiptsFolder(!showReceiptsFolder)}
                        className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Folder size={18} className="text-yellow-600 fill-yellow-600/20"/>
                            <span className="font-bold text-gray-300 text-sm">Чеки и Документы</span>
                        </div>
                        <span className="text-xs text-gray-500">{allReceipts.length} файлов</span>
                    </div>

                    {/* Receipts Expanded */}
                    {showReceiptsFolder && (
                        <div className="grid grid-cols-3 gap-2 animate-fade-in">
                            {allReceipts.length === 0 && <div className="text-gray-500 text-xs col-span-3 text-center py-2">Пусто</div>}
                            {allReceipts.map(t => (
                                <div key={t.id} onClick={() => setViewingReceipt(t.receiptImage!)} className="aspect-square bg-black rounded border border-gray-800 overflow-hidden cursor-pointer hover:border-white transition-colors relative">
                                    <img src={t.receiptImage} className="w-full h-full object-cover"/>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white p-1 text-center truncate">{t.category}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 6. ANALYTICS */}
                    <div className="pt-4 border-t border-rpg-border">
                        <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                            <PieIcon size={12}/> Структура Расходов
                        </h3>
                        <div className="h-48 w-full bg-rpg-panel border border-rpg-border rounded-lg p-2">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none"/>
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '12px'}} itemStyle={{color: '#fff'}}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 text-xs">Нет данных</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'assets' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-rpg-panel p-6 rounded-lg border border-rpg-border shadow-lg text-center">
                        <div className="text-xs text-gray-500 uppercase mb-1">Суммарная Оценка</div>
                        <div className="text-4xl font-black text-white font-mono">{totalAssets.toLocaleString()}</div>
                    </div>

                    <div className="space-y-3">
                        {state.assets.map(asset => (
                            <div key={asset.id} className="bg-rpg-panel p-4 rounded-lg border border-rpg-border flex justify-between items-center group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-rpg-card rounded-full text-rpg-primary border border-rpg-border">
                                        {ASSET_TYPES.find(t => t.type === asset.type)?.icon || <DollarSign size={16}/>}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{asset.name}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase">{ASSET_TYPES.find(t => t.type === asset.type)?.label}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-white text-lg">{asset.value.toLocaleString()}</span>
                                    <button onClick={() => startEditAsset(asset)} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 size={14}/>
                                    </button>
                                    <button onClick={() => dispatch({type: 'DELETE_ASSET', payload: asset.id})} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-rpg-card border border-rpg-border p-4 rounded-lg">
                        <h3 className="font-bold text-white text-sm mb-3">{editingAsset ? 'Изменить актив' : 'Новый актив'}</h3>
                        <form onSubmit={handleSaveAsset} className="space-y-3">
                            <input className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-white" value={assetName} onChange={e => setAssetName(e.target.value)} required placeholder="Название"/>
                            <input type="number" className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-white" value={assetValue} onChange={e => setAssetValue(Number(e.target.value))} required placeholder="Стоимость"/>
                            <div className="grid grid-cols-3 gap-2">
                                {ASSET_TYPES.map(t => (
                                    <button 
                                        key={t.type}
                                        type="button"
                                        onClick={() => setAssetType(t.type)}
                                        className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${assetType === t.type ? 'bg-white text-black border-white' : 'bg-transparent border-gray-700 text-gray-500'}`}
                                    >
                                        {t.icon}
                                        <span className="text-[8px] mt-1">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                {editingAsset && <button type="button" onClick={() => { setEditingAsset(null); setAssetName(''); setAssetValue(0); }} className="flex-1 bg-gray-800 text-white py-2 rounded text-sm">Отмена</button>}
                                <button type="submit" className="flex-1 bg-rpg-primary text-black font-bold py-2 rounded text-sm hover:bg-white">{editingAsset ? 'Сохранить' : 'Добавить'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Viewer Modal */}
            {viewingReceipt && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingReceipt(null)}>
                    <div className="relative max-w-full max-h-full">
                        <img src={viewingReceipt} className="max-w-full max-h-[90vh] rounded shadow-2xl border border-gray-800"/>
                        <button onClick={() => setViewingReceipt(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-white hover:text-black transition-colors"><X size={24}/></button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;