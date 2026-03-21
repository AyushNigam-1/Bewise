import axios from "axios";
import { QuizQuestion } from "../types";

const API_BASE_URL = "http://localhost:8000";

export const invokeChatbot = async ({ payload, signal }: { payload: any, signal?: AbortSignal }) => {
    const { data } = await axios.post(`${API_BASE_URL}/ai/rag/invoke`,
        {
            input: payload
        },
        {
            signal: signal
        }
    );
    return data.output;
};

export const generateVoice = async (text: string) => {
    const response = await fetch(`${API_BASE_URL}/generate-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "troy" }),
    });

    if (!response.ok) throw new Error("Failed to generate voice");
    return await response.blob();
};

export const generateQuizFromText = async (textData: string): Promise<QuizQuestion[]> => {
    const response = await axios.post(
        "http://localhost:8000/ai/quiz/invoke",
        {
            input: {
                source_text: textData.substring(0, 3000),
            },
        },
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    if (!response.data) throw new Error("Failed to generate quiz");
    return response.data.output.quiz;
};