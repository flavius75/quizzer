import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getErrorMessage } from "@/lib/api";
import { Quiz } from "@/types";

// Editing a quiz's questions/answers is a separate, larger feature; this
// page covers the metadata the backend actually supports updating today
// (PATCH /quizzes/{id} - see backend/app/schemas/quizz.py QuizUpdate).
export default function EditQuiz() {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const response = await api.get<Quiz>(`/quizzes/${quizId}`);
                setQuiz(response.data);
                setTitle(response.data.title);
                setCategory(response.data.category || "");
                setVisibility(response.data.visibility || "public");
            } catch (err) {
                setError(getErrorMessage(err, "Failed to load quiz"));
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuiz();
    }, [quizId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            await api.patch(`/quizzes/${quizId}`, { title, category, visibility });
            navigate("/admin/quizzes/list");
        } catch (err) {
            setError(getErrorMessage(err, "Failed to save quiz"));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="p-6">
                <p className="text-red-600">{error || "Quiz not found"}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-xl">
            <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight mb-6">Edit Quiz</h1>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <select
                        id="visibility"
                        className="border rounded-md p-2"
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                    >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="flex gap-2 mt-2">
                    <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate("/admin/quizzes/list")}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
