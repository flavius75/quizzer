// Updated StartQuiz.tsx
import QuizStartQuestion from "@/components/QuizStartQuestion";
import QuizStartHeader from "@/components/QuizStartHeader";
import { CircleX } from 'lucide-react';
import { useEffect } from "react";
import { useQuizzesStore } from '@/store/quizStore';
import { useNavigate } from "react-router";

export default function StartQuiz() {
  const { selectQuizToStart } = useQuizzesStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (selectQuizToStart === null) {
      navigate('/');
    }
  }, [selectQuizToStart, navigate]);

  const handleQuizComplete = (result: any) => {
    console.log('Quiz completed with result:', result);
    // You can add additional logic here like updating global scores, etc.
  };

  return (
    <main className="h-full max-w-[1220px] mx-auto p-2 md:p-5">
      {selectQuizToStart === null ? (
        <div className="h-svh flex flex-col gap-2 items-center justify-center">
          <CircleX size={100}/>
          <h2>Please select your quiz first...</h2>
          <span>You will be redirected to the home page</span>
        </div>
      ) : (
        <div className="flex flex-col md:px-24 px-2 mt-[35px]">
          <QuizStartHeader />
          <div className="mt-10 flex items-center justify-center">
            <QuizStartQuestion 
              quizId={selectQuizToStart.id}
              onQuizComplete={handleQuizComplete}
            />
          </div>
        </div>
      )}
    </main>
  );
}