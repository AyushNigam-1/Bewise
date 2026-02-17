import {
    Dialog,
    DialogPanel,
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
    Transition,
    TransitionChild,
} from "@headlessui/react";
import React, { Fragment, useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Send, Bot, User, Sparkles, SendHorizontal, Library, ChevronDown, Check, Plus, Search } from "lucide-react"; // Icons
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import Link from "next/link";
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

export type ContextItem = {
    id: string | number;
    name: string;
};

type ChatbotModalProps = {
    book?: string;
    contextItems?: ContextItem[]; // <--- New Prop for the list
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
    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const removeContext = (id: string | number) => {
        setSelectedContexts((prev) => prev.filter((item) => item.id !== id));
    };

    const sendMessage = async () => {
        // 1. Prevent empty messages or double submissions
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
                console.log(book, contextIds)
                payload = {
                    message: userMsg,
                    session_id: sessionId.current,
                    books_ids: [book],     // e.g. [12, 45, 99]
                    insights_ids: contextIds, // e.g. "Atomic Habits" (fallback if needed)
                };
            }
            else {
                contextIds = selectedContexts.map((ctx) => ctx.name);
                payload = {
                    message: userMsg,
                    session_id: sessionId.current,
                    books_ids: contextIds,     // e.g. [12, 45, 99]
                    insights_ids: [], // e.g. "Atomic Habits" (fallback if needed)
                };
            }
            const { data } = await axios.post("http://10.63.43.43:8000/chat/ai", payload);
            console.log("AI Response:", data);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: data.answer,
                    insights: data.insights, // This expects your backend to return the insights map
                },
            ]);
        } catch (error) {
            // console.error("Chat Error:", error);
            // setMessages((prev) => [
            //     ...prev,
            //     { role: "ai", content: "I'm having trouble connecting right now. Please try again." },
            // ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className=" p-3 font-semibold  bg-gradient-to-r text-white bg-gray-700  shadow cursor-pointer rounded-full flex gap-2 items-center">
                <Bot size={20} />
            </button>

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
                                                className={`md:max-w-[70%] p-4 space-y-2 text-sm  leading-relaxed ${m.role === "user"
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
                                                            {(insights as any).map((i: any) => (
                                                                <Link key={i.id} href={i.link} target="_blank" rel="noopener noreferrer" className="bg-gray-100 p-4 rounded-xl space-y-2">
                                                                    <p className="text-xs font-semibold text-gray-600">
                                                                        {i.category_icon}  {i?.category}
                                                                    </p>
                                                                    <h4 className='text-gray-800 font-semibold text-lg md:text-xl '>
                                                                        {i.title}
                                                                    </h4>
                                                                    <h6 className='text-gray-800'>
                                                                        {i.description}
                                                                    </h6>
                                                                </Link>
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
                                <div className="bg-white p-4 border-t border-gray-200">
                                    {selectedContexts.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {selectedContexts.map((ctx) => (
                                                <span key={ctx.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-lg border border-gray-200 animate-in fade-in zoom-in duration-200">
                                                    {ctx.name}
                                                    <button
                                                        onClick={() => removeContext(ctx.id)}
                                                        className="hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {/* SECTION 2: Input Row */}
                                    <div className="flex items-center gap-2 p-3 bg-gray-100 border-none  rounded-xl focus-within:ring-2 focus-within:ring-gray-900/10 focus-within:border-gray-300 transition-all">

                                        {/* Dropup Menu (Multiple Selection) */}
                                        {contextItems.length > 0 && (
                                            <div className="relative mb-0.5">
                                                <Listbox value={selectedContexts} onChange={setSelectedContexts} multiple>
                                                    <ListboxButton className="
                                                        w-9 h-9 rounded-xl flex items-center justify-center transition-all
                                                            bg-white text-gray-500 hover:bg-gray-200 border border-gray-200" title="Select Context">
                                                        <Plus size={18} />
                                                    </ListboxButton>

                                                    <Transition
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                    >
                                                        <ListboxOptions className="absolute bottom-full mb-2 left-0 w-120 h-120 overflow-auto rounded-xl bg-white ring-1 ring-black/5 focus:outline-none z-50 p-2 ">
                                                            <div className="text-sm py-2 font-semibold text-gray-600 uppercase tracking-wider">
                                                                Select topics
                                                            </div>
                                                            <div className="sticky top-0 z-10 py-2">
                                                                <div className="relative">
                                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search items..."
                                                                        value={searchQuery}
                                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                                        // IMPORTANT: Prevent keys from interfering with Listbox navigation
                                                                        onKeyDown={(e) => e.stopPropagation()}
                                                                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400  transition-colors"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {filteredItems.map((item) => (
                                                                <ListboxOption
                                                                    key={item.id}
                                                                    value={item}
                                                                    className={({ active, selected }) =>
                                                                        `relative cursor-pointer select-none rounded-lg p-2 flex items-center justify-between text-sm transition-colors ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                                        } ${selected ? 'bg-gray-50' : ''}`
                                                                    }
                                                                >
                                                                    {({ selected }) => (
                                                                        <>
                                                                            <span className={`block truncate ${selected ? 'font-medium text-gray-900' : 'font-normal'}`}>
                                                                                {item.name}
                                                                            </span>
                                                                            {selected && (
                                                                                <span className="flex items-center text-gray-800">
                                                                                    <Check size={16} />
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </ListboxOption>
                                                            ))}
                                                        </ListboxOptions>
                                                    </Transition>
                                                </Listbox>
                                            </div>
                                        )}

                                        <input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-2.5 ml-1"
                                            placeholder={selectedContexts.length > 0 ? `Ask about these ${selectedContexts.length} topics...` : "Ask about a book, concept, or author..."}
                                            disabled={loading}
                                        />

                                        <button
                                            onClick={sendMessage}
                                            disabled={!input.trim() || loading}
                                            className={`p-2.5 mb-0.5 rounded-xl transition-all flex items-center justify-center ${input.trim()
                                                ? "bg-gray-900 text-white hover:bg-black shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                }`}
                                        >
                                            <SendHorizontal size={18} />
                                        </button>
                                    </div>
                                    {/* <div className="text-center mt-2">
                                        <span className="text-[10px] text-gray-400 font-medium">AI can make mistakes. Verify important information.</span>
                                    </div> */}
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