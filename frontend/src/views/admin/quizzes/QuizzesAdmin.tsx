import { QuizData, columns } from "./columns"
import { DataTable } from "./data-table"
import { useEffect,  useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button"



export default function QuizzesAdmin() {

    const [ allQuizzes, setAllQuizzes ] = useState([])
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/quizzes/preview');
                setAllQuizzes(response.data); // Stocker les quiz dans le store
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };

        fetchUsers();
    }, [setAllQuizzes]);


    if (!allQuizzes) {
        return <div>Loading...</div>;
    }

    console.log(allQuizzes)

    const data= allQuizzes

    return(
        <>
        <div className="flex justify-between items-center">

            <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-5xl p-6">
                Quizzes
            </h1>
            <Button className="mx-6" onClick={() => navigate("/admin/quizzes/new")}>New quiz</Button>
        </div>

        <div className="container mx-auto p-6">
            <DataTable columns={columns} data={data} />
        </div>
        
    </>
    )
}

