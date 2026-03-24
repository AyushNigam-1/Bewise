"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { findBooksByCategories } from "@/app/services/bookService";
import { useUserStore } from "@/app/stores/useUserStores";
import { Categories, User } from "@/app/types";
import Header from "@/app/components/layout/Header";
import { Loader2 } from "lucide-react";
import BookCard from "@/app/components/cards/BookCards";

const EMPTY_BOOKS: any[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const Page = () => {
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
    const user = useUserStore((state: any) => state.user as User | null);

    const {
        data: responseData,
        isLoading,
    } = useQuery({
        queryKey: ["books-by-category", selectedCategory],
        queryFn: () =>
            findBooksByCategories(
                selectedCategory.length
                    ? selectedCategory.map(cat => cat.name)
                    : []
            ),
    });
    console.log(responseData)
    const books = responseData?.data?.books ?? responseData?.books ?? EMPTY_BOOKS;
    const categories = responseData?.data?.categories ?? responseData?.categories ?? EMPTY_CATEGORIES;
    console.log(books, categories)
    useEffect(() => {
        setFilteredBooks(books);
        setFilteredCategories(categories);
    }, [books, categories]);

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        );
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center transition-colors duration-300">
                <Loader2 size={40} className="animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full">

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
                    title="Explore"
                    items={books}
                    filteredItems={filteredBooks}
                    setFilteredItems={setFilteredBooks}
                    searchKey="title"
                    categories={categories}
                    filteredCategories={filteredCategories}
                    setFilteredCategories={setFilteredCategories}
                    selectedCategory={selectedCategory}
                    toggleCategory={toggleCategory}
                    getItemId={(book: any) => book.id}
                    getItemLabel={(book: any) => book.title}
                />
            </motion.div>

            <motion.div layout className="columns-2 gap-4 lg:columns-5 space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredBooks?.map((book: any, index: number) => (
                        <motion.div
                            key={book.id || index}
                            layout
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.1 }}
                            transition={{
                                type: "spring",
                                stiffness: 100,
                                damping: 15,
                                mass: 1,
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.9,
                                transition: { duration: 0.2 },
                            }}
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
        </div>
    );
};

export default Page;