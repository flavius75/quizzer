export interface Quiz {
    id: string
    title: string;
    type: string;
    creator_id: number;
    creation_date: string;
    category: string;
    tag: number,
    questions: Question[]
}

export type Question = {
    id: string;
    choices: string[];
    statistics : {totalAttempts: number, correctAttempts: number, incorrectAttempts: number}
    mainQuestion: string;
    correctAnswer: number;
    answeredResult: number

}

export type User {
    username: string;
    access_token: string;
    user_role: string;
    score: number
  }