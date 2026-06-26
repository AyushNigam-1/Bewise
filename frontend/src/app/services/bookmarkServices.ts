import { api } from "../lib/api";

export const toggleBookmarkBook = async (bookId: number) => {
    try {
        const res = await api.post(`/bookmark/book/${bookId}`);
        return res.data;
    } catch (error) {
        console.error('Error toggling favourite book:', error);
        throw error;
    }
};

export const toggleBookmarkInsight = async (insightId: number) => {
    try {
        const response = await api.post(`/bookmark/insight/${insightId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Failed to toggle favourite insight');
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