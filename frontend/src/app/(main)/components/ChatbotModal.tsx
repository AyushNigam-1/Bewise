import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Send, Bot, User, Sparkles } from "lucide-react"; // Icons

type Message = {
    role: "user" | "ai";
    content: string;
};

const ChatbotModal = ({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}) => {
    const [input, setInput] = useState("");
    const sessionId = useRef(crypto.randomUUID());
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
            const { data } = await axios.post("http://localhost:8000/chat/ai", {
                message: userMsg,
                session_id: sessionId.current,
            });

            setMessages((prev) => [...prev, { role: "ai", content: data.ai }]);
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
                        <DialogPanel className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col h-[600px] max-h-[85vh] overflow-hidden border border-gray-100">

                            {/* --- Header --- */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gray-900 rounded-lg text-white">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Bookist AI</h3>
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

                            {/* --- Messages Area --- */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        {/* Avatar AI */}
                                        {m.role === "ai" && (
                                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 shadow-sm">
                                                <Bot size={16} />
                                            </div>
                                        )}

                                        {/* Bubble */}
                                        <div
                                            className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role === "user"
                                                ? "bg-gray-900 text-white rounded-2xl rounded-tr-sm"
                                                : "bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-sm"
                                                }`}
                                        >
                                            {m.content}
                                        </div>

                                        {/* Avatar User */}
                                        {m.role === "user" && (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-500">
                                                <User size={16} />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Loading Indicator */}
                                {loading && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                            <Bot size={16} className="text-gray-400" />
                                        </div>
                                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* --- Input Area --- */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-gray-900/10 focus-within:border-gray-300 transition-all">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400"
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
                                        <Send size={16} />
                                    </button>
                                </div>
                                <div className="text-center mt-2">
                                    <span className="text-[10px] text-gray-400">AI can make mistakes. Check important info.</span>
                                </div>
                            </div>

                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ChatbotModal;