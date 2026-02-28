import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { loginUser, registerUser } from '@/app/services/userService';
import { useUserStore } from '@/app/stores/useUserStores';

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