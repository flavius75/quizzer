import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Quiz } from "@/types";

interface QuizState {
    allQuizzes: Quiz[] | null;
    setAllQuizzes: (quizzes: Quiz[]) => void;
    selectQuizToStart: Quiz | null;
    setSelectQuizToStart: (quiz: Quiz) => void;
    clearSelectedQuiz: () => void;
    updateQuiz: (quizId: number, updatedQuiz: Partial<Quiz>) => void;
    removeQuiz: (quizId: number) => void;
}

export const useQuizzesStore = create<QuizState>()(
    persist(
        (set) => ({
            allQuizzes: null,
            
            setAllQuizzes: (quizzes) => set({ allQuizzes: quizzes }),
            
            selectQuizToStart: null,
            
            setSelectQuizToStart: (quiz) => set({ selectQuizToStart: quiz }),
            
            clearSelectedQuiz: () => set({ selectQuizToStart: null }),
            
            updateQuiz: (quizId, updatedQuiz) => set((state) => ({
                allQuizzes: state.allQuizzes?.map(quiz => 
                    quiz.id === quizId ? { ...quiz, ...updatedQuiz } : quiz
                ) || null,
                selectQuizToStart: state.selectQuizToStart?.id === quizId 
                    ? { ...state.selectQuizToStart, ...updatedQuiz } 
                    : state.selectQuizToStart
            })),
            
            removeQuiz: (quizId) => set((state) => ({
                allQuizzes: state.allQuizzes?.filter(quiz => quiz.id !== quizId) || null,
                selectQuizToStart: state.selectQuizToStart?.id === quizId 
                    ? null 
                    : state.selectQuizToStart
            }))
        }),
        { 
            name: "quizzes-storage",
            // Only persist essential data, not temporary selections
            partialize: (state) => ({ 
                allQuizzes: state.allQuizzes 
            })
        }
    )
);