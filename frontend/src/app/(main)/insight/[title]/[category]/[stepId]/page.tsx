"use client";

import { useState, Fragment } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getStepDetails, toggleBookmarkInsight } from "@/app/services/bookService";
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ShareModal from "@/app/(main)/components/ShareModal";
import { Slide, toast, ToastContainer } from 'react-toastify';
import { Bookmark, Share2 } from "lucide-react";
import axios from "axios";
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


    if (error) return <p>Error: {error.message}</p>;
    if (!stepDetails) return <p>Loading...</p>;

    // 5. Explicitly type the ReactMarkdown components to avoid implicit 'any' warnings
    const markdownComponents: Components = {
        h1: ({ children }) => <h1 className="text-6xl font-bold">{children}</h1>,
        h2: ({ children }) => <h2 className="text-3xl font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-bold text-gray-700">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc ml-6 text-lg">{children}</ul>,
        li: ({ children }) => <li className="text-gray-600">{children}</li>,
        p: ({ children }) => <p className="text-lg leading-relaxed">{children}</p>,
    };

    return (
        <div className="prose prose-lg text-gray-700 mt-2 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-700 ">{stepDetails.title}</h1>
                <div className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0">
                    <button
                        onClick={() => bookmarkInsight.mutate(stepDetails.step_id)}
                        type="button"
                        className="text-white bg-gray-700 focus:outline-none rounded-full p-3 font-semibold"
                    >
                        <Bookmark
                            size={20}
                            className={user?.favourite_insights.includes(stepDetails.step_id) ? "fill-white" : ""}
                        />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="inline-flex items-center gap-2 bg-gray-700 p-3 text-sm/6 font-semibold text-white rounded-full"
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

            <p className="text-lg text-gray-600">{stepDetails.description}</p>

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
            >
                {formatMarkdown(stepDetails?.detailed_breakdown)}
            </ReactMarkdown>

            <hr className="border-b border-gray-300" />
            <h3 className="text-2xl font-semibold">Recommended Insights</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendationsLoading
                    ? recommendations.map((recommendation) => (
                        <Transition
                            key={recommendation.insight_id}
                            as={Fragment}
                            appear
                            show={true}
                            enter="transition-all duration-300 ease-out"
                            enterFrom="opacity-0 translate-y-3 scale-95"
                            enterTo="opacity-100 translate-y-0 scale-100"
                        >
                            <div className="relative rounded-2xl">
                                <div className="rounded-2xl h-full col-span-1 p-3 flex-col flex gap-4 break-inside-avoid bg-gray-100">
                                    <Link
                                        href={{
                                            pathname: `/insight/${recommendation.title}/${recommendation?.category}/${recommendation.insight_id}`,
                                        }}
                                        className="flex flex-col gap-2"
                                    >
                                        <div className="text-gray-900 font-medium text-sm flex gap-1 items-center w-min text-nowrap rounded-lg">
                                            <span>{recommendation.category_icon}</span>
                                            <span className="line-clamp-2">{recommendation.category}</span>
                                        </div>

                                        <h4 className="line-clamp-1 text-gray-700 font-semibold text-xl md:text-2xl">
                                            {recommendation.title}
                                        </h4>

                                        <h6 className="text-gray-800 mt-auto line-clamp-3">
                                            {recommendation.description}
                                        </h6>
                                    </Link>
                                </div>
                            </div>
                        </Transition>
                    ))
                    : Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-gray-100 rounded-xl p-3 space-y-3 animate-pulse"
                        >
                            <div className="h-4 w-24 bg-gray-300 rounded" />
                            <div className="h-8 w-3/4 bg-gray-400 rounded" />
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-gray-300 rounded" />
                                <div className="h-4 w-5/6 bg-gray-300 rounded" />
                                <div className="h-4 w-2/3 bg-gray-300 rounded" />
                            </div>
                        </div>
                    ))}
            </div>

            <ToastContainer />
        </div>
    );
}