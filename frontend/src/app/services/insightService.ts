import { api } from "../lib/api";
import type { BookContentResponse, StepData } from "../types";

export const getBookContent = async (title: string, category: string[]): Promise<BookContentResponse> => {
    try {
        const response = await api.post<BookContentResponse>(`/book/${title}/content`, category);
        // Cleanly returns the unwrapped data, meaning response.data.keys and response.data.values
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || `Failed to fetch content for book: ${title}`);
    }
};

export async function getStepDetails(stepId: string): Promise<StepData> {
    try {
        const response = await api.get<StepData>(`/insights/${stepId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || `Failed to fetch step details for ID: ${stepId}`);
    }
}