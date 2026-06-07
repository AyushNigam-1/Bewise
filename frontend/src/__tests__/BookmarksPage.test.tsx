import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// 1. Import React Query providers
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import BookmarksPage from '@/app/(main)/bookmarks/page';
import {
    getBookmarkedInsights,
    getBookmarkedBooks,
    toggleFavouriteInsight
} from '@/app/services/userService';

vi.mock('@/app/services/userService');
vi.mock('@/app/stores/useUserStores', () => ({
    useUserStore: (selector: any) => selector({
        user: { id: 'user-123', name: 'Ayush', favourite_insights: [], favourite_books: [] }
    })
}));
// 2. Create a fresh QueryClient for the tests
// We turn off retries so tests fail instantly instead of waiting for 3 retries
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,       // ← kills the GC timer immediately
            staleTime: 0,    // ← good practice in tests too
        },
    },
});

describe('Bookmarks Page Component', () => {
    const user = userEvent.setup();
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createTestQueryClient();

        vi.mocked(getBookmarkedInsights).mockResolvedValue({
            insights: [
                { step_id: 'step-999', title: 'The Ultimate Productivity Hack', category: 'Productivity' }
            ],
            categories: [
                { name: 'Productivity', icon: '🚀', description: 'Get more done' }
            ]
        });

        vi.mocked(getBookmarkedBooks).mockResolvedValue({
            books: [
                { id: 99, title: 'Think Straight', author: 'Darius Foroux' }
            ],
            categories: [
                { name: 'Psychology', icon: '🧠', description: 'Dive into the human mind' }
            ]
        });
    });
    afterEach(() => {
        queryClient.clear();   // flush all queries
        // queryClient.unmount(); // cancel all subscriptions
    });
    it('should switch between Insights and Books tabs', async () => {
        // 3. Wrap your render in the Provider
        render(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        expect(await screen.findByText('The Ultimate Productivity Hack')).toBeInTheDocument();

        const booksTab = screen.getByRole('button', { name: /books/i });
        await user.click(booksTab);

        expect(await screen.findByAltText('Think Straight')).toBeInTheDocument();
        expect(screen.queryByText('The Ultimate Productivity Hack')).not.toBeInTheDocument();
    });

    it('should open the share modal and copy the link', async () => {
        const queryClient = createTestQueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        await screen.findByText('The Ultimate Productivity Hack');

        const shareBtn = screen.getByTestId('insight-share-btn');
        await user.click(shareBtn);

        expect(screen.getByText('Share Link')).toBeInTheDocument();

        const copyBtn = screen.getByTestId('copy-link-button');
        await user.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(screen.getByText('Link Copied!')).toBeInTheDocument();
    });

    it('should un-bookmark an insight and show the empty state', async () => {
        vi.mocked(toggleFavouriteInsight).mockResolvedValue({
            bookmarked: false,
            favourite_insights: []
        });

        const queryClient = createTestQueryClient();
        const { rerender } = render(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        expect(await screen.findByText('The Ultimate Productivity Hack')).toBeInTheDocument();

        const bookmarkBtn = screen.getByTestId('insight-bookmark-btn');
        await user.click(bookmarkBtn);

        expect(toggleFavouriteInsight).toHaveBeenCalled();

        vi.mocked(getBookmarkedInsights).mockResolvedValue({ insights: [], categories: [] });

        // 4. Make sure to wrap the rerender too!
        rerender(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        expect(screen.queryByText('The Ultimate Productivity Hack')).not.toBeInTheDocument();
        expect(await screen.findByText('No insights saved')).toBeInTheDocument();
    });
});