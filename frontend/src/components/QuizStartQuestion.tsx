import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Frown, Smile, Laugh, CircleCheck, CircleX, Timer, AlertCircle } from 'lucide-react';
import { gameService } from "@/services/gameService";
import { getErrorMessage } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import type { GameSession, GameQuestion, GameResult, PlayAnswerSubmission } from "@/types";

interface QuizStartQuestionProps {
    quizId: number;
    onQuizComplete?: (result: GameResult) => void;
}

export default function QuizStartQuestion({ quizId, onQuizComplete }: QuizStartQuestionProps) {
    // Game state
    const [gameSession, setGameSession] = useState<GameSession | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<PlayAnswerSubmission[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Set<number>>(new Set());
    const [textAnswer, setTextAnswer] = useState<string>("");
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [gameResult, setGameResult] = useState<GameResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Timer state
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Refs so the timer effect (mounted once) can always reach the latest
    // submit logic without being re-created every second.
    const gameSessionRef = useRef<GameSession | null>(null);
    const userAnswersRef = useRef<PlayAnswerSubmission[]>([]);

    const navigate = useNavigate();

    const startQuizSession = useCallback(async () => {
        try {
            setError(null);
            const session = await gameService.startQuiz(quizId);

            setGameSession(session);
            gameSessionRef.current = session;
            setIsQuizStarted(true);

            if (session.quiz.time_limit) {
                setTimeLeft(session.quiz.time_limit);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Failed to start quiz"));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizId]);

    // Start the quiz session
    useEffect(() => {
        startQuizSession();
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [startQuizSession]);

    const submitQuiz = useCallback(async (answers?: PlayAnswerSubmission[]) => {
        const session = gameSessionRef.current;
        if (!session || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const answersToSubmit = answers ?? userAnswersRef.current;

            // Every question in the quiz must be represented, even ones the
            // player never reached (e.g. ran out of time) - those are sent
            // as an empty response rather than silently dropped.
            const answeredIds = new Set(answersToSubmit.map(a => a.question_id));
            const completeAnswers: PlayAnswerSubmission[] = [
                ...answersToSubmit,
                ...session.quiz.questions
                    .filter(q => !answeredIds.has(q.id))
                    .map(q => ({ question_id: q.id, text_response: "" })),
            ];

            const result = await gameService.submitAnswers(session.session_uuid, completeAnswers);
            setGameResult(result);
            setIsQuizCompleted(true);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            onQuizComplete?.(result);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to submit quiz"));
        } finally {
            setIsSubmitting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSubmitting, onQuizComplete]);

    // Timer effect: the interval is created once (when the quiz starts) and
    // ticks via a functional state update, instead of being torn down and
    // recreated every second.
    useEffect(() => {
        if (!isQuizStarted || isQuizCompleted || timeLeft === null) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    submitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
        // Deliberately excludes `timeLeft`: it must not restart the interval
        // on every tick, only when the quiz actually starts/completes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isQuizStarted, isQuizCompleted]);

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

    const moveToNextQuestion = () => {
        const currentQuestion = getCurrentQuestion();
        if (!currentQuestion || !gameSession) return;

        const newAnswer: PlayAnswerSubmission = { question_id: currentQuestion.id };

        if (currentQuestion.question_type === 'fill_blank') {
            newAnswer.text_response = textAnswer.trim();
        } else if (currentQuestion.question_type === 'multiple_choice') {
            newAnswer.answer_ids = Array.from(selectedAnswers);
        } else {
            newAnswer.answer_id = Array.from(selectedAnswers)[0];
        }

        const updatedAnswers = [...userAnswers];
        const existingIndex = updatedAnswers.findIndex(a => a.question_id === currentQuestion.id);
        if (existingIndex >= 0) {
            updatedAnswers[existingIndex] = newAnswer;
        } else {
            updatedAnswers.push(newAnswer);
        }
        setUserAnswers(updatedAnswers);
        userAnswersRef.current = updatedAnswers;

        if (currentQuestionIndex < gameSession.quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswers(new Set());
            setTextAnswer("");
        } else {
            submitQuiz(updatedAnswers);
        }
    };

    if (error && !gameSession) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-6">
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
            <div className="flex items-center justify-center gap-4 p-6">
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
        <div className="rounded-sm mx-auto my-6 px-4 w-full max-w-4xl">
            {/* Header with progress and timer */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                    <span className="text-sm font-medium">
                        Question {currentQuestionIndex + 1} of {gameSession.quiz.questions.length}
                    </span>
                    <div className="w-full sm:w-48 mt-2 sm:mt-0">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {timeLeft !== null && (
                    <div className={`mt-3 sm:mt-0 flex items-center gap-2 px-3 py-1 rounded-full ${
                        timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                        <Timer size={14} />
                        <span className="font-medium">{formatTime(timeLeft)}</span>
                    </div>
                )}
            </div>

            {/* Question */}
            <div className="flex flex-row items-start gap-4 mb-6">
                <div className="bg-teal-600 flex justify-center items-center rounded-md w-10 h-10 sm:w-11 sm:h-11 text-white p-3 flex-shrink-0">
                    <span className="font-medium">{currentQuestionIndex + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-medium mb-2 break-words">{currentQuestion.text}</p>
                    {currentQuestion.image && (
                        <img
                            src={currentQuestion.image}
                            alt="Question"
                            className="w-full max-w-full rounded-lg shadow-md mb-4"
                        />
                    )}
                    <span className="text-sm text-gray-500 capitalize">
                        {currentQuestion.question_type.replace('_', ' ')} Question
                    </span>
                </div>
            </div>

            {/* Answers */}
            <div className="mt-4 flex flex-col gap-3">
                {currentQuestion.question_type === 'fill_blank' ? (
                    <div className="w-full max-w-xl">
                        <Input
                            type="text"
                            placeholder="Enter your answer..."
                            value={textAnswer}
                            onChange={(e) => setTextAnswer(e.target.value)}
                            className="text-base p-3 w-full"
                            disabled={isSubmitting}
                        />
                    </div>
                ) : (
                    currentQuestion.answers.map((answer, index) => (
                        <button
                            key={answer.id}
                            type="button"
                            onClick={() => handleAnswerSelect(answer.id)}
                            disabled={isSubmitting}
                            className={`p-4 w-full text-left border-2 rounded-lg cursor-pointer transition-all select-none flex flex-row sm:items-center gap-3 ${
                                selectedAnswers.has(answer.id)
                                    ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                                    : 'border-gray-200 bg-white hover:border-teal-400 hover:shadow-sm'
                            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-medium text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                                    {String.fromCharCode(65 + index)}
                                </span>
                            </div>
                            <div className="flex-1 text-sm sm:text-base break-words">
                                {answer.text}
                                {answer.image && (
                                    <img
                                        src={answer.image}
                                        alt="Answer option"
                                        className="mt-2 max-w-full rounded"
                                    />
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md text-red-700">
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center mt-6">
                <Button
                    onClick={moveToNextQuestion}
                    disabled={!canProceed || isSubmitting}
                    className="w-full sm:w-auto px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium"
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
                        userAnswersRef.current = [];
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

                        <div className="flex flex-col sm:flex-row gap-3 w-full">
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
