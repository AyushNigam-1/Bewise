"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ToastProvider() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <ToastContainer
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            position="bottom-right"
            autoClose={2000}
            hideProgressBar={true}
            toastClassName={() =>
                "relative w-78 font-semibold flex items-center p-4 min-h-10 rounded-xl overflow-hidden cursor-pointer shadow-lg mb-4 bg-white text-gray-800 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800"
            }
        />
    );
}