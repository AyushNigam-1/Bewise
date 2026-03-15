"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getBookmarkedBooks } from "@/app/services/userService";
import { useUserStore } from "@/app/stores/useUserStores";
import { User, Categories, BookData, Book } from "@/app/types";
import BookCard from "@/app/components/BookCards";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../layout/Header";

const EMPTY_BOOKS: Book[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const BooksTab = () => {
    const user = useUserStore((state: { user: User | null }) => state.user);
    console.log(user)
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);

    const { data: booksData, isLoading, isError } = useQuery({
        queryKey: ["bookmarkedBooks", user?.id],
        queryFn: () => getBookmarkedBooks(),
        enabled: !!user?.id,
    });

    const books = booksData?.books ?? EMPTY_BOOKS;
    const categories = booksData?.categories ?? EMPTY_CATEGORIES;

    useEffect(() => {
        setFilteredCategories(categories);
    }, [categories]);

    const categoryFilteredBooks = useMemo(() => {
        if (!selectedCategory.length) return books;

        const selectedNames = selectedCategory.map((c) => c.name);

        return books.filter((b: Book) => {
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

    if (!user || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={36} />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500">
                Something went wrong.
            </div>
        );
    }

    return (
        <div>

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

            <div>
                {filteredBooks.length > 0 ? (
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
                                            user?.favourite_books?.includes(book.id)
                                        }
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No books found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BooksTab;