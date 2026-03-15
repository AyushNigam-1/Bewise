"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBookmarkedInsights } from "@/app/services/userService";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, StepData } from "@/app/types";
import ShareModal from "@/app/components/modals/ShareModal";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";
import { InsightCard } from "../InsightsCard";
import Header from "../layout/Header";

const EMPTY_INSIGHTS: StepData[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const InsightsTab = () => {
    console.log("working")
    const user = useUserStore((state: { user: User | null }) => state.user);
    console.log(user)

    const [shareModal, setShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredInsights, setFilteredInsights] = useState<StepData[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);

    const { mutate: bookmarkInsight } = useBookmarkInsight();

    const {
        data: insightsData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["bookmarkedInsights", user?.id],
        queryFn: () => getBookmarkedInsights(),
        enabled: !!user?.id,
    });

    const insights = insightsData?.insights ?? EMPTY_INSIGHTS;
    const categories = insightsData?.categories ?? EMPTY_CATEGORIES;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const categoryFilteredInsights = useMemo(() => {
        if (!selectedCategory.length) return insights;

        const selectedNames = selectedCategory.map((c) => c.name);
        return insights.filter((i: StepData) =>
            selectedNames.includes(i.category)
        );
    }, [insights, selectedCategory]);

    useEffect(() => {
        setFilteredInsights(categoryFilteredInsights);
    }, [categoryFilteredInsights]);

    const toggleCategory = useCallback((category: Categories) => {
        setSelectedCategory((prev) =>
            prev.some((c) => c.name === category.name)
                ? prev.filter((c) => c.name !== category.name)
                : [...prev, category]
        );
    }, []);

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={36} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500">
                Something went wrong.
            </div>
        );
    }

    return (
        <div>

            <Header
                title="Insights"
                items={insights}
                filteredItems={filteredInsights}
                setFilteredItems={setFilteredInsights}
                searchKey="title"
                categories={categories}
                filteredCategories={filteredCategories}
                setFilteredCategories={setFilteredCategories}
                selectedCategory={selectedCategory}
                toggleCategory={toggleCategory}
                getItemId={(step: StepData) => step.step_id}
                getItemLabel={(step: StepData) => step.title}
            />

            {filteredInsights.length > 0 && (
                <motion.div
                    layout
                    className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredInsights.map((step) => (
                            <motion.div
                                key={step.step_id}
                                layout
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.9,
                                    transition: { duration: 0.2 },
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 15,
                                }}
                                className="break-inside-avoid"
                            >
                                <InsightCard
                                    step={{ ...step, step: step.title }}
                                    bookTitle={step.book_name}
                                    isBookmarked={
                                        user?.favourite_insights?.includes(
                                            step.step_id
                                        ) ?? false
                                    }
                                    onBookmark={bookmarkInsight}
                                    onShare={(title) => {
                                        setShareUrl(title);
                                        setShareModal(true);
                                    }}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            <ShareModal
                isOpen={shareModal}
                setIsOpen={setShareModal}
                shareUrl={`https://www.bookist.com/insight/${shareUrl}`}
            />
            <ToastContainer />
        </div>
    );
};

export default InsightsTab;