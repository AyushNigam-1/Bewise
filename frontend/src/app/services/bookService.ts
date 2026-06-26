import { api } from "../lib/api";
import { BookInfo, FindBooksResponse } from "../types";

export const getAllBooks = async () => {
    try {
        const response = await api.get(`/books`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

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

export const findBooksByCategories = async (categories: string[]): Promise<FindBooksResponse> => {
    try {
        const response = await api.post<FindBooksResponse>(`/books/find-by-categories`, categories);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.detail || "Failed to find books by categories"
        );
    }
};

export const getBookInfoByTitle = async (title: string): Promise<BookInfo> => {
    try {
        const response = await api.get<BookInfo>(`/book/${title}/info`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.detail || `Failed to fetch info for book: ${title}`
        );
    }
};