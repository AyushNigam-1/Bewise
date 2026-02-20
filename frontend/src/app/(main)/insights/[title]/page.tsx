"use client"

import SearchBar from '@/app/(main)/components/SearchBar';
import { getBookContentKeys, getBookContentValue } from '@/app/services/bookService';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loader from '@/app/(main)/components/Loader';
import Slider from "@/app/(main)/components/Slider"
import ShareModal from '../../components/ShareModal';
import CategoryDialog from '../../components/CategoryDialog';
import { ToastContainer } from 'react-toastify';
import { Bookmark, Share2, SwatchBook } from 'lucide-react';
import ChatbotModal from '../../components/ChatbotModal';
import { useUserStore } from '@/app/stores/useUserStores';
import { useQuery } from "@tanstack/react-query";
import { useMutations } from '@/app/hooks/useMutations';

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
    const user = useUserStore(state => state.user);
    const { bookmarkInsight } = useMutations()

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

    if (insightsLoading) return <p>Loading...</p>;

    return (
        <div className="flex flex-col relative">
            {mode !== "Swipe" && <div className="sticky top-0 w-full  z-10 h-14 md:h-18 bg-white">
                <div className={`flex justify-between items-center h-full `} >
                    <div className='flex flex-col gap-1'>
                        <div className='justify-between flex lg:text-3xl font-bold text-gray-700 text-2xl text-center md:text-left  gap-2' >
                            <p>
                                Insights
                            </p>
                        </div>
                    </div>
                    <div className=''>
                        <div className='flex gap-3' >
                            {/* <ProgressBar completed={completedInsights.length} total={steps.length} /> */}
                            <SearchBar responsive={true} data={steps} propertyToSearch='step' setFilteredData={setFilteredInsights} />
                            <div className='flex flex-col md:flex-row items-center gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0' >
                                <CategoryDialog categories={categories} filteredCategories={filteredCategories} setFilteredCategories={() => ""} selectedCategory={selectedCategory} toggleCategory={toggleCategory} />
                                <ChatbotModal book={decodeURIComponent(params.title!)} contextItems={steps.map((step: any) => ({ id: step.step_id, name: step.step }))} />
                                <button onClick={() => setMode("Swipe")} className="md:hidden p-3 bg-gradient-to-r text-white bg-gray-700  shadow cursor-pointer rounded-full">
                                    <SwatchBook size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            }

            {
                mode == 'Swipe' ? steps.length && <Slider title={params?.title} steps={steps} /> : <>
                    {steps ? (
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-3 space-y-3 md:gap-4 md:space-y-4" >
                            {filteredInsights.map((step) => (
                                <div className='relative rounded-2xl' key={step.step_id} >
                                    <div className={`rounded-2xl h-full col-span-1 p-3 flex-col flex gap-4 break-inside-avoid bg-gray-100 `}  >
                                        <Link href="/insight/${params.title}/${step?.category}/${step.step_id}"
                                            className='flex flex-col gap-2' >
                                            <div className='flex justify-between items-center'>
                                                <span className=' text-gray-600 font-medium  text-sm flex gap-1 items-center w-min text-nowrap flex-nowrap rounded-lg' >
                                                    <span>
                                                        {step?.icon}   </span>
                                                    <span>
                                                        {step?.category}
                                                    </span>
                                                </span>
                                            </div>
                                            <h4 className='text-gray-700 font-semibold text-xl md:text-2xl '>
                                                {step.step}
                                            </h4>
                                            <h6 className='text-gray-800 mt-auto '>
                                                {step.description}
                                            </h6>

                                        </Link>
                                        <div className="flex gap-2 justify-between mt-auto items-center">
                                            <div className='flex gap-4 items-center justify-between'>
                                                <button onClick={() => bookmarkInsight.mutate(step.step_id)}
                                                    type="button"
                                                    className={`text-gray-600 bg-white  focus:outline-none rounded-full p-2 w-min  font-semibold  `}
                                                ><Bookmark size={18} className={user?.favourite_insights.includes(step.step_id) ? "fill-gray-500" : ""} />
                                                </button>
                                                <button
                                                    onClick={() => { setShareUrl(step.step); setShareModal(true) }}
                                                    type="button"
                                                    className="text-gray-600 bg-white focus:outline-none rounded-full p-2 w-min  font-semibold cursor-pointer"
                                                >
                                                    <Share2 size={20} />
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
            }
            <ToastContainer />
        </div >

    );
}
