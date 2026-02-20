import axios from 'axios';

// Create an axios instance
const api = axios.create({
    baseURL: 'http://localhost:8000',
    withCredentials: true, // Crucial for sending cookies!
});

// Response Interceptor
api.interceptors.response.use(
    (response) => {
        // If the request succeeds, just return the response
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 (Unauthorized) and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Mark as retried to prevent infinite loops

            try {
                // 1. Call your backend refresh endpoint
                await axios.post('http://localhost:8000/refresh', {}, {
                    withCredentials: true
                });

                // 2. If refresh is successful, the browser automatically saves the new access_token cookie.
                // 3. Retry the exact same API call that just failed!
                return api(originalRequest);

            } catch (refreshError) {
                // If the refresh token ALSO fails (e.g., 30 days are up), force logout
                console.error("Session expired. Please log in again.");
                // e.g., window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Return any other errors normally
        return Promise.reject(error);
    }
);

export default api;