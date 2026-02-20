"use client";

import { addFavouriteInsight, getCompletedInsights, getFavouriteCategories, getFavouriteInsights, toggleFavouriteBook } from '@/app/services/userService';
import React, { use, useEffect, useState } from 'react'
import SearchBar from '../components/SearchBar';
import Link from 'next/link';
import ShareModal from '../components/ShareModal';
import CategoryDialog from '../components/CategoryDialog';
import { Slide, toast, ToastContainer } from "react-toastify"

type Categories = {
    name: string,
    // icon: string,
    description: string,
}
interface StepData {
    step: string;
    category: string;
    icon: string;
    id: number;
    title: string;
    // example: string;
    description: string;
    // recommended_response: string;
    // hypothetical_situation: string;
}
const page = () => {
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([])
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([])
    const [filteredInsights, setFilteredInsights] = useState<StepData[]>([])
    const [insights, setInsights] = React.useState<any[]>([]);
    const [categories, setCategories] = useState<Categories[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [shareModal, setShareModal] = useState(false)
    const [user, setUser] = useState<any>({})
    // const user = JSON.parse(localStorage.getItem("user") || "{}")

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        const fetchCategories = async () => {
            const categories = await getFavouriteCategories(user.user_id)
            //  const completedInsights = await getCompletedInsights(user.user_id, params.title);
            // console.log(completedInsights)
            // setCompletedInsights(completedInsights)
            setCategories(categories)
            setFilteredCategories(categories)
        }
        fetchCategories()
    }, [])
    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        )
        setIsOpen(false)
    }
    useEffect(() => {
        const fetchInsights = async () => {
            // if (!params.title) return
            try {
                const data = await getFavouriteInsights(
                    user.user_id,
                    selectedCategory.length ? selectedCategory.map(cat => cat.name) : []
                )
                console.log("Insights", data)
                setInsights(data)
                setFilteredInsights(data)

            } catch (error) {
                console.error("Error fetching steps:", error)
            }
        }

        fetchInsights()
    }, [selectedCategory])
    const handleAdd = async (id: number, category: string) => {
        try {
            let desc = categories.find((cate) => cate.name === category)?.description
            console.log(desc, id, category)
            await addFavouriteInsight(user.user_id, { id, category, description: desc ? desc : "", icon: "" })
            setFilteredInsights(filteredInsights.filter((insight) => insight.id !== id))
            setInsights(insights.filter((insight) => insight.id !== id))
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
        } catch (err: any) {
            console.error("Bookmarking failed:", err.message)
        }
    }

    return (
        <div>
            <div className="sticky top-0 w-full bg-white z-10 h-14 md:h-20">
                <div className={`flex justify-between items-center h-full`} >
                    <div className='flex flex-col gap-1'>
                        <div className='justify-between flex lg:text-3xl font-bold text-gray-700 text-3xl text-center md:text-left gap-2' >
                            <p>
                                Bookmarks
                            </p>
                        </div>
                    </div>
                    <div className=''>
                        <div className='md:flex gap-3' >
                            <SearchBar responsive={true} data={insights} propertyToSearch='title' setFilteredData={setFilteredInsights} />
                            <div className='flex flex-col gap-3 md:relative fixed right-0 m-4 md:m-0 bottom-0' >
                                <CategoryDialog
                                    categories={categories}
                                    filteredCategories={filteredCategories}
                                    setFilteredCategories={setFilteredCategories}
                                    selectedCategory={selectedCategory}
                                    toggleCategory={toggleCategory} />
                                {/* <button onClick={() => setMode("Swipe")} className="md:hidden p-3 bg-gradient-to-r text-white bg-gray-700  shadow cursor-pointer rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
                                    </svg>
                                </button> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="columns-1 md:columns-2 lg:columns-3 gap-3 space-y-3 md:gap-4 md:space-y-4" >
                {filteredInsights?.map((step, index) => (
                    <div className='relative rounded-2xl' key={step.id} >
                        <div className={`rounded-2xl h-full col-span-1 p-3 flex-col flex gap-4 break-inside-avoid bg-gray-200 `}  >
                            <Link href={`/insight/${step?.title}/${step?.category}/${step.id}`} className='flex flex-col gap-2' >
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
                                    {step.title}
                                </h4>
                                <h6 className='text-gray-800 mt-auto '>
                                    {step.description}
                                </h6>

                            </Link>
                            <div className="flex gap-2 justify-between mt-auto">
                                <button
                                    type="button"
                                    onClick={() => setShareModal(true)}
                                    className="text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold "
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                                    </svg>

                                </button>
                                <ShareModal isOpen={shareModal} setIsOpen={setShareModal} shareUrl={`/insight/${step?.title}/${step?.category}/${step.id}`} />
                                <button onClick={() => handleAdd(step.id, step.category)}
                                    type="button"
                                    className={`text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold  outline-gray-800 outline-1`}
                                ><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 0 1 1.743-1.342 48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664 19.5 19.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default page