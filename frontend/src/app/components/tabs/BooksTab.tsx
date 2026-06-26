"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, SearchX } from "lucide-react";
import { getBookmarkedBooks } from "@/app/services/bookmarkServices";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, BookData, Book } from "@/app/types";
import { motion } from "framer-motion";
import Header from "../layout/Header";
import BookCard from "../cards/BookCards";
import ShareModal from "../modals/ShareModal";

const EMPTY_BOOKS: Book[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 }
    },
};

const BooksTab = () => {
    const user = useUserStore((state: { user: User | null }) => state.user);
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);
    const [shareModal, setShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState("");

    const { data: booksData, isLoading, isError } = useQuery({
        queryKey: ["bookmarkedBooks", user?.id],
        queryFn: () => getBookmarkedBooks(),
        enabled: !!user?.id,
    });

    const books: Book[] = booksData?.data?.books ?? booksData?.books ?? EMPTY_BOOKS;
    const categories = booksData?.data?.categories ?? booksData?.categories ?? EMPTY_CATEGORIES;

    const isDataLoading = !user || isLoading;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const hasAnyBookmarks = useMemo(() => {
        const favoriteIds = user?.favourite_books || [];
        return books.some(b => favoriteIds.includes(b.id));
    }, [books, user?.favourite_books]);

    const categoryFilteredBooks = useMemo(() => {
        const favoriteIds = user?.favourite_books || [];
        const activeBooks = books.filter((b: Book) => favoriteIds.includes(b.id));

        if (!selectedCategory.length) return activeBooks;

        const selectedNames = selectedCategory.map((c) => c.name);
        return activeBooks.filter((b: Book) => {
            if (Array.isArray(b.category)) {
                return b.category.some(cat => selectedNames.includes(cat));
            }
            return selectedNames.includes(b.category);
        });
    }, [books, selectedCategory, user?.favourite_books]);

    useEffect(() => {
        setFilteredBooks(categoryFilteredBooks);
    }, [categoryFilteredBooks]);

    const toggleCategory = useCallback((category: Categories) => {
        setSelectedCategory((prev) =>
            prev.some((c) => c.name === category.name)
                ? prev.filter((c) => c.name !== category.name)
                : [...prev, category]
        );
    }, []);

    const shouldShowHeader = !isDataLoading && hasAnyBookmarks;

    type ViewState = "loading" | "error" | "empty" | "no-matches" | "grid";
    const viewState: ViewState = isDataLoading
        ? "loading"
        : isError
            ? "error"
            : !hasAnyBookmarks
                ? "empty"
                : filteredBooks.length === 0
                    ? "no-matches"
                    : "grid";

    return (
        <div className="flex flex-col flex-1 w-full min-h-[85vh]">

            {shouldShowHeader && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="sticky top-0 z-30"
                >
                    <Header
                        title="Bookmarks"
                        items={books}
                        filteredItems={filteredBooks}
                        setFilteredItems={setFilteredBooks}
                        searchKey="title"
                        categories={categories}
                        filteredCategories={filteredCategories}
                        setFilteredCategories={setFilteredCategories}
                        selectedCategory={selectedCategory}
                        toggleCategory={toggleCategory}
                        getItemId={(book: BookData) => book.id}
                        getItemLabel={(book: BookData) => book.title}
                    />
                </motion.div>
            )}

            <div className="flex-grow w-full px-2 sm:px-0">

                {viewState === "loading" && (
                    <div className="w-full h-[87dvh] flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-400" size={36} />
                    </div>
                )}

                {viewState === "error" && (
                    <div className="w-full h-[87dvh] flex items-center justify-center text-red-500 font-medium text-sm sm:text-base text-center px-4">
                        Something went wrong loading your bookmarked books.
                    </div>
                )}

                {viewState === "empty" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full h-[87dvh] flex flex-col items-center justify-center text-center px-4"
                    >
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-5 sm:p-6 rounded-full mb-4 sm:mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <BookOpen size={40} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500 sm:w-12 sm:h-12" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                            No books saved
                        </h3>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-[280px] sm:max-w-sm leading-relaxed">
                            You haven't bookmarked any books yet. Start exploring to build your library!
                        </p>
                    </motion.div>
                )}

                {viewState === "no-matches" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full h-[87dvh] flex flex-col items-center justify-center text-center px-4"
                    >
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-5 sm:p-6 rounded-full mb-4 sm:mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <SearchX size={40} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500 sm:w-12 sm:h-12" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                            No matches found
                        </h3>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-[280px] sm:max-w-sm leading-relaxed">
                            None of your saved books match the current filters. Try clearing your search or categories.
                        </p>
                    </motion.div>
                )}

                {viewState === "grid" && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="w-full"
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                            {filteredBooks.map((book) => (
                                <motion.div
                                    key={book.id}
                                    variants={itemVariants}
                                >
                                    <BookCard
                                        book={book}
                                        isBookmarked={
                                            user?.favourite_books?.includes(book.id) ?? false
                                        }
                                        onShare={(url) => {
                                            setShareUrl(url);
                                            setShareModal(true);
                                        }}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </div>

            <ShareModal
                isOpen={shareModal}
                setIsOpen={setShareModal}
                shareUrl={shareUrl}
            />
        </div>
    );
};

export default BooksTab;