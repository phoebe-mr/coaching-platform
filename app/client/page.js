'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const Logo = () => (
  <div className="flex flex-col items-center" style={{gap:'4px'}}>
    <svg width="120" height="24" viewBox="0 0 210 42">
      <path d="M 8 28 C 30 4, 54 4, 76 22 C 98 40, 122 40, 144 22 C 166 4, 186 4, 202 14" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 8 18 C 30 38, 54 38, 76 22 C 98 6, 122 6, 144 22 C 166 38, 186 36, 202 28" fill="none" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="76" cy="22" r="3.5" fill="#1D9E75"/>
      <circle cx="144" cy="22" r="3.5" fill="#1D9E75"/>
    </svg>
    <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
      <span style={{fontSize:'10px', fontFamily:'Georgia,serif', letterSpacing:'0.04em', color:'#2C2C2A'}}>rebalance</span>
      <span style={{width:'4px', height:'4px', borderRadius:'50%', background:'#1D9E75', display:'inline-block'}}></span>
      <span style={{fontSize:'8px', letterSpacing:'0.3em', color:'#888780'}}>co</span>
      <span style={{width:'4px', height:'4px', borderRadius:'50%', background:'#1D9E75', display:'inline-block'}}></span>
    </div>
  </div>
)

function getCurrentWeek(startDate) {
  if (!startDate) return 1
  const start = new Date(startDate)
  const today = new Date()
  const diffMs = today - start
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, diffWeeks + 1)
}

function groupExercises(exercises) {
  const groups = []
  let i = 0
  while (i < exercises.length) {
    const ex = exercises[i]
    if (ex.superset) {
      const sg = [{ ex, idx: i }]
      let j = i + 1
      while (j < exercises.length && exercises[j].superset === ex.superset) { sg.push({ ex: exercises[j], idx: j }); j++ }
      groups.push({ type: 'superset', label: ex.superset, items: sg })
      i = j
    } else {
      groups.push({ type: 'single', items: [{ ex, idx: i }] })
      i++
    }
  }
  return groups
}

const RatingRow = ({ label, value, onChange, max = 5, lowLabel = 'Low', highLabel = 'Great' }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="text-xs text-gray-600 w-36 flex-shrink-0">{label}</div>
    <div className="flex items-center gap-1.5 flex-1">
      <span className="text-xs text-gray-400 w-8 text-right">{lowLabel}</span>
      {Array.from({length: max}, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onChange(value === n ? null : n)}
          className={`w-8 h-8 rounded-lg text-xs font-medium border transition-colors ${value === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>{n}
        </button>
      ))}
      <span className="text-xs text-gray-400 w-8">{highLabel}</span>
    </div>
  </div>
)

// Intake modal
function IntakeModal({ clientData, onComplete }) {
  const [form, setForm] = useState({
    reason_for_seeking: '', tried_before: '', success_looks_like: '',
    medical_conditions: '', medications_supplements: '', hormonal_stage: '',
    current_symptoms: '', typical_eating: '', meal_regularity: '',
    relationship_with_food: '', foods_avoided: '', stress_level: null,
    sleep_quality: '', exercise_description: '', anything_else: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)

 async function submit() {
  setSubmitting(true)
  // First check if one already exists
  const { data: existing } = await supabase
    .from('intake_forms')
    .select('id')
    .eq('client_id', clientData.id)
    .maybeSingle()

  let error
  if (existing) {
    const res = await supabase
      .from('intake_forms')
      .update(form)
      .eq('client_id', clientData.id)
    error = res.error
  } else {
    const res = await supabase
      .from('intake_forms')
      .insert({ client_id: clientData.id, ...form })
    error = res.error
  }

  if (!error) onComplete()
  else { console.error('Intake error:', error); setSubmitting(false) }
 }

  const totalPages = 3

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl m-4 w-full max-w-lg my-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-center mb-4"><Logo /></div>
          <div className="text-base font-medium text-gray-900 mb-1">Welcome, {clientData.name.split(' ')[0]} 👋</div>
          <div className="text-sm text-gray-500 leading-relaxed">Before we get started, Phoebe would love to know a bit more about you. This should take about 10 minutes — there are no right or wrong answers.</div>
          <div className="flex items-center gap-1.5 mt-4">
            {[1,2,3].map(n => <div key={n} className={`flex-1 h-1 rounded-full transition-colors ${n <= page ? 'bg-gray-900' : 'bg-gray-200'}`} />)}
          </div>
          <div className="text-xs text-gray-400 mt-1.5">Step {page} of {totalPages}</div>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {page === 1 && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-1">Your goals</div>
              {[
                { key: 'reason_for_seeking', label: 'What is your main reason for seeking nutrition support right now?', placeholder: 'What brought you here? What\'s been on your mind?' },
                { key: 'tried_before', label: 'What have you already tried, and what happened?', placeholder: 'Diets, programmes, approaches — what worked, what didn\'t?' },
                { key: 'success_looks_like', label: 'What does success look like to you?', placeholder: 'How would you know this had worked? How would you feel?' }
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className="text-xs font-medium text-gray-600 mb-1.5">{label}</div>
                  <textarea value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} placeholder={placeholder} rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                </div>
              ))}
            </>
          )}

          {page === 2 && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-1">Your health</div>
              {[
                { key: 'medical_conditions', label: 'Any diagnosed medical conditions?', placeholder: 'Including any relevant history…', rows: 2 },
                { key: 'medications_supplements', label: 'Any medications or supplements?', placeholder: 'Including HRT, vitamins, prescription medications…', rows: 2 },
                { key: 'current_symptoms', label: 'Are you experiencing any symptoms at the moment?', placeholder: 'e.g. bloating, irregular periods, fatigue, hot flushes, trouble sleeping, brain fog, joint pain, mood changes…', rows: 3 }
              ].map(({ key, label, placeholder, rows }) => (
                <div key={key}>
                  <div className="text-xs font-medium text-gray-600 mb-1.5">{label}</div>
                  <textarea value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} placeholder={placeholder} rows={rows} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                </div>
              ))}
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">Where are you in your hormonal journey?</div>
                <div className="flex flex-col gap-1.5">
                  {['Regularly menstruating','Perimenopause','Postmenopause','Surgical menopause','Not applicable','Prefer not to say'].map(opt => (
                    <label key={opt} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.hormonal_stage === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      <input type="radio" name="hormonal_stage" checked={form.hormonal_stage === opt} onChange={() => setForm({...form, hormonal_stage: opt})} className="hidden" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {page === 3 && (
            <>
              <div className="text-sm font-medium text-gray-700 mb-1">Your eating & lifestyle</div>
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Describe a typical day of eating</div>
                <textarea value={form.typical_eating} onChange={e => setForm({...form, typical_eating: e.target.value})} placeholder="From morning to evening, be as specific as you can…" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">How regular are your meals?</div>
                <div className="flex flex-col gap-1.5">
                  {['I eat 3 structured meals most days','I eat 2 meals most days','My eating is quite irregular','I often skip meals'].map(opt => (
                    <label key={opt} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.meal_regularity === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      <input type="radio" name="meal_regularity" checked={form.meal_regularity === opt} onChange={() => setForm({...form, meal_regularity: opt})} className="hidden" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 mb-2">How would you describe your relationship with food?</div>
                <div className="flex flex-col gap-1.5">
                  {['Mostly positive — I enjoy food and don\'t stress about it','Neutral — food is fuel','Complicated — I have some rules or anxiety around food','Difficult — food causes me significant stress or guilt'].map(opt => (
                    <label key={opt} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.relationship_with_food === opt ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      <input type="radio" name="relationship_with_food" checked={form.relationship_with_food === opt} onChange={() => setForm({...form, relationship_with_food: opt})} className="hidden" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">How much exercise do you do per week?</div>
                <textarea value={form.exercise_description} onChange={e => setForm({...form, exercise_description: e.target.value})} placeholder="Type, frequency, duration…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1.5">Anything else Phoebe should know?</div>
                <textarea value={form.anything_else} onChange={e => setForm({...form, anything_else: e.target.value})} placeholder="Anything you'd find hard to bring up, or feels particularly important…" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
              </div>
            </>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {page > 1 && <button onClick={() => setPage(page-1)} className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white hover:bg-gray-50">Back</button>}
          {page < totalPages
            ? <button onClick={() => setPage(page+1)} className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">Continue</button>
            : <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors">{submitting ? 'Submitting…' : 'Submit'}</button>
          }
        </div>
      </div>
    </div>
  )
}

export default function ClientPage() {
  const [activeNav, setActiveNav] = useState('home')
  const [clientData, setClientData] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [showIntake, setShowIntake] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Plan state
  const [plan, setPlan] = useState([])
  const [planLoaded, setPlanLoaded] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)
  const [viewWeek, setViewWeek] = useState(1)
  const [trainingView, setTrainingView] = useState('plan')
  const [sessionHistory, setSessionHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  // Messages
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  // Nutrition
  const [currentHabit, setCurrentHabit] = useState(null)
  const [symptoms, setSymptoms] = useState([])
  const [existingCheckin, setExistingCheckin] = useState(null)
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [checkinSubmitting, setCheckinSubmitting] = useState(false)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [nutritionLoaded, setNutritionLoaded] = useState(false)
  const [checkinForm, setCheckinForm] = useState({
    breakfast_patterns: '', lunch_patterns: '', dinner_patterns: '', snack_patterns: '',
    energy_morning: null, energy_afternoon: null, energy_evening: null,
    mood_rating: null, sleep_rating: null,
    went_well: '', was_hard: '', habit_completion: '', habit_reflection: '', anything_new: '',
    symptom_scores: {}
  })
  // Home
  const [todaysSessions, setTodaysSessions] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const todayDay = dayMap[new Date().getDay()]
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', session.user.id).single().then(async ({ data, error }) => {
        if (error || !data) { window.location.href = '/login'; return }
        setClientData(data)
        setAuthed(true)
        const currentWeek = getCurrentWeek(data.start_date)
        setViewWeek(currentWeek)
        // Check if intake form needed
        const { data: intake } = await supabase.from('intake_forms').select('id').eq('client_id', data.id).maybeSingle()
        if (!intake) setShowIntake(true)
        // Load everything
        await Promise.all([
          loadPlan(data.id, currentWeek),
          loadMessages(data.id),
          loadHistory(data.id),
          loadNutrition(data.id, currentWeek),
          loadHomeData(data.id, currentWeek)
        ])
      })
    })
  }, [])

  async function loadHomeData(clientId, week) {
    const [todayRes, unreadRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', true).eq('week', week).eq('day', dayMap[new Date().getDay()]),
      supabase.from('messages').select('id', { count: 'exact' }).eq('client_id', clientId).eq('from_coach', true).eq('read', false)
    ])
    if (todayRes.data) setTodaysSessions(todayRes.data)
    setUnreadCount(unreadRes.count || 0)
  }

  async function loadNutrition(clientId, week) {
    setNutritionLoaded(false)
    const [habitRes, checkinRes, symsRes] = await Promise.all([
      supabase.from('client_habits').select('*').eq('client_id', clientId).eq('week', week).maybeSingle(),
      supabase.from('weekly_checkins').select('*').eq('client_id', clientId).eq('week', week).maybeSingle(),
      supabase.from('client_symptoms').select('*').eq('client_id', clientId).order('created_at')
    ])
    if (habitRes.data) setCurrentHabit(habitRes.data)
    if (checkinRes.data) {
      setExistingCheckin(checkinRes.data)
      setCheckinForm({
        breakfast_patterns: checkinRes.data.breakfast_patterns || '',
        lunch_patterns: checkinRes.data.lunch_patterns || '',
        dinner_patterns: checkinRes.data.dinner_patterns || '',
        snack_patterns: checkinRes.data.snack_patterns || '',
        energy_morning: checkinRes.data.energy_morning || null,
        energy_afternoon: checkinRes.data.energy_afternoon || null,
        energy_evening: checkinRes.data.energy_evening || null,
        mood_rating: checkinRes.data.mood_rating || null,
        sleep_rating: checkinRes.data.sleep_rating || null,
        went_well: checkinRes.data.went_well || '',
        was_hard: checkinRes.data.was_hard || '',
        habit_completion: checkinRes.data.habit_completion || '',
        habit_reflection: checkinRes.data.habit_reflection || '',
        anything_new: checkinRes.data.anything_new || '',
        symptom_scores: checkinRes.data.symptom_scores || {}
      })
    }
    if (symsRes.data) setSymptoms(symsRes.data)
    setNutritionLoaded(true)
  }

  async function loadPlan(clientId, week) {
    setPlanLoaded(false)
    const { data: dbSessions } = await supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', true).eq('week', week).order('id')
    if (dbSessions && dbSessions.length > 0) {
      const { data: dbExercises } = await supabase.from('exercises').select('*').in('session_id', dbSessions.map(s => s.id)).order('order')
      setPlan(days.map(day => ({
        day,
        sessions: dbSessions.filter(s => s.day === day).map(s => ({
          dbId: s.id, type: s.type, title: s.title, goal: s.goal || '',
          exercises: (dbExercises||[]).filter(e => e.session_id === s.id).sort((a,b) => (a.order||0)-(b.order||0)).map(e => ({
            name: e.name, sets: e.sets||3, reps: e.reps||10, tempo: e.tempo||'', notes: e.notes||'', superset: e.superset||null,
            weights: Array(e.sets||3).fill(''), done: false
          })),
          rpe: '', sessionNotes: '', saved: false, started: false
        }))
      })))
    } else {
      setPlan(days.map(day => ({ day, sessions: [] })))
    }
    setPlanLoaded(true)
  }

  async function loadMessages(clientId) {
    const { data: msgs } = await supabase.from('messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true })
    if (msgs && msgs.length > 0) {
      setMessages(msgs.map(m => ({ from: m.from_coach ? 'coach' : 'client', text: m.content, time: new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })))
      const unreadIds = msgs.filter(m => m.from_coach && !m.read).map(m => m.id)
      if (unreadIds.length > 0) await supabase.from('messages').update({ read: true }).in('id', unreadIds)
    }
  }

  async function loadHistory(clientId) {
    setHistoryLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', false).order('id', { ascending: false })
    if (sessions && sessions.length > 0) {
      const { data: exercises } = await supabase.from('exercises').select('*').in('session_id', sessions.map(s => s.id)).order('order')
      const { data: logs } = await supabase.from('session_logs').select('*').in('session_id', sessions.map(s => s.id))
      const { data: weightLogs } = await supabase.from('exercise_logs').select('*').in('exercise_id', exercises?.map(e => e.id)||[])
      setSessionHistory(sessions.map(s => ({ ...s, exercises: (exercises?.filter(e => e.session_id === s.id)||[]).map(ex => ({ ...ex, weights: weightLogs?.filter(w => w.exercise_id === ex.id).sort((a,b) => a.set_number-b.set_number)||[] })), log: logs?.find(l => l.session_id === s.id)||null })))
    } else { setSessionHistory([]) }
    setHistoryLoading(false)
  }

  async function changeViewWeek(newWeek) {
    if (!clientData) return
    const progLength = clientData.programme_length || 12
    if (newWeek < 1 || newWeek > progLength) return
    setViewWeek(newWeek); setExpandedDay(null)
    await loadPlan(clientData.id, newWeek)
  }

  function updateWeight(dayIdx, si, exIdx, setIdx, value) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[si].exercises[exIdx].weights[setIdx] = value; setPlan(p)
  }
  function updateRPE(dayIdx, si, value) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[si].rpe = value; setPlan(p)
  }
  function updateSessionNotes(dayIdx, si, value) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[si].sessionNotes = value; setPlan(p)
  }
  function toggleDone(dayIdx, si, exIdx) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[si].exercises[exIdx].done = !p[dayIdx].sessions[si].exercises[exIdx].done; setPlan(p)
  }
  function startSession(dayIdx, si) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[si].started = true; setPlan(p); setExpandedDay(dayIdx)
  }

  async function saveSession(dayIdx, si) {
    const session = plan[dayIdx].sessions[si]
    const dayObj = plan[dayIdx]
    const currentWeek = getCurrentWeek(clientData.start_date)
    const { data: sessionData, error: sessionError } = await supabase.from('sessions').insert({ client_id: clientData.id, week: currentWeek, day: dayObj.day, type: session.type, title: session.title, goal: session.goal, prescribed: false }).select().single()
    if (sessionError) { console.error(sessionError); return }
    const { data: exerciseRows } = await supabase.from('exercises').insert(session.exercises.map((ex, i) => ({ session_id: sessionData.id, name: ex.name, sets: ex.sets, reps: ex.reps, tempo: ex.tempo, notes: ex.notes, order: i }))).select()
    const weightLogs = []
    session.exercises.forEach((ex, exIdx) => { ex.weights.forEach((w, setIdx) => { if (w !== '') weightLogs.push({ exercise_id: exerciseRows[exIdx].id, client_id: clientData.id, set_number: setIdx+1, weight: parseFloat(w) }) }) })
    if (weightLogs.length > 0) await supabase.from('exercise_logs').insert(weightLogs)
    await supabase.from('session_logs').insert({ session_id: sessionData.id, client_id: clientData.id, rpe: session.rpe||null, notes: session.sessionNotes||null })
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[si].saved = true; setPlan(p)
    loadHistory(clientData.id)
  }

  async function submitCheckin() {
    setCheckinSubmitting(true)
    const currentWeek = getCurrentWeek(clientData.start_date)
    const payload = { client_id: clientData.id, week: currentWeek, ...checkinForm }
    const { data, error } = await supabase.from('weekly_checkins').upsert(payload, { onConflict: 'client_id,week' }).select().single()
    if (!error && data) {
      setExistingCheckin(data)
      setShowCheckinForm(false)
      setCheckinSaved(true)
      setTimeout(() => setCheckinSaved(false), 3000)
    } else {
      console.error('Checkin error:', error)
    }
    setCheckinSubmitting(false)
  }

  async function sendMessage() {
    if (!msgInput.trim()) return
    const { error } = await supabase.from('messages').insert({ client_id: clientData.id, from_coach: false, content: msgInput })
    if (!error) {
      setMessages([...messages, { from: 'client', text: msgInput, time: 'just now' }]); setMsgInput('')
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-message`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ record: { content: msgInput, from_coach: false, client_email: clientData.email } }) })
    }
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = '/login' }

  if (!authed || !clientData) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Loading…</div></div>

  const currentWeek = getCurrentWeek(clientData.start_date)
  const progLength = clientData.programme_length || 12

  const navItems = [
    { key: 'home', label: 'Home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 4l9 8v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8z"/><path d="M9 21V12h6v9"/></svg> },
    { key: 'training', label: 'Training', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="10" width="4" height="4" rx="1"/><rect x="18" y="10" width="4" height="4" rx="1"/><line x1="6" y1="12" x2="18" y2="12" strokeWidth="2.5"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="14" y1="8" x2="14" y2="16"/></svg> },
    { key: 'nutrition', label: 'Nutrition', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a9 9 0 100 18A9 9 0 0012 2z"/><path d="M12 6v6l4 2"/></svg> },
    { key: 'messages', label: 'Messages', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 4h16a1 1 0 011 1v10a1 1 0 01-1 1H6l-4 4V5a1 1 0 011-1z"/></svg> },
  ]

  return (
    <div className="min-h-screen flex bg-gray-50">
      {showIntake && <IntakeModal clientData={clientData} onComplete={() => setShowIntake(false)} />}

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Left sidebar */}
      <div className={`fixed top-0 left-0 h-full z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-200
        ${sidebarOpen ? 'w-52' : 'w-16'}
        lg:w-52 lg:static lg:flex`}>
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-100 px-3">
          <div className="hidden lg:block"><Logo /></div>
          <div className="block lg:hidden">
            <svg width="28" height="28" viewBox="0 0 210 42">
              <path d="M 8 28 C 30 4, 54 4, 76 22 C 98 40, 122 40, 144 22 C 166 4, 186 4, 202 14" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 8 18 C 30 38, 54 38, 76 22 C 98 6, 122 6, 144 22 C 166 38, 186 36, 202 28" fill="none" stroke="#5DCAA5" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1 p-2 pt-4">
          {navItems.map(({ key, label, icon }) => {
            const isActive = activeNav === key
            return (
              <button key={key} onClick={() => { setActiveNav(key); setSidebarOpen(false) }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left w-full
                  ${isActive ? 'text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                style={isActive ? {background:'#1D9E75'} : {}}>
                <span className="flex-shrink-0">{icon}</span>
                <span className={`text-sm font-medium whitespace-nowrap ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>{label}</span>
                {key === 'messages' && unreadCount > 0 && (
                  <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-green-700' : 'bg-green-100 text-green-700'} ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>{unreadCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-2 pb-4 border-t border-gray-100">
          <div className={`text-xs text-gray-400 px-3 py-1 mb-1 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>{clientData.name.split(' ')[0]}</div>
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors w-full">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span className={`text-sm ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>Sign out</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-gray-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="text-sm font-medium text-gray-700">{navItems.find(n => n.key === activeNav)?.label}</div>
          <div className="w-6" />
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-8 max-w-3xl">

          {/* HOME */}
          {activeNav === 'home' && (
            <div className="flex flex-col gap-5">
              <div>
                <div className="text-2xl font-medium text-gray-900">Good {timeOfDay}, {clientData.name.split(' ')[0]}</div>
                <div className="text-sm text-gray-400 mt-1">Week {currentWeek} of {progLength} · {clientData.programme}</div>
              </div>

              {currentHabit ? (
                <div className="rounded-2xl p-5 text-white" style={{background:'#1D9E75'}}>
                  <div className="text-xs font-medium mb-2" style={{opacity:0.75, letterSpacing:'0.1em', textTransform:'uppercase'}}>This week's habit</div>
                  <div className="text-base font-medium mb-1.5">{currentHabit.habit_text}</div>
                  {currentHabit.context_note && <div className="text-sm leading-relaxed" style={{opacity:0.85}}>{currentHabit.context_note}</div>}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="text-xs font-medium text-gray-400 mb-1">This week's habit</div>
                  <div className="text-sm text-gray-400">Phoebe will set your habit for this week soon</div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => setActiveNav('training')} className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-gray-300 transition-colors">
                  <div className="text-xs font-medium text-gray-400 mb-2">Today · {todayDay}</div>
                  {todaysSessions.length > 0 ? (
                    <div>
                      {todaysSessions.slice(0,2).map((s, i) => <div key={i} className="text-sm font-medium text-gray-800">{s.title}</div>)}
                      <div className="text-xs font-medium mt-2" style={{color:'#1D9E75'}}>Open training →</div>
                    </div>
                  ) : <div className="text-sm text-gray-500">Rest or walk today</div>}
                </button>

                <button onClick={() => { setActiveNav('nutrition'); setShowCheckinForm(true) }} className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-gray-300 transition-colors">
                  <div className="text-xs font-medium text-gray-400 mb-2">Weekly check-in</div>
                  {existingCheckin ? (
                    <div><div className="text-sm font-medium text-gray-800">Submitted ✓</div><div className="text-xs text-green-600 mt-1">Tap to update</div></div>
                  ) : (
                    <div><div className="text-sm font-medium text-gray-800">Not yet done</div><div className="text-xs font-medium mt-1" style={{color:'#1D9E75'}}>Complete check-in →</div></div>
                  )}
                </button>

                <button onClick={() => setActiveNav('messages')} className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-gray-300 transition-colors sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">Messages</div>
                      <div className="text-sm text-gray-700">{unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''} from Phoebe` : 'No new messages'}</div>
                    </div>
                    {unreadCount > 0 && <div className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-medium" style={{background:'#1D9E75'}}>{unreadCount}</div>}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TRAINING */}
          {activeNav === 'training' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-xl font-medium text-gray-900">Training</h1>
                <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
                  {[['plan','My plan'],['history','History']].map(([key, label]) => (
                    <button key={key} onClick={() => setTrainingView(key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${trainingView === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
                  ))}
                </div>
              </div>

              {trainingView === 'plan' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <button onClick={() => changeViewWeek(viewWeek-1)} disabled={viewWeek<=1} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
                    <div className="text-center">
                      <div className="text-sm font-medium">Week {viewWeek} of {progLength}</div>
                      {viewWeek === currentWeek && <div className="text-xs text-green-600 font-medium">This week</div>}
                      {viewWeek < currentWeek && <div className="text-xs text-gray-400">Past week</div>}
                      {viewWeek > currentWeek && <div className="text-xs text-blue-500">Coming up</div>}
                    </div>
                    <button onClick={() => changeViewWeek(viewWeek+1)} disabled={viewWeek>=progLength} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
                  </div>
                  {!planLoaded ? <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
                  : plan.every(d => d.sessions.length === 0) ? <div className="text-sm text-gray-400 text-center py-12">{viewWeek === currentWeek ? 'Your plan is being set up — check back soon!' : `No plan for week ${viewWeek}`}</div>
                  : (
                    <div className="flex flex-col gap-2">
                      {plan.map((dayObj, dayIdx) => (
                        <div key={dayObj.day}>
                          {dayObj.sessions.length === 0 ? (
                            <div className="flex gap-3 p-4 rounded-xl bg-white border border-gray-100">
                              <div className="text-xs font-medium text-gray-400 w-8 pt-0.5">{dayObj.day}</div>
                              <span className="text-sm text-gray-400">Rest or walk</span>
                            </div>
                          ) : (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                              <button onClick={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)} className="w-full flex gap-3 p-4 hover:bg-gray-50 transition-colors text-left">
                                <div className="text-xs font-medium text-gray-400 w-8 pt-0.5 flex-shrink-0">{dayObj.day}</div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                  {dayObj.sessions.map((s, si) => (
                                    <div key={si} className="flex gap-2 items-center">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${s.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{s.type === 'strength' ? 'Strength' : 'Run'}</span>
                                      <span className="text-sm font-medium">{s.title}</span>
                                      {s.saved && <span className="text-xs text-green-600">✓</span>}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-gray-400 text-xs pt-1">{expandedDay === dayIdx ? '▲' : '▼'}</span>
                              </button>
                              {expandedDay === dayIdx && (
                                <div className="border-t border-gray-100">
                                  {dayObj.sessions.map((session, si) => (
                                    <div key={si} className={`p-4 ${si > 0 ? 'border-t border-gray-100' : ''}`}>
                                      {session.goal && (
                                        <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                          <div className="text-xs font-medium text-amber-700 mb-1">Session goal</div>
                                          <div className="text-sm text-amber-900">{session.goal}</div>
                                        </div>
                                      )}
                                      {!session.started && !session.saved && viewWeek === currentWeek && (
                                        <button onClick={() => startSession(dayIdx, si)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors mb-4">Start session</button>
                                      )}
                                      {viewWeek !== currentWeek && !session.started && !session.saved && (
                                        <div className="text-xs text-gray-400 text-center py-2 mb-4">{viewWeek < currentWeek ? 'Past session' : 'Coming up'}</div>
                                      )}
                                      {(session.started || session.saved) && (
                                        <div className="flex flex-col gap-3">
                                          {groupExercises(session.exercises).map((group, groupIdx) => (
                                            <div key={groupIdx}>
                                              {group.type === 'superset' ? (
                                                <div className="border border-purple-100 rounded-xl overflow-hidden">
                                                  <div className="bg-purple-50 px-3 py-2 flex items-center gap-2">
                                                    <span className="text-xs font-medium text-purple-600">Superset {group.label}</span>
                                                    <span className="text-xs text-purple-400">— back to back</span>
                                                  </div>
                                                  <div className="divide-y divide-gray-100">
                                                    {group.items.map(({ ex, idx }) => (
                                                      <div key={idx} className={`p-3 ${ex.done ? 'bg-green-50' : 'bg-white'}`}>
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                          <div className="flex items-center gap-2">
                                                            <button onClick={() => toggleDone(dayIdx, si, idx)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>{ex.done && <span className="text-xs">✓</span>}</button>
                                                            <span className={`text-sm font-medium ${ex.done ? 'text-gray-400 line-through' : ''}`}>{ex.name}</span>
                                                          </div>
                                                          <div className="flex gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded-md">{ex.sets}×{ex.reps}</span>
                                                            {ex.tempo && <span className="bg-gray-100 px-2 py-0.5 rounded-md">{ex.tempo}</span>}
                                                          </div>
                                                        </div>
                                                        {ex.notes && <div className="text-xs text-gray-400 italic mb-2 ml-7">{ex.notes}</div>}
                                                        <div className="ml-7 flex gap-2 flex-wrap">
                                                          {ex.weights.map((w, setIdx) => (
                                                            <div key={setIdx} className="flex flex-col items-center gap-0.5">
                                                              <div className="text-xs text-gray-400">S{setIdx+1}</div>
                                                              <input type="number" value={w} onChange={e => updateWeight(dayIdx, si, idx, setIdx, e.target.value)} placeholder="—" className="w-12 text-sm text-center border border-gray-200 rounded-lg px-1 py-1 outline-none focus:border-blue-300 bg-white" />
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ) : (
                                                group.items.map(({ ex, idx }) => (
                                                  <div key={idx} className={`rounded-xl p-3 border ${ex.done ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                      <div className="flex items-center gap-2">
                                                        <button onClick={() => toggleDone(dayIdx, si, idx)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>{ex.done && <span className="text-xs">✓</span>}</button>
                                                        <span className={`text-sm font-medium ${ex.done ? 'text-gray-400 line-through' : ''}`}>{ex.name}</span>
                                                      </div>
                                                      <div className="flex gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                                        <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-md">{ex.sets}×{ex.reps}</span>
                                                        {ex.tempo && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-md">{ex.tempo}</span>}
                                                      </div>
                                                    </div>
                                                    {ex.notes && <div className="text-xs text-gray-400 italic mb-2 ml-7">{ex.notes}</div>}
                                                    <div className="ml-7 flex gap-2 flex-wrap">
                                                      {ex.weights.map((w, setIdx) => (
                                                        <div key={setIdx} className="flex flex-col items-center gap-0.5">
                                                          <div className="text-xs text-gray-400">S{setIdx+1}</div>
                                                          <input type="number" value={w} onChange={e => updateWeight(dayIdx, si, idx, setIdx, e.target.value)} placeholder="—" className="w-12 text-sm text-center border border-gray-200 rounded-lg px-1 py-1 outline-none focus:border-blue-300 bg-white" />
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          ))}
                                          <div className="pt-4 border-t border-gray-100">
                                            <div className="text-xs font-medium text-gray-600 mb-3">Finish session</div>
                                            <div className="mb-3">
                                              <div className="text-xs text-gray-500 mb-2">How hard was that? (RPE 1–10)</div>
                                              <div className="flex gap-1.5 flex-wrap">
                                                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                  <button key={n} onClick={() => updateRPE(dayIdx, si, n)} className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${session.rpe === n ? (n<=4 ? 'bg-green-100 text-green-700 border-green-300' : n<=7 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300') : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{n}</button>
                                                ))}
                                              </div>
                                            </div>
                                            <div className="mb-3">
                                              <div className="text-xs text-gray-500 mb-1.5">Notes for Phoebe</div>
                                              <textarea value={session.sessionNotes} onChange={e => updateSessionNotes(dayIdx, si, e.target.value)} placeholder="How did it feel? Anything to flag…" rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-300 resize-none bg-white" />
                                            </div>
                                            {session.saved ? (
                                              <div className="text-sm text-green-600 font-medium text-center py-1">Session saved! ✓</div>
                                            ) : (
                                              <button onClick={() => saveSession(dayIdx, si)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">Save session</button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trainingView === 'history' && (
                <div>
                  {historyLoading ? <div className="text-sm text-gray-400 text-center py-12">Loading…</div>
                  : sessionHistory.length === 0 ? <div className="text-sm text-gray-400 text-center py-12">No completed sessions yet</div>
                  : (
                    <div className="flex flex-col gap-3">
                      {sessionHistory.map((session, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${session.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{session.type === 'strength' ? 'Strength' : 'Run'}</span>
                              <span className="text-sm font-medium">{session.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Wk {session.week} · {session.day}</span>
                              {session.log?.rpe && <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${session.log.rpe<=4 ? 'bg-green-100 text-green-700' : session.log.rpe<=7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>RPE {session.log.rpe}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {session.exercises.map((ex, exIdx) => (
                              <div key={exIdx} className="bg-gray-50 rounded-xl px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{ex.name}</span>
                                  <span className="text-xs text-gray-400">{ex.sets}×{ex.reps}</span>
                                </div>
                                {ex.weights.length > 0 && (
                                  <div className="flex gap-2 mt-1.5 flex-wrap">
                                    {ex.weights.map((w, wi) => (
                                      <div key={wi} className="text-xs bg-white border border-gray-200 rounded-md px-2 py-0.5">
                                        <span className="text-gray-400">S{w.set_number} </span><span className="font-medium">{w.weight}kg</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {session.log?.notes && <div className="text-xs text-gray-500 italic mt-3 pt-3 border-t border-gray-100">"{session.log.notes}"</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NUTRITION */}
          {activeNav === 'nutrition' && (
            <div>
              <div className="text-xl font-medium text-gray-900 mb-6">Nutrition</div>
              {currentHabit && (
                <div className="rounded-2xl p-5 text-white mb-5" style={{background:'#1D9E75'}}>
                  <div className="text-xs font-medium mb-2" style={{opacity:0.75, letterSpacing:'0.1em', textTransform:'uppercase'}}>This week's habit</div>
                  <div className="text-base font-medium mb-1.5">{currentHabit.habit_text}</div>
                  {currentHabit.context_note && <div className="text-sm leading-relaxed" style={{opacity:0.85}}>{currentHabit.context_note}</div>}
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">Weekly check-in</div>
                    {existingCheckin && !showCheckinForm && <div className="text-xs text-green-600 mt-0.5">Submitted week {currentWeek} ✓</div>}
                    {checkinSaved && <div className="text-xs text-green-600 mt-0.5">Saved! ✓</div>}
                  </div>
                  {existingCheckin && !showCheckinForm && (
                    <button onClick={() => setShowCheckinForm(true)} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">Update</button>
                  )}
                </div>

                {!showCheckinForm && !existingCheckin && (
                  <div>
                    <div className="text-sm text-gray-500 mb-4">Takes about 5 minutes. Helps Phoebe understand how your week has been before your next call.</div>
                    <button onClick={() => setShowCheckinForm(true)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">Start this week's check-in</button>
                  </div>
                )}

                {showCheckinForm && (
                  <div className="flex flex-col gap-6">
                    {/* Eating */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Eating this week</div>
                      {[
                        { key: 'breakfast_patterns', label: 'Breakfast', ph: 'How have breakfasts been this week?' },
                        { key: 'lunch_patterns', label: 'Lunch', ph: 'How have lunches been?' },
                        { key: 'dinner_patterns', label: 'Dinner', ph: 'How have dinners been?' },
                        { key: 'snack_patterns', label: 'Snacks', ph: 'Any snacking patterns this week?' }
                      ].map(({ key, label, ph }) => (
                        <div key={key} className="mb-3">
                          <div className="text-xs text-gray-500 mb-1.5">{label}</div>
                          <textarea value={checkinForm[key]} onChange={e => setCheckinForm({...checkinForm, [key]: e.target.value})} placeholder={ph} rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                        </div>
                      ))}
                    </div>

                    {/* Ratings */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">How have you been feeling?</div>
                      <div className="divide-y divide-gray-100">
                        <RatingRow label="Morning energy" value={checkinForm.energy_morning} onChange={v => setCheckinForm({...checkinForm, energy_morning: v})} />
                        <RatingRow label="Afternoon energy" value={checkinForm.energy_afternoon} onChange={v => setCheckinForm({...checkinForm, energy_afternoon: v})} />
                        <RatingRow label="Evening energy" value={checkinForm.energy_evening} onChange={v => setCheckinForm({...checkinForm, energy_evening: v})} />
                        <RatingRow label="Mood overall" value={checkinForm.mood_rating} onChange={v => setCheckinForm({...checkinForm, mood_rating: v})} />
                        <RatingRow label="Sleep quality" value={checkinForm.sleep_rating} onChange={v => setCheckinForm({...checkinForm, sleep_rating: v})} />
                      </div>
                    </div>

                    {/* Symptoms */}
                    {symptoms.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1 uppercase tracking-wide">Symptom check</div>
                        <div className="text-xs text-gray-400 mb-3">1 = not at all &nbsp;·&nbsp; 5 = severe</div>
                        <div className="divide-y divide-gray-100">
                          {symptoms.map(sym => (
                            <RatingRow key={sym.id} label={sym.name} value={checkinForm.symptom_scores[sym.id]||null} onChange={v => setCheckinForm({...checkinForm, symptom_scores: {...checkinForm.symptom_scores, [sym.id]: v}})} lowLabel="None" highLabel="Severe" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Habit */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Your habit this week</div>
                      {currentHabit && <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl mb-3 italic">"{currentHabit.habit_text}"</div>}
                      <div className="text-xs text-gray-500 mb-2">How did you get on?</div>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {['Every day ✓', 'Most days', 'A few times', "Didn't manage it this week"].map(opt => (
                          <button key={opt} onClick={() => setCheckinForm({...checkinForm, habit_completion: opt})}
                            className={`text-left text-sm px-4 py-2.5 rounded-xl border transition-colors ${checkinForm.habit_completion === opt ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      <textarea value={checkinForm.habit_reflection} onChange={e => setCheckinForm({...checkinForm, habit_reflection: e.target.value})} placeholder="What helped, or what got in the way?" rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                    </div>

                    {/* Reflection */}
                    <div>
                      <div className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Reflection</div>
                      {[
                        { key: 'went_well', label: 'What went well with food and eating this week?', ph: 'Even small wins count…' },
                        { key: 'was_hard', label: 'What was hard?', ph: 'Be honest — this helps Phoebe support you' },
                        { key: 'anything_new', label: 'Anything new or anything to flag for Phoebe?', ph: 'New symptoms, questions, anything on your mind…' }
                      ].map(({ key, label, ph }) => (
                        <div key={key} className="mb-3">
                          <div className="text-xs text-gray-500 mb-1.5">{label}</div>
                          <textarea value={checkinForm[key]} onChange={e => setCheckinForm({...checkinForm, [key]: e.target.value})} placeholder={ph} rows={2} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button onClick={submitCheckin} disabled={checkinSubmitting} className="flex-1 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors">
                        {checkinSubmitting ? 'Saving…' : existingCheckin ? 'Update check-in' : 'Submit check-in'}
                      </button>
                      <button onClick={() => setShowCheckinForm(false)} className="px-4 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {activeNav === 'messages' && (
            <div>
              <div className="text-xl font-medium text-gray-900 mb-6">Messages</div>
              <div className="flex flex-col gap-3 mb-4">
                {messages.length === 0 ? <div className="text-sm text-gray-400 text-center py-12">No messages yet</div>
                : messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.from === 'client' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.from === 'client' ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>{m.text}</div>
                    <div className="text-xs text-gray-400 mt-1">{m.from === 'client' ? 'You' : 'Phoebe'} · {m.time}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message Phoebe…" className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-400 bg-white" />
                <button onClick={sendMessage} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}