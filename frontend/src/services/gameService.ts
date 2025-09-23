import axios from 'axios';
import { GameSession, GameResult } from '@/types';

const API_BASE = 'http://127.0.0.1:8000';

export const gameService = {
    // Start a quiz session
    startQuiz: async (quizId: number): Promise<GameSession> => {
        const response = await axios.post(`${API_BASE}/quizzes/${quizId}/start`);
        return response.data;
    },

    // Submit all answers
    submitAnswers: async (sessionUuid: string, answers: Array<{
        question_id: number;
        answer_id?: number;
        text_response?: string;
    }>): Promise<GameResult> => {
        const response = await axios.post(`${API_BASE}/quizzes/play/${sessionUuid}/submit`, answers);
        return response.data;
    },

    // Get quiz results
    getResults: async (sessionUuid: string): Promise<GameResult> => {
        const response = await axios.get(`${API_BASE}/quizzes/play/${sessionUuid}/result`);
        return response.data;
    },

    // Get leaderboard for a quiz
    getLeaderboard: async (quizId: number) => {
        const response = await axios.get(`${API_BASE}/quizzes/${quizId}/leaderboard`);
        return response.data;
    }
};