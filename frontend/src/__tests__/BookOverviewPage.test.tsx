import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import OverviewPage from '@/app/(main)/overview/[title]/page';
import { getBookInfoByTitle } from '@/app/services/bookService';
import { useBookmarkBook } from '@/app/hooks/mutations/useBookmark';

// 1. Hoist our mocks so Vitest resolves them before importing the component
const { clipboardWriteMock, mockBook, bookmarkMutateMock, mockUser } = vi.hoisted(() => {
    return {
        clipboardWriteMock: vi.fn(),
        bookmarkMutateMock: vi.fn(),
        mockUser: {
            id: 'user-123',
            name: 'Ayush',
            favourite_books: [],
            favourite_insights: [],
        },
        mockBook: {
            id: 101,
            title: 'Think Straight',
            author: 'Darius Foroux',
            thumbnail: 'https://via.placeholder.com/150',
            categories: 'Psychology, Productivity',
            sub_categories_count: 5,
            total_insights: 10,
            description: 'A great book about thinking clearly.',
        }
    };
});

// 2. Mock all dependencies
vi.mock('@/app/services/bookService', () => ({
    getBookInfoByTitle: vi.fn(),
}));

vi.mock('@/app/stores/useUserStores', () => ({
    useUserStore: (selector: any) => selector({ user: mockUser }),
}));

vi.mock('@/app/hooks/mutations/useBookmark', () => ({
    useBookmarkBook: () => ({
        mutate: bookmarkMutateMock,
    }),
}));

vi.mock('next/navigation', () => ({
    useParams: () => ({ title: 'Think Straight' }),
}));

// We mock PostHog to prevent it from trying to send real analytics during tests
vi.mock('posthog-js', () => ({
    default: { capture: vi.fn() }
}));

// Mock framer-motion to render children directly without animations
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
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

// 3. Create a clean QueryClient for tests
const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: 0, gcTime: 0 },
        },
    });

describe('Overview Component', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();

        // Inject our global clipboard mock
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: clipboardWriteMock },
            writable: true,
        });

        // Set the default response for our book data fetch
        vi.mocked(getBookInfoByTitle).mockResolvedValue(mockBook as any);
    });

    afterEach(() => {
        queryClient.clear();
        cleanup();
    });

    it('should display the correct book details on load', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <OverviewPage />
            </QueryClientProvider>
        );

        // Wait for React Query to resolve and the UI to mount
        expect(await screen.findByTestId('overview-title')).toHaveTextContent('Think Straight');
        expect(screen.getByTestId('overview-description')).toHaveTextContent('A great book about thinking clearly.');
        expect(screen.getByText(/Darius Foroux/i)).toBeInTheDocument();

        // Assert the Link component is ready
        expect(screen.getByTestId('get-insights-btn')).toBeInTheDocument();
    });

    it('should trigger the bookmark mutation when clicked', async () => {
        const user = userEvent.setup();
        render(
            <QueryClientProvider client={queryClient}>
                <OverviewPage />
            </QueryClientProvider>
        );

        await screen.findByTestId('overview-title'); // Wait for render

        const bookmarkBtn = screen.getByTestId('overview-bookmark-btn');
        await user.click(bookmarkBtn);

        // Assert the mutation was called with the correct book ID
        expect(bookmarkMutateMock).toHaveBeenCalledWith(101);
    });

    it('should open the share modal and copy the link', async () => {
        const user = userEvent.setup();
        render(
            <QueryClientProvider client={queryClient}>
                <OverviewPage />
            </QueryClientProvider>
        );

        await screen.findByTestId('overview-title'); // Wait for render

        // Open modal
        const shareBtn = screen.getByTestId('overview-share-btn');
        await user.click(shareBtn);

        expect(screen.getByText('Share Link')).toBeInTheDocument();

        // Check copy functionality
        const copyBtn = screen.getByRole('button', { name: /copy link/i });
        await user.click(copyBtn);

        await waitFor(() => {
            expect(clipboardWriteMock).toHaveBeenCalledWith('http://localhost:3000/overview/Think Straight');
        });

        expect(screen.getByText('Link Copied!')).toBeInTheDocument();
    });
});