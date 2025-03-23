'use client';

import QuizCard from './QuizCard'
import PlaceHolder from './PlaceHolder'
import useGlobalContextProvider from '../ContextApi'

export default function Quizarea ({props}){
    const { allQuizzes } = useGlobalContextProvider();
    

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
                <div className="flex mt-6 gap-8 flex-wrap">
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