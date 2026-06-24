import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect, beforeAll } from "vitest";
import { api } from "@/app/lib/api";
import {
    getAllBooks,
    findBooksByCategories,
    getBookContent,
    getStepDetails,
    createBook,
    getBookInfoByTitle,
    toggleBookmarkBook,
    toggleBookmarkInsight,
} from "@/app/services/bookService"
import { provider } from "./setup.pact";
const { eachLike, boolean, integer, string } = MatchersV3;

describe("Books API Contract Tests", () => {
    // CRITICAL: Point Axios to the Pact Mock Server
    beforeAll(() => {
        // We will set this inside each test block using mockServer.url
    });

    it("gets all books", async () => {
        provider
            .uponReceiving("a request to get all books")
            .withRequest({ method: "GET", path: "/books" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: eachLike({
                    id: integer(1),
                    title: string("Atomic Habits"),
                    author: string("James Clear"),
                    thumbnail: string("url.png"),
                    description: string("A book about habits"),
                    category: eachLike("productivity"),
                }),
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url; // Point to mock server
            const books = await getAllBooks();
            expect(books).toBeInstanceOf(Array);
            expect(books[0]).toHaveProperty("title");
        });
    });

    it("finds books by categories", async () => {
        provider
            .given("a request to find books by categories")
            .uponReceiving("a request to find books by categories")
            .withRequest({
                method: "POST",
                path: "/books/find-by-categories",
                body: ["python", "ai"],
            })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    books: eachLike({ id: integer(1), title: string("Python 101") }),
                    categories: eachLike({ name: string("python"), icon: string("🐍") }),
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await findBooksByCategories(["python", "ai"]);
            expect(res.books).toBeDefined();
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

    it("creates a new book", async () => {
        const payload = {
            Title: "New Book",
            Author: "Me",
            Description: "Testing",
            Thumbnail: "img.png",
            Content: {},
            Category: ["python"],
        };

        provider
            .given("a request to create a book")
            .uponReceiving("a request to create a book")
            .withRequest({ method: "POST", path: "/books/", body: payload })
            .willRespondWith({
                status: 201, // Assuming 201 Created based on your backend refactor
                headers: { "Content-Type": "application/json" },
                body: { message: string("Book and associated steps created successfully") },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await createBook(payload);
            expect(res.message).toBeDefined();
        });
    });

    it("gets book info by title", async () => {
        provider
            .given("a request for book info")
            .uponReceiving("a request for book info")
            .withRequest({ method: "GET", path: "/book/Atomic%20Habits/info" })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    title: string("Atomic Habits"),
                    sub_categories_count: integer(3),
                    total_insights: integer(15),
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const info = await getBookInfoByTitle("Atomic Habits");
            expect(info.total_insights).toBeDefined();
        });
    });

    it("toggles a book bookmark", async () => {
        provider
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

    // Note on processBook:
    // We skip 'processBook' here because Multipart/Form-Data boundaries are 
    // randomly generated by Axios/Fetch on every request. Testing file uploads 
    // with Pact requires complex Regex header matchers that cause more flakes 
    // than they solve. Stick to standard JSON contracts!
});