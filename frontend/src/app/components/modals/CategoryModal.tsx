"use client"

import React, { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import SearchBar from '../layout/SearchBar'
import { SlidersHorizontal, X, CheckCircle } from 'lucide-react'
import { CategoryProps } from '@/app/types'


const CategoryDialog: React.FC<CategoryProps> = ({
    filteredCategories,
    setFilteredCategories,
    categories,
    toggleCategory,
    selectedCategory
}) => {
    const [isOpen, setIsOpen] = useState(false)

    const handleClose = () => {
        setIsOpen(false);
        setFilteredCategories(categories);
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-3 font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow cursor-pointer rounded-full flex gap-2 items-center transition-all duration-300 hover:scale-105"
            >
                <SlidersHorizontal size={20} />
            </button>

            <Dialog open={isOpen} onClose={handleClose} className="relative z-50">

                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0"
                />

                <div className="fixed inset-0 w-screen p-4 flex justify-center items-center">
                    <DialogPanel
                        transition
                        className="w-full max-w-lg shadow-2xl rounded-2xl bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 p-4 md:p-5 flex flex-col gap-4 transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 data-[closed]:translate-y-4 sm:data-[closed]:translate-y-0"
                    >
                        <div className='justify-between flex items-center mb-1'>
                            <DialogTitle className="font-bold text-xl md:text-2xl text-gray-900 dark:text-gray-100">
                                Select Categories
                            </DialogTitle>
                            <button
                                onClick={handleClose}
                                type="button"
                                className="text-gray-500 dark:text-gray-400 cursor-pointer focus:outline-none w-min font-semibold transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <SearchBar responsive={false} data={categories} propertyToSearch='name' setFilteredData={setFilteredCategories} />

                        <div className="overflow-y-auto h-[50vh] md:h-[400px] gap-3 flex flex-col rounded-lg custom-scroll-hide mt-2">
                            {filteredCategories?.map((category) => {
                                const isSelected = selectedCategory?.some(c => c.name === category.name);

                                return (
                                    <div className="relative overflow-visible block" key={category.name}>
                                        <button
                                            onClick={() => {
                                                toggleCategory(category);
                                                setIsOpen(false);
                                            }}
                                            className={`relative flex flex-col gap-2 rounded-xl select-none cursor-pointer w-full p-3 transition-colors duration-200 text-left border-2
                                                ${isSelected
                                                    ? 'bg-gray-200 dark:bg-gray-800 border-gray-400 dark:border-gray-500 shadow-sm'
                                                    : 'bg-gray-100 dark:bg-gray-800/50 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }
                                            `}
                                        >
                                            <div className='flex flex-col gap-1 w-full'>
                                                <div className='flex gap-2 justify-between items-start w-full'>
                                                    <div className='flex gap-2 text-base md:text-lg items-center'>
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {category.icon}
                                                        </span>
                                                        <h4 className='font-semibold text-gray-800 dark:text-gray-200 flex gap-2 leading-tight'>
                                                            {category.name}
                                                        </h4>
                                                    </div>
                                                    {isSelected && (
                                                        <span className='z-10 rounded-full font-medium text-xs flex gap-1 items-center text-gray-600 dark:text-gray-300 flex-shrink-0'>
                                                            <CheckCircle size={20} className="text-gray-800 dark:text-gray-200" />
                                                        </span>
                                                    )}
                                                </div>
                                                <h6 className="text-sm md:text-sm text-left rounded-lg text-gray-600 dark:text-gray-400 leading-snug mt-1">
                                                    {category.description}
                                                </h6>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}

                            {filteredCategories.length === 0 && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                                    No categories found.
                                </p>
                            )}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    )
}

export default CategoryDialog