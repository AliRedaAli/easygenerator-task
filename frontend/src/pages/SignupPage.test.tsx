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

  it('submits valid input and shows the API error on failure', async () => {
    const signup = vi.fn().mockRejectedValue(new Error('Email already in use'));
    vi.mocked(useAuth).mockReturnValue({ signup } as unknown as ReturnType<typeof useAuth>);
    render(<SignupPage />, { wrapper: MemoryRouter });

    fillForm();

    expect(signup).toHaveBeenCalledWith('Ada', 'ada@example.com', 'Secret1!');
    expect(await screen.findByText('Email already in use')).toBeInTheDocument();
  });
});
