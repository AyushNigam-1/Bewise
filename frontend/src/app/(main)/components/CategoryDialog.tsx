"use client"

import React, { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
import SearchBar from './SearchBar'
import { SlidersHorizontal, X } from 'lucide-react'

interface categoryProps {
    filteredCategories: any[],
    setFilteredCategories: React.Dispatch<React.SetStateAction<any[]>>
    categories: any[],
    toggleCategory: (category: any) => void,
    selectedCategory: any[]
}

const CategoryDialog: React.FC<categoryProps> = ({ filteredCategories, setFilteredCategories, categories, toggleCategory, selectedCategory }) => {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <>
            <button onClick={() => setIsOpen(true)} className=" p-3 font-semibold  bg-gradient-to-r text-white bg-gray-700  shadow cursor-pointer rounded-full  flex gap-2 items-center">
                <SlidersHorizontal size={20} />
            </button>

            <Transition appear show={isOpen} as={Fragment}>
                <Dialog onClose={() => { setIsOpen(false); setFilteredCategories(categories) }} className="relative z-50" >
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-100"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-xs" />
                    </TransitionChild>

                    < div className="fixed inset-0 w-screen  p-4 flex justify-center gap-4 items-center" >
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="max-w-lg shadow rounded-xl bg-white p-3 flex flex-col gap-3 " >
                                <div className='justify-between flex items-center' >
                                    <DialogTitle className="font-bold text-lg md:text-2xl text-gray-800" > Select Categories </DialogTitle>
                                    <button
                                        onClick={() => { setIsOpen(false); setFilteredCategories(categories) }}
                                        type="button"
                                        className="text-gray-600 cursor-pointer bg-gray-100  focus:outline-none rounded-full   p-2 w-min  font-semibold "
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <SearchBar responsive={false} data={categories} propertyToSearch='name' setFilteredData={setFilteredCategories} />
                                <div className="overflow-y-scroll h-[50vh] gap-3 flex flex-col rounded-lg custom-scroll-hide" >
                                    {filteredCategories?.map((category) => (
                                        <div className="relative overflow-visible inline-block" key={category.name} >
                                            <button
                                                onClick={
                                                    () => {
                                                        toggleCategory(category)
                                                        setIsOpen(false);
                                                    }
                                                }
                                                className={`relative flex flex-col gap-2 rounded-xl select-none hover:bg-gray-100 cursor-pointer text-gray-400 p-2 bg-gray-100 w-full 
                                            ${selectedCategory?.map(c => c).includes(category) ? ' border-2 border-gray-400' : ''}`}
                                            >
                                                <div className='flex flex-col gap-1' >
                                                    <div className='flex gap-2  justify-between' >
                                                        <div className='flex gap-2 text-base md:text-lg items-center' >
                                                            {category.icon}
                                                            < h4 className='font-semibold text-gray-600  flex gap-2' >
                                                                {category.name}
                                                            </h4>
                                                        </div>
                                                        {
                                                            selectedCategory?.map(c => c).includes(category) && (
                                                                <span className=' z-10 rounded-full font-medium  text-xs flex gap-1 items-center text-gray-600' >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6" >
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                                    </svg>

                                                                </span>
                                                            )
                                                        }
                                                    </div>
                                                    < h6 className="text-sm md:text-sm text-left rounded-lg text-gray-600" >
                                                        {category.description}
                                                    </h6>
                                                </div>
                                            </button>
                                        </div>
                                    ))}
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