import { MatchersV3 } from "@pact-foundation/pact";
import { describe, it, expect } from "vitest";
import { api } from "@/app/lib/api";
import { provider } from "./setup.pact";
import { invokeChatbot, generateQuizFromText, generateVoice } from "@/app/services/aiService";
const { eachLike, string, like } = MatchersV3;

describe("AI RAG & Generation API Contract Tests", () => {

    it("generates the contract for invoking the RAG chatbot", async () => {
        provider.given("a request to invoke the RAG chatbot")
            .uponReceiving("a request to invoke the RAG chatbot")
            .withRequest({
                method: "POST",
                path: "/ai/rag/invoke",
                body: {
                    input: { message: string("What is Python?") }
                }
            })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    output: {
                        answer: string("Python is a programming language."),
                        insights: like({})// Expecting a dictionary of books/insights
                    }
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await invokeChatbot({ payload: { message: "What is Python?" } });
            expect(res.answer).toBeDefined();
        });
    });

    it("generates the contract for generating a quiz", async () => {
        provider.given("a request to generate a quiz")
            .uponReceiving("a request to generate a quiz")
            .withRequest({
                method: "POST",
                path: "/ai/quiz/invoke",
                body: {
                    input: { source_text: string("Python is a programming language created by Guido van Rossum.") }
                }
            })
            .willRespondWith({
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                    output: {
                        quiz: eachLike({
                            question: string("Who created Python?"),
                            options: eachLike("Guido van Rossum"),
                            correct_answer: string("Guido van Rossum"),
                            explanation: string("He created it in 1991.")
                        })
                    }
                },
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await generateQuizFromText("Python is a programming language created by Guido van Rossum.");
            expect(res).toBeInstanceOf(Array);
            expect(res[0]).toHaveProperty("question");
        });
    });

    it("generates the contract for generating voice audio", async () => {
        provider.given("a request to generate voice audio")
            .uponReceiving("a request to generate voice audio")
            .withRequest({
                method: "POST",
                path: "/generate-voice",
                body: {
                    text: string("Hello world"),
                    voice: string("troy")
                }
            })
            .willRespondWith({
                status: 200,
                // 🚨 CRITICAL: We only test headers and status for Blob data!
                headers: { "Content-Type": "audio/wav" }
            });

        await provider.executeTest(async (mockServer) => {
            api.defaults.baseURL = mockServer.url;
            const res = await generateVoice("Hello world");
            expect(res).toBeInstanceOf(Blob); // Axios returns Blob based on responseType: "blob"
        });
    });
});