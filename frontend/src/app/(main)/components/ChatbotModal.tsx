"use client"
import {
    Dialog,
    DialogPanel,
    Popover,
    PopoverButton,
    PopoverPanel,
    Transition,
    TransitionChild,
} from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Bot, User, Plus, Search, ChevronRight, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import Link from "next/link";

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
    content?: string;
    insights?: Insight[];
};

export type ContextItem = {
    id: string | number;
    name: string;
};

type ChatbotModalProps = {
    book?: string;
    contextItems?: ContextItem[];
};

const ChatbotModal = ({ book, contextItems = [] }: ChatbotModalProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState("");
    const sessionId = useRef("1111");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I'm Bookist AI. Ask me about any book, author, or insight." }
    ]);
    const [loading, setLoading] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const filteredItems = searchQuery === ""
        ? contextItems
        : contextItems.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const removeContext = (id: string | number) => {
        setSelectedContexts((prev) => prev.filter((item) => item.id !== id));
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            let payload
            let contextIds
            if (book) {
                contextIds = selectedContexts.map((ctx) => ctx.id);
                payload = {
                    message: userMsg,
                    session_id: sessionId.current,
                    books_ids: [book],
                    insights_ids: contextIds,
                };
            }
            else {
                contextIds = selectedContexts.map((ctx) => ctx.name);
                payload = {
                    message: userMsg,
                    session_id: sessionId.current,
                    books_ids: contextIds,
                    insights_ids: [],
                };
            }
            const { data } = await axios.post("http://10.63.43.43:8000/chat/ai", payload);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: data.answer,
                    insights: data.insights,
                },
            ]);
        } catch (error) {
            console.error("Chat Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleContext = (item: ContextItem) => {
        setSelectedContexts((prev) => {
            const exists = prev.some((i) => i.id === item.id);
            if (exists) {
                return prev.filter((i) => i.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-3 font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 shadow cursor-pointer rounded-full flex gap-2 items-center transition-colors duration-300 hover:scale-105"
            >
                <Bot size={20} />
            </button>

            <Transition appear show={isOpen} as={Fragment}>
                <Dialog onClose={() => setIsOpen(false)} className="relative z-50">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                            <DialogPanel className="w-full max-w-7xl bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-200px)] overflow-hidden border border-gray-300 dark:border-gray-700 transition-colors duration-300">

                                {/* --- Header --- */}
                                <div className="border-b border-gray-200 dark:border-gray-800 flex p-4 justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10 transition-colors duration-300">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 md:p-3 bg-gray-900 dark:bg-white rounded-full text-white dark:text-gray-900">
                                            <Bot size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold md:text-lg text-gray-900 dark:text-gray-100">Bookist AI</h3>
                                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                Online
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 md:p-3 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* --- Messages Area --- */}
                                <div className="flex-1 overflow-y-auto space-y-6 px-4 py-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                                    {messages.map((m, i) => (
                                        <div
                                            key={i}
                                            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            {/* Avatar AI */}
                                            {m.role === "ai" && (
                                                <div className="size-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300 shadow-sm">
                                                    <Bot size={16} />
                                                </div>
                                            )}

                                            {/* Bubble */}
                                            <div
                                                className={`md:max-w-[75%] p-3 md:p-4 space-y-2 text-sm leading-relaxed shadow-sm ${m.role === "user"
                                                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-tr-sm"
                                                    : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm"
                                                    }`}
                                            >
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                                                        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
                                                        ul: ({ children }) => <ul className="space-y-2 pl-5 list-disc">{children}</ul>,
                                                        li: ({ children }) => <li className="leading-relaxed break-words">{children}</li>,
                                                        p: ({ children }) => <p className="leading-relaxed break-words whitespace-pre-wrap">{children}</p>,
                                                        strong: ({ children }) => <span className="font-semibold">{children}</span>,
                                                        a: ({ href, children }) => (
                                                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline break-all hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                                                                {children}
                                                            </a>
                                                        ),
                                                    }}
                                                >
                                                    {m.content}
                                                </ReactMarkdown>

                                                {/* Insights Cards in Chat */}
                                                {m.insights && Object.entries(m.insights).map(([bookName, insightsList]) => (
                                                    <div key={bookName} className="space-y-3 mt-4">
                                                        <h2 className="text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-1"> &bull; {bookName}</h2>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {(insightsList as any).map((insight: any) => (
                                                                <Link key={insight.id} href={insight.link} target="_blank" rel="noopener noreferrer"
                                                                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl space-y-2 hover:border-gray-300 dark:hover:border-gray-500 transition-colors block"
                                                                >
                                                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                                        <span>{insight.category_icon}</span> {insight?.category}
                                                                    </p>
                                                                    <h4 className='text-gray-900 dark:text-gray-100 font-semibold text-lg leading-tight'>
                                                                        {insight.title}
                                                                    </h4>
                                                                    <h6 className='text-gray-600 dark:text-gray-300 text-sm line-clamp-3'>
                                                                        {insight.description}
                                                                    </h6>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Avatar User */}
                                            {m.role === "user" && (
                                                <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-300">
                                                    <User size={16} />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Loading Indicator */}
                                    {loading && (
                                        <div className="flex gap-3 justify-start">
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <Bot size={16} className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1 shadow-sm">
                                                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </div>

                                {/* --- Input Area --- */}
                                <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
                                    {/* Selected Contexts Pills */}
                                    {selectedContexts.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {selectedContexts.map((ctx) => (
                                                <span key={ctx.id} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 animate-in fade-in zoom-in duration-200">
                                                    {ctx.name}
                                                    <button
                                                        onClick={() => removeContext(ctx.id)}
                                                        className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-end gap-2">
                                        {/* Dropup Menu (Multiple Selection) */}
                                        <Popover className="relative">
                                            {({ open, close }) => (
                                                <>
                                                    <PopoverButton
                                                        className="flex items-center justify-center transition-all outline-none p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        title="Select Context"
                                                    >
                                                        <Plus size={22} className={open ? "rotate-45 transition-transform" : "transition-transform"} />
                                                    </PopoverButton>

                                                    <Transition
                                                        as={Fragment}
                                                        enter="transition ease-out duration-200"
                                                        enterFrom="opacity-0 translate-y-2"
                                                        enterTo="opacity-100 translate-y-0"
                                                        leave="transition ease-in duration-150"
                                                        leaveFrom="opacity-100 translate-y-0"
                                                        leaveTo="opacity-0 translate-y-2"
                                                    >
                                                        <PopoverPanel className="absolute bottom-full mb-3 left-0 w-80 h-[400px] flex flex-col rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl z-50 overflow-hidden">
                                                            {/* Popover Header */}
                                                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                                                <h3 className="font-bold text-gray-800 dark:text-gray-200">
                                                                    Select {book ? "Insights" : "Books"}
                                                                </h3>
                                                                <button onClick={close} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>

                                                            {/* Popover Search Bar */}
                                                            <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                                                <div className="relative">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search..."
                                                                        value={searchQuery}
                                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                                        onKeyDown={(e) => e.stopPropagation()}
                                                                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Popover Scrollable List */}
                                                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scroll-hide bg-white dark:bg-gray-800">
                                                                {filteredItems.length === 0 ? (
                                                                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">No matches found.</p>
                                                                ) : (
                                                                    filteredItems.map((item) => {
                                                                        const isSelected = selectedContexts.some(i => i.id === item.id);
                                                                        return (
                                                                            <button
                                                                                key={item.id}
                                                                                onClick={() => toggleContext(item)}
                                                                                className={`w-full cursor-pointer text-left rounded-lg p-2.5 flex items-center justify-between transition-colors
                                                                                    ${isSelected
                                                                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                                                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                                                                                    }`}
                                                                            >
                                                                                <span className="truncate pr-4 text-sm">{item.name}</span>
                                                                                {isSelected && <Check size={16} className="text-gray-800 dark:text-gray-200 flex-shrink-0" />}
                                                                            </button>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        </PopoverPanel>
                                                    </Transition>
                                                </>
                                            )}
                                        </Popover>

                                        {/* Main Text Input */}
                                        <input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                            className="flex-1 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 outline-none p-3 rounded-2xl focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-500 transition-all h-12"
                                            placeholder={selectedContexts.length > 0 ? `Ask about these ${selectedContexts.length} topics...` : "Ask about a book, concept, or author..."}
                                            disabled={loading}
                                        />

                                        {/* Send Button */}
                                        <button
                                            onClick={sendMessage}
                                            disabled={!input.trim() || loading}
                                            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all flex-shrink-0
                                                ${input.trim()
                                                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 shadow-md"
                                                    : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600"
                                                }`}
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default ChatbotModal;