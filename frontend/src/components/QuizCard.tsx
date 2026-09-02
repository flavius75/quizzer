import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { EllipsisVertical, Users, Play, ChevronRight, Lock, Globe } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Link, useNavigate } from "react-router"
import { useQuizzesStore } from '@/store/quizStore';
import { Quiz, getQuestionCount } from "@/types"
import { useAuthStore } from "@/store/authStore";
import { api, getErrorMessage } from "@/lib/api";
import { getCategoryColor } from "@/lib/utils";

interface QuizCardProps {
    singleQuiz: Quiz;
    onDeleted?: (quizId: number) => void;
}

export default function QuizCard({ singleQuiz, onDeleted }: QuizCardProps) {
    const { setSelectQuizToStart } = useQuizzesStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const { id, title, category, creator, visibility, sharing_link } = singleQuiz;
    const totalQuestions = getQuestionCount(singleQuiz);
    
    // Check if user can access this quiz
    const canAccess = visibility=='public' || user || sharing_link;
    
    // Check if user can edit this quiz
    const canEdit = user && (
        user.user_role === "admin" || 
        (user.user_role === "creator" && creator && creator.username === user.username)
    );

    const handleStartQuiz = () => {
        if (canAccess) {
            setSelectQuizToStart(singleQuiz);
        }
    };

    const handleEdit = () => {
        navigate(`/admin/quizzes/edit/${id}`);
    };

    const handleDelete = async () => {
        if (!confirm(`Delete quiz "${title}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/quizzes/${id}`);
            onDeleted?.(id);
        } catch (err) {
            alert(getErrorMessage(err, "Failed to delete quiz"));
        }
    };

    return (
        <Card className="w-80 hover:shadow-lg transition-all duration-300 group">
            <CardHeader>
                <div className={`relative ${getCategoryColor(category)} w-full h-32 flex justify-center items-center rounded-[5px] overflow-hidden`}>
                    {/* Quiz Category/Type Indicator */}
                    <div className="absolute top-3 left-3 bg-black/20 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-white text-xs font-medium">
                            {category || 'General'}
                        </span>
                    </div>
                    
                    {/* Privacy Indicator */}
                    <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-sm rounded-full p-1">
                        {visibility=='public' ? (
                            <Globe size={16} color="white" aria-label="Public Quiz" />
                        ) : (
                            <Lock size={16} color="white" aria-label="Private Quiz" />
                        )}
                    </div>

                    {/* Admin/Creator Actions */}
                    {canEdit && (
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="bg-black/20 backdrop-blur-sm hover:bg-black/30">    
                                        <EllipsisVertical color="white" size={20}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {/* Quiz Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <h3 className="text-white font-semibold text-lg truncate">{title}</h3>
                    </div>
                </div>                
            </CardHeader>
            
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Play size={16} />
                        {totalQuestions} Question{totalQuestions !== 1 ? 's' : ''}
                    </span>
                    
                    {creator && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Users size={14} />
                            {creator.username}
                        </span>
                    )}
                </div>

                {/* Access Status */}
                {!canAccess && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                        <p className="text-orange-700 text-sm">
                            <Lock size={14} className="inline mr-1" />
                            Login required to access this quiz
                        </p>
                    </div>
                )}
            </CardContent>
            
            <CardFooter>
                <div className="w-full">
                    {canAccess ? (
                        <Link to="/start-quiz" className="w-full">
                            <Button 
                                onClick={handleStartQuiz}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white group/btn"
                                size="sm"
                            >
                                <Play size={16} className="mr-2" />
                                Start Quiz
                                <ChevronRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    ) : (
                        <div className="w-full">
                            <Button 
                                disabled 
                                variant="outline" 
                                className="w-full"
                                size="sm"
                            >
                                <Lock size={16} className="mr-2" />
                                Login Required
                            </Button>
                        </div>
                    )}
                </div>
            </CardFooter>
        </Card>
    )
}