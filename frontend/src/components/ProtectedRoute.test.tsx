import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>secret home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading state while the session is being resolved', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as unknown as ReturnType<
      typeof useAuth
    >);
    renderAt('/');

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to /login when there is no authenticated user', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as unknown as ReturnType<
      typeof useAuth
    >);
    renderAt('/');

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders the protected content when a user is present', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { name: 'Ada', email: 'ada@example.com' },
      loading: false,
    } as unknown as ReturnType<typeof useAuth>);
    renderAt('/');

    expect(screen.getByText('secret home')).toBeInTheDocument();
  });
});
