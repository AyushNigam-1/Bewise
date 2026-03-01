"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getBookmarkedBooks } from "@/app/services/userService";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, BookData } from "@/app/types";
import SearchBar from "@/app/components/layout/SearchBar";
import CategoryDialog from "@/app/components/modals/CategoryModal";
import BookCard from "@/app/components/BookCards";
import { AnimatePresence, motion } from "framer-motion";

const EMPTY_BOOKS: BookData[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const BooksTab = () => {
    const user = useUserStore((state: { user: User | null }) => state.user);

    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<BookData[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);

    const { data: booksData, isLoading, isError } = useQuery({
        queryKey: ["bookmarkedBooks", user?.user_id],
        queryFn: () => getBookmarkedBooks(user!.user_id),
        enabled: !!user?.user_id,
    });

    const books = booksData?.books ?? EMPTY_BOOKS;
    const categories = booksData?.categories ?? EMPTY_CATEGORIES;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const categoryFilteredBooks = useMemo(() => {
        if (!selectedCategory || selectedCategory.length === 0) return books;
        const selectedNames = selectedCategory.map((c) => c.name);
        return books.filter((b: BookData) => {
            if (Array.isArray(b.category)) {
                return b.category.some(cat => selectedNames.includes(cat));
            }
            return selectedNames.includes(b.category);
        });
    }, [books, selectedCategory]);

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
        <div>
            {/* Sticky Header */}
            <div className="sticky top-0 w-full bg-white dark:bg-gray-900 z-10 h-14 md:h-20 transition-colors duration-300">
                <div className="flex justify-between items-center h-full">
                    <div className="justify-between flex lg:text-3xl font-bold text-gray-900 dark:text-gray-100 text-3xl text-center md:text-left gap-2">
                        <p>Bookmarks</p>
                    </div>
                    <div className="md:flex gap-3">
                        <SearchBar
                            responsive={true}
                            data={categoryFilteredBooks}
                            propertyToSearch="title"
                            setFilteredData={setFilteredBooks as React.Dispatch<React.SetStateAction<any[]>>}
                        />
                        <div className="flex flex-col gap-3 md:relative fixed right-0 m-4 md:m-0 bottom-0">
                            <CategoryDialog
                                categories={categories}
                                filteredCategories={filteredCategories}
                                setFilteredCategories={setFilteredCategories}
                                selectedCategory={selectedCategory}
                                toggleCategory={toggleCategory}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="pt-4">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center w-full py-20 text-gray-400">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="font-medium">Loading your books...</p>
                    </div>
                )}
                {isError && (
                    <div className="flex flex-col items-center justify-center w-full py-20 text-red-500">
                        <p className="font-medium">Oops! Something went wrong.</p>
                    </div>
                )}

                {!isLoading && !isError && (
                    <motion.div layout className="columns-2 gap-4 lg:columns-5 space-y-4 ">
                        <AnimatePresence mode="popLayout">
                            {filteredBooks?.map((book: any, index: number) => (
                                <motion.div
                                    key={index}
                                    layout
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 100,
                                        damping: 15,
                                        mass: 1
                                    }}
                                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                    className="break-inside-avoid"
                                >
                                    <BookCard
                                        book={book}
                                        isBookmarked={user?.favourite_books?.includes(book.id)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
                {
                    filteredBooks.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">No books found.</div>
                    )
                }
            </div>
        </div>
    );
};

export default BooksTab;
