"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import { SwatchBook } from 'lucide-react';
import SearchBar from '@/app/components/layout/SearchBar';
import { getBookContentKeys, getBookContentValue } from '@/app/services/bookService';
import ShareModal from '../../../components/modals/ShareModal';
import CategoryDialog from '../../../components/modals/CategoryModal';
import ChatbotModal from '../../../components/modals/ChatbotModal';
import Slider from '../../../components/layout/Slider';
import { useUserStore } from '@/app/stores/useUserStores';
import { useBookmarkInsight } from '@/app/hooks/mutations/useBookmark';
import { InsightCard } from '@/app/components/InsightsCard';
import Loader from '@/app/components/layout/Loader';
import { Categories, StepData } from '@/app/types';


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
    console.log("categories", categories)
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

    if (insightsLoading || categoriesLoading) return <Loader />;

    return (
        <div className="flex flex-col relative transition-colors duration-300 pb-12">
            {mode !== "Swipe" && (
                <div className="sticky top-0 w-full z-10 h-14 md:h-20 bg-white dark:bg-gray-900 transition-colors duration-300">
                    <div className="flex justify-between items-center h-full">
                        <div className='flex flex-col gap-1'>
                            <div className='justify-between flex lg:text-3xl font-bold text-gray-800 dark:text-gray-100 text-2xl text-center md:text-left gap-2'>
                                <p>Insights</p>
                            </div>
                        </div>
                        <div>
                            <div className='flex gap-3 items-center'>
                                <SearchBar responsive={true} data={steps} propertyToSearch='step' setFilteredData={setFilteredInsights} />
                                <div className='flex flex-col md:flex-row items-center gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0 z-40'>
                                    <CategoryDialog
                                        categories={categories}
                                        filteredCategories={filteredCategories}
                                        setFilteredCategories={setFilteredCategories}
                                        selectedCategory={selectedCategory}
                                        toggleCategory={toggleCategory}
                                    />
                                    <ChatbotModal
                                        book={decodeURIComponent(params?.title || "")}
                                        contextItems={steps.map((step: any) => ({ id: step.step_id, name: step.step }))}
                                    />
                                    <button
                                        onClick={() => setMode("Swipe")}
                                        className="md:hidden p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg cursor-pointer rounded-full transition-colors"
                                    >
                                        <SwatchBook size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mode === 'Swipe' ? (
                steps.length ? <Slider title={params?.title!} steps={steps} /> : null
            ) : (
                <>
                    {steps.length ? (
                        <motion.div layout className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredInsights.map((step) => (
                                    <motion.div
                                        key={step.step_id}
                                        layout
                                        // 1. Initial hidden state
                                        initial={{ opacity: 0, y: 40 }}
                                        // 2. Trigger animation ONLY when it scrolls into view
                                        whileInView={{ opacity: 1, y: 0 }}
                                        // 3. Only animate once, and trigger when 10% of the card is visible
                                        viewport={{ once: true, amount: 0.1 }}
                                        // 4. Smooth spring physics
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
                    ) : (
                        <Loader />
                    )}
                    <ShareModal isOpen={shareModal} setIsOpen={setShareModal} shareUrl={shareUrl} />
                </>
            )}
            <ToastContainer />
        </div>
    );
}