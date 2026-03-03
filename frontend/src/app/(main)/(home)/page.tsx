"use client";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "../../components/layout/SearchBar";
import { findBooksByCategories, getAllCategories } from "@/app/services/bookService";
import CategoryDialog from "../../components/modals/CategoryModal";
import ChatbotModal from "../../components/modals/ChatbotModal";
import { useUserStore } from "@/app/stores/useUserStores";
import { Categories, User } from "@/app/types";
import BookCard from "../../components/BookCards";
import Loader from "@/app/components/layout/Loader";
import Header from "@/app/components/layout/Header";

const Page = () => {
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
    const user = useUserStore((state: any) => state.user as User | null);

    const {
        data: books = [],
        isLoading: booksLoading,
    } = useQuery({
        queryKey: ["books-by-category", selectedCategory],
        queryFn: () =>
            findBooksByCategories(
                selectedCategory.length
                    ? selectedCategory.map(cat => cat.name)
                    : []
            ),
    });

    const {
        data: categories = [],
        isLoading: categoriesLoading,
    } = useQuery({
        queryKey: ["categories"],
        queryFn: getAllCategories,
    });

    useEffect(() => {
        if (books.length && categories.length) {
            setFilteredBooks(books);
            setFilteredCategories(categories);
        }
    }, [books, categories]);

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        );
    };

    // ✅ Absolute stable loading gate
    if (booksLoading || categoriesLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
                <Loader />
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full">
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

            <motion.div layout className="columns-2 gap-4 lg:columns-5 space-y-4">
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