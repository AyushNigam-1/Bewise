'use client';

import React, { createContext, useContext, useEffect, ReactNode, Suspense } from 'react';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { authClient } from "@/app/lib/auth-client";

// 1. Initialize PostHog safely on the client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: false, // Turned off here because we handle it manually below for SPAs
        capture_pageleave: true,
    });
}

interface TelemetryContextType {
    trackEvent: (name: string, properties?: Record<string, any>) => void;
    captureError: (error: any, contextName: string, extraData?: Record<string, any>) => void;
}

const TelemetryContext = createContext<TelemetryContextType | null>(null);

// 2. Clear pageview tracker component to handle Next.js client-side routing
function PostHogPageView() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (pathname && posthog) {
            let url = window.origin + pathname;
            if (searchParams.toString()) {
                url = url + `?${searchParams.toString()}`;
            }
            posthog.capture('$pageview', { $current_url: url });
        }
    }, [pathname, searchParams]);

    return null;
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
    const telemetry: TelemetryContextType = {
        // Reusable event tracker
        trackEvent: (name, properties) => {
            posthog.capture(name, properties);
        },
        // Reusable function-level error catcher!
        captureError: (error, contextName, extraData) => {
            console.error(`[Telemetry Error - ${contextName}]:`, error);

            Sentry.captureException(error, {
                tags: { context: contextName },
                extra: extraData,
            });
        }
    };

    // 3. GLOBAL IDENTITY STITCHING 
    // Get the global auth state from Better Auth
    const { data: session } = authClient.useSession();

    // Automatically sync the user identity across Sentry and PostHog
    useEffect(() => {
        if (session?.user) {
            // User is logged in! Identify them.
            posthog.identify(session.user.id, {
                email: session.user.email,
                name: session.user.name,
            });

            Sentry.setUser({
                id: session.user.id,
                email: session.user.email,
            });
        } else if (session === null) {
            // User is explicitly logged out. Clear telemetry data.
            // Note: We check === null to ensure it actually finished loading the "no user" state
            posthog.reset();
            Sentry.setUser(null);
        }
    }, [session?.user]); // Re-run whenever the user object changes

    return (
        <PostHogProvider client={posthog}>
            <TelemetryContext.Provider value={telemetry}>
                {/* Next.js requires searchParams hooks to be wrapped in Suspense */}
                <Suspense fallback={null}>
                    <PostHogPageView />
                </Suspense>
                {children}
            </TelemetryContext.Provider>
        </PostHogProvider>
    );
}

export function useTelemetry() {
    const context = useContext(TelemetryContext);
    if (!context) {
        throw new Error('useTelemetry must be used within a TelemetryProvider');
    }
    return context;
}