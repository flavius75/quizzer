import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"

  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

import {EllipsisVertical, Target, Play, ChevronRight} from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import useGlobalContextProvider from "../ContextApi"

function successRate(singleQuiz){
    let correctQuestions = 0
    let totalAttempts = 0
    let successRate = 0

    singleQuiz.questions.questionList.forEach((question) => {
        totalAttempts += question.statistics.totalAttempts;
        correctQuestions += question.statistics.correctAttempts;
    })

    successRate = Math.ceil((correctQuestions/totalAttempts) *100);
    return successRate
}

export default function QuizCard({singleQuiz}){
    const {quizToStartObject} = useGlobalContextProvider();
    const {setSelectQuizToStart} = quizToStartObject    

    const {id, title, questions} = singleQuiz;
    const totalQuestions = questions.questionList.length;
    const globalSuccessRate = successRate(singleQuiz)


    return(
        <Card>
            <CardHeader>
                <div className="relative bg-teal-600 w-full h-32 flex justify-center items-center rounded-[5px]">
                    <div className="absolute cursor-pointer top-3 right-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">    
                                    <EllipsisVertical  color="white" size={24}/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                    </div>
                </div>                
            </CardHeader>
            <CardContent>
                <span className="text-lg font-bold">{title}</span>
                <p className="text-base font-light">{totalQuestions} Questions</p>
            </CardContent>
            <CardFooter>
                
                <div className="flex gap-3">
                    <div className="flex gap-1 items-center">
                        <Target size={28} />
                        <span className="text-sm">Success rate: {globalSuccessRate}%</span>
                    </div>

                    {/* <div className="bg-teal-600 rounded-full w-9 h-9 flex items-center justify-center">
                        <Play color="white" size={18}/>
                    </div> */}
                    <div onClick={() => setSelectQuizToStart(singleQuiz)}>    
                        <Link href={'/start-quiz/'+ id}>
                            <Button variant="outline" size="icon">
                                <ChevronRight />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardFooter>
        </Card>
    )
}