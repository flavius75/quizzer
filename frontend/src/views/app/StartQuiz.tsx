import QuizStartQuestion from "@/components/QuizStartQuestion";
import QuizStartHeader from "@/components/QuizStartHeader";
import {CircleX} from 'lucide-react'
import { useEffect, useState } from "react";
import Navbar from "@/components/navbar";
import { useQuizzesStore } from '@/store/quizStore';
import { Quiz } from "@/types"
import { useNavigate } from "react-router";

export default function StartQuiz(props) {
  const {selectQuizToStart} = useQuizzesStore();
  const [parentTimer, setParentTimer] = useState(10)
  const navigate = useNavigate();
  
  useEffect(() => {
    if (selectQuizToStart === null){
      navigate('/');
    }
  }, [selectQuizToStart, navigate])

  function onUpdateTime(currentTime) {
    setParentTimer(currentTime)
  }

  return (
      <main className="h-full max-w-[1220px] mx-auto p-2 md:p-5">
        <Navbar/>
        {selectQuizToStart === null ? (
          <div className="h-svh flex flex-col gap-2 items-center justify-center">
            <CircleX size={100}/>
            <h2>Please select your quizz first ...</h2>
            <span>You will be redirected to the home page</span>
          </div>
        ):(
          <div className="flex flex-col px-24 mt-[35px]">
              <QuizStartHeader parentTimer={parentTimer} />
              <div className="mt-10 flex items-center justify-center">
                  <QuizStartQuestion onUpdateTime={onUpdateTime}/>
              </div>
          </div>
        )}
      </main>
      
  );
}
