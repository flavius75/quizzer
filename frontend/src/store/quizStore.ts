import { create } from "zustand";
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

// Deliberately in-memory only (no zustand/persist): quizzes can carry a
// creator's email and base64-encoded images, and every view that reads
// allQuizzes (QuizArea, QuizzesAdmin) already refetches it on mount, so
// persisting it to localStorage would leak PII and images to disk for no
// functional benefit while risking a quota blowup on several illustrated
// quizzes.
export const useQuizzesStore = create<QuizState>()((set) => ({
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
}));