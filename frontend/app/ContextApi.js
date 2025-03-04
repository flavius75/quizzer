'use client';

import {createContext, useContext, useState, useEffect} from 'react'
import {QuizzesData} from "./QuizzesData"

const GlobalContext = createContext()

export function ContextProvider({children}) {
    const [allQuizzes, setAllQuizzes] = useState([])
    const [selectQuizToStart, setSelectQuizToStart] = useState(null)

    useEffect(() => {
        setAllQuizzes(QuizzesData)
    }, [])

    return (
        <GlobalContext.Provider value={{allQuizzes, setAllQuizzes, quizToStartObject:{selectQuizToStart, setSelectQuizToStart}}}>
            {children}
        </GlobalContext.Provider>
    )
}

export default function useGlobalContextProvider(){
    return useContext(GlobalContext)
}