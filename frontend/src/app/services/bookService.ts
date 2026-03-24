import { api } from "../lib/api";

export const getAllBooks = async () => {
    try {
        const response = await api.get(`/books`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const findBooksByCategories = async (categories: string[]) => {
    try {
        const response = await api.post(`/books/find-by-categories`, categories);
        return response.data;
    } catch (error: any) {
        console.error(error);
        throw error;
    }
};

export const getBookContent = async (title: string, category: string[]) => {
    try {
        const response = await api.post(`/book/${title}/content`, category);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export async function getStepDetails(stepId: string) {
    try {
        const response = await api.get(`/insights/${stepId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const createBook = async (bookData: {
    Title: string;
    Author: string;
    Description: string;
    Thumbnail: string;
    Content: object;
}) => {
    try {
        const response = await api.post(`/books/`, bookData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const processBook = async (file: File, bookDetails: Record<string, string>) => {
    const formData = new FormData();
    formData.append("file", file);
    Object.entries(bookDetails).forEach(([key, value]) => {
        formData.append(key, value);
    });

    try {
        const response = await api.post(`/process-book`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getBookInfoByTitle = async (title: string) => {
    try {
        const response = await api.get(`/book/${title}/info`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const toggleBookmarkBook = async (book_id: number) => {
    try {
        const res = await api.post(`/bookmark/book/${book_id}`);
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.detail || "Failed to toggle book bookmark");
    }
};

export const toggleBookmarkInsight = async (insight_id: number) => {
    try {
        const res = await api.post(`/bookmark/insight/${insight_id}`);
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.detail || "Failed to toggle insight bookmark");
    }
};