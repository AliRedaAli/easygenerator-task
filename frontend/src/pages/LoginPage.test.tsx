import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

function fillForm({ email = 'ada@example.com', password = 'Secret1!' } = {}) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
}

describe('LoginPage', () => {
  it('rejects a malformed email without calling the API', () => {
    const login = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ login } as unknown as ReturnType<typeof useAuth>);
    render(<LoginPage />, { wrapper: MemoryRouter });

    fillForm({ email: 'not-an-email' });

    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid input and shows the API error on failure', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
    vi.mocked(useAuth).mockReturnValue({ login } as unknown as ReturnType<typeof useAuth>);
    render(<LoginPage />, { wrapper: MemoryRouter });

    fillForm();

    expect(login).toHaveBeenCalledWith('ada@example.com', 'Secret1!');
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
