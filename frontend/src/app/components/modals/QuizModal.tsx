"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import posthog from "posthog-js";
import { generateQuizFromText } from "@/app/services/aiService";

export type QuizQuestion = {
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
};

type QuizModalProps = {
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
    textData: string;
};

export default function QuizModal({ isOpen, setIsOpen, textData }: QuizModalProps) {
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (isOpen && !quiz && textData) {
            generateQuiz();
        }
    }, [isOpen]);

    const generateQuiz = async () => {
        setLoading(true);
        try {
            // 🌟 Use the clean service call here
            const quizData = await generateQuizFromText(textData);
            setQuiz(quizData);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate quiz. Please try again.");
            setIsOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedAnswer) return;
        setSelectedAnswer(option);
        if (option === quiz![currentIndex].correct_answer) {
            setScore(prev => prev + 1);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < quiz!.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
        } else {
            const finalScore = selectedAnswer === quiz![currentIndex].correct_answer ? score + 1 : score;
            posthog.capture('quiz_completed', {
                score: finalScore,
                total_questions: quiz!.length,
                score_percentage: Math.round((finalScore / quiz!.length) * 100),
            });
            setIsFinished(true);
        }
    };

    const resetAndClose = () => {
        setIsOpen(false);
        setTimeout(() => {
            setQuiz(null);
            setCurrentIndex(0);
            setSelectedAnswer(null);
            setScore(0);
            setIsFinished(false);
        }, 300);
    };

    return (
        <Dialog open={isOpen} onClose={resetAndClose} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0" />

            <div className="fixed inset-0 flex items-center justify-center p-2">
                <DialogPanel transition className="w-full max-w-lg space-y-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 border border-gray-200 dark:border-gray-800">

                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            Knowledge Check
                        </h3>
                        <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                            <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                            <p className="font-medium animate-pulse">AI is crafting your quiz...</p>
                        </div>
                    )}

                    {!loading && quiz && !isFinished && (
                        <div className="flex flex-col h-full animate-in fade-in zoom-in duration-300">
                            <p className="text-sm font-semibold text-blue-500 mb-4 uppercase tracking-wider">
                                Question {currentIndex + 1} of {quiz.length}
                            </p>
                            <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 leading-relaxed">
                                {quiz[currentIndex].question}
                            </h4>

                            <div className="space-y-3 mb-6">
                                {quiz[currentIndex].options.map((option, idx) => {
                                    const isSelected = selectedAnswer === option;
                                    const isCorrect = option === quiz[currentIndex].correct_answer;
                                    const showStatus = selectedAnswer !== null;

                                    let buttonClass = "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200";

                                    if (showStatus) {
                                        if (isCorrect) buttonClass = "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/30 dark:border-green-500/50 dark:text-green-300";
                                        else if (isSelected) buttonClass = "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-300";
                                        else buttonClass = "opacity-50 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={showStatus}
                                            onClick={() => handleAnswer(option)}
                                            className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200 flex justify-between items-center ${buttonClass}`}
                                        >
                                            {option}
                                            {showStatus && isCorrect && <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />}
                                            {showStatus && isSelected && !isCorrect && <XCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedAnswer && (
                                <div className={`p-4 rounded-xl mb-6 text-sm leading-relaxed border animate-in slide-in-from-bottom-2 duration-300 ${selectedAnswer === quiz[currentIndex].correct_answer ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-200' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-200'}`}>
                                    <span className="font-bold block mb-1">Explanation:</span>
                                    {quiz[currentIndex].explanation}
                                </div>
                            )}

                            <button
                                disabled={!selectedAnswer}
                                onClick={nextQuestion}
                                className="w-full  bg-gray-900 py-4 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                            >
                                {currentIndex < quiz.length - 1 ? "Next Question" : "See Results"}
                            </button>
                        </div>
                    )}

                    {isFinished && quiz && (
                        <div className="flex flex-col space-y-4 items-center justify-center text-center animate-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center ">
                                <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{score}/{quiz.length}</span>
                            </div>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-gray-100 ">
                                {score === quiz.length ? "Perfect Score!" : score > 0 ? "Great Job!" : "Keep Learning!"}
                            </h4>
                            <p className="text-gray-600 dark:text-gray-400 ">
                                You have completed the knowledge check for this insight.
                            </p>
                            <button onClick={resetAndClose} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                                Back to Reading
                            </button>
                        </div>
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
}