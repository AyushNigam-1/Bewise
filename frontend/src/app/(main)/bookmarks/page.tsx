"use client";

import { useState } from "react";
import { Book, Lightbulb } from "lucide-react";
import InsightsTab from "@/app/components/tabs/InsightsTab";
import BooksTab from "@/app/components/tabs/BooksTab";


const BookmarksPage = () => {
    const [activeTab, setActiveTab] = useState<"insights" | "books">("insights");

    return (
        <div className="pb-24 relative min-h-screen transition-colors duration-300">
            {activeTab === "insights" ? <InsightsTab /> : <BooksTab />}

            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-1.5 rounded-xl flex gap-1 z-50 shadow-2xl border border-gray-700">
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-2 px-6 cursor-pointer py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'insights'
                        ? 'bg-gray-800 text-gray-200 shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                >
                    <Lightbulb size={18} className={activeTab === 'insights' ? "text-gray-200" : "text-gray-400"} />
                    Insights
                </button>
                <button
                    onClick={() => setActiveTab('books')}
                    className={`flex items-center hover:text-white cursor-pointer gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === 'books'
                        ? 'bg-gray-800 text-gray-200 shadow-md'
                        : 'text-gray-400 '
                        }`}
                >
                    <Book size={18} className={activeTab === 'books' ? "text-gray-200" : "text-gray-400"} />
                    Books
                </button>
            </div>
        </div>
    );
};

export default BookmarksPage;