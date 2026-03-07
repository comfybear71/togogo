import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Logo from '../components/layout/Logo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Mail, Lock, User, ShoppingBag, Store, ArrowRight } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // signin | role | signup
  const [role, setRole] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle } = useAuthStore()
  const navigate = useNavigate()

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Sign in failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      await signUp(form.email, form.password, { name: form.name, role: role || 'buyer' })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign in failed.')
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF6B35]/5 via-white to-[#06D6A0]/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white rounded-[16px] shadow-lg p-6 sm:p-8" style={{ boxShadow: '0 4px 20px rgba(255,107,53,0.1)' }}>
          {/* Sign In */}
          {mode === 'signin' && (
            <>
              <h2 className="font-heading text-2xl font-bold text-center mb-6">Welcome back</h2>
              {error && <div className="bg-red-50 text-red-600 rounded-[8px] p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input label="Email" type="email" value={form.email} onChange={update('email')} placeholder="your@email.com" required />
                <Input label="Password" type="password" value={form.password} onChange={update('password')} placeholder="Your password" required />
                <Button type="submit" variant="primary" className="w-full" loading={loading}>Sign In</Button>
              </form>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-gray-400">or</span></div>
              </div>
              <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-[12px] px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition min-h-[44px]">
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
                Continue with Google
              </button>
              <p className="text-center text-sm text-gray-500 mt-6">
                Don't have an account?{' '}
                <button onClick={() => { setMode('role'); setError('') }} className="text-[#FF6B35] font-semibold hover:underline">Sign Up</button>
              </p>
            </>
          )}

          {/* Role Selection */}
          {mode === 'role' && (
            <>
              <h2 className="font-heading text-2xl font-bold text-center mb-2">What do you want to do?</h2>
              <p className="text-center text-gray-500 text-sm mb-6">You can always change this later</p>
              <div className="space-y-3">
                <button onClick={() => { setRole('buyer'); setMode('signup') }} className="w-full flex items-center gap-4 p-4 rounded-[16px] border-2 border-transparent bg-[#06D6A0]/10 hover:border-[#06D6A0] transition group min-h-[44px]">
                  <div className="w-12 h-12 rounded-full bg-[#06D6A0] flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Buy</p>
                    <p className="text-sm text-gray-500">Find amazing deals and shop</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-[#06D6A0] transition" />
                </button>
                <button onClick={() => { setRole('seller'); setMode('signup') }} className="w-full flex items-center gap-4 p-4 rounded-[16px] border-2 border-transparent bg-[#FF6B35]/10 hover:border-[#FF6B35] transition group min-h-[44px]">
                  <div className="w-12 h-12 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Sell</p>
                    <p className="text-sm text-gray-500">List products and start earning</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-[#FF6B35] transition" />
                </button>
                <button onClick={() => { setRole('both'); setMode('signup') }} className="w-full flex items-center gap-4 p-4 rounded-[16px] border-2 border-transparent bg-[#FFD23F]/10 hover:border-[#FFD23F] transition group min-h-[44px]">
                  <div className="w-12 h-12 rounded-full bg-[#FFD23F] flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Both</p>
                    <p className="text-sm text-gray-500">Buy and sell — the full experience</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 ml-auto group-hover:text-[#FFD23F] transition" />
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError('') }} className="text-[#FF6B35] font-semibold hover:underline">Sign In</button>
              </p>
            </>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <>
              <h2 className="font-heading text-2xl font-bold text-center mb-6">Create your account</h2>
              {error && <div className="bg-red-50 text-red-600 rounded-[8px] p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSignUp} className="space-y-4">
                <Input label="Full Name" type="text" value={form.name} onChange={update('name')} placeholder="Your name" required />
                <Input label="Email" type="email" value={form.email} onChange={update('email')} placeholder="your@email.com" required />
                <Input label="Password" type="password" value={form.password} onChange={update('password')} placeholder="At least 6 characters" required />
                <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm your password" required />
                <Button type="submit" variant="primary" className="w-full" loading={loading}>Create Account</Button>
              </form>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white px-4 text-gray-400">or</span></div>
              </div>
              <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-[12px] px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition min-h-[44px]">
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/></svg>
                Sign up with Google
              </button>
              <p className="text-center text-sm text-gray-500 mt-6">
                <button onClick={() => { setMode('role'); setError('') }} className="text-[#FF6B35] font-semibold hover:underline">← Back</button>
                {' · '}
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError('') }} className="text-[#FF6B35] font-semibold hover:underline">Sign In</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
