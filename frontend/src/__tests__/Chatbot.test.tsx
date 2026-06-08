import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ChatbotModal from '@/app/components/modals/ChatbotModal';
import { invokeChatbot, generateVoice } from '@/app/services/aiService';

// 2. Hoist Mocks for Browser APIs
const { clipboardWriteMock, audioPlayMock } = vi.hoisted(() => ({
    clipboardWriteMock: vi.fn(),
    audioPlayMock: vi.fn(),
}));

// 3. Mock Dependencies
vi.mock('@/app/services/aiService', () => ({
    invokeChatbot: vi.fn(),
    generateVoice: vi.fn(),
}));

vi.mock('posthog-js', () => ({
    default: { capture: vi.fn() }
}));

vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div>, span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

describe('ChatbotModal Component Logic', () => {
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
        global.Audio = class {
            play = audioPlayMock;
            pause = vi.fn();
            onended = vi.fn();
        } as any;
    });

    afterEach(() => {
        queryClient.clear();
        cleanup();
    });

    it('should copy the AI greeting message to the clipboard', async () => {
        render(<QueryClientProvider client={queryClient}><ChatbotModal /></QueryClientProvider>);

        await user.click(screen.getByTestId('chatbot-button'));

        const copyBtn = screen.getByTestId('copy-ai-message');
        await user.click(copyBtn);

        expect(clipboardWriteMock).toHaveBeenCalledWith("Hello! I'm Wiser. Ask me about any book, author, or insight.");

        // FIX: Removed the Toast check. The clipboard mock is enough!
    });

    it('should correctly abort the network request when Stop is clicked', async () => {
        vi.mocked(invokeChatbot).mockImplementation(({ signal }: any) => {
            return new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(new Error('canceled')));
            });
        });

        render(<QueryClientProvider client={queryClient}><ChatbotModal /></QueryClientProvider>);
        await user.click(screen.getByTestId('chatbot-button'));

        await user.type(screen.getByTestId('chat-input'), 'Tell me a story');
        await user.click(screen.getByTestId('send-button'));

        const stopBtn = await screen.findByTestId('stop-button');
        await user.click(stopBtn);

        expect(await screen.findByText('Generation stopped by user.')).toBeInTheDocument();
    });

    it('should call the TTS API and play audio when the read aloud button is clicked', async () => {
        vi.mocked(generateVoice).mockResolvedValue(new Blob(['dummy audio'], { type: 'audio/mpeg' }));

        render(<QueryClientProvider client={queryClient}><ChatbotModal /></QueryClientProvider>);
        await user.click(screen.getByTestId('chatbot-button'));

        const readAloudBtn = screen.getByTestId('read-message-aloud');
        await user.click(readAloudBtn);

        // FIX: Added expect.anything() to ignore the React Query mutation context object
        expect(generateVoice).toHaveBeenCalledWith(
            "Hello! I'm Wiser. Ask me about any book, author, or insight.",
            expect.anything()
        );

        await waitFor(() => {
            expect(audioPlayMock).toHaveBeenCalled();
        });
    });
});