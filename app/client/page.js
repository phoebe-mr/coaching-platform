'use client'
import { useState, useEffect } from 'react'
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

function groupExercises(exercises) {
  const groups = []
  let i = 0
  while (i < exercises.length) {
    const ex = exercises[i]
    if (ex.superset) {
      const supersetGroup = [{ ex, idx: i }]
      let j = i + 1
      while (j < exercises.length && exercises[j].superset === ex.superset) { supersetGroup.push({ ex: exercises[j], idx: j }); j++ }
      groups.push({ type: 'superset', label: ex.superset, items: supersetGroup })
      i = j
    } else {
      groups.push({ type: 'single', items: [{ ex, idx: i }] })
      i++
    }
  }
  return groups
}

const ScaleButtons = ({ value, onChange, low = 'Low', high = 'High' }) => (
  <div>
    <div className="flex gap-1.5 mb-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${value === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{n}</button>
      ))}
    </div>
    <div className="flex justify-between text-xs text-gray-400 px-0.5"><span>{low}</span><span>{high}</span></div>
  </div>
)

const MultiChoice = ({ options, value, onChange }) => (
  <div className="flex flex-col gap-2">
    {options.map(opt => (
      <button key={opt} type="button" onClick={() => onChange(opt)} className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${value === opt ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>{opt}</button>
    ))}
  </div>
)

export default function ClientPage() {
  const [tab, setTab] = useState('plan')
  const [plan, setPlan] = useState([])
  const [planLoaded, setPlanLoaded] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [clientData, setClientData] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [sessionHistory, setSessionHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [viewWeek, setViewWeek] = useState(1)
  // Intake form
  const [intakeExists, setIntakeExists] = useState(false)
  const [intakeSaved, setIntakeSaved] = useState(false)
  const [intakeSaving, setIntakeSaving] = useState(false)
  const [intakeForm, setIntakeForm] = useState({
    main_reason: '', tried_before: '', success_looks_like: '',
    medical_conditions: '', medications: '', current_symptoms: '',
    energy_level: 0, typical_eating: '', meal_regularity: '',
    food_relationship: '', foods_avoided: '', stress_level: 0,
    sleep_quality: '', exercise_habits: '', anything_else: ''
  })
  // Check-in
  const [weekHabit, setWeekHabit] = useState(null)
  const [clientSymptoms, setClientSymptoms] = useState([])
  const [checkinExists, setCheckinExists] = useState(false)
  const [checkinSaved, setCheckinSaved] = useState(false)
  const [checkinSaving, setCheckinSaving] = useState(false)
  const [checkin, setCheckin] = useState({
    habit_completion: '', habit_notes: '',
    energy_morning: 0, energy_afternoon: 0, energy_evening: 0,
    mood: 0, sleep_quality: 0, symptom_scores: {},
    new_symptoms_notes: '', breakfast: '', lunch: '', dinner: '', snacks: '',
    went_well: '', was_hard: '', want_to_discuss: ''
  })

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', session.user.id).single().then(async ({ data, error }) => {
        if (error || !data) { window.location.href = '/login'; return }
        setClientData(data)
        setAuthed(true)
        const currentWeek = getCurrentWeek(data.start_date)
        setViewWeek(currentWeek)
        // messages
        supabase.from('messages').select('*').eq('client_id', data.id).order('created_at', { ascending: true }).then(({ data: msgs }) => {
          if (msgs?.length > 0) setMessages(msgs.map(m => ({ from: m.from_coach ? 'coach' : 'client', text: m.content, time: new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })))
        })
        // plan
        await loadPlan(data.id, currentWeek)
        loadHistory(data.id)
        // intake form
        const { data: intakeData } = await supabase.from('intake_forms').select('*').eq('client_id', data.id).limit(1)
        if (intakeData?.[0]) {
          setIntakeExists(true)
          setIntakeSaved(true)
          const d = intakeData[0]
          setIntakeForm({ main_reason: d.main_reason || '', tried_before: d.tried_before || '', success_looks_like: d.success_looks_like || '', medical_conditions: d.medical_conditions || '', medications: d.medications || '', current_symptoms: d.current_symptoms || '', energy_level: d.energy_level || 0, typical_eating: d.typical_eating || '', meal_regularity: d.meal_regularity || '', food_relationship: d.food_relationship || '', foods_avoided: d.foods_avoided || '', stress_level: d.stress_level || 0, sleep_quality: d.sleep_quality || '', exercise_habits: d.exercise_habits || '', anything_else: d.anything_else || '' })
        }
        // habit for current week
        const { data: habitData } = await supabase.from('client_habits').select('*').eq('client_id', data.id).eq('week', currentWeek).limit(1)
        setWeekHabit(habitData?.[0] || null)
        // symptoms
        const { data: symptomsData } = await supabase.from('client_symptoms').select('*').eq('client_id', data.id).eq('active', true).order('display_order')
        setClientSymptoms(symptomsData || [])
        // check-in for current week
        const { data: checkinData } = await supabase.from('weekly_checkins').select('*').eq('client_id', data.id).eq('week', currentWeek).limit(1)
        if (checkinData?.[0]) {
          setCheckinExists(true)
          const c = checkinData[0]
          setCheckin({ habit_completion: c.habit_completion || '', habit_notes: c.habit_notes || '', energy_morning: c.energy_morning || 0, energy_afternoon: c.energy_afternoon || 0, energy_evening: c.energy_evening || 0, mood: c.mood || 0, sleep_quality: c.sleep_quality || 0, symptom_scores: c.symptom_scores || {}, new_symptoms_notes: c.new_symptoms_notes || '', breakfast: c.breakfast || '', lunch: c.lunch || '', dinner: c.dinner || '', snacks: c.snacks || '', went_well: c.went_well || '', was_hard: c.was_hard || '', want_to_discuss: c.want_to_discuss || '' })
        }
      })
    })
  }, [])

  async function loadPlan(clientId, week) {
    setPlanLoaded(false)
    const { data: dbSessions } = await supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', true).eq('week', week).order('id')
    if (dbSessions && dbSessions.length > 0) {
      const { data: dbExercises } = await supabase.from('exercises').select('*').in('session_id', dbSessions.map(s => s.id)).order('order')
      setPlan(days.map(day => ({
        day,
        sessions: dbSessions.filter(s => s.day === day).map(s => ({
          dbId: s.id, type: s.type, title: s.title, goal: s.goal || '',
          exercises: (dbExercises || []).filter(e => e.session_id === s.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(e => ({
            name: e.name, sets: e.sets || 3, reps: e.reps || 10, tempo: e.tempo || '', notes: e.notes || '', superset: e.superset || null,
            weights: Array(e.sets || 3).fill(''), done: false,
          })),
          rpe: '', sessionNotes: '', saved: false, started: false,
        }))
      })))
    } else {
      setPlan(days.map(day => ({ day, sessions: [] })))
    }
    setPlanLoaded(true)
  }

  async function changeViewWeek(newWeek) {
    if (!clientData) return
    const progLength = clientData.programme_length || 12
    if (newWeek < 1 || newWeek > progLength) return
    setViewWeek(newWeek)
    setExpandedDay(null)
    await loadPlan(clientData.id, newWeek)
  }

  async function loadHistory(clientId) {
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

  function updateWeight(dayIdx, sessionIdx, exIdx, setIdx, value) {
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].exercises[exIdx].weights[setIdx] = value
    setPlan(p)
  }

  function updateRPE(dayIdx, sessionIdx, value) {
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].rpe = value
    setPlan(p)
  }

  function updateSessionNotes(dayIdx, sessionIdx, value) {
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].sessionNotes = value
    setPlan(p)
  }

  function toggleDone(dayIdx, sessionIdx, exIdx) {
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].exercises[exIdx].done = !p[dayIdx].sessions[sessionIdx].exercises[exIdx].done
    setPlan(p)
  }

  function startSession(dayIdx, sessionIdx) {
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].started = true
    setPlan(p)
    setExpandedDay(dayIdx)
  }

  async function saveSession(dayIdx, sessionIdx) {
    const session = plan[dayIdx].sessions[sessionIdx]
    const dayObj = plan[dayIdx]
    const { data: sessionData, error: sessionError } = await supabase.from('sessions').insert({ client_id: clientData.id, week: viewWeek, day: dayObj.day, type: session.type, title: session.title, goal: session.goal, prescribed: false }).select()
    if (sessionError) { console.error(sessionError); return }
    const { data: exerciseRows, error: exError } = await supabase.from('exercises').insert(session.exercises.map((ex, i) => ({ session_id: sessionData[0].id, name: ex.name, sets: ex.sets, reps: ex.reps, tempo: ex.tempo, notes: ex.notes, order: i }))).select()
    if (exError) { console.error(exError); return }
    const weightLogs = []
    session.exercises.forEach((ex, exIdx) => {
      ex.weights.forEach((w, setIdx) => {
        if (w !== '') weightLogs.push({ exercise_id: exerciseRows[exIdx].id, client_id: clientData.id, set_number: setIdx + 1, weight: parseFloat(w) })
      })
    })
    if (weightLogs.length > 0) await supabase.from('exercise_logs').insert(weightLogs)
    await supabase.from('session_logs').insert({ session_id: sessionData[0].id, client_id: clientData.id, rpe: session.rpe || null, notes: session.sessionNotes || null })
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].saved = true
    setPlan(p)
    loadHistory(clientData.id)
  }

  async function submitIntake() {
    setIntakeSaving(true)
    const { error } = await supabase.from('intake_forms').upsert({ client_id: clientData.id, ...intakeForm, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
    if (!error) { setIntakeSaved(true); setIntakeExists(true) }
    setIntakeSaving(false)
  }

  async function saveCheckin() {
    setCheckinSaving(true)
    const { error } = await supabase.from('weekly_checkins').upsert({ client_id: clientData.id, week: getCurrentWeek(clientData.start_date), ...checkin, updated_at: new Date().toISOString() }, { onConflict: 'client_id,week' })
    if (!error) { setCheckinSaved(true); setCheckinExists(true) }
    setCheckinSaving(false)
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex justify-center mb-3"><Logo /></div>
        <div className="flex justify-end items-center gap-3">
          <div className="text-sm text-gray-500">Hi {clientData.name.split(' ')[0]} 👋</div>
          <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {[['plan','My plan'],['history','My history'],['intake','Intake form'],['checkin','Check-in'],['messages','Messages']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeViewWeek(viewWeek - 1)} disabled={viewWeek <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            <div className="text-center">
              <div className="text-sm font-medium">Week {viewWeek} of {progLength}</div>
              {viewWeek === currentWeek && <div className="text-xs text-green-600 font-medium">This week</div>}
              {viewWeek < currentWeek && <div className="text-xs text-gray-400">Past week</div>}
              {viewWeek > currentWeek && <div className="text-xs text-blue-500">Coming up</div>}
            </div>
            <button onClick={() => changeViewWeek(viewWeek + 1)} disabled={viewWeek >= progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
          </div>
          {!planLoaded ? <div className="text-sm text-gray-400 text-center py-8">Loading…</div>
          : plan.every(d => d.sessions.length === 0) ? (
            <div className="text-sm text-gray-400 text-center py-8">{viewWeek === currentWeek ? "Your coach is setting up your plan — check back soon!" : `No plan for week ${viewWeek} yet`}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {plan.map((dayObj, dayIdx) => (
                <div key={dayObj.day}>
                  {dayObj.sessions.length === 0 ? (
                    <div className="flex gap-3 p-3.5 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="text-xs font-medium text-gray-400 w-8 pt-0.5">{dayObj.day}</div>
                      <span className="text-sm text-gray-400">Rest or walk</span>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedDay(expandedDay === dayIdx ? null : dayIdx)} className="w-full flex gap-3 p-3.5 bg-white hover:bg-gray-50 transition-colors text-left">
                        <div className="text-xs font-medium text-gray-400 w-8 pt-0.5 flex-shrink-0">{dayObj.day}</div>
                        <div className="flex-1 flex flex-col gap-1.5">
                          {dayObj.sessions.map((s, si) => (
                            <div key={si} className="flex gap-2 items-center">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${s.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{s.type === 'strength' ? 'Strength' : 'Run'}</span>
                              <span className="text-sm font-medium">{s.title}</span>
                              {s.saved && <span className="text-xs text-green-600 font-medium">✓</span>}
                            </div>
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs">{expandedDay === dayIdx ? '▲' : '▼'}</span>
                      </button>
                      {expandedDay === dayIdx && (
                        <div className="border-t border-gray-100">
                          {dayObj.sessions.map((session, sessionIdx) => (
                            <div key={sessionIdx} className={`p-4 ${sessionIdx > 0 ? 'border-t border-gray-100' : ''}`}>
                              {session.goal && (
                                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                  <div className="text-xs font-medium text-amber-700 mb-1">Session goal</div>
                                  <div className="text-sm text-amber-900">{session.goal}</div>
                                </div>
                              )}
                              {!session.started && !session.saved && viewWeek === currentWeek && (
                                <button onClick={() => startSession(dayIdx, sessionIdx)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-3">Start session</button>
                              )}
                              {viewWeek !== currentWeek && !session.started && !session.saved && (
                                <div className="text-xs text-gray-400 text-center py-2 mb-3">{viewWeek < currentWeek ? 'Past session' : 'Coming up'}</div>
                              )}
                              {(session.started || session.saved) && (
                                <div className="flex flex-col gap-3">
                                  {groupExercises(session.exercises).map((group, groupIdx) => (
                                    <div key={groupIdx}>
                                      {group.type === 'superset' ? (
                                        <div className="border border-purple-100 rounded-lg overflow-hidden">
                                          <div className="bg-purple-50 px-3 py-1.5 flex items-center gap-2">
                                            <span className="text-xs font-medium text-purple-600">Superset {group.label}</span>
                                            <span className="text-xs text-purple-400">— complete both back to back</span>
                                          </div>
                                          <div className="divide-y divide-gray-100">
                                            {group.items.map(({ ex, idx }) => (
                                              <div key={idx} className={`p-3 ${ex.done ? 'bg-green-50' : 'bg-white'}`}>
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                  <div className="flex items-center gap-2">
                                                    <button onClick={() => toggleDone(dayIdx, sessionIdx, idx)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>{ex.done && <span className="text-xs">✓</span>}</button>
                                                    <span className={`text-sm font-medium ${ex.done ? 'text-gray-400 line-through' : ''}`}>{ex.name}</span>
                                                  </div>
                                                  <div className="flex gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded">{ex.sets}×{ex.reps}</span>
                                                    {ex.tempo && <span className="bg-gray-100 px-2 py-0.5 rounded">{ex.tempo}</span>}
                                                  </div>
                                                </div>
                                                {ex.notes && <div className="text-xs text-gray-400 italic mb-2 ml-7">{ex.notes}</div>}
                                                {session.type === 'strength' && (
                                                  <div className="ml-7">
                                                    <div className="text-xs text-gray-400 mb-1">Weights (kg)</div>
                                                    <div className="flex gap-2 flex-wrap">
                                                      {ex.weights.map((w, setIdx) => (
                                                        <div key={setIdx} className="flex flex-col items-center gap-0.5">
                                                          <div className="text-xs text-gray-400">S{setIdx + 1}</div>
                                                          <input type="number" value={w} onChange={e => updateWeight(dayIdx, sessionIdx, idx, setIdx, e.target.value)} placeholder="—" className="w-12 text-sm text-center border border-gray-200 rounded-md px-1 py-1 outline-none focus:border-blue-300 bg-white" />
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        group.items.map(({ ex, idx }) => (
                                          <div key={idx} className={`rounded-lg p-3 border ${ex.done ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                              <div className="flex items-center gap-2">
                                                <button onClick={() => toggleDone(dayIdx, sessionIdx, idx)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>{ex.done && <span className="text-xs">✓</span>}</button>
                                                <span className={`text-sm font-medium ${ex.done ? 'text-gray-400 line-through' : ''}`}>{ex.name}</span>
                                              </div>
                                              <div className="flex gap-1.5 text-xs text-gray-500 flex-shrink-0">
                                                <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">{ex.sets}×{ex.reps}</span>
                                                {ex.tempo && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded">{ex.tempo}</span>}
                                              </div>
                                            </div>
                                            {ex.notes && <div className="text-xs text-gray-400 italic mb-2 ml-7">{ex.notes}</div>}
                                            {session.type === 'strength' && (
                                              <div className="ml-7">
                                                <div className="text-xs text-gray-400 mb-1">Weights (kg)</div>
                                                <div className="flex gap-2 flex-wrap">
                                                  {ex.weights.map((w, setIdx) => (
                                                    <div key={setIdx} className="flex flex-col items-center gap-0.5">
                                                      <div className="text-xs text-gray-400">S{setIdx + 1}</div>
                                                      <input type="number" value={w} onChange={e => updateWeight(dayIdx, sessionIdx, idx, setIdx, e.target.value)} placeholder="—" className="w-12 text-sm text-center border border-gray-200 rounded-md px-1 py-1 outline-none focus:border-blue-300 bg-white" />
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  ))}
                                  <div className="mt-2 pt-4 border-t border-gray-100">
                                    <div className="text-xs font-medium text-gray-600 mb-3">Finish session</div>
                                    <div className="mb-3">
                                      <div className="text-xs text-gray-500 mb-2">How hard was that? (RPE 1–10)</div>
                                      <div className="flex gap-1.5 flex-wrap">
                                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                          <button key={n} onClick={() => updateRPE(dayIdx, sessionIdx, n)} className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${session.rpe === n ? (n <= 4 ? 'bg-green-100 text-green-700 border-green-300' : n <= 7 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300') : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{n}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="mb-3">
                                      <div className="text-xs text-gray-500 mb-1.5">Notes for Phoebe</div>
                                      <textarea value={session.sessionNotes} onChange={e => updateSessionNotes(dayIdx, sessionIdx, e.target.value)} placeholder="How did the session feel?" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none bg-white" />
                                    </div>
                                    {session.saved ? (
                                      <div className="text-sm text-green-600 font-medium text-center py-1">Session saved! ✓</div>
                                    ) : (
                                      <button onClick={() => saveSession(dayIdx, sessionIdx)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">Save session</button>
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

      {tab === 'history' && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-4">Your completed sessions</div>
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

      {tab === 'intake' && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">About you</div>
          <div className="text-xs text-gray-400 mb-6">
            {intakeExists ? 'Your responses have been sent to Phoebe. You can update them any time.' : 'Please fill this in before your first session so Phoebe can get to know you. Take your time — there are no right or wrong answers.'}
          </div>
          <div className="flex flex-col gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">What's the main reason you're seeking nutrition support right now?</div>
              <textarea value={intakeForm.main_reason} onChange={e => setIntakeForm({...intakeForm, main_reason: e.target.value})} rows={3} placeholder="Tell Phoebe what's brought you here..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">Have you tried any nutrition approaches or diets before? What happened?</div>
              <textarea value={intakeForm.tried_before} onChange={e => setIntakeForm({...intakeForm, tried_before: e.target.value})} rows={3} placeholder="What have you tried, and how did it go?" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1.5">What would success look like for you? How would you know this had worked?</div>
              <textarea value={intakeForm.success_looks_like} onChange={e => setIntakeForm({...intakeForm, success_looks_like: e.target.value})} rows={3} placeholder="In your own words, what does a positive outcome look like?" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Your health</div>
              <div className="flex flex-col gap-5">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Do you have any diagnosed medical conditions we should know about?</div>
                  <textarea value={intakeForm.medical_conditions} onChange={e => setIntakeForm({...intakeForm, medical_conditions: e.target.value})} rows={2} placeholder="Or write 'none'" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Are you currently taking any medication or supplements?</div>
                  <textarea value={intakeForm.medications} onChange={e => setIntakeForm({...intakeForm, medications: e.target.value})} rows={2} placeholder="Or write 'none'" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Are you experiencing any symptoms at the moment?</div>
                  <div className="text-xs text-gray-400 mb-2">e.g. bloating, irregular periods, fatigue, trouble sleeping, hot flushes, brain fog, joint pain, low mood…</div>
                  <textarea value={intakeForm.current_symptoms} onChange={e => setIntakeForm({...intakeForm, current_symptoms: e.target.value})} rows={3} placeholder="Share anything that feels relevant, however small" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">How would you rate your overall energy levels on a typical day?</div>
                  <ScaleButtons value={intakeForm.energy_level} onChange={v => setIntakeForm({...intakeForm, energy_level: v})} low="Very low" high="Very high" />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Your eating</div>
              <div className="flex flex-col gap-5">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Describe a typical day of eating — what you'd usually have from waking to bedtime</div>
                  <textarea value={intakeForm.typical_eating} onChange={e => setIntakeForm({...intakeForm, typical_eating: e.target.value})} rows={4} placeholder="Don't worry about making it sound 'good' — just be honest about what a real day looks like" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">How regular are your meals on most days?</div>
                  <MultiChoice options={['I eat 3 structured meals most days', 'I eat 2 meals most days', 'My eating is quite irregular depending on the day', 'I regularly skip meals — especially breakfast or lunch']} value={intakeForm.meal_regularity} onChange={v => setIntakeForm({...intakeForm, meal_regularity: v})} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">How would you describe your relationship with food right now?</div>
                  <MultiChoice options={['Mostly positive — I enjoy food and don\'t stress about it', 'Neutral — food is fuel, I don\'t think about it much', 'Complicated — I have some rules or anxiety around food', 'Difficult — food causes me significant stress or guilt']} value={intakeForm.food_relationship} onChange={v => setIntakeForm({...intakeForm, food_relationship: v})} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Are there any foods or food groups you currently avoid, and why?</div>
                  <textarea value={intakeForm.foods_avoided} onChange={e => setIntakeForm({...intakeForm, foods_avoided: e.target.value})} rows={2} placeholder="Or write 'none'" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Your life</div>
              <div className="flex flex-col gap-5">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">How would you describe your stress levels on a typical week?</div>
                  <ScaleButtons value={intakeForm.stress_level} onChange={v => setIntakeForm({...intakeForm, stress_level: v})} low="Very low" high="Very high" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">How many nights a week do you get what you'd consider good quality sleep?</div>
                  <MultiChoice options={['0–1 nights', '2–3 nights', '4–5 nights', '6–7 nights']} value={intakeForm.sleep_quality} onChange={v => setIntakeForm({...intakeForm, sleep_quality: v})} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">How much exercise do you do per week, and what type?</div>
                  <textarea value={intakeForm.exercise_habits} onChange={e => setIntakeForm({...intakeForm, exercise_habits: e.target.value})} rows={2} placeholder="e.g. 3x strength training, 2x runs per week..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Is there anything else you'd like Phoebe to know before your first session?</div>
                  <div className="text-xs text-gray-400 mb-2">Anything you'd find it hard to bring up, or something that feels important about your history</div>
                  <textarea value={intakeForm.anything_else} onChange={e => setIntakeForm({...intakeForm, anything_else: e.target.value})} rows={3} placeholder="This is a safe space — share whatever feels right" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
              </div>
            </div>
            {intakeSaved ? (
              <div className="text-sm text-green-600 font-medium text-center py-2 bg-green-50 rounded-lg border border-green-100">
                {intakeExists ? 'Responses updated ✓' : 'Intake form submitted ✓ — Phoebe will review before your session'}
              </div>
            ) : (
              <button onClick={submitIntake} disabled={intakeSaving} className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">{intakeSaving ? 'Submitting…' : intakeExists ? 'Update my responses' : 'Submit intake form'}</button>
            )}
          </div>
        </div>
      )}

      {tab === 'checkin' && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Week {currentWeek} check-in</div>
          <div className="text-xs text-gray-400 mb-6">{checkinExists ? 'Your check-in has been sent to Phoebe. You can update it any time this week.' : 'Take a few minutes to reflect on how your week has gone — Phoebe will read this before your next session.'}</div>

          {weekHabit && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
              <div className="text-xs font-medium text-green-700 mb-1">This week's habit</div>
              <div className="text-sm font-medium text-green-900 mb-1">{weekHabit.habit}</div>
              {weekHabit.why_note && <div className="text-xs text-green-700 italic">"{weekHabit.why_note}"</div>}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {weekHabit && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">How did you get on with this week's habit?</div>
                <div className="flex flex-col gap-2 mb-3">
                  {[['yes', '✓  Nailed it — I did it consistently'], ['mostly', '~  Mostly managed it'], ['struggled', '✗  Struggled this week']].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setCheckin({...checkin, habit_completion: val})} className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${checkin.habit_completion === val ? (val === 'yes' ? 'bg-green-100 text-green-800 border-green-300' : val === 'mostly' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-red-50 text-red-800 border-red-200') : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>{label}</button>
                  ))}
                </div>
                <textarea value={checkin.habit_notes} onChange={e => setCheckin({...checkin, habit_notes: e.target.value})} rows={2} placeholder="What made it easier or harder?" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">How you're feeling</div>
              <div className="flex flex-col gap-4">
                <div><div className="text-sm font-medium text-gray-700 mb-2">Morning energy</div><ScaleButtons value={checkin.energy_morning} onChange={v => setCheckin({...checkin, energy_morning: v})} low="Very low" high="Very high" /></div>
                <div><div className="text-sm font-medium text-gray-700 mb-2">Afternoon energy</div><ScaleButtons value={checkin.energy_afternoon} onChange={v => setCheckin({...checkin, energy_afternoon: v})} low="Very low" high="Very high" /></div>
                <div><div className="text-sm font-medium text-gray-700 mb-2">Evening energy</div><ScaleButtons value={checkin.energy_evening} onChange={v => setCheckin({...checkin, energy_evening: v})} low="Very low" high="Very high" /></div>
                <div><div className="text-sm font-medium text-gray-700 mb-2">Overall mood this week</div><ScaleButtons value={checkin.mood} onChange={v => setCheckin({...checkin, mood: v})} low="Low" high="Great" /></div>
                <div><div className="text-sm font-medium text-gray-700 mb-2">Sleep quality</div><ScaleButtons value={checkin.sleep_quality} onChange={v => setCheckin({...checkin, sleep_quality: v})} low="Poor" high="Great" /></div>
              </div>
            </div>

            {clientSymptoms.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Symptom check</div>
                <div className="flex flex-col gap-4">
                  {clientSymptoms.map(s => (
                    <div key={s.id}>
                      <div className="text-sm font-medium text-gray-700 mb-2">{s.symptom_name}</div>
                      <ScaleButtons value={checkin.symptom_scores[s.symptom_name] || 0} onChange={v => setCheckin({...checkin, symptom_scores: {...checkin.symptom_scores, [s.symptom_name]: v}})} low="Not at all" high="Very severe" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Anything new or different to flag?</div>
              <div className="text-xs text-gray-400 mb-3">New symptoms, changes in how you're feeling, anything that's come up this week</div>
              <textarea value={checkin.new_symptoms_notes} onChange={e => setCheckin({...checkin, new_symptoms_notes: e.target.value})} rows={2} placeholder="Leave blank if nothing to add" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Your eating this week</div>
              <div className="flex flex-col gap-3">
                {[
                  ['breakfast', 'Breakfast', 'What did breakfast typically look like this week?'],
                  ['lunch', 'Lunch', 'What did lunch typically look like?'],
                  ['dinner', 'Dinner', 'What did dinner typically look like?'],
                  ['snacks', 'Snacks', 'Any snacks or extras throughout the day?'],
                ].map(([key, label, placeholder]) => (
                  <div key={key}>
                    <div className="text-sm font-medium text-gray-700 mb-1.5">{label}</div>
                    <textarea value={checkin[key]} onChange={e => setCheckin({...checkin, [key]: e.target.value})} rows={2} placeholder={placeholder} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Reflection</div>
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">What went well with food and eating this week?</div>
                  <textarea value={checkin.went_well} onChange={e => setCheckin({...checkin, went_well: e.target.value})} rows={2} placeholder="Even small wins count" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">What felt hard this week?</div>
                  <textarea value={checkin.was_hard} onChange={e => setCheckin({...checkin, was_hard: e.target.value})} rows={2} placeholder="Be honest — this is really useful for Phoebe to know" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1.5">Is there anything you want to make sure you cover in your next session?</div>
                  <textarea value={checkin.want_to_discuss} onChange={e => setCheckin({...checkin, want_to_discuss: e.target.value})} rows={2} placeholder="Anything on your mind you don't want to forget to bring up" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-400 resize-none" />
                </div>
              </div>
            </div>

            {checkinSaved ? (
              <div className="text-sm text-green-600 font-medium text-center py-2 bg-green-50 rounded-lg border border-green-100">Check-in sent to Phoebe ✓</div>
            ) : (
              <button onClick={saveCheckin} disabled={checkinSaving} className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">{checkinSaving ? 'Saving…' : checkinExists ? 'Update check-in' : 'Send check-in to Phoebe'}</button>
            )}
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div>
          <div className="flex flex-col gap-3 mb-4">
            {messages.length === 0 ? <div className="text-sm text-gray-400 text-center py-8">No messages yet</div>
            : messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.from === 'client' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.from === 'client' ? 'bg-blue-100 text-blue-900 rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>{m.text}</div>
                <div className="text-xs text-gray-400 mt-1">{m.from === 'client' ? 'You' : 'Phoebe'} · {m.time}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message Phoebe…" className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
            <button onClick={sendMessage} className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors">Send</button>
          </div>
        </div>
      )}
    </div>
  )
}