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
import { Bookmark, BookmarkCheck, CheckCircle, CircleEllipsis, Dot, DotSquare, Filter, Share, Share2, SlidersHorizontal, SwatchBook } from 'lucide-react';
import ChatbotModal from '../../components/ChatbotModal';
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
                            <ProgressBar completed={completedInsights.length} total={steps.length} />
                            <SearchBar responsive={true} data={steps} propertyToSearch='step' setFilteredData={setFilteredBooks} />
                            <div className='flex flex-col md:flex-row items-center gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0' >
                                <CategoryDialog categories={categories} filteredCategories={filteredCategories} setFilteredCategories={setFilteredCategories} selectedCategory={selectedCategory} toggleCategory={toggleCategory} />
                                <ChatbotModal book={decodeURIComponent(params.title!)} contextItems={steps.map(step => ({ id: step.step_id, name: step.step }))} />
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
                                    <div className={`rounded-2xl h-full col-span-1 p-3 flex-col flex gap-4 break-inside-avoid bg-gray-100 `}  >
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
                                                completedInsights.includes(String(step.step_id)) ?
                                                    <span className='flex gap-1 items-center mt-auto text-green-600' >
                                                        <CheckCircle size={18} />
                                                        <p className=' text-sm font-medium' >
                                                            Completed
                                                        </p>
                                                    </span>
                                                    :
                                                    <span className='flex gap-1 items-center mt-auto text-yellow-600' >
                                                        <CircleEllipsis size={18} />
                                                        <p className=' text-sm font-medium' >
                                                            Pending
                                                        </p>
                                                    </span>
                                            }
                                            <div className='flex gap-4 items-center'>
                                                <button onClick={() => handleAdd(step.step_id, step.category, step.icon)}
                                                    type="button"
                                                    className={`text-gray-600 bg-white  focus:outline-none rounded-full p-2 w-min  font-semibold ${bookmarks.includes(step.step_id) ? 'outline-gray-300 outline-1 text-gray-500' : ''} `}
                                                >{bookmarks.includes(step.step_id) ? <BookmarkCheck size={18} /> : <Bookmark size={20} />}

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