import { api } from "../lib/api";
import { Recommendation } from "../types";

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