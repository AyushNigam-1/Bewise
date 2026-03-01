"use client"
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Book, Bookmark, Share2, ShoppingBag, User } from "lucide-react";
import { ToastContainer } from "react-toastify";
import { motion } from "framer-motion"; // <-- Import framer-motion

import { getBookInfoByTitle } from "@/app/services/bookService";
import ShareModal from "../../../components/modals/ShareModal";
import { useUserStore } from "@/app/stores/useUserStores";
import { useBookmarkBook } from "@/app/hooks/mutations/useBookmark";
import Loader from "@/app/components/layout/Loader";
import { BookInfo } from "@/app/types";



// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15, // Delay between each element appearing
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" }
    },
};

const Overview = () => {
    const params = useParams<{ title?: string }>();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const user = useUserStore(state => state.user);
    const { mutate: bookmarkBook } = useBookmarkBook();

    // React Query Integration
    const { data: book, isLoading } = useQuery<BookInfo>({
        queryKey: ['book-info', params.title],
        queryFn: () => getBookInfoByTitle(params.title as string),
        enabled: !!params.title,
    });

    if (isLoading) return <Loader />

    return (
        // 1. Parent motion.div controls the stagger sequence
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4 w-full py-2 md:py-4 transition-colors duration-300"
        >
            <div className="flex flex-col md:flex-row relative gap-4 w-full">

                {/* 2. Animate the Book Cover */}
                <motion.img
                    variants={itemVariants}
                    src={book?.thumbnail}
                    className="z-30 rounded-xl mx-auto md:h-72 shadow-md md:w-auto object-cover"
                    alt={book?.title || "Book Cover"}
                />

                <div className="flex flex-col md:justify-between gap-4 w-full">
                    <div className="flex justify-between w-full items-start">

                        {/* 3. Animate the Title Block */}
                        <motion.div variants={itemVariants} className="flex flex-col md:items-start gap-4" >
                            <h1 className="text-gray-800 dark:text-gray-100 font-bold text-3xl md:text-4xl md:leading-none">
                                {book?.title}
                            </h1>
                            <span className="text-gray-600 dark:text-gray-400 text-sm md:text-lg flex items-center justify-between">
                                &bull; {book?.author} &nbsp; &bull;  {book?.sub_categories_count} Categories &nbsp; &bull;  {book?.total_insights} Insights
                            </span>

                            <div className="flex gap-4 md:gap-5 flex-wrap md:justify-normal max-w-[600px]">
                                {book?.categories?.split(/[,&]/).map((category: string, index: number) => (
                                    <h4
                                        className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 px-3 rounded-lg w-min text-nowrap text-xs md:text-sm flex gap-1 text-gray-800 dark:text-gray-200 items-center transition-colors"
                                        key={String(index)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
                                        </svg>
                                        {category.trim()}
                                    </h4>
                                ))}
                            </div>
                        </motion.div>

                        {/* Action Buttons (Top Right) */}
                        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0 z-40">
                            <button
                                onClick={() => book?.id && bookmarkBook(book.id)}
                                className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 p-3 rounded-full transition-colors shadow-lg md:shadow-none"
                            >
                                <Bookmark
                                    size={20}
                                    className={user?.favourite_books?.includes(book?.id || 0) ? "fill-current" : ""}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOpen(true)}
                                className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 p-3 rounded-full transition-colors shadow-lg md:shadow-none"
                            >
                                <Share2 size={20} />
                            </button>
                            <ShareModal isOpen={isOpen} setIsOpen={setIsOpen} shareUrl={`https://www.bookist.com/overview/${book?.title}`} />
                        </motion.div>
                    </div>

                    {/* 4. Animate the Primary Call to Action Buttons */}
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-3 justify-between w-full">
                        <Link
                            href={`/insights/${book?.title}`}
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 justify-center flex gap-2 items-center focus:outline-none rounded-lg py-2 px-4 md:text-lg font-semibold transition-colors "
                        >
                            <ArrowUpRight size={20} />
                            Get Insights
                        </Link>
                        <button
                            type="button"
                            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 justify-center flex gap-2 items-center focus:outline-none rounded-lg py-2 px-4 md:text-lg font-semibold transition-colors"
                        >
                            <ShoppingBag size={20} /> Buy on Amazon
                        </button>
                    </motion.div>
                </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800 my-4 transition-colors" />

            {/* 5. Animate the Description Sections */}
            <div className="space-y-6">
                <motion.div variants={itemVariants} className="space-y-2">
                    <p className="text-md text-gray-800 dark:text-gray-200 flex gap-2 items-center font-semibold">
                        <Book size={20} className="text-gray-500 dark:text-gray-400" />
                        About Book
                    </p>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Cumque sunt quidem nostrum inventore neque, molestiae eligendi officiis earum! Ipsa laudantium iste accusamus? Similique molestiae dolore aut alias! Dolorum molestiae voluptatibus dolorem quo deserunt et. Lorem ipsum dolor sit amet consectetur adipisicing elit. Vel repellendus aspernatur reprehenderit iusto, voluptatibus tempora eum aperiam, hic laboriosam ab, enim eveniet! Aliquam libero illo nisi unde laboriosam placeat ducimus voluptate incidunt dignissimos ipsum error dolorum in necessitatibus praesentium eveniet, doloremque eos atque quasi cumque.
                    </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                    <p className="text-md text-gray-800 dark:text-gray-200 flex gap-2 items-center font-semibold">
                        <User size={20} className="text-gray-500 dark:text-gray-400" />
                        About Author
                    </p>
                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Cumque sunt quidem nostrum inventore neque, molestiae eligendi officiis earum! Ipsa laudantium iste accusamus? Similique molestiae dolore aut alias! Dolorum molestiae voluptatibus dolorem quo deserunt et. Lorem ipsum dolor sit amet consectetur adipisicing elit. Vel repellendus aspernatur reprehenderit iusto, voluptatibus tempora eum aperiam, hic laboriosam ab, enim eveniet! Aliquam libero illo nisi unde laboriosam placeat ducimus voluptate incidunt dignissimos ipsum error dolorum in necessitatibus praesentium eveniet, doloremque eos atque quasi cumque.
                    </p>
                </motion.div>
            </div>

            <ToastContainer />
        </motion.div>
    );
};

export default Overview;