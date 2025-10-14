import { Button } from "@/components/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { useNavigate } from "react-router"
import axios from "axios"
import { Plus, Save, Trash2, ArrowLeft } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import QuestionBuilder from "@/components/QuestionBuilder"

// Form validation schema
const quizSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    category: z.string().min(1, "Category is required"),
    description: z.string().optional(),
    visibility: z.enum(["public", "private"]),
    time_limit: z.number().min(0).optional(),
})

type QuizFormData = z.infer<typeof quizSchema>

// Question data structure for the form
interface QuestionData {
    id: string; // temporary ID for form management
    text: string;
    image?: string;
    question_type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
    answers: {
        id: string;
        text: string;
        image?: string;
        is_correct: boolean;
    }[];
}

export default function NewQuizz() {
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const form = useForm<QuizFormData>({
        resolver: zodResolver(quizSchema),
        defaultValues: {
            title: "",
            category: "",
            description: "",
            visibility: "public",
            time_limit: 300, // 5 minutes default
        },
    });

    const categories = [
        "General", "Science", "Technology", "History", 
        "Geography", "Entertainment", "Sports", "Art", "Literature"
    ];

    // Add a new question
    const addQuestion = () => {
        const newQuestion: QuestionData = {
            id: Date.now().toString(), // temporary ID
            text: "",
            question_type: "single_choice",
            answers: [
                { id: "1", text: "", is_correct: true },
                { id: "2", text: "", is_correct: false },
                { id: "3", text: "", is_correct: false },
                { id: "4", text: "", is_correct: false },
            ]
        };
        setQuestions([...questions, newQuestion]);
    };

    // Update a question
    const updateQuestion = (questionId: string, updatedQuestion: Partial<QuestionData>) => {
        setQuestions(prev => 
            prev.map(q => q.id === questionId ? { ...q, ...updatedQuestion } : q)
        );
    };

    // Remove a question
    const removeQuestion = (questionId: string) => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    // Submit the quiz
    const onSubmit = async (data: QuizFormData) => {
        if (questions.length === 0) {
            setError("Please add at least one question");
            return;
        }

        // Validate all questions have at least one correct answer
        for (const question of questions) {
            if (!question.text.trim()) {
                setError("All questions must have text");
                return;
            }
            
            if (question.question_type !== 'fill_blank') {
                const hasCorrectAnswer = question.answers.some(a => a.is_correct && a.text.trim());
                if (!hasCorrectAnswer) {
                    setError("Each question must have at least one correct answer");
                    return;
                }
            } else {
                const correctAnswer = question.answers.find(a => a.is_correct);
                if (!correctAnswer || !correctAnswer.text.trim()) {
                    setError("Fill-in-the-blank questions must have a correct answer");
                    return;
                }
            }
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Create the quiz
            const quizResponse = await axios.post('http://127.0.0.1:8000/quizzes/', {
                title: data.title,
                category: data.category,
                description: data.description,
                visibility: data.visibility,
            });

            const quizId = quizResponse.data.id;

            // 2. Create questions and answers
            for (const questionData of questions) {
                // Create question
                const questionResponse = await axios.post(
                    `http://127.0.0.1:8000/quizzes/${quizId}/questions`,
                    {
                        text: questionData.text,
                        image: questionData.image,
                        question_type: questionData.question_type
                    }
                );

                const questionId = questionResponse.data.id;

                // Create answers for this question
                for (const answerData of questionData.answers) {
                    if (answerData.text.trim()) { // Only create answers with text
                        await axios.post(
                            `http://127.0.0.1:8000/quizzes/${quizId}/questions/${questionId}/answers`,
                            {
                                text: answerData.text,
                                image: answerData.image,
                                is_correct: answerData.is_correct
                            }
                        );
                    }
                }
            }

            // Success! Navigate to quiz list
            navigate('/admin/quizzes/list');
        } catch (err: any) {
            console.error('Failed to create quiz:', err);
            setError(err.response?.data?.detail || 'Failed to create quiz');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => navigate('/admin/quizzes/list')}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft size={16} />
                                Back to Quizzes
                            </Button>
                            <h1 className="text-3xl font-extrabold">Create New Quiz</h1>
                        </div>
                        
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating...
                                </div>
                            ) : (
                                <>
                                    <Save size={16} className="mr-2" />
                                    Create Quiz
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Quiz Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quiz Information</CardTitle>
                            <CardDescription>Basic details about your quiz</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quiz Title *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter quiz title..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {categories.map(category => (
                                                        <SelectItem key={category} value={category}>
                                                            {category}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="visibility"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Visibility *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="public">Public</SelectItem>
                                                    <SelectItem value="private">Private</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="time_limit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Time Limit (seconds)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    placeholder="300" 
                                                    {...field}
                                                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Brief description of the quiz (optional)..."
                                                className="resize-none"
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Questions Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Questions ({questions.length})</CardTitle>
                                    <CardDescription>Add questions and answers for your quiz</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addQuestion}
                                    className="flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Add Question
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {questions.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-lg mb-2">No questions yet</p>
                                    <p className="text-sm">Click "Add Question" to get started</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {questions.map((question, index) => (
                                        <div key={question.id} className="border rounded-lg p-6 bg-gray-50">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeQuestion(question.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                            <QuestionBuilder
                                                question={question}
                                                onChange={(updatedQuestion) => updateQuestion(question.id, updatedQuestion)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary */}
                    {questions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Quiz Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                                        <div className="text-sm text-gray-600">Questions</div>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {questions.filter(q => q.question_type === 'single_choice').length}
                                        </div>
                                        <div className="text-sm text-gray-600">Single Choice</div>
                                    </div>
                                    <div className="bg-purple-50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {questions.filter(q => q.question_type === 'multiple_choice').length}
                                        </div>
                                        <div className="text-sm text-gray-600">Multiple Choice</div>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-600">
                                            {questions.filter(q => q.question_type === 'fill_blank').length +
                                             questions.filter(q => q.question_type === 'true_false').length}
                                        </div>
                                        <div className="text-sm text-gray-600">Other Types</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </form>
            </Form>
        </div>
    );
}