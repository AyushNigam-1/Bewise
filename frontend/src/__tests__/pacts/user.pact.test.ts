import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { api } from "@/app/lib/api";
import {
    toggleFavouriteBook,
    toggleFavouriteInsight,
    fetchSessionRecommendations,
    getBookmarkedBooks,
    getBookmarkedInsights
} from "@/app/services/userService";
import { provider } from "./setup.pact";

const { eachLike, integer, string, boolean } = MatchersV3;

describe("User & Bookmarks API Frontend Contract", () => {

    it("generates the contract for toggling a favourite book", async () => {
        provider
            .given("a request to toggle a book bookmark")
            .uponReceiving("a request to toggle a book bookmark")
            .withRequest({ method: "POST", path: "/bookmark/book/1" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    favourite_books: eachLike(1)
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await toggleFavouriteBook(1);
            expect(res).toBeInstanceOf(Array);
        });
    });

    it("generates the contract for toggling a favourite insight", async () => {
        provider.given("a request to toggle an insight bookmark")
            .uponReceiving("a request to toggle an insight bookmark")
            .withRequest({ method: "POST", path: "/bookmark/insight/42" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    bookmarked: boolean(true),
                    favourite_insights: eachLike(42)
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await toggleFavouriteInsight(42);
            expect(res).toBeDefined();
        });
    });

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

    it("generates the contract for getting bookmarked books", async () => {
        provider.given("a request to get all bookmarked books").uponReceiving("a request to get all bookmarked books")
            .withRequest({ method: "GET", path: "/bookmarks/books" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    books: eachLike({
                        id: integer(1),
                        title: string("Atomic Habits"),
                        author: string("James Clear"),
                        thumbnail: string("url.png"),
                        description: string("A book about habits"),
                        category: eachLike("productivity")
                    }),
                    categories: eachLike({
                        name: string("productivity"),
                        icon: string("📌"),
                        description: string("Explore insights from this category.")
                    })
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await getBookmarkedBooks();
            expect(res.books).toBeInstanceOf(Array);
            expect(res.categories).toBeInstanceOf(Array);
        });
    });

    it("generates the contract for getting bookmarked insights", async () => {
        provider.given("a request to get all bookmarked insights").uponReceiving("a request to get all bookmarked insights")
            .withRequest({ method: "GET", path: "/bookmarks/insights" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    insights: eachLike({
                        // insight_id: integer(42),
                        title: string("Keep functions small")
                    }),
                    categories: eachLike({
                        name: string("python"),
                        icon: string("🐍"),
                        description: string("Python")
                    })
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await getBookmarkedInsights();
            expect(res.insights).toBeInstanceOf(Array);
            expect(res.categories).toBeInstanceOf(Array);
        });
    });
});