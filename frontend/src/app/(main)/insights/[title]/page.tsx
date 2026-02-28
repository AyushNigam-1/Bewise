"use client"

import SearchBar from '@/app/components/SearchBar';
import { getBookContentKeys, getBookContentValue } from '@/app/services/bookService';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loader from '@/app/components/Loader';
import ShareModal from '../../../components/modals/ShareModal';
import CategoryDialog from '../../../components/modals/CategoryModal';
import { ToastContainer } from 'react-toastify';
import { Bookmark, Share2, SwatchBook } from 'lucide-react';
import ChatbotModal from '../../../components/modals/ChatbotModal';
import { useUserStore } from '@/app/stores/useUserStores';
import { useQuery } from "@tanstack/react-query";
import { useMutations } from '@/app/hooks/useMutations';
import Slider from '../../../components/Slider';
import { useBookmarkInsight } from '@/app/hooks/mutations/useBookmark';

interface StepData {
    step: string;
    category: string;
    icon: string;
    step_id: number;
    description: string;
}

type Categories = {
    name: string,
    icon: string,
    description: string,
    steps_count: string
}

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

    if (insightsLoading || categoriesLoading) return <Loader />;

    return (
        <div className="flex flex-col relative transition-colors duration-300">
            {mode !== "Swipe" && (
                <div className="sticky top-0 w-full z-10 h-14 md:h-20 bg-white dark:bg-gray-900 transition-colors duration-300">
                    <div className={`flex justify-between items-center h-full `} >
                        <div className='flex flex-col gap-1'>
                            <div className='justify-between flex lg:text-3xl font-bold text-gray-800 dark:text-gray-100 text-2xl text-center md:text-left gap-2' >
                                <p>Insights</p>
                            </div>
                        </div>
                        <div className=''>
                            <div className='flex gap-3 items-center' >
                                <SearchBar responsive={true} data={steps} propertyToSearch='step' setFilteredData={setFilteredInsights} />
                                <div className='flex flex-col md:flex-row items-center gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0 z-40' >
                                    <CategoryDialog
                                        categories={categories}
                                        filteredCategories={filteredCategories}
                                        setFilteredCategories={setFilteredCategories} // Fixed to properly type setter if needed, or pass empty func
                                        selectedCategory={selectedCategory}
                                        toggleCategory={toggleCategory}
                                    />
                                    <ChatbotModal
                                        book={decodeURIComponent(params?.title || "")}
                                        contextItems={steps.map((step: any) => ({ id: step.step_id, name: step.step }))}
                                    />
                                    {/* Dark mode adapt: Invert colors for floating action button */}
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

            {
                mode === 'Swipe' ? (
                    steps.length ? <Slider title={params?.title!} steps={steps} /> : null
                ) : (
                    <>
                        {steps.length ? (
                            <div className="columns-1 md:columns-2 lg:columns-3 gap-3 space-y-3 md:gap-4 md:space-y-4" >
                                {filteredInsights.map((step) => (
                                    <div className='relative rounded-2xl' key={step.step_id} >
                                        {/* Card Wrapper: Switches to dark gray in dark mode */}
                                        <div className={`rounded-2xl h-full col-span-1 p-4 flex-col flex gap-4 break-inside-avoid bg-gray-100 dark:bg-gray-800 transition-colors border border-transparent dark:border-gray-700`}  >

                                            {/* BUG FIX: Using backticks for template literals in href */}
                                            <Link
                                                href={`/insight/${params.title}/${step?.category}/${step.step_id}`}
                                                className='flex flex-col gap-2'
                                            >
                                                <div className='flex justify-between items-center'>
                                                    {/* Pill color adaptations */}
                                                    <span className='text-gray-600 dark:text-gray-400 font-medium text-sm flex gap-1 items-center w-min text-nowrap flex-nowrap rounded-lg' >
                                                        <span>{step?.icon}</span>
                                                        <span>{step?.category}</span>
                                                    </span>
                                                </div>

                                                {/* Text color adaptations */}
                                                <h4 className='text-gray-800 dark:text-gray-100 font-semibold text-xl md:text-2xl leading-tight'>
                                                    {step.step}
                                                </h4>
                                                <h6 className='text-gray-600 dark:text-gray-300 mt-auto leading-relaxed'>
                                                    {step.description}
                                                </h6>
                                            </Link>

                                            <div className="flex gap-2 justify-between mt-auto items-center">
                                                <div className='flex gap-4 items-center justify-between w-full'>
                                                    <button
                                                        onClick={() => bookmarkInsight(step.step_id)}
                                                        type="button"
                                                        // Button styling adapts to dark mode 
                                                        className={`text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none rounded-full p-2.5 w-min font-semibold transition-colors shadow-sm`}
                                                    >
                                                        <Bookmark
                                                            size={18}
                                                            className={user?.favourite_insights?.includes(step.step_id) ? "fill-gray-600 dark:fill-gray-300" : ""}
                                                        />
                                                    </button>

                                                    <button
                                                        onClick={() => { setShareUrl(step.step); setShareModal(true) }}
                                                        type="button"
                                                        className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none rounded-full p-2.5 w-min font-semibold cursor-pointer transition-colors shadow-sm"
                                                    >
                                                        <Share2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Loader />
                        )}
                        <ShareModal isOpen={shareModal} setIsOpen={setShareModal} shareUrl={shareUrl} />
                    </>
                )
            }
            <ToastContainer />
        </div>
    );
}