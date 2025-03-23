import { Button } from "@/components/ui/button";
import useGlobalContextProvider from "../ContextApi";
import { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogDescription,
    DialogHeader,
} from "@/components/ui/dialog";
import { Frown, Smile, Laugh, CircleCheck, CircleX } from 'lucide-react';

export default function QuizStartQuestion({ onUpdateTime }) {
    const { quizToStartObject, allQuizzes, setAllQuizzes } = useGlobalContextProvider();
    const { selectQuizToStart } = quizToStartObject;
    const { questions } = selectQuizToStart;
    const time = 10;
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedChoice, setSelectedChoice] = useState(null);
    const [indexOfQuizSelected, setIndexOfQuizSelected] = useState(null);
    const [isQuizEnded, setIsQuizEnded] = useState(false);
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(time);
    const intervalRef = useRef(null);
    const router = useRouter();

    const quizQuestions = questions.questionList

    useEffect(() => {
        const quizIndexFound = allQuizzes.findIndex(
            (quiz) => quiz.id === selectQuizToStart.id
        );
        setIndexOfQuizSelected(quizIndexFound);
    }, [allQuizzes, selectQuizToStart.id]);

    useEffect(() => {
        if (isQuizEnded) {
            quizQuestions.forEach((quizQuestion) => {
                quizQuestion.answeredResult = -1;
            });
            console.log('quiz has ended');
        }
    }, [isQuizEnded, quizQuestions]);



    function selectChoiceFunction(indexChoice) {
        setSelectedChoice(indexChoice);
        const currentAllQuizzes = [...allQuizzes];
        currentAllQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].answeredResult = indexChoice;

        setAllQuizzes(currentAllQuizzes);
    }

    function moveToTheNextQuestion() {
        if (allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].answeredResult === -1) {
            console.log("select answer");
            return;
        }

        allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].statistics.totalAttempts += 1;

        if (
            allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].answeredResult !== allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].correctAnswer
        ) {
            console.log("incorrect answer");
            allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].statistics.incorrectAttempts += 1;

            if (currentQuestionIndex !== quizQuestions.length - 1) {
                setTimeout(() => {
                    setCurrentQuestionIndex((current) => current + 1);
                    setSelectedChoice(null);
                }, 1200);
            } else {
                setTimer(0);
                clearInterval(intervalRef.current);
                setIsQuizEnded(true);
            }

            return;
        }

        console.log("correct answer");
        allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].statistics.correctAttempts += 1;

        setScore((prevState) => prevState + 1);

        if (currentQuestionIndex === quizQuestions.length - 1 && allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].answeredResult === allQuizzes[indexOfQuizSelected].questions.questionList[currentQuestionIndex].correctAnswer) {
            setIsQuizEnded(true);
            return;
        }

        setTimeout(() => {
            setCurrentQuestionIndex((current) => current + 1);
            setSelectedChoice(null);
        }, 1000);
    }

    return (
        <div className="rounded-sm m-9 w-9/12">
            <div className="flex items-center gap-2">
                <div className="bg-teal-600 flex justify-center items-center rounded-md w-11 h-11 text-white p-3">
                    {currentQuestionIndex + 1}
                </div>
                <p>
                    {quizQuestions[currentQuestionIndex].mainQuestion}
                </p>
            </div>

            <div className="mt-7 flex flex-col gap-2">
                {quizQuestions[currentQuestionIndex].choices.map((choice, indexChoice) => (
                    <div
                        key={indexChoice}
                        onClick={() => {
                            selectChoiceFunction(indexChoice);
                        }}
                        className={`p-3 ml-11 w-10/12 border border-teal-600 rounded-md hover:bg-teal-600 hover:text-white transition-all select-none 
                            ${selectedChoice === indexChoice ? 'bg-teal-600 text-white' : 'bg-white'}`}
                    >
                        {choice}
                    </div>
                ))}
            </div>

            <div className="flex justify-end mt-7">
                <Button
                    disabled={isQuizEnded}
                    className={`text-white rounded-md bg-teal-600 mr-[70px] ${isQuizEnded ? 'opacity-60' : 'opacity-100'}`}
                    onClick={moveToTheNextQuestion}
                >
                    Submit
                </Button>
            </div>
            {isQuizEnded && (
                <ScoreComponent
                    quizStartParentProps={{
                        setIsQuizEnded,
                        setIndexOfQuizSelected,
                        setCurrentQuestionIndex,
                        setSelectedChoice,
                        score,
                        setScore,
                    }}
                />
            )}
        </div>
    );
}

function ScoreComponent({ quizStartParentProps }) {
    const { quizToStartObject, allQuizzes } = useGlobalContextProvider();
    const { selectQuizToStart } = quizToStartObject;
    const numberOfQuestions = selectQuizToStart.questions.questionList.length;
    const router = useRouter();
    const {
        setIsQuizEnded,
        setIndexOfQuizSelected,
        setCurrentQuestionIndex,
        setSelectedChoice,
        setScore,
        score,
    } = quizStartParentProps;

    function emojiIconScore() {
        const result = (score / selectQuizToStart.questions.questionList.length) * 100;

        if (result < 25) {
            return <Frown size={100} />;
        }

        if (result === 50) {
            return <Smile size={100} />;
        }

        return <Laugh size={100} />;
    }

    function tryAgainFunction() {
        setIsQuizEnded(false);
        const newQuizIndex = allQuizzes.findIndex(
            (quiz) => quiz.id === selectQuizToStart.id
        );
        setIndexOfQuizSelected(newQuizIndex);
        setCurrentQuestionIndex(0);
        setSelectedChoice(null);
        setScore(0);
    }

    return (
        <Dialog open={true}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle></DialogTitle>
                    
                        <div className="flex flex-col items-center justify-center gap-4">
                            {emojiIconScore()}
                            <div className="flex gap-1 flex-col">
                                <span className="font-bold text-2xl">Your Score</span>
                                <div className="text-[22px] text-center">
                                    {score}/{numberOfQuestions}
                                </div>
                            </div>

                            <button
                                onClick={tryAgainFunction}
                                className="p-2 bg-green-700 rounded-md text-white px-6"
                            >
                                Try Again
                            </button>

                            <div className="w-full flex gap-2 flex-col mt-3">
                                <div className="flex gap-1 items-center justify-center">
                                    <CircleCheck />
                                    <span className="text-[14px]">Correct Answers: {score}</span>
                                </div>
                                <div className="flex gap-1 items-center justify-center">
                                    <CircleX />
                                    <span className="text-[14px]">
                                        Incorrect Answers: {selectQuizToStart.questions.questionList.length - score}
                                    </span>
                                </div>
                            </div>

                            <span
                                onClick={() => {
                                    router.push('/');
                                }}
                                className="text-green-700 select-none cursor-pointer text-sm mt-8"
                            >
                                Select Another Quiz
                            </span>
                        </div>
                    
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}