'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bookmark } from 'lucide-react'
import { useUserStore } from '@/app/stores/useUserStores'
import { useMutations } from '@/app/hooks/useMutations'

export default function Slider({ steps, title }: { steps: any[], title: string }) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [remainingHeight, setRemainingHeight] = useState('100vh')

    // 1. Bring in the User Store and Mutations
    const user = useUserStore((state: any) => state.user);
    const { bookmarkInsight } = useMutations();

    useEffect(() => {
        const updateHeight = () => {
            const top = wrapperRef.current?.getBoundingClientRect().top || 0
            setRemainingHeight(`${window.innerHeight - top - 12}px`)
        }

        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => window.removeEventListener('resize', updateHeight)
    }, [])

    return (
        <div ref={wrapperRef} className='overflow-hidden absolute md:relative top-2 md:top-0 w-full'>
            <div
                className="overflow-y-scroll snap-y snap-mandatory rounded-2xl custom-scroll-hide"
                style={{ height: remainingHeight, scrollbarWidth: "none" }}
            >
                {steps?.map((step, index) => (
                    <div
                        key={index}
                        className="snap-start flex justify-center items-center px-4 bg-white dark:bg-gray-900 transition-colors duration-300 relative"
                        style={{ height: remainingHeight }}
                    >
                        {/* Slide Counter */}
                        <p className="text-gray-400 dark:text-gray-500 font-medium text-sm absolute top-4 tracking-widest">
                            {index + 1} / {steps?.length}
                        </p>

                        {/* Main Content Wrapper */}
                        <div className="flex flex-col justify-center w-full max-w-lg">
                            <div className="rounded-2xl h-full col-span-1 flex-col flex gap-4">
                                <Link
                                    href={`/step/${title}/${step.category?.name || step.category}/${step.step}`}
                                    className='flex flex-col gap-3'
                                >
                                    <div className='flex justify-between items-center'>
                                        <span className='text-gray-500 dark:text-gray-400 font-medium text-sm flex gap-1.5 items-center w-min text-nowrap flex-nowrap rounded-lg'>
                                            <span>{step.icon}</span>
                                            <span>{step.category?.name || step.category}</span>
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h4 className='text-gray-900 dark:text-gray-100 font-bold text-2xl md:text-3xl line-clamp-2 leading-tight'>
                                        {step.step}
                                    </h4>

                                    {/* Description */}
                                    <h6 className='text-gray-600 dark:text-gray-300 mt-2 text-lg md:text-xl leading-relaxed'>
                                        {step.description}
                                    </h6>
                                </Link>

                                {/* Bottom Action Bar */}
                                <div className="flex gap-2 justify-between mt-8 items-center border-t border-gray-100 dark:border-gray-800 pt-4">

                                    {/* Upvote Pill */}
                                    <span className='bg-gray-100 dark:bg-gray-800 rounded-full p-1.5 pr-4 items-center gap-3 flex text-gray-700 dark:text-gray-200 transition-colors'>
                                        <button
                                            type="button"
                                            className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none rounded-full p-2.5 font-semibold shadow-sm hover:scale-105 transition-transform"
                                        >
                                            <ArrowUp size={18} strokeWidth={2.5} />
                                        </button>
                                        <h4 className='font-bold text-base'>0</h4>
                                    </span>

                                    {/* Action Buttons Right */}
                                    <div className='flex gap-2'>
                                        {/* 2. Added onClick mutation and dynamic fill class */}
                                        <button
                                            onClick={() => bookmarkInsight.mutate(step.step_id || step.id)}
                                            type="button"
                                            className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none rounded-full p-3 w-min font-semibold transition-colors shadow-sm"
                                        >
                                            <Bookmark
                                                size={20}
                                                className={user?.favourite_insights?.includes(step.step_id || step.id) ? "fill-current" : ""}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}