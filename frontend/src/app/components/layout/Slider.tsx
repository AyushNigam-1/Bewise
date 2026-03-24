'use client'

import Link from 'next/link'
import { Bookmark, Share2 } from 'lucide-react'
import { useUserStore } from '@/app/stores/useUserStores'
import { SliderProps } from '@/app/types'
import { useBookmarkInsight } from '@/app/hooks/mutations/useBookmark'

export default function Slider({ steps, title, onShare }: SliderProps & { onShare?: (title: string) => void }) {

    const user = useUserStore((state: any) => state.user);
    const { mutate: bookmarkInsight } = useBookmarkInsight();

    return (
        <div className='overflow-hidden w-full h-[calc(100dvh-60px)]'>
            <div
                className="overflow-y-scroll snap-y snap-mandatory rounded-2xl custom-scroll-hide h-full"
                style={{ scrollbarWidth: "none" }}
            >
                {steps?.map((step, index) => (
                    <div
                        key={index}
                        className="snap-start flex justify-center items-center px-2 bg-white dark:bg-gray-900 transition-colors duration-300 relative h-full w-full"
                    >
                        <p className="text-gray-400 dark:text-gray-500 transition-colors duration-300 font-medium text-sm absolute top-4 tracking-widest z-10">
                            {index + 1} / {steps?.length}
                        </p>

                        <div className="flex flex-col justify-center w-full max-w-lg h-full">

                            <div className="rounded-2xl col-span-1 flex-col flex space-y-4">

                                <Link
                                    href={`/insight/${title}/${step.category}/${step.step}`}
                                    className='flex flex-col space-y-4 group'
                                >
                                    <div className='flex justify-between items-center'>
                                        <span className='text-gray-500 dark:text-gray-400 transition-colors duration-300 font-medium text-sm flex space-x-2 items-center w-min text-nowrap flex-nowrap rounded-lg'>
                                            <span>{step.icon}</span>
                                            <span>{step.category}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col space-y-3">
                                        <h4 className='text-gray-900 dark:text-gray-100 transition-colors duration-300 font-bold text-2xl md:text-3xl leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400'>
                                            {step.step}
                                        </h4>
                                        <h6 className='text-gray-600 dark:text-gray-300 transition-colors duration-300 text-lg md:text-xl leading-relaxed'>
                                            {step.description}
                                        </h6>
                                    </div>
                                </Link>
                                <div className='w-full h-0.5 bg-white/5' />
                                <div className="flex justify-between items-center transition-colors duration-300">
                                    <button
                                        onClick={() => bookmarkInsight(step.step_id)}
                                        type="button"
                                        className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none rounded-full p-3 w-min font-semibold transition-all duration-300 shadow-sm active:scale-95"
                                    >
                                        <Bookmark
                                            size={18}
                                            className={user?.favourite_insights?.includes(step.step_id) ? "fill-gray-600 dark:fill-gray-300" : ""}
                                        />
                                    </button>
                                    <button
                                        onClick={() => onShare && onShare(title)}
                                        type="button"
                                        className="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none rounded-full p-3 w-min font-semibold transition-all duration-300 shadow-sm active:scale-95"
                                    >
                                        <Share2 size={20} className="transition-all duration-300" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}