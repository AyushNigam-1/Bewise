"use client";
import { useEffect } from "react";
import { useUserStore } from "@/app/stores/useUserStores";
import { useSession } from "@/app/lib/auth-client";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = useSession();
    const setUser = useUserStore((state) => state.setUser);

    useEffect(() => {
        if (session?.user) {
            setUser({
                ...session.user,
                favourite_books: session.user.favourite_books || [],
                favourite_insights: session.user.favourite_insights || []
            } as any);
        } else if (!isPending) {
            setUser(null);
        }
    }, [session, isPending, setUser]);

    return <>{children} </>;
}