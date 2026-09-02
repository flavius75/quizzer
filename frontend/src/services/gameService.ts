import { api } from '@/lib/api';
import { GameSession, GameResult, PlayAnswerSubmission, LeaderboardResponse } from '@/types';

export const gameService = {
    // Start a quiz session
    startQuiz: async (quizId: number): Promise<GameSession> => {
        const response = await api.post(`/quizzes/${quizId}/start`);
        return response.data;
    },

    // Submit all answers
    submitAnswers: async (sessionUuid: string, answers: PlayAnswerSubmission[]): Promise<GameResult> => {
        const response = await api.post(`/quizzes/play/${sessionUuid}/submit`, answers);
        return response.data;
    },

    // Get quiz results
    getResults: async (sessionUuid: string): Promise<GameResult> => {
        const response = await api.get(`/quizzes/play/${sessionUuid}/result`);
        return response.data;
    },

    // Get leaderboard for a quiz
    getLeaderboard: async (quizId: number): Promise<LeaderboardResponse> => {
        const response = await api.get(`/quizzes/${quizId}/leaderboard`);
        return response.data;
    }
};
