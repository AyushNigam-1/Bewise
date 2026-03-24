"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bookmark, Share2, Volume2, Square, Loader2, BrainCircuit } from "lucide-react";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import posthog from "posthog-js";
import { getStepDetails } from "@/app/services/bookService";
import { useUserStore } from "@/app/stores/useUserStores";
import { fetchSessionRecommendations } from "@/app/services/userService";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";
import ShareModal from "@/app/components/modals/ShareModal";
import QuizModal from "@/app/components/modals/QuizModal";
import { Recommendation, User } from "@/app/types";
import { InsightCard } from "@/app/components/cards/InsightsCard";
import { generateVoice } from "@/app/services/aiService";

const pageVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
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

    const [isOpen, setIsOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { mutate: bookmarkInsight } = useBookmarkInsight();
    const user = useUserStore((state: any) => state.user as User | null);

    const {
        data: stepDetails,
        isLoading: stepLoading,
        error
    } = useQuery({
        queryKey: ["step", stepId],
        queryFn: () => getStepDetails(stepId as string),
        enabled: !!stepId,
    });

    const {
        data: recommendations = [],
        isLoading: recommendationsLoading,
    } = useQuery({
        queryKey: ["session-recommend", stepId, user?.id],
        queryFn: () => fetchSessionRecommendations(stepId),
        enabled: !!user && !!stepId,
    });

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (stepDetails) {
            posthog.capture('insight_read', {
                insight_id: stepDetails.step_id,
                insight_title: stepDetails.title,
            });
        }
    }, [stepDetails?.step_id]);

    const formatMarkdown = (text: string | null | undefined): string => {
        if (!text) return "";
        try {
            return JSON.parse(`"${text}"`);
        } catch {
            return text.replace(/\\n/g, "\n").replace(/\\"/g, '"');
        }
    };

    const handleToggleAudio = async () => {
        if (!stepDetails) return;

        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            posthog.capture('insight_audio_played', { insight_id: stepDetails.step_id, action: 'stopped' });
            return;
        }

        if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        setIsAudioLoading(true);
        try {
            // 🌟 Use your shiny new service function here!
            const blob = await generateVoice(stepDetails.description);
            const audioUrl = URL.createObjectURL(blob);

            const audio = new Audio(audioUrl);
            audio.onended = () => setIsPlaying(false);

            audioRef.current = audio;
            audio.play();
            setIsPlaying(true);
            posthog.capture('insight_audio_played', { insight_id: stepDetails.step_id, action: 'started' });
        } catch (err) {
            toast.error("Failed to load audio");
        } finally {
            setIsAudioLoading(false);
        }
    };

    const actionButtons = [
        {
            id: "quiz",
            title: "Take a quick quiz",
            onClick: () => {
                posthog.capture('quiz_started', { insight_id: stepDetails?.step_id, insight_title: stepDetails?.title });
                setIsQuizModalOpen(true);
            },
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

    const markdownComponents: Components = {
        h1: ({ children }) => <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">{children}</h1>,
        h2: ({ children }) => <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-8">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 mt-6">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc ml-6 text-lg text-gray-700 dark:text-gray-300 space-y-2 mb-4">{children}</ul>,
        li: ({ children }) => <li className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</li>,
        p: ({ children }) => <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
    };

    const showLoader = stepLoading || !stepDetails;

    return (
        <>
            {showLoader ? (
                <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
                    <Loader2 size={40} className="animate-spin text-gray-400" />
                </div>
            ) : error ? (
                <div className="fixed inset-0 flex items-center justify-center text-red-500 bg-white dark:bg-gray-900">
                    Error: {error.message}
                </div>
            ) : (
                <motion.div
                    variants={pageVariants}
                    initial="hidden"
                    animate="show"
                    className="prose prose-lg w-full py-2 md:py-4 flex flex-col gap-2"
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

                    <p className="text-lg md:text-xl leading-relaxed">
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

                    <h3 className="text-2xl font-bold my-2">Recommended Insights</h3>

                    <motion.div
                        key={recommendationsLoading ? "loading" : "loaded"}
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-2"
                    >
                        {!recommendationsLoading
                            ? recommendations.map((recommendation: Recommendation) => (
                                <motion.div variants={cardVariants} key={recommendation.insight_id} className="h-full">
                                    <InsightCard
                                        step={{
                                            step: recommendation.title,
                                            category: recommendation.category,
                                            icon: recommendation.category_icon,
                                            step_id: recommendation.insight_id,
                                            description: recommendation.description,
                                        }}
                                        isBookmarked={user?.favourite_insights?.includes(recommendation.insight_id)}
                                        bookTitle={recommendation.title}
                                    />
                                </motion.div>
                            ))
                            : Array.from({ length: 3 }).map((_, i) => (
                                <motion.div
                                    variants={cardVariants}
                                    key={`skeleton-${i}`}
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
            )}
        </>
    );
}