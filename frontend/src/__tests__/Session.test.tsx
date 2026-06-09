import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { auth } from "@/app/lib/auth"; // Adjust this path to wherever your auth.ts lives
import { Pool } from "pg";

// 1. Create a dedicated connection pool just for the test environment
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

describe("Better Auth: Session TTL Security (PostgreSQL)", () => {

    beforeAll(async () => {
        // Optional: Run any global DB migrations or setup here if needed
    });

    afterAll(async () => {
        // 🚨 CRITICAL: Close the pool after all tests finish!
        // Otherwise, the pg driver holds the Node process open and Vitest will hang forever.
        await pool.end();
    });

    beforeEach(async () => {
        // Tell Vitest to strictly ONLY fake the Date object. 
        // If you fake all timers, the pg driver's network timeouts will freeze and break the DB connection.
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date("2026-06-06T12:00:00Z"));

        // 2. Raw SQL cleanup instead of MongoDB deleteMany
        // Using CASCADE ensures any related rows in 'session' or 'account' are wiped if foreign keys exist
        await pool.query(`TRUNCATE TABLE "user" CASCADE;`);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should invalidate a session after 7-day TTL", async () => {
        // 3. Create the test user
        const response = await auth.api.signUpEmail({
            body: {
                email: "ttl-test@bookist.ai",
                password: "SecurePassword123!",
                name: "Ayush",
            },
            asResponse: true, // ← Required to extract the raw HTTP headers
        });

        // 4. Extract the signed cookie value exactly as better-auth generated it
        const setCookie = response.headers.get("set-cookie");
        const cookieValue = setCookie?.match(/better-auth\.session_token=([^;]+)/)?.[1];

        expect(cookieValue).toBeDefined();

        // 5. Construct the mock request headers
        const headers = new Headers({
            cookie: `better-auth.session_token=${cookieValue}`,
        });

        // 6. Verify the session is initially active
        const sessionBefore = await auth.api.getSession({
            headers,
            asResponse: false,
        });

        expect(sessionBefore).not.toBeNull();

        // 7. Fast forward 8 days into the future (past the default 7-day TTL)
        vi.setSystemTime(new Date("2026-06-14T12:00:00Z"));

        // 8. Attempt to fetch the session again
        const sessionAfter = await auth.api.getSession({
            headers,
            asResponse: false,
        });

        // 9. The backend should recognize the expiration and reject it
        expect(sessionAfter).toBeNull();
    });
});