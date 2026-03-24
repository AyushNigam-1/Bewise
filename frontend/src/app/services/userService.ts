import { api } from "../lib/api";
import { Recommendation } from "../types";

export interface Insight {
    id: number;
    title: string;
    content: string;
    category: string;
}

export const getMe = async () => {
    const res = await api.get(`/me`);
    return res.data;
};

export const toggleFavouriteBook = async (bookId: number) => {
    try {
        const res = await api.post(`/bookmark/book/${bookId}`);
        return res.data.favourite_books;
    } catch (error) {
        console.error('Error toggling favourite book:', error);
        throw error;
    }
};

export const toggleFavouriteInsight = async (insightId: number) => {
    try {
        const response = await api.post(`/bookmark/insight/${insightId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Failed to toggle favourite insight');
    }
};

export const fetchSessionRecommendations = async (stepId: string) => {
    try {
        const { data } = await api.post<{ recommendations: Recommendation[] }>(`/insights/session-recommend`, {
            insight_id: Number(stepId),
        });
        return data.recommendations || [];
    } catch (e) {
        console.error("Recommendation failed", e);
    }
};

export const getBookmarkedBooks = async () => {
    try {
        const response = await api.get(`/bookmarks/books`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || "Failed to fetch bookmarked books");
    }
};

export const getBookmarkedInsights = async () => {
    try {
        const response = await api.get(`/bookmarks/insights`);
        console.log(response)
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || "Failed to fetch bookmarked insights");
    }
};

// export const getCompletedInsights = async (bookName: string) => {
//     try {
//         const response = await api.get(`/completed/insights/${bookName}`);
//         return response.data.insights;
//     } catch (error) {
//         console.error("Failed to fetch completed insights:", error);
//         throw error;
//     }
// };

// export const addCompletedInsight = async (bookName: string, insightId: number) => {
//     try {
//         const response = await api.post(`/complete/insight`, {
//             book_name: bookName,
//             insight_id: insightId
//         });
//         return response.data;
//     } catch (error) {
//         console.error("Failed to add completed insight", error);
//         throw error;
//     }
// }