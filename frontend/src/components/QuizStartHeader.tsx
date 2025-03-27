import {Code, Timer} from 'lucide-react'
import { useQuizzesStore } from '@/store/quizStore';


export default function QuizStartHeader({parentTimer}){
    const {selectQuizToStart} = useQuizzesStore()
    const {title, questions} = selectQuizToStart

    const totalQuestions = questions.questionList.length;

    
    return(
       <div className="flex justify-between">
        <div className="flex gap-2 justify-center">
                <div className="bg-teal-600 w-12 h-12 flex justify-center items-center p-2 rounded-md">
                    <Code size={28} strokeWidth={1.5} color="white" />
                </div>
            <div className="flex flex-col gap-1">
                <h2 className="font-bold text-xl">{title}</h2>
                <span className="font-light text-sm">{totalQuestions} Questions</span>
            </div>
        </div>


       </div>
    )
}