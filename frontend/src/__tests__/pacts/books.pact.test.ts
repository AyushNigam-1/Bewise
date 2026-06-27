import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { api } from "@/app/lib/api";
import {
    getAllBooks,
    findBooksByCategories,
    createBook,
    getBookInfoByTitle,
} from "@/app/services/bookService";
import { provider } from "./setup.pact";

const { eachLike, integer, string } = MatchersV3;

describe("Books API Contract Tests", () => {

    it("gets all books", async () => {
        provider
            .given("a request to get all books")
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
            api.defaults.baseURL = mockServer.url;
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
                status: 201,
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
});