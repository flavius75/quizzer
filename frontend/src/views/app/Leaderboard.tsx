import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import axios from 'axios';
import { useState, useEffect } from "react";

export default function Leaderboard() {


    const [ allUsers, setAllUsers ] = useState([])

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/users/leaderboard');
                setAllUsers(response.data); // Stocker les quiz dans le store
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };

        fetchUsers();
    }, [setAllUsers]);


    if (!allUsers) {
        return <div>Loading...</div>;
    }

    return(
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            
            <Table className="mt-8">
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">Rank</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="text-right">Score</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allUsers.map((singleUser, userIndex) =>(
                                         <TableRow key={userIndex} >
                                            <TableCell className="font-medium">{userIndex + 1}</TableCell>
                                            <TableCell>{singleUser.username}</TableCell>
                                            <TableCell className="text-right">{singleUser.score}</TableCell>
                                         </TableRow>
                                    ))}   
               
                
            </TableBody>
            </Table>
        </div>
    )
}