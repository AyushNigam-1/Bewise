"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Book,
  Bookmark,
  Loader2,
  Share2,
  Tag,
} from "lucide-react";
import posthog from "posthog-js";
import { motion } from "framer-motion";
import { getBookInfoByTitle } from "@/app/services/bookService";
import ShareModal from "../../../components/modals/ShareModal";
import { useUserStore } from "@/app/stores/useUserStores";
import { useBookmarkBook } from "@/app/hooks/mutations/useBookmark";
import { BookInfo } from "@/app/types";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const Overview = () => {
  const params = useParams<{ title?: string }>();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const user = useUserStore((state) => state.user);
  const { mutate: bookmarkBook } = useBookmarkBook();

  const { data: book, isLoading } = useQuery<BookInfo>({
    queryKey: ["book-info", params.title],
    queryFn: () => getBookInfoByTitle(params.title as string),
    enabled: !!params.title,
  });
  console.log(book);
  useEffect(() => {
    if (book) {
      posthog.capture("book_overview_viewed", {
        book_title: book.title,
        book_author: book.author,
        total_insights: book.total_insights,
      });
    }
  }, [book?.id]);

  if (!params.title || isLoading || !book) {
    return (
      <div className="fixed inset-0 flex items-center justify-center transition-colors duration-300">
        <Loader2 size={40} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4 w-full py-2 md:py-4 transition-colors duration-300"
    >
      <div className="flex flex-col md:flex-row relative gap-4 md:gap-8 w-full">
        {/* 🌟 FIX: Responsive Wrapper.
                    Mobile = Blurred Box.
                    Desktop (md) = Transparent normal wrapper */}
        <motion.div
          variants={itemVariants}
          className="relative flex flex-shrink-0 items-center justify-center w-full md:w-auto h-[280px] md:h-auto overflow-hidden md:overflow-visible rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-gray-100 dark:border-gray-800 md:border-none bg-gray-50 dark:bg-gray-900 md:bg-transparent dark:md:bg-transparent"
        >
          {/* Background Blur - ONLY visible on mobile (md:hidden) */}
          <img
            src={book.thumbnail}
            alt=""
            aria-hidden="true"
            className="md:hidden absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 dark:opacity-30 scale-125 z-0"
          />

          {/* Foreground Crisp Image - Adapts shadow/corners for mobile vs desktop */}
          <img
            src={book.thumbnail}
            className="relative z-10 h-56 md:h-72 w-auto object-contain rounded-md md:rounded-xl shadow-2xl md:shadow-md"
            alt={book.title || "Book Cover"}
          />
        </motion.div>

        <div className="flex flex-col md:justify-between gap-4 w-full">
          <div className="flex justify-between w-full items-start">
            <motion.div
              variants={itemVariants}
              className="flex flex-col md:items-start gap-4"
            >
              <h1
                data-testid="overview-title"
                className="text-gray-800 dark:text-gray-100 font-bold text-3xl md:text-4xl md:leading-none"
              >
                {book.title}
              </h1>
              <span className="text-gray-600 dark:text-gray-300 text-sm md:text-lg flex items-center justify-between">
                &bull; {book.author} &nbsp; &bull; {book.sub_categories_count}{" "}
                Categories &nbsp; &bull; {book.total_insights} Insights
              </span>

              <div className="flex gap-4 md:gap-5 flex-wrap md:justify-normal max-w-[600px]">
                {book.categories
                  ?.split(/[,&]/)
                  .map((category: string, index: number) => (
                    <h4
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 px-3 rounded-lg w-min text-nowrap text-xs md:text-sm flex gap-2 font-medium text-gray-800 dark:text-gray-200 items-center transition-colors"
                      key={String(index)}
                    >
                      <Tag size={15} />
                      {category.trim()}
                    </h4>
                  ))}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0 z-40"
            >
              <button
                data-testid="overview-bookmark-btn"
                onClick={() => book.id && bookmarkBook(book.id)}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 p-3 rounded-full transition-colors shadow-lg md:shadow-none"
              >
                <Bookmark
                  size={20}
                  className={
                    user?.favourite_books?.includes(book.id)
                      ? "fill-current"
                      : ""
                  }
                />
              </button>
              <button
                data-testid="overview-share-btn"
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 p-3 rounded-full transition-colors shadow-lg md:shadow-none"
              >
                <Share2 size={20} />
              </button>
              <ShareModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/overview/${book.title}`}
              />
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row gap-3 justify-between w-full"
          >
            <Link
              data-testid="get-insights-btn"
              href={`/insights/${book.title}`}
              onClick={() =>
                posthog.capture("get_insights_clicked", {
                  book_title: book.title,
                  book_author: book.author,
                })
              }
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 justify-center flex gap-2 items-center focus:outline-none rounded-lg py-2 px-4 md:text-lg font-semibold transition-colors "
            >
              <ArrowUpRight size={20} />
              Get Insights
            </Link>
            {/* <button
                            type="button"
                            className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 justify-center flex gap-2 items-center focus:outline-none rounded-lg py-2 px-4 md:text-lg font-semibold transition-colors"
                        >
                            <ShoppingBag size={20} /> Buy on Amazon
                        </button> */}
          </motion.div>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800 my-4 transition-colors" />

      <div className="space-y-6">
        <motion.div variants={itemVariants} className="space-y-2">
          <p className="text-md text-gray-800 dark:text-gray-200 flex gap-2 items-center font-semibold">
            <Book size={20} className="text-gray-500 dark:text-gray-400" />
            About Book
          </p>
          <p
            data-testid="overview-description"
            className="text-lg font-medium text-gray-600 dark:text-gray-300 "
          >
            {book.description}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Overview;
