"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Bookmark, SearchX } from "lucide-react";
import { motion } from "framer-motion";
import { getBookmarkedInsights } from "@/app/services/bookmarkServices";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, StepData } from "@/app/types";
import ShareModal from "@/app/components/modals/ShareModal";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";
import { InsightCard } from "../cards/InsightsCard";
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

    const { data: insightsData, isLoading, isError } = useQuery({
        queryKey: ["bookmarkedInsights", user?.id],
        queryFn: () => getBookmarkedInsights(),
        enabled: !!user?.id,
    });

    const insights: StepData[] = insightsData?.data?.insights ?? insightsData?.insights ?? EMPTY_INSIGHTS;
    const categories = insightsData?.data?.categories ?? insightsData?.categories ?? EMPTY_CATEGORIES;

    const isDataLoading = !user || isLoading;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const hasAnyBookmarks = useMemo(() => {
        const favoriteIds = user?.favourite_insights || [];
        return insights.some(i => favoriteIds.includes(i.step_id));
    }, [insights, user?.favourite_insights]);

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

    const shouldShowHeader = !isDataLoading && hasAnyBookmarks;

    type ViewState = "loading" | "error" | "empty" | "no-matches" | "grid";
    const viewState: ViewState = isDataLoading
        ? "loading"
        : isError
            ? "error"
            : !hasAnyBookmarks
                ? "empty"
                : filteredInsights.length === 0
                    ? "no-matches"
                    : "grid";

    return (
        <div className="flex flex-col min-h-[85vh]">

            {shouldShowHeader && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="sticky top-0 z-30"
                >
                    <Header
                        title="Bookmarks"
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
            )}

            <div className="flex-grow w-full">

                {viewState === "loading" && (
                    <div className="w-full h-[90dvh] flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-400" size={36} />
                    </div>
                )}

                {viewState === "error" && (
                    <div className="w-full h-[80dvh] flex items-center justify-center text-red-500">
                        Something went wrong loading your bookmarks.
                    </div>
                )}

                {viewState === "empty" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full h-[80dvh] flex flex-col items-center justify-center text-center px-4"
                    >
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Bookmark size={48} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                            No insights saved
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                            You haven't bookmarked any insights yet. Start exploring to save your favorites!
                        </p>
                    </motion.div>
                )}

                {viewState === "no-matches" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="w-full h-[70vh] flex flex-col items-center justify-center text-center px-4"
                    >
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <SearchX size={48} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                            No matches found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                            None of your saved insights match the current filters. Try clearing your search or categories.
                        </p>
                    </motion.div>
                )}

                {viewState === "grid" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredInsights.map((step) => (
                                <motion.div
                                    key={step.step_id}
                                    layout="position"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="break-inside-avoid w-full h-full"
                                >

                                    <InsightCard
                                        step={{ ...step, step: step.title }}
                                        bookTitle={step.book_name}
                                        isBookmarked={
                                            user?.favourite_insights?.includes(step.step_id) ?? false
                                        }
                                        onBookmark={bookmarkInsight}
                                        onShare={(url) => {
                                            setShareUrl(url);
                                            setShareModal(true);
                                        }}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </div>

            <ShareModal
                isOpen={shareModal}
                setIsOpen={setShareModal}
                shareUrl={shareUrl}
            />
        </div>
    );
};

export default InsightsTab;