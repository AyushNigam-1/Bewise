import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock the clipboard globally for Vitest
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
    },
});