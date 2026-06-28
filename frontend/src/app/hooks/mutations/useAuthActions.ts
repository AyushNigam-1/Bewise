import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/app/lib/auth-client";
import { toast } from "react-toastify";
import { LoginFormValues, RegisterFormValues } from "../../../../types/auth";

export const useAuthActions = () => {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);

    const loginWithEmail = async (data: LoginFormValues) => {
        setIsPending(true);
        try {
            const response = await signIn.email({
                email: data.email,
                password: data.password,
            });

            if (response?.error) {
                toast.error("Invalid credentials. Try again.");
            } else {
                toast.success("Successfully logged in!");
                router.push("/explore");
            }
        } catch (err: any) {
            toast.error("Invalid credentials. Try again.");
            throw err; // Let global telemetry catch this
        } finally {
            setIsPending(false);
        }
    };

    const signUpWithEmail = async (data: RegisterFormValues) => {
        setIsPending(true);
        try {
            const response = await signUp.email({
                email: data.email,
                password: data.password,
                name: data.username, // Mapping username to Better Auth's expected 'name' field
            });

            if (response?.error) {
                toast.error(response.error.message || "Failed! Please try again.");
            } else {
                toast.success("Account created successfully!");
                router.push("/explore");
            }
        } catch (err: any) {
            toast.error("Failed to create account. Please try again.");
            throw err; // Let global telemetry catch this
        } finally {
            setIsPending(false);
        }
    };

    const continueWithSocial = async (provider: "google" | "github") => {
        setSocialLoading(provider);
        try {
            const { error } = await signIn.social({
                provider,
                callbackURL: "/",
            });

            if (error) {
                toast.error(`Failed to connect with ${provider}. Please try again.`);
            }
        } catch (err: any) {
            toast.error(`Failed to connect with ${provider}. Please try again.`);
            throw err; // Let global telemetry catch this
        } finally {
            setSocialLoading(null);
        }
    };

    return {
        isPending,
        socialLoading,
        loginWithEmail,
        signUpWithEmail,
        continueWithSocial,
    };
};