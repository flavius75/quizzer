import { useEffect } from 'react';
import axios from 'axios';
import QuizCard from './QuizCard';
import PlaceHolder from './PlaceHolder'
import { useQuizzesStore } from '@/store/quizStore';
import { Quiz } from '@/types';

export default function QuizArea() {
    const { allQuizzes, setAllQuizzes } = useQuizzesStore();

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/quizzes/');
                
                // Transform the data to match our frontend expectations
                const quizzes: Quiz[] = response.data.map((quiz: any) => ({
                    ...quiz,
                    // Ensure we have the correct boolean field for frontend
                    is_public: quiz.visibility === 'public',
                    // Keep both for compatibility
                    visibility: quiz.visibility
                }));
                
                setAllQuizzes(quizzes);
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
                // Set empty array on error to show placeholder
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {allQuizzes.map((singleQuiz) => (
                        <QuizCard 
                            key={singleQuiz.id} 
                            singleQuiz={singleQuiz}
                        />
                    ))}                   
                </div>
            )}
        </div>
    )
}