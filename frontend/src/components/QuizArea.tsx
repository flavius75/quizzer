import { useEffect } from 'react';
import axios from 'axios';
import QuizCard from './QuizCard';
import PlaceHolder from './PlaceHolder'
import { useQuizzesStore } from '@/store/quizStore';

export default function QuizArea (){
    const { allQuizzes, setAllQuizzes } = useQuizzesStore();

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/quizzes/');
                setAllQuizzes(response.data); // Stocker les quiz dans le store
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
            }
        };

        fetchQuizzes();
    }, [setAllQuizzes]);


    if (!allQuizzes) {
        return <div>Loading...</div>;
    }

    return(
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold">Quizzes</h1>
            {allQuizzes.length === 0 ? (   
                <div className="flex-col gap-3 p-4 mt-6 flex justify-center items-center h-full">
                    <PlaceHolder />
                </div>
            ):(
                <div className="flex mt-8 gap-8 flex-wrap">
                    {allQuizzes.map((singleQuiz, quizIndex) =>(
                        <div key={quizIndex}>
                            <QuizCard singleQuiz={singleQuiz}/>
                        </div>
                    ))}                   
                </div>
            )}
        </div>
    )
}