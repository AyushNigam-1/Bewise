import axios from "axios";
import { authClient } from "./auth-client";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
    try {
        const { data } = await authClient.getSession();
        const token = data?.session?.token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Failed to fetch session for request interceptor", error);
    }

    return config;
});