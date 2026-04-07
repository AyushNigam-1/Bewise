import { useMutation } from "@tanstack/react-query";
import { Slide, toast } from "react-toastify";
import { toggleBookmarkInsight, toggleBookmarkBook } from "@/app/services/bookService";
import { useUserStore } from "@/app/stores/useUserStores";
import posthog from "posthog-js";

export const useBookmarkInsight = () => {
    const toggleInsight = useUserStore(state => state.toggleFavouriteInsight);
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: async (insightId: number) => {
            if (!user) throw new Error("UNAUTHORIZED");
            return toggleBookmarkInsight(insightId);
        },
        onMutate: async (insightId: number) => {
            if (!user) {
                toast.info("Please log in to bookmark.", {
                    transition: Slide,
                    autoClose: 3000,
                    hideProgressBar: true
                });
                throw new Error("UNAUTHORIZED");
            }

            const isBookmarked = !user?.favourite_insights?.includes(insightId);
            toggleInsight(insightId);
            posthog.capture('insight_bookmarked', { insight_id: insightId, bookmarked: isBookmarked });

            toast.success(
                isBookmarked ? "Bookmark Added" : "Bookmark Removed",
                { transition: Slide, autoClose: 2000, hideProgressBar: true }
            );
        },
        onError: (err, insightId) => {
            if (err.message === "UNAUTHORIZED") return;

            toggleInsight(insightId);
            toast.error("Failed! Please try again.", { transition: Slide });
        },
    });
};

export const useBookmarkBook = () => {
    const toggleBook = useUserStore(state => state.toggleFavouriteBook);
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: async (bookId: number) => {
            if (!user) throw new Error("UNAUTHORIZED");
            return toggleBookmarkBook(bookId);
        },
        onMutate: async (bookId: number) => {
            if (!user) {
                toast.info("Please log in to bookmark.", {
                    transition: Slide,
                    autoClose: 3000,
                    hideProgressBar: true
                });
                throw new Error("UNAUTHORIZED");
            }

            const isBookmarked = !user?.favourite_books?.includes(bookId);
            toggleBook(bookId);
            posthog.capture('book_bookmarked', { book_id: bookId, bookmarked: isBookmarked });

            toast.success(
                isBookmarked ? "Bookmark Added" : "Bookmark Removed",
                { transition: Slide, autoClose: 2000, hideProgressBar: true }
            );
        },
        onError: (err, bookId) => {
            if (err.message === "UNAUTHORIZED") return;
            toggleBook(bookId);
            toast.error("Failed to save. Please try again.", { transition: Slide });
        },
    });
};