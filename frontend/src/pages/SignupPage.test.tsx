import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SignupPage } from './SignupPage';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

function fillForm({ name = 'Ada', email = 'ada@example.com', password = 'Secret1!' } = {}) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
}

describe('SignupPage', () => {
  it('rejects a password that fails the complexity pattern without calling the API', () => {
    const signup = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ signup } as unknown as ReturnType<typeof useAuth>);
    render(<SignupPage />, { wrapper: MemoryRouter });

    fillForm({ password: 'short' });

    expect(signup).not.toHaveBeenCalled();
  });

  // Not testable here: jsdom hardcodes the `tooShort` validity flag to
  // false (it can't emulate the "dirty value" tracking real browsers use
  // for minlength), so a too-short name can't be blocked via fireEvent in
  // this environment. Covered authoritatively server-side instead — see
  // backend/src/auth/dto/signup.dto.spec.ts and auth.e2e-spec.ts.

  it('rejects a malformed email without calling the API', () => {
    const signup = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ signup } as unknown as ReturnType<typeof useAuth>);
    render(<SignupPage />, { wrapper: MemoryRouter });

    fillForm({ email: 'not-an-email' });

    expect(signup).not.toHaveBeenCalled();
  });

  it('rejects an empty required field without calling the API', () => {
    const signup = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ signup } as unknown as ReturnType<typeof useAuth>);
    render(<SignupPage />, { wrapper: MemoryRouter });

    fillForm({ name: '' });

    expect(signup).not.toHaveBeenCalled();
  });

  it('submits valid input and shows the API error on failure', async () => {
    const signup = vi.fn().mockRejectedValue(new Error('Email already in use'));
    vi.mocked(useAuth).mockReturnValue({ signup } as unknown as ReturnType<typeof useAuth>);
    render(<SignupPage />, { wrapper: MemoryRouter });

    fillForm();

    expect(signup).toHaveBeenCalledWith('Ada', 'ada@example.com', 'Secret1!');
    expect(await screen.findByText('Email already in use')).toBeInTheDocument();
  });
});
