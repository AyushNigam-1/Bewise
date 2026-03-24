"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, SearchX } from "lucide-react";
import { getBookmarkedBooks } from "@/app/services/userService";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, BookData, Book } from "@/app/types";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../layout/Header";
import BookCard from "../cards/BookCards";

const EMPTY_BOOKS: Book[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const BooksTab = () => {
    const user = useUserStore((state: { user: User | null }) => state.user);
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);

    const { data: booksData, isLoading, isError } = useQuery({
        queryKey: ["bookmarkedBooks", user?.id],
        queryFn: () => getBookmarkedBooks(),
        enabled: !!user?.id,
    });

    const books: Book[] = booksData?.data?.books ?? booksData?.books ?? EMPTY_BOOKS;
    const categories = booksData?.data?.categories ?? booksData?.categories ?? EMPTY_CATEGORIES;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const hasAnyBookmarks = useMemo(() => {
        const favoriteIds = user?.favourite_books || [];
        return books.some(b => favoriteIds.includes(b.id));
    }, [books, user?.favourite_books]);

    const categoryFilteredBooks = useMemo(() => {
        const favoriteIds = user?.favourite_books || [];
        const activeBooks = books.filter((b: Book) =>
            favoriteIds.includes(b.id)
        );

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

    return (
        <div className="flex flex-col">

            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    mass: 1,
                }}
                className="sticky top-0 z-30"
            >
                <Header
                    title="Books"
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

            <div className="flex-grow flex flex-col relative">
                <AnimatePresence mode="wait">

                    {!user || isLoading ? (
                        <motion.div
                            key="loader-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            className="flex-grow flex items-center justify-center min-h-[50vh]"
                        >
                            <Loader2 className="animate-spin text-gray-400" size={36} />
                        </motion.div>
                    ) : isError ? (
                        <motion.div
                            key="error-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-grow flex items-center justify-center text-red-500 font-medium min-h-[50vh]"
                        >
                            Something went wrong loading your bookmarked books.
                        </motion.div>

                    ) : !hasAnyBookmarks ? (
                        <motion.div
                            key="no-bookmarks-state"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex-grow flex flex-col items-center justify-center h-[70vh] text-center px-4"
                        >
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <BookOpen size={48} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                No books saved
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                You haven't bookmarked any books yet. Start exploring to build your library!
                            </p>
                        </motion.div>

                    ) : filteredBooks.length === 0 ? (
                        <motion.div
                            key="no-matches-state"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex-grow flex flex-col items-center justify-center h-[70vh] text-center px-4"
                        >
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                                <SearchX size={48} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                No matches found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                                None of your saved books match the current filters. Try clearing your search or categories.
                            </p>
                        </motion.div>

                    ) : (
                        <motion.div
                            key="grid-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            className="w-full"
                        >
                            <motion.div
                                layout
                                className="columns-2 gap-4 lg:columns-5 space-y-4"
                            >
                                <AnimatePresence mode="popLayout">
                                    {filteredBooks.map((book) => (
                                        <motion.div
                                            key={book.id}
                                            layout
                                            initial={{ opacity: 0, y: 40 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{
                                                opacity: 0,
                                                scale: 0.9,
                                                transition: { duration: 0.2 },
                                            }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 100,
                                                damping: 15,
                                                mass: 1,
                                            }}
                                            className="break-inside-avoid"
                                        >
                                            <BookCard
                                                book={book}
                                                isBookmarked={
                                                    user?.favourite_books?.includes(book.id) ?? false
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BooksTab;