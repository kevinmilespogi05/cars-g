import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ProfileLinkGuarded from '../components/ProfileLinkGuarded';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../hooks/useVerificationStatus', () => ({
  useVerificationStatus: () => ({ isPending: true, isAuthenticated: true })
}));

const mockShowError = jest.fn();
jest.mock('../contexts/ToastContext', () => ({
  useToastContext: () => ({ error: mockShowError })
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'current-user' } })
}));

describe('ProfileLinkGuarded', () => {
  it('prevents navigation and shows toast when pending user clicks other profile', () => {
    const PLG: any = ProfileLinkGuarded;
    const { getByText } = render(
      React.createElement(PLG, { to: '/profile/other-user' }, 'View'),
      { wrapper: MemoryRouter }
    );

    const link = getByText('View');
    fireEvent.click(link);

    expect(mockShowError).toHaveBeenCalled();
  });
});
