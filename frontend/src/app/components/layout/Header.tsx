"use client";

import { motion } from "framer-motion";
import { Layers, List as ListIcon } from "lucide-react";
import SearchBar from "@/app/components/layout/SearchBar";
import CategoryDialog from "@/app/components/modals/CategoryModal";
import ChatbotModal from "@/app/components/modals/ChatbotModal";
import { ExploreHeaderProps } from "@/app/types";

function Header<T>({
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
    setMode,
    mode
}: ExploreHeaderProps<T> & { setMode?: any, mode?: string }) {
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
            // 🌟 FIX: Collapses height to h-0 and disables pointer events on the invisible wrapper in Swipe mode
            className={`flex justify-between items-center sticky top-0 z-30 transition-all duration-300 ${mode === 'Swipe'
                ? 'h-0 bg-transparent pointer-events-none'
                : 'h-14 md:h-18 bg-white dark:bg-gray-900 pointer-events-auto'
                }`}
        >
            <div className="flex-1">
                {mode !== 'Swipe' && (
                    <h4 className="flex lg:text-3xl font-bold text-gray-700 dark:text-gray-200 text-3xl text-center md:text-left gap-2 transition-colors duration-300">
                        {title}
                    </h4>
                )}
            </div>

            <div className="flex gap-2 items-center">
                {mode !== 'Swipe' && (
                    <SearchBar
                        responsive={true}
                        data={items}
                        propertyToSearch={searchKey as string}
                        setFilteredData={setFilteredItems as any}
                    />
                )}

                {/* 🌟 FIX: Added 'pointer-events-auto' here so the buttons stay clickable even when the header is collapsed! */}
                <div className="flex flex-col md:flex-row gap-2 md:relative fixed right-0 bottom-0 m-4 md:m-0 pointer-events-auto z-50">

                    {setMode && (
                        <button
                            onClick={() => setMode((prev: any) => prev === 'List' ? 'Swipe' : 'List')}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-300 rounded-full p-2.5 shadow-sm active:scale-95 flex items-center justify-center"
                            aria-label="Toggle Mode"
                        >
                            {mode === 'Swipe' ? (
                                <ListIcon size={22} className="transition-colors duration-300" />
                            ) : (
                                <Layers size={22} className="transition-colors duration-300" />
                            )}
                        </button>
                    )}

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

export default Header;