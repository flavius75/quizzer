import { Code, Timer, Users, Globe, Lock } from 'lucide-react'
import { useQuizzesStore } from '@/store/quizStore';
import { getQuestionCount } from '@/types';

interface QuizStartHeaderProps {
    parentTimer?: number;
}

export default function QuizStartHeader({ parentTimer }: QuizStartHeaderProps) {
    const { selectQuizToStart } = useQuizzesStore()
    
    if (!selectQuizToStart) {
        return (
            <div className="flex justify-between">
                <div className="flex gap-2 justify-center">
                    <div className="bg-gray-400 w-12 h-12 flex justify-center items-center p-2 rounded-md">
                        <Code size={28} strokeWidth={1.5} color="white" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-xl">Loading...</h2>
                        <span className="font-light text-sm">Preparing quiz</span>
                    </div>
                </div>
            </div>
        );
    }

    const { title, category, creator, visibility, time_limit } = selectQuizToStart;
    const totalQuestions = getQuestionCount(selectQuizToStart);

    const getCategoryColor = (category?: string) => {
        const colors = {
            'Science': 'bg-blue-600',
            'Technology': 'bg-green-600',
            'History': 'bg-purple-600',
            'Geography': 'bg-yellow-600',
            'General': 'bg-teal-600',
            'Entertainment': 'bg-pink-600',
        };
        return colors[category as keyof typeof colors] || 'bg-teal-600';
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex justify-between items-start">
            <div className="flex gap-4 justify-center">
                <div className={`${getCategoryColor(category)} w-16 h-16 flex justify-center items-center p-2 rounded-lg shadow-md`}>
                    <Code size={32} strokeWidth={1.5} color="white" />
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="font-bold text-2xl">{title}</h2>
                        {visibility === 'private' ? (
                            <Lock size={20} className="text-orange-500" title="Private Quiz" />
                        ) : (
                            <Globe size={20} className="text-green-500" title="Public Quiz" />
                        )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <Users size={16} />
                            {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
                        </span>
                        
                        {category && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                {category}
                            </span>
                        )}
                        
                        {creator && (
                            <span className="text-xs">
                                by {creator.username}
                            </span>
                        )}
                    </div>
                    
                    {time_limit && (
                        <div className="flex items-center gap-1 text-sm text-blue-600">
                            <Timer size={16} />
                            <span>Time limit: {formatTime(time_limit)}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {parentTimer && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    parentTimer < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                    <Timer size={20} />
                    <span className="font-bold text-lg">{formatTime(parentTimer)}</span>
                </div>
            )}
        </div>
    )
}