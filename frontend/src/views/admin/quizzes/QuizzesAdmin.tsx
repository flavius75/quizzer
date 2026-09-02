import { QuizData, columns } from "./columns"
import { DataTable } from "./data-table"
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button"
import { Quiz } from "@/types";

export default function QuizzesAdmin() {
    const [allQuizzes, setAllQuizzes] = useState<QuizData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await api.get("/quizzes/");

                // Transform the data to match the table structure
                const transformedQuizzes: QuizData[] = response.data.map((quiz: Quiz) => ({
                    id: quiz.id,
                    title: quiz.title,
                    category: quiz.category || 'General',
                    creator: quiz.creator ? {
                        id: quiz.creator.id,
                        username: quiz.creator.username,
                        email: quiz.creator.email,
                        role: quiz.creator.role,
                        global_score: quiz.creator.global_score
                    } : null,
                    visibility: quiz.visibility as "public" | "private",
                    created_at: quiz.created_at,
                    updated_at: quiz.updated_at,
                    questions_count: quiz.questions?.length || 0,
                    uuid: quiz.uuid
                }));

                setAllQuizzes(transformedQuizzes);
            } catch (err) {
                setError(getErrorMessage(err, "Failed to load quizzes"));
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    const handleDeleteQuiz = async (quizId: number) => {
        if (!confirm('Are you sure you want to delete this quiz?')) return;

        try {
            await api.delete(`/quizzes/${quizId}`);
            setAllQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
        } catch (err) {
            alert(getErrorMessage(err, "Failed to delete quiz"));
        }
    };

    const handleEditQuiz = (quizId: number) => {
        navigate(`/admin/quizzes/edit/${quizId}`);
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="text-red-600 text-lg mb-4">Error loading quizzes</div>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-between items-center">
                <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-5xl p-6">
                    Quizzes Management
                </h1>
                <Button 
                    className="mx-6 bg-teal-600 hover:bg-teal-700" 
                    onClick={() => navigate("/admin/quizzes/new")}
                >
                    New Quiz
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    <span className="ml-4 text-gray-600">Loading quizzes...</span>
                </div>
            ) : (
                <div className="container mx-auto p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {allQuizzes.length} quiz{allQuizzes.length !== 1 ? 'es' : ''} total
                        </p>
                    </div>
                    
                    <DataTable 
                        columns={columns} 
                        data={allQuizzes} 
                        onEdit={handleEditQuiz}
                        onDelete={handleDeleteQuiz}
                    />
                </div>
            )}
        </>
    )
}