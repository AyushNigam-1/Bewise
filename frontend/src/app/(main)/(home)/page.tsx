"use client";
import React, { useEffect, useState } from "react";
import Card from "../components/Cards";
import SearchBar from "../components/SearchBar";
import { findBooksByCategories, getAllCategories } from "@/app/services/bookService";
import CategoryDialog from "../components/CategoryDialog";
import ChatbotModal from "../components/ChatbotModal";
import { useQuery } from "@tanstack/react-query";
import { useMutations } from "@/app/hooks/useMutations";
import { useUserStore } from "@/app/stores/useUserStores";
import { User } from "@/app/types";

type Categories = {
    name: string,
    icon: string,
    description: string,
}
type Book = {
    author: string,
    category: string,
    description: string,
    id: number,
    thumbnail: string,
    title: string
}

const Page = () => {
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([])
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([])
    const [filteredBooks, setFilteredBooks] = useState<any>([])
    const { bookmarkBook } = useMutations()
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
            {/* Added bg-white dark:bg-gray-900 so the sticky header covers scrolling content properly */}
            <div className={`flex justify-between items-center h-14 md:h-18 sticky top-0 z-30 bg-white dark:bg-gray-900 transition-colors duration-300`} >

                {/* Updated text color for dark mode (dark:text-gray-200) */}
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

            {/* Added py-4 to give breathing room below the sticky header */}
            <div className="columns-1 gap-3 lg:columns-5 space-y-4 py-4" >
                {filteredBooks?.map((book: any) => (
                    <Card key={`${book.id}`} book={book} bookmarkBook={bookmarkBook.mutate} isBookmarked={user?.favourite_books?.includes(book.id)} />
                ))}
            </div>
        </div>
    );
};

export default Page;