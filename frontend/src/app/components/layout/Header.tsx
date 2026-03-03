"use client";

import React from "react";
import { motion } from "framer-motion";
import SearchBar from "@/app/components/layout/SearchBar";
import CategoryDialog from "@/app/components/modals/CategoryModal";
import ChatbotModal from "@/app/components/modals/ChatbotModal";
import { Categories } from "@/app/types";

interface ExploreHeaderProps<T> {
    title: string;

    // 🔥 Generic data
    items: T[];
    filteredItems: T[];
    setFilteredItems: React.Dispatch<React.SetStateAction<T[]>>;
    searchKey: keyof T;

    // 🔥 Category props
    categories: Categories[];
    filteredCategories: Categories[];
    setFilteredCategories: React.Dispatch<React.SetStateAction<Categories[]>>;
    selectedCategory: Categories[];
    toggleCategory: (category: Categories) => void;

    // 🔥 How to map items for chatbot
    getItemId: (item: T) => number | string;
    getItemLabel: (item: T) => string;
}

function ExploreHeader<T>({
    title,
    items,
    filteredItems,
    setFilteredItems,
    searchKey,
    categories,
    filteredCategories,
    setFilteredCategories,
    selectedCategory,
    toggleCategory,
    getItemId,
    getItemLabel,
}: ExploreHeaderProps<T>) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                mass: 1,
            }}
            className="flex justify-between items-center h-14 md:h-18 sticky top-0 z-30 bg-white dark:bg-gray-900 transition-colors duration-300"
        >
            <h4 className="justify-between flex lg:text-3xl font-bold text-gray-700 dark:text-gray-200 text-3xl text-center md:text-left gap-2">
                {title}
            </h4>

            <div className="flex gap-2 items-center">
                <SearchBar
                    responsive={true}
                    data={items}
                    propertyToSearch={searchKey as string}
                    setFilteredData={setFilteredItems as any}
                />

                <div className="flex flex-col md:flex-row gap-2 md:relative fixed right-0 bottom-0 m-2 md:m-0">
                    <CategoryDialog
                        categories={categories}
                        filteredCategories={filteredCategories}
                        setFilteredCategories={setFilteredCategories}
                        selectedCategory={selectedCategory}
                        toggleCategory={toggleCategory}
                    />

                    <ChatbotModal
                        contextItems={filteredItems?.map((item) => ({
                            id: getItemId(item),
                            name: getItemLabel(item),
                        }))}
                    />
                </div>
            </div>
        </motion.div>
    );
}

export default ExploreHeader;