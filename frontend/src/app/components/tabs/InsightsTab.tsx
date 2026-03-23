"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Loader2, Bookmark } from "lucide-react";
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
    const user = useUserStore((state: { user: User | null }) => state.user);

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
        const favoriteIds = user?.favourite_insights || [];
        const activeInsights = insights.filter((i: StepData) =>
            favoriteIds.includes(i.step_id)
        );

        if (!selectedCategory.length) return activeInsights;

        const selectedNames = selectedCategory.map((c) => c.name);
        return activeInsights.filter((i: StepData) =>
            selectedNames.includes(i.category)
        );
    }, [insights, selectedCategory, user?.favourite_insights]);

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


    return (
        <div className="flex flex-col ">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    mass: 1,
                }}
                className="sticky top-0 z-30"
            >
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
            </motion.div>

            <div className="flex-grow flex flex-col relative">
                <AnimatePresence mode="wait">

                    {!user || isLoading ? (
                        <motion.div
                            key="loader-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            className="flex-grow flex items-center justify-center min-h-[50vh]"
                        >
                            <Loader2 className="animate-spin text-gray-400" size={36} />
                        </motion.div>
                    ) : isError ? (
                        <motion.div
                            key="error-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-grow flex items-center justify-center text-red-500 min-h-[50vh]"
                        >
                            Something went wrong loading your bookmarks.
                        </motion.div>
                    ) : filteredInsights.length > 0 ? (
                        <motion.div
                            key="grid-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            className="w-full"
                        >
                            <motion.div layout className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
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
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex-grow flex flex-col items-center justify-center h-[85vh] text-center px-4"
                        >
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <Bookmark size={48} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                No insights saved
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                You haven't bookmarked any insights yet, or none match your current filters.
                            </p>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

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