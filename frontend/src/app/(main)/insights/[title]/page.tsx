"use client"
import SearchBar from '@/app/(main)/components/SearchBar';
import { getBookContentKeys, getBookContentValue } from '@/app/services/bookService';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loader from '@/app/(main)/components/Loader';
import Slider from "@/app/(main)/components/Slider"
import { addFavouriteInsight, getCompletedInsights, getFavouriteIds } from '@/app/services/userService';
import ShareModal from '../../components/ShareModal';
import CategoryDialog from '../../components/CategoryDialog';
import { Slide, toast, ToastContainer } from 'react-toastify';
import ProgressBar from '../../components/ProgressBar';
import { Filter, SlidersHorizontal, SwatchBook } from 'lucide-react';
interface StepData {
    step: string;
    category: string;
    icon: string;
    step_id: number;
    // example: string;
    description: string;
    // recommended_response: string;
    // hypothetical_situation: string;
}
type Categories = {
    name: string,
    icon: string,
    description: string,
    steps_count: string
}
export default function Page() {
    const params = useParams<{ title?: string }>()
    const [steps, setSteps] = useState<StepData[]>([])
    const [categories, setCategories] = useState<Categories[]>([])
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([])
    const [filteredBooks, setFilteredBooks] = useState<StepData[]>([])
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([])
    const [bookmarks, setBookmarkes] = useState<number[]>([])
    const [mode, setMode] = useState("List")
    const [isOpen, setIsOpen] = useState(false)
    const [shareModal, setShareModal] = useState(false)
    const [shareUrl, setShareUrl] = useState("")
    const [user, setUser] = useState<any>()
    const [completedInsights, setCompletedInsights] = useState<string[]>([])
    // const user = JSON.parse(localStorage.getItem("user") || "{}")

    // useEffect(() => {
    //     const storedUser = localStorage.getItem("user");
    //     if (storedUser) {
    //         setUser(JSON.parse(storedUser));
    //     }
    //     const getbookmarksIds = async () => {
    //         if (!params?.title) return
    //         const bookmarksIds = await getFavouriteIds(user.user_id)
    //         const completedInsights = await getCompletedInsights(user.user_id, params.title);
    //         console.log(completedInsights)
    //         setCompletedInsights(completedInsights)
    //         setBookmarkes(bookmarksIds)
    //     }
    //     getbookmarksIds()
    // }, [])

    useEffect(() => {
        const fetchCategories = async () => {
            if (!params?.title) return
            try {
                const data = await getBookContentKeys(params.title)
                setCategories(data)
                setFilteredCategories(data)
                console.log(data)
            } catch (error) {
                console.error("Error fetching categories:", error)
            }
        }

        fetchCategories()
    }, [params?.title])

    useEffect(() => {
        const fetchInsights = async () => {
            if (!params.title) return
            try {
                const data = await getBookContentValue(
                    params.title,
                    selectedCategory.length ? selectedCategory.map(cat => cat.name) : []
                )
                setSteps(data)
                setFilteredBooks(data)
            } catch (error) {
                console.error("Error fetching steps:", error)
            }
        }

        fetchInsights()
    }, [params?.title, selectedCategory])

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        )
        setIsOpen(false)
    }

    const handleAdd = async (id: number, category: string, icon: string) => {
        try {
            let desc = categories.find((cate) => cate.name === category)?.description
            // console.log(id, category, desc, user.user_id)
            // await addFavouriteInsight(user.user_id, { id, category, description: desc ? desc : "", icon })

            if (!bookmarks.includes(id)) {
                setBookmarkes((bookmarks) => ([...bookmarks, id]))
                toast.success('Bookmark Added', {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                    transition: Slide,
                });
            }
            else {
                setBookmarkes((bookmarks) => bookmarks.filter((bookmark) => bookmark !== id))
                toast.error('Bookmark Removed', {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "colored",
                    transition: Slide,
                });
            }

        } catch (err: any) {
            console.error("Bookmarking failed:", err.message)
        }
    }

    return (
        <div className="flex flex-col relative">
            {mode !== "Swipe" && <div className="sticky top-0 w-full bg-gray-100 z-10 h-14 md:h-18">
                <div className={`flex justify-between items-center h-full`} >
                    <div className='flex flex-col gap-1'>
                        <div className='justify-between flex lg:text-3xl font-bold text-gray-700 text-2xl text-center md:text-left  gap-2' >
                            <p>
                                Insights
                            </p>
                        </div>
                    </div>
                    <div className=''>
                        <div className='flex gap-3' >
                            <ProgressBar completed={completedInsights.length} total={steps.length} />
                            <SearchBar responsive={true} data={steps} propertyToSearch='step' setFilteredData={setFilteredBooks} />
                            <div className='flex flex-col gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0' >
                                <button onClick={() => setIsOpen(true)} className=" p-3 font-semibold  bg-gradient-to-r text-white bg-gray-700  shadow cursor-pointer rounded-full  flex gap-2 items-center">
                                    <SlidersHorizontal size={20} />
                                </button>
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
                            {filteredBooks.map((step, index) => (
                                <div className='relative rounded-2xl' key={`${step.step_id}-${bookmarks.includes(step.step_id)}`} >
                                    <div className={`rounded-2xl h-full col-span-1 p-3 flex-col flex gap-4 break-inside-avoid bg-gray-200 `}  >
                                        <Link href={{
                                            pathname: `/insight/${params.title}/${step?.category}/${step.step_id}`,
                                            query: {
                                                isCompleted: completedInsights.includes(String(step.step_id)),
                                                // user_id: user.user_id
                                            }
                                        }} className='flex flex-col gap-2' >
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
                                            {
                                                completedInsights.includes(String(step.step_id)) ? <span className='flex gap-1 items-center mt-auto text-green-600' >

                                                    {/* <span className='p-1 rounded-full bg-gray-100'> */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 md:size-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                    </svg>

                                                    {/* </span> */}
                                                    <p className=' text-sm font-medium' >
                                                        Completed
                                                    </p>
                                                </span> : <span className='flex gap-1 items-center mt-auto text-yellow-600' >

                                                    {/* <span className='p-1 rounded-full bg-gray-100'> */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="md:size-5 size-4">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                    </svg>
                                                    {/* </span> */}
                                                    <p className=' text-sm font-medium' >
                                                        Pending
                                                    </p>
                                                </span>
                                            }
                                            <div className='flex gap-4 items-center'>
                                                <button onClick={() => handleAdd(step.step_id, step.category, step.icon)}
                                                    type="button"
                                                    className={`text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold ${bookmarks.includes(step.step_id) ? 'outline-gray-800 outline-1 text-gray-500' : ''} `}
                                                >{bookmarks.includes(step.step_id) ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 0 1 1.743-1.342 48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664 19.5 19.5" />
                                                </svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                                                </svg>}

                                                </button>
                                                <button
                                                    onClick={() => { setShareUrl(step.step); setShareModal(true) }}
                                                    type="button"
                                                    className="text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold cursor-pointer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                                    </svg>

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
                    <CategoryDialog isOpen={isOpen} setIsOpen={setIsOpen} categories={categories} filteredCategories={filteredCategories} setFilteredCategories={setFilteredCategories} selectedCategory={selectedCategory} toggleCategory={toggleCategory} />
                </>
            }
            <ToastContainer />
        </div >

    );
}