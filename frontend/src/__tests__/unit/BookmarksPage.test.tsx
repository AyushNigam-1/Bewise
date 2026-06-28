import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import BookmarksPage from '@/app/(main)/bookmarks/page';
import { getBookmarkedInsights } from '@/app/services/bookmarkServices';

const {
    bookmarkMutateMock,
    clipboardWriteMock,
    mockUser,
    mockInsightsResponse,
} = vi.hoisted(() => {
    const bookmarkMutateMock = vi.fn();
    const clipboardWriteMock = vi.fn();

    const mockUser = {
        id: 'user-123',
        name: 'Ayush',
        favourite_insights: ['step-999'],
        favourite_books: [],
    };

    const mockInsightsResponse = {
        insights: [
            {
                step_id: 'step-999',
                title: 'The Ultimate Productivity Hack',
                category: 'Productivity',
                book_name: 'Deep Work',
            },
        ],
        categories: [
            {
                name: 'Productivity',
                icon: '🚀',
                description: 'Get more done',
            },
        ],
    };

    return {
        bookmarkMutateMock,
        clipboardWriteMock,
        mockUser,
        mockInsightsResponse,
    };
});

vi.mock('@/app/stores/useUserStores', () => ({
    useUserStore: (selector: any) => selector({ user: mockUser }),
}));

vi.mock('@/app/services/bookmarkServices', () => ({
    getBookmarkedInsights: vi.fn(),
}));

vi.mock('@/app/hooks/mutations/useBookmark', () => ({
    useBookmarkInsight: () => ({
        mutate: bookmarkMutateMock,
    }),
}));

vi.mock('@/app/layout/Header', () => ({
    default: () => <div data-testid="header" />,
}));

vi.mock('@/app/components/modals/ShareModal', () => ({
    default: ({ isOpen, shareUrl }: { isOpen: boolean; shareUrl: string }) => {
        const [copied, setCopied] = React.useState(false);

        if (!isOpen) return null;

        return (
            <div>
                <div>Share Link</div>
                <div data-testid="share-url">{shareUrl}</div>
                <button
                    type="button"
                    onClick={async () => {
                        // CHANGE: Call the hoisted mock directly instead of using the flaky navigator reference
                        await clipboardWriteMock(shareUrl);
                        setCopied(true);
                    }}
                >
                    Copy Link
                </button>
                {copied && <div>Link Copied!</div>}
            </div>
        );
    },
}));

vi.mock('@/app/(main)/cards/InsightsCard', () => ({
    InsightCard: ({
        step,
        onBookmark,
        onShare,
    }: {
        step: { step_id: string; title: string };
        onBookmark: (id: string) => void;
        onShare: (url: string) => void;
    }) => (
        <div>
            <div>{step.title}</div>

            <button
                type="button"
                data-testid="insight-bookmark-btn"
                onClick={() => onBookmark(step.step_id)}
            >
                Bookmark
            </button>

            <button
                type="button"
                data-testid="insight-share-btn"
                onClick={() => onShare(step.step_id)}
            >
                Share
            </button>
        </div>
    ),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 0,
                gcTime: 0,
                refetchOnMount: false,
                refetchOnWindowFocus: false,
            },
        },
    });

describe('Bookmarks page', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();

        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: clipboardWriteMock,
            },
            writable: true,
        });

        vi.mocked(getBookmarkedInsights).mockResolvedValue(mockInsightsResponse as any);
    });

    afterEach(() => {
        queryClient.clear();
        cleanup();
    });

    it('renders bookmarked insights', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        expect(
            await screen.findByText('The Ultimate Productivity Hack')
        ).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: /bookmarks/i })).toBeInTheDocument();
    });

    it('opens share modal and copies the link', async () => {
        const user = userEvent.setup();

        render(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        expect(
            await screen.findByText('The Ultimate Productivity Hack')
        ).toBeInTheDocument();

        await user.click(screen.getByTestId('insight-share-btn'));

        // Define the exact URL your component is generating
        const expectedUrl = 'http://localhost:3000/insight/The Ultimate Productivity Hack/Productivity/step-999';

        expect(screen.getByText('Share Link')).toBeInTheDocument();

        // CHANGE: Assert the real URL
        expect(screen.getByTestId('share-url')).toHaveTextContent(expectedUrl);

        await user.click(screen.getByRole('button', { name: /copy link/i }));

        await waitFor(() => {
            // CHANGE: Assert the clipboard copied the real URL
            expect(clipboardWriteMock).toHaveBeenCalledWith(expectedUrl);
        });

        expect(screen.getByText('Link Copied!')).toBeInTheDocument();
    });

    it('calls bookmark mutation when bookmark is clicked', async () => {
        const user = userEvent.setup();

        render(
            <QueryClientProvider client={queryClient}>
                <BookmarksPage />
            </QueryClientProvider>
        );

        expect(
            await screen.findByText('The Ultimate Productivity Hack')
        ).toBeInTheDocument();

        await user.click(screen.getByTestId('insight-bookmark-btn'));

        expect(bookmarkMutateMock).toHaveBeenCalledWith('step-999');
    });
});