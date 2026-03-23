"use client";

import { useState } from "react";
import { Book, Lightbulb } from "lucide-react";
import InsightsTab from "@/app/components/tabs/InsightsTab";
import BooksTab from "@/app/components/tabs/BooksTab";

const BookmarksPage = () => {
    const [activeTab, setActiveTab] = useState<"insights" | "books">("insights");

    return (
        <div className="relative  transition-colors duration-300">
            {activeTab === "insights" ? <InsightsTab /> : <BooksTab />}

            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 p-1.5 rounded-2xl flex gap-1 z-50 shadow-xl border border-gray-200 dark:border-gray-800 transition-colors duration-300">

                <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-2 px-6 cursor-pointer py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'insights'
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                >
                    <Lightbulb size={18} />
                    Insights
                </button>

                <button
                    onClick={() => setActiveTab('books')}
                    className={`flex items-center gap-2 px-6 cursor-pointer py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'books'
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/50'
                        }`}
                >
                    <Book size={18} />
                    Books
                </button>

            </div>
        </div>
    );
};

export default BookmarksPage;