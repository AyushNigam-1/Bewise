"use client"

import React, { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import SearchBar from './SearchBar'
import { SlidersHorizontal, X, CheckCircle } from 'lucide-react'

interface categoryProps {
    filteredCategories: any[],
    setFilteredCategories: React.Dispatch<React.SetStateAction<any[]>>
    categories: any[],
    toggleCategory: (category: any) => void,
    selectedCategory: any[]
}

const CategoryDialog: React.FC<categoryProps> = ({
    filteredCategories,
    setFilteredCategories,
    categories,
    toggleCategory,
    selectedCategory
}) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            {/* Trigger Button: Adapts to dark mode (Black in light, White in dark) */}
            <button
                onClick={() => setIsOpen(true)}
                className="p-3 font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow cursor-pointer rounded-full flex gap-2 items-center transition-all duration-300 hover:scale-105"
            >
                <SlidersHorizontal size={20} />
            </button>

            <Transition appear show={isOpen} as={Fragment}>
                <Dialog onClose={() => { setIsOpen(false); setFilteredCategories(categories) }} className="relative z-50" >
                    {/* Backdrop */}
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <DialogBackdrop className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" />
                    </TransitionChild>

                    <div className="fixed inset-0 w-screen p-4 flex justify-center items-center" >
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            {/* Modal Panel: White in light mode, Dark Gray in dark mode */}
                            <DialogPanel className="w-full max-w-lg shadow-2xl rounded-2xl bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 p-4 md:p-5 flex flex-col gap-4 transition-colors duration-300" >

                                <div className='justify-between flex items-center mb-1' >
                                    <DialogTitle className="font-bold text-xl md:text-2xl text-gray-900 dark:text-gray-100" >
                                        Select Categories
                                    </DialogTitle>
                                    <button
                                        onClick={() => { setIsOpen(false); setFilteredCategories(categories) }}
                                        type="button"
                                        className="text-gray-500 dark:text-gray-400 cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none rounded-full p-2 w-min font-semibold transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <SearchBar responsive={false} data={categories} propertyToSearch='name' setFilteredData={setFilteredCategories} />

                                <div className="overflow-y-auto h-[50vh] md:h-[400px] gap-3 flex flex-col rounded-lg custom-scroll-hide mt-2" >
                                    {filteredCategories?.map((category) => {
                                        // Check if current category is selected to apply conditional styling
                                        const isSelected = selectedCategory?.some(c => c.name === category.name);

                                        return (
                                            <div className="relative overflow-visible block" key={category.name} >
                                                <button
                                                    onClick={() => {
                                                        toggleCategory(category)
                                                        setIsOpen(false);
                                                    }}
                                                    className={`relative flex flex-col gap-2 rounded-xl select-none cursor-pointer w-full p-3 transition-colors duration-200 text-left border-2
                                                        ${isSelected
                                                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500 shadow-sm'
                                                            : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                                        }
                                                    `}
                                                >
                                                    <div className='flex flex-col gap-1 w-full' >
                                                        <div className='flex gap-2 justify-between items-start w-full' >
                                                            <div className='flex gap-2 text-base md:text-lg items-center' >
                                                                <span className="text-gray-700 dark:text-gray-300">
                                                                    {category.icon}
                                                                </span>
                                                                <h4 className='font-semibold text-gray-800 dark:text-gray-200 flex gap-2 leading-tight' >
                                                                    {category.name}
                                                                </h4>
                                                            </div>
                                                            {isSelected && (
                                                                <span className='z-10 rounded-full font-medium text-xs flex gap-1 items-center text-gray-600 dark:text-gray-300 flex-shrink-0' >
                                                                    <CheckCircle size={20} className="text-gray-800 dark:text-gray-200" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h6 className="text-sm md:text-sm text-left rounded-lg text-gray-600 dark:text-gray-400 leading-snug mt-1" >
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
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </>
    )
}

export default CategoryDialog