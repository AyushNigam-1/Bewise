'use client'

import * as z from 'zod';
import Link from 'next/link';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { signIn, signUp } from '@/app/lib/auth-client';
import posthog from 'posthog-js';


const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 120, damping: 14 }
    },
};

const CreateAccount = () => {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: "", email: "", password: "" }
    });

    // 🌟 1. Handle Email/Password Registration
    const onSubmit = async (data: RegisterFormValues) => {
        setIsPending(true);

        const { error } = await signUp.email({
            email: data.email,
            password: data.password,
            name: data.username, // Better Auth uses 'name' by default in the DB
        });

        setIsPending(false);

        if (error) {
            toast.error(error.message || "Failed to create account. Please try again.");
            posthog.captureException(new Error(error.message || "Signup failed"));
        } else {
            posthog.identify(data.email, { email: data.email, name: data.username });
            posthog.capture('user_signed_up', { method: 'email' });
            toast.success("Account created successfully!");
            router.push("/"); // Redirect to home or onboarding
        }
    };

    // 🌟 2. Handle Social Registration/Login
    const handleSocialLogin = async (provider: "google" | "github") => {
        setSocialLoading(provider);
        posthog.capture('social_login_clicked', { provider, page: 'signup' });
        const { error } = await signIn.social({
            provider,
            callbackURL: "/",
        });

        if (error) {
            toast.error(`Failed to connect with ${provider}.`);
            posthog.captureException(new Error(`Social signup failed: ${provider}`));
            setSocialLoading(null);
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-md md:w-full flex flex-col gap-4 transition-colors duration-300"
        >
            <motion.div variants={itemVariants} className='bg-white dark:bg-gray-800 rounded-full p-2 w-min mx-auto shadow-sm transition-colors'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-gray-600 dark:text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
            </motion.div>

            <motion.div variants={itemVariants}>
                <h1 className="text-4xl text-gray-700 dark:text-gray-100 font-extrabold text-center">Create Account</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">Join our community with all-time access for free</p>
            </motion.div>

            {/* 🌟 Social Providers */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => handleSocialLogin("google")}
                    disabled={socialLoading !== null}
                    className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {socialLoading === "google" ? (
                        <Loader2 className="animate-spin text-gray-500" size={20} />
                    ) : (
                        <>
                            <img src="https://img.icons8.com/material-rounded/120/4D4D4D/google-logo.png" alt="Google" className="w-5 dark:invert" />
                            Google
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => handleSocialLogin("github")}
                    disabled={socialLoading !== null}
                    className="w-full flex justify-center items-center gap-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {socialLoading === "github" ? (
                        <Loader2 className="animate-spin text-gray-500" size={20} />
                    ) : (
                        <>
                            <Github size={20} />
                            GitHub
                        </>
                    )}
                </button>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-3 my-2">
                <hr className="w-full border-gray-300 dark:border-gray-700" />
                <span className="text-sm text-gray-500 dark:text-gray-500 text-nowrap">or with email</span>
                <hr className="w-full border-gray-300 dark:border-gray-700" />
            </motion.div>

            {/* 🌟 Email / Password Form */}
            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
                <motion.div variants={itemVariants}>
                    <input
                        type="text"
                        placeholder="Username"
                        {...register("username")}
                        className={`mt-1 p-3 w-full bg-gray-100 dark:bg-gray-800 border ${errors.username ? 'border-red-500' : 'border-transparent dark:border-gray-700'} text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
                    />
                    {errors.username && <p className="text-red-500 text-xs mt-1 ml-1">{errors.username.message}</p>}
                </motion.div>

                <motion.div variants={itemVariants}>
                    <input
                        type="email"
                        placeholder="Email"
                        {...register("email")}
                        className={`mt-1 p-3 w-full bg-gray-100 dark:bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-transparent dark:border-gray-700'} text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
                </motion.div>

                <motion.div variants={itemVariants}>
                    <input
                        type="password"
                        placeholder="Password"
                        {...register("password")}
                        className={`mt-1 p-3 w-full bg-gray-100 dark:bg-gray-800 border ${errors.password ? 'border-red-500' : 'border-transparent dark:border-gray-700'} text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
                </motion.div>

                <motion.div variants={itemVariants}>
                    <button
                        type="submit"
                        disabled={isPending || socialLoading !== null}
                        className="w-full h-12 flex justify-center items-center bg-gray-800 dark:bg-gray-700 text-white p-3 rounded-md hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors duration-300 font-semibold shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
                            <Loader2 className="animate-spin mx-auto text-gray-200" size={24} />
                        ) : "Create Account"}
                    </button>
                </motion.div>
            </form>

            <motion.div variants={itemVariants} className="text-gray-600 dark:text-gray-400 text-center transition-colors">
                <p>
                    Already have an account?
                    <Link href="/login" className="text-lg text-gray-800 dark:text-gray-200 hover:underline font-semibold ml-1">Login</Link>
                </p>
            </motion.div>
        </motion.div>
    );
};

export default CreateAccount;