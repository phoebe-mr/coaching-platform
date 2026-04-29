'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

const Logo = () => (
  <div className="flex flex-col items-center" style={{gap:'4px'}}>
    <svg width="140" height="28" viewBox="0 0 210 42">
      <path d="M 8 28 C 30 4, 54 4, 76 22 C 98 40, 122 40, 144 22 C 166 4, 186 4, 202 14" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M 8 18 C 30 38, 54 38, 76 22 C 98 6, 122 6, 144 22 C 166 38, 186 36, 202 28" fill="none" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="76" cy="22" r="3.5" fill="#1D9E75"/>
      <circle cx="144" cy="22" r="3.5" fill="#1D9E75"/>
    </svg>
    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
      <span style={{fontSize:'11px', fontFamily:'Georgia,serif', letterSpacing:'0.04em', color:'var(--color-text-primary)'}}>rebalance</span>
      <span style={{width:'5px', height:'5px', borderRadius:'50%', background:'#1D9E75', display:'inline-block'}}></span>
      <span style={{fontSize:'9px', letterSpacing:'0.35em', color:'#888780'}}>co</span>
      <span style={{width:'5px', height:'5px', borderRadius:'50%', background:'#1D9E75', display:'inline-block'}}></span>
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

function getWeekDates(startDate, week) {
  if (!startDate) return `Week ${week}`
  const start = new Date(startDate)
  const weekStart = new Date(start.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000)
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
  return `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}–${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

const ScaleDisplay = ({ value, max = 5 }) => {
  const color = value <= 2 ? 'bg-red-100 text-red-700' : value === 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>{value}/{max}</span>
}

const intakeFields = [
  { key: 'main_reason', label: 'Main reason for seeking support' },
  { key: 'tried_before', label: 'What they\'ve tried before' },
  { key: 'success_looks_like', label: 'What success looks like to them' },
  { key: 'medical_conditions', label: 'Medical conditions' },
  { key: 'medications', label: 'Medications and supplements' },
  { key: 'current_symptoms', label: 'Current symptoms' },
  { key: 'energy_level', label: 'Typical energy level (1–5)' },
  { key: 'typical_eating', label: 'Typical day of eating' },
  { key: 'meal_regularity', label: 'Meal regularity' },
  { key: 'food_relationship', label: 'Relationship with food' },
  { key: 'foods_avoided', label: 'Foods avoided' },
  { key: 'stress_level', label: 'Typical stress level (1–5)' },
  { key: 'sleep_quality', label: 'Sleep quality' },
  { key: 'exercise_habits', label: 'Exercise' },
  { key: 'anything_else', label: 'Anything else to note' },
]

export default function Home() {
  const [screen, setScreen] = useState('dashboard')
  const [activeClient, setActiveClient] = useState(null)
  const [tab, setTab] = useState('plan')
  const [expandedDay, setExpandedDay] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [checkinsThisWeek, setCheckinsThisWeek] = useState(0)
  const [planSessions, setPlanSessions] = useState([])
  const [planLoading, setPlanLoading] = useState(false)
  const [planWeek, setPlanWeek] = useState(1)
  const [addingSessionDay, setAddingSessionDay] = useState(null)
  const [newSessionForm, setNewSessionForm] = useState({ type: 'strength', title: '', goal: '' })
  const [addingExerciseSession, setAddingExerciseSession] = useState(null)
  const [newExerciseForm, setNewExerciseForm] = useState({ name: '', sets: 3, reps: 10, tempo: '', notes: '', superset: '' })
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ name: '', email: '', password: '', programme: '', start_date: '', programme_length: 12 })
  const [addingClient, setAddingClient] = useState(false)
  const [addClientError, setAddClientError] = useState('')
  const [sessionHistory, setSessionHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editingProgramme, setEditingProgramme] = useState(false)
  const [programmeForm, setProgrammeForm] = useState({ programme_length: 12, start_date: '' })
  // Nutrition
  const [nutritionTab, setNutritionTab] = useState('checkins')
  const [nutWeek, setNutWeek] = useState(1)
  const [intakeFormData, setIntakeFormData] = useState(null)
  const [allCheckins, setAllCheckins] = useState([])
  const [checkinsLoading, setCheckinsLoading] = useState(false)
  const [habitForm, setHabitForm] = useState({ habit: '', why_note: '', confidence: 8 })
  const [savingHabit, setSavingHabit] = useState(false)
  const [habitSaved, setHabitSaved] = useState(false)
  const [clientSymptoms, setClientSymptoms] = useState([])
  const [newSymptomInput, setNewSymptomInput] = useState('')
  const [callNotesText, setCallNotesText] = useState('')
  const [callNotesSaved, setCallNotesSaved] = useState(false)
  const [savingCallNotes, setSavingCallNotes] = useState(false)

  const colours = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-pink-100 text-pink-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700']
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setAuthed(true)
      supabase.from('clients').select('*').then(({ data, error }) => {
        if (!error) setClients(data.map((c, i) => ({
          ...c, initials: c.name.split(' ').map(n => n[0]).join(''), colour: colours[i % colours.length],
          currentWeek: getCurrentWeek(c.start_date),
          meta: `Week ${getCurrentWeek(c.start_date)} of ${c.programme_length || 12} · ${c.programme}`, status: 'On track'
        })))
        setLoading(false)
      })
      supabase.from('messages').select('id', { count: 'exact' }).eq('from_coach', false).eq('read', false).then(({ count }) => setUnreadCount(count || 0))
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      supabase.from('weekly_checkins').select('id', { count: 'exact' }).gte('created_at', weekAgo).then(({ count }) => setCheckinsThisWeek(count || 0))
    })
  }, [])

  async function loadNutritionData(clientId) {
    const { data: intake } = await supabase.from('intake_forms').select('*').eq('client_id', clientId).limit(1)
    setIntakeFormData(intake?.[0] || null)
    setCheckinsLoading(true)
    const { data: cins } = await supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('week', { ascending: false })
    setAllCheckins(cins || [])
    setCheckinsLoading(false)
    const { data: symptoms } = await supabase.from('client_symptoms').select('*').eq('client_id', clientId).eq('active', true).order('display_order')
    setClientSymptoms(symptoms || [])
  }

  async function loadNutWeekData(clientId, week) {
    const { data: habitData } = await supabase.from('client_habits').select('*').eq('client_id', clientId).eq('week', week).limit(1)
    const habit = habitData?.[0] || null
    if (habit) setHabitForm({ habit: habit.habit || '', why_note: habit.why_note || '', confidence: habit.confidence || 8 })
    else setHabitForm({ habit: '', why_note: '', confidence: 8 })
    const { data: notesData } = await supabase.from('call_notes').select('*').eq('client_id', clientId).eq('week', week).limit(1)
    setCallNotesText(notesData?.[0]?.notes || '')
    setCallNotesSaved(false)
    setHabitSaved(false)
  }

  async function changeNutWeek(newWeek) {
    if (!activeClient || newWeek < 1 || newWeek > (activeClient.programme_length || 12)) return
    setNutWeek(newWeek)
    await loadNutWeekData(activeClient.id, newWeek)
  }

  async function saveHabit() {
    if (!habitForm.habit.trim()) return
    setSavingHabit(true); setHabitSaved(false)
    const { error } = await supabase.from('client_habits').upsert({ client_id: activeClient.id, week: nutWeek, habit: habitForm.habit, why_note: habitForm.why_note, confidence: habitForm.confidence }, { onConflict: 'client_id,week' })
    if (!error) setHabitSaved(true)
    setSavingHabit(false)
  }

  async function addSymptom() {
    if (!newSymptomInput.trim()) return
    const { data, error } = await supabase.from('client_symptoms').insert({ client_id: activeClient.id, symptom_name: newSymptomInput.trim(), display_order: clientSymptoms.length }).select()
    if (!error && data?.[0]) { setClientSymptoms([...clientSymptoms, data[0]]); setNewSymptomInput('') }
  }

  async function removeSymptom(id) {
    await supabase.from('client_symptoms').update({ active: false }).eq('id', id)
    setClientSymptoms(clientSymptoms.filter(s => s.id !== id))
  }

  async function saveCallNotes() {
    setSavingCallNotes(true); setCallNotesSaved(false)
    const { error } = await supabase.from('call_notes').upsert({ client_id: activeClient.id, week: nutWeek, notes: callNotesText, updated_at: new Date().toISOString() }, { onConflict: 'client_id,week' })
    if (!error) setCallNotesSaved(true)
    setSavingCallNotes(false)
  }

  async function loadPlan(clientId, week) {
    setPlanLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', true).eq('week', week).order('id')
    if (sessions && sessions.length > 0) {
      const { data: exercises } = await supabase.from('exercises').select('*').in('session_id', sessions.map(s => s.id)).order('order')
      setPlanSessions(sessions.map(s => ({ ...s, exercises: exercises?.filter(e => e.session_id === s.id) || [] })))
    } else { setPlanSessions([]) }
    setPlanLoading(false)
  }

  async function loadSessionHistory(clientId) {
    setHistoryLoading(true)
    const { data: sessions } = await supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', false).order('id', { ascending: false })
    if (sessions && sessions.length > 0) {
      const { data: exercises } = await supabase.from('exercises').select('*').in('session_id', sessions.map(s => s.id)).order('order')
      const { data: logs } = await supabase.from('session_logs').select('*').in('session_id', sessions.map(s => s.id))
      const { data: weightLogs } = await supabase.from('exercise_logs').select('*').in('exercise_id', exercises?.map(e => e.id) || [])
      setSessionHistory(sessions.map(s => ({ ...s, exercises: (exercises?.filter(e => e.session_id === s.id) || []).map(ex => ({ ...ex, weights: weightLogs?.filter(w => w.exercise_id === ex.id).sort((a, b) => a.set_number - b.set_number) || [] })), log: logs?.find(l => l.session_id === s.id) || null })))
    } else { setSessionHistory([]) }
    setHistoryLoading(false)
  }

  async function openClient(client) {
    const currentWeek = getCurrentWeek(client.start_date)
    setActiveClient(client); setScreen('client'); setTab('plan'); setExpandedDay(null)
    setPlanWeek(currentWeek); setNutWeek(currentWeek); setNutritionTab('checkins')
    loadPlan(client.id, currentWeek); loadSessionHistory(client.id)
    loadNutritionData(client.id); loadNutWeekData(client.id, currentWeek)
    const { data: msgs } = await supabase.from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: true })
    if (msgs) {
      setMessages(msgs.map(m => ({ from: m.from_coach ? 'coach' : 'client', text: m.content, time: new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })))
      const unreadIds = msgs.filter(m => !m.from_coach && !m.read).map(m => m.id)
      if (unreadIds.length > 0) { await supabase.from('messages').update({ read: true }).in('id', unreadIds); setUnreadCount(prev => Math.max(0, prev - unreadIds.length)) }
    }
  }

  function changePlanWeek(newWeek) {
    if (newWeek < 1 || newWeek > (activeClient.programme_length || 12)) return
    setPlanWeek(newWeek); loadPlan(activeClient.id, newWeek); setExpandedDay(null)
  }

  async function saveProgrammeSettings() {
    await supabase.from('clients').update({ programme_length: parseInt(programmeForm.programme_length), start_date: programmeForm.start_date }).eq('id', activeClient.id)
    const updated = { ...activeClient, programme_length: parseInt(programmeForm.programme_length), start_date: programmeForm.start_date, currentWeek: getCurrentWeek(programmeForm.start_date), meta: `Week ${getCurrentWeek(programmeForm.start_date)} of ${programmeForm.programme_length} · ${activeClient.programme}` }
    setActiveClient(updated); setClients(clients.map(c => c.id === activeClient.id ? updated : c))
    setEditingProgramme(false); setPlanWeek(getCurrentWeek(programmeForm.start_date))
    loadPlan(activeClient.id, getCurrentWeek(programmeForm.start_date))
  }

  async function addClient() {
    if (!newClientForm.name.trim() || !newClientForm.email.trim() || !newClientForm.password.trim()) { setAddClientError('Name, email and password are required'); return }
    setAddingClient(true); setAddClientError('')
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: newClientForm.email, password: newClientForm.password })
    if (authError) { setAddClientError(authError.message); setAddingClient(false); return }
    const startDate = newClientForm.start_date || new Date().toISOString().split('T')[0]
    const { data: clientData, error: clientError } = await supabase.from('clients').insert({ name: newClientForm.name, email: newClientForm.email, programme: newClientForm.programme || 'General programme', week: 1, start_date: startDate, programme_length: parseInt(newClientForm.programme_length) || 12, user_id: authData.user.id }).select()
    if (clientError) { setAddClientError(clientError.message); setAddingClient(false); return }
    const c = clientData[0]
    setClients([...clients, { ...c, initials: c.name.split(' ').map(n => n[0]).join(''), colour: colours[clients.length % colours.length], currentWeek: getCurrentWeek(startDate), meta: `Week ${getCurrentWeek(startDate)} of ${c.programme_length} · ${c.programme}`, status: 'On track' }])
    setShowAddClient(false); setNewClientForm({ name: '', email: '', password: '', programme: '', start_date: '', programme_length: 12 }); setAddingClient(false)
  }

  async function addSession() {
    if (!newSessionForm.title.trim()) return
    const { data, error } = await supabase.from('sessions').insert({ client_id: activeClient.id, week: planWeek, day: addingSessionDay, type: newSessionForm.type, title: newSessionForm.title, goal: newSessionForm.goal, prescribed: true }).select()
    if (!error && data?.[0]) { setPlanSessions([...planSessions, { ...data[0], exercises: [] }]); setAddingSessionDay(null); setNewSessionForm({ type: 'strength', title: '', goal: '' }) }
  }

  async function deleteSession(sessionId) {
    await supabase.from('exercises').delete().eq('session_id', sessionId)
    await supabase.from('sessions').delete().eq('id', sessionId)
    setPlanSessions(planSessions.filter(s => s.id !== sessionId))
  }

  async function addExercise(sessionId) {
    if (!newExerciseForm.name.trim()) return
    const session = planSessions.find(s => s.id === sessionId)
    const { data, error } = await supabase.from('exercises').insert({ session_id: sessionId, name: newExerciseForm.name, sets: parseInt(newExerciseForm.sets) || 3, reps: parseInt(newExerciseForm.reps) || 10, tempo: newExerciseForm.tempo || null, notes: newExerciseForm.notes || null, superset: newExerciseForm.superset || null, order: session.exercises.length }).select()
    if (!error && data?.[0]) { setPlanSessions(planSessions.map(s => s.id === sessionId ? { ...s, exercises: [...s.exercises, data[0]] } : s)); setAddingExerciseSession(null); setNewExerciseForm({ name: '', sets: 3, reps: 10, tempo: '', notes: '', superset: '' }) }
  }

  async function deleteExercise(sessionId, exerciseId) {
    await supabase.from('exercises').delete().eq('id', exerciseId)
    setPlanSessions(planSessions.map(s => s.id === sessionId ? { ...s, exercises: s.exercises.filter(e => e.id !== exerciseId) } : s))
  }

  async function sendMessage() {
    if (!msgInput.trim()) return
    const { error } = await supabase.from('messages').insert({ client_id: activeClient.id, from_coach: true, content: msgInput, read: true })
    if (!error) {
      setMessages([...messages, { from: 'coach', text: msgInput, time: 'just now' }]); setMsgInput('')
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-message`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ record: { content: msgInput, from_coach: true, client_email: activeClient.email } }) })
    }
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = '/login' }

  if (!authed) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Loading…</div></div>

  if (screen === 'dashboard') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <div className="flex justify-center mb-3"><Logo /></div>
          <div className="flex justify-end items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">PR</div>
            <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[['Active clients', clients.length.toString()], ['Check-ins this week', checkinsThisWeek.toString()], ['Unread messages', unreadCount.toString()]].map(([label, value]) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="text-2xl font-medium">{value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-500">Your clients</div>
          <button onClick={() => setShowAddClient(!showAddClient)} className="text-xs font-medium text-blue-600 hover:text-blue-800">+ Add client</button>
        </div>
        {showAddClient && (
          <div className="border border-blue-100 rounded-xl p-4 mb-4 bg-blue-50">
            <div className="text-xs font-medium text-gray-600 mb-3">New client</div>
            <div className="flex flex-col gap-2">
              <input value={newClientForm.name} onChange={e => setNewClientForm({...newClientForm, name: e.target.value})} placeholder="Full name" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" />
              <input type="email" value={newClientForm.email} onChange={e => setNewClientForm({...newClientForm, email: e.target.value})} placeholder="Email address" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" />
              <input type="password" value={newClientForm.password} onChange={e => setNewClientForm({...newClientForm, password: e.target.value})} placeholder="Temporary password" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" />
              <input value={newClientForm.programme} onChange={e => setNewClientForm({...newClientForm, programme: e.target.value})} placeholder="Programme name" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" />
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-gray-500 mb-1">Start date</div><input type="date" value={newClientForm.start_date} onChange={e => setNewClientForm({...newClientForm, start_date: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" /></div>
                <div><div className="text-xs text-gray-500 mb-1">Length (weeks)</div><input type="number" value={newClientForm.programme_length} onChange={e => setNewClientForm({...newClientForm, programme_length: e.target.value})} min="1" max="52" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none text-center bg-white" /></div>
              </div>
              {addClientError && <div className="text-xs text-red-500">{addClientError}</div>}
              <div className="flex gap-2 mt-1">
                <button onClick={addClient} disabled={addingClient} className="flex-1 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50">{addingClient ? 'Adding…' : 'Add client'}</button>
                <button onClick={() => { setShowAddClient(false); setAddClientError('') }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white">Cancel</button>
              </div>
            </div>
          </div>
        )}
        {loading ? <div className="text-sm text-gray-400 py-8 text-center">Loading clients…</div>
        : clients.length === 0 ? <div className="text-sm text-gray-400 py-8 text-center">No clients yet — add one above</div>
        : (
          <div className="flex flex-col gap-2">
            {clients.map(c => (
              <div key={c.id} onClick={() => openClient(c)} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${c.colour}`}>{c.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.meta}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-md font-medium bg-green-100 text-green-700">{c.status}</span>
                <span className="text-gray-400">›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const progLength = activeClient.programme_length || 12
  const currentWeek = getCurrentWeek(activeClient.start_date)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => setScreen('dashboard')} className="text-sm text-gray-500 mb-5 flex items-center gap-1 hover:text-gray-800">← All clients</button>
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-medium flex-shrink-0 ${activeClient.colour}`}>{activeClient.initials}</div>
        <div className="flex-1">
          <div className="text-lg font-medium">{activeClient.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">{activeClient.programme} · {progLength} weeks</div>
          <div className="text-xs text-gray-400 mt-0.5">Currently week {currentWeek} · started {activeClient.start_date ? new Date(activeClient.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'no start date'}</div>
        </div>
        <button onClick={() => { setEditingProgramme(!editingProgramme); setProgrammeForm({ programme_length: activeClient.programme_length || 12, start_date: activeClient.start_date || '' }) }} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:text-gray-600 hover:border-gray-300 transition-colors">Edit</button>
      </div>

      {editingProgramme && (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-3">Programme settings</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><div className="text-xs text-gray-500 mb-1">Start date</div><input type="date" value={programmeForm.start_date} onChange={e => setProgrammeForm({...programmeForm, start_date: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" /></div>
            <div><div className="text-xs text-gray-500 mb-1">Length (weeks)</div><input type="number" value={programmeForm.programme_length} onChange={e => setProgrammeForm({...programmeForm, programme_length: e.target.value})} min="1" max="52" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none text-center bg-white" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveProgrammeSettings} className="flex-1 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700">Save</button>
            <button onClick={() => setEditingProgramme(false)} className="px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg bg-white">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {[['plan','Training plan'],['editplan','Edit plan'],['history','Session history'],['nutrition','Nutrition'],['messages','Messages']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'plan' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changePlanWeek(planWeek - 1)} disabled={planWeek <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
            <div className="text-center">
              <div className="text-sm font-medium">Week {planWeek} of {progLength}</div>
              {planWeek === currentWeek && <div className="text-xs text-green-600 font-medium">Current week</div>}
              {planWeek < currentWeek && <div className="text-xs text-gray-400">Past week</div>}
              {planWeek > currentWeek && <div className="text-xs text-blue-500">Upcoming</div>}
            </div>
            <button onClick={() => changePlanWeek(planWeek + 1)} disabled={planWeek >= progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
          </div>
          {planLoading ? <div className="text-sm text-gray-400 text-center py-8">Loading plan…</div>
          : planSessions.length === 0 ? <div className="text-sm text-gray-400 text-center py-8">No plan for week {planWeek} yet</div>
          : (
            <div className="flex flex-col gap-1.5">
              {days.map(day => {
                const daySessions = planSessions.filter(s => s.day === day)
                return (
                  <div key={day}>
                    {daySessions.length === 0 ? (
                      <div className="flex gap-3 p-3.5 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="text-xs font-medium text-gray-400 w-8">{day}</div>
                        <span className="text-sm text-gray-400">Rest</span>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <button onClick={() => setExpandedDay(expandedDay === day ? null : day)} className="w-full flex gap-3 p-3.5 bg-white hover:bg-gray-50 transition-colors text-left">
                          <div className="text-xs font-medium text-gray-400 w-8 pt-0.5 flex-shrink-0">{day}</div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            {daySessions.map((s, si) => (
                              <div key={si} className="flex gap-2 items-center">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${s.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{s.type === 'strength' ? 'Strength' : 'Run'}</span>
                                <span className="text-sm font-medium">{s.title}</span>
                              </div>
                            ))}
                          </div>
                          <span className="text-gray-400 text-xs">{expandedDay === day ? '▲' : '▼'}</span>
                        </button>
                        {expandedDay === day && (
                          <div className="border-t border-gray-100">
                            {daySessions.map((session, si) => (
                              <div key={si} className={`p-4 ${si > 0 ? 'border-t border-gray-100' : ''}`}>
                                {session.goal && <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-100"><div className="text-xs font-medium text-amber-700 mb-1">Session goal</div><div className="text-sm text-amber-900">{session.goal}</div></div>}
                                <div className="flex flex-col gap-2">
                                  {session.exercises.map((ex, exIdx) => (
                                    <div key={exIdx} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div><span className="text-sm font-medium">{ex.name}</span>{ex.superset && <span className="text-xs text-purple-600 ml-2 font-medium">SS {ex.superset}</span>}</div>
                                        <div className="flex gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                          <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">{ex.sets} sets</span>
                                          <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">{ex.reps} reps</span>
                                          {ex.tempo && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">{ex.tempo}</span>}
                                        </div>
                                      </div>
                                      {ex.notes && <div className="text-xs text-gray-500 italic mt-1">{ex.notes}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'editplan' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { const nw = Math.max(1, planWeek-1); setPlanWeek(nw); loadPlan(activeClient.id, nw) }} disabled={planWeek <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
            <div className="text-sm font-medium text-gray-700">Editing week {planWeek} of {progLength}</div>
            <button onClick={() => { const nw = Math.min(progLength, planWeek+1); setPlanWeek(nw); loadPlan(activeClient.id, nw) }} disabled={planWeek >= progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
          </div>
          {days.map(day => {
            const daySessions = planSessions.filter(s => s.day === day)
            return (
              <div key={day} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{day}</span>
                  {addingSessionDay !== day && <button onClick={() => { setAddingSessionDay(day); setNewSessionForm({ type: 'strength', title: '', goal: '' }) }} className="text-xs text-blue-600 hover:text-blue-800">+ Add session</button>}
                </div>
                {daySessions.map(session => (
                  <div key={session.id} className="border border-gray-200 rounded-xl p-3 mb-2 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${session.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{session.type === 'strength' ? 'Strength' : 'Run'}</span>
                        <span className="text-sm font-medium">{session.title}</span>
                      </div>
                      <button onClick={() => deleteSession(session.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                    {session.goal && <div className="text-xs text-gray-400 italic mb-2">{session.goal}</div>}
                    <div className="flex flex-col gap-1 mb-2">
                      {session.exercises.map(ex => (
                        <div key={ex.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{ex.name}</span>
                            {ex.superset && <span className="text-xs text-purple-600 ml-1.5 font-medium">SS {ex.superset}</span>}
                            <span className="text-xs text-gray-400 ml-1.5">{ex.sets}×{ex.reps}</span>
                            {ex.tempo && <span className="text-xs text-gray-400 ml-1.5">{ex.tempo}</span>}
                            {ex.notes && <span className="text-xs text-gray-400 ml-1.5 italic">— {ex.notes}</span>}
                          </div>
                          <button onClick={() => deleteExercise(session.id, ex.id)} className="text-gray-400 hover:text-red-500 ml-2 text-lg leading-none">×</button>
                        </div>
                      ))}
                    </div>
                    {addingExerciseSession === session.id ? (
                      <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2 mt-2">
                        <input value={newExerciseForm.name} onChange={e => setNewExerciseForm({...newExerciseForm, name: e.target.value})} placeholder="Exercise name" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-white" />
                        <div className="grid grid-cols-3 gap-2">
                          <div><div className="text-xs text-gray-500 mb-1">Sets</div><input type="number" value={newExerciseForm.sets} onChange={e => setNewExerciseForm({...newExerciseForm, sets: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-center bg-white" /></div>
                          <div><div className="text-xs text-gray-500 mb-1">Reps</div><input type="number" value={newExerciseForm.reps} onChange={e => setNewExerciseForm({...newExerciseForm, reps: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-center bg-white" /></div>
                          <div><div className="text-xs text-gray-500 mb-1">Tempo</div><input value={newExerciseForm.tempo} onChange={e => setNewExerciseForm({...newExerciseForm, tempo: e.target.value})} placeholder="3-1-1" className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none text-center bg-white" /></div>
                        </div>
                        <input value={newExerciseForm.notes} onChange={e => setNewExerciseForm({...newExerciseForm, notes: e.target.value})} placeholder="Coach notes (optional)" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-white" />
                        <input value={newExerciseForm.superset} onChange={e => setNewExerciseForm({...newExerciseForm, superset: e.target.value})} placeholder="Superset group e.g. A or B" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-white" />
                        <div className="flex gap-2">
                          <button onClick={() => addExercise(session.id)} className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700">Add exercise</button>
                          <button onClick={() => setAddingExerciseSession(null)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg bg-white">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingExerciseSession(session.id); setNewExerciseForm({ name: '', sets: 3, reps: 10, tempo: '', notes: '', superset: '' }) }} className="text-xs text-gray-500 hover:text-gray-700 mt-1">+ Add exercise</button>
                    )}
                  </div>
                ))}
                {addingSessionDay === day && (
                  <div className="border border-blue-100 rounded-xl p-3 mb-2 bg-blue-50">
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => setNewSessionForm({...newSessionForm, type: 'strength'})} className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${newSessionForm.type === 'strength' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200'}`}>Strength</button>
                      <button onClick={() => setNewSessionForm({...newSessionForm, type: 'run'})} className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${newSessionForm.type === 'run' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200'}`}>Run</button>
                    </div>
                    <input value={newSessionForm.title} onChange={e => setNewSessionForm({...newSessionForm, title: e.target.value})} placeholder="Session title" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none mb-2 bg-white" />
                    <input value={newSessionForm.goal} onChange={e => setNewSessionForm({...newSessionForm, goal: e.target.value})} placeholder="Session goal (optional)" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none mb-2 bg-white" />
                    <div className="flex gap-2">
                      <button onClick={addSession} className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700">Add session</button>
                      <button onClick={() => setAddingSessionDay(null)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg bg-white">Cancel</button>
                    </div>
                  </div>
                )}
                {daySessions.length === 0 && addingSessionDay !== day && <div className="text-xs text-gray-300 py-1">Rest day</div>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-4">Completed sessions</div>
          {historyLoading ? <div className="text-sm text-gray-400 text-center py-8">Loading…</div>
          : sessionHistory.length === 0 ? <div className="text-sm text-gray-400 text-center py-8">No completed sessions yet</div>
          : (
            <div className="flex flex-col gap-3">
              {sessionHistory.map((session, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${session.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{session.type === 'strength' ? 'Strength' : 'Run'}</span>
                      <span className="text-sm font-medium">{session.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Wk {session.week} · {session.day}</span>
                      {session.log?.rpe && <span className={`text-xs font-medium px-2 py-0.5 rounded ${session.log.rpe <= 4 ? 'bg-green-100 text-green-700' : session.log.rpe <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>RPE {session.log.rpe}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {session.exercises.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between"><span className="text-sm font-medium">{ex.name}</span><span className="text-xs text-gray-400">{ex.sets}×{ex.reps}</span></div>
                        {ex.weights.length > 0 && (
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {ex.weights.map((w, wi) => (
                              <div key={wi} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5"><span className="text-gray-400">S{w.set_number} </span><span className="font-medium">{w.weight}kg</span></div>
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

      {tab === 'nutrition' && (
        <div>
          <div className="flex gap-2 mb-5 flex-wrap">
            {[['checkins','Check-ins'],['habit','Habit'],['symptoms','Symptoms'],['intake','Intake form'],['notes','Call notes']].map(([key, label]) => (
              <button key={key} onClick={() => setNutritionTab(key)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${nutritionTab === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{label}</button>
            ))}
          </div>

          {nutritionTab === 'checkins' && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-4">All check-ins — most recent first</div>
              {checkinsLoading ? <div className="text-sm text-gray-400 text-center py-8">Loading…</div>
              : allCheckins.length === 0 ? <div className="text-sm text-gray-400 text-center py-8">No check-ins yet — they'll appear here once {activeClient.name.split(' ')[0]} starts checking in</div>
              : allCheckins.map((ci, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium">Week {ci.week}</div>
                      <div className="text-xs text-gray-400">{getWeekDates(activeClient.start_date, ci.week)}</div>
                    </div>
                    {ci.habit_completion && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${ci.habit_completion === 'yes' ? 'bg-green-100 text-green-700' : ci.habit_completion === 'mostly' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {ci.habit_completion === 'yes' ? '✓ Nailed it' : ci.habit_completion === 'mostly' ? '~ Mostly' : '✗ Struggled'}
                      </span>
                    )}
                  </div>
                  {(ci.energy_morning || ci.energy_afternoon || ci.energy_evening || ci.mood || ci.sleep_quality) && (
                    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
                      {ci.energy_morning && <div className="text-xs text-gray-500">☀️ Morning <span className="font-medium text-gray-800">{ci.energy_morning}/5</span></div>}
                      {ci.energy_afternoon && <div className="text-xs text-gray-500">🌤 Afternoon <span className="font-medium text-gray-800">{ci.energy_afternoon}/5</span></div>}
                      {ci.energy_evening && <div className="text-xs text-gray-500">🌙 Evening <span className="font-medium text-gray-800">{ci.energy_evening}/5</span></div>}
                      {ci.mood && <div className="text-xs text-gray-500">Mood <span className="font-medium text-gray-800">{ci.mood}/5</span></div>}
                      {ci.sleep_quality && <div className="text-xs text-gray-500">Sleep <span className="font-medium text-gray-800">{ci.sleep_quality}/5</span></div>}
                    </div>
                  )}
                  {ci.symptom_scores && Object.keys(ci.symptom_scores).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-gray-100">
                      {Object.entries(ci.symptom_scores).map(([name, score]) => (
                        <span key={name} className="text-xs px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">{name}: <span className="font-medium">{score}/5</span></span>
                      ))}
                    </div>
                  )}
                  {(ci.breakfast || ci.lunch || ci.dinner || ci.snacks) && (
                    <div className="flex flex-col gap-1 mb-3 pb-3 border-b border-gray-100">
                      {[['Breakfast', ci.breakfast], ['Lunch', ci.lunch], ['Dinner', ci.dinner], ['Snacks', ci.snacks]].filter(([, v]) => v).map(([label, val]) => (
                        <div key={label} className="flex gap-2">
                          <span className="text-xs font-medium text-gray-400 w-16 flex-shrink-0 pt-0.5">{label}</span>
                          <span className="text-sm text-gray-700">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {ci.habit_notes && <div><span className="text-xs font-medium text-gray-500">Habit notes: </span><span className="text-xs text-gray-700">{ci.habit_notes}</span></div>}
                    {ci.went_well && <div><span className="text-xs font-medium text-gray-500">Went well: </span><span className="text-xs text-gray-700">{ci.went_well}</span></div>}
                    {ci.was_hard && <div><span className="text-xs font-medium text-gray-500">Was hard: </span><span className="text-xs text-gray-700">{ci.was_hard}</span></div>}
                    {ci.want_to_discuss && <div className="bg-amber-50 rounded-lg p-2 border border-amber-100"><span className="text-xs font-medium text-amber-700">Wants to discuss: </span><span className="text-xs text-amber-900">{ci.want_to_discuss}</span></div>}
                    {ci.new_symptoms_notes && <div className="bg-red-50 rounded-lg p-2 border border-red-100"><span className="text-xs font-medium text-red-700">New symptoms: </span><span className="text-xs text-red-900">{ci.new_symptoms_notes}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nutritionTab === 'habit' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeNutWeek(nutWeek - 1)} disabled={nutWeek <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
                <div className="text-sm font-medium text-gray-700">Week {nutWeek} habit</div>
                <button onClick={() => changeNutWeek(nutWeek + 1)} disabled={nutWeek >= progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1.5">The habit</div>
                  <input value={habitForm.habit} onChange={e => setHabitForm({...habitForm, habit: e.target.value})} placeholder="e.g. Eat a proper lunch before 1pm every weekday" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 bg-white" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1.5">Why you've set this habit <span className="font-normal text-gray-400">(shown to {activeClient.name.split(' ')[0]})</span></div>
                  <textarea value={habitForm.why_note} onChange={e => setHabitForm({...habitForm, why_note: e.target.value})} placeholder="A short explanation of why this matters for them right now..." rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 bg-white resize-none" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-2">How confident are you they can do this? ({habitForm.confidence}/10)</div>
                  <div className="text-xs text-gray-400 mb-2">Aim for 9–10 — if lower, make the habit smaller</div>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setHabitForm({...habitForm, confidence: n})} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${habitForm.confidence === n ? (n >= 9 ? 'bg-green-100 text-green-700 border-green-300' : n >= 7 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                {habitSaved ? (
                  <div className="text-sm text-green-600 font-medium text-center py-1">Habit saved ✓</div>
                ) : (
                  <button onClick={saveHabit} disabled={savingHabit || !habitForm.habit.trim()} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">{savingHabit ? 'Saving…' : 'Save habit'}</button>
                )}
              </div>
            </div>
          )}

          {nutritionTab === 'symptoms' && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Symptoms to track for {activeClient.name.split(' ')[0]}</div>
              <div className="text-xs text-gray-400 mb-4">These will appear as 1–5 rating questions in their weekly check-in</div>
              {clientSymptoms.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-gray-100 mb-4">No symptoms set yet — add some below</div>
              ) : (
                <div className="flex flex-col gap-1.5 mb-4">
                  {clientSymptoms.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                      <span className="text-sm text-gray-700">{s.symptom_name}</span>
                      <button onClick={() => removeSymptom(s.id)} className="text-gray-400 hover:text-red-500 text-lg leading-none ml-2">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={newSymptomInput} onChange={e => setNewSymptomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSymptom()} placeholder="Add symptom e.g. Hot flushes, Brain fog, Bloating..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white" />
                <button onClick={addSymptom} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700">Add</button>
              </div>
            </div>
          )}

          {nutritionTab === 'intake' && (
            <div>
              {!intakeFormData ? (
                <div className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                  No intake form submitted yet — send {activeClient.name.split(' ')[0]} a link to fill it in
                </div>
              ) : (
                <div>
                  <div className="text-xs text-gray-400 mb-4">Submitted {new Date(intakeFormData.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="flex flex-col gap-4">
                    {intakeFields.map(field => (
                      intakeFormData[field.key] ? (
                        <div key={field.key}>
                          <div className="text-xs font-medium text-gray-500 mb-1">{field.label}</div>
                          <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">{intakeFormData[field.key]}</div>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {nutritionTab === 'notes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeNutWeek(nutWeek - 1)} disabled={nutWeek <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
                <div className="text-sm font-medium text-gray-700">Week {nutWeek} call notes</div>
                <button onClick={() => changeNutWeek(nutWeek + 1)} disabled={nutWeek >= progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
              </div>
              <div className="text-xs text-gray-400 mb-2">Private — only visible to you</div>
              <textarea value={callNotesText} onChange={e => { setCallNotesText(e.target.value); setCallNotesSaved(false) }} placeholder={`Notes from your week ${nutWeek} session with ${activeClient.name.split(' ')[0]}…\n\nWhat did you discuss? What did you agree? What to watch next week?`} rows={10} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none bg-white mb-3" />
              {callNotesSaved ? (
                <div className="text-sm text-green-600 font-medium text-center py-1">Notes saved ✓</div>
              ) : (
                <button onClick={saveCallNotes} disabled={savingCallNotes} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">{savingCallNotes ? 'Saving…' : 'Save notes'}</button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div>
          <div className="flex flex-col gap-3 mb-4">
            {messages.length === 0 ? <div className="text-sm text-gray-400 text-center py-8">No messages yet</div>
            : messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.from === 'coach' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.from === 'coach' ? 'bg-blue-100 text-blue-900 rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>{m.text}</div>
                <div className="text-xs text-gray-400 mt-1">{m.from === 'coach' ? 'You' : activeClient.name.split(' ')[0]} · {m.time}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={`Reply to ${activeClient.name.split(' ')[0]}…`} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
            <button onClick={sendMessage} className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors">Send</button>
          </div>
        </div>
      )}
    </div>
  )
}