import { Code, Timer, Users, Globe, Lock } from 'lucide-react'
import { useQuizzesStore } from '@/store/quizStore';
import { getQuestionCount } from '@/types';
import { getCategoryColor, formatTime } from '@/lib/utils';

interface QuizStartHeaderProps {
    parentTimer?: number;
}

export default function QuizStartHeader({ parentTimer }: QuizStartHeaderProps) {
    const { selectQuizToStart } = useQuizzesStore()
    
    if (!selectQuizToStart) {
        return (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 items-center">
                    <div className="bg-gray-400 w-12 h-12 sm:w-12 sm:h-12 flex justify-center items-center p-2 rounded-md">
                        <Code size={24} strokeWidth={1.5} color="white" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-lg sm:text-xl">Loading...</h2>
                        <span className="font-light text-sm">Preparing quiz</span>
                    </div>
                </div>
            </div>
        );
    }

    const { title, category, creator, visibility, time_limit } = selectQuizToStart;
    const totalQuestions = getQuestionCount(selectQuizToStart);

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
            <div className="flex gap-3 sm:gap-4 items-start sm:items-center">
                <div className={`${getCategoryColor(category)} w-12 h-12 sm:w-16 sm:h-16 flex justify-center items-center p-2 rounded-lg shadow-md flex-shrink-0`}>
                    <Code size={24} className="sm:scale-100" strokeWidth={1.5} color="white" />
                </div>
                
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg sm:text-2xl truncate">{title}</h2>
                        {visibility === 'private' ? (
                            <Lock size={18} className="text-orange-500" aria-label="Private Quiz" />
                        ) : (
                            <Globe size={18} className="text-green-500" aria-label="Public Quiz" />
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <Users size={14} />
                            <span className="whitespace-nowrap">{totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}</span>
                        </span>
                        
                        {category && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs whitespace-nowrap">
                                {category}
                            </span>
                        )}
                        
                        {creator && (
                            <span className="text-xs text-gray-500 truncate">
                                by {creator.username}
                            </span>
                        )}
                    </div>
                    
                    {time_limit && (
                        <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                            <Timer size={14} />
                            <span className="whitespace-nowrap">Time limit: {formatTime(time_limit)}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {parentTimer && (
                <div className={`mt-3 sm:mt-0 flex items-center gap-2 px-4 py-2 rounded-full ${
                    parentTimer < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                    <Timer size={16} />
                    <span className="font-bold text-base sm:text-lg">{formatTime(parentTimer)}</span>
                </div>
            )}
        </div>
    )
}
