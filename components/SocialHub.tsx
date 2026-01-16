import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getGlobalLeaderboard } from '../utils/gameLogic';
import { Users, Search, UserPlus, UserCheck, X, Copy, Check, ArrowRight } from 'lucide-react';
import { playSound } from '../utils/audio';

const SocialHub: React.FC = () => {
    const { state, dispatch } = useGame();
    const [tab, setTab] = useState<'friends' | 'requests'>('friends');
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState<any | null>(null);
    const [searchMsg, setSearchMsg] = useState('');
    const [copied, setCopied] = useState(false);

    const friends = state.user?.friends || [];
    const requests = state.user?.friendRequests || [];

    // Search Logic
    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchId.trim()) {
            setFoundUser(null);
            setSearchMsg('');
            return;
        }
        
        if (!state.user) return;
        const leaderboard = getGlobalLeaderboard(state.user);
        const player = leaderboard.find(p => p.uniqueId.toUpperCase() === searchId.toUpperCase().trim());
        
        if (player) {
            setFoundUser(player);
            setSearchMsg('');
        } else {
            setFoundUser(null);
            setSearchMsg('Герой не найден');
        }
        playSound('click');
    };

    const clearSearch = () => {
        setSearchId('');
        setFoundUser(null);
        setSearchMsg('');
    };

    const handleSendRequest = () => {
        if (foundUser) {
            dispatch({ type: 'SEND_FRIEND_REQUEST', payload: foundUser.username });
            setSearchMsg('Запрос отправлен!');
            playSound('success');
        }
    };

    const handleRemoveFriend = (username: string) => {
        if(window.confirm(`Удалить ${username} из друзей?`)) {
            dispatch({ type: 'REMOVE_FRIEND', payload: username });
        }
    };

    const copyId = () => {
        if (state.user) {
            navigator.clipboard.writeText(state.user.uniqueId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isImageAvatar = (avatar: string) => avatar.length > 10 || avatar.startsWith('data:') || avatar.startsWith('http');

    const isSearching = searchId.length > 0;

    return (
        <div className="h-full flex flex-col">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                    <Users className="text-white"/> Социальный Центр
                </h2>
                
                {/* ID Card */}
                <div className="bg-rpg-card border border-rpg-border rounded-lg px-4 py-2 flex items-center gap-3 text-sm shadow-sm">
                    <span className="text-gray-500">Ваш ID:</span>
                    <span className="font-mono font-bold text-white tracking-widest">{state.user?.uniqueId}</span>
                    <button onClick={copyId} className="text-rpg-primary hover:text-white transition-colors">
                        {copied ? <Check size={16}/> : <Copy size={16}/>}
                    </button>
                </div>
            </div>

             <div className="bg-rpg-panel rounded-lg border border-rpg-border shadow-2xl flex flex-col overflow-hidden flex-1 min-h-[500px]">
                 
                 {/* SEARCH BAR AREA */}
                 <div className="p-4 border-b border-rpg-border bg-rpg-card/50">
                     <form onSubmit={handleSearch} className="relative flex items-center">
                         <Search className="absolute left-4 text-gray-500" size={20}/>
                         <input 
                            className="w-full bg-black/40 border border-rpg-border rounded-xl py-3 pl-12 pr-12 text-white placeholder-gray-500 outline-none focus:border-rpg-primary transition-all font-mono"
                            placeholder="Поиск по ID (напр. #X9Y2Z)"
                            value={searchId}
                            onChange={e => setSearchId(e.target.value)}
                         />
                         {searchId ? (
                             <button type="button" onClick={clearSearch} className="absolute right-3 text-gray-500 hover:text-white p-1">
                                 <X size={18}/>
                             </button>
                         ) : (
                             <div className="absolute right-4 text-xs text-gray-600 font-mono hidden md:block">ENTER</div>
                         )}
                     </form>
                 </div>

                 {/* TABS (Only show if NOT searching) */}
                 {!isSearching && (
                     <div className="flex border-b border-rpg-border bg-rpg-card shrink-0">
                         <button onClick={() => setTab('friends')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'friends' ? 'border-rpg-primary text-rpg-primary bg-rpg-panel' : 'border-transparent text-gray-500 hover:text-rpg-text hover:bg-rpg-panel/50'}`}>
                             Друзья ({friends.length})
                         </button>
                         <button onClick={() => setTab('requests')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${tab === 'requests' ? 'border-rpg-secondary text-rpg-secondary bg-rpg-panel' : 'border-transparent text-gray-500 hover:text-rpg-text hover:bg-rpg-panel/50'}`}>
                            Запросы {requests.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px]">{requests.length}</span>}
                         </button>
                     </div>
                 )}

                 <div className="flex-1 overflow-y-auto p-6 bg-rpg-bg relative">
                    
                    {/* SEARCH RESULTS VIEW */}
                    {isSearching ? (
                        <div className="max-w-xl mx-auto animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Результаты поиска</h3>
                                <button onClick={handleSearch} className="text-rpg-primary text-xs hover:underline flex items-center gap-1">
                                    Найти <ArrowRight size={12}/>
                                </button>
                            </div>

                            {searchMsg && <p className={`text-sm mb-4 text-center font-bold p-4 border rounded-lg ${searchMsg.includes('отправлен') ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-red-500 border-red-500/20 bg-red-500/10'}`}>{searchMsg}</p>}

                            {foundUser ? (
                                <div className="bg-rpg-card p-6 rounded-xl border border-rpg-border flex justify-between items-center shadow-lg hover:border-rpg-primary/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-rpg-panel border-2 border-rpg-border flex items-center justify-center text-2xl overflow-hidden shadow-inner">
                                            {isImageAvatar(foundUser.avatar) ? <img src={foundUser.avatar} className="w-full h-full object-cover"/> : foundUser.avatar}
                                        </div>
                                        <div>
                                            <p className="font-bold text-xl text-white">{foundUser.username}</p>
                                            <p className="text-xs text-rpg-primary font-mono uppercase mt-1">Level {foundUser.level}</p>
                                        </div>
                                    </div>
                                    {state.user?.friends?.includes(foundUser.username) ? (
                                        <span className="text-green-500 text-sm font-bold flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20"><UserCheck size={18}/> Друг</span>
                                    ) : (
                                        <button onClick={handleSendRequest} className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2 transition-transform active:scale-95 shadow-lg">
                                            <UserPlus size={18}/> Добавить
                                        </button>
                                    )}
                                </div>
                            ) : (
                                !searchMsg && (
                                    <div className="text-center text-gray-500 py-10">
                                        <Search size={48} className="mx-auto mb-4 opacity-20"/>
                                        <p>Введите точный ID героя для поиска.</p>
                                    </div>
                                )
                            )}
                        </div>
                    ) : (
                        /* TAB CONTENT VIEW */
                        <>
                            {tab === 'friends' && (
                                <div className="space-y-3">
                                    {friends.length === 0 && (
                                        <div className="text-center py-20 text-gray-500 flex flex-col items-center border border-dashed border-rpg-border rounded-xl">
                                            <Users size={48} className="mb-4 opacity-20"/>
                                            <p>Список друзей пуст</p>
                                            <p className="text-xs mt-2">Используйте поиск сверху, чтобы найти соратников.</p>
                                        </div>
                                    )}
                                    {friends.map(friend => (
                                        <div key={friend} className="bg-rpg-card p-4 rounded-xl border border-rpg-border flex justify-between items-center group hover:border-rpg-primary/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-rpg-panel border border-rpg-border flex items-center justify-center font-bold text-gray-400">
                                                    {friend.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-lg text-white">{friend}</span>
                                            </div>
                                            <button onClick={() => handleRemoveFriend(friend)} className="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Удалить">
                                                <X size={20}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {tab === 'requests' && (
                                <div className="space-y-4">
                                    {requests.length === 0 && (
                                        <div className="text-center py-20 text-gray-500 border border-dashed border-rpg-border rounded-xl">Нет входящих запросов</div>
                                    )}
                                    {requests.map(req => (
                                        <div key={req.fromUsername} className="bg-rpg-card p-5 rounded-xl border border-rpg-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-rpg-panel border border-rpg-border flex items-center justify-center text-lg overflow-hidden">
                                                    {isImageAvatar(req.fromAvatar) ? <img src={req.fromAvatar} className="w-full h-full object-cover"/> : req.fromAvatar}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-lg text-white">{req.fromUsername}</p>
                                                    <p className="text-xs text-gray-500 font-mono">ID: {req.fromId}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button 
                                                    onClick={() => dispatch({type: 'ACCEPT_FRIEND_REQUEST', payload: req.fromUsername})}
                                                    className="flex-1 md:flex-none bg-rpg-secondary hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg"
                                                >
                                                    Принять
                                                </button>
                                                <button 
                                                    onClick={() => dispatch({type: 'REJECT_FRIEND_REQUEST', payload: req.fromUsername})}
                                                    className="flex-1 md:flex-none bg-rpg-panel border border-rpg-border hover:bg-rpg-border text-gray-400 hover:text-rpg-text px-6 py-2 rounded-lg text-sm font-bold transition-colors"
                                                >
                                                    Отклонить
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                 </div>
             </div>
        </div>
    )
}

export default SocialHub;