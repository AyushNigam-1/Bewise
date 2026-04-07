"use client"
import Link from "next/link";
import React from "react";
import { Bookmark, Share2 } from "lucide-react";
import { useBookmarkBook } from "@/app/hooks/mutations/useBookmark";
import { CardProps } from "@/app/types";

interface ExtendedCardProps extends CardProps {
    onShare: (url: string) => void;
}

const BookCard: React.FC<ExtendedCardProps> = ({ book, isBookmarked, onShare }) => {
    const { mutate: bookmarkBook } = useBookmarkBook();

    return (
        <div className="relative flex flex-col gap-4 w-full break-inside-avoid">
            <div className="group relative w-full flex overflow-clip rounded-2xl">
                <Link href={`/overview/${book.title}`} className="w-full outline-none block">
                    <img
                        src={book.thumbnail}
                        className="z-10 shadow-lg rounded-2xl w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        alt={book.title}
                    />
                </Link>

                <div className="absolute bottom-2 right-2 flex flex-col items-end gap-3 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            bookmarkBook(book.id);
                        }}
                        className="p-3 bg-white/90 dark:bg-gray-900 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none rounded-full font-semibold cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center border border-gray-200/50 dark:border-gray-700/50"
                        aria-label="Bookmark"
                    >
                        <Bookmark className={`size-4 md:size-6 transition-colors duration-200 ${isBookmarked ? "fill-current text-gray-800 dark:text-gray-200" : ""}`} />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                            onShare(`${baseUrl}/overview/${book.title}`);
                        }}
                        className="p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none rounded-full font-semibold cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center border border-gray-200/50 dark:border-gray-700/50"
                        aria-label="Share"
                    >
                        <Share2 className="size-4 md:size-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookCard;