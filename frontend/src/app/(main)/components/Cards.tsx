"use client"
import Link from "next/link";
import { useRouter } from "next/navigation"
import React, { useState } from "react";
import ShareModal from "./ShareModal";

interface Book {
    title: string;
    author: string;
    thumbnail: string;
    description: string;
    category: string[];
    sub_categories_count: number;
    total_insights: number;
    id: number;
}

interface CardProps {
    book: Book;
    bookmarkBook: (bookId: number) => void;
    isBookmarked: boolean
}

const Card: React.FC<CardProps> = ({ book, bookmarkBook, isBookmarked }) => {
    console.log(isBookmarked)
    const router = useRouter();
    console.log(book)
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Link className=" rounded-2xl cursor-pointer overflow-clip bg-gray-200  gap-2 p-2 break-inside-avoid flex flex-col" href={`/overview/${book.title}`} >
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
                            onClick={(e) => { e.stopPropagation(); bookmarkBook(book.id) }}
                            // onClick={() => handleAdd(step.step_id, step.category)}
                            type="button"
                        // className={`text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold ${bookmarked.includes(step.step_id) ? 'outline-gray-800 outline-1 text-gray-500' : ''} `}
                        >
                            {isBookmarked ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 0 1 1.743-1.342 48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664 19.5 19.5" />
                            </svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                            </svg>}
                        </button>
                        <button
                            type="button"
                            className="text-gray-600 bg-gray-100  focus:outline-none rounded-full p-2 w-min  font-semibold cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                            </svg>

                        </button>


                    </div>
                </div>
                {/* <h1>{book.title}</h1> */}
                {/* <div className="flex gap-3  flex-wrap " > */}
                {/* {book?.category?.map((category: any, index: number) => {
                        const mainCategory = category.trim().split("&")[0].trim(); // Split by "&" and take first part

                        return (
                            <h4
                                key={index}
                                className="bg-gray-100 py-1 px-2  rounded-lg w-min text-nowrap text-xs md:text-sm flex gap-1 text-gray-600  items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
                                </svg>
                                {mainCategory}
                            </h4>
                        );
                    })} */}
                {/* </div> */}

                <ShareModal isOpen={isOpen} setIsOpen={setIsOpen} shareUrl="https://www.example.com" />
            </div>
        </Link >
    );
};

export default Card;
