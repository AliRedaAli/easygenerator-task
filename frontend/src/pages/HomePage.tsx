import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-2xl font-semibold text-gray-800">Welcome to the application</h1>
      {user && <p className="text-gray-600">Logged in as {user.name}</p>}
      <button
        type="button"
        onClick={() => logout()}
        className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
      >
        End session
      </button>
    </div>
  );
}
