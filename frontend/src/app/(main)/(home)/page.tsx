"use client";
import React, { useEffect, useState } from "react";
import SearchBar from "../../components/SearchBar";
import { findBooksByCategories, getAllCategories } from "@/app/services/bookService";
import CategoryDialog from "../../components/modals/CategoryModal";
import ChatbotModal from "../../components/modals/ChatbotModal";
import { useQuery } from "@tanstack/react-query";
import { useMutations } from "@/app/hooks/useMutations";
import { useUserStore } from "@/app/stores/useUserStores";
import { Categories, User } from "@/app/types";
import BookCard from "../../components/BookCards";

const Page = () => {
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([])
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([])
    const [filteredBooks, setFilteredBooks] = useState<any>([])
    const user = useUserStore((state: any) => state.user as User | null);

    const { data: books = [] } = useQuery({
        queryKey: ["books-by-category", selectedCategory],
        queryFn: () =>
            findBooksByCategories(
                selectedCategory.length
                    ? selectedCategory.map(cat => cat.name)
                    : []
            ),
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: getAllCategories,
    });

    useEffect(() => {
        if (books.length && categories.length) {
            setFilteredBooks(books);
            setFilteredCategories(categories)
        }
    }, [books, categories]);

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        )
    }

    return (
        <div className="flex flex-col w-full" >
            <div className={`flex justify-between items-center h-14 md:h-18 sticky top-0 z-30 bg-white dark:bg-gray-900 transition-colors duration-300`} >

                <h4 className="justify-between flex lg:text-3xl font-bold text-gray-700 dark:text-gray-200 text-3xl text-center md:text-left gap-2" >
                    Explore
                </h4>

                <div className="flex gap-2 items-center">
                    <SearchBar responsive={true} data={books} propertyToSearch='title' setFilteredData={setFilteredBooks} />
                    <div className="flex flex-col md:flex-row gap-2 md:relative fixed right-0 bottom-0 m-2 md:m-0">
                        <CategoryDialog
                            categories={categories}
                            filteredCategories={filteredCategories}
                            setFilteredCategories={setFilteredCategories}
                            selectedCategory={selectedCategory}
                            toggleCategory={toggleCategory} />
                        <ChatbotModal contextItems={filteredBooks?.map((book: any) => ({ id: book.id, name: book.title }))} />
                    </div>
                </div>
            </div>

            <div className="columns-1 gap-3 lg:columns-5 space-y-4 py-4" >
                {filteredBooks?.map((book: any) => (
                    <BookCard key={`${book.id}`} book={book} isBookmarked={user?.favourite_books?.includes(book.id)} />
                ))}
            </div>
        </div>
    );
};

export default Page;