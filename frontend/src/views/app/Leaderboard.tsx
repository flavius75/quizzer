import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from 'lucide-react';
import axios from 'axios';
import { useState, useEffect } from "react";
import { UserReadPublic } from "@/types";

export default function Leaderboard() {
    const [allUsers, setAllUsers] = useState<UserReadPublic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get('http://127.0.0.1:8000/users/leaderboard');
                setAllUsers(response.data);
            } catch (error: any) {
                console.error('Failed to fetch users:', error);
                setError(error.response?.data?.detail || 'Failed to load leaderboard');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy size={20} className="text-yellow-500" />;
            case 2:
                return <Medal size={20} className="text-gray-400" />;
            case 3:
                return <Award size={20} className="text-amber-600" />;
            default:
                return null;
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank <= 3) {
            const colors = {
                1: "bg-yellow-100 text-yellow-800 border-yellow-200",
                2: "bg-gray-100 text-gray-800 border-gray-200", 
                3: "bg-amber-100 text-amber-800 border-amber-200"
            };
            return colors[rank as keyof typeof colors];
        }
        return "bg-blue-100 text-blue-800 border-blue-200";
    };

    if (error) {
        return (
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold mb-8">Leaderboard</h1>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <p className="text-red-700">Failed to load leaderboard: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">🏆 Global Leaderboard</h1>
                <Badge variant="outline" className="text-sm">
                    {allUsers.length} Player{allUsers.length !== 1 ? 's' : ''}
                </Badge>
            </div>
            
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    <span className="ml-4 text-gray-600">Loading leaderboard...</span>
                </div>
            ) : allUsers.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                    <Trophy size={64} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No scores yet!</h3>
                    <p className="text-gray-500">Be the first to complete a quiz and appear on the leaderboard.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-20 text-center font-semibold">Rank</TableHead>
                                <TableHead className="font-semibold">Player</TableHead>
                                <TableHead className="text-right font-semibold">Total Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allUsers.map((user, index) => {
                                const rank = index + 1;
                                const isTopThree = rank <= 3;
                                
                                return (
                                    <TableRow 
                                        key={user.id} 
                                        className={`hover:bg-gray-50 transition-colors ${
                                            isTopThree ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                                        }`}
                                    >
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {getRankIcon(rank)}
                                                <Badge 
                                                    variant="outline" 
                                                    className={`${getRankBadge(rank)} font-bold text-sm`}
                                                >
                                                    #{rank}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className={`font-medium ${isTopThree ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {user.username}
                                                </span>
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell className="text-right">
                                            <span className={`font-bold text-lg ${
                                                rank === 1 ? 'text-yellow-600' : 
                                                rank === 2 ? 'text-gray-600' : 
                                                rank === 3 ? 'text-amber-600' : 
                                                'text-teal-600'
                                            }`}>
                                                {user.global_score}
                                            </span>
                                            <span className="text-gray-500 text-sm ml-1">pts</span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
            
            <div className="mt-6 text-center text-sm text-gray-500">
                <p>Scores are updated after completing quizzes. Keep playing to climb the leaderboard! 🚀</p>
            </div>
        </div>
    )
}