"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getStepDetails } from "@/app/services/bookService";
import { addCompletedInsight } from "@/app/services/userService";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import ShareModal from "@/app/(main)/components/ShareModal";
import { useRouter } from 'next/navigation'
import { Slide, toast, ToastContainer } from 'react-toastify';
import { Bookmark, BookmarkCheck, Share } from "lucide-react";

export default function StepPage() {
    const { title, stepId } = useParams();
    const searchParams = useSearchParams(); // not destructured
    const isCompleted = searchParams.get('isCompleted') === 'true';
    const userId = searchParams.get('user_id');
    const [stepDetails, setStepDetails] = useState(null);
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const updateQueryParam = (key, value) => {

        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);

        const newPath = `${window.location.pathname}?${params.toString()}`;
        router.replace(newPath); // ✅ replaces URL without reload or back stack entry
    };

    const handleAddInsight = async () => {
        try {
            await addCompletedInsight(userId, title, stepId);
            updateQueryParam('isCompleted', !isCompleted); // Update the query parameter
            toast.success('Marked as Completed', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                transition: Slide,
            });
        } catch (err) {
            alert("Failed to mark insight as completed");
        }
    };

    useEffect(() => {
        if (!stepId) return;

        const fetchStepDetails = async () => {
            try {
                const data = await getStepDetails(stepId);
                console.log(data)
                setStepDetails(data);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchStepDetails();
    }, [stepId]);
    const formatMarkdown = (text) => {
        if (!text) return "";
        try {
            // If the string is double-encoded (surrounded by quotes), JSON.parse will clean it
            return JSON.parse(`"${text}"`);
        } catch (e) {
            // Fallback: Manually replace common escaped characters if JSON.parse fails
            return text
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"');
        }
    };
    if (error) return <p>Error: {error}</p>;
    if (!stepDetails) return <p>Loading...</p>;

    return (
        <div className="prose prose-lg text-gray-700 mt-2 flex flex-col gap-4">
            <div className="flex justify-between items-center">

                <h1 className="text-4xl font-bold text-gray-700 ">{stepDetails.title}</h1>
                <div className="flex flex-col md:flex-row gap-3 md:relative fixed right-0 bottom-0 m-2 md:m-0" >
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 bg-gray-700 p-3 text-sm/6 font-semibold text-white rounded-full"
                    >
                        <Bookmark size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        className="inline-flex items-center gap-2 bg-gray-700 p-3 text-sm/6 font-semibold text-white rounded-full "
                    >
                        <Share size={20} />
                    </button>
                    <ShareModal isOpen={isOpen} setIsOpen={setIsOpen} shareUrl={`https://www.bookworm.com/overview/${stepDetails?.title}`} />
                </div>
            </div>
            <p className=" text-lg text-gray-600">{stepDetails.description}</p>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}

                components={{
                    h1: ({ children }) => <h1 className="text-6xl font-bold ">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-3xl font-semibold ">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold text-gray-700 ">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc ml-6 text-lg">{children}</ul>,
                    li: ({ children }) => <li className="text-gray-600">{children}</li>,
                    p: ({ children }) => <p className="text-lg leading-relaxed">{children}</p>,
                }}
            >
                {formatMarkdown(stepDetails?.detailed_breakdown)}
            </ReactMarkdown >
            {/* <label class="inline-flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" class="peer hidden" onClick={() => handleAddInsight()} />
                <div class="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition duration-300 flex items-center justify-center">
                    <svg class="w-3 h-3 text-white hidden peer-checked:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <span class="text-gray-700">Mark as completed</span>
            </label> */}
            {/* <div class="inline-flex items-center gap-3">
                <label class="flex items-center cursor-pointer relative">
                    <input checked={isCompleted} onChange={handleAddInsight} type="checkbox" class="peer h-5 w-5 cursor-pointer transition-all appearance-none rounded-full bg-slate-100 shadow hover:shadow-md border border-gray-400 checked:bg-gray-800 checked:border-slate-800" id="check-custom-style" />
                    <span class="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="size-3" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" stroke-width="1">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    </span>
                </label>
                <span class="text-gray-700 text-lg">Mark as completed</span>

            </div> */}
            {/* <div className="mt-4">
                <h2 className=" text-gray-600 ">Example</h2>
                <p className="mt-1  text-xl text-gray-800">{stepDetails.example}</p>
            </div>
            <div className="mt-4">
                <h2 className=" text-gray-600">Hypothetical Situation</h2>
                <p className="mt-1  text-xl text-gray-800">{stepDetails.hypothetical_situation}</p>
            </div>
            <div className="mt-4">
                <h2 className=" text-gray-600">Recommended Response</h2>
                <p className="mt-1  text-xl text-gray-800">{stepDetails.recommended_response}</p>
            </div> */}
            <ToastContainer />
        </div >
    );
}
