import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useGame } from '../context/GameContext';
import { format, subDays, parseISO, startOfDay, isBefore, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getGlobalLeaderboard, LeaderboardPlayer, getPeriodProgress } from '../utils/gameLogic';
import { Trophy, Crown, Medal, Lock, Users, Globe, CalendarRange, Activity, BarChart3 } from 'lucide-react';
import ProfileModal from './ProfileModal';

type TimeRange = 'week' | 'month' | '3months' | 'all';
type LeaderboardMode = 'global' | 'friends';

const Analytics: React.FC = () => {
  const { state } = useGame();
  const [range, setRange] = useState<TimeRange>('week');
  const [lbMode, setLbMode] = useState<LeaderboardMode>('global');
  const [viewingPlayer, setViewingPlayer] = useState<LeaderboardPlayer | null>(null);
  
  // Calculate range days
  const getDays = () => {
      switch(range) {
          case 'week': return 7;
          case 'month': return 30;
          case '3months': return 90;
          case 'all': return 365; // Approximate for demo
      }
  };
  const numDays = getDays();
  const startDate = subDays(new Date(), numDays - 1);

  // Filter Tasks
  const rangeTasks = state.tasks.filter(t => {
      if (!t.date && !t.createdAt) return false;
      try {
          const tDate = t.date ? parseISO(t.date) : parseISO(t.createdAt!);
          return tDate >= startDate;
      } catch (e) { return false; }
  });

  // 1. Skill Ring Data
  const skillData = state.skills.map(skill => {
      const value = rangeTasks.filter(t => t.skillId === skill.id && t.completed).length;
      return { name: skill.name, value, color: skill.color };
  }).filter(s => s.value > 0);

  // 2. Daily Completion Data & Mood Data
  const MOOD_LABELS: Record<number, string> = {
      1: '×_× Ужасно',
      2: 'T_T Плохо',
      3: '-_- Норм',
      4: '^_^ Хорошо',
      5: '^o^ Отлично',
      6: '*_* Супер'
  };

  const dailyData = Array.from({ length: numDays }).map((_, i) => {
      const d = subDays(new Date(), numDays - 1 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const dayTasks = rangeTasks.filter(t => (t.date === dateStr) || (t.type === 'goal' && t.completed && isSameDay(parseISO(t.deadline || ''), d))); 
      const completed = dayTasks.filter(t => t.completed).length;
      const total = dayTasks.length; 
      
      const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Mood for this day
      const moodEntry = state.user?.moodHistory?.find(m => m.date === dateStr);
      const mood = moodEntry ? moodEntry.value : null;

      return {
          name: range === 'week' ? format(d, 'EEE', {locale: ru}) : format(d, 'dd.MM'),
          completed,
          efficiency,
          mood,
          moodLabel: mood ? MOOD_LABELS[mood] : 'N/A'
      };
  });

  // 3. Overall Stats
  const totalCompleted = rangeTasks.filter(t => t.completed).length;
  const totalFailed = rangeTasks.filter(t => !t.completed && t.type === 'daily' && isBefore(parseISO(t.date || ''), startOfDay(new Date()))).length;
  
  const pieData = [
      { name: 'Выполнено', value: totalCompleted, color: '#10b981' },
      { name: 'Провалено', value: totalFailed, color: '#ef4444' },
      { name: 'В процессе', value: rangeTasks.length - totalCompleted - totalFailed, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  const overallEfficiency = (totalCompleted + totalFailed) > 0 ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100) : 100;

  // 4. Progress Bars Data
  const weekProgress = state.user ? getPeriodProgress(state.tasks, state.user.settings, 'week') : { absolutePercent: 0, completed: 0, target: 1 };
  const monthProgress = state.user ? getPeriodProgress(state.tasks, state.user.settings, 'month') : { absolutePercent: 0, completed: 0, target: 1 };
  const yearProgress = state.user ? getPeriodProgress(state.tasks, state.user.settings, 'year') : { absolutePercent: 0, completed: 0, target: 1 };

  // Leaderboard Calculation
  const fullLeaderboard = useMemo(() => {
     if(!state.user) return [];
     return getGlobalLeaderboard(state.user);
  }, [state.user, state.user?.friends]);

  // Filtered Leaderboard based on mode
  const displayedLeaderboard = useMemo(() => {
      if (!fullLeaderboard.length) return [];
      
      if (lbMode === 'global') return fullLeaderboard;
      
      const friendsList = fullLeaderboard.filter(p => p.isFriend || p.isUser);
      // Re-assign ranks for friend view
      return friendsList.map((p, index) => ({...p, rank: index + 1}));
  }, [fullLeaderboard, lbMode]);

  const handleRowClick = (player: LeaderboardPlayer) => {
      if (player.isHidden) return;
      setViewingPlayer(player);
  };

  const isImageAvatar = (avatar: string) => {
      return avatar && (avatar.length > 10 || avatar.startsWith('data:') || avatar.startsWith('http'));
  };

  const ProgressBarRow: React.FC<{ label: string; percent: number; current: number; total: number; color: string }> = ({ label, percent, current, total, color }) => (
      <div className="mb-4">
          <div className="flex justify-between text-xs mb-1 font-mono uppercase text-gray-400">
              <span>{label}</span>
              <span>{percent}% ({current}/{total})</span>
          </div>
          <div className="h-3 bg-rpg-card rounded-full overflow-hidden border border-rpg-border">
              <div 
                  className={`h-full ${color} transition-all duration-700`} 
                  style={{ width: `${percent}%` }}
              ></div>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center mb-6">
             <h2 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
                 <BarChart3 className="text-white"/> Боевая Аналитика
             </h2>
             <div className="flex bg-rpg-card rounded-lg border border-rpg-border p-1">
                 {(['week', 'month', '3months', 'all'] as TimeRange[]).map(r => (
                     <button 
                        key={r} 
                        onClick={() => setRange(r)}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-colors ${range === r ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}
                     >
                         {r === 'week' ? 'Неделя' : r === 'month' ? 'Месяц' : r === '3months' ? '3 Мес' : 'Все'}
                     </button>
                 ))}
             </div>
        </div>

        {/* Progress Bars Section (New) */}
        <div className="bg-rpg-panel p-6 rounded-xl border border-rpg-border shadow-lg">
             <div className="flex items-center gap-2 mb-4 border-b border-rpg-border pb-2">
                 <CalendarRange className="text-rpg-primary" size={20} />
                 <h3 className="font-bold text-white">Временные Шкалы</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <ProgressBarRow 
                    label="Неделя" 
                    percent={weekProgress.absolutePercent} 
                    current={weekProgress.completed} 
                    total={weekProgress.target}
                    color="bg-rpg-primary"
                 />
                 <ProgressBarRow 
                    label="Месяц" 
                    percent={monthProgress.absolutePercent} 
                    current={monthProgress.completed} 
                    total={monthProgress.target}
                    color="bg-rpg-secondary"
                 />
                 <ProgressBarRow 
                    label="Год" 
                    percent={yearProgress.absolutePercent} 
                    current={yearProgress.completed} 
                    total={yearProgress.target}
                    color="bg-rpg-success"
                 />
             </div>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-rpg-panel p-5 rounded-xl border border-rpg-border shadow-lg flex items-center justify-between">
                <div>
                    <h3 className="text-gray-500 text-xs uppercase font-mono mb-1">Общая Эффективность</h3>
                    <div className={`text-4xl font-bold font-mono ${overallEfficiency >= 80 ? 'text-rpg-success' : overallEfficiency >= 50 ? 'text-rpg-warning' : 'text-red-500'}`}>
                        {overallEfficiency}%
                    </div>
                </div>
                <div className="h-16 w-16">
                    <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie data={[{value: overallEfficiency}, {value: 100-overallEfficiency}]} dataKey="value" innerRadius={20} outerRadius={30} startAngle={90} endAngle={-270}>
                                 <Cell fill={overallEfficiency >= 80 ? '#10b981' : overallEfficiency >= 50 ? '#f59e0b' : '#ef4444'} />
                                 <Cell fill="var(--border-color)" />
                             </Pie>
                         </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="bg-rpg-panel p-5 rounded-xl border border-rpg-border shadow-lg">
                 <h3 className="text-gray-500 text-xs uppercase font-mono mb-2">Статус Задач</h3>
                 <div className="flex items-center gap-4">
                     <div className="h-16 w-16">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" innerRadius={0} outerRadius={30} paddingAngle={5}>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="space-y-1 text-xs">
                         {pieData.map(d => (
                             <div key={d.name} className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                                 <span className="text-gray-400">{d.name}: <span className="text-white font-bold">{d.value}</span></span>
                             </div>
                         ))}
                     </div>
                 </div>
            </div>

            <div className="bg-rpg-panel p-5 rounded-xl border border-rpg-border shadow-lg">
                <h3 className="text-gray-500 text-xs uppercase font-mono mb-2">Навыки (Кольцо)</h3>
                <div className="flex items-center gap-4">
                     <div className="h-16 w-16 min-w-[64px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={skillData} dataKey="value" innerRadius={20} outerRadius={30} paddingAngle={2}>
                                    {skillData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="flex-1 overflow-y-auto max-h-16 custom-scrollbar text-[10px] space-y-1">
                         {skillData.map(d => (
                             <div key={d.name} className="flex justify-between">
                                 <span style={{color: d.color}}>{d.name}</span>
                                 <span className="text-white">{d.value}</span>
                             </div>
                         ))}
                     </div>
                </div>
            </div>
        </div>

        {/* Mood Chart (New) */}
        <div className="bg-rpg-panel p-6 rounded-xl border border-rpg-border shadow-lg flex flex-col">
            <h3 className="text-sm font-bold mb-4 text-purple-400 font-mono uppercase flex items-center gap-2">
                <Activity size={16}/> Эмоциональный Фон
            </h3>
            <div className="h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                        <defs>
                            <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--muted-color)" fontSize={10} tickMargin={10}/>
                        <YAxis stroke="var(--muted-color)" fontSize={10} domain={[1, 6]} tickCount={6}/>
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--panel-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                            formatter={(value: any, name: any, props: any) => [props.payload.moodLabel || value, 'Mood']}
                        />
                        <Area type="step" dataKey="mood" stroke="#d946ef" fill="url(#colorMood)" strokeWidth={2} connectNulls={true}/>
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-rpg-panel p-6 rounded-xl border border-rpg-border shadow-lg flex flex-col">
                <h3 className="text-sm font-bold mb-4 text-rpg-primary font-mono uppercase">Активность (Задач в день)</h3>
                <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData}>
                            <defs>
                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="name" stroke="var(--muted-color)" fontSize={10} tickMargin={10}/>
                            <YAxis stroke="var(--muted-color)" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--panel-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                            />
                            <Area type="monotone" dataKey="completed" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTasks)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-rpg-panel p-6 rounded-xl border border-rpg-border shadow-lg flex flex-col">
                <h3 className="text-sm font-bold mb-4 text-rpg-success font-mono uppercase">Стабильность (Эффективность %)</h3>
                <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyData}>
                             <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                             <XAxis dataKey="name" stroke="var(--muted-color)" fontSize={10} tickMargin={10}/>
                             <YAxis stroke="var(--muted-color)" fontSize={10} domain={[0, 100]}/>
                             <Tooltip 
                                cursor={{stroke: 'var(--border-color)'}}
                                contentStyle={{ backgroundColor: 'var(--panel-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                            />
                             <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} dot={{r: 2, fill: '#10b981'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-rpg-panel rounded-xl border border-rpg-border shadow-lg overflow-hidden">
            <div className="p-6 border-b border-rpg-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    <h3 className="text-lg font-bold text-white font-mono uppercase tracking-widest">
                        {lbMode === 'global' ? 'Мировой Рейтинг' : 'Рейтинг Друзей'}
                    </h3>
                </div>
                
                {/* Mode Toggle */}
                <div className="flex bg-rpg-card rounded-lg border border-rpg-border p-1">
                    <button 
                        onClick={() => setLbMode('global')}
                        className={`px-3 py-1 text-xs font-bold uppercase rounded-md flex items-center gap-2 transition-colors ${lbMode === 'global' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Globe size={14}/> Мир
                    </button>
                    <button 
                        onClick={() => setLbMode('friends')}
                        className={`px-3 py-1 text-xs font-bold uppercase rounded-md flex items-center gap-2 transition-colors ${lbMode === 'friends' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Users size={14}/> Друзья
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-rpg-card">
                        <tr>
                            <th className="px-6 py-3 font-mono">Rank</th>
                            <th className="px-6 py-3 font-mono">User</th>
                            <th className="px-6 py-3 font-mono">Level</th>
                            <th className="px-6 py-3 font-mono">Top %</th>
                            <th className="px-6 py-3 font-mono text-right">Efficiency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedLeaderboard.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">
                                    {lbMode === 'friends' ? 'У вас пока нет друзей в рейтинге.' : 'Рейтинг пуст.'}
                                </td>
                            </tr>
                        )}
                        {displayedLeaderboard.map((player) => (
                            <tr 
                                key={player.username} 
                                onClick={() => handleRowClick(player)}
                                className={`border-b border-rpg-border transition-colors ${
                                    player.isHidden 
                                        ? 'bg-transparent text-gray-600 cursor-not-allowed' 
                                        : player.isUser 
                                            ? 'bg-rpg-secondary/10 hover:bg-rpg-secondary/20 cursor-pointer' 
                                            : 'bg-transparent hover:bg-rpg-card cursor-pointer'
                                }`}
                            >
                                <td className="px-6 py-4 font-bold font-mono">
                                    {player.rank === 1 ? <Crown size={16} className="text-yellow-400 inline"/> : 
                                     player.rank === 2 ? <Medal size={16} className="text-gray-300 inline"/> :
                                     player.rank === 3 ? <Medal size={16} className="text-orange-400 inline"/> :
                                     `#${player.rank}`}
                                </td>
                                <td className={`px-6 py-4 font-bold flex items-center gap-3 ${player.isUser ? 'text-rpg-secondary' : 'text-white'}`}>
                                    {/* Avatar Display */}
                                    <div className="w-8 h-8 rounded-full bg-rpg-card border border-rpg-border flex items-center justify-center overflow-hidden shrink-0 text-lg">
                                        {isImageAvatar(player.avatar) ? 
                                            <img src={player.avatar} className="w-full h-full object-cover"/> : 
                                            <span>{player.avatar}</span>
                                        }
                                    </div>
                                    
                                    <div className="flex flex-col">
                                        <span className="flex items-center gap-2">
                                            {player.username} {player.isUser && '(Вы)'}
                                            {player.isFriend && <Users size={12} className="text-rpg-success" title="Друг"/>}
                                            {player.isHidden && <Lock size={12} className="text-gray-600" title="Профиль скрыт"/>}
                                        </span>
                                        {player.isHidden && <span className="text-[10px] text-gray-500 font-normal">Скрыто</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-gray-400">
                                    Lv.{player.level}
                                </td>
                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                                    {lbMode === 'global' ? player.percentile : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-bold">
                                    <span className={player.efficiency >= 80 ? 'text-rpg-success' : player.efficiency >= 50 ? 'text-rpg-warning' : 'text-red-500'}>
                                        {player.efficiency}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {viewingPlayer && viewingPlayer.data.user && (
            <ProfileModal 
                user={viewingPlayer.data.user} 
                tasks={viewingPlayer.data.tasks} 
                onClose={() => setViewingPlayer(null)} 
            />
        )}
    </div>
  );
};

export default Analytics;