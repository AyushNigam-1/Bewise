import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { api } from "@/app/lib/api";
import {
    getBookmarkedBooks,
    getBookmarkedInsights,
    toggleBookmarkBook,
    toggleBookmarkInsight,
} from "@/app/services/bookmarkServices";
import { provider } from "./setup.pact";

const { boolean, integer, eachLike, string } = MatchersV3;

describe("Bookmarks API Contract Tests", () => {

    it("toggles a book bookmark", async () => {
        provider
            .given("a request to toggle a book bookmark")
            .uponReceiving("a request to toggle a book bookmark")
            .withRequest({ method: "POST", path: "/bookmark/book/1" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    bookmarked: boolean(true),
                    favourite_books: eachLike(integer(1)),
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await toggleBookmarkBook(1);
            expect(typeof res.bookmarked).toBe("boolean");
        });
    });

    it("toggles an insight bookmark", async () => {
        provider
            .given("a request to toggle an insight bookmark")
            .uponReceiving("a request to toggle an insight bookmark")
            .withRequest({ method: "POST", path: "/bookmark/insight/42" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    bookmarked: boolean(false),
                    favourite_insights: eachLike(integer(42)),
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await toggleBookmarkInsight(42);
            expect(typeof res.bookmarked).toBe("boolean");
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