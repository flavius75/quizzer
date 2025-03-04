'use client';

import Image from "next/image";
import Navbar from "./components/Navbar";
import Quizarea from "./components/QuizArea";
import useGlobalContextProvider from "./ContextApi";
import { useEffect } from "react";

export default function Home() {
  const {quizToStartObject} = useGlobalContextProvider();
  const {setSelectQuizToStart} = quizToStartObject;

  useEffect(() => {
    setSelectQuizToStart(null);
  }, []);
  
  return (
      <main className="h-full max-w-[1220px] mx-auto p-2 md:p-5">
        <Navbar/>
        <Quizarea />
      </main>
      
  );
}
