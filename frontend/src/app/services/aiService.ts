import { api } from "../lib/api";
import { QuizQuestion } from "../types";

export const invokeChatbot = async ({ payload, signal }: { payload: any, signal?: AbortSignal }) => {
    const { data } = await api.post("/ai/rag/invoke",
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
    const response = await api.post("/generate-voice",
        {
            text,
            voice: "troy"
        },
        {
            responseType: "blob"
        }
    );

    if (!response.data) throw new Error("Failed to generate voice");
    return response.data;
};

export const generateQuizFromText = async (textData: string): Promise<QuizQuestion[]> => {
    const response = await api.post("/ai/quiz/invoke",
        {
            input: {
                source_text: textData.substring(0, 3000),
            },
        }
    );

    if (!response.data) throw new Error("Failed to generate quiz");
    return response.data.output.quiz;
};