"use client";
import React, { Fragment, useEffect, useState } from "react";
import Card from "../components/Cards";
import SearchBar from "../components/SearchBar";
import { findBooksByCategories, getAllBooks, getAllCategories } from "@/app/services/bookService";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition } from '@headlessui/react'
import ShareModal from "../components/ShareModal";
import CategoryDialog from "../components/CategoryDialog";
import { getFavouriteBooks, toggleFavouriteBook } from "@/app/services/userService";
import { Bot, SlidersHorizontal } from "lucide-react";
import ChatbotModal from "../components/ChatbotModal";

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
    const [books, setBooks] = useState<Book[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
    const [filteredCategories, setFilteredCategories] = useState<Categories[]>([])
    const [isOpen, setIsOpen] = useState(false);
    const [openChatbot, setOpenChatbot] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Categories[]>([])
    const [categories, setCategories] = useState<Categories[]>([])
    const [bookmarkedBooks, setBookmarkedBooks] = useState<any[]>([])
    const [user, setUser] = useState<any>(null)
    // const user = JSON.parse(localStorage.getItem("user") || "{}")
    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        const fetchBooks = async () => {
            try {
                const books = await getAllBooks();
                const categories = await getAllCategories()
                // const bookmarks = await getFavouriteBooks(user.user_id)
                // setBookmarkedBooks(bookmarks)
                console.log(books)
                setBooks(books);
                setFilteredBooks(books);
                setCategories(categories)
                setFilteredCategories(categories)
            } catch (error) {
                console.error("Error fetching books:", error);
            }
        };
        fetchBooks();
    }, []);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const data = await findBooksByCategories(
                    selectedCategory.length ? selectedCategory.map(cat => cat.name) : []
                )
                setFilteredBooks(data)
            } catch (error) {
                console.error("Error fetching steps:", error)
            }
        }

        fetchInsights()
    }, [selectedCategory])

    const toggleCategory = (category: Categories) => {
        setSelectedCategory(prev =>
            prev.some(c => c.name === category.name)
                ? prev.filter(c => c.name !== category.name)
                : [...prev, category]
        )
        setIsOpen(false)
    }
    const bookmarkBook = async (bookId: number) => {
        try {
            const data = await toggleFavouriteBook(
                user.user_id,
                bookId
            )
            // console.log(data)
            setBookmarkedBooks(data)

        } catch (error) {
            console.error("Error fetching steps:", error)
        }
    }

    return (
        <div className="flex flex-col w-full " >
            <div className={`flex justify-between items-center h-14 md:h-18 sticky top-0 z-30 `} >
                <h4 className="justify-between flex lg:text-3xl font-bold text-gray-700 text-3xl text-center md:text-left gap-2" >Explore</h4>
                <div className="flex gap-2 items-center">
                    <SearchBar responsive={true} data={books} propertyToSearch='title' setFilteredData={setFilteredBooks} />
                    <div className="flex flex-col md:flex-row gap-2 md:relative fixed right-0 bottom-0 m-2 md:m-0">
                        <CategoryDialog
                            categories={categories}
                            filteredCategories={filteredCategories}
                            setFilteredCategories={setFilteredCategories}
                            selectedCategory={selectedCategory}
                            toggleCategory={toggleCategory} />
                        <ChatbotModal contextItems={books.map(book => ({ id: book.id, name: book.title }))} />
                    </div>
                </div>
            </div>
            <div className="columns-1 gap-3 lg:columns-5 space-y-4" >
                {filteredBooks.map((book: any) => (
                    <Card key={`${book.id}-${bookmarkedBooks.includes(book.id)}`} book={book} bookmarkBook={bookmarkBook} isBookmarked={bookmarkedBooks.includes(book.id)} />
                ))}
            </div>


        </div>

    );
};

export default Page;
