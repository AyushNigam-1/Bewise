import { useMutation } from "@tanstack/react-query";
import { toggleBookmarkInsight } from "../services/bookService";
import { useUserStore } from "../stores/useUserStores";
import { Slide, toast } from "react-toastify";
import { toggleFavouriteBook } from "../services/userService";

export const useMutations = () => {
    const toggleInsight = useUserStore(state => state.toggleFavouriteInsight);
    const user = useUserStore(state => state.user);

    const bookmarkInsight = useMutation({
        mutationFn: (insightId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleBookmarkInsight(user.user_id, insightId);
        },

        onMutate: async (insightId: number) => {
            // optimistic UI update (zustand)
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

    const bookmarkBook = useMutation({
        mutationFn: (bookId: number) => {
            if (!user) throw new Error("Not authenticated");
            return toggleFavouriteBook(user.user_id, bookId);
        },

        onMutate: (bookId) => {

        },

        onSuccess: (data) => {
            toast.success("Bookmark updated");
        },

        onError: (_err, bookId) => {
            // rollback optimistic change
            toast.error("Bookmark failed");
        },
    });

    return { bookmarkInsight, bookmarkBook }
}