import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// const API = "http://10.63.43.43:8000" // Update based on your FastAPI server
const API = "http://localhost:8000"

export function getDeviceId() {
    if (typeof window === "undefined") return "";

    let id = localStorage.getItem("device_id");

    if (!id) {
        id = uuidv4();
        localStorage.setItem("device_id", id);
    }

    return id;
}

export interface Insight {
    id: number;
    title: string;
    content: string;
    category: string;
    // add other fields here based on your DB structure
}

export const getMe = async () => {
    const res = await axios.get(`${API}/me`, {
        withCredentials: true
    });
    return res.data;
};

export const loginUser = async (user: {
    email: string;
    password: string;
}) => {
    const res = await axios.post(
        `${API}/login`,
        {
            ...user,
            device_id: getDeviceId(),
        },
        { withCredentials: true }
    );

    return res.data;
};

export const registerUser = async (user: {
    name: string;
    email: string;
    password: string;
}) => {
    const res = await axios.post(
        `${API}/register`,
        user,
        { withCredentials: true }
    );

    return res.data;
};


export const getProfile = async (email: string) => {
    const res = await axios.get(`${API}/profile/${email}`);
    return res.data;
};

export const toggleFavouriteBook = async (userId: number, bookId: number) => {
    console.log(userId, bookId)
    try {
        const res = await axios.post(`${API}/favourite/book/${userId}/${bookId}`);
        return res.data.favourite_books;
    } catch (error) {
        console.error('Error toggling favourite book:', error);
        throw error;
    }
};

export const getFavouriteBooks = async (userId: number) => {
    try {
        const res = await axios.get(`${API}/favourite/book/${userId}`);
        return res.data.favourite_books;
    } catch (error) {
        console.error('Error fetching favourite books:', error);
        throw error;
    }
};

export const addFavouriteInsight = async (userId: number, insight: {
    id: number;
    category: string;
    description: string
    icon: string;
}) => {
    try {
        console.log(userId, insight)
        const response = await axios.post(`${API}/favourite/insight/add`, {
            user_id: userId,
            insight: insight
        });
        console.log(response)
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.detail || 'Failed to add favourite insight');
    }
};



export async function getFavouriteCategories(userId: number) {
    // console.log(userId)
    const response = await axios.get(`${API}/favourite/insight/categories/${userId}`);
    return response.data.categories;
}

export async function getFavouriteIds(userId: number) {
    const response = await axios.get(`${API}/favourite/insights/ids/${userId}`);
    return response.data.favourite_ids;
}

export async function getFavouriteInsights(userId: number, category?: string[]) {
    console.log(userId, category)
    const response = await axios.post(`${API}/favourite/insight/list/${userId}`, category);

    return response.data.insights;
}

export const getCompletedInsights = async (userId: number, bookName: string) => {
    try {
        const response = await axios.get(`${API}/completed/insights/${userId}/${bookName}`);
        return response.data.insights; // this will be an array of insight IDs
    } catch (error) {
        console.error("Failed to fetch completed insights:", error);
        throw error;
    }
};

export const addCompletedInsight = async (userId: number, bookName: string, insightId: number) => {
    try {
        const response = await axios.post(
            `${API}/complete/insight/${userId}`,
            {
                book_name: bookName,
                insight_id: insightId
            }
        );
        return response.data;
    } catch (error) {
        console.error("Failed to add completed insight", error);
        throw error;
    }
}