import React from 'react';
import { useGame } from '../context/GameContext';
import { Transaction } from '../types';
import { Trash2 } from 'lucide-react';

interface TransactionCardProps {
    transaction: Transaction;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const { dispatch } = useGame();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(window.confirm('Удалить запись о финансах?')) {
            dispatch({type: 'DELETE_TRANSACTION', payload: transaction.id});
        }
    };

    const isIncome = transaction.type === 'income';

    return (
        <div className="flex flex-col group mb-1">
             <div 
                className={`relative border rounded-lg p-2 transition-all flex justify-between items-center text-xs hover:shadow-lg shadow-sm cursor-pointer
                    ${isIncome ? 'bg-green-900/10 border-green-900/30' : 'bg-red-900/10 border-red-900/30'}
                    hover:border-opacity-50
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] ${isIncome ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                        {transaction.category.charAt(0)}
                    </div>
                    <div className="min-w-0">
                         <div className={`font-bold truncate ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                            {transaction.category}
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                     <span className={`font-mono font-bold ${isIncome ? 'text-green-500' : 'text-red-400'}`}>
                        {isIncome ? '+' : '-'}{transaction.amount}
                     </span>
                     <button 
                        onClick={handleDelete}
                        className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 size={12}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionCard;