import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Wifi } from 'lucide-react';

export interface LoginProps {
  /**
   * Login function that takes email/username, password, and remember flag
   * Returns a promise that resolves to true on success, false on failure
   */
  onLogin: (emailOrUsername: string, password: string, remember?: boolean) => Promise<boolean>;
  /**
   * Optional connection status indicator
   */
  showConnectionStatus?: boolean;
  /**
   * Optional placeholder text for the email/username input
   * @default "Email, Username, or Employee Code"
   */
  emailPlaceholder?: string;
  /**
   * Optional app name to display in the subtitle
   * @default "PayFlow POS"
   */
  appName?: string;
}

export function Login({
  onLogin,
  showConnectionStatus = false,
  emailPlaceholder = 'Email, Username, or Employee Code',
  appName = 'PayFlow POS',
}: LoginProps) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bgFailed, setBgFailed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const ok = await onLogin(emailOrUsername, password, remember);
      if (ok) {
        navigate('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0">
      {/* Background */}
      {bgFailed ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1200px 800px at 20% 20%, rgba(59,130,246,0.25), transparent), radial-gradient(1000px 700px at 80% 80%, rgba(99,102,241,0.25), transparent)',
          }}
        />
      ) : (
        <img
          src="https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=3840&q=80"
          alt="Background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(1) contrast(1.05)' }}
          onError={() => setBgFailed(true)}
          loading="eager"
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom right, rgba(0,0,0,0.35), rgba(0,0,0,0.15))' }} />

      {/* Centered card */}
      <div className="relative z-10 min-h-full w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-xs rounded-xl shadow-2xl backdrop-blur-xl px-4 py-5" style={{ backgroundColor: 'color-mix(in oklab, var(--color-bg-primary) 78%, transparent)', border: '1px solid color-mix(in oklab, var(--color-bg-secondary) 70%, transparent)' }}>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Sign in</h1>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>to continue to {appName}</p>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            
            <input
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full px-2.5 py-2 rounded-md border focus:outline-none focus:ring-2 text-sm"
              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', borderColor: 'color-mix(in oklab, var(--color-border) 80%, transparent)' }}
              placeholder={emailPlaceholder}
              autoComplete="username"
              required
              disabled={loading}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-9 pl-2.5 py-2 rounded-md border focus:outline-none focus:ring-2 text-sm"
                style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', borderColor: 'color-mix(in oklab, var(--color-border) 80%, transparent)' }}
                placeholder="Password"
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-[color:var(--color-text-secondary)] hover:opacity-80"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between cursor-pointer">
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  className="accent-[var(--color-primary-500)]"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgot" className="text-xs hover:underline" style={{ color: 'var(--color-primary-500)' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full px-3.5 py-2 rounded-md font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-primary-500)', color: 'var(--color-text-light)' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {showConnectionStatus && (
              <div className="text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <p className="flex items-center justify-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />
                  Online/offline login supported
                </p>
              </div>
            )}
          </form>
          <div className="mt-3 text-center">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Don't have an account?{' '}
            </span>
            <Link to="/signup" className="text-xs hover:underline" style={{ color: 'var(--color-primary-500)' }}>
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

