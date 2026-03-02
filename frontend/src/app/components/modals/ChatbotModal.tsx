"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Bot, User, Volume2, Square, Loader2, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from "next/link";
import { toast } from "react-toastify";
import ChatInput from "../ChatInput";

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

const stripMarkdown = (md: string): string => {
    if (!md) return "";
    return md
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/#{1,6}\s?/g, '')
        .replace(/`/g, '')
        .replace(/\n/g, ' ')
        .replace(/>\s?/g, '')
        .trim();
};

const ChatbotModal = ({ book, contextItems = [] }: ChatbotModalProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const sessionId = useRef("1111");
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I'm Wiser. Ask me about any book, author, or insight." }
    ]);
    const [loading, setLoading] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [loadingAudioIndex, setLoadingAudioIndex] = useState<number | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        if (!isOpen && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPlayingIndex(null);
        }
    }, [isOpen]);

    const handleCopy = async (content: string | undefined, index: number) => {
        if (!content) return;

        try {
            await navigator.clipboard.writeText(stripMarkdown(content));
            setCopiedIndex(index);
            toast.success("Copied to clipboard");

            setTimeout(() => {
                setCopiedIndex(null);
            }, 2000);
        } catch (err) {
            console.error("Copy failed:", err);
            toast.error("Failed to copy");
        }
    };
    const handleSendMessage = async (userMsg: string) => {
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            let payload;
            let contextIds;
            if (book) {
                contextIds = selectedContexts.map((ctx) => ctx.id);
                payload = {
                    message: userMsg,
                    session_id: sessionId.current,
                    books_ids: [book],
                    insights_ids: contextIds,
                };
            } else {
                contextIds = selectedContexts.map((ctx) => ctx.name);
                payload = {
                    message: userMsg,
                    session_id: sessionId.current,
                    books_ids: contextIds,
                    insights_ids: [],
                };
            }

            const { data } = await axios.post(
                "http://10.126.224.43:8000/ai/rag/invoke",
                {
                    input: payload
                }
            );

            setMessages((prev) => [
                ...prev,
                { role: "ai", content: data.output.answer, insights: data.output.insights }
            ]);

        } catch (error) {
            console.error("Chat Error:", error);
            toast.error("Failed to send message.");
        } finally {
            setLoading(false);
        }
    };

    const toggleContext = (item: ContextItem) => {
        setSelectedContexts((prev) => {
            const exists = prev.some((i) => i.id === item.id);
            return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item];
        });
    };

    const removeContext = (id: string | number) => {
        setSelectedContexts((prev) => prev.filter((item) => item.id !== id));
    };

    const handleReadAloud = async (content: string | undefined, index: number) => {
        if (!content) return;

        if (playingIndex === index && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setPlayingIndex(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            setPlayingIndex(null);
        }

        setLoadingAudioIndex(index);

        try {
            const plainText = stripMarkdown(content).substring(0, 200);

            const response = await fetch("http://localhost:8000/generate-voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: plainText, voice: "troy" }),
            });

            if (!response.ok) throw new Error("Failed to generate voice");

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            audio.onended = () => setPlayingIndex(null);
            audioRef.current = audio;

            audio.play();
            setPlayingIndex(index);

        } catch (err) {
            console.error("Audio generation error:", err);
            toast.error("Failed to read message aloud.");
        } finally {
            setLoadingAudioIndex(null);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-3 font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900 shadow cursor-pointer rounded-full flex gap-2 items-center transition-all duration-300 hover:scale-105"
            >
                <Bot size={20} />
            </button>

            <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0"
                />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="w-full max-w-7xl bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-200px)] overflow-hidden border border-gray-300 dark:border-gray-700 transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:translate-y-4 data-[closed]:opacity-0"
                    >
                        {/* --- Header --- */}
                        <div className="border-b border-gray-200 dark:border-gray-800 flex p-4 justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10 transition-colors duration-300">
                            <div className="flex items-center gap-2">
                                <div className="p-2 md:p-3 bg-gray-900 dark:bg-white rounded-full text-white dark:text-gray-900">
                                    <Bot size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold md:text-lg text-gray-900 dark:text-gray-100">Wiser</h3>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                        Online
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 md:p-3 text-gray-500 dark:text-gray-300 cursor-pointer rounded-full transition-colors"
                            >
                                <X size={20} />
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

                                    {/* Bubble + Actions Wrapper */}
                                    <div className={`flex flex-col gap-1.5 md:max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"}`}>

                                        {/* Main Bubble */}
                                        <div
                                            className={`flex flex-col p-3 md:p-4 text-sm leading-relaxed shadow-sm w-full ${m.role === "user"
                                                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-tr-sm"
                                                : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm"
                                                }`}
                                        >
                                            <div className="space-y-2">
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
                                            </div>

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

                                        {m.role === "ai" && m.content && (
                                            <div className="pl-1 flex items-center">
                                                <button
                                                    onClick={() => handleCopy(m.content, i)}
                                                    title={copiedIndex === i ? "Copied!" : "Copy message"}
                                                    className={`p-1.5 transition-colors rounded-full disabled:opacity-50 ${copiedIndex === i
                                                        ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                                                        : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                                                        }`}
                                                >
                                                    {copiedIndex === i ? (
                                                        <Check size={14} />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleReadAloud(m.content, i)}
                                                    disabled={loadingAudioIndex === i}
                                                    title={playingIndex === i ? "Stop playback" : "Read aloud"}
                                                    className="p-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
                                                >
                                                    {loadingAudioIndex === i ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : playingIndex === i ? (
                                                        <Square size={16} className="fill-current" />
                                                    ) : (
                                                        <Volume2 size={18} />
                                                    )}
                                                </button>

                                            </div>
                                        )}
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

                        {/* Extracted Input Component! */}
                        <ChatInput
                            book={book}
                            loading={loading}
                            contextItems={contextItems}
                            selectedContexts={selectedContexts}
                            toggleContext={toggleContext}
                            removeContext={removeContext}
                            onSendMessage={handleSendMessage}
                        />

                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default ChatbotModal;