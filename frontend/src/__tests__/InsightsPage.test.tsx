import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import InsightsPage from '@/app/(main)/insights/[title]/page';
import { getBookContent } from '@/app/services/bookService';
import { useBookmarkInsight } from '@/app/hooks/mutations/useBookmark';

// 1. Hoist Mocks
const { clipboardWriteMock, mockData, bookmarkMutateMock, mockUser } = vi.hoisted(() => {
    return {
        clipboardWriteMock: vi.fn(),
        bookmarkMutateMock: vi.fn(),
        mockUser: {
            id: 'user-123',
            name: 'Ayush',
            favourite_insights: [],
        },
        mockData: {
            keys: [{ name: "Psychology" }, { name: "Productivity" }],
            values: [
                { step_id: 'step-1', step: "A deep psychological insight." },
                { step_id: 'step-2', step: "A highly productive workflow tip." }
            ]
        }
    };
});

// 2. Mock Dependencies
vi.mock('@/app/services/bookService', () => ({ getBookContent: vi.fn() }));
vi.mock('@/app/stores/useUserStores', () => ({ useUserStore: (sel: any) => sel({ user: mockUser }) }));
vi.mock('@/app/hooks/mutations/useBookmark', () => ({ useBookmarkInsight: () => ({ mutate: bookmarkMutateMock }) }));
vi.mock('next/navigation', () => ({ useParams: () => ({ title: 'Think Straight' }) }));

vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock Header to avoid complex DOM rendering issues in Vitest
vi.mock('@/app/components/layout/Header', () => ({
    default: () => <div data-testid="mock-header">Header</div>
}));

// Mock InsightCard to expose direct access to its action buttons
vi.mock('@/app/components/cards/InsightsCard', () => ({
    InsightCard: ({ step, onBookmark, onShare }: any) => (
        <div data-testid="insight-card">
            <span>{step.step}</span>
            <button data-testid="insight-bookmark-btn" onClick={() => onBookmark(step.step_id)}>Bookmark</button>
            <button data-testid="insight-share-btn" onClick={() => onShare(`http://localhost:3000/share/${step.step_id}`)}>Share</button>
        </div>
    )
}));

// Apply the bulletproof clipboard fix we built earlier
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

describe('Insights Page Component', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();

        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: clipboardWriteMock },
            writable: true,
        });

        vi.mocked(getBookContent).mockResolvedValue(mockData as any);
    });

    afterEach(() => {
        queryClient.clear();
        cleanup();
    });

    it('renders insights on load', async () => {
        render(<QueryClientProvider client={queryClient}><InsightsPage /></QueryClientProvider>);

        expect(await screen.findByText('A deep psychological insight.')).toBeInTheDocument();
        expect(screen.getAllByTestId('insight-card')).toHaveLength(2);
    });

    it('calls bookmark mutation when bookmark button is clicked', async () => {
        const user = userEvent.setup();
        render(<QueryClientProvider client={queryClient}><InsightsPage /></QueryClientProvider>);

        await screen.findByText('A deep psychological insight.');

        const bookmarkBtns = screen.getAllByTestId('insight-bookmark-btn');
        await user.click(bookmarkBtns[0]); // Click the first card's bookmark

        expect(bookmarkMutateMock).toHaveBeenCalledWith('step-1');
    });

    it('opens share modal and copies the link', async () => {
        const user = userEvent.setup();
        render(<QueryClientProvider client={queryClient}><InsightsPage /></QueryClientProvider>);

        await screen.findByText('A deep psychological insight.');

        const shareBtns = screen.getAllByTestId('insight-share-btn');
        await user.click(shareBtns[0]); // Click the first card's share

        expect(screen.getByText('Share Link')).toBeInTheDocument();
        expect(screen.getByTestId('share-url')).toHaveTextContent('http://localhost:3000/share/step-1');

        const copyBtn = screen.getByRole('button', { name: /copy link/i });
        await user.click(copyBtn);

        await waitFor(() => {
            expect(clipboardWriteMock).toHaveBeenCalledWith('http://localhost:3000/share/step-1');
        });

        expect(screen.getByText('Link Copied!')).toBeInTheDocument();
    });
});