"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
    Loader2,
    UploadCloud,
    BookOpen,
    User,
    AlignLeft,
    Image as ImageIcon,
    Tags,
    FileText,
    CheckCircle2,
    XCircle,
    Plus,
    Upload
} from "lucide-react";
import { api } from "../lib/api";

const CATEGORIES = [
    "Business & Entrepreneurship",
    "Psychology & Human Behavior",
    "Self-Help & Personal Development",
    "Money & Investing",
    "Productivity & Time Management",
    "Science & Technology",
    "Health & Fitness",
    "Philosophy & Spirituality",
    "Leadership & Influence",
    "Relationships & Social Skills",
    "History & Politics",
    "Neuroscience & Brain Science",
    "Writing & Creativity",
    "Education & Learning"
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = ["application/pdf"];

const uploadSchema = z.object({
    file: z.any()
        .refine((files) => files?.length === 1, "A PDF file is required.")
        .refine((files) => files[0]?.size <= MAX_FILE_SIZE, "Max file size is 50MB.")
        .refine((files) => ACCEPTED_FILE_TYPES.includes(files[0]?.type), "Only .pdf files are accepted."),
    book_title: z.string().min(1, "Book title is required"),
    author: z.string().min(1, "Author name is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    cover_url: z.string().url("Must be a valid image URL"),
    category: z.array(z.string()).min(1, "Select at least one category"),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } },
};

export default function ProcessBookPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [jobStatus, setJobStatus] = useState<string | null>(null);

    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadSchema),
        defaultValues: {
            category: []
        }
    });

    const selectedFile = watch("file");
    const selectedCategories = watch("category") || [];

    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setValue("category", selectedCategories.filter(c => c !== cat), { shouldValidate: true });
        } else {
            setValue("category", [...selectedCategories, cat], { shouldValidate: true });
        }
    };

    const pollJobStatus = async (jobId: string) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const { data } = await api.get(`/process-book/${jobId}/status`);

                if (data.status === 'finished') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    toast.success("Book processed and insights generated successfully!");
                    setIsProcessing(false);
                    setJobStatus(null);
                    setActiveJobId(null);
                    reset();
                } else if (data.status === 'failed') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    toast.error("Processing failed: " + (data.error || "Unknown error"));
                    setIsProcessing(false);
                    setJobStatus(null);
                    setActiveJobId(null);
                } else if (data.status === 'canceled') {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    setIsProcessing(false);
                    setJobStatus(null);
                    setActiveJobId(null);
                } else {
                    setJobStatus(data.status);
                }
            } catch (err) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                toast.error("Lost connection to processing server.");
                setIsProcessing(false);
                setJobStatus(null);
                setActiveJobId(null);
            }
        }, 5000);
    };

    const cancelProcessing = async () => {
        if (!activeJobId) return;

        try {
            await api.post(`/process-book/${activeJobId}/cancel`);

            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsProcessing(false);
            setJobStatus(null);
            setActiveJobId(null);
            toast.info("Book processing was cancelled.");

        } catch (error) {
            toast.error("Failed to cancel the job.");
        }
    };

    const onSubmit = async (formDataValues: UploadFormValues) => {
        setIsProcessing(true);
        setJobStatus("uploading");

        const formData = new FormData();
        formData.append("file", formDataValues.file[0]);
        formData.append("book_title", formDataValues.book_title);
        formData.append("author", formDataValues.author);
        formData.append("description", formDataValues.description);
        formData.append("cover_url", formDataValues.cover_url);
        formData.append("category", formDataValues.category.join(","));

        try {
            const { data } = await api.post('/process-book', formData);

            if (data.job_id) {
                setActiveJobId(data.job_id);
                pollJobStatus(data.job_id);
            } else {
                throw new Error("No job ID returned from server.");
            }

        } catch (error: any) {
            const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || "An unexpected error occurred.";
            toast.error(errorMsg);

            setIsProcessing(false);
            setJobStatus(null);
            setActiveJobId(null);
        }
    };

    const getButtonText = () => {
        if (!isProcessing) return "Upload & Generate Insights";
        if (jobStatus === "uploading") return "Uploading PDF...";
        if (jobStatus === "queued") return "Waiting in AI Queue...";
        if (jobStatus === "started") return "AI is extracting insights (This takes a few minutes)...";
        return "Processing...";
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 md:p-8 w-full">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="w-full max-w-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-visible flex flex-col transition-colors duration-300"
            >
                <motion.div variants={itemVariants} className="bg-gray-50 dark:bg-gray-800/50 p-5 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
                        <Plus className="text-blue-500 w-6 h-6 sm:w-8 sm:h-8" />
                        Add New Book
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-xs sm:text-sm md:text-base">
                        Upload a PDF and let the AI pipeline extract, deduplicate, and categorize actionable insights.
                    </p>
                </motion.div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">

                    {/* FILE DROPZONE */}
                    <motion.div variants={itemVariants}>
                        <label className={`relative flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${errors.file ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'} ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                {selectedFile && selectedFile.length > 0 ? (
                                    <>
                                        <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 mb-2 sm:mb-3" />
                                        <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200 font-semibold truncate max-w-[200px] sm:max-w-[250px] md:max-w-md">
                                            {selectedFile[0].name}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-gray-500">
                                            {(selectedFile[0].size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500 mb-2 sm:mb-3" />
                                        <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">PDF only (Max 50MB)</p>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="application/pdf"
                                {...register("file")}
                                disabled={isProcessing}
                            />
                        </label>
                        {errors.file && <p className="text-red-500 text-xs mt-2 ml-1">{errors.file.message as string}</p>}
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                        <motion.div variants={itemVariants} className="space-y-1">
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <BookOpen size={16} /> Book Title
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Atomic Habits"
                                {...register("book_title")}
                                disabled={isProcessing}
                                className={`w-full p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/80 border ${errors.book_title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl text-sm sm:text-base text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all disabled:opacity-50`}
                            />
                            {errors.book_title && <p className="text-red-500 text-xs ml-1">{errors.book_title.message}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-1">
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <User size={16} /> Author
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. James Clear"
                                {...register("author")}
                                disabled={isProcessing}
                                className={`w-full p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/80 border ${errors.author ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl text-sm sm:text-base text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all disabled:opacity-50`}
                            />
                            {errors.author && <p className="text-red-500 text-xs ml-1">{errors.author.message}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-1 md:col-span-2">
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <AlignLeft size={16} /> Description
                            </label>
                            <textarea
                                rows={10}
                                placeholder="A brief summary of what the book is about..."
                                {...register("description")}
                                disabled={isProcessing}
                                className={`w-full p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/80 border ${errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl text-sm sm:text-base text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all resize-none disabled:opacity-50`}
                            />
                            {errors.description && <p className="text-red-500 text-xs ml-1">{errors.description.message}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-1 md:col-span-2">
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <ImageIcon size={16} /> Cover Image URL
                            </label>
                            <input
                                type="text"
                                placeholder="https://..."
                                {...register("cover_url")}
                                disabled={isProcessing}
                                className={`w-full p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/80 border ${errors.cover_url ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl text-sm sm:text-base text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-all disabled:opacity-50`}
                            />
                            {errors.cover_url && <p className="text-red-500 text-xs ml-1">{errors.cover_url.message}</p>}
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-2 md:col-span-2">
                            <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1 flex items-center gap-2">
                                <Tags size={16} /> Categories
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 overflow-y-auto pr-2 max-h-[300px]  no-scrollbar">
                                {CATEGORIES.map(cat => {
                                    const isSelected = selectedCategories.includes(cat);
                                    return (
                                        <div
                                            key={cat}
                                            onClick={() => !isProcessing && toggleCategory(cat)}
                                            className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 hover:border-gray-300 dark:hover:border-gray-600'
                                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                readOnly
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                                            />
                                            <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {cat}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            {errors.category && <p className="text-red-500 text-xs ml-1">{errors.category.message}</p>}
                        </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="flex-1 flex justify-center items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 p-3.5 sm:p-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors duration-300 font-bold text-sm sm:text-base md:text-lg shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin flex-shrink-0" size={20} />
                                    <span className="text-center">{getButtonText()}</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={20} className="sm:w-6 sm:h-6" />
                                    <span>{getButtonText()}</span>
                                </>
                            )}
                        </button>

                        {isProcessing && (
                            <button
                                type="button"
                                onClick={cancelProcessing}
                                className="w-full sm:w-auto sm:px-8 flex justify-center items-center gap-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 p-3.5 sm:p-4 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 transition-colors duration-300 font-bold text-sm sm:text-base md:text-lg shadow-sm"
                            >
                                <XCircle size={20} className="sm:w-6 sm:h-6" />
                                <span>Cancel</span>
                            </button>
                        )}
                    </motion.div>
                </form>
            </motion.div>
        </div>
    );
}