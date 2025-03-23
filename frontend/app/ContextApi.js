'use client';

import {createContext, useContext, useState, useEffect} from 'react'
import {QuizzesData} from "./QuizzesData"

const GlobalContext = createContext()

export function ContextProvider({children}) {
    const [allQuizzes, setAllQuizzes] = useState([])
    const [selectQuizToStart, setSelectQuizToStart] = useState(null)

    // useEffect(() => {
    //     setAllQuizzes(QuizzesData)
    // }, [])
    
    useEffect(() => {
        const fetchAllQuizzes = async () => {
            try {
              const response = await fetch('http://127.0.0.1:8000/quizzes/', {
                cache: 'no-cache',
              });
      
              if (!response.ok) {
                toast.error('Something went wrong...');
                throw new Error('fetching failed...');
              }
      
              const quizzesData = await response.json();
      
              setAllQuizzes(quizzesData);
            } catch (error) {
              console.log(error);
            } 
          };

          fetchAllQuizzes();
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