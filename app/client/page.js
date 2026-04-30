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

const RatingButtons = ({ value, onChange, max = 5, lowLabel, highLabel }) => (
  <div className="flex items-center gap-1.5">
    {lowLabel && <span className="text-xs text-gray-400 w-12 text-right flex-shrink-0">{lowLabel}</span>}
    {Array.from({length: max}, (_, i) => i + 1).map(n => (
      <button key={n} onClick={() => onChange(value === n ? null : n)}
        className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${value === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
        {n}
      </button>
    ))}
    {highLabel && <span className="text-xs text-gray-400 w-12 flex-shrink-0">{highLabel}</span>}
  </div>
)

export default function ClientPage() {
  const [activeNav, setActiveNav] = useState('home')
  const [trainingView, setTrainingView] = useState('plan')
  const [clientData, setClientData] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [plan, setPlan] = useState([])
  const [planLoaded, setPlanLoaded] = useState(false)
  const [expandedDay, setExpandedDay] = useState(null)
  const [viewWeek, setViewWeek] = useState(1)
  const [sessionHistory, setSessionHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentHabit, setCurrentHabit] = useState(null)
  const [todaysSessions, setTodaysSessions] = useState([])
  const [checkinDoneThisWeek, setCheckinDoneThisWeek] = useState(false)
  const [symptoms, setSymptoms] = useState([])
  const [existingCheckin, setExistingCheckin] = useState(null)
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [checkinSubmitting, setCheckinSubmitting] = useState(false)
  const [checkinForm, setCheckinForm] = useState({
    breakfast_patterns: '', lunch_patterns: '', dinner_patterns: '', snack_patterns: '',
    energy_morning: null, energy_afternoon: null, energy_evening: null,
    mood_rating: null, sleep_rating: null,
    went_well: '', was_hard: '', habit_completion: '', habit_reflection: '', anything_new: '',
    symptom_scores: {}
  })

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
        await Promise.all([
          loadPlan(data.id, currentWeek),
          loadMessages(data.id),
          loadHomeData(data.id, currentWeek),
          loadNutritionData(data.id, currentWeek),
          loadHistory(data.id)
        ])
      })
    })
  }, [])

  async function loadHomeData(clientId, week) {
    const [habitRes, checkinRes, todayRes, unreadRes] = await Promise.all([
      supabase.from('client_habits').select('*').eq('client_id', clientId).eq('week', week).maybeSingle(),
      supabase.from('weekly_checkins').select('id').eq('client_id', clientId).eq('week', week).maybeSingle(),
      supabase.from('sessions').select('*').eq('client_id', clientId).eq('prescribed', true).eq('week', week).eq('day', dayMap[new Date().getDay()]),
      supabase.from('messages').select('id', { count: 'exact' }).eq('client_id', clientId).eq('from_coach', true).eq('read', false)
    ])
    if (habitRes.data) setCurrentHabit(habitRes.data)
    setCheckinDoneThisWeek(!!checkinRes.data)
    if (todayRes.data) setTodaysSessions(todayRes.data)
    setUnreadCount(unreadRes.count || 0)
  }

  async function loadNutritionData(clientId, week) {
    const [symsRes, checkinRes, habitRes] = await Promise.all([
      supabase.from('client_symptoms').select('*').eq('client_id', clientId).order('created_at'),
      supabase.from('weekly_checkins').select('*').eq('client_id', clientId).eq('week', week).maybeSingle(),
      supabase.from('client_habits').select('*').eq('client_id', clientId).eq('week', week).maybeSingle()
    ])
    if (symsRes.data) setSymptoms(symsRes.data)
    if (checkinRes.data) setExistingCheckin(checkinRes.data)
    if (habitRes.data) setCurrentHabit(habitRes.data)
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
          exercises: (dbExercises || []).filter(e => e.session_id === s.id).sort((a, b) => (a.order||0)-(b.order||0)).map(e => ({
            name: e.name, sets: e.sets||3, reps: e.reps||10, tempo: e.tempo||'', notes: e.notes||'', superset: e.superset||null,
            weights: Array(e.sets||3).fill(''), done: false,
          })),
          rpe: '', sessionNotes: '', saved: false, started: false,
        }))
      })))
    } else { setPlan(days.map(day => ({ day, sessions: [] }))) }
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
      const { data: weightLogs } = await supabase.from('exercise_logs').select('*').in('exercise_id', exercises?.map(e => e.id) || [])
      setSessionHistory(sessions.map(s => ({ ...s, exercises: (exercises?.filter(e => e.session_id === s.id)||[]).map(ex => ({ ...ex, weights: weightLogs?.filter(w => w.exercise_id === ex.id).sort((a,b) => a.set_number - b.set_number)||[] })), log: logs?.find(l => l.session_id === s.id)||null })))
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

  function updateWeight(dayIdx, sessionIdx, exIdx, setIdx, value) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[sessionIdx].exercises[exIdx].weights[setIdx] = value; setPlan(p)
  }
  function updateRPE(dayIdx, sessionIdx, value) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[sessionIdx].rpe = value; setPlan(p)
  }
  function updateSessionNotes(dayIdx, sessionIdx, value) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[sessionIdx].sessionNotes = value; setPlan(p)
  }
  function toggleDone(dayIdx, sessionIdx, exIdx) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[sessionIdx].exercises[exIdx].done = !p[dayIdx].sessions[sessionIdx].exercises[exIdx].done; setPlan(p)
  }
  function startSession(dayIdx, sessionIdx) {
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[sessionIdx].started = true; setPlan(p); setExpandedDay(dayIdx)
  }

  async function saveSession(dayIdx, sessionIdx) {
    const session = plan[dayIdx].sessions[sessionIdx]
    const dayObj = plan[dayIdx]
    const { data: sessionData, error: sessionError } = await supabase.from('sessions').insert({ client_id: clientData.id, week: viewWeek, day: dayObj.day, type: session.type, title: session.title, goal: session.goal, prescribed: false }).select().single()
    if (sessionError) { console.error(sessionError); return }
    const { data: exerciseRows } = await supabase.from('exercises').insert(session.exercises.map((ex, i) => ({ session_id: sessionData.id, name: ex.name, sets: ex.sets, reps: ex.reps, tempo: ex.tempo, notes: ex.notes, order: i }))).select()
    const weightLogs = []
    session.exercises.forEach((ex, exIdx) => { ex.weights.forEach((w, setIdx) => { if (w !== '') weightLogs.push({ exercise_id: exerciseRows[exIdx].id, client_id: clientData.id, set_number: setIdx+1, weight: parseFloat(w) }) }) })
    if (weightLogs.length > 0) await supabase.from('exercise_logs').insert(weightLogs)
    await supabase.from('session_logs').insert({ session_id: sessionData.id, client_id: clientData.id, rpe: session.rpe||null, notes: session.sessionNotes||null })
    const p = JSON.parse(JSON.stringify(plan)); p[dayIdx].sessions[sessionIdx].saved = true; setPlan(p)
    loadHistory(clientData.id)
  }

  async function sendMessage() {
    if (!msgInput.trim()) return
    const { error } = await supabase.from('messages').insert({ client_id: clientData.id, from_coach: false, content: msgInput })
    if (!error) {
      setMessages([...messages, { from: 'client', text: msgInput, time: 'just now' }]); setMsgInput('')
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-message`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ record: { content: msgInput, from_coach: false, client_email: clientData.email } }) })
    }
  }

  async function submitCheckin() {
    setCheckinSubmitting(true)
    const currentWeek = getCurrentWeek(clientData.start_date)
    const payload = { client_id: clientData.id, week: currentWeek, ...checkinForm }
    let error
    if (existingCheckin) {
      const res = await supabase.from('weekly_checkins').update(payload).eq('id', existingCheckin.id).select().single()
      error = res.error
      if (!res.error) setExistingCheckin(res.data)
    } else {
      const res = await supabase.from('weekly_checkins').insert(payload).select().single()
      error = res.error
      if (!res.error) { setExistingCheckin(res.data); setCheckinDoneThisWeek(true) }
    }
    if (!error) setShowCheckinForm(false)
    setCheckinSubmitting(false)
  }

  async function signOut() { await supabase.auth.signOut(); window.location.href = '/login' }

  if (!authed || !clientData) return <div className="min-h-screen flex items-center justify-center"><div className="text-sm text-gray-400">Loading…</div></div>

  const currentWeek = getCurrentWeek(clientData.start_date)
  const progLength = clientData.programme_length || 12

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <Logo />
        <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
      </div>

      {/* HOME */}
      {activeNav === 'home' && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xl font-medium text-gray-900">Good {timeOfDay}, {clientData.name.split(' ')[0]}</div>
            <div className="text-sm text-gray-400 mt-0.5">Week {currentWeek} of {progLength} · {clientData.programme}</div>
          </div>
          {currentHabit ? (
            <div className="rounded-2xl p-4 text-white" style={{background:'#1D9E75'}}>
              <div className="text-xs font-medium mb-1.5" style={{opacity:0.75, letterSpacing:'0.08em', textTransform:'uppercase'}}>This week's habit</div>
              <div className="text-base font-medium mb-1">{currentHabit.habit_text}</div>
              {currentHabit.context_note && <div className="text-xs leading-relaxed" style={{opacity:0.85}}>{currentHabit.context_note}</div>}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="text-xs font-medium text-gray-400 mb-1">This week's habit</div>
              <div className="text-sm text-gray-400">Phoebe will set your habit soon</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setActiveNav('training')} className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-gray-300 transition-colors">
              <div className="text-xs font-medium text-gray-400 mb-2">Today · {todayDay}</div>
              {todaysSessions.length > 0 ? (
                <div>
                  {todaysSessions.slice(0,2).map((s, i) => <div key={i} className="text-sm font-medium text-gray-800">{s.title}</div>)}
                  <div className="text-xs font-medium mt-1" style={{color:'#1D9E75'}}>Tap to start →</div>
                </div>
              ) : <div className="text-sm text-gray-400">Rest or walk</div>}
            </button>
            <button onClick={() => { setActiveNav('nutrition'); if (!checkinDoneThisWeek) setShowCheckinForm(true) }} className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-gray-300 transition-colors">
              <div className="text-xs font-medium text-gray-400 mb-2">Weekly check-in</div>
              {checkinDoneThisWeek ? (
                <div><div className="text-sm font-medium text-gray-800">Done ✓</div><div className="text-xs text-green-600 mt-1">Submitted</div></div>
              ) : (
                <div><div className="text-sm font-medium text-gray-800">Not yet</div><div className="text-xs font-medium mt-1" style={{color:'#1D9E75'}}>Tap to complete →</div></div>
              )}
            </button>
          </div>
          <button onClick={() => setActiveNav('messages')} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
            <div>
              <div className="text-xs font-medium text-gray-400 mb-1">Messages</div>
              <div className="text-sm text-gray-700">{unreadCount > 0 ? `${unreadCount} new message${unreadCount > 1 ? 's' : ''} from Phoebe` : 'No new messages'}</div>
            </div>
            {unreadCount > 0 && <div className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-medium" style={{background:'#1D9E75'}}>{unreadCount}</div>}
          </button>
        </div>
      )}

      {/* TRAINING */}
      {activeNav === 'training' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[['plan','My plan'],['history','History']].map(([key, label]) => (
                <button key={key} onClick={() => setTrainingView(key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${trainingView === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
              ))}
            </div>
          </div>

          {trainingView === 'plan' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => changeViewWeek(viewWeek-1)} disabled={viewWeek<=1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">‹</button>
                <div className="text-center">
                  <div className="text-sm font-medium">Week {viewWeek} of {progLength}</div>
                  {viewWeek === currentWeek && <div className="text-xs text-green-600 font-medium">This week</div>}
                  {viewWeek < currentWeek && <div className="text-xs text-gray-400">Past week</div>}
                  {viewWeek > currentWeek && <div className="text-xs text-blue-500">Coming up</div>}
                </div>
                <button onClick={() => changeViewWeek(viewWeek+1)} disabled={viewWeek>=progLength} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 disabled:opacity-30">›</button>
              </div>
              {!planLoaded ? <div className="text-sm text-gray-400 text-center py-8">Loading…</div>
              : plan.every(d => d.sessions.length === 0) ? <div className="text-sm text-gray-400 text-center py-8">{viewWeek === currentWeek ? 'Your plan is being set up — check back soon!' : `No plan for week ${viewWeek} yet`}</div>
              : (
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
                                  {s.saved && <span className="text-xs text-green-600">✓</span>}
                                </div>
                              ))}
                            </div>
                            <span className="text-gray-400 text-xs">{expandedDay === dayIdx ? '▲' : '▼'}</span>
                          </button>
                          {expandedDay === dayIdx && (
                            <div className="border-t border-gray-100">
                              {dayObj.sessions.map((session, sessionIdx) => (
                                <div key={sessionIdx} className={`p-4 ${sessionIdx > 0 ? 'border-t border-gray-100' : ''}`}>
                                  {dayObj.sessions.length > 1 && (
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${session.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{session.type === 'strength' ? 'Strength' : 'Run'}</span>
                                      <span className="text-sm font-medium">{session.title}</span>
                                    </div>
                                  )}
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
                                                              <div className="text-xs text-gray-400">S{setIdx+1}</div>
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
                                                          <div className="text-xs text-gray-400">S{setIdx+1}</div>
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
                                              <button key={n} onClick={() => updateRPE(dayIdx, sessionIdx, n)} className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${session.rpe === n ? (n<=4 ? 'bg-green-100 text-green-700 border-green-300' : n<=7 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300') : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>{n}</button>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="mb-3">
                                          <div className="text-xs text-gray-500 mb-1.5">Notes for Phoebe</div>
                                          <textarea value={session.sessionNotes} onChange={e => updateSessionNotes(dayIdx, sessionIdx, e.target.value)} placeholder="How did it feel? Anything to flag…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none bg-white" />
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

          {trainingView === 'history' && (
            <div>
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
        </div>
      )}

      {/* NUTRITION */}
      {activeNav === 'nutrition' && (
        <div className="flex flex-col gap-4">
          {currentHabit && (
            <div className="rounded-2xl p-4 text-white" style={{background:'#1D9E75'}}>
              <div className="text-xs font-medium mb-1.5" style={{opacity:0.75, letterSpacing:'0.08em', textTransform:'uppercase'}}>This week's habit</div>
              <div className="text-base font-medium mb-1">{currentHabit.habit_text}</div>
              {currentHabit.context_note && <div className="text-xs leading-relaxed" style={{opacity:0.85}}>{currentHabit.context_note}</div>}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700">Weekly check-in</div>
              {checkinDoneThisWeek && !showCheckinForm && <span className="text-xs text-green-600 font-medium">✓ Submitted week {currentWeek}</span>}
            </div>

            {existingCheckin && !showCheckinForm ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="text-sm font-medium text-green-700 mb-1">Check-in submitted ✓</div>
                <div className="text-xs text-green-600 mb-3">Phoebe will review your responses before your next call.</div>
                <button onClick={() => setShowCheckinForm(true)} className="text-xs text-gray-500 underline">Update responses</button>
              </div>
            ) : !showCheckinForm ? (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-3">Takes about 5 minutes. Helps Phoebe understand how your week has been.</div>
                <button onClick={() => setShowCheckinForm(true)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">Start check-in</button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Eating */}
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-3">Eating this week</div>
                  {[
                    { key: 'breakfast_patterns', label: 'Breakfast', placeholder: 'How has breakfast been this week? Any patterns?' },
                    { key: 'lunch_patterns', label: 'Lunch', placeholder: 'How have lunches been?' },
                    { key: 'dinner_patterns', label: 'Dinner', placeholder: 'How have dinners been?' },
                    { key: 'snack_patterns', label: 'Snacks', placeholder: 'Any snacking patterns this week?' }
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="mb-3">
                      <div className="text-xs font-medium text-gray-500 mb-1.5">{label}</div>
                      <textarea value={checkinForm[key]} onChange={e => setCheckinForm({...checkinForm, [key]: e.target.value})} placeholder={placeholder} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                    </div>
                  ))}
                </div>

                {/* Wellbeing ratings */}
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-3">How have you been feeling?</div>
                  <div className="flex flex-col gap-4">
                    {[
                      { key: 'energy_morning', label: 'Morning energy' },
                      { key: 'energy_afternoon', label: 'Afternoon energy' },
                      { key: 'energy_evening', label: 'Evening energy' },
                      { key: 'mood_rating', label: 'Mood overall' },
                      { key: 'sleep_rating', label: 'Sleep quality' }
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <div className="text-xs text-gray-500 mb-2">{label}</div>
                        <RatingButtons value={checkinForm[key]} onChange={v => setCheckinForm({...checkinForm, [key]: v})} lowLabel="Low" highLabel="Great" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Symptoms */}
                {symptoms.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-800 mb-1">Symptom check</div>
                    <div className="text-xs text-gray-400 mb-3">1 = not at all &nbsp;·&nbsp; 5 = severe</div>
                    <div className="flex flex-col gap-4">
                      {symptoms.map(sym => (
                        <div key={sym.id}>
                          <div className="text-xs text-gray-500 mb-2">{sym.name}</div>
                          <RatingButtons
                            value={checkinForm.symptom_scores[sym.id] || null}
                            onChange={v => setCheckinForm({...checkinForm, symptom_scores: {...checkinForm.symptom_scores, [sym.id]: v}})}
                            lowLabel="None" highLabel="Severe"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Habit */}
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-3">Your habit this week</div>
                  {currentHabit && <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg mb-3">{currentHabit.habit_text}</div>}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-2">How did you get on?</div>
                    <div className="flex flex-col gap-1.5">
                      {['Every day ✓', 'Most days', 'A few times', "Didn't manage it this week"].map(opt => (
                        <button key={opt} onClick={() => setCheckinForm({...checkinForm, habit_completion: opt})}
                          className={`text-left text-sm px-4 py-2.5 rounded-lg border transition-colors ${checkinForm.habit_completion === opt ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1.5">What helped, or what got in the way?</div>
                    <textarea value={checkinForm.habit_reflection} onChange={e => setCheckinForm({...checkinForm, habit_reflection: e.target.value})} placeholder="Any context is helpful…" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                  </div>
                </div>

                {/* Reflection */}
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-3">Reflection</div>
                  {[
                    { key: 'went_well', label: 'What went well with food and eating this week?', placeholder: 'Even small wins count…' },
                    { key: 'was_hard', label: 'What was hard this week?', placeholder: 'Be honest — this helps Phoebe support you' },
                    { key: 'anything_new', label: 'Anything new you\'re experiencing or want to flag?', placeholder: 'New symptoms, questions, anything on your mind…' }
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="mb-3">
                      <div className="text-xs text-gray-500 mb-1.5">{label}</div>
                      <textarea value={checkinForm[key]} onChange={e => setCheckinForm({...checkinForm, [key]: e.target.value})} placeholder={placeholder} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pb-2">
                  <button onClick={submitCheckin} disabled={checkinSubmitting} className="flex-1 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors">
                    {checkinSubmitting ? 'Submitting…' : existingCheckin ? 'Update check-in' : 'Submit check-in'}
                  </button>
                  <button onClick={() => setShowCheckinForm(false)} className="px-4 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl bg-white">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MESSAGES */}
      {activeNav === 'messages' && (
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

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
        {[
          { key: 'home', label: 'Home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 4l9 8v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 21V12h6v9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          { key: 'training', label: 'Training', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="10" width="4" height="4" rx="1" strokeWidth="1.8"/><rect x="18" y="10" width="4" height="4" rx="1" strokeWidth="1.8"/><line x1="6" y1="12" x2="18" y2="12" strokeWidth="2.5" strokeLinecap="round"/><line x1="10" y1="9" x2="10" y2="15" strokeWidth="1.8" strokeLinecap="round"/><line x1="14" y1="9" x2="14" y2="15" strokeWidth="1.8" strokeLinecap="round"/></svg> },
          { key: 'nutrition', label: 'Nutrition', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" strokeWidth="1.8"/><path d="M12 7v5l3.5 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          { key: 'messages', label: 'Messages', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 4h16a1 1 0 011 1v10a1 1 0 01-1 1H6l-4 4V5a1 1 0 011-1z" strokeWidth="1.8" strokeLinejoin="round"/></svg> }
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setActiveNav(key)}
            className="flex-1 py-3 flex flex-col items-center gap-1 transition-colors"
            style={{ color: activeNav === key ? '#1D9E75' : '#9CA3AF' }}>
            <div style={{ stroke: activeNav === key ? '#1D9E75' : '#9CA3AF' }}>{icon}</div>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}