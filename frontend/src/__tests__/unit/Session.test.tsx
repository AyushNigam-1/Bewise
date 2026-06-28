import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { auth } from "@/app/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- REUSABLE HELPER FUNCTION ---
function getAuthHeaders(response: any): Headers {
    const setCookie = response.headers.get("set-cookie");
    const cookieValue = setCookie?.match(/better-auth\.session_token=([^;]+)/)?.[1];
    if (!cookieValue) throw new Error("No session cookie found in response");

    return new Headers({
        cookie: `better-auth.session_token=${cookieValue}`,
    });
}

describe("Better Auth: Session TTL & Rotation Security (PostgreSQL)", () => {

    beforeAll(async () => { });

    afterAll(async () => {
        await pool.end();
    });

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date("2026-06-06T12:00:00Z"));
        await pool.query(`TRUNCATE TABLE "user" CASCADE;`);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should invalidate a session after 7-day TTL", async () => {
        const response = await auth.api.signUpEmail({
            body: { email: "ttl-test@bookist.ai", password: "SecurePassword123!", name: "Ayush" },
            asResponse: true,
        });

        const headers = getAuthHeaders(response);

        const sessionBefore = await auth.api.getSession({ headers, asResponse: false });
        expect(sessionBefore).not.toBeNull();

        // Fast forward 8 days
        vi.setSystemTime(new Date("2026-06-14T12:00:00Z"));

        const sessionAfter = await auth.api.getSession({ headers, asResponse: false });
        expect(sessionAfter).toBeNull();
    });

    it("should resolve a freshly created session to the correct user", async () => {
        const response = await auth.api.signUpEmail({
            body: { email: "fresh-test@bookist.ai", password: "SecurePassword123!", name: "Ayush" },
            asResponse: true,
        });

        const headers = getAuthHeaders(response);
        const activeSession = await auth.api.getSession({ headers, asResponse: false });

        expect(activeSession).not.toBeNull();
        expect(activeSession?.user.email).toBe("fresh-test@bookist.ai");
    });

    it("should correctly extend session expiry during rotation within the updateAge window", async () => {
        const response = await auth.api.signUpEmail({
            body: { email: "rotate-test@bookist.ai", password: "SecurePassword123!", name: "Ayush" },
            asResponse: true,
        });

        const headers = getAuthHeaders(response);

        const initialSession = await auth.api.getSession({ headers, asResponse: false });
        const initialExpiry = initialSession!.session.expiresAt.getTime();

        // Fast forward 2 days (crosses the 24h updateAge threshold)
        vi.setSystemTime(new Date("2026-06-08T12:00:00Z"));

        const rotatedSession = await auth.api.getSession({ headers, asResponse: false });
        const rotatedExpiry = rotatedSession!.session.expiresAt.getTime();

        expect(rotatedExpiry).toBeGreaterThan(initialExpiry);
    });

    it("should instantly invalidate MULTIPLE active sessions (devices) when a user deletes their account", async () => {
        // 1. SignUp (Simulates Device 1)
        const device1Response = await auth.api.signUpEmail({
            body: { email: "multi-device@bookist.ai", password: "SecurePassword123!", name: "Ayush" },
            asResponse: true,
        });
        const headersDevice1 = getAuthHeaders(device1Response);

        // 2. SignIn (Simulates Device 2)
        const device2Response = await auth.api.signInEmail({
            body: { email: "multi-device@bookist.ai", password: "SecurePassword123!" },
            asResponse: true,
        });
        const headersDevice2 = getAuthHeaders(device2Response);

        // 3. Verify BOTH sessions are active
        expect(await auth.api.getSession({ headers: headersDevice1, asResponse: false })).not.toBeNull();
        expect(await auth.api.getSession({ headers: headersDevice2, asResponse: false })).not.toBeNull();

        // 4. API DELETE: User deletes account from Device 1
        await auth.api.deleteUser({
            headers: headersDevice1,
            body: {},
            asResponse: false
        });

        // 5. Verify BOTH sessions are instantly rejected
        expect(await auth.api.getSession({ headers: headersDevice1, asResponse: false })).toBeNull();
        expect(await auth.api.getSession({ headers: headersDevice2, asResponse: false })).toBeNull();
    }, 15000);
});