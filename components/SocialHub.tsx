import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getGlobalLeaderboard } from '../utils/gameLogic';
import { Users, Search, UserPlus, UserCheck, X, Copy, Check } from 'lucide-react';
import { playSound } from '../utils/audio';

const SocialHub: React.FC = () => {
    const { state, dispatch } = useGame();
    const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [searchId, setSearchId] = useState('');
    const [foundUser, setFoundUser] = useState<any | null>(null);
    const [msg, setMsg] = useState('');
    const [copied, setCopied] = useState(false);

    const friends = state.user?.friends || [];
    const requests = state.user?.friendRequests || [];

    const handleSearch = () => {
        if (!state.user) return;
        const leaderboard = getGlobalLeaderboard(state.user);
        const player = leaderboard.find(p => p.uniqueId.toUpperCase() === searchId.toUpperCase());
        
        if (player) {
            setFoundUser(player);
            setMsg('');
        } else {
            setFoundUser(null);
            setMsg('Герой не найден');
        }
    };

    const handleSendRequest = () => {
        if (foundUser) {
            dispatch({ type: 'SEND_FRIEND_REQUEST', payload: foundUser.username });
            setMsg('Запрос отправлен!');
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

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                    <Users className="text-white"/> Социальный Центр
                </h2>
                
                {/* ID Card */}
                <div className="bg-rpg-card border border-rpg-border rounded-lg px-4 py-2 flex items-center gap-3 text-sm">
                    <span className="text-gray-500">Ваш ID:</span>
                    <span className="font-mono font-bold text-white tracking-widest">{state.user?.uniqueId}</span>
                    <button onClick={copyId} className="text-rpg-primary hover:text-white transition-colors">
                        {copied ? <Check size={16}/> : <Copy size={16}/>}
                    </button>
                </div>
            </div>

             <div className="bg-rpg-panel rounded-lg border border-rpg-border shadow-2xl flex flex-col overflow-hidden flex-1 min-h-[500px]">
                 <div className="flex border-b border-rpg-border bg-rpg-card shrink-0">
                     <button onClick={() => setTab('friends')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab === 'friends' ? 'border-rpg-primary text-rpg-primary bg-rpg-panel' : 'border-transparent text-gray-500 hover:text-rpg-text hover:bg-rpg-panel/50'}`}>Друзья ({friends.length})</button>
                     <button onClick={() => setTab('requests')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab === 'requests' ? 'border-rpg-secondary text-rpg-secondary bg-rpg-panel' : 'border-transparent text-gray-500 hover:text-rpg-text hover:bg-rpg-panel/50'}`}>
                        Запросы {requests.length > 0 && <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-[10px]">{requests.length}</span>}
                     </button>
                     <button onClick={() => setTab('search')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab === 'search' ? 'border-rpg-success text-rpg-success bg-rpg-panel' : 'border-transparent text-gray-500 hover:text-rpg-text hover:bg-rpg-panel/50'}`}>Поиск Героев</button>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 bg-rpg-bg">
                    {tab === 'friends' && (
                        <div className="space-y-3">
                            {friends.length === 0 && (
                                <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                                    <Users size={48} className="mb-4 opacity-20"/>
                                    <p>Список друзей пуст</p>
                                    <button onClick={() => setTab('search')} className="text-rpg-primary mt-2 text-sm hover:underline">Найти друзей</button>
                                </div>
                            )}
                            {friends.map(friend => (
                                <div key={friend} className="bg-rpg-card p-4 rounded border border-rpg-border flex justify-between items-center group hover:border-rpg-primary/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-rpg-panel border border-rpg-border flex items-center justify-center font-bold text-gray-400">
                                            {friend.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-lg">{friend}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFriend(friend)} className="text-gray-600 hover:text-red-500 p-2 rounded hover:bg-red-500/10 transition-colors" title="Удалить">
                                        <X size={20}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'requests' && (
                        <div className="space-y-4">
                            {requests.length === 0 && (
                                <div className="text-center py-20 text-gray-500">Нет входящих запросов</div>
                            )}
                            {requests.map(req => (
                                <div key={req.fromUsername} className="bg-rpg-card p-5 rounded border border-rpg-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-rpg-panel border border-rpg-border flex items-center justify-center text-lg overflow-hidden">
                                            {isImageAvatar(req.fromAvatar) ? <img src={req.fromAvatar} className="w-full h-full object-cover"/> : req.fromAvatar}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">{req.fromUsername}</p>
                                            <p className="text-xs text-gray-500 font-mono">ID: {req.fromId}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button 
                                            onClick={() => dispatch({type: 'ACCEPT_FRIEND_REQUEST', payload: req.fromUsername})}
                                            className="flex-1 md:flex-none bg-rpg-secondary hover:bg-blue-600 text-white px-6 py-2 rounded text-sm font-bold transition-colors"
                                        >
                                            Принять
                                        </button>
                                        <button 
                                            onClick={() => dispatch({type: 'REJECT_FRIEND_REQUEST', payload: req.fromUsername})}
                                            className="flex-1 md:flex-none bg-rpg-panel border border-rpg-border hover:bg-rpg-border text-gray-400 hover:text-rpg-text px-6 py-2 rounded text-sm font-bold transition-colors"
                                        >
                                            Отклонить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'search' && (
                        <div className="max-w-xl mx-auto">
                             <div className="flex gap-2 mb-8">
                                <input 
                                    className="flex-1 bg-rpg-card border border-rpg-border rounded-lg p-3 text-rpg-text outline-none focus:border-rpg-primary placeholder-gray-600 transition-colors"
                                    placeholder="Введите #ID героя (например: #AB12CD)"
                                    value={searchId}
                                    onChange={e => setSearchId(e.target.value)}
                                />
                                <button onClick={handleSearch} className="bg-rpg-primary text-black font-bold px-6 rounded-lg hover:bg-white transition-colors"><Search size={20}/></button>
                            </div>

                            {msg && <p className={`text-sm mb-4 text-center font-bold ${msg.includes('отправлен') ? 'text-green-500' : 'text-red-500'}`}>{msg}</p>}

                            {foundUser && (
                                <div className="bg-rpg-card p-6 rounded-lg border border-rpg-border flex justify-between items-center animate-fade-in shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-rpg-panel border-2 border-rpg-border flex items-center justify-center text-2xl overflow-hidden">
                                            {isImageAvatar(foundUser.avatar) ? <img src={foundUser.avatar} className="w-full h-full object-cover"/> : foundUser.avatar}
                                        </div>
                                        <div>
                                            <p className="font-bold text-xl">{foundUser.username}</p>
                                            <p className="text-sm text-gray-500 font-mono">Level {foundUser.level}</p>
                                        </div>
                                    </div>
                                    {state.user?.friends?.includes(foundUser.username) ? (
                                        <span className="text-green-500 text-sm font-bold flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded"><UserCheck size={18}/> Друг</span>
                                    ) : (
                                        <button onClick={handleSendRequest} className="bg-rpg-primary text-rpg-bg px-5 py-2.5 rounded text-sm font-bold hover:opacity-90 flex items-center gap-2 transition-transform active:scale-95">
                                            <UserPlus size={18}/> В друзья
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
             </div>
        </div>
    )
}

export default SocialHub;