// Updated types.ts - Replace your entire file with this

// User types
// No `access_token` field: the JWT lives in an httpOnly cookie set by the
// backend and is never exposed to client-side JS (see src/lib/api.ts).
export interface User {
    username: string;
    user_role: 'player' | 'creator' | 'admin';
    score: number; // This maps to global_score from backend
}

export interface UserRead {
    id: number;
    username: string;
    email?: string;
    role: string;
    global_score: number;
    created_at: string;
}

// Quiz types matching your backend
export interface Quiz {
    id: number;
    uuid: string;
    title: string;
    category?: string;
    description?: string;
    image?: string;
    visibility?: 'public' | 'private';
    sharing_link?: string;
    time_limit?: number;
    creator_id?: number;
    created_at: string;
    updated_at: string;
    creator?: {
        id: number;
        username: string;
        email?: string;
        role: string;
        global_score: number;
    };
    questions?: Question[];
}

// Individual Question (from database)
export interface Question {
    id: number;
    text: string;
    image?: string;
    question_type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
    quiz_id: number;
    created_at: string;
    answers: Answer[];
}

// Individual Answer (from database)
export interface Answer {
    id: number;
    text?: string;
    image?: string;
    is_correct: boolean;
    question_id: number;
}

// Game session types (what you get when starting a quiz)
export interface GameSession {
    play_session_id: number;
    session_uuid: string;
    quiz: {
        id: number;
        title: string;
        time_limit?: number;
        questions: GameQuestion[];
    };
}

// Game Question (questions without correct answers exposed)
export interface GameQuestion {
    id: number;
    text: string;
    image?: string;
    question_type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
    answers: GameAnswer[]; 
}

// Game Answer (answers without is_correct exposed)
export interface GameAnswer {
    id: number;
    text?: string;
    image?: string;
}

// Answer submission for gameplay
export interface PlayAnswerSubmission {
    question_id: number;
    answer_id?: number; // For single_choice / true_false questions
    answer_ids?: number[]; // For multiple_choice questions (every box checked)
    text_response?: string; // For fill_blank questions
}

// Game result after quiz completion
export interface GameResult {
    score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
    detailed_results: Array<{
        question_id: number;
        question_text: string;
        user_answer: string | number;
        is_correct: boolean;
    }>;
}

// Leaderboard entry
export interface LeaderboardEntry {
    rank: number;
    username: string;
    best_score: number;
    attempts: number;
    last_played: string;
}

// API Response types
export interface LeaderboardResponse {
    quiz_id: number;
    leaderboard: LeaderboardEntry[];
}

export interface UserReadPublic {
    id: number;
    username: string;
    global_score: number;
}

// Helper function to get question count from quiz
export function getQuestionCount(quiz: Quiz): number {
    return quiz.questions?.length || 0;
}

// Helper function to check if quiz is accessible
export function isQuizAccessible(quiz: Quiz, isLoggedIn: boolean): boolean {
    return quiz.visibility == 'public' || (quiz.sharing_link && quiz.sharing_link.length > 0) || isLoggedIn;
}