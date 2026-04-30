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

export default function IntakePage() {
  const [step, setStep] = useState('email') // email | form | done
  const [email, setEmail] = useState('')
  const [clientId, setClientId] = useState(null)
  const [clientName, setClientName] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    reason_for_seeking: '',
    tried_before: '',
    success_looks_like: '',
    medical_conditions: '',
    medications_supplements: '',
    hormonal_stage: '',
    current_symptoms: '',
    typical_eating: '',
    meal_regularity: '',
    relationship_with_food: '',
    foods_avoided: '',
    stress_level: null,
    sleep_quality: '',
    exercise_description: '',
    anything_else: ''
  })

  async function findClient() {
    if (!email.trim()) return
    setEmailError('')
    const { data, error } = await supabase.from('clients').select('id, name').eq('email', email.trim().toLowerCase()).single()
    if (error || !data) { setEmailError("We couldn't find an account with that email. Please check with your coach."); return }
    setClientId(data.id); setClientName(data.name.split(' ')[0]); setStep('form')
  }

  async function submitForm() {
    setSubmitting(true)
    const { error } = await supabase.from('intake_forms').upsert({ client_id: clientId, ...form }, { onConflict: 'client_id' })
    if (!error) setStep('done')
    setSubmitting(false)
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm text-center">
          <div className="flex justify-center mb-6"><Logo /></div>
          <div className="text-2xl mb-3">✓</div>
          <div className="text-lg font-medium text-gray-900 mb-2">Thank you, {clientName}</div>
          <div className="text-sm text-gray-500">Your intake form has been submitted. Phoebe will review your responses before your first session.</div>
        </div>
      </div>
    )
  }

  if (step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm">
          <div className="flex justify-center mb-8"><Logo /></div>
          <div className="text-base font-medium text-gray-900 mb-1">New client intake form</div
          <div className="text-sm text-gray-500 mb-6">Enter the email address you used when registering with Phoebe.</div>
          <div className="mb-4">
        <div className="text-xs font-medium text-gray-600 mb-1.5">Email address</div>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && findClient()} placeholder="you@example.com" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400" />
        {emailError && <div className="text-xs text-red-500 mt-1.5">{emailError}</div>}
      </div>
      <button onClick={findClient} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">Continue</button>
    </div>
  </div>
 )
 }
 return (
 <div className="max-w-xl mx-auto px-4 py-8">
 <div className="flex justify-center mb-8"><Logo /></div>
 <div className="mb-8">
 <div className="text-xl font-medium text-gray-900 mb-2">Hi {clientName} 👋</div>
 <div className="text-sm text-gray-500 leading-relaxed">Before your first session with Phoebe, please take a few minutes to complete this form. There are no right or wrong answers — the more honest and open you can be, the more Phoebe can tailor her support to you.</div>
 </div>
 <div className="flex flex-col gap-8">
    {/* Goals */}
    <div>
      <div className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-100">Your goals</div>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">What is your main reason for seeking nutrition support right now?</div>
          <textarea value={form.reason_for_seeking} onChange={e => setForm({...form, reason_for_seeking: e.target.value})} placeholder="What brought you here? What's been on your mind?" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">What have you already tried, and what happened?</div>
          <textarea value={form.tried_before} onChange={e => setForm({...form, tried_before: e.target.value})} placeholder="Diets, programmes, approaches — what worked, what didn't?" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">What does success look like to you? How would you know this had worked?</div>
          <textarea value={form.success_looks_like} onChange={e => setForm({...form, success_looks_like: e.target.value})} placeholder="Paint a picture of how you'd feel or what you'd be doing differently…" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
      </div>
    </div>

    {/* Health */}
    <div>
      <div className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-100">Your health</div>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">Do you have any diagnosed medical conditions we should know about?</div>
          <textarea value={form.medical_conditions} onChange={e => setForm({...form, medical_conditions: e.target.value})} placeholder="Including any relevant history…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">Are you currently taking any medication or supplements?</div>
          <textarea value={form.medications_supplements} onChange={e => setForm({...form, medications_supplements: e.target.value})} placeholder="Including HRT, vitamins, prescription medications…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">Where are you in your hormonal journey?</div>
          <div className="flex flex-col gap-2">
            {['Regularly menstruating', 'Perimenopause', 'Postmenopause', 'Surgical menopause', 'Not applicable', 'Prefer not to say'].map(opt => (
              <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.hormonal_stage === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                <input type="radio" name="hormonal_stage" value={opt} checked={form.hormonal_stage === opt} onChange={() => setForm({...form, hormonal_stage: opt})} className="hidden" />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">Are you experiencing any symptoms at the moment? <span className="font-normal text-gray-400">(e.g. bloating, irregular periods, fatigue, hot flushes, trouble sleeping, brain fog, joint pain, mood changes — anything relevant)</span></div>
          <textarea value={form.current_symptoms} onChange={e => setForm({...form, current_symptoms: e.target.value})} placeholder="Describe anything that feels relevant to your health and energy right now…" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
      </div>
    </div>

    {/* Eating */}
    <div>
      <div className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-100">Your eating</div>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">Describe a typical day of eating — what you'd usually have from morning to evening</div>
          <textarea value={form.typical_eating} onChange={e => setForm({...form, typical_eating: e.target.value})} placeholder="Be as specific as you can — including timings if you know them…" rows={4} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">How regular are your meals on a typical day?</div>
          <div className="flex flex-col gap-2">
            {['I eat 3 structured meals most days', 'I eat 2 meals most days', 'My eating is quite irregular', 'I often skip meals — especially breakfast or lunch'].map(opt => (
              <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.meal_regularity === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                <input type="radio" name="meal_regularity" value={opt} checked={form.meal_regularity === opt} onChange={() => setForm({...form, meal_regularity: opt})} className="hidden" />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">How would you describe your relationship with food right now?</div>
          <div className="flex flex-col gap-2">
            {['Mostly positive — I enjoy food and don\'t stress about it', 'Neutral — food is fuel, I don\'t think about it much', 'Complicated — I have some rules or anxiety around food', 'Difficult — food causes me significant stress or guilt'].map(opt => (
              <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.relationship_with_food === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                <input type="radio" name="relationship_with_food" value={opt} checked={form.relationship_with_food === opt} onChange={() => setForm({...form, relationship_with_food: opt})} className="hidden" />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">Are there any foods or food groups you currently avoid, and why?</div>
          <textarea value={form.foods_avoided} onChange={e => setForm({...form, foods_avoided: e.target.value})} placeholder="Include allergies, intolerances, or personal choices…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
      </div>
    </div>

    {/* Lifestyle */}
    <div>
      <div className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-100">Your lifestyle</div>
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">How would you describe your stress levels on a typical week?</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12 text-right">Very low</span>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setForm({...form, stress_level: form.stress_level === n ? null : n})}
                className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${form.stress_level === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>{n}</button>
            ))}
            <span className="text-xs text-gray-400 w-12">Very high</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-2">How many nights a week do you get what you'd consider good quality sleep?</div>
          <div className="flex flex-col gap-2">
            {['0–1 nights', '2–3 nights', '4–5 nights', '6–7 nights'].map(opt => (
              <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.sleep_quality === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                <input type="radio" name="sleep_quality" value={opt} checked={form.sleep_quality === opt} onChange={() => setForm({...form, sleep_quality: opt})} className="hidden" />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-600 mb-1.5">How much exercise do you do per week, and what type?</div>
          <textarea value={form.exercise_description} onChange={e => setForm({...form, exercise_description: e.target.value})} placeholder="Be honest — even if it's less than you'd like…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
        </div>
      </div>
    </div>

    {/* Final */}
    <div>
      <div className="text-sm font-medium text-gray-800 mb-4 pb-2 border-b border-gray-100">Anything else?</div>
      <div>
        <div className="text-xs font-medium text-gray-600 mb-1.5">Is there anything else you want Phoebe to know before your first session? Anything you'd find it hard to bring up, or something that feels particularly important?</div>
        <textarea value={form.anything_else} onChange={e => setForm({...form, anything_else: e.target.value})} placeholder="This is a safe space — anything you share will only be seen by Phoebe…" rows={4} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
      </div>
    </div>

    <button onClick={submitForm} disabled={submitting || !form.reason_for_seeking.trim()} className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors mb-8">
      {submitting ? 'Submitting…' : 'Submit intake form'}
    </button>
  </div>
</div>
)
}