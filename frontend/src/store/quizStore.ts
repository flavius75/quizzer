import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Quiz } from "@/types";



interface QuizState {
    allQuizzes: Quiz[] | null;
    setAllQuizzes: (quizzes: Quiz[]) => void;
    selectQuizToStart: Quiz | null;
    setSelectQuizToStart: (quiz: Quiz) => void;
  }
  
  export const useQuizzesStore = create<QuizState>()(
    persist(
      (set) => ({
        allQuizzes: null,
        setAllQuizzes: (quizzes) => set({ allQuizzes: quizzes }),
        selectQuizToStart: null,
        setSelectQuizToStart: (quiz) => set({ selectQuizToStart: quiz }),
      }),
      { name: "quizzes-storage" }
    )
  );