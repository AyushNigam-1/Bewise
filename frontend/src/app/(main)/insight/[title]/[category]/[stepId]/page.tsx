"use client";

import { useState, Fragment } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getStepDetails } from "@/app/services/bookService";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ShareModal from "@/app/(main)/components/ShareModal";
import { Slide, toast, ToastContainer } from 'react-toastify';
import { Bookmark, Share2 } from "lucide-react";
import Link from "next/link";
import { Transition } from "@headlessui/react";
import { useUserStore } from "@/app/stores/useUserStores";
import { useQuery } from "@tanstack/react-query";
import { fetchSessionRecommendations } from "@/app/services/userService";
import { useMutations } from "@/app/hooks/useMutations";

interface StepDetails {
    step_id: number;
    title: string;
    description: string;
    detailed_breakdown: string;
}

interface Recommendation {
    insight_id: number;
    title: string;
    category: string;
    category_icon: string;
    description: string;
}

interface User {
    user_id: number;
    favourite_insights: number[];
}

export default function Page() {
    const { title, stepId } = useParams<{ title: string; stepId: string }>();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const router = useRouter();
    const { bookmarkInsight } = useMutations()

    const user = useUserStore((state: any) => state.user as User | null);

    const { data: stepDetails, isLoading: stepLoading, error } = useQuery({
        queryKey: ["step", stepId],
        queryFn: () => getStepDetails(stepId as string),
        enabled: !!stepId,
    });

    const formatMarkdown = (text: string | null | undefined): string => {
        if (!text) return "";
        try {
            return JSON.parse(`"${text}"`);
        } catch (e) {
            return text
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"');
        }
    };

    const {
        data: recommendations = [],
        isLoading: recommendationsLoading,
    } = useQuery({
        queryKey: ["session-recommend", stepId, user?.user_id],
        queryFn: () =>
            fetchSessionRecommendations(user!.user_id, stepId),
        enabled: !!user && !!stepId,
    });

    if (error) return <p className="text-red-500">Error: {error.message}</p>;
    if (!stepDetails) return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;

    // 1. Markdown Components updated with dark mode text colors
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
        <div className="prose prose-lg w-full py-2 md:py-4 flex flex-col gap-2 transition-colors duration-300">
            <div className="flex justify-between items-start md:items-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {stepDetails.title}
                </h1>

                {/* 2. Action Buttons matching the Overview dark mode standard */}
                <div className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-4 md:m-0 z-40">
                    <button
                        onClick={() => bookmarkInsight.mutate(stepDetails.step_id)}
                        type="button"
                        className="text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none rounded-full p-3 font-semibold transition-colors shadow-lg md:shadow-none"
                    >
                        <Bookmark
                            size={20}
                            // Changed to fill-current so it inherits the text color seamlessly
                            className={user?.favourite_insights?.includes(stepDetails.step_id) ? "fill-current" : ""}
                        />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none rounded-full p-3 font-semibold transition-colors shadow-lg md:shadow-none"
                    >
                        <Share2 size={20} />
                    </button>
                    <ShareModal
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                        shareUrl={`https://www.bookworm.com/overview/${stepDetails?.title}`}
                    />
                </div>
            </div>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                {stepDetails.description}
            </p>
            <div>
                {/* Markdown Wrapper */}
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                >
                    {formatMarkdown(stepDetails?.detailed_breakdown)}
                </ReactMarkdown>
            </div>

            <hr className="border-b border-gray-200 dark:border-gray-800 my-2  transition-colors" />

            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 my-2">Recommended Insights</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {/* 3. CRITICAL BUG FIX: Added '!' to check if NOT loading */}
                {!recommendationsLoading
                    ? recommendations.map((recommendation: Recommendation) => (
                        <Transition
                            key={recommendation.insight_id}
                            as={Fragment}
                            appear
                            show={true}
                            enter="transition-all duration-300 ease-out"
                            enterFrom="opacity-0 translate-y-3 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                        >
                            <div className="relative rounded-2xl h-full">
                                {/* Recommendation Card UI with Dark Mode */}
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
                            </div>
                        </Transition>
                    ))
                    : Array.from({ length: 3 }).map((_, i) => (
                        // Skeleton Loader Dark Mode
                        <div
                            key={i}
                            className="bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl p-4 flex flex-col gap-4 animate-pulse h-full min-h-[160px]"
                        >
                            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                            <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-600 rounded" />
                            <div className="space-y-2 mt-auto">
                                <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                        </div>
                    ))}
            </div>

            <ToastContainer />
        </div>
    );
}