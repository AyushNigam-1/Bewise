'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
    TwitterIcon,
    LinkedinIcon,
    WhatsappIcon,
    TelegramIcon,
    RedditIcon,
    FacebookMessengerIcon,
} from 'next-share'
import { Slide, toast, ToastContainer } from "react-toastify"
import Link from 'next/link'
import { Copy, X } from 'lucide-react'

export default function ShareModal({ isOpen, setIsOpen, shareUrl }: { isOpen: boolean, setIsOpen: (open: boolean) => void, shareUrl: string }) {

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
            toast.success('Copied Successfully', {
                position: "top-center",
                autoClose: 2000,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                transition: Slide,
            });
        } catch (err) {
            toast.error('Failed to copy');
        }
    }

    const socialMediaLinks = [
        {
            name: "Whatsapp",
            icon: <WhatsappIcon size={42} round={true} />,
            url: `https://web.whatsapp.com/send?text=${encodeURIComponent('Check this out! ' + shareUrl)}`
        },
        {
            name: "Telegram",
            icon: <TelegramIcon size={42} round={true} />,
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check this out!')}`
        },
        {
            name: "Messenger",
            icon: <FacebookMessengerIcon size={42} round={true} />,
            url: `https://www.messenger.com/t/?link=${encodeURIComponent(shareUrl)}`
        },
        {
            name: "Twitter",
            icon: <TwitterIcon size={42} round={true} />,
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check this out!')}`
        },
        {
            name: "LinkedIn",
            icon: <LinkedinIcon size={42} round={true} />,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: "Reddit",
            icon: <RedditIcon size={42} round={true} />,
            url: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Check this out!')}`
        }
    ];

    return (
        // 1. Replaced Transition with Dialog using the 'open' prop
        <Dialog open={isOpen} as="div" className="relative z-50" onClose={() => setIsOpen(false)}>

            {/* 2. DialogBackdrop with native transition and data-[closed] fading */}
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out data-[closed]:opacity-0"
            />

            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">

                    {/* 3. DialogPanel with native transition and data-[closed] scale/slide effects */}
                    <DialogPanel
                        transition
                        className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-transparent dark:border-gray-800 p-5 text-left align-middle shadow-2xl transition-all duration-300 ease-out data-[closed]:translate-y-4 sm:data-[closed]:translate-y-0 data-[closed]:scale-95 data-[closed]:opacity-0 flex flex-col gap-5"
                    >
                        {/* Header */}
                        <div className='flex justify-between items-center'>
                            <DialogTitle as="h3" className="font-bold text-lg md:text-xl text-gray-900 dark:text-gray-100">
                                Share Link
                            </DialogTitle>
                            <button
                                onClick={() => setIsOpen(false)}
                                type="button"
                                className="text-gray-500 dark:text-gray-400 focus:outline-none rounded-full font-semibold transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* URL Box & Copy Button */}
                        <div className="flex items-center gap-2 justify-between bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-2 transition-colors">
                            <h6 className="text-gray-700 dark:text-gray-300 md:text-base outline-none truncate px-2 select-all">
                                {shareUrl}
                            </h6>
                            <button
                                onClick={handleCopy}
                                className="p-2.5 cursor-pointer rounded-lg text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center flex-shrink-0"
                            >
                                <Copy size={18} />
                            </button>
                        </div>

                        {/* Social Links Grid */}
                        <div className="grid grid-cols-3 flex-wrap gap-y-6 gap-x-4 mt-2">
                            {socialMediaLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center flex-col text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 md:text-sm text-xs transition-colors group"
                                >
                                    <span className='flex items-center justify-center p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full group-hover:scale-110 transition-transform shadow-sm'>
                                        {link.icon}
                                    </span>
                                    <p className="mt-2 font-medium">
                                        {link.name}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </DialogPanel>
                </div>
            </div>
            <ToastContainer />
        </Dialog>
    )
}