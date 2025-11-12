import { useVerificationStatus } from '../hooks/useVerificationStatus';

jest.mock('../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', verification_status: 'pending' }, isAuthenticated: true })
}));

describe('useVerificationStatus', () => {
  it('returns pending for pending user', () => {
    const res = useVerificationStatus();
    expect(res.isPending).toBe(true);
    expect(res.isApproved).toBe(false);
    expect(res.isDeclined).toBe(false);
    expect(res.verificationStatus).toBe('pending');
  });
});
