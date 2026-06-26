"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { findBooksByCategories } from "@/app/services/bookService";
import { useUserStore } from "@/app/stores/useUserStores";
import { Book, Categories, User } from "@/app/types";
import Header from "@/app/components/layout/Header";
import { Loader2, SearchX } from "lucide-react";
import BookCard from "@/app/components/cards/BookCards";
import ShareModal from "@/app/components/modals/ShareModal";

const EMPTY_BOOKS: any[] = [];
const EMPTY_CATEGORIES: Categories[] = [];

const ExplorePage = () => {
  const [filteredCategories, setFilteredCategories] = useState<Categories[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState<Categories[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const user = useUserStore((state: any) => state.user as User | null);

  const { data: responseData, isLoading } = useQuery({
    queryKey: ["books-by-category", selectedCategory.map((cat) => cat.name)],
    queryFn: () =>
      findBooksByCategories(
        selectedCategory.length ? selectedCategory.map((cat) => cat.name) : []
      ),
  });

  const books = responseData?.books ?? EMPTY_BOOKS;
  const categories = responseData?.categories ?? EMPTY_CATEGORIES;

  useEffect(() => {
    setFilteredBooks(books);
    setFilteredCategories(categories);
  }, [books, categories]);

  const toggleCategory = (category: Categories) => {
    setSelectedCategory((prev) =>
      prev.some((c) => c.name === category.name)
        ? prev.filter((c) => c.name !== category.name)
        : [...prev, category],
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
      {/* Sticky Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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

      <div className="flex-grow w-full pb-4">
        <AnimatePresence mode="wait">
          {filteredBooks?.length > 0 ? (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="columns-2 gap-4 lg:columns-5 space-y-4"
            >
              <AnimatePresence>
                {filteredBooks.map((book: any, index: number) => (
                  <motion.div
                    key={book.id || index}
                    layout="position"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      transition: { duration: 0.15 },
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
                      isBookmarked={user?.favourite_books?.includes(book.id)}
                      onShare={(url) => {
                        setShareUrl(url);
                        setShareModal(true);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full h-[70vh] flex flex-col items-center justify-center text-center px-4"
            >
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-full mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <SearchX
                  size={48}
                  strokeWidth={1.5}
                  className="text-gray-400 dark:text-gray-500"
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                No matches found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
                None of the books match the current filters. Try clearing your
                search or categories.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ShareModal
        isOpen={shareModal}
        setIsOpen={setShareModal}
        shareUrl={shareUrl}
      />
    </div>
  );
};

export default ExplorePage;
