"use client"

import { create } from "zustand";
import { User } from "../types";

type UserStore = {
    user: User | null;
    setUser: (user: User | null) => void;
    clearUser: () => void;
    toggleFavouriteBook: (bookId: number) => void;
    toggleFavouriteInsight: (insightId: number) => void;
};

export const useUserStore = create<UserStore>((set, get) => ({
    user: null,
    setUser: (user) => set({ user }),

    clearUser: () => set({ user: null }),

    toggleFavouriteBook: (bookId) => {
        const user = get().user;
        if (!user) return;

        const exists = user.favourite_books?.includes(bookId);

        set({
            user: {
                ...user,
                favourite_books: exists
                    ? user.favourite_books.filter(id => id !== bookId)
                    : [...(user.favourite_books || []), bookId]
            }
        });
    },

    toggleFavouriteInsight: (insightId) => {
        const user = get().user;
        if (!user) return;

        const exists = user.favourite_insights?.includes(insightId);

        set({
            user: {
                ...user,
                favourite_insights: exists
                    ? user.favourite_insights.filter(id => id !== insightId)
                    : [...(user.favourite_insights || []), insightId]
            }
        });
    }
}));