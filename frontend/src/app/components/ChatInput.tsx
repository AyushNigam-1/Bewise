"use client";

import { useState, useRef, useEffect } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  SendHorizontal,
  Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatInputProps } from "../types";
import SearchBar from "./layout/SearchBar";

export default function ChatInput({
  book,
  loading,
  contextItems,
  selectedContexts,
  toggleContext,
  removeContext,
  onSendMessage,
  clearContexts,
  onStop,
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const [filteredContexts, setFilteredContexts] = useState(contextItems);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFilteredContexts(contextItems);
  }, [contextItems]);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
  }, [selectedContexts]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -150 : 150,
      behavior: "smooth",
    });
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput("");
    clearContexts();
  };

  return (
    <div className="bg-white dark:bg-gray-800 px-3.5 py-3.5 sm:px-4 sm:py-4 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
      <AnimatePresence>
        {selectedContexts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: "auto", opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative flex items-center overflow-hidden"
          >
            <button
              onClick={() => scroll("left")}
              className={`
                                hidden md:flex absolute left-0 z-10 items-center justify-center
                                h-6 w-6 md:h-7 md:w-7 rounded-full bg-white dark:bg-gray-700
                                border border-gray-200 dark:border-gray-600
                                shadow-sm text-gray-500 dark:text-gray-300
                                hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150
                                ${canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
                            `}
            >
              <ChevronLeft size={12} />
            </button>

            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex gap-2 sm:gap-2.5 overflow-x-auto md:mx-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 items-center"
            >
              <AnimatePresence mode="popLayout">
                {selectedContexts.map((ctx) => (
                  <motion.span
                    key={ctx.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      width: 0,
                      paddingLeft: 0,
                      paddingRight: 0,
                      marginRight: 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 whitespace-nowrap flex-shrink-0"
                  >
                    {ctx.name}
                    <button
                      onClick={() => removeContext(ctx.id)}
                      className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={() => scroll("right")}
              className={`
                                hidden md:flex absolute right-0 z-10 items-center justify-center
                                h-6 w-6 md:h-7 md:w-7 rounded-full bg-white dark:bg-gray-700
                                border border-gray-200 dark:border-gray-600
                                shadow-sm text-gray-500 dark:text-gray-300
                                hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-150
                                ${canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
                            `}
            >
              <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col w-full border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded-2xl sm:rounded-3xl focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-gray-500 transition-all">
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="w-full bg-transparent text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 outline-none px-4 pt-3.5 pb-2 sm:pt-4 sm:pb-3"
          placeholder={
            selectedContexts.length > 0
              ? `Ask about ${selectedContexts.length} topic${selectedContexts.length > 1 ? "s" : ""}...`
              : "Ask about a book or concept..."
          }
          disabled={loading}
        />

        <div className="flex items-center justify-between px-2 pb-2">
          <Popover className="relative">
            {({ open, close }) => (
              <>
                <PopoverButton
                  className="rounded-full flex items-center p-2 justify-center transition-all flex-shrink-0 bg-transparent text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 outline-none"
                  title="Select Context"
                >
                  <Plus
                    size={20}
                    className={`sm:hidden ${open ? "rotate-45 transition-transform" : "transition-transform"}`}
                  />
                  <Plus
                    size={22}
                    className={`hidden sm:block ${open ? "rotate-45 transition-transform" : "transition-transform"}`}
                  />
                </PopoverButton>

                <PopoverPanel
                  transition
                  className="absolute bottom-full mb-3 left-0 w-[calc(100vw-28px)] sm:w-80 max-w-[320px] h-[360px] sm:h-[400px] flex flex-col rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl z-50 overflow-hidden p-3 space-y-3 transition-all duration-200 ease-out data-[closed]:translate-y-2 data-[closed]:opacity-0"
                >
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-gray-200">
                      Select {book ? "Insights" : "Books"}
                    </h3>
                    <button
                      onClick={close}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer p-1"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div
                    onKeyDown={(e) => e.stopPropagation()}
                    className="[&_.relative]:!py-2 [&_.relative]:!px-3 [&_.relative]:!rounded-lg md:[&_input]:!text-sm [&_input]:!text-sm"
                  >
                    <SearchBar
                      responsive={false}
                      data={contextItems}
                      propertyToSearch="name"
                      setFilteredData={setFilteredContexts as any}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 custom-scroll-hide bg-white dark:bg-gray-800">
                    {filteredContexts.length === 0 ? (
                      <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">
                        No matches found.
                      </p>
                    ) : (
                      filteredContexts.map((item) => {
                        const isSelected = selectedContexts.some(
                          (i) => i.id === item.id,
                        );
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleContext(item)}
                            className={`w-full cursor-pointer text-left rounded-lg p-2.5 sm:p-3 flex items-center justify-between transition-colors outline-none
                                                            ${
                                                              isSelected
                                                                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                                                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
                                                            }`}
                          >
                            <span className="truncate pr-4 text-sm">
                              {item.name}
                            </span>
                            {isSelected && (
                              <Check
                                size={16}
                                className="text-gray-800 dark:text-gray-200 flex-shrink-0"
                              />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverPanel>
              </>
            )}
          </Popover>

          <button
            data-testid="send-button"
            onClick={loading ? onStop : handleSend}
            disabled={!input.trim() && !loading}
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition-all flex-shrink-0
                            ${
                              loading
                                ? "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-pointer animate-pulse"
                                : input.trim()
                                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 shadow-md cursor-pointer"
                                  : "bg-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            }`}
          >
            {loading ? (
              <>
                <Square size={14} className="sm:hidden fill-current" />
                <Square size={16} className="hidden sm:block fill-current" />
              </>
            ) : (
              <>
                <SendHorizontal size={18} className="sm:hidden" />
                <SendHorizontal size={20} className="hidden sm:block" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
