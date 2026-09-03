import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import QuizCard from './QuizCard';
import PlaceHolder from './PlaceHolder'
import { useQuizzesStore } from '@/store/quizStore';
import { Quiz } from '@/types';

export default function QuizArea() {
    const { allQuizzes, setAllQuizzes, removeQuiz } = useQuizzesStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await api.get<Quiz[]>('/quizzes/');
                setAllQuizzes(response.data);
                setError(null);
            } catch (err) {
                setError(getErrorMessage(err, 'Failed to load quizzes'));
                // Set empty array so the view can render the error instead of spinning forever
                setAllQuizzes([]);
            }
        };

        fetchQuizzes();
    }, [setAllQuizzes]);

    // Show loading state
    if (allQuizzes === null) {
        return (
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold mb-8">Quizzes</h1>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    <span className="ml-4 text-gray-600">Loading quizzes...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold mb-8">Quizzes</h1>
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                    <p className="text-red-600 text-lg">Error loading quizzes</p>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Quizzes</h1>
                <div className="text-sm text-gray-600">
                    {allQuizzes.length} quiz{allQuizzes.length !== 1 ? 'es' : ''} available
                </div>
            </div>

            {allQuizzes.length === 0 ? (
                <div className="flex-col gap-3 p-4 mt-6 flex justify-center items-center h-full">
                    <PlaceHolder />
                </div>
            ) : (
                <div className="grid grid-cols-1 justify-items-center sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allQuizzes.map((singleQuiz) => (
                        <QuizCard
                            key={singleQuiz.id}
                            singleQuiz={singleQuiz}
                            onDeleted={removeQuiz}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
