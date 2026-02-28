"use client"

import Link from 'next/link'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, User } from 'lucide-react'
import { useLogin } from '@/app/hooks/mutations/useAuth'

const loginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
    const { mutate: login, isPending } = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" }
    });

    // 2. Form submission just passes data to the hook
    const onSubmit = (data: LoginFormValues) => {
        login(data);
    };

    return (
        <div id='main' className="max-w-md md:w-full flex flex-col gap-4 transition-colors duration-300">
            <div className='bg-gray-100 dark:bg-gray-800 rounded-full p-3 w-min mx-auto transition-colors'>
                <User size={50} />
            </div>

            <h1 className="text-4xl text-gray-800 dark:text-gray-100 font-extrabold text-center transition-colors">Login</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Welcome back! Please enter your credentials.</p>

            <div className="flex flex-col lg:flex-row items-center justify-between">
                <button className="w-full flex justify-center items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-300 p-3 font-semibold">
                    <img src="https://img.icons8.com/material-rounded/66/4D4D4D/google-logo.png" alt="Google" className="w-5 dark:invert" />
                    Login with Google
                </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-500 text-center">
                <p>or with email</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
                <div>
                    <input
                        type="email"
                        placeholder='Email'
                        {...register("email")}
                        className={`p-3 w-full border ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
                </div>

                <div>
                    <input
                        type="password"
                        placeholder='Password'
                        {...register("password")}
                        className={`p-3 w-full border ${errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none rounded-md focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 transition-all`}
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-gray-700 dark:bg-gray-600 text-white p-2.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors duration-300 font-semibold text-center cursor-pointer shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isPending ? (
                        <Loader2 className="animate-spin mx-auto text-gray-200" size={24} />
                    ) : (
                        'Login'
                    )}
                </button>
            </form>

            <div className="text-gray-600 dark:text-gray-400 text-center transition-colors">
                <p>
                    Don't have an account? <Link href="/create-account" className="text-lg text-gray-800 dark:text-gray-200 hover:underline font-semibold">Create Account</Link>
                </p>
            </div>
        </div>
    )
}

export default Login