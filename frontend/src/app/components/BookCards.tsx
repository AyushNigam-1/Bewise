"use client"
import Link from "next/link";
import React, { useState } from "react";
import ShareModal from "./modals/ShareModal";
import { Bookmark, Share } from "lucide-react";
import { useMutations } from "@/app/hooks/useMutations";

interface Book {
    title: string;
    author: string;
    thumbnail: string;
    description: string;
    category: string[];
    id: number;
}

interface CardProps {
    book: Book;
    isBookmarked: boolean | undefined
}

const BookCard: React.FC<CardProps> = ({ book, isBookmarked }) => {
    const [isOpen, setIsOpen] = useState(false)
    const { bookmarkBook } = useMutations()

    return (
        <Link className=" rounded-2xl cursor-pointer overflow-clip gap-2 break-inside-avoid flex flex-col" href={`/overview/${book.title}`} >
            <div className="flex flex-col gap-4 w-full">
                <div className="group relative w-full flex items-end overflow-clip rounded-xl  ">
                    <img
                        src={book.thumbnail}
                        className="z-10 shadow-lg rounded-2xl  object-contain"
                        alt={book.title}
                    />
                    <div className="absolute flex flex-col items-end group-hover:opacity-100 opacity-0 transition-opacity gap-4 w-full z-20 p-2 ">
                        <button
                            className={`text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold cursor-pointer ${isBookmarked ? 'outline-gray-800 outline-1 text-gray-500' : ''}`}
                            onClick={(e) => { e.stopPropagation(); bookmarkBook.mutate(book.id) }}
                            type="button"
                        >
                            <Bookmark
                                size={18}
                                className={isBookmarked ? "fill-current" : ""}
                            />
                        </button>
                        <button
                            type="button"
                            className="text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
                        >
                            <Share size={20} />
                        </button>
                    </div>
                </div>
                <ShareModal isOpen={isOpen} setIsOpen={setIsOpen} shareUrl="https://www.example.com" />
            </div>
        </Link >
    );
};

export default BookCard;
