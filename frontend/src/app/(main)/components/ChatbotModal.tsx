import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Send, Bot, User, Sparkles, SendHorizontal } from "lucide-react"; // Icons
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
// type Message = {
//     role: "user" | "ai";
//     content: string;
// };
type Insight = {
    id: number;
    title: string;
    book: string;
    category: string;
    category_icon: string;
    description: string;
    link: string;
};

type Message = {
    role: "user" | "ai";
    content?: string;      // natural language answer
    insights?: Insight[]; // cards
};
const ChatbotModal = ({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}) => {
    const [input, setInput] = useState("");
    const sessionId = useRef("1111");
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I'm Bookist AI. Ask me about any book, author, or insight." }
    ]);
    const [loading, setLoading] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            // Simulator for testing - Replace with your actual endpoint
            const { data } = await axios.post("http://10.63.43.43:8000/chat/ai", {
                message: userMsg,
                session_id: sessionId.current,
            });
            console.log("data", data)
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: data.answer,
                    insights: data.insights,
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "ai", content: "I'm having trouble connecting right now. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
                {/* Backdrop with Blur */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95 translate-y-4"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-4"
                    >
                        <DialogPanel className="w-full max-w-7xl bg-gray-100 rounded-2xl shadow-2xl flex flex-col  h-[calc(100vh-100px)] overflow-hidden border border-gray-100 space-y-3">

                            {/* --- Header --- */}
                            <div className="border-b border-gray-100 flex p-4 justify-between items-center bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gray-700 rounded-full text-white">
                                        <Bot size={22} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-xl text-gray-700">Bookist AI</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            Online
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            {/* <hr className="border border-gray-200" /> */}
                            {/* --- Messages Area --- */}
                            <div className="flex-1 overflow-y-auto space-y-6 px-4 bg-gray-100">
                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {/* Avatar AI */}
                                        {m.role === "ai" && (
                                            <div className="size-6 md:size-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 text-gray-600 ">
                                                <Bot size={16} />
                                            </div>
                                        )}

                                        {/* Bubble */}
                                        <div
                                            className={`md:max-w-[80%] p-4 space-y-2 text-sm  leading-relaxed ${m.role === "user"
                                                ? "bg-gray-700 text-white rounded-2xl rounded-tr-sm"
                                                : "bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-sm"
                                                }`}
                                        >
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    h1: ({ children }) => (
                                                        <h1 className="text-2xl font-bold text-gray-700 mb-4">
                                                            {children}
                                                        </h1>
                                                    ),

                                                    h2: ({ children }) => (
                                                        <h2 className="text-xl font-semibold text-gray-700 mb-3">
                                                            {children}
                                                        </h2>
                                                    ),

                                                    ul: ({ children }) => (
                                                        <ul className="space-y-4 pl-5 list-disc">
                                                            {children}
                                                        </ul>
                                                    ),

                                                    li: ({ children }) => (
                                                        <li className="text-gray-700 leading-relaxed break-words">
                                                            {children}
                                                        </li>
                                                    ),

                                                    p: ({ children }) => (
                                                        <p className="text-sm  leading-relaxed break-words whitespace-pre-wrap">
                                                            {children}
                                                        </p>
                                                    ),

                                                    strong: ({ children }) => (
                                                        <span className="font-semibold text-gray-700">
                                                            {children}
                                                        </span>
                                                    ),

                                                    a: ({ href, children }) => (
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 underline break-all hover:text-blue-800 transition"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>

                                            {/* {m.content && (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {m.content}
                                                </ReactMarkdown>
                                            )} */}
                                            {m.insights && Object.entries(m.insights).map(([book, insights]) => (
                                                <div key={book} className="space-y-2">
                                                    <h2 className="text-lg font-bold "> &bull; {book}</h2>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {insights.map(i => (
                                                            <div key={i.id} className="bg-gray-100 p-4 rounded-xl space-y-2">
                                                                {/* <div className='flex justify-between items-center space-y-4'> */}
                                                                {/* <span className=' text-gray-600 font-medium  text-sm flex gap-1 items-center w-min text-nowrap flex-nowrap rounded-lg' > */}
                                                                {/* <span> */}
                                                                {/* {step?.icon}  */}
                                                                {/* </span> */}
                                                                <p className="text-xs text-gray-600">
                                                                    {i.category_icon}  {i?.category}
                                                                </p>
                                                                {/* </span> */}
                                                                {/* </div> */}
                                                                <h4 className='text-gray-800 font-semibold text-lg md:text-xl '>
                                                                    {i.title}
                                                                </h4>
                                                                <h6 className='text-gray-800'>
                                                                    {i.description}
                                                                </h6>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Avatar User */}
                                        {m.role === "user" && (
                                            <div className="size-6 md:size-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-200">
                                                <User size={16} />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Loading Indicator */}
                                {loading && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                                            <Bot size={16} className="text-gray-400" />
                                        </div>
                                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* --- Input Area --- */}
                            <div className="bg-white p-4">
                                <div className="flex items-center gap-2 p-3 bg-gray-100 border-none  rounded-xl focus-within:ring-2 focus-within:ring-gray-900/10 focus-within:border-gray-300 transition-all">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 "
                                        placeholder="Ask about a book..."
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!input.trim() || loading}
                                        className={`p-2 rounded-full transition-all ${input.trim()
                                            ? "bg-gray-900 text-white hover:bg-black shadow-md transform hover:scale-105"
                                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            }`}
                                    >
                                        <SendHorizontal size={20} />
                                    </button>
                                </div>
                                {/* <div className="text-center">
                                    <span className="text-[10px] text-gray-400">AI can make mistakes. Check important info.</span>
                                </div> */}
                            </div>

                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ChatbotModal;