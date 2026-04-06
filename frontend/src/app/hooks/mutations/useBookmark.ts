import { useMutation } from "@tanstack/react-query";
import { Slide, toast } from "react-toastify";
import { toggleBookmarkInsight, toggleBookmarkBook } from "@/app/services/bookService";
import { useUserStore } from "@/app/stores/useUserStores";
import posthog from "posthog-js";

export const useBookmarkInsight = () => {
    const toggleInsight = useUserStore(state => state.toggleFavouriteInsight);
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: (insightId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleBookmarkInsight(insightId);
        },
        onMutate: async (insightId: number) => {
            const isBookmarked = !user?.favourite_insights?.includes(insightId);
            toggleInsight(insightId);
            posthog.capture('insight_bookmarked', { insight_id: insightId, bookmarked: isBookmarked });
            toast.success(
                isBookmarked ? "Bookmarked Added" : "Bookmark Removed",
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
            const isBookmarked = !user?.favourite_books?.includes(bookId);
            toggleBook(bookId);
            posthog.capture('book_bookmarked', { book_id: bookId, bookmarked: isBookmarked });
            toast.success(
                isBookmarked ? "Bookmarked Added" : "Bookmark Removed",
                { transition: Slide, autoClose: 2000, hideProgressBar: true }
            );
        },
        onError: (_err, bookId) => {
            toggleBook(bookId);
            toast.error("Bookmark failed", { transition: Slide });
        },
    });
};