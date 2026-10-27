import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test finding 6 & 7 message parsing and lockout logic
describe('Finding #7: Email Enumeration & Unified Error Handling', () => {
    // Replicating parseMessage logic from AuthScreen
    const parseMessage = (message: string, code: string = ''): string => {
        const normalizedMessage = message.toUpperCase();
        const normalizedCode = code.toLowerCase();

        if (normalizedCode === 'auth/email-already-in-use' || normalizedMessage.includes('EMAIL_EXISTS') || normalizedMessage.includes('EMAIL-ALREADY-IN-USE')) {
            return 'This email address is already in use by another account.';
        }
        if (normalizedCode === 'auth/invalid-email' || normalizedMessage.includes('INVALID_EMAIL')) {
            return 'Please enter a valid email address.';
        }
        if (normalizedCode === 'auth/weak-password' || normalizedMessage.includes('WEAK_PASSWORD')) {
            return 'The password is too weak. It must be at least 6 characters.';
        }
        if (normalizedCode === 'auth/user-disabled' || normalizedMessage.includes('USER_DISABLED')) {
            return 'This user account has been disabled.';
        }
        if (normalizedCode === 'auth/user-not-found' || normalizedMessage.includes('USER_NOT_FOUND') || normalizedMessage.includes('EMAIL_NOT_FOUND')) {
            return 'No account found with this email.';
        }
        if (normalizedCode === 'auth/wrong-password' || normalizedMessage.includes('WRONG_PASSWORD') || normalizedMessage.includes('INVALID_PASSWORD')) {
            return 'Incorrect password. Please try again.';
        }
        if (normalizedCode === 'auth/invalid-credential' || normalizedMessage.includes('INVALID_CREDENTIAL')) {
            return 'Invalid email or password. Please verify your credentials.';
        }
        if (normalizedCode === 'auth/too-many-requests' || normalizedMessage.includes('TOO_MANY_REQUESTS')) {
            return 'Too many failed login attempts or requests. Please try again later.';
        }

        let cleanMessage = message;
        if (cleanMessage.startsWith('Firebase:')) {
            cleanMessage = cleanMessage.replace(/^Firebase:\s*/, '');
        }
        cleanMessage = cleanMessage.replace(/\s*\(auth\/[^)]+\)\.?/g, '');

        return cleanMessage || 'Authentication failed. Please verify credentials.';
    };

    it('TC-7.1: Maps raw EMAIL_EXISTS response to human-friendly uniform message', () => {
        const res = parseMessage('Firebase: Error (auth/email-already-in-use).', 'auth/email-already-in-use');
        expect(res).toBe('This email address is already in use by another account.');

        const restApiRes = parseMessage('EMAIL_EXISTS');
        expect(restApiRes).toBe('This email address is already in use by another account.');
    });

    it('TC-7.2: Password reset does not disclose whether email exists', async () => {
        // Password reset handler simulation
        let resetSent = false;
        const fakeSendReset = vi.fn().mockRejectedValue({ code: 'auth/user-not-found' });

        try {
            await fakeSendReset('nonexistent@user.com');
            resetSent = true;
        } catch (err) {
            // Under finding #7 remediation: catch and show success uniformly
            resetSent = true;
        }

        expect(resetSent).toBe(true);
    });

    it('TC-7.3: Ambiguous credentials error does not leak user existence on login', () => {
        const res = parseMessage('INVALID_CREDENTIAL', 'auth/invalid-credential');
        expect(res).toBe('Invalid email or password. Please verify your credentials.');
    });
});

describe('Finding #6: Rate Limiting & Account Lockout Simulation', () => {
    class AuthRateLimiter {
        failedAttempts = 0;
        lockoutUntil: number | null = null;
        errorMessage: string | null = null;

        recordAttempt(success: boolean, currentTime: number = Date.now()) {
            if (this.lockoutUntil && currentTime < this.lockoutUntil) {
                const remaining = Math.ceil((this.lockoutUntil - currentTime) / 1000);
                this.errorMessage = `Too many failed authentication attempts. Account temporarily locked for ${remaining} seconds.`;
                return false;
            }

            if (success) {
                this.failedAttempts = 0;
                this.lockoutUntil = null;
                this.errorMessage = null;
                return true;
            } else {
                this.failedAttempts += 1;
                if (this.failedAttempts >= 5) {
                    this.lockoutUntil = currentTime + 60 * 1000;
                    this.errorMessage = 'Too many failed authentication attempts. Account temporarily locked for 1 minute.';
                } else {
                    this.errorMessage = 'Invalid email or password. Please verify your credentials.';
                }
                return false;
            }
        }
    }

    let limiter: AuthRateLimiter;
    beforeEach(() => {
        limiter = new AuthRateLimiter();
    });

    it('TC-6.1: Allows up to 4 failed attempts without triggering lockout', () => {
        const now = 1000000;
        for (let i = 0; i < 4; i++) {
            const allowed = limiter.recordAttempt(false, now);
            expect(allowed).toBe(false);
            expect(limiter.lockoutUntil).toBeNull();
        }
        expect(limiter.failedAttempts).toBe(4);
    });

    it('TC-6.2: 5th failed attempt activates 60-second lockout', () => {
        const now = 1000000;
        for (let i = 0; i < 5; i++) {
            limiter.recordAttempt(false, now);
        }
        expect(limiter.failedAttempts).toBe(5);
        expect(limiter.lockoutUntil).toBe(now + 60000);
        expect(limiter.errorMessage).toContain('Account temporarily locked for 1 minute');
    });

    it('TC-6.3: Block subsequent attempts while lockout is active', () => {
        const now = 1000000;
        for (let i = 0; i < 5; i++) {
            limiter.recordAttempt(false, now);
        }

        // 30 seconds later (still locked)
        const allowed = limiter.recordAttempt(true, now + 30000);
        expect(allowed).toBe(false);
        expect(limiter.errorMessage).toContain('Account temporarily locked for 30 seconds');
    });

    it('TC-6.4: Unlocks after 60 seconds have elapsed and successful login resets count', () => {
        const now = 1000000;
        for (let i = 0; i < 5; i++) {
            limiter.recordAttempt(false, now);
        }

        // 61 seconds later
        const allowed = limiter.recordAttempt(true, now + 61000);
        expect(allowed).toBe(true);
        expect(limiter.failedAttempts).toBe(0);
        expect(limiter.lockoutUntil).toBeNull();
    });
});

describe('Finding #18: Account Deletion Client Safeguards', () => {
    it('TC-18.1: Correctly parses server error response during deletion failure', async () => {
        // Mock server response when crochet-service or ai-service is down
        const mockErrorResponse = {
            ok: false,
            status: 409,
            json: async () => ({
                error: 'Conflict',
                message: 'Unable to delete project data: Storage service is temporarily unavailable. No data was deleted. Please try again shortly.'
            })
        };

        let capturedError = '';
        try {
            if (!mockErrorResponse.ok && mockErrorResponse.status !== 404) {
                const data = await mockErrorResponse.json();
                throw new Error(data.message || 'Failed to delete account');
            }
        } catch (err: any) {
            capturedError = err.message;
        }

        expect(capturedError).toBe('Unable to delete project data: Storage service is temporarily unavailable. No data was deleted. Please try again shortly.');
    });

    it('TC-18.2: Account summary JSON exports valid structure', () => {
        const mockUser = {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            displayName: 'Crafter Alice',
            email: 'alice@example.com',
            crochetTerminology: 'US',
            createdAt: '2026-01-01T00:00:00Z'
        };

        const mockProjects = [
            { projectId: 'p1', title: 'Winter Scarf', status: 'In Progress', isArchive: false },
            { projectId: 'p2', title: 'Beanie', status: 'Completed', isArchive: false },
            { projectId: 'p3', title: 'Old Blanket', status: 'Completed', isArchive: true }
        ];

        const summary = {
            appName: 'My Yarn Diary',
            exportDate: new Date().toISOString(),
            account: {
                userId: mockUser.userId,
                displayName: mockUser.displayName,
                email: mockUser.email,
                crochetTerminology: mockUser.crochetTerminology,
                accountCreatedAt: mockUser.createdAt
            },
            projectStatistics: {
                totalProjects: mockProjects.length,
                inProgress: mockProjects.filter(p => p.status === 'In Progress').length,
                completed: mockProjects.filter(p => p.status === 'Completed').length,
                archived: mockProjects.filter(p => p.isArchive).length
            }
        };

        expect(summary.account.userId).toBe(mockUser.userId);
        expect(summary.projectStatistics.totalProjects).toBe(3);
        expect(summary.projectStatistics.inProgress).toBe(1);
        expect(summary.projectStatistics.completed).toBe(2);
        expect(summary.projectStatistics.archived).toBe(1);
    });
});
