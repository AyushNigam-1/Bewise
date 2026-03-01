"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBookmarkedInsights } from "@/app/services/userService";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, StepData } from "@/app/types"; // Assuming you exported your types to a central file
import SearchBar from "@/app/components/layout/SearchBar";
import ShareModal from "@/app/components/modals/ShareModal";
import CategoryDialog from "@/app/components/modals/CategoryModal";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";
import { InsightCard } from "../InsightsCard";

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
        queryKey: ["bookmarkedInsights", user?.user_id],
        queryFn: () => getBookmarkedInsights(user!.user_id),
        enabled: !!user?.user_id,
    });
    console.log(insightsData)
    const insights = insightsData?.insights ?? EMPTY_INSIGHTS;
    const categories = insightsData?.categories ?? EMPTY_CATEGORIES;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const categoryFilteredInsights = useMemo(() => {
        if (!selectedCategory || selectedCategory.length === 0) return insights;
        const selectedNames = selectedCategory.map((c) => c.name);
        return insights.filter((i: StepData) => selectedNames.includes(i.category));
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

    return (
        <div>
            <div className="sticky top-0 w-full z-10 h-14 md:h-20 transition-colors duration-300">
                <div className="flex justify-between items-center h-full">
                    <div className="justify-between flex lg:text-3xl font-bold text-gray-900 dark:text-gray-100 text-3xl text-center md:text-left gap-2">
                        <p>Bookmarks</p>
                    </div>
                    <div className="md:flex gap-3">
                        <SearchBar
                            responsive={true}
                            data={categoryFilteredInsights}
                            propertyToSearch="title"
                            setFilteredData={setFilteredInsights as React.Dispatch<React.SetStateAction<any[]>>}
                        />
                        <div className="flex flex-col gap-3 md:relative fixed right-0 m-4 md:m-0 bottom-0">
                            <CategoryDialog
                                categories={categories}
                                filteredCategories={filteredCategories}
                                setFilteredCategories={setFilteredCategories}
                                selectedCategory={selectedCategory}
                                toggleCategory={toggleCategory}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div>
                {isLoading && (
                    <div className="flex flex-col items-center justify-center w-full py-20 text-gray-400">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="font-medium">Loading your insights...</p>
                    </div>
                )}
                {isError && (
                    <div className="flex flex-col items-center justify-center w-full py-20 text-red-500">
                        <p className="font-medium">Oops! Something went wrong.</p>
                    </div>
                )}

                {!isLoading && !isError && (
                    <motion.div layout className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredInsights.map((step, index) => (
                                <motion.div
                                    key={step.step_id}
                                    layout
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 100,
                                        damping: 15,
                                        mass: 1
                                    }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    className="break-inside-avoid"
                                >
                                    <InsightCard
                                        step={{ ...step, step: step.title }}
                                        bookTitle={step.book_name}
                                        isBookmarked={user?.favourite_insights?.includes(step.step_id) ?? false}
                                        onBookmark={bookmarkInsight}
                                        onShare={(title) => {
                                            setShareUrl(title);
                                            setShareModal(true);
                                        }}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {filteredInsights.length === 0 && (
                            <div className="w-full text-center py-12 text-gray-500">No insights found.</div>
                        )}
                    </motion.div>
                )}
            </div>

            <ShareModal isOpen={shareModal} setIsOpen={setShareModal} shareUrl={`https://www.bookist.com/insight/${shareUrl}`} />
            <ToastContainer />
        </div>
    );
};

export default InsightsTab;