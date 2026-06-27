import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { api } from "@/app/lib/api";
import { getStepDetails, getBookContent } from "@/app/services/insightService";
import { provider } from "./setup.pact";
import { getBookmarkedBooks, getBookmarkedInsights } from "@/app/services/bookmarkServices";

const { integer, string, eachLike } = MatchersV3;

describe("Insights API Contract Tests", () => {

    it("gets specific step details", async () => {
        provider
            .given("a request for step details")
            .uponReceiving("a request for step details")
            .withRequest({ method: "GET", path: "/insights/42" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    step_id: integer(42),
                    book_name: string("Clean Code"),
                    title: string("Keep functions small"),
                    detailed_breakdown: string("..."),
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const step = await getStepDetails("42");
            expect(step.step_id).toBe(42);
        });
    });

    it("gets book content by title", async () => {
        provider
            .given("a request for book content")
            .uponReceiving("a request for book content")
            .withRequest({
                method: "POST",
                path: "/book/Atomic%20Habits/content",
                body: ["python"],
            })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    keys: eachLike({ name: string("python"), steps_count: string("5") }),
                    values: eachLike({ step_id: integer(1), step: string("Step 1") }),
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await getBookContent("Atomic Habits", ["python"]);
            expect(res.keys).toBeInstanceOf(Array);
        });
    });
});