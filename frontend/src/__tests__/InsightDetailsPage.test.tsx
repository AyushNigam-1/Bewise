import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import InsightDetailsPage from '@/app/(main)/insight/[title]/[category]/[stepId]/page'; // Adjust path if needed
import { getStepDetails } from '@/app/services/insightService';
import { fetchSessionRecommendations } from '@/app/services/recommendationService';
import { generateVoice } from '@/app/services/aiService';


const { clipboardWriteMock, audioPlayMock, bookmarkMutateMock, mockUser, mockInsight } = vi.hoisted(() => ({
    clipboardWriteMock: vi.fn(),
    audioPlayMock: vi.fn(),
    bookmarkMutateMock: vi.fn(),
    mockUser: {
        id: 'user-123',
        name: 'Ayush',
        favourite_insights: [], // Empty so bookmark is unchecked
    },
    mockInsight: {
        step_id: "step-123",
        title: "The Power of Habit",
        category: "Psychology",
        description: "This is a mocked description for testing.",
        detailed_breakdown: "Here is the **detailed** breakdown.",
    }
}));

// 3. Mock Dependencies
vi.mock('@/app/services/insightService', () => ({ getStepDetails: vi.fn() }));
vi.mock('@/app/services/recommendationService', () => ({ fetchSessionRecommendations: vi.fn() }));
vi.mock('@/app/services/aiService', () => ({ generateVoice: vi.fn() }));
vi.mock('@/app/stores/useUserStores', () => ({ useUserStore: (sel: any) => sel({ user: mockUser }) }));
vi.mock('@/app/hooks/mutations/useBookmark', () => ({ useBookmarkInsight: () => ({ mutate: bookmarkMutateMock }) }));
vi.mock('next/navigation', () => ({ useParams: () => ({ title: 'Think Straight', stepId: 'step-123' }) }));

vi.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: new Proxy({}, {
            get: (_, element) => {
                return ({ layout, layoutId, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) => {
                    return React.createElement(element as string, props);
                };
            }
        }),
        AnimatePresence: ({ children }: any) => <>{children}</>
    };
});

// Apply the bulletproof clipboard fix for the Share Modal
vi.mock('@/app/components/modals/ShareModal', () => ({
    default: ({ isOpen, shareUrl }: any) => {
        const [copied, setCopied] = React.useState(false);
        if (!isOpen) return null;
        return (
            <div>
                <div>Share Link</div>
                <div data-testid="share-url">{shareUrl}</div>
                <button data-testid="copy-link-button" onClick={async () => {
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

// Mock the Quiz Modal so it doesn't try to render complex logic in these specific tests
vi.mock('@/app/components/modals/QuizModal', () => ({
    default: () => <div data-testid="mock-quiz-modal">Quiz</div>
}));

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('Insight Details Page Actions', () => {
    let queryClient: QueryClient;
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createTestQueryClient();
        user = userEvent.setup();

        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: clipboardWriteMock },
            writable: true,
        });

        global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');

        // Use the exact class fix we built for the chatbot audio!
        global.Audio = class {
            play = audioPlayMock;
            pause = vi.fn();
            onended = vi.fn();
        } as any;

        vi.mocked(getStepDetails).mockResolvedValue(mockInsight as any);
        vi.mocked(fetchSessionRecommendations).mockResolvedValue([] as any);
    });

    afterEach(() => {
        queryClient.clear();
        cleanup();
    });

    it('should trigger the bookmark API when the bookmark button is clicked', async () => {
        render(<QueryClientProvider client={queryClient}><InsightDetailsPage /></QueryClientProvider>);

        await screen.findByText('The Power of Habit');

        const bookmarkBtn = screen.getByTitle('Bookmark insight');
        await user.click(bookmarkBtn);

        expect(bookmarkMutateMock).toHaveBeenCalledWith('step-123');
    });

    it('should open the share modal and copy the link to the clipboard', async () => {
        render(<QueryClientProvider client={queryClient}><InsightDetailsPage /></QueryClientProvider>);

        await screen.findByText('The Power of Habit');

        const shareBtn = screen.getByTitle('Share insight');
        await user.click(shareBtn);

        expect(screen.getByText('Share Link')).toBeInTheDocument();

        const copyBtn = screen.getByTestId('copy-link-button');
        await user.click(copyBtn);

        await waitFor(() => {
            expect(clipboardWriteMock).toHaveBeenCalled();
        });
        expect(screen.getByText('Link Copied!')).toBeInTheDocument();
    });

    it('should call the TTS API and play audio when the read aloud button is clicked', async () => {
        vi.mocked(generateVoice).mockResolvedValue(new Blob(['dummy audio'], { type: 'audio/mpeg' }));

        render(<QueryClientProvider client={queryClient}><InsightDetailsPage /></QueryClientProvider>);

        await screen.findByText('The Power of Habit');

        const readAloudBtn = screen.getByTitle('Read aloud');
        await user.click(readAloudBtn);

        // Verify the API was called with the description text
        expect(generateVoice).toHaveBeenCalledWith("This is a mocked description for testing.");
        // Verify the HTML5 Audio engine played the sound
        await waitFor(() => {
            expect(audioPlayMock).toHaveBeenCalled();
        });
    });
});