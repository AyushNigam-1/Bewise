import { useMutation } from "@tanstack/react-query";
import { Slide, toast } from "react-toastify";
import { toggleBookmarkInsight } from "@/app/services/bookService";
import { toggleFavouriteBook } from "@/app/services/userService";
import { useUserStore } from "@/app/stores/useUserStores";

export const useBookmarkInsight = () => {
    const toggleInsight = useUserStore(state => state.toggleFavouriteInsight);
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: (insightId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleBookmarkInsight(user.user_id, insightId);
        },
        onMutate: async (insightId: number) => {
            toggleInsight(insightId);
        },
        onSuccess: (res) => {
            toast.success(
                res.bookmarked ? "Bookmark Added" : "Bookmark Removed",
                { transition: Slide }
            );
        },
        onError: (_err, insightId) => {
            // rollback optimistic update
            toggleInsight(insightId);
            toast.error("Bookmark failed", { transition: Slide });
        },
    });
};

export const useBookmarkBook = () => {
    const user = useUserStore(state => state.user);

    return useMutation({
        mutationFn: (bookId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleFavouriteBook(user.user_id, bookId);
        },
        onMutate: (bookId) => {
            // Add optimistic UI update here later
        },
        onSuccess: (data) => {
            toast.success("Bookmark updated");
        },
        onError: (_err, bookId) => {
            // rollback optimistic change here later
            toast.error("Bookmark failed");
        },
    });
};