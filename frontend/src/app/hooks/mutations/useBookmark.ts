import { useMutation } from "@tanstack/react-query";
import { Slide, toast } from "react-toastify";

import { toggleBookmarkInsight, toggleBookmarkBook } from "@/app/services/bookService"; // Adjust paths as needed
import { useUserStore } from "@/app/stores/useUserStores";

export const useBookmarkInsight = () => {
    const toggleInsight = useUserStore(state => state.toggleFavouriteInsight);
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: (insightId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleBookmarkInsight(insightId);
        },
        onMutate: async (insightId: number) => {
            toggleInsight(insightId);
        },
        onSuccess: (res) => {
            toast.success(
                res.bookmarked ? "Insight Bookmarked" : "Insight Bookmark Removed",
                { transition: Slide, autoClose: 2000, hideProgressBar: true }
            );
        },
        onError: (_err, insightId) => {
            toggleInsight(insightId);
            toast.error("Bookmark failed", { transition: Slide });
        },
    });
};

export const useBookmarkBook = () => {
    const toggleBook = useUserStore(state => state.toggleFavouriteBook);
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: (bookId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleBookmarkBook(bookId);
        },
        onMutate: async (bookId: number) => {
            toggleBook(bookId);
        },
        onSuccess: (res) => {
            toast.success(
                res.bookmarked ? "Book Bookmarked" : "Book Bookmark Removed",
                { transition: Slide, autoClose: 2000, hideProgressBar: true }
            );
        },
        onError: (_err, bookId) => {
            toggleBook(bookId);
            toast.error("Bookmark failed", { transition: Slide });
        },
    });
};