"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import { getBookContentKeys, getBookContentValue } from '@/app/services/bookService';
import ShareModal from '../../../components/modals/ShareModal';
import Slider from '../../../components/layout/Slider';
import { useUserStore } from '@/app/stores/useUserStores';
import { useBookmarkInsight } from '@/app/hooks/mutations/useBookmark';
import { InsightCard } from '@/app/components/InsightsCard';
import Loader from '@/app/components/layout/Loader';
import { Categories, StepData } from '@/app/types';
import Header from '@/app/components/layout/Header';

export default function Page() {
    const params = useParams<{ title?: string }>()
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([])
    const [filteredInsights, setFilteredInsights] = useState<StepData[]>([])
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([])
    const [mode, setMode] = useState("List")
    const [shareModal, setShareModal] = useState(false)
    const [shareUrl, setShareUrl] = useState("")
    const user = useUserStore((state: any) => state.user);
    const { mutate: bookmarkInsight } = useBookmarkInsight();

    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ["categories", params?.title],
        queryFn: () => getBookContentKeys(params!.title!),
        enabled: !!params?.title,
    });

    const { data: steps = [], isLoading: insightsLoading } = useQuery({
        queryKey: [
            "insights",
            params?.title,
            selectedCategory.map(cat => cat.name)
        ],
        queryFn: () =>
            getBookContentValue(
                params!.title!,
                selectedCategory.length
                    ? selectedCategory.map(cat => cat.name)
                    : []
            ),
        enabled: !!params?.title,
    });

    useEffect(() => {
        if (steps.length && categories.length) {
            setFilteredInsights(steps);
            setFilteredCategories(categories)
        }
    }, [steps, categories]);

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        )
    }

    if (!params?.title || insightsLoading || categoriesLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-300">
                <Loader />
            </div>
        );
    }

    return (
        <div className="flex flex-col relative flex-grow bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">

            <Header
                title="Insights"
                items={steps}
                filteredItems={filteredInsights}
                setFilteredItems={setFilteredInsights}
                searchKey="step"
                categories={categories}
                filteredCategories={filteredCategories}
                setFilteredCategories={setFilteredCategories}
                selectedCategory={selectedCategory}
                toggleCategory={toggleCategory}
                getItemId={(step: StepData) => step.step_id}
                getItemLabel={(step: StepData) => step.step}
                setMode={setMode}
                mode={mode}
            />

            <div className="relative w-full flex-grow">
                <AnimatePresence mode="wait">
                    {mode === 'Swipe' ? (
                        <motion.div
                            key="swipe-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            {steps.length ? <Slider title={params?.title!} steps={steps} onShare={(title) => {
                                setShareUrl(title);
                                setShareModal(true);
                            }} /> : null}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            {filteredInsights.length ? (
                                <motion.div layout className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                                    <AnimatePresence mode="popLayout">
                                        {filteredInsights.map((step) => (
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
                                                    step={step}
                                                    bookTitle={params.title!}
                                                    isBookmarked={user?.favourite_insights?.includes(step.step_id)}
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
                            ) : null}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ShareModal isOpen={shareModal} setIsOpen={setShareModal} shareUrl={shareUrl} />
            <ToastContainer />
        </div>
    );
}