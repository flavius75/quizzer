import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Frown, Smile, Laugh, CircleCheck, CircleX, Timer, AlertCircle } from 'lucide-react';

// Types for the new backend API
interface GameSession {
    play_session_id: number;
    session_uuid: string;
    quiz: {
        id: number;
        title: string;
        time_limit?: number;
        questions: GameQuestion[];
    };
}

interface GameQuestion {
    id: number;
    text: string;
    image?: string;
    question_type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
    answers: GameAnswer[];
}

interface GameAnswer {
    id: number;
    text?: string;
    image?: string;
}

interface UserAnswer {
    question_id: number;
    play_id:number;
    answer_id?: number;
    text_response?: string;
}

interface GameResult {
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

const API_BASE = 'http://127.0.0.1:8000';

interface QuizStartQuestionProps {
    quizId: number;
    onQuizComplete?: (result: GameResult) => void;
}

export default function QuizStartQuestion({ quizId, onQuizComplete }: QuizStartQuestionProps) {
    // Game state
    const [gameSession, setGameSession] = useState<GameSession | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Set<number>>(new Set());
    const [textAnswer, setTextAnswer] = useState<string>("");
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [gameResult, setGameResult] = useState<GameResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Timer state
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    const navigate = useNavigate();

    // Start the quiz session
    useEffect(() => {
        startQuizSession();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [quizId]);

    // Timer effect
    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && isQuizStarted && !isQuizCompleted) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev !== null && prev <= 1) {
                        handleTimeUp();
                        return 0;
                    }
                    return prev !== null ? prev - 1 : null;
                });
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [timeLeft, isQuizStarted, isQuizCompleted]);

    const startQuizSession = async () => {
        try {
            setError(null);
            const response = await axios.post(`${API_BASE}/quizzes/${quizId}/start`);
            const session: GameSession = response.data;
            
            setGameSession(session);
            setIsQuizStarted(true);
            
            // Set timer if quiz has time limit
            if (session.quiz.time_limit) {
                setTimeLeft(session.quiz.time_limit);
            }
            
            console.log('Quiz session started:', session);
        } catch (err: any) {
            console.error('Failed to start quiz:', err);
            setError(err.response?.data?.detail || 'Failed to start quiz');
        }
    };

    const handleTimeUp = () => {
        console.log('Time is up! Auto-submitting quiz...');
        submitQuiz();
    };

    const getCurrentQuestion = (): GameQuestion | null => {
        if (!gameSession || !gameSession.quiz.questions[currentQuestionIndex]) {
            return null;
        }
        return gameSession.quiz.questions[currentQuestionIndex];
    };

    const handleAnswerSelect = (answerId: number) => {
        const currentQuestion = getCurrentQuestion();
        if (!currentQuestion) return;

        if (currentQuestion.question_type === 'multiple_choice') {
            // Multiple choice - toggle selection
            const newSelected = new Set(selectedAnswers);
            if (newSelected.has(answerId)) {
                newSelected.delete(answerId);
            } else {
                newSelected.add(answerId);
            }
            setSelectedAnswers(newSelected);
        } else {
            // Single choice, true/false - single selection
            setSelectedAnswers(new Set([answerId]));
        }
    };

    const handleTextAnswerChange = (value: string) => {
        setTextAnswer(value);
    };

    const moveToNextQuestion = () => {
        const currentQuestion = getCurrentQuestion();
        if (!currentQuestion) return;


        if (!gameSession) return;

        const newAnswer: UserAnswer = {
            question_id: currentQuestion.id, 
            play_id: gameSession.play_session_id
        };

        if (currentQuestion.question_type === 'fill_blank') {
            newAnswer.text_response = textAnswer.trim();
        } else if (currentQuestion.question_type === 'multiple_choice') {
            // For multiple choice, we need to handle multiple answers
            // For now, we'll take the first selected (you might want to modify backend to handle multiple)
            newAnswer.answer_id = Array.from(selectedAnswers)[0];
        } else {
            // Single choice, true/false
            newAnswer.answer_id = Array.from(selectedAnswers)[0];
        }

        // Update user answers
        const updatedAnswers = [...userAnswers];
        const existingIndex = updatedAnswers.findIndex(a => a.question_id === currentQuestion.id);
        if (existingIndex >= 0) {
            updatedAnswers[existingIndex] = newAnswer;
        } else {
            updatedAnswers.push(newAnswer);
        }
        setUserAnswers(updatedAnswers);

        // Move to next question or finish
        if (currentQuestionIndex < gameSession!.quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswers(new Set());
            setTextAnswer("");
        } else {
            submitQuiz(updatedAnswers);
        }
    };

    const submitQuiz = async (answers?: UserAnswer[]) => {
        if (!gameSession || isSubmitting) return;
        
        setIsSubmitting(true);
        setError(null);

        try {
            const answersToSubmit = answers || userAnswers;
            
            // Ensure all questions have answers
            const completeAnswers = answersToSubmit.map(answer => {
                if (!answer.answer_id && !answer.text_response) {
                    // Provide empty answer for unanswered questions
                    return {
                        ...answer,
                        text_response: ""
                    };
                }
                return answer;
            });

            const response = await axios.post(
                `${API_BASE}/quizzes/play/${gameSession.session_uuid}/submit`,
                completeAnswers
            );
            
            const result: GameResult = response.data;
            setGameResult(result);
            setIsQuizCompleted(true);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            if (onQuizComplete) {
                onQuizComplete(result);
            }

            console.log('Quiz completed:', result);
        } catch (err: any) {
            console.error('Failed to submit quiz:', err);
            setError(err.response?.data?.detail || 'Failed to submit quiz');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    if (error && !gameSession) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
                <AlertCircle size={64} className="text-red-500" />
                <h2 className="text-xl font-semibold text-red-600">Error Loading Quiz</h2>
                <p className="text-gray-600">{error}</p>
                <Button onClick={() => navigate('/')} variant="outline">
                    Back to Quizzes
                </Button>
            </div>
        );
    }

    if (!gameSession || !isQuizStarted) {
        return (
            <div className="flex items-center justify-center gap-4 p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span>Starting quiz...</span>
            </div>
        );
    }

    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) {
        return <div>No questions available</div>;
    }

    const progress = ((currentQuestionIndex + 1) / gameSession.quiz.questions.length) * 100;
    const canProceed = 
        currentQuestion.question_type === 'fill_blank' 
            ? textAnswer.trim().length > 0
            : selectedAnswers.size > 0;

    return (
        <div className="rounded-sm m-9 w-9/12 max-w-4xl">
            {/* Header with progress and timer */}
            <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                        Question {currentQuestionIndex + 1} of {gameSession.quiz.questions.length}
                    </span>
                    <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
                
                {timeLeft !== null && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                        <Timer size={16} />
                        <span className="font-medium">{formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>

            {/* Question */}
            <div className="flex items-start gap-4 mb-8">
                <div className="bg-teal-600 flex justify-center items-center rounded-md w-11 h-11 text-white p-3 flex-shrink-0">
                    {currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                    <p className="text-lg font-medium mb-2">{currentQuestion.text}</p>
                    {currentQuestion.image && (
                        <img 
                            src={currentQuestion.image} 
                            alt="Question" 
                            className="max-w-md rounded-lg shadow-md mb-4"
                        />
                    )}
                    <span className="text-sm text-gray-500 capitalize">
                        {currentQuestion.question_type.replace('_', ' ')} Question
                    </span>
                </div>
            </div>

            {/* Answers */}
            <div className="mt-7 flex flex-col gap-3 ml-15">
                {currentQuestion.question_type === 'fill_blank' ? (
                    <div className="max-w-md">
                        <Input
                            type="text"
                            placeholder="Enter your answer..."
                            value={textAnswer}
                            onChange={(e) => handleTextAnswerChange(e.target.value)}
                            className="text-base p-3"
                            disabled={isSubmitting}
                        />
                    </div>
                ) : (
                    currentQuestion.answers.map((answer, index) => (
                        <div
                            key={answer.id}
                            onClick={() => !isSubmitting && handleAnswerSelect(answer.id)}
                            className={`p-4 w-10/12 border-2 rounded-lg cursor-pointer transition-all select-none ${
                                selectedAnswers.has(answer.id)
                                    ? 'border-teal-600 bg-teal-600 text-white shadow-md' 
                                    : 'border-gray-200 bg-white hover:border-teal-400 hover:shadow-sm'
                            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span>{answer.text}</span>
                            </div>
                            {answer.image && (
                                <img 
                                    src={answer.image} 
                                    alt="Answer option" 
                                    className="mt-2 max-w-32 rounded"
                                />
                            )}
                        </div>
                    ))
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end mt-8">
                <Button
                    onClick={moveToNextQuestion}
                    disabled={!canProceed || isSubmitting}
                    className="px-8 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Submitting...
                        </div>
                    ) : currentQuestionIndex === gameSession.quiz.questions.length - 1 ? (
                        'Finish Quiz'
                    ) : (
                        'Next Question'
                    )}
                </Button>
            </div>

            {/* Results Modal */}
            {isQuizCompleted && gameResult && (
                <ResultsModal 
                    result={gameResult} 
                    quizTitle={gameSession.quiz.title}
                    onClose={() => navigate('/')}
                    onTryAgain={() => {
                        setIsQuizCompleted(false);
                        setGameResult(null);
                        setCurrentQuestionIndex(0);
                        setUserAnswers([]);
                        setSelectedAnswers(new Set());
                        setTextAnswer("");
                        startQuizSession();
                    }}
                />
            )}
        </div>
    );
}

// Results Modal Component
interface ResultsModalProps {
    result: GameResult;
    quizTitle: string;
    onClose: () => void;
    onTryAgain: () => void;
}

function ResultsModal({ result, quizTitle, onClose, onTryAgain }: ResultsModalProps) {
    const getScoreEmoji = () => {
        if (result.percentage < 25) return <Frown size={80} className="text-red-500" />;
        if (result.percentage < 70) return <Smile size={80} className="text-yellow-500" />;
        return <Laugh size={80} className="text-green-500" />;
    };

    const getScoreColor = () => {
        if (result.percentage < 25) return 'text-red-600';
        if (result.percentage < 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getScoreMessage = () => {
        if (result.percentage < 25) return 'Keep practicing!';
        if (result.percentage < 70) return 'Good effort!';
        if (result.percentage < 90) return 'Great job!';
        return 'Excellent work!';
    };

    return (
        <Dialog open={true}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle></DialogTitle>
                    <div className="flex flex-col items-center justify-center gap-6 py-4">
                        {getScoreEmoji()}
                        
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
                            <p className="text-gray-600 mb-4">{quizTitle}</p>
                            
                            <div className={`text-4xl font-bold mb-2 ${getScoreColor()}`}>
                                {result.score}/{result.total_questions}
                            </div>
                            <div className={`text-lg font-medium mb-4 ${getScoreColor()}`}>
                                {result.percentage}% - {getScoreMessage()}
                            </div>
                        </div>

                        <div className="w-full flex gap-2 justify-center bg-gray-50 p-4 rounded-lg">
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 text-green-600">
                                    <CircleCheck size={20} />
                                    <span className="font-medium">{result.score}</span>
                                </div>
                                <span className="text-sm text-gray-500">Correct</span>
                            </div>
                            <div className="w-px bg-gray-300 mx-4"></div>
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1 text-red-600">
                                    <CircleX size={20} />
                                    <span className="font-medium">{result.total_questions - result.score}</span>
                                </div>
                                <span className="text-sm text-gray-500">Incorrect</span>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full">
                            <Button 
                                onClick={onTryAgain}
                                variant="outline"
                                className="flex-1"
                            >
                                Try Again
                            </Button>
                            <Button 
                                onClick={onClose}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Back to Quizzes
                            </Button>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-gray-500">
                                Completed on {new Date(result.completed_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}