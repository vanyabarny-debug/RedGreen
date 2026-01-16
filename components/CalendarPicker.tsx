import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface CalendarPickerProps {
    onClose: () => void;
    onConfirm: (dateCounts: Record<string, number>) => void;
    themeColor?: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ onClose, onConfirm, themeColor = '#00D1C1' }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Record<string, number>>({});

    const handleDayClick = (date: Date) => {
        const key = format(date, 'yyyy-MM-dd');
        setSelectedDates(prev => {
            const currentCount = prev[key] || 0;
            if (currentCount >= 5) {
                // Toggle off if max reached or logic change? Let's just cycle 0-5 or remove
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: currentCount + 1 };
        });
    };

    const handleRemoveDate = (date: Date, e: React.MouseEvent) => {
        e.stopPropagation();
        const key = format(date, 'yyyy-MM-dd');
        setSelectedDates(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const totalTasks: number = (Object.values(selectedDates) as number[]).reduce((a: number, b: number) => a + b, 0);

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-rpg-panel w-full max-w-md rounded-xl border border-rpg-border shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 bg-rpg-card border-b border-rpg-border flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">Планирование</h3>
                    <button onClick={onClose}><X className="text-gray-500 hover:text-white"/></button>
                </div>

                <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded text-gray-400"><ChevronLeft/></button>
                        <span className="font-bold text-white capitalize">{format(currentMonth, 'LLLL yyyy', { locale: ru })}</span>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded text-gray-400"><ChevronRight/></button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
                            <div key={d} className="text-center text-xs text-gray-500 font-mono">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const count = selectedDates[dateKey] || 0;
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isSelected = count > 0;

                            return (
                                <div 
                                    key={dateKey}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        aspect-square rounded-lg flex items-center justify-center relative cursor-pointer transition-all select-none
                                        ${!isCurrentMonth ? 'opacity-30' : ''}
                                        ${isSelected ? 'text-black font-bold' : 'text-gray-400 hover:bg-white/10'}
                                    `}
                                    style={{
                                        backgroundColor: isSelected ? themeColor : 'transparent',
                                        border: isSelected ? 'none' : '1px solid #27272a'
                                    }}
                                >
                                    <span className="text-sm">{format(day, 'd')}</span>
                                    {count > 1 && (
                                        <div className="absolute -top-1 -right-1 bg-white text-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-sm">
                                            {count}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-rpg-border bg-rpg-card flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                        Выбрано задач: <span className="text-white font-bold">{totalTasks}</span>
                    </div>
                    <button 
                        onClick={() => totalTasks > 0 && onConfirm(selectedDates)}
                        disabled={totalTasks === 0}
                        className={`px-6 py-2 rounded font-bold text-sm flex items-center gap-2 transition-all ${totalTasks > 0 ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                    >
                        Далее <Check size={16}/>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CalendarPicker;