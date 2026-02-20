"use client"

import { create } from "zustand";
import api from "../interceptor";
import { User } from "../types";

type UserStore = {
    user: User | null;
    loading: boolean;
    getUser: () => Promise<void>;
    clearUser: () => void;
    toggleFavouriteBook: (bookId: number) => void;
    toggleFavouriteInsight: (insightId: number) => void;
};

export const useUserStore = create<UserStore>((set, get) => ({
    user: null,
    loading: true,

    getUser: async () => {
        try {
            const res = await api.get("http://localhost:8000/me", {
                withCredentials: true
            });
            console.log(res.data)
            set({ user: res.data, loading: false });
        } catch (e) {
            console.log("log", e)
            set({ user: null, loading: false });
        }
    },

    clearUser: () => set({ user: null }),

    toggleFavouriteBook: (bookId) => {
        const user = get().user;
        if (!user) return;

        const exists = user.favourite_books.includes(bookId);

        set({
            user: {
                ...user,
                favourite_books: exists
                    ? user.favourite_books.filter(id => id !== bookId)
                    : [...user.favourite_books, bookId]
            }
        });
    },

    toggleFavouriteInsight: (insightId) => {
        const user = get().user;
        if (!user) return;

        const exists = user.favourite_insights.includes(insightId);

        set({
            user: {
                ...user,
                favourite_insights: exists
                    ? user.favourite_insights.filter(id => id !== insightId)
                    : [...user.favourite_insights, insightId]
            }
        });
    }
}));
