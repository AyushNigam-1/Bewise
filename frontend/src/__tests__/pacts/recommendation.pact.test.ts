import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { api } from "@/app/lib/api";
import {
    fetchSessionRecommendations,
} from "@/app/services/recommendationService";
import { provider } from "./setup.pact";

const { eachLike, string } = MatchersV3;

describe("User & Bookmarks API Frontend Contract", () => {

    it("generates the contract for fetching session recommendations", async () => {
        provider.given("a request for session recommendations")
            .uponReceiving("a request for session recommendations")
            .withRequest({
                method: "POST",
                path: "/insights/session-recommend",
                body: { insight_id: 42 }
            })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    recommendations: eachLike({
                        title: string("A related insight"),
                        category: string("productivity")
                    })
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await fetchSessionRecommendations("42");
            expect(res).toBeInstanceOf(Array);
        });
    });
});