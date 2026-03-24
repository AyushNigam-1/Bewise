"use client";

import { GalleryVerticalEnd, Layers, List as ListIcon } from "lucide-react";
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
}: ExploreHeaderProps<T>) {
    return (
        <div
            className={`flex justify-between p items-center transition-all duration-300 ${mode === 'Swipe'
                ? 'h-0 bg-transparent pointer-events-none'
                : 'h-16 md:h-20 bg-white dark:bg-gray-900 pointer-events-auto'
                }`}
        >
            <div className="flex-1">
                {mode !== 'Swipe' && (
                    <h4 className="flex lg:text-3xl font-bold text-gray-700 dark:text-gray-200 text-2xl text-center md:text-left gap-2 transition-colors duration-300">
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

                <div className="flex flex-col md:flex-row gap-2 md:relative fixed right-0 bottom-0 m-4 md:m-0 pointer-events-auto z-50 ">

                    {setMode && (
                        <button
                            onClick={() => setMode((prev: any) => prev === 'List' ? 'Swipe' : 'List')}
                            className="p-3 md:hidden font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow cursor-pointer rounded-full flex gap-2 items-center transition-all duration-300 hover:scale-105"
                            aria-label="Toggle Mode"
                        >
                            {mode === 'Swipe' ? (
                                <ListIcon size={22} className="transition-colors duration-300" />
                            ) : (
                                <GalleryVerticalEnd size={22} className="transition-colors duration-300" />
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
        </div>
    );
}

export default Header;