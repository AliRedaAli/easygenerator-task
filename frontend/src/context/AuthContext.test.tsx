import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/auth');

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <div>{loading ? 'loading' : user ? `user:${user.name}` : 'anonymous'}</div>
      <button onClick={() => void login('ada@example.com', 'Passw0rd!').catch(() => {})}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
  });

  it('shows unauthenticated once the initial /me check resolves with no session', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    render(<AuthProvider><Probe /></AuthProvider>);

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('anonymous')).toBeInTheDocument();
  });

  it('populates the user after a successful login', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    vi.mocked(authApi.login).mockResolvedValue({ name: 'Ada', email: 'ada@example.com' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('anonymous');

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(await screen.findByText('user:Ada')).toBeInTheDocument();
  });

  it('keeps the user null when login fails', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid email or password'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('anonymous');

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  it('clears the user on logout', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ name: 'Ada', email: 'ada@example.com' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('user:Ada');

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(await screen.findByText('anonymous')).toBeInTheDocument();
  });
});
