import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '@/app/services/userService';
import { useUserStore } from '@/app/stores/useUserStores';
import axios from 'axios';

export const useLogin = () => {
    const router = useRouter();
    return useMutation({
        mutationFn: loginUser,
        onSuccess: async () => {
            await useUserStore.getState().getUser();
            router.push('/');
        },
        onError: (err: any) => {
            console.error("Login error:", err?.response?.data?.message || err.message);
        }
    });
};

export const useRegister = () => {
    const router = useRouter();
    return useMutation({
        mutationFn: (data: { username: string; email: string; password: string }) =>
            registerUser({
                name: data.username,
                email: data.email,
                password: data.password
            }),
        onSuccess: async () => {
            await useUserStore.getState().getUser();
            router.push('/');
        },
        onError: (err: any) => {
            console.error("Registration failed:", err?.response?.data?.message || err.message);
        }
    });
};

export const useLogout = () => {
    return useMutation({
        mutationFn: async () => {
            // Your API call to clear the httpOnly cookie
            await axios.post(
                "http://localhost:8000/logout",
                {},
                { withCredentials: true }
            );
        },
        onSuccess: () => {
            // Instantly clear the Zustand store
            const clearUser = useUserStore.getState().clearUser as (() => void) | undefined;
            if (clearUser) clearUser();
        },
        onError: (err) => {
            console.error("Logout failed:", err);
        }
    });
};