'use client'

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { Fragment } from 'react'
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
import { Copy } from 'lucide-react'

// import { Copy } from 'lucide-react'

export default function ShareModal({ isOpen, setIsOpen, shareUrl }: { isOpen: boolean, setIsOpen: (open: boolean) => void, shareUrl: string }) {

    const handleCopy = async () => {
        toast.success('Copied Successfully', {
            position: "top-center",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "colored",
            transition: Slide,
        });

        // await navigator.clipboard.writeText(shareUrl)
        // alert('Link copied!')
    }
    const socialMediaLinks = [

        {
            name: "Whatsapp",
            icon: <WhatsappIcon size={42} round={true} className='' />,
            url: `https://web.whatsapp.com/send?text=${encodeURIComponent('Check this out! ' + shareUrl)}`
        },
        {
            name: "Telegram",
            icon: <TelegramIcon size={42} round={true} className='' />,
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check this out!')}`
        },
        {
            name: "Messenger",
            icon: <FacebookMessengerIcon size={42} round={true} className='' />,
            url: `https://www.messenger.com/t/?link=${encodeURIComponent(shareUrl)}`
        },
        {
            name: "Twitter",
            icon: <TwitterIcon size={42} round={true} className='' />,
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Check this out!')}`
        },
        {
            name: "LinkedIn",
            icon: <LinkedinIcon size={42} round={true} className='' />,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        },

        {
            name: "Reddit",
            icon: <RedditIcon size={42} round={true} className='' />,
            url: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent('Check this out!')}`
        }
    ];

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-100"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-gray-100 p-4 text-left align-middle shadow-xl transition-all flex flex-col gap-4">
                                <div className='flex justify-between items-center'>

                                    <DialogTitle as="h3" className="font-bold text-lg md:text-xl text-gray-600">
                                        Share Link
                                    </DialogTitle>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        type="button"
                                        className="text-gray-600 cursor-pointer bg-gray-200  focus:outline-none rounded-full   p-2 w-min  font-semibold "
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 justify-between bg-gray-200 rounded-xl p-2">
                                    <h6
                                        className="text-gray-900 md:text-base outline-none  focus:ring-blue-500 focus:border-blue-500  line-clamp-1"
                                    >   {shareUrl}    </h6>
                                    <button
                                        onClick={handleCopy}
                                        className="px-4 py-3 cursor-pointer rounded-xl text-gray-700  transition bg-gray-100 flex items-center gap-2"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 flex-wrap gap-y-3 gap-x-12">
                                    {
                                        socialMediaLinks.map((link) => (
                                            <Link key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center  rounded-full flex-col text-gray-600 md:text-base col-span-1 text-sm
                                             ">
                                                <span className='flex items-center justify-center p-2 bg-gray-200 rounded-full '>
                                                    {link.icon}
                                                </span>
                                                <p>
                                                    {link.name}
                                                </p>
                                            </Link>))
                                    }
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                        <ToastContainer />
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
