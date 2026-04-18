# Bewise 🧠

An intelligent, full-stack continuous learning platform designed to extract, categorize, and interact with deep insights from non-fiction books. Powered by an advanced RAG architecture and a LangGraph data pipeline.

## ✨ Key Features

### 📚 Explore & Discover
* **Explore Page:** Browse a comprehensive library of books with dynamic category filtering.
* **Book Overviews:** Detailed pages for each book featuring quick summaries, author details, bookmarking, and seamless sharing capabilities.
* **Insight Pages:** Dive into specific actionable steps and insights extracted from books. Filter by category, read aloud via Text-to-Speech, or bookmark for later.

### 🤖 Advanced AI & RAG Capabilities
* **Context-Aware Chatbot:** Ask questions and get answers directly grounded in the context of a specific book or a singular insight. Powered by **Pinecone RAG**, a custom reranker, and Redis caching.
* **Vector Recommendations:** A custom recommendation engine suggests highly relevant insights based on semantic similarity to what you are currently reading.
* **AI Quiz Maker:** Generate active-recall quizzes dynamically based on the specific insight you are studying to reinforce learning.
* **Insight Summarization:** Ask the AI to summarize complex insights on the fly.

### ⚙️ Automated Data Pipeline
* **LangGraph Processing:** A sophisticated backend pipeline that automatically ingests book content, extracts actionable steps, removes duplicates globally across the text, and categorizes them using LLMs.
* **Async Background Jobs:** Powered by **Redis Queue (RQ)** to handle long-running AI extraction tasks seamlessly without connection timeouts.
* **Public Testing Access:** I have deliberately left the admin upload route completely open and unauthenticated so that anyone can easily jump in and test the AI processing pipeline firsthand.
  
> **⚠️ Important Note for Testing:** To manage API token limits, the pipeline is currently hardcoded to process a maximum of **24 pages** per upload. Because of this, you may only see a few insights generated per book. For the best results, please **remove the introductory/index pages** from your PDF before uploading so the AI spends its 24-page limit extracting insights from the core content! (You can use a free tool like [iLovePDF](https://www.ilovepdf.com/remove-pages) to quickly strip out unwanted pages).

✨ [**Try the processing pipeline yourself here**](https://usebewise.vercel.app/admin)

### ⚡ Premium User Experience
* **Optimistic UI Updates:** Instant, fluid UI reactions for bookmarking and state changes using React Query.
* **Dark Mode Support:** Seamless light/dark theme switching powered by `next-themes`.
* **Beautiful Toasts:** Sleek, accessible, and interactive notifications powered by `Sonner`.
* **Robust Authentication:** Secure sessions powered by Better Auth, featuring JWT token refreshing, credential login, and Google/GitHub OAuth.

---

## 🛠 Tech Stack

**Frontend**
* React / Next.js
* Zustand (Global State Management)
* TanStack React Query (Data Fetching & Optimistic Updates)
* React Hook Form + Zod (Type-safe form validation)
* Framer Motion (Fluid animations and layout transitions)
* next-themes (Dark Mode)
* Sonner (Toast Notifications)

**Backend & Database**
* PostgreSQL (hosted on Supabase)
* SQLModel (ORM)
* Upstash Redis (Rate limiting and caching)
* Redis Queue / RQ (Async background task processing)
* Custom Edge Middleware

**AI & Data Engineering**
* LangGraph & LangServe (Agentic workflows, data processing pipelines, and API deployment)
* Pinecone (Vector Database)
* LangSmith (LLM Tracing & Observability)
* Reranker

**Infrastructure & DevOps**
* Docker (Containerization)
* Sentry (Real-time error tracking and performance monitoring)
* PostHog (Product analytics and event tracking)