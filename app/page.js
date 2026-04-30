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
  const [diariesToday, setDiariesToday] = useState(0)
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
  // Nutrition state
  const [nutritionSubTab, setNutritionSubTab] = useState('habit')
  const [clientSymptoms, setClientSymptoms] = useState([])
  const [newSymptom, setNewSymptom] = useState('')
  const [weekHabit, setWeekHabit] = useState(null)
  const [habitForm, setHabitForm] = useState({ habit_text: '', context_note: '' })
  const [habitSaved, setHabitSaved] = useState(false)
  const [checkins, setCheckins] = useState([])
  const [expandedCheckin, setExpandedCheckin] = useState(null)
  const [callNotes, setCallNotes] = useState([])
  const [newCallNote, setNewCallNote] = useState({ note_date: new Date().toISOString().split('T')[0], notes: '' })
  const [intakeData, setIntakeData] = useState(null)
  const [nutritionLoaded, setNutritionLoaded] = useState(false)

  const colours = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-pink-100 text-pink-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700']
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setAuthed(true)
      supabase.from('clients').select('*').then(({ data, error }) => {
        if (!error) setClients(data.map((c, i) => ({ ...c, initials: c.name.split(' ').map(n => n[0]).join(''), colour: colours[i % colours.length], currentWeek: getCurrentWeek(c.start_date), meta: `Week ${getCurrentWeek(c.start_date)} of ${c.programme_length || 12} · ${c.programme}`, status: 'On track' })))
        setLoading(false)
      })
      const today = new Date().toISOString().split('T')[0]
      supabase.from('messages').select('id', { count: 'exact' }).eq('from_coach', false).eq('read', false).then(({ count }) => setUnreadCount(count || 0))
      supabase.from('weekly_checkins').select('id', { count: 'exact' }).eq('week', 1).then() // placeholder
      supabase.from('diary_entries').select('id', { count: 'exact' }).eq('date', today).then(({ count }) => setDiariesToday(count || 0))
    })
  }, [])

  async function loadNutritionData(clientId, week) {
    setNutritionLoaded(false)
    const [symsRes, habitRes, checkinsRes, notesRes, intakeRes] = await Promise.all([
      supabase.from('client_symptoms').select('*').eq('client_id', clientId).order('created_at'),
      supabase.from('client_habits').select('*').eq('client_id', clientId).eq('week', week).maybeSingle(),
      supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('week', { ascending: false }),
      supabase.from('call_notes').select('*').eq('client_id', clientId).order('note_date', { ascending: false }),
      supabase.from('intake_forms').select('*').eq('client_id', clientId).maybeSingle()
    ])
    if (symsRes.data) setClientSymptoms(symsRes.data)
    if (habitRes.data) { setWeekHabit(habitRes.data); setHabitForm({ habit_text: habitRes.data.habit_text, context_note: habitRes.data.context_note || '' }) }
    else { setWeekHabit(null); setHabitForm({ habit_text: '', context_note: '' }) }
    if (checkinsRes.data) setCheckins(checkinsRes.data)
    if (notesRes.data) setCallNotes(notesRes.data)
    if (intakeRes.data) setIntakeData(intakeRes.data)
    else setIntakeData(null)
    setNutritionLoaded(true)
  }

  async function addSymptom() {
    if (!newSymptom.trim()) return
    const { data, error } = await supabase.from('client_symptoms').insert({ client_id: activeClient.id, name: newSymptom.trim() }).select().single()
    if (!error && data) { setClientSymptoms([...clientSymptoms, data]); setNewSymptom('') }
  }

  async function removeSymptom(id) {
    await supabase.from('client_symptoms').delete().eq('id', id)
    setClientSymptoms(clientSymptoms.filter(s => s.id !== id))
  }

  async function saveHabit() {
    if (!habitForm.habit_text.trim()) return
    setHabitSaved(false)
    const currentWeek = getCurrentWeek(activeClient.start_date)
    if (weekHabit) {
      await supabase.from('client_habits').update({ habit_text: habitForm.habit_text, context_note: habitForm.context_note }).eq('id', weekHabit.id)
      setWeekHabit({ ...weekHabit, ...habitForm })
    } else {
      const { data } = await supabase.from('client_habits').insert({ client_id: activeClient.id, week: currentWeek, ...habitForm }).select().single()
      if (data) setWeekHabit(data)
    }
    setHabitSaved(true)
    setTimeout(() => setHabitSaved(false), 2000)
  }

  async function saveCallNote() {
    if (!newCallNote.notes.trim()) return
    const { data, error } = await supabase.from('call_notes').insert({ client_id: activeClient.id, ...newCallNote }).select().single()
    if (!error && data) { setCallNotes([data, ...callNotes]); setNewCallNote({ note_date: new Date().toISOString().split('T')[0], notes: '' }) }
  }

  async function deleteCallNote(id) {
    await supabase.from('call_notes').delete().eq('id', id)
    setCallNotes(callNotes.filter(n => n.id !== id))
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
      setSessionHistory(sessions.map(s => ({ ...s, exercises: (exercises?.filter(e => e.session_id === s.id)||[]).map(ex => ({ ...ex, weights: weightLogs?.filter(w => w.exercise_id === ex.id).sort((a,b) => a.set_number - b.set_number)||[] })), log: logs?.find(l => l.session_id === s.id)||null })))
    } else { setSessionHistory([]) }
    setHistoryLoading(false)
  }

  async function openClient(client) {
    const currentWeek = getCurrentWeek(client.start_date)
    setActiveClient(client); setScreen('client'); setTab('plan'); setExpandedDay(null)
    setPlanWeek(currentWeek); setNutritionLoaded(false)
    loadPlan(client.id, currentWeek); loadSessionHistory(client.id)
    const { data: msgs } = await supabase.from('messages').select('*').eq('client_id', client.id).order('created_at', { ascending: true })
    if (msgs) {
      setMessages(msgs.map(m => ({ from: m.from_coach ? 'coach' : 'client', text: m.content, time: new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })))
      const unreadIds = msgs.filter(m => !m.from_coach && !m.read).map(m => m.id)
      if (unreadIds.length > 0) { await supabase.from('messages').update({ read: true }).in('id', unreadIds); setUnreadCount(prev => Math.max(0, prev - unreadIds.length)) }
    }
  }

  function changePlanWeek(newWeek) {
    const progLength = activeClient.programme_length || 12
    if (newWeek < 1 || newWeek > progLength) return
    setPlanWeek(newWeek); loadPlan(activeClient.id, newWeek); setExpandedDay(null)
  }

  async function saveProgrammeSettings() {
    await supabase.from('clients').update({ programme_length: parseInt(programmeForm.programme_length), start_date: programmeForm.start_date }).eq('id', activeClient.id)
    const updated = { ...activeClient, programme_length: parseInt(programmeForm.programme_length), start_date: programmeForm.start_date, currentWeek: getCurrentWeek(programmeForm.start_date), meta: `Week ${getCurrentWeek(programmeForm.start_date)} of ${programmeForm.programme_length} · ${activeClient.programme}` }
    setActiveClient(updated); setClients(clients.map(c => c.id === activeClient.id ? updated : c))
    setEditingProgramme(false); setPlanWeek(getCurrentWeek(programmeForm.start_date)); loadPlan(activeClient.id, getCurrentWeek(programmeForm.start_date))
  }

  async function addClient() {
    if (!newClientForm.name.trim() || !newClientForm.email.trim() || !newClientForm.password.trim()) { setAddClientError('Name, email and password are required'); return }
    setAddingClient(true); setAddClientError('')
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: newClientForm.email, password: newClientForm.password })
    if (authError) { setAddClientError(authError.message); setAddingClient(false); return }
    const startDate = newClientForm.start_date || new Date().toISOString().split('T')[0]
    const { data: clientData, error: clientError } = await supabase.from('clients').insert({ name: newClientForm.name, email: newClientForm.email, programme: newClientForm.programme || 'General programme', week: 1, start_date: startDate, programme_length: parseInt(newClientForm.programme_length) || 12, user_id: authData.user.id }).select().single()
    if (clientError) { setAddClientError(clientError.message); setAddingClient(false); return }
    const newClient = { ...clientData, initials: clientData.name.split(' ').map(n => n[0]).join(''), colour: colours[clients.length % colours.length], currentWeek: getCurrentWeek(startDate), meta: `Week ${getCurrentWeek(startDate)} of ${clientData.programme_length} · ${clientData.programme}`, status: 'On track' }
    setClients([...clients, newClient]); setShowAddClient(false); setNewClientForm({ name: '', email: '', password: '', programme: '', start_date: '', programme_length: 12 }); setAddingClient(false)
  }

  async function addSession() {
    if (!newSessionForm.title.trim()) return
    const { data, error } = await supabase.from('sessions').insert({ client_id: activeClient.id, week: planWeek, day: addingSessionDay, type: newSessionForm.type, title: newSessionForm.title, goal: newSessionForm.goal, prescribed: true }).select().single()
    if (!error && data) { setPlanSessions([...planSessions, { ...data, exercises: [] }]); setAddingSessionDay(null); setNewSessionForm({ type: 'strength', title: '', goal: '' }) }
  }

  async function deleteSession(sessionId) {
    await supabase.from('exercises').delete().eq('session_id', sessionId)
    await supabase.from('sessions').delete().eq('id', sessionId)
    setPlanSessions(planSessions.filter(s => s.id !== sessionId))
  }

  async function addExercise(sessionId) {
    if (!newExerciseForm.name.trim()) return
    const session = planSessions.find(s => s.id === sessionId)
    const { data, error } = await supabase.from('exercises').insert({ session_id: sessionId, name: newExerciseForm.name, sets: parseInt(newExerciseForm.sets)||3, reps: parseInt(newExerciseForm.reps)||10, tempo: newExerciseForm.tempo||null, notes: newExerciseForm.notes||null, superset: newExerciseForm.superset||null, order: session.exercises.length }).select().single()
    if (!error && data) { setPlanSessions(planSessions.map(s => s.id === sessionId ? { ...s, exercises: [...s.exercises, data] } : s)); setAddingExerciseSession(null); setNewExerciseForm({ name: '', sets: 3, reps: 10, tempo: '', notes: '', superset: '' }) }
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
          {[['Active clients', clients.length.toString()], ['Check-ins this week', checkins.length?.toString() || '0'], ['Unread messages', unreadCount.toString()]].map(([label, value]) => (
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
          <div className="text-xs text-gray-400 mt-0.5">Week {currentWeek} · {activeClient.start_date ? `started ${new Date(activeClient.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'no start date set'}</div>
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

      {/* Intake form link */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-amber-700">Intake form</div>
          <div className="text-xs text-amber-600 mt-0.5">{intakeData ? 'Submitted ✓' : 'Not yet submitted'}</div>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/intake?email=${activeClient.email}`); }} className="text-xs text-amber-700 border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-100">Copy link</button>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {[['plan','Training plan'],['editplan','Edit plan'],['history','Session history'],['nutrition','Nutrition'],['messages','Messages']].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); if (key === 'nutrition' && !nutritionLoaded) loadNutritionData(activeClient.id, currentWeek) }} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{label}</button>
        ))}
      </div>

      {tab === 'plan' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changePlanWeek(planWeek-1)} disabled={planWeek<=1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
            <div className="text-center">
              <div className="text-sm font-medium">Week {planWeek} of {progLength}</div>
              {planWeek === currentWeek && <div className="text-xs text-green-600 font-medium">Current week</div>}
              {planWeek < currentWeek && <div className="text-xs text-gray-400">Past week</div>}
              {planWeek > currentWeek && <div className="text-xs text-blue-500">Upcoming week</div>}
            </div>
            <button onClick={() => changePlanWeek(planWeek+1)} disabled={planWeek>=progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
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
                                {session.goal && (
                                  <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                    <div className="text-xs font-medium text-amber-700 mb-1">Session goal</div>
                                    <div className="text-sm text-amber-900">{session.goal}</div>
                                  </div>
                                )}
                                <div className="flex flex-col gap-2">
                                  {session.exercises.map((ex, exIdx) => (
                                    <div key={exIdx} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <span className="text-sm font-medium">{ex.name}</span>
                                          {ex.superset && <span className="text-xs text-purple-600 ml-2 font-medium">SS {ex.superset}</span>}
                                        </div>
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
            <button onClick={() => changePlanWeek(planWeek-1)} disabled={planWeek<=1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
            <div className="text-sm font-medium text-gray-700">Editing week {planWeek} of {progLength}</div>
            <button onClick={() => changePlanWeek(planWeek+1)} disabled={planWeek>=progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
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
                      {session.log?.rpe && <span className={`text-xs font-medium px-2 py-0.5 rounded ${session.log.rpe<=4 ? 'bg-green-100 text-green-700' : session.log.rpe<=7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>RPE {session.log.rpe}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {session.exercises.map((ex, exIdx) => (
                      <div key={exIdx} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{ex.name}</span>
                          <span className="text-xs text-gray-400">{ex.sets}×{ex.reps}</span>
                        </div>
                        {ex.weights.length > 0 && (
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {ex.weights.map((w, wi) => (
                              <div key={wi} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
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

      {tab === 'nutrition' && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-1 mb-5 overflow-x-auto">
            {[['habit','Habit'],['symptoms','Symptoms'],['checkins','Check-ins'],['notes','Call notes'],['intake','Intake']].map(([key, label]) => (
              <button key={key} onClick={() => setNutritionSubTab(key)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${nutritionSubTab === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
            ))}
          </div>

          {!nutritionLoaded && <div className="text-sm text-gray-400 text-center py-8">Loading…</div>}

          {nutritionLoaded && nutritionSubTab === 'habit' && (
            <div>
              <div className="text-xs text-gray-500 mb-4">Setting habit for <strong>week {currentWeek}</strong> (current week)</div>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1.5">Habit</div>
                  <input value={habitForm.habit_text} onChange={e => setHabitForm({...habitForm, habit_text: e.target.value})} placeholder="e.g. Eat lunch before 1pm every day this week" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1.5">Context note for client</div>
                  <textarea value={habitForm.context_note} onChange={e => setHabitForm({...habitForm, context_note: e.target.value})} placeholder="Why are we working on this? What should they keep in mind?" rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                </div>
                <button onClick={saveHabit} className="py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                  {habitSaved ? 'Saved ✓' : weekHabit ? 'Update habit' : 'Set habit'}
                </button>
              </div>
            </div>
          )}

          {nutritionLoaded && nutritionSubTab === 'symptoms' && (
            <div>
              <div className="text-xs text-gray-500 mb-4">These symptoms appear in the client's weekly check-in. Start blank and add what's relevant to this client.</div>
              {clientSymptoms.length === 0 && <div className="text-sm text-gray-400 mb-4">No symptoms added yet</div>}
              <div className="flex flex-col gap-2 mb-4">
                {clientSymptoms.map(sym => (
                  <div key={sym.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                    <span className="text-sm">{sym.name}</span>
                    <button onClick={() => removeSymptom(sym.id)} className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newSymptom} onChange={e => setNewSymptom(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSymptom()} placeholder="e.g. Hot flushes, Brain fog, Bloating…" className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
                <button onClick={addSymptom} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700">Add</button>
              </div>
            </div>
          )}

          {nutritionLoaded && nutritionSubTab === 'checkins' && (
            <div>
              {checkins.length === 0 ? <div className="text-sm text-gray-400 text-center py-8">No check-ins submitted yet</div>
              : (
                <div className="flex flex-col gap-3">
                  {checkins.map((c, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedCheckin(expandedCheckin === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="text-sm font-medium">Week {c.week}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.habit_completion && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.habit_completion}</span>}
                          <span className="text-gray-400 text-xs">{expandedCheckin === i ? '▲' : '▼'}</span>
                        </div>
                      </button>
                      {expandedCheckin === i && (
                        <div className="border-t border-gray-100 p-4 flex flex-col gap-4">
                          {/* Wellbeing */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-2">Wellbeing</div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              {[['energy_morning','Morning energy'],['energy_afternoon','Afternoon energy'],['energy_evening','Evening energy']].map(([key, label]) => (
                                <div key={key} className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400 mb-0.5">{label.replace(' energy','')}</div>
                                  <div className="text-lg font-medium">{c[key] || '—'}</div>
                                  <div className="text-xs text-gray-400">energy</div>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[['mood_rating','Mood'],['sleep_rating','Sleep']].map(([key, label]) => (
                                <div key={key} className="bg-gray-50 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                                  <div className="text-lg font-medium">{c[key] || '—'}<span className="text-xs text-gray-400">/5</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Symptoms */}
                          {clientSymptoms.length > 0 && c.symptom_scores && Object.keys(c.symptom_scores).length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-2">Symptoms</div>
                              <div className="flex flex-col gap-1.5">
                                {clientSymptoms.map(sym => (
                                  <div key={sym.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                                    <span className="text-xs text-gray-600">{sym.name}</span>
                                    <span className="text-sm font-medium">{c.symptom_scores[sym.id] || '—'}<span className="text-xs text-gray-400">/5</span></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Eating */}
                          {(c.breakfast_patterns || c.lunch_patterns || c.dinner_patterns || c.snack_patterns) && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-2">Eating patterns</div>
                              {[['Breakfast', c.breakfast_patterns], ['Lunch', c.lunch_patterns], ['Dinner', c.dinner_patterns], ['Snacks', c.snack_patterns]].filter(([,v]) => v).map(([label, val]) => (
                                <div key={label} className="mb-2">
                                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{val}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Habit */}
                          {c.habit_completion && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-2">Habit</div>
                              <div className="text-sm font-medium text-gray-700 mb-1">{c.habit_completion}</div>
                              {c.habit_reflection && <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{c.habit_reflection}</div>}
                            </div>
                          )}
                          {/* Reflection */}
                          {[['What went well', c.went_well], ['What was hard', c.was_hard], ['Anything new', c.anything_new]].filter(([,v]) => v).map(([label, val]) => (
                            <div key={label}>
                              <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
                              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{val}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {nutritionLoaded && nutritionSubTab === 'notes' && (
            <div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="text-xs font-medium text-gray-600 mb-3">Add call note</div>
                <div className="flex flex-col gap-2">
                  <div><div className="text-xs text-gray-500 mb-1">Date</div><input type="date" value={newCallNote.note_date} onChange={e => setNewCallNote({...newCallNote, note_date: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none bg-white" /></div>
                  <textarea value={newCallNote.notes} onChange={e => setNewCallNote({...newCallNote, notes: e.target.value})} placeholder="What did you discuss? What did you agree? Key observations…" rows={4} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                  <button onClick={saveCallNote} className="py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700">Save note</button>
                </div>
              </div>
              {callNotes.length === 0 ? <div className="text-sm text-gray-400 text-center py-4">No call notes yet</div>
              : (
                <div className="flex flex-col gap-3">
                  {callNotes.map((note, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-500">{new Date(note.note_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <button onClick={() => deleteCallNote(note.id)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.notes}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {nutritionLoaded && nutritionSubTab === 'intake' && (
            <div>
              {!intakeData ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="text-sm font-medium text-amber-700 mb-2">Intake form not yet submitted</div>
                  <div className="text-xs text-amber-600 mb-3">Send this link to {activeClient.name.split(' ')[0]} before their first session:</div>
                  <div className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono break-all mb-3">{typeof window !== 'undefined' ? `${window.location.origin}/intake?email=${activeClient.email}` : `/intake?email=${activeClient.email}`}</div>
                  <button onClick={() => { if (typeof window !== 'undefined') navigator.clipboard.writeText(`${window.location.origin}/intake?email=${activeClient.email}`) }} className="text-xs bg-amber-700 text-white px-3 py-1.5 rounded-lg hover:bg-amber-800">Copy link</button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="text-xs text-green-600 font-medium">Submitted {new Date(intakeData.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  {[
                    { label: 'Reason for seeking support', value: intakeData.reason_for_seeking },
                    { label: 'What they\'ve tried before', value: intakeData.tried_before },
                    { label: 'What success looks like', value: intakeData.success_looks_like },
                    { label: 'Medical conditions', value: intakeData.medical_conditions },
                    { label: 'Medications & supplements', value: intakeData.medications_supplements },
                    { label: 'Hormonal stage', value: intakeData.hormonal_stage },
                    { label: 'Current symptoms', value: intakeData.current_symptoms },
                    { label: 'Typical eating', value: intakeData.typical_eating },
                    { label: 'Meal regularity', value: intakeData.meal_regularity },
                    { label: 'Relationship with food', value: intakeData.relationship_with_food },
                    { label: 'Foods avoided', value: intakeData.foods_avoided },
                    { label: 'Stress level', value: intakeData.stress_level ? `${intakeData.stress_level}/5` : null },
                    { label: 'Sleep', value: intakeData.sleep_quality },
                    { label: 'Exercise', value: intakeData.exercise_description },
                    { label: 'Anything else', value: intakeData.anything_else },
                  ].filter(({ value }) => value).map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
                      <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5">{value}</div>
                    </div>
                  ))}
                </div>
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