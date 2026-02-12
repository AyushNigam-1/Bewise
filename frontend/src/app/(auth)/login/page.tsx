"use client"

import useElementHeight from '@/app/hooks/useHeight'
import Link from 'next/link'
import React, { useState } from 'react'
import { loginUser } from '@/app/services/userService'
import { useRouter } from 'next/navigation'

const Login = () => {
    const height = useElementHeight("main")
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        try {
            const data = await loginUser(formData)
            // console.log("Login successful:", data)
            localStorage.setItem("user", JSON.stringify(data))
            router.push("/")
        } catch (err: any) {
            console.error("Login error:", err?.response?.data?.message || err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div id='main' className="max-w-md md:w-full flex flex-col gap-4">
            <div className='bg-white rounded-full p-2 w-min mx-auto'>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-12 text-gray-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
            </div>
            <h1 className="text-4xl text-gray-600 font-extrabold text-center">Login</h1>
            <p className="text-sm text-gray-500 text-center">Welcome back! Please enter your credentials.</p>
            <div className="flex flex-col lg:flex-row items-center justify-between">
                <button className="w-full flex justify-center items-center gap-1 bg-white text-gray-600 rounded-md hover:bg-gray-50 border border-gray-200 transition-colors duration-300 p-3 font-semibold">
                    <img src="https://img.icons8.com/material-rounded/66/4D4D4D/google-logo.png" alt="Google" className="w-5" /> Login with Google
                </button>
            </div>
            <div className="text-sm text-gray-500 text-center">
                <p>or with email</p>
            </div>
            <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                <div>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder='Email'
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 p-3 w-full bg-gray-200 outline-none rounded-md"
                    />
                </div>
                <div>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder='Password'
                        value={formData.password}
                        onChange={handleChange}
                        className="mt-1 p-3 w-full bg-gray-200 outline-none rounded-md"
                    />
                </div>
                <button type="submit" className="w-full bg-gray-700 text-white p-2 rounded-md hover:bg-gray-800 transition-colors duration-300 font-semibold text-center cursor-pointer">
                    {loading ?
                        <svg aria-hidden="true" className="size-6 mx-auto text-gray-200 animate-spin dark:text-gray-600 fill-white" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                        </svg>
                        : 'Login'}
                </button>
            </form>
            <div className="text-gray-600 text-center">
                <p>
                    Don't have an account? <Link href="/create-account" className="text-lg text-gray-800 hover:underline font-semibold">Create Account</Link>
                </p>
            </div>
        </div>
    )
}

export default Login
