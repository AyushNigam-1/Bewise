"use client";

import React, { useState } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Plus, Search, X, Check, ChevronRight } from "lucide-react";
import { ContextItem } from "./modals/ChatbotModal"; // Adjust import based on your setup

type ChatInputProps = {
    book?: string;
    loading: boolean;
    contextItems: ContextItem[];
    selectedContexts: ContextItem[];
    toggleContext: (item: ContextItem) => void;
    removeContext: (id: string | number) => void;
    onSendMessage: (message: string) => void;
};

export default function ChatInput({
    book,
    loading,
    contextItems,
    selectedContexts,
    toggleContext,
    removeContext,
    onSendMessage
}: ChatInputProps) {
    const [input, setInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = searchQuery === ""
        ? contextItems
        : contextItems.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleSend = () => {
        if (!input.trim() || loading) return;

        onSendMessage(input);
        setInput(""); // Clear input after sending
    };

    return (
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
                {/* Context Menu Popover */}
                <Popover className="relative">
                    {({ open, close }) => (
                        <>
                            <PopoverButton
                                className="flex items-center justify-center transition-all outline-none p-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                title="Select Context"
                            >
                                <Plus size={22} className={open ? "rotate-45 transition-transform" : "transition-transform"} />
                            </PopoverButton>

                            <PopoverPanel
                                transition
                                className="absolute bottom-full mb-3 left-0 w-80 h-[400px] flex flex-col rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl z-50 overflow-hidden p-3 space-y-3 transition-all duration-200 ease-out data-[closed]:translate-y-2 data-[closed]:opacity-0"
                            >
                                <div className="flex items-center justify-between dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">
                                        Select {book ? "Insights" : "Books"}
                                    </h3>
                                    <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-white/5 rounded-lg border dark:border-gray-600">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 transition-all bg-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-1 custom-scroll-hide bg-white dark:bg-gray-800">
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
                                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
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
                        </>
                    )}
                </Popover>

                {/* Main Text Input */}
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="flex-1 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none p-3 rounded-2xl focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-500 transition-all h-12"
                    placeholder={selectedContexts.length > 0 ? `Ask about these ${selectedContexts.length} topics...` : "Ask about a book, concept, or author..."}
                    disabled={loading}
                />

                {/* Send Button */}
                <button
                    onClick={handleSend}
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
    );
}