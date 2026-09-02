import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface Answer {
    id: string;
    text: string;
    image?: string;
    is_correct: boolean;
}

interface QuestionData {
    id: string;
    text: string;
    image?: string;
    question_type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
    answers: Answer[];
}

interface QuestionBuilderProps {
    question: QuestionData;
    onChange: (question: Partial<QuestionData>) => void;
}

export default function QuestionBuilder({ question, onChange }: QuestionBuilderProps) {
    const [, setCorrectAnswerIndex] = useState(() => {
        return question.answers.findIndex(a => a.is_correct);
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // No file-storage backend (S3, etc.) exists yet, so the image is
    // embedded as a data URL directly in the `image` string field the
    // backend already stores. Fine for small illustrative images; a real
    // upload endpoint would be needed for anything larger.
    const handleImageSelect = (file: File | undefined) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be under 5MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => onChange({ image: reader.result as string });
        reader.readAsDataURL(file);
    };

    // Update question text
    const updateQuestionText = (text: string) => {
        onChange({ text });
    };

    // Update question type
    const updateQuestionType = (question_type: QuestionData['question_type']) => {
        let newAnswers = [...question.answers];
        
        // Adjust answers based on question type
        if (question_type === 'true_false') {
            newAnswers = [
                { id: '1', text: 'True', is_correct: true },
                { id: '2', text: 'False', is_correct: false }
            ];
        } else if (question_type === 'fill_blank') {
            newAnswers = [
                { id: '1', text: '', is_correct: true }
            ];
        } else if (question_type === 'single_choice' && question.answers.length < 2) {
            newAnswers = [
                { id: '1', text: '', is_correct: true },
                { id: '2', text: '', is_correct: false },
                { id: '3', text: '', is_correct: false },
                { id: '4', text: '', is_correct: false }
            ];
        }

        onChange({ question_type, answers: newAnswers });
    };

    // Update answer text
    const updateAnswerText = (answerId: string, text: string) => {
        const newAnswers = question.answers.map(answer =>
            answer.id === answerId ? { ...answer, text } : answer
        );
        onChange({ answers: newAnswers });
    };

    // Handle single choice selection
    const handleSingleChoiceChange = (answerId: string) => {
        const newAnswers = question.answers.map(answer => ({
            ...answer,
            is_correct: answer.id === answerId
        }));
        onChange({ answers: newAnswers });
        setCorrectAnswerIndex(question.answers.findIndex(a => a.id === answerId));
    };

    // Handle multiple choice selection
    const handleMultipleChoiceChange = (answerId: string, checked: boolean) => {
        const newAnswers = question.answers.map(answer =>
            answer.id === answerId ? { ...answer, is_correct: checked } : answer
        );
        onChange({ answers: newAnswers });
    };

    // Add new answer option
    const addAnswer = () => {
        const newId = (Math.max(...question.answers.map(a => parseInt(a.id))) + 1).toString();
        const newAnswers = [
            ...question.answers,
            { id: newId, text: '', is_correct: false }
        ];
        onChange({ answers: newAnswers });
    };

    // Remove answer option
    const removeAnswer = (answerId: string) => {
        if (question.answers.length <= 2) return; // Keep at least 2 answers for choice questions
        
        const newAnswers = question.answers.filter(answer => answer.id !== answerId);
        onChange({ answers: newAnswers });
    };

    return (
        <div className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
                <Label htmlFor={`question-${question.id}`}>Question Text *</Label>
                <Textarea
                    id={`question-${question.id}`}
                    placeholder="Enter your question here..."
                    value={question.text}
                    onChange={(e) => updateQuestionText(e.target.value)}
                    rows={3}
                    className="resize-none"
                />
            </div>

            {/* Question Type */}
            <div className="space-y-2">
                <Label>Question Type *</Label>
                <Select value={question.question_type} onValueChange={updateQuestionType}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="single_choice">Single Choice</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Image Upload (Optional) */}
            <div className="space-y-2">
                <Label>Question Image (Optional)</Label>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e.target.files?.[0])}
                />
                {question.image ? (
                    <div className="relative inline-block">
                        <img src={question.image} alt="Question preview" className="max-h-40 rounded-lg border" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white shadow border"
                            onClick={() => onChange({ image: undefined })}
                        >
                            <X size={14} />
                        </Button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400"
                    >
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload</p>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 5MB</p>
                    </button>
                )}
            </div>

            {/* Answer Options */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Answer Options</Label>
                    {question.question_type !== 'true_false' && question.question_type !== 'fill_blank' && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAnswer}
                            className="flex items-center gap-1"
                        >
                            <Plus size={14} />
                            Add Option
                        </Button>
                    )}
                </div>

                {/* Fill in the Blank */}
                {question.question_type === 'fill_blank' && (
                    <div className="space-y-2">
                        <Label>Correct Answer *</Label>
                        <Input
                            placeholder="Enter the correct answer..."
                            value={question.answers[0]?.text || ''}
                            onChange={(e) => updateAnswerText(question.answers[0]?.id, e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                            The answer matching will be case-insensitive
                        </p>
                    </div>
                )}

                {/* True/False */}
                {question.question_type === 'true_false' && (
                    <RadioGroup
                        value={question.answers.find(a => a.is_correct)?.id}
                        onValueChange={handleSingleChoiceChange}
                    >
                        {question.answers.map((answer) => (
                            <div key={answer.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={answer.id} id={`answer-${answer.id}`} />
                                <Label 
                                    htmlFor={`answer-${answer.id}`}
                                    className="text-base cursor-pointer"
                                >
                                    {answer.text}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}

                {/* Single Choice */}
                {question.question_type === 'single_choice' && (
                    <div className="space-y-3">
                        <RadioGroup
                            value={question.answers.find(a => a.is_correct)?.id}
                            onValueChange={handleSingleChoiceChange}
                        >
                            {question.answers.map((answer, index) => (
                                <div key={answer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                    <RadioGroupItem value={answer.id} id={`answer-${answer.id}`} />
                                    <div className="flex-1">
                                        <Input
                                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                            value={answer.text}
                                            onChange={(e) => updateAnswerText(answer.id, e.target.value)}
                                        />
                                    </div>
                                    {question.answers.length > 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeAnswer(answer.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </RadioGroup>
                        <p className="text-xs text-gray-500">
                            Select the radio button to mark the correct answer
                        </p>
                    </div>
                )}

                {/* Multiple Choice */}
                {question.question_type === 'multiple_choice' && (
                    <div className="space-y-3">
                        {question.answers.map((answer, index) => (
                            <div key={answer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                <Checkbox
                                    checked={answer.is_correct}
                                    onCheckedChange={(checked) => 
                                        handleMultipleChoiceChange(answer.id, checked as boolean)
                                    }
                                />
                                <div className="flex-1">
                                    <Input
                                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                        value={answer.text}
                                        onChange={(e) => updateAnswerText(answer.id, e.target.value)}
                                    />
                                </div>
                                {question.answers.length > 2 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeAnswer(answer.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <p className="text-xs text-gray-500">
                            Check all correct answers (multiple selections allowed)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}