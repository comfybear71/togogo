import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShoppingBag,
  Store,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, signInWithGoogle } = useAuthStore();

  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign-in form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign-up form
  const [signupStep, setSignupStep] = useState('role'); // 'role' | 'form'
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, { name, role });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign in failed.');
    }
  };

  const ROLES = [
    {
      value: 'buyer',
      label: 'BUY',
      desc: 'Find amazing deals',
      color: '#06D6A0',
      icon: ShoppingBag,
    },
    {
      value: 'seller',
      label: 'SELL',
      desc: 'Start your store',
      color: '#FF6B35',
      icon: Store,
    },
    {
      value: 'both',
      label: 'BOTH',
      desc: 'Buy & sell freely',
      color: '#FFD23F',
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FF6B35]/5 via-white to-[#06D6A0]/5 px-4 py-12 dark:from-[#FF6B35]/5 dark:via-gray-950 dark:to-[#06D6A0]/5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-['Baloo_2'] text-4xl font-bold">
            <span className="text-[#FF6B35]">To</span>
            <span className="text-[#06D6A0]">Go</span>
            <span className="text-[#FFD23F]">Go</span>
          </h1>
          <p className="mt-1 font-['Nunito'] text-gray-500 dark:text-gray-400">
            Your marketplace for amazing deals
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Tab Switcher */}
          <div className="mb-6 flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => { setTab('signin'); setError(''); }}
              className={`flex-1 rounded-lg py-2 text-sm font-['Nunito'] font-bold transition-all ${
                tab === 'signin'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); setSignupStep('role'); setError(''); }}
              className={`flex-1 rounded-lg py-2 text-sm font-['Nunito'] font-bold transition-all ${
                tab === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Sign In */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm font-['Nunito'] font-semibold text-[#FF6B35] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF6B35] py-3 font-semibold text-white hover:bg-[#e55a2b] disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-400 dark:bg-gray-900">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 font-['Nunito'] text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            </form>
          )}

          {/* Sign Up */}
          {tab === 'signup' && (
            <>
              {/* Role Selection */}
              {signupStep === 'role' && (
                <div>
                  <h2 className="mb-2 text-center font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                    What do you want to do?
                  </h2>
                  <p className="mb-6 text-center text-sm text-gray-500">
                    You can always change this later
                  </p>

                  <div className="space-y-3">
                    {ROLES.map((r) => {
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.value}
                          onClick={() => { setRole(r.value); setSignupStep('form'); }}
                          className="group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md"
                          style={{
                            borderColor: `${r.color}40`,
                            backgroundColor: `${r.color}08`,
                          }}
                        >
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${r.color}20` }}
                          >
                            <Icon className="h-6 w-6" style={{ color: r.color }} />
                          </div>
                          <div className="flex-1">
                            <p
                              className="font-['Baloo_2'] text-lg font-bold"
                              style={{ color: r.color }}
                            >
                              {r.label}
                            </p>
                            <p className="text-sm text-gray-500">{r.desc}</p>
                          </div>
                          <div
                            className="h-5 w-5 rounded-full border-2 transition-colors group-hover:bg-current"
                            style={{ borderColor: r.color, color: r.color }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sign Up Form */}
              {signupStep === 'form' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSignupStep('role')}
                    className="flex items-center gap-1 text-sm font-['Nunito'] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change role
                  </button>

                  <div className="rounded-lg px-3 py-2 text-center text-sm font-semibold capitalize"
                    style={{
                      backgroundColor: `${ROLES.find((r) => r.value === role)?.color}15`,
                      color: ROLES.find((r) => r.value === role)?.color,
                    }}
                  >
                    Signing up as: {role}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FF6B35] py-3 font-semibold text-white hover:bg-[#e55a2b] disabled:opacity-60"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-400 dark:bg-gray-900">or</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 font-['Nunito'] text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing, you agree to ToGoGo's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
