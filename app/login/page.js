'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

const Logo = () => (
  <div className="flex flex-col items-center" style={{gap:'4px'}}>
    <svg width="140" height="28" viewBox="0 0 210 42">
      <path d="M 8 28 C 30 4, 54 4, 76 22 C 98 40, 122 40, 144 22 C 166 4, 186 4, 202 14" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 8 18 C 30 38, 54 38, 76 22 C 98 6, 122 6, 144 22 C 166 38, 186 36, 202 28" fill="none" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="76" cy="22" r="3.5" fill="#1D9E75"/>
      <circle cx="144" cy="22" r="3.5" fill="#1D9E75"/>
    </svg>
    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
      <span style={{fontSize:'11px', fontFamily:'Georgia,serif', letterSpacing:'0.04em', color:'#2C2C2A'}}>rebalance</span>
      <span style={{width:'5px', height:'5px', borderRadius:'50%', background:'#1D9E75', display:'inline-block'}}></span>
      <span style={{fontSize:'9px', letterSpacing:'0.35em', color:'#888780'}}>co</span>
      <span style={{width:'5px', height:'5px', borderRadius:'50%', background:'#1D9E75', display:'inline-block'}}></span>
    </div>
  </div>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: clientData } = await supabase.from('clients').select('id').eq('user_id', data.user.id).single()
    if (clientData) { window.location.href = '/client' } else { window.location.href = '/' }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="text-sm text-gray-500 text-center mb-6">Sign in to your account</div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1.5">Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1.5">Password</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400" />
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
          <button onClick={handleLogin} disabled={loading} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mt-1 disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}