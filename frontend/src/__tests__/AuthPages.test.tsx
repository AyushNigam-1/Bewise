import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/app/(auth)/login/page';
import SignupPage from '@/app/(auth)/signup/page';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

// If you use a specific auth client (like Better Auth or NextAuth), mock it here!
vi.mock('@/lib/auth-client', () => ({
    signIn: { email: vi.fn(), github: vi.fn() },
    signUp: { email: vi.fn() },
}));

describe('Authentication Form UI & Validation', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
        vi.clearAllMocks();
        user = userEvent.setup();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Login Page', () => {
        it('should display Zod validation errors if the form is submitted empty', async () => {
            render(<LoginPage />);

            await user.click(screen.getByRole('button', { name: /login/i })); // Adjust to match your button text

            expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
            expect(screen.getByText('Password is required')).toBeInTheDocument();
        });

        it('should display a Zod validation error for an invalid email format', async () => {
            render(<LoginPage />);

            await user.type(screen.getByPlaceholderText('Email'), 'not-an-email');
            await user.type(screen.getByPlaceholderText('Password'), 'password123');
            await user.click(screen.getByRole('button', { name: /login/i }));

            expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
        });
    });

    describe('Create Account Page', () => {
        it('should display Zod validation errors for empty fields', async () => {
            render(<SignupPage />);

            await user.click(screen.getByRole('button', { name: /create account/i }));

            expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
        });

        it('should display Zod validation errors for invalid input lengths', async () => {
            render(<SignupPage />);

            await user.type(screen.getByPlaceholderText('Username'), 'yo'); // 2 chars
            await user.type(screen.getByPlaceholderText('Email'), 'bademail'); // Invalid
            await user.type(screen.getByPlaceholderText('Password'), 'short'); // < 8 chars
            await user.click(screen.getByRole('button', { name: /create account/i }));

            expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
            expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
        });
    });
});