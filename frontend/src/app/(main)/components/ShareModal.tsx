'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import {
    WhatsappShareButton,
    LinkedinShareButton,
    TwitterShareButton,
    TelegramShareButton,
    TwitterIcon,
    LinkedinIcon,
    WhatsappIcon,
    TelegramIcon,
    FacebookIcon,
    RedditShareButton,
    RedditIcon,
    FacebookMessengerShareButton,
    FacebookMessengerIcon,
} from 'next-share'
import { Slide, toast, ToastContainer } from "react-toastify"
import Link from 'next/link'

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
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-100"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-xs" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-100 p-4 text-left align-middle shadow-xl transition-all flex flex-col gap-4">
                                <div className='flex justify-between items-center'>

                                    <Dialog.Title as="h3" className="font-bold text-lg md:text-2xl text-gray-600">
                                        Share Link
                                    </Dialog.Title>
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
                                <div className="flex items-center gap-2 justify-between bg-gray-200 rounded-xl p-3 ">
                                    <h6
                                        className="text-gray-900 md:text-lg outline-none  focus:ring-blue-500 focus:border-blue-500  line-clamp-1"
                                    >   {shareUrl}    </h6>
                                    <button
                                        onClick={handleCopy}
                                        className="px-4 py-3 cursor-pointer rounded-xl text-gray-700  transition bg-gray-100 flex items-center gap-2"
                                    >

                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.342 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.342 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                        </svg>
                                        Copy
                                    </button>
                                </div>
                                <div className="flex justify-around gap-4  md:gap-x-10 items-center flex-wrap">
                                    {
                                        socialMediaLinks.map((link) => (
                                            <Link key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center  rounded-full flex-col text-gray-600 md:text-base text-sm
                                             ">
                                                <span className='flex items-center justify-center p-3 bg-gray-200 rounded-full '>
                                                    {link.icon}
                                                </span>
                                                <p>
                                                    {link.name}
                                                </p>
                                            </Link>))
                                    }
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                        <ToastContainer />
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
