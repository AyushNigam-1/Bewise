import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { mockAnimationsApi } from 'jsdom-testing-mocks';

mockAnimationsApi();

vi.mock('better-auth/react', () => ({
    createAuthClient: () => ({
        getSession: vi.fn().mockResolvedValue({
            data: {
                session: { token: 'fake-test-token' },
                user: { id: 'test-user' },
            },
            error: null,
        }),
    }),
}));


vi.mock('@/app/lib/auth', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        authClient: {
            getSession: vi.fn().mockResolvedValue({
                data: { session: { token: 'fake-test-token' }, user: { id: 'test-user' } },
                error: null
            })
        }
    };
});

Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
    },
});
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();