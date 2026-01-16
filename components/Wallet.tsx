import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Asset, Transaction } from '../types';
import { Wallet, TrendingUp, TrendingDown, Plus, Minus, Trash2, PieChart as PieIcon, DollarSign, Building, Bitcoin, Landmark, Briefcase, Settings, Edit2, X, Target, Paperclip, FileImage, Folder, Zap, Filter, Check, Clock, CreditCard, ArrowUpRight, ArrowDownLeft, BarChart as BarIcon, Scale } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfWeek, endOfWeek, subMonths, isAfter, startOfYear, endOfYear, startOfDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from 'recharts';

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

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

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
    const [isEditingGoal, setIsEditingGoal] = useState(false);

    // Quick Add Transaction
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [qaAmount, setQaAmount] = useState('');
    const [qaType, setQaType] = useState<'income'|'expense'>('expense');
    const [qaCategory, setQaCategory] = useState(EXPENSE_CATEGORIES[0]);

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
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    const currentMonthTransactions = state.transactions.filter(t => isWithinInterval(parseISO(t.date), {start: currentMonthStart, end: currentMonthEnd}));
    const currentMonthIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const currentMonthExpense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    // 4. Asset Allocation for Net Worth
    const assetDistribution = ASSET_TYPES.map(type => ({
        ...type,
        value: state.assets.filter(a => a.type === type.type).reduce((acc, a) => acc + a.value, 0)
    })).filter(a => a.value > 0);

    // 5. Goal Progress
    const goalPercent = Math.min(100, (currentMonthIncome / incomeGoal) * 100);

    // 6. Category Analysis (Financial Health Redesign)
    const getCategoryData = (type: 'income' | 'expense') => {
        const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        const total = type === 'income' ? currentMonthIncome : currentMonthExpense;
        
        return categories.map(cat => {
            const value = currentMonthTransactions
                .filter(t => t.type === type && t.category === cat)
                .reduce((acc, t) => acc + t.amount, 0);
            return { 
                name: cat, 
                value, 
                percent: total > 0 ? (value / total) * 100 : 0 
            };
        }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    };

    const incomeByCategory = getCategoryData('income');
    const expensesByCategory = getCategoryData('expense');

    // 7. Advanced Analytics (Financial Health)
    const savingsRate = currentMonthIncome > 0 ? ((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100 : 0;
    
    // Last 6 Months Cash Flow
    const monthlyFlowData = Array.from({length: 6}).map((_, i) => {
        const d = subMonths(new Date(), 5 - i);
        const start = startOfMonth(d);
        const end = endOfMonth(d);
        const monthLabel = format(d, 'MMM');
        
        const inc = state.transactions
            .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), {start, end}))
            .reduce((acc, t) => acc + t.amount, 0);
        const exp = state.transactions
            .filter(t => t.type === 'expense' && isWithinInterval(parseISO(t.date), {start, end}))
            .reduce((acc, t) => acc + t.amount, 0);
            
        return { name: monthLabel, Доход: inc, Расход: exp };
    });

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

    const handleQuickAdd = (type: 'income' | 'expense') => {
        setQaType(type);
        setQaCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
        setShowQuickAdd(true);
    };

    const submitQuickAdd = (e: React.FormEvent) => {
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
        <div className="max-w-xl mx-auto space-y-8 pb-32">
            {/* --- HEADER TABS --- */}
            <div className="flex bg-black/20 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('wallet')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'wallet' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}
                >
                    Финансы
                </button>
                <button 
                    onClick={() => setViewMode('assets')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'assets' ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-white'}`}
                >
                    Капитал
                </button>
            </div>

            {viewMode === 'wallet' && (
                <>
                    {/* --- MAIN CARD (BANK STYLE) --- */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 shadow-2xl p-6 h-48 flex flex-col justify-between group">
                        {/* Background Deco */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-[10px] font-mono uppercase tracking-widest mb-1">Total Balance</p>
                                <h2 className="text-4xl font-mono font-bold text-white tracking-tighter">{currentBalance.toLocaleString()}</h2>
                            </div>
                        </div>

                        <div className="relative z-10 flex justify-between items-end">
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><ArrowDownLeft size={10} className="text-green-500"/> Income</p>
                                    <p className="text-sm font-mono text-white font-bold">+{currentMonthIncome.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1"><ArrowUpRight size={10} className="text-red-500"/> Expense</p>
                                    <p className="text-sm font-mono text-white font-bold">-{currentMonthExpense.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-[10px] font-mono text-gray-600">ID: {state.user?.uniqueId.replace('#', '')}</div>
                        </div>
                    </div>

                    {/* --- GOAL PROGRESS --- */}
                    <div className="bg-rpg-panel border border-rpg-border p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Target size={16}/> Цель: Доход
                            </h3>
                            {isEditingGoal ? (
                                 <input 
                                    type="number" 
                                    autoFocus
                                    className="bg-black border border-gray-600 rounded px-2 py-0.5 text-right w-24 text-white text-sm outline-none font-mono"
                                    value={incomeGoal}
                                    onChange={e => setIncomeGoal(Number(e.target.value))}
                                    onBlur={() => {
                                        setIsEditingGoal(false);
                                        dispatch({ type: 'UPDATE_SETTINGS', payload: { incomeGoal } });
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            setIsEditingGoal(false);
                                            dispatch({ type: 'UPDATE_SETTINGS', payload: { incomeGoal } });
                                        }
                                    }}
                                 />
                            ) : (
                                <button onClick={() => setIsEditingGoal(true)} className="text-white font-mono font-bold hover:text-rpg-primary transition-colors text-sm">
                                    {incomeGoal.toLocaleString()} <Edit2 size={12} className="inline ml-1 opacity-50"/>
                                </button>
                            )}
                        </div>
                        
                        <div className="h-3 bg-black rounded-full overflow-hidden border border-rpg-border relative">
                            <div 
                                className="h-full bg-gradient-to-r from-green-900 to-green-500 transition-all duration-1000 relative" 
                                style={{width: `${goalPercent}%`}}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse-fast"></div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-mono text-gray-500">
                            <span>{Math.round(goalPercent)}%</span>
                            <span>{currentMonthIncome.toLocaleString()} / {incomeGoal.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* --- ACTIONS --- */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleQuickAdd('income')}
                            className="bg-rpg-card border border-rpg-border hover:bg-green-900/20 hover:border-green-500/50 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-black transition-colors">
                                <Plus size={20}/>
                            </div>
                            <span className="text-xs font-bold text-gray-300 group-hover:text-white">Пополнить</span>
                        </button>
                        <button 
                            onClick={() => handleQuickAdd('expense')}
                            className="bg-rpg-card border border-rpg-border hover:bg-red-900/20 hover:border-red-500/50 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <Minus size={20}/>
                            </div>
                            <span className="text-xs font-bold text-gray-300 group-hover:text-white">Потратить</span>
                        </button>
                    </div>

                    {/* --- RECENT TRANSACTIONS (MOVED UP) --- */}
                    <div>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h3 className="text-lg font-bold text-white">История</h3>
                            <button className="text-xs text-gray-500 hover:text-white transition-colors">Все</button>
                        </div>
                        
                        <div className="space-y-2">
                            {filteredTransactions.length === 0 && (
                                <div className="text-center py-8 text-gray-600 text-xs border border-dashed border-gray-800 rounded-lg">
                                    Нет операций за этот период
                                </div>
                            )}
                            {filteredTransactions.slice().reverse().slice(0, 20).map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-transparent hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                                            {t.category.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{t.category}</div>
                                            <div className="text-[10px] text-gray-500">{format(parseISO(t.date), 'd MMM, HH:mm')}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono font-bold ${t.type === 'income' ? 'text-green-500' : 'text-white'}`}>
                                            {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                                        </div>
                                        <button 
                                            onClick={(e) => {e.stopPropagation(); dispatch({type: 'DELETE_TRANSACTION', payload: t.id})}} 
                                            className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* --- FINANCIAL HEALTH SECTION (REDESIGNED) --- */}
                    <div className="space-y-6 pt-6 border-t border-rpg-border">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Scale size={24} className="text-rpg-primary"/> Финансовый Отчет
                        </h3>
                        
                        {/* 1. Cash Flow & Savings */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-rpg-card border border-rpg-border p-4 rounded-xl flex flex-col justify-between">
                                <span className="text-xs text-gray-400 font-bold uppercase mb-1">Денежный Поток</span>
                                <div className="h-20 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyFlowData}>
                                            <Bar dataKey="Доход" fill="#10b981" radius={[2, 2, 0, 0]} />
                                            <Bar dataKey="Расход" fill="#ef4444" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-rpg-card border border-rpg-border p-4 rounded-xl flex flex-col justify-center">
                                <span className="text-xs text-gray-400 font-bold uppercase mb-2">Норма Сбережений</span>
                                <span className={`text-3xl font-mono font-bold mb-2 ${savingsRate >= 20 ? 'text-green-500' : savingsRate > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {Math.round(savingsRate)}%
                                </span>
                                <div className="h-1.5 bg-black rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${savingsRate >= 20 ? 'bg-green-500' : savingsRate > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                        style={{width: `${Math.max(0, Math.min(100, savingsRate))}%`}}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Expenses Structure */}
                        <div className="bg-rpg-panel border border-rpg-border p-5 rounded-xl">
                            <h4 className="text-sm font-bold text-red-400 uppercase mb-4 flex items-center gap-2">
                                <TrendingDown size={16}/> Структура Расходов
                            </h4>
                            {expensesByCategory.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">Нет расходов за этот месяц</p>
                            ) : (
                                <div className="space-y-3">
                                    {expensesByCategory.map((cat, i) => (
                                        <div key={cat.name}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white font-medium">{cat.name}</span>
                                                <span className="text-gray-400 font-mono">{cat.value.toLocaleString()} ({Math.round(cat.percent)}%)</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-red-500 rounded-full" 
                                                    style={{width: `${cat.percent}%`, opacity: 1 - (i * 0.15)}}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Income Structure */}
                        <div className="bg-rpg-panel border border-rpg-border p-5 rounded-xl">
                            <h4 className="text-sm font-bold text-green-400 uppercase mb-4 flex items-center gap-2">
                                <TrendingUp size={16}/> Источники Дохода
                            </h4>
                            {incomeByCategory.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">Нет доходов за этот месяц</p>
                            ) : (
                                <div className="space-y-3">
                                    {incomeByCategory.map((cat, i) => (
                                        <div key={cat.name}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-white font-medium">{cat.name}</span>
                                                <span className="text-gray-400 font-mono">{cat.value.toLocaleString()} ({Math.round(cat.percent)}%)</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-green-500 rounded-full" 
                                                    style={{width: `${cat.percent}%`, opacity: 1 - (i * 0.15)}}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {viewMode === 'assets' && (
                <div className="space-y-6">
                    {/* --- NET WORTH CARD --- */}
                    <div className="p-6 rounded-2xl bg-rpg-card border border-rpg-border shadow-lg">
                        <div className="text-gray-500 text-xs uppercase mb-1 font-bold tracking-wider">Капитал</div>
                        <div className="text-3xl font-mono font-bold text-white mb-6">{totalAssets.toLocaleString()}</div>
                        
                        <div className="space-y-3">
                            {assetDistribution.map(ad => {
                                const percent = (ad.value / totalAssets) * 100;
                                return (
                                    <div key={ad.type}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-300 flex items-center gap-1">{ad.icon} {ad.label}</span>
                                            <span className="font-mono text-white">{ad.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 bg-black rounded-full overflow-hidden">
                                            <div className="h-full bg-white transition-all duration-500" style={{width: `${percent}%`, opacity: 0.2 + (percent/100)}}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* --- ASSET LIST --- */}
                    <div className="grid grid-cols-1 gap-3">
                        {state.assets.map(asset => (
                            <div key={asset.id} className="bg-rpg-panel border border-rpg-border p-4 rounded-xl flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-black rounded-lg text-gray-400">
                                        {ASSET_TYPES.find(t => t.type === asset.type)?.icon}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">{asset.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{ASSET_TYPES.find(t => t.type === asset.type)?.label}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-white">{asset.value.toLocaleString()}</div>
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditAsset(asset)} className="text-gray-500 hover:text-white"><Edit2 size={12}/></button>
                                        <button onClick={() => dispatch({type: 'DELETE_ASSET', payload: asset.id})} className="text-gray-500 hover:text-red-500"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- ADD ASSET FORM --- */}
                    <div className="bg-black/20 border border-gray-800 p-4 rounded-xl">
                        <h3 className="text-sm font-bold text-white mb-3">{editingAsset ? 'Редактировать актив' : 'Добавить актив'}</h3>
                        <form onSubmit={handleSaveAsset} className="space-y-3">
                            <input className="w-full bg-rpg-bg border border-gray-700 rounded p-3 text-sm text-white outline-none focus:border-white transition-colors" placeholder="Название (напр. Tesla Stock)" value={assetName} onChange={e => setAssetName(e.target.value)}/>
                            <div className="flex gap-2">
                                <input type="number" className="flex-1 bg-rpg-bg border border-gray-700 rounded p-3 text-sm text-white outline-none focus:border-white transition-colors" placeholder="Стоимость" value={assetValue} onChange={e => setAssetValue(Number(e.target.value))}/>
                                <select className="bg-rpg-bg border border-gray-700 rounded p-3 text-sm text-white outline-none w-1/3" value={assetType} onChange={e => setAssetType(e.target.value)}>
                                    {ASSET_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                {editingAsset && <button type="button" onClick={() => { setEditingAsset(null); setAssetName(''); setAssetValue(0); }} className="flex-1 py-2 text-xs font-bold text-gray-500">Отмена</button>}
                                <button type="submit" className="flex-1 bg-white text-black font-bold py-3 rounded-lg text-sm hover:bg-gray-200 transition-colors">{editingAsset ? 'Сохранить' : 'Добавить'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Add Modal */}
            {showQuickAdd && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <form onSubmit={submitQuickAdd} className="bg-rpg-panel w-full max-w-sm p-6 rounded-2xl border border-rpg-border shadow-2xl relative">
                        <button type="button" onClick={() => setShowQuickAdd(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
                        <h3 className={`text-2xl font-bold mb-6 text-center ${qaType === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                            {qaType === 'income' ? 'Доход' : 'Расход'}
                        </h3>
                        <div className="space-y-4">
                            <input 
                                type="number" 
                                autoFocus 
                                className="w-full bg-black border-b-2 border-gray-700 text-center text-4xl font-mono text-white p-4 outline-none focus:border-white transition-colors" 
                                placeholder="0" 
                                value={qaAmount} 
                                onChange={e => setQaAmount(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {(qaType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                    <button 
                                        key={cat}
                                        type="button"
                                        onClick={() => setQaCategory(cat)}
                                        className={`p-2 rounded text-xs font-bold border transition-colors ${qaCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                            <button type="submit" className={`w-full py-4 rounded-xl font-bold text-lg text-black hover:opacity-90 transition-opacity ${qaType === 'income' ? 'bg-green-500' : 'bg-red-500'}`}>
                                Подтвердить
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default WalletPage;