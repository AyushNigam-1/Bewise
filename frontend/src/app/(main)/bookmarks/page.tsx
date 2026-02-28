"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Book, Bookmark, Lightbulb, Share2 } from "lucide-react";

import {
    getBookmarkedBooks,
    getBookmarkedInsights,
    getFavouriteCategories,
} from "@/app/services/userService";

import SearchBar from "../../components/SearchBar";
import ShareModal from "../../components/modals/ShareModal";
import CategoryDialog from "../../components/modals/CategoryModal";
import { useUserStore } from "@/app/stores/useUserStores";
import { User } from "@/app/types";
import { useMutations } from "@/app/hooks/useMutations";
import BookCard from "../../components/BookCards";
import { useBookmarkInsight } from "@/app/hooks/mutations/useBookmark";

type Categories = {
    name: string;
    description: string;
};

interface StepData {
    icon: string;
    step_id: number;
    book_name: string;
    category: string;
    title: string;
    description: string;
    detailed_breakdown: string;
}

interface BookData {
    id: number;
    title: string;
    author: string;
    thumbnail: string;
    description: string;
    category: string;
}

const Page = () => {
    const user = useUserStore((state: any) => state.user as User | null);

    const [activeTab, setActiveTab] = useState<"insights" | "books">("insights");
    const [shareModal, setShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredInsightsBySearch, setFilteredInsightsBySearch] = useState<
        StepData[]
    >([]);
    const [filteredBooksBySearch, setFilteredBooksBySearch] = useState<
        BookData[]
    >([]);

    const { mutate: bookmarkInsight } = useBookmarkInsight();

    const { data: insights = [], isLoading: insightsLoading } = useQuery({
        queryKey: ["bookmarkedInsights", user?.user_id],
        queryFn: () => getBookmarkedInsights(user!.user_id),
        enabled: !!user?.user_id,
        select: (data) => data.bookmarked_insights || [],
    });

    const { data: books = [], isLoading: booksLoading } = useQuery({
        queryKey: ["bookmarkedBooks", user?.user_id],
        queryFn: () => getBookmarkedBooks(user!.user_id),
        enabled: !!user?.user_id,
        select: (data) => data.bookmarked_books || [],
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["favouriteCategories", user?.user_id],
        queryFn: () => getFavouriteCategories(user!.user_id),
        enabled: !!user?.user_id,
        select: (data) => data.categories || [],
    });

    const categoryFilteredInsights = useMemo(() => {
        if (selectedCategory.length === 0) return insights;

        const selectedNames = selectedCategory.map((c) => c.name);
        return insights.filter((i: StepData) =>
            selectedNames.includes(i.category)
        );
    }, [insights, selectedCategory]);

    const finalInsights =
        filteredInsightsBySearch.length > 0 ||
            filteredInsightsBySearch.length === 0
            ? filteredInsightsBySearch.length === 0 &&
                selectedCategory.length === 0
                ? categoryFilteredInsights
                : filteredInsightsBySearch
            : categoryFilteredInsights;

    const finalBooks =
        filteredBooksBySearch.length > 0 ||
            filteredBooksBySearch.length === 0
            ? filteredBooksBySearch.length === 0
                ? books
                : filteredBooksBySearch
            : books;

    const toggleCategory = (category: Categories) => {
        setSelectedCategory((prev) =>
            prev.some((c) => c.name === category.name)
                ? prev.filter((c) => c.name !== category.name)
                : [...prev, category]
        );
    };



    return (
        <div className="pb-24 relative min-h-screen transition-colors duration-300">

            {/* --- HEADER --- */}
            <div className="sticky top-0 w-full bg-white dark:bg-gray-900 z-10 h-14 md:h-20 transition-colors duration-300">
                <div className="flex justify-between items-center h-full">
                    <div className="flex flex-col gap-1">
                        <div className="justify-between flex lg:text-3xl font-bold text-gray-900 dark:text-gray-100 text-3xl text-center md:text-left gap-2">
                            <p>Bookmarks</p>
                        </div>
                    </div>

                    <div>
                        <div className="md:flex gap-3">
                            {/* Dynamically switch search bar target based on active tab */}
                            {activeTab === 'insights' ? (
                                <SearchBar responsive={true} data={insights} propertyToSearch="title" setFilteredData={setFilteredInsightsBySearch} />
                            ) : (
                                <SearchBar responsive={true} data={books} propertyToSearch="title" setFilteredData={setFilteredBooksBySearch} />
                            )}

                            {/* Only show category filter if Insights are active */}
                            {activeTab === 'insights' && (
                                <div className="flex flex-col gap-3 md:relative fixed right-0 m-4 md:m-0 bottom-0">
                                    {/* <CategoryDialog
                                        categories={categories}
                                        filteredCategories={filteredCategories}
                                        setFilteredCategories={setFilteredCategories}
                                        selectedCategory={selectedCategory}
                                        toggleCategory={toggleCategory}
                                    /> */}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="">
                {activeTab === 'insights' ? (
                    // --- INSIGHTS GRID ---
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-3 space-y-3 md:gap-4 md:space-y-4">
                        {finalInsights?.map((step) => (
                            <div className="relative rounded-2xl" key={step.step_id}>
                                {/* Insight Card Background */}
                                <div className="rounded-2xl h-full col-span-1 p-4 flex-col flex gap-4 break-inside-avoid bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 transition-colors duration-300">
                                    <Link href={`/insight/${step?.title}/${step?.category}/${step.step_id}`} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            {/* Category Pill */}
                                            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm flex gap-1 items-center w-min text-nowrap flex-nowrap rounded-lg">
                                                <span>{step?.icon}</span>
                                                <span>{step?.category}</span>
                                            </span>
                                        </div>
                                        {/* Title & Description */}
                                        <h4 className="text-gray-900 dark:text-gray-100 font-semibold text-xl md:text-2xl leading-tight">
                                            {step.title}
                                        </h4>
                                        <h6 className="text-gray-600 dark:text-gray-300 mt-auto leading-relaxed">
                                            {step.description}
                                        </h6>
                                    </Link>

                                    {/* Actions */}
                                    <div className="flex gap-2 justify-between mt-auto items-center">
                                        <div className='flex gap-4 items-center justify-between w-full'>
                                            <button
                                                onClick={() => bookmarkInsight(step.step_id)}
                                                type="button"
                                                className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none rounded-full p-2.5 w-min font-semibold transition-colors shadow-sm"
                                            >
                                                <Bookmark
                                                    size={18}
                                                    // use fill-current to adapt to the dark/light text color seamlessly
                                                    className={user?.favourite_insights.includes(step.step_id) ? "fill-current" : ""}
                                                />
                                            </button>
                                            <button
                                                onClick={() => { setShareUrl(step.title); setShareModal(true) }}
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
                        {finalInsights.length === 0 && <p className="text-gray-500 dark:text-gray-400 mt-4">No insights bookmarked yet.</p>}
                    </div>
                ) : (
                    // --- BOOKS GRID ---
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {finalBooks?.map((book) => (
                            <BookCard key={`${book.id}`} book={book} isBookmarked={user?.favourite_books?.includes(book.id)} />
                        ))}
                        {finalBooks.length === 0 && <p className="text-gray-500 dark:text-gray-400 mt-4 col-span-full">No books bookmarked yet.</p>}
                    </div>
                )}
            </div>

            {/* --- FLOATING TABS --- */}
            {/* Kept this mostly dark-themed by default as it acts as a floating high-contrast action bar */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 p-1.5 rounded-full flex gap-1 z-50 shadow-2xl border border-gray-700">
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'insights'
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                >
                    <Lightbulb size={18} className={activeTab === 'insights' ? "text-gray-900" : "text-gray-400"} />
                    Insights
                </button>
                <button
                    onClick={() => setActiveTab('books')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'books'
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                >
                    <Book size={18} className={activeTab === 'books' ? "text-gray-900" : "text-gray-400"} />
                    Books
                </button>
            </div>

            <ShareModal isOpen={shareModal} setIsOpen={setShareModal} shareUrl={`https://www.bookworm.com/insight/${shareUrl}`} />
            <ToastContainer />
        </div>
    );
};

export default Page;