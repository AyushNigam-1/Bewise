"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Slide, toast, ToastContainer } from "react-toastify";
import { Book, Bookmark, Lightbulb, Share2 } from 'lucide-react';

import {
    addFavouriteInsight,
    getBookmarkedBooks,
    getBookmarkedInsights,
    getFavouriteCategories
} from '@/app/services/userService';

import SearchBar from '../components/SearchBar';
import ShareModal from '../components/ShareModal';
import CategoryDialog from '../components/CategoryDialog';
import { useUserStore } from '@/app/stores/useUserStores';
import { User } from '@/app/types';
import { useMutations } from '@/app/hooks/useMutations';

// --- TYPES ---
type Categories = {
    name: string,
    description: string,
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
    // UI States
    const user = useUserStore((state: any) => state.user as User | null);
    const [activeTab, setActiveTab] = useState<'insights' | 'books'>('insights');
    const [isOpen, setIsOpen] = useState(false);
    const [shareModal, setShareModal] = useState(false);

    // FIX: Added missing shareUrl state
    const [shareUrl, setShareUrl] = useState("");

    const { bookmarkInsight } = useMutations()
    const [categories, setCategories] = useState<Categories[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [insights, setInsights] = useState<StepData[]>([]);
    const [filteredInsights, setFilteredInsights] = useState<StepData[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);
    const [books, setBooks] = useState<BookData[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<BookData[]>([]);

    // 2. Fetch Bookmarks (Books & Insights)
    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user?.user_id) return;
            try {
                // Fetch Insights
                const insightsData = await getBookmarkedInsights(user.user_id);
                const fetchedInsights = insightsData.bookmarked_insights || [];

                // Frontend category filtering for insights
                if (selectedCategory.length > 0) {
                    const selectedNames = selectedCategory.map(c => c.name);
                    const filtered = fetchedInsights.filter((i: StepData) => selectedNames.includes(i.category));
                    setInsights(fetchedInsights);
                    setFilteredInsights(filtered);
                } else {
                    setInsights(fetchedInsights);
                    setFilteredInsights(fetchedInsights);
                }

                // Fetch Books
                const booksData = await getBookmarkedBooks(user.user_id);
                setBooks(booksData.bookmarked_books || []);
                setFilteredBooks(booksData.bookmarked_books || []);

            } catch (error) {
                console.error("Error fetching bookmarks:", error);
            }
        };

        fetchBookmarks();
    }, [user?.user_id, selectedCategory]);

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        );
        setIsOpen(false);
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
                                <SearchBar responsive={true} data={insights} propertyToSearch="title" setFilteredData={setFilteredInsights} />
                            ) : (
                                <SearchBar responsive={true} data={books} propertyToSearch="title" setFilteredData={setFilteredBooks} />
                            )}

                            {/* Only show category filter if Insights are active */}
                            {activeTab === 'insights' && (
                                <div className="flex flex-col gap-3 md:relative fixed right-0 m-4 md:m-0 bottom-0">
                                    <CategoryDialog
                                        categories={categories}
                                        filteredCategories={filteredCategories}
                                        setFilteredCategories={setFilteredCategories}
                                        selectedCategory={selectedCategory}
                                        toggleCategory={toggleCategory}
                                    />
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
                        {filteredInsights?.map((step) => (
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
                                                onClick={() => bookmarkInsight.mutate(step.step_id)}
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
                        {filteredInsights.length === 0 && <p className="text-gray-500 dark:text-gray-400 mt-4">No insights bookmarked yet.</p>}
                    </div>
                ) : (
                    // --- BOOKS GRID ---
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredBooks?.map((book) => (
                            <Link href={`/book/${book.title}`} key={book.id} className="group">
                                {/* Book Card Background */}
                                <div className="bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-2xl p-3 flex flex-col gap-3 h-full hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-colors duration-300">
                                    <div className="aspect-[2/3] w-full overflow-hidden rounded-xl bg-gray-300 dark:bg-gray-700">
                                        <img
                                            src={book.thumbnail}
                                            alt={book.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 text-lg leading-tight">
                                            {book.title}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{book.author}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {filteredBooks.length === 0 && <p className="text-gray-500 dark:text-gray-400 mt-4 col-span-full">No books bookmarked yet.</p>}
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