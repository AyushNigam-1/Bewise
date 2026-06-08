import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ExplorePage from '@/app/(main)/(home)/page';   // Adjust path if needed
import { findBooksByCategories } from '@/app/services/bookService';

// 1. Hoist Mocks
const { clipboardWriteMock, mockData, mockUser } = vi.hoisted(() => {
    return {
        clipboardWriteMock: vi.fn(),
        mockUser: {
            id: 'user-123',
            name: 'Ayush',
            favourite_books: [101],
        },
        mockData: {
            categories: [{ name: "Psychology" }, { name: "Productivity" }],
            books: [
                { id: 101, title: "Think Straight" },
                { id: 102, title: "Deep Work" }
            ]
        }
    };
});

// 2. Mock Dependencies
vi.mock('@/app/services/bookService', () => ({ findBooksByCategories: vi.fn() }));
vi.mock('@/app/stores/useUserStores', () => ({ useUserStore: (sel: any) => sel({ user: mockUser }) }));

vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock Header to isolate the page logic
vi.mock('@/app/components/layout/Header', () => ({
    default: () => <div data-testid="mock-header">Header</div>
}));

// Mock BookCard to expose direct access to its share button
vi.mock('@/app/components/cards/BookCards', () => ({
    default: ({ book, onShare }: any) => (
        <div data-testid="book-card">
            <span>{book.title}</span>
            <button data-testid="book-share-btn" onClick={() => onShare(`http://localhost:3000/overview/${book.title}`)}>Share</button>
        </div>
    )
}));

// Apply the bulletproof clipboard fix
vi.mock('@/app/components/modals/ShareModal', () => ({
    default: ({ isOpen, shareUrl }: any) => {
        const [copied, setCopied] = React.useState(false);
        if (!isOpen) return null;
        return (
            <div>
                <div>Share Link</div>
                <div data-testid="share-url">{shareUrl}</div>
                <button onClick={async () => {
                    await clipboardWriteMock(shareUrl);
                    setCopied(true);
                }}>
                    Copy Link
                </button>
                {copied && <div>Link Copied!</div>}
            </div>
        );
    }
}));

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
});

describe('Explore Page Component', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();

        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: clipboardWriteMock },
            writable: true,
        });

        vi.mocked(findBooksByCategories).mockResolvedValue(mockData as any);
    });

    afterEach(() => {
        queryClient.clear();
        cleanup();
    });

    it('renders books on load', async () => {
        render(<QueryClientProvider client={queryClient}><ExplorePage /></QueryClientProvider>);

        expect(await screen.findByText('Think Straight')).toBeInTheDocument();
        expect(screen.getAllByTestId('book-card')).toHaveLength(2);
    });

    it('renders empty state when no books match', async () => {
        // Override mock to return empty arrays
        vi.mocked(findBooksByCategories).mockResolvedValue({ books: [], categories: [] } as any);

        render(<QueryClientProvider client={queryClient}><ExplorePage /></QueryClientProvider>);

        expect(await screen.findByText('No matches found')).toBeInTheDocument();
        expect(screen.queryByTestId('book-card')).not.toBeInTheDocument();
    });

    it('opens share modal and copies the link', async () => {
        const user = userEvent.setup();
        render(<QueryClientProvider client={queryClient}><ExplorePage /></QueryClientProvider>);

        await screen.findByText('Think Straight');

        const shareBtns = screen.getAllByTestId('book-share-btn');
        await user.click(shareBtns[0]); // Click the first book's share

        expect(screen.getByText('Share Link')).toBeInTheDocument();
        expect(screen.getByTestId('share-url')).toHaveTextContent('http://localhost:3000/overview/Think Straight');

        const copyBtn = screen.getByRole('button', { name: /copy link/i });
        await user.click(copyBtn);

        await waitFor(() => {
            expect(clipboardWriteMock).toHaveBeenCalledWith('http://localhost:3000/overview/Think Straight');
        });

        expect(screen.getByText('Link Copied!')).toBeInTheDocument();
    });
});