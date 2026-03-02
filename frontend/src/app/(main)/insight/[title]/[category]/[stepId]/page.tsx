"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bookmark, Share2, Volume2, Square, Loader2, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast, ToastContainer } from 'react-toastify';
import { getStepDetails } from "@/app/services/bookService";
import { useUserStore } from "@/app/stores/useUserStores";
import { fetchSessionRecommendations } from "@/app/services/userService";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";
import ShareModal from "@/app/components/modals/ShareModal";
import QuizModal from "@/app/components/modals/QuizModal";
import { Recommendation, User } from "@/app/types";

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    }
};

export default function Page() {
    const { stepId } = useParams<{ title: string; stepId: string }>();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
    const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { mutate: bookmarkInsight } = useBookmarkInsight();
    const user = useUserStore((state: any) => state.user as User | null);

    const { data: stepDetails, error } = useQuery({
        queryKey: ["step", stepId],
        queryFn: () => getStepDetails(stepId as string),
        enabled: !!stepId,
    });

    const handleToggleAudio = async () => {
        if (!stepDetails) return;

        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            return;
        }

        if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        setIsAudioLoading(true);
        try {
            const textToSpeak = stepDetails.description;

            const response = await fetch("http://localhost:8000/api/v1/generate-voice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: textToSpeak,
                    voice: "troy"
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate audio");
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);

            const audio = new Audio(audioUrl);
            audio.onended = () => setIsPlaying(false);

            audioRef.current = audio;
            audio.play();
            setIsPlaying(true);

        } catch (err) {
            console.error(err);
            toast.error("Failed to load audio");
        } finally {
            setIsAudioLoading(false);
        }
    };

    const actionButtons = [
        {
            id: "quiz",
            title: "Take a quick quiz",
            onClick: () => setIsQuizModalOpen(true),
            disabled: false,
            icon: <BrainCircuit size={20} />,
        },
        {
            id: "audio",
            title: isPlaying ? "Stop audio" : "Read aloud",
            onClick: handleToggleAudio,
            disabled: isAudioLoading,
            icon: isAudioLoading ? (
                <Loader2 size={20} className="animate-spin" />
            ) : isPlaying ? (
                <Square size={20} className="fill-current" />
            ) : (
                <Volume2 size={20} />
            ),
        },
        {
            id: "bookmark",
            title: user?.favourite_insights?.includes(stepDetails?.step_id) ? "Remove bookmark" : "Bookmark insight",
            onClick: () => bookmarkInsight(stepDetails?.step_id),
            disabled: false,
            icon: (
                <Bookmark
                    size={20}
                    className={user?.favourite_insights?.includes(stepDetails?.step_id) ? "fill-current" : ""}
                />
            ),
        },
        {
            id: "share",
            title: "Share insight",
            onClick: () => setIsOpen(true),
            disabled: false,
            icon: <Share2 size={20} />,
        },
    ];

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const formatMarkdown = (text: string | null | undefined): string => {
        if (!text) return "";
        try {
            return JSON.parse(`"${text}"`);
        } catch (e) {
            return text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
    };



    const {
        data: recommendations = [],
        isLoading: recommendationsLoading,
    } = useQuery({
        queryKey: ["session-recommend", stepId, user?.user_id],
        queryFn: () => fetchSessionRecommendations(user!.user_id, stepId),
        enabled: !!user && !!stepId,
    });

    if (error) return <p className="text-red-500">Error: {error.message}</p>;
    if (!stepDetails) return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;

    const markdownComponents: Components = {
        h1: ({ children }) => <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">{children}</h1>,
        h2: ({ children }) => <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-8">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 mt-6">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc ml-6 text-lg text-gray-700 dark:text-gray-300 space-y-2 mb-4">{children}</ul>,
        li: ({ children }) => <li className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</li>,
        p: ({ children }) => <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="show"
            className="prose prose-lg w-full py-2 md:py-4 flex flex-col gap-2 transition-colors duration-300"
        >
            <div className="flex justify-between items-start md:items-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {stepDetails.title}
                </h1>

                <div className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-4 md:m-0 z-40">
                    {actionButtons.map((btn) => (
                        <button
                            key={btn.id}
                            onClick={btn.onClick}
                            disabled={btn.disabled}
                            title={btn.title}
                            type="button"
                            className="flex items-center justify-center p-3 font-semibold text-white transition-colors bg-gray-900 rounded-full shadow-lg cursor-pointer dark:text-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none md:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {btn.icon}
                        </button>
                    ))}

                    <ShareModal
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                        shareUrl={`https://www.bookist.com/overview/${stepDetails?.title}`}
                    />

                    <QuizModal
                        isOpen={isQuizModalOpen}
                        setIsOpen={setIsQuizModalOpen}
                        textData={`${stepDetails.description}\n\n${formatMarkdown(stepDetails.detailed_breakdown)}`}
                    />
                </div>
            </div>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                {stepDetails.description}
            </p>

            <div>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                >
                    {formatMarkdown(stepDetails?.detailed_breakdown)}
                </ReactMarkdown>
            </div>

            <hr className="border-b border-gray-200 dark:border-gray-800 my-2 transition-colors" />

            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 my-2">Recommended Insights</h3>

            <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8"
            >
                {!recommendationsLoading
                    ? recommendations.map((recommendation: Recommendation) => (
                        <motion.div variants={cardVariants} key={recommendation.insight_id} className="h-full">
                            <div className="rounded-2xl h-full col-span-1 p-4 flex-col flex gap-4 break-inside-avoid bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 transition-colors hover:border-gray-300 dark:hover:border-gray-500">
                                <Link
                                    href={`/insight/${recommendation.title}/${recommendation?.category}/${recommendation.insight_id}`}
                                    className="flex flex-col gap-2 h-full"
                                >
                                    <div className="text-gray-600 dark:text-gray-400 font-medium text-sm flex gap-1 items-center w-min text-nowrap rounded-lg">
                                        <span>{recommendation.category_icon}</span>
                                        <span className="line-clamp-2">{recommendation.category}</span>
                                    </div>

                                    <h4 className="line-clamp-2 text-gray-900 dark:text-gray-100 font-semibold text-lg md:text-xl leading-tight">
                                        {recommendation.title}
                                    </h4>

                                    <h6 className="text-gray-600 dark:text-gray-400 mt-auto line-clamp-3 text-sm leading-relaxed">
                                        {recommendation.description}
                                    </h6>
                                </Link>
                            </div>
                        </motion.div>
                    ))
                    : Array.from({ length: 3 }).map((_, i) => (
                        <motion.div
                            variants={cardVariants}
                            key={i}
                            className="bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-4 animate-pulse h-full min-h-[160px]"
                        >
                            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                            <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-600 rounded" />
                            <div className="space-y-2 mt-auto">
                                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </motion.div>
                    ))}
            </motion.div>
            <ToastContainer />
        </motion.div>
    );
}