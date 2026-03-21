"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import React, { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Bot, User, Volume2, Square, Loader2, Copy, Check, Pencil } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from "next/link";
import { toast } from "react-toastify";
import ChatInput from "../ChatInput";
import { invokeChatbot, generateVoice } from "@/app/services/aiService";
import posthog from "posthog-js";
import { motion, AnimatePresence } from "framer-motion";
import { ChatbotModalProps, ContextItem, Message } from "@/app/types";

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
    const abortControllerRef = useRef<AbortController | null>(null);
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const editRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: "Hello! I'm Wiser. Ask me about any book, author, or insight." }
    ]);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const chatMutation = useMutation({
        mutationFn: invokeChatbot,
        onError: (error: any) => {
            if (error.name === 'CanceledError' || error.message === 'canceled') return;
            console.error("Chat Error:", error);
            toast.error("Failed to send message.");
        }
    });

    const voiceMutation = useMutation({
        mutationFn: generateVoice,
        onError: (error) => {
            console.error("Audio generation error:", error);
            toast.error("Failed to read message aloud.");
        }
    });

    useEffect(() => {
        if (editingIndex === null) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, chatMutation.isPending, editingIndex]);

    useEffect(() => {
        if (!isOpen && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPlayingIndex(null);
        }
    }, [isOpen]);

    // AUTO-FOCUS THE CONTENT-EDITABLE DIV
    useEffect(() => {
        if (editingIndex !== null && editRef.current) {
            editRef.current.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, [editingIndex]);

    const handleCopy = async (content: string | undefined, index: number) => {
        if (!content) return;
        try {
            await navigator.clipboard.writeText(stripMarkdown(content));
            setCopiedIndex(index);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    const handleSendMessage = async (userMsg: string) => {
        posthog.capture('chatbot_message_sent', {
            has_book_context: !!book,
            context_count: selectedContexts.length,
        });
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        abortControllerRef.current = new AbortController();
        let payload;
        if (book) {
            const contextIds = selectedContexts.map((ctx) => ctx.id);
            payload = { message: userMsg, session_id: sessionId.current, books_ids: [book], insights_ids: contextIds };
        } else {
            const contextNames = selectedContexts.map((ctx) => ctx.name);
            payload = { message: userMsg, session_id: sessionId.current, books_ids: contextNames, insights_ids: [] };
        }
        try {
            const output = await chatMutation.mutateAsync({
                payload: payload,
                signal: abortControllerRef.current!.signal
            });
            setMessages((prev) => [...prev, { role: "ai", content: output.answer, insights: output.insights }]);
        } catch (e: any) {
            if (e.name === 'CanceledError' || e.message === 'canceled') {
                setMessages((prev) => [...prev, { role: "ai", content: "Generation stopped by user." }]);
            } else {
                setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I am having trouble connecting right now." }]);
            }
        }
    };

    const handleEditSubmit = async (index: number) => {
        if (!editText.trim()) return;

        const newHistory = messages.slice(0, index);
        setMessages([...newHistory, { role: "user", content: editText }]);

        setEditingIndex(null);
        setEditText("");

        abortControllerRef.current = new AbortController();
        let payload;
        if (book) {
            const contextIds = selectedContexts.map((ctx) => ctx.id);
            payload = { message: editText, session_id: sessionId.current, books_ids: [book], insights_ids: contextIds };
        } else {
            const contextNames = selectedContexts.map((ctx) => ctx.name);
            payload = { message: editText, session_id: sessionId.current, books_ids: contextNames, insights_ids: [] };
        }

        try {
            const output = await chatMutation.mutateAsync({
                payload: payload,
                signal: abortControllerRef.current!.signal
            });
            setMessages((prev) => [...prev, { role: "ai", content: output.answer, insights: output.insights }]);
        } catch (e: any) {
            if (e.name !== 'CanceledError' && e.message !== 'canceled') {
                setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I am having trouble connecting right now." }]);
            }
        }
    };

    const toggleContext = (item: ContextItem) => {
        setSelectedContexts((prev) => {
            const exists = prev.some((i) => i.id === item.id);
            return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item];
        });
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
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
        try {
            const plainText = stripMarkdown(content).substring(0, 200);
            const blob = await voiceMutation.mutateAsync(plainText);
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.onended = () => setPlayingIndex(null);
            audioRef.current = audio;
            audio.play();
            setPlayingIndex(index);
        } catch (err) { }
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
                <DialogBackdrop transition className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out data-[closed]:opacity-0" />

                <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
                    <DialogPanel transition className="w-full max-w-5xl bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-24px)] sm:h-[calc(100vh-80px)] overflow-hidden border border-gray-300 dark:border-gray-700 transition-all duration-300 ease-out data-[closed]:scale-95 data-[closed]:translate-y-4 data-[closed]:opacity-0">
                        <div className="border-b border-gray-200 dark:border-gray-800 flex px-4 py-3 sm:py-4 justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-10 transition-colors duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-900 dark:bg-white rounded-full text-white dark:text-gray-900">
                                    <Bot size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100">Wiser</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                        Online
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 dark:text-gray-300 cursor-pointer rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                    {m.role === "ai" && (
                                        <div className="size-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-300 shadow-sm">
                                            <Bot size={18} />
                                        </div>
                                    )}

                                    <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${m.role === "user" ? "items-end" : "items-start"}`}>

                                        {/* BUBBLE CONTAINER */}
                                        <div className={`flex flex-col p-3 sm:p-4 text-sm leading-relaxed shadow-sm w-full transition-all duration-300 ${m.role === "user"
                                            ? `bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl rounded-tr-sm `
                                            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-sm"
                                            }`}>

                                            {m.role === "user" ? (
                                                /* 🌟 ZERO-SHIFT: Exact same div for both read and edit modes */
                                                <div
                                                    ref={editingIndex === i ? editRef : null}
                                                    contentEditable={editingIndex === i}
                                                    suppressContentEditableWarning={true}
                                                    onInput={(e) => setEditText(e.currentTarget.textContent || "")}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleEditSubmit(i);
                                                        } else if (e.key === "Escape") {
                                                            setEditingIndex(null);
                                                            // Revert text visually if cancelled
                                                            if (editRef.current) editRef.current.textContent = m.content || "";
                                                        }
                                                    }}
                                                    className="outline-none whitespace-pre-wrap break-words min-w-[20px] cursor-text"
                                                >
                                                    {m.content}
                                                </div>
                                            ) : (
                                                /* AI Markdown Rendering */
                                                <div className="space-y-2">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            h1: ({ children }) => <h1 className="text-lg sm:text-2xl font-bold mb-3">{children}</h1>,
                                                            h2: ({ children }) => <h2 className="text-base sm:text-xl font-semibold mb-2">{children}</h2>,
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
                                            )}

                                            {/* AI Insights cards... */}
                                            {m.insights && Object.entries(m.insights).map(([bookName, insightsList]) => (
                                                <div key={bookName} className="space-y-3 mt-4">
                                                    <h2 className="text-base sm:text-lg font-bold border-b border-gray-200 dark:border-gray-700 pb-1">&bull; {bookName}</h2>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {(insightsList as any).map((insight: any) => (
                                                            <Link key={insight.id} href={insight.link} target="_blank" rel="noopener noreferrer"
                                                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 sm:p-4 rounded-xl space-y-2 hover:border-gray-300 dark:hover:border-gray-500 transition-colors block"
                                                            >
                                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                                    <span>{insight.category_icon}</span> {insight?.category}
                                                                </p>
                                                                <h4 className="text-gray-900 dark:text-gray-100 font-semibold text-sm sm:text-base leading-tight">
                                                                    {insight.title}
                                                                </h4>
                                                                <h6 className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm line-clamp-3">
                                                                    {insight.description}
                                                                </h6>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {m.role === "user" && m.content && (
                                            <div className="pr-1 flex items-center h-7 overflow-hidden">
                                                <AnimatePresence mode="wait">
                                                    {editingIndex === i ? (
                                                        <motion.div
                                                            key="editing-icons"
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <button
                                                                onClick={() => {
                                                                    setEditingIndex(null);
                                                                    if (editRef.current) editRef.current.textContent = m.content || "";
                                                                }}
                                                                title="Cancel"
                                                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditSubmit(i)}
                                                                disabled={!editText.trim()}
                                                                title="Save & Send"
                                                                className="p-1.5 text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50"
                                                            >
                                                                <Check size={16} strokeWidth={3} />
                                                            </button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="normal-icons"
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <button
                                                                onClick={() => handleCopy(m.content, i)}
                                                                title="Copy message"
                                                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                                                            >
                                                                {copiedIndex === i ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingIndex(i);
                                                                    setEditText(m.content || "");
                                                                }}
                                                                title="Edit message"
                                                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        {/* Existing AI Actions */}
                                        {m.role === "ai" && m.content && (
                                            <div className="pl-1 flex items-center gap-1 mt-0.5">
                                                <button
                                                    onClick={() => handleCopy(m.content, i)}
                                                    className={`p-1.5 transition-colors rounded-full disabled:opacity-50 ${copiedIndex === i
                                                        ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                                                        : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                                                        }`}
                                                >
                                                    {copiedIndex === i ? <Check size={16} /> : <Copy size={16} />}
                                                </button>

                                                <button
                                                    onClick={() => handleReadAloud(m.content, i)}
                                                    disabled={voiceMutation.isPending}
                                                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
                                                >
                                                    {voiceMutation.isPending && voiceMutation.variables === stripMarkdown(m.content ?? "").substring(0, 200) ? (
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

                                    {m.role === "user" && (
                                        <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-300">
                                            <User size={18} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {chatMutation.isPending && (
                                <div className="flex gap-3 justify-start">
                                    <div className="size-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <Bot size={18} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <ChatInput
                            book={book}
                            loading={chatMutation.isPending}
                            contextItems={contextItems}
                            selectedContexts={selectedContexts}
                            toggleContext={toggleContext}
                            removeContext={removeContext}
                            onSendMessage={handleSendMessage}
                            clearContexts={() => setSelectedContexts([])}
                            onStop={handleStopGeneration}
                        />
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
};

export default ChatbotModal;