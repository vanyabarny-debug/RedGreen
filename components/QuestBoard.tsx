import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Scroll, CheckCircle, Flame, PlusCircle, AlertTriangle, XCircle, Skull, Users, Share2 } from 'lucide-react';
import { playSound } from '../utils/audio';
import { getQuestParticipants } from '../utils/gameLogic';

const QuestBoard: React.FC = () => {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<'board' | 'custom'>('board');
  
  // Custom Quest Form
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [betXP, setBetXP] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [reqCount, setReqCount] = useState(5);
  const [reqSkill, setReqSkill] = useState('');

  const activeQuest = state.quests.find(q => q.status === 'active');
  const availableQuests = state.quests.filter(q => q.status === 'available');
  const completedQuests = state.quests.filter(q => q.status === 'completed');
  const failedQuests = state.quests.filter(q => q.status === 'failed');

  const handleCreateCustom = (e: React.FormEvent) => {
      e.preventDefault();
      if(!customTitle) return;
      
      const newQuest = {
          id: `custom_q_${Date.now()}`,
          title: customTitle,
          description: customDesc || 'Пользовательский вызов',
          xpReward: Math.floor(reqCount * 10),
          status: 'available' as const,
          requirementType: 'task_count' as const,
          requirementValue: Number(reqCount),
          requirementSkillId: reqSkill || undefined,
          currentProgress: 0,
          isCustom: true,
          betAmount: Number(betXP),
          deadline: deadline || undefined
      };
      
      dispatch({ type: 'CREATE_CUSTOM_QUEST', payload: newQuest });
      setCustomTitle('');
      setCustomDesc('');
      setBetXP(0);
      setReqSkill('');
      setTab('board');
  };

  const handleFail = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if(window.confirm("ОТКАЗАТЬСЯ ОТ КВЕСТА?\n\nОн будет помечен как ПРОВАЛЕННЫЙ.\nЕсли была ставка XP, она будет потеряна.")) {
          dispatch({ type: 'FAIL_QUEST', payload: id });
          playSound('fail');
      }
  };

  const handleInvite = (e: React.MouseEvent, questTitle: string) => {
      e.stopPropagation();
      playSound('click');
      alert(`Приглашение в квест "${questTitle}" отправлено всем друзьям онлайн!`);
  };

  const ParticipantsList: React.FC<{ questId: string }> = ({ questId }) => {
      const participants = getQuestParticipants(questId);
      if (participants.length === 0) return null;

      return (
          <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                  {participants.slice(0, 3).map((p, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-rpg-panel bg-rpg-card flex items-center justify-center text-[10px] overflow-hidden" title={p.username}>
                          {p.avatar.length > 5 ? <img src={p.avatar} className="w-full h-full object-cover"/> : p.avatar}
                      </div>
                  ))}
                  {participants.length > 3 && (
                      <div className="w-6 h-6 rounded-full border border-rpg-panel bg-rpg-card flex items-center justify-center text-[8px] text-gray-400">
                          +{participants.length - 3}
                      </div>
                  )}
              </div>
              <span className="text-[10px] text-gray-500 font-mono">участвуют</span>
          </div>
      );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
           <h2 className="text-2xl md:text-3xl font-bold font-mono text-rpg-text">Квесты / Протоколы</h2>
           <div className="flex bg-rpg-card border border-rpg-border rounded p-1 w-full md:w-auto">
               <button onClick={() => { playSound('click'); setTab('board');}} className={`flex-1 md:flex-none px-4 py-2 md:py-1 rounded text-sm font-bold transition-colors ${tab === 'board' ? 'bg-rpg-panel border border-rpg-border text-rpg-text' : 'text-gray-400 hover:text-rpg-text'}`}>Доска</button>
               <button onClick={() => { playSound('click'); setTab('custom');}} className={`flex-1 md:flex-none px-4 py-2 md:py-1 rounded text-sm font-bold transition-colors ${tab === 'custom' ? 'bg-rpg-secondary text-white' : 'text-gray-400 hover:text-rpg-text'}`}>Создать +</button>
           </div>
      </div>

      {tab === 'board' ? (
        <>
            {/* Active Quest */}
            <section className="bg-rpg-card p-4 md:p-6 rounded-lg border border-rpg-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-rpg-text">
                    <Scroll size={150} />
                </div>
                <h3 className="text-xs font-mono text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <span className="animate-pulse text-rpg-success">●</span> Активный Протокол
                </h3>
                {activeQuest ? (
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                             <div>
                                <h4 className="text-2xl md:text-3xl font-bold text-rpg-text mb-2 tracking-tight">{activeQuest.title}</h4>
                                <p className="text-gray-500 max-w-xl text-sm leading-relaxed">{activeQuest.description}</p>
                                <ParticipantsList questId={activeQuest.id} />
                             </div>
                             <div className="flex flex-row md:flex-col gap-2 md:text-right w-full md:w-auto justify-between md:justify-start">
                                 {activeQuest.betAmount && activeQuest.betAmount > 0 && (
                                     <div className="bg-red-900/10 border border-red-500/50 px-3 py-1 rounded text-red-400 text-xs font-mono flex items-center gap-2 justify-end">
                                         <AlertTriangle size={12}/> РИСК: {activeQuest.betAmount} XP
                                     </div>
                                 )}
                                 {activeQuest.requirementSkillId && (
                                    <div className="inline-block bg-rpg-panel border border-rpg-border px-2 py-1 rounded text-xs text-gray-500 font-mono">
                                        Навык: <span style={{color: state.skills.find(s => s.id === activeQuest.requirementSkillId)?.color}}>{state.skills.find(s => s.id === activeQuest.requirementSkillId)?.name}</span>
                                    </div>
                                )}
                             </div>
                        </div>
                        
                        <div className="mb-4">
                            <div className="bg-black/40 rounded-full h-6 w-full mb-2 border border-rpg-border overflow-hidden relative">
                                <div 
                                    className="bg-gradient-to-r from-rpg-primary to-rpg-secondary h-full transition-all duration-700 relative" 
                                    style={{width: `${Math.min(100, (activeQuest.currentProgress / activeQuest.requirementValue) * 100)}%`}}
                                >
                                     <div className="absolute inset-0 bg-white/20 animate-pulse-fast"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                                    {Math.round((activeQuest.currentProgress / activeQuest.requirementValue) * 100)}%
                                </div>
                            </div>
                            <div className="flex justify-between text-sm font-mono text-gray-500">
                                <span>Прогресс: {activeQuest.currentProgress} / {activeQuest.requirementValue}</span>
                                <span className="text-rpg-warning">Награда: {activeQuest.xpReward + (activeQuest.betAmount ? Math.floor(activeQuest.betAmount * 1.5) : 0)} XP</span>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-rpg-border relative z-30 gap-2">
                             <button 
                                type="button"
                                onClick={(e) => handleInvite(e, activeQuest.title)}
                                className="flex items-center justify-center gap-2 bg-rpg-secondary/10 border border-rpg-secondary text-rpg-secondary hover:bg-rpg-secondary hover:text-white px-4 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <Share2 size={16}/> Пригласить друга
                            </button>
                            <button 
                                type="button"
                                onClick={(e) => handleFail(activeQuest.id, e)} 
                                className="flex items-center justify-center gap-2 bg-red-950/30 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-500 px-4 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <XCircle size={16}/> Отказаться
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500 font-mono border border-dashed border-rpg-border rounded bg-black/5 flex flex-col items-center">
                        <Scroll size={48} className="mb-4 opacity-20"/>
                        <p>НЕТ АКТИВНЫХ ЗАДАНИЙ</p>
                        <p className="text-xs mt-2">Примите вызов из списка ниже</p>
                    </div>
                )}
            </section>

            {/* Available Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableQuests.map(quest => (
                    <div key={quest.id} className="bg-rpg-panel p-5 rounded-lg border border-rpg-border hover:border-rpg-primary/50 transition-all hover:bg-rpg-card group flex flex-col justify-between shadow-sm">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-lg text-rpg-text group-hover:text-rpg-primary transition-colors">{quest.title}</h4>
                                {quest.isCustom && <span className="bg-rpg-border text-[10px] px-2 py-0.5 rounded text-gray-500 font-mono">ПОЛЬЗ.</span>}
                            </div>
                            <p className="text-sm text-gray-500 mb-2 h-10 line-clamp-2">{quest.description}</p>
                            <ParticipantsList questId={quest.id} />
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-rpg-border/50">
                            <div className="text-xs font-mono text-rpg-warning">+{quest.xpReward} XP</div>
                            <button 
                                onClick={() => dispatch({ type: 'ACCEPT_QUEST', payload: quest.id })}
                                disabled={!!activeQuest}
                                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${activeQuest ? 'bg-rpg-border text-gray-400 cursor-not-allowed' : 'bg-rpg-primary text-rpg-bg hover:opacity-90'}`}
                            >
                                Принять
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {(completedQuests.length > 0 || failedQuests.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                     <div>
                         <h3 className="text-gray-500 font-mono text-xs uppercase mb-3">Завершенные</h3>
                         <div className="space-y-2 opacity-60">
                            {completedQuests.map(q => (
                                <div key={q.id} className="flex items-center gap-2 text-rpg-success text-sm bg-gray-900/50 p-2 rounded">
                                    <CheckCircle size={14}/> {q.title}
                                </div>
                            ))}
                         </div>
                     </div>
                     <div>
                         <h3 className="text-gray-500 font-mono text-xs uppercase mb-3">Проваленные</h3>
                         <div className="space-y-2 opacity-60">
                            {failedQuests.map(q => (
                                <div key={q.id} className="flex items-center gap-2 text-red-500 text-sm bg-red-900/10 p-2 rounded">
                                    <Skull size={14}/> {q.title}
                                </div>
                            ))}
                         </div>
                     </div>
                </div>
            )}
        </>
      ) : (
          <div className="max-w-2xl mx-auto bg-rpg-panel border border-rpg-border p-6 md:p-8 rounded-lg shadow-2xl">
              <h3 className="text-xl font-bold text-rpg-text mb-6 flex items-center gap-2">
                  <Flame size={20}/> Создать Вызов
              </h3>
              <form onSubmit={handleCreateCustom} className="space-y-6">
                  <div>
                      <label className="block text-gray-500 text-xs font-mono uppercase mb-2">Название Миссии</label>
                      <input className="w-full bg-rpg-card border border-rpg-border p-3 rounded text-rpg-text focus:border-rpg-primary outline-none" value={customTitle} onChange={e => setCustomTitle(e.target.value)} required placeholder="Например: Марафон Кодинга"/>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                          <label className="block text-gray-500 text-xs font-mono uppercase mb-2">Цель: Кол-во задач</label>
                          <input type="number" min="1" className="w-full bg-rpg-card border border-rpg-border p-3 rounded text-rpg-text focus:border-rpg-primary outline-none" value={reqCount} onChange={e => setReqCount(Number(e.target.value))} />
                      </div>
                      <div>
                          <label className="block text-gray-500 text-xs font-mono uppercase mb-2">Требуемый навык</label>
                          <select className="w-full bg-rpg-card border border-rpg-border p-3 rounded text-rpg-text focus:border-rpg-primary outline-none" value={reqSkill} onChange={e => setReqSkill(e.target.value)}>
                              <option value="">Любой</option>
                              {state.skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                           <label className="block text-gray-500 text-xs font-mono uppercase mb-2">Ставка XP (Риск)</label>
                           <input type="number" min="0" className="w-full bg-rpg-card border border-rpg-border p-3 rounded text-rpg-text focus:border-rpg-primary outline-none" value={betXP} onChange={e => setBetXP(Number(e.target.value))} placeholder="0"/>
                           <p className="text-[10px] text-gray-500 mt-1">При провале вы потеряете это количество.</p>
                      </div>
                      <div>
                           <label className="block text-gray-500 text-xs font-mono uppercase mb-2">Дедлайн (Опционально)</label>
                           <input type="date" className="w-full bg-rpg-card border border-rpg-border p-3 rounded text-rpg-text focus:border-rpg-primary outline-none" value={deadline} onChange={e => setDeadline(e.target.value)} />
                      </div>
                  </div>
                  <button type="submit" className="w-full bg-rpg-primary text-rpg-bg font-bold py-3 rounded uppercase tracking-wider shadow hover:opacity-90 transition-colors">
                      Инициализировать
                  </button>
              </form>
          </div>
      )}
    </div>
  );
};

export default QuestBoard;