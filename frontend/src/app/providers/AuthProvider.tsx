"use client";
import { useEffect } from "react";
import { useUserStore } from "@/app/stores/useUserStores";
import { useSession } from "@/app/lib/auth-client";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = useSession();
    const setUser = useUserStore((state) => state.setUser);

    useEffect(() => {
        // If still loading, do nothing. Let the Navbar skeleton handle the UI.
        if (isPending) return;

        // If we have a user, format it cleanly and push to Zustand
        if (session?.user) {
            setUser({
                ...session.user,
                // Ensure these arrays always exist to prevent .includes() crashes in your UI
                favourite_books: session.user.favourite_books ?? [],
                favourite_insights: session.user.favourite_insights ?? []
            });
        } else {
            // If finished loading and no user, wipe the Zustand store
            setUser(null);
        }
    }, [session, isPending, setUser]);

    return <>{children}</>;
}