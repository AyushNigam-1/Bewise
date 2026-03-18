<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Bookist (Bewise) Next.js App Router project. PostHog is initialized via `instrumentation-client.ts` for client-side tracking (Next.js 15.3+ pattern), a reverse proxy was configured in `next.config.ts`, a server-side PostHog client was created at `src/app/lib/posthog-server.ts`, and 13 events were instrumented across 7 files covering user authentication, content engagement, bookmarking, AI feature usage, and error tracking.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User creates a new account with email/password | `src/app/(auth)/signup/page.tsx` |
| `user_logged_in` | User logs in with email/password (includes identify) | `src/app/(auth)/login/page.tsx` |
| `social_login_clicked` | User clicked Google or GitHub login button | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx` |
| `user_logged_out` | User clicked logout in the navigation menu (includes reset) | `src/app/components/layout/Navbar.tsx` |
| `book_bookmarked` | User bookmarked or removed a book from favourites | `src/app/hooks/mutations/useBookmark.ts` |
| `insight_bookmarked` | User bookmarked or removed an insight from favourites | `src/app/hooks/mutations/useBookmark.ts` |
| `book_overview_viewed` | User views a book's overview page (top of funnel) | `src/app/(main)/overview/[title]/page.tsx` |
| `get_insights_clicked` | User clicks "Get Insights" to explore a book's insights | `src/app/(main)/overview/[title]/page.tsx` |
| `insight_read` | User opens and reads a specific insight | `src/app/(main)/insight/[title]/[category]/[stepId]/page.tsx` |
| `quiz_started` | User initiates a knowledge check quiz on an insight | `src/app/(main)/insight/[title]/[category]/[stepId]/page.tsx` |
| `quiz_completed` | User finishes a quiz (captures score, total, and percentage) | `src/app/components/modals/QuizModal.tsx` |
| `chatbot_message_sent` | User sends a message to the Wiser AI chatbot | `src/app/components/modals/ChatbotModal.tsx` |
| `insight_audio_played` | User plays or stops audio narration for an insight | `src/app/(main)/insight/[title]/[category]/[stepId]/page.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/339991/dashboard/1370012
- **Book Discovery to Insight Funnel**: https://us.posthog.com/project/339991/insights/MT8QZrXq
- **Daily Signups and Logins**: https://us.posthog.com/project/339991/insights/8mCwKwk5
- **Bookmark Engagement Trends**: https://us.posthog.com/project/339991/insights/nfG8jd9E
- **AI Feature Usage (Quizzes, Chatbot, Audio)**: https://us.posthog.com/project/339991/insights/vSAG0ChA

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
