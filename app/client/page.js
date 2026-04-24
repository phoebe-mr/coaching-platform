'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const initialPlan = [
  { day: 'Mon', sessions: [{ type: 'strength', title: 'Lower body', goal: 'Focus on depth in squats. Progressive overload on hip thrust — aim to beat last week.', exercises: [
    { name: 'Goblet squat', sets: 4, reps: 8, tempo: '3-1-1-0', notes: 'Keep chest tall, weight in heels', weights: ['','','',''], done: false, superset: null },
    { name: 'Romanian deadlift', sets: 3, reps: 10, tempo: '3-0-1-0', notes: 'Hinge from hips, soft knees', weights: ['','',''], done: false, superset: null },
    { name: 'Hip thrust', sets: 4, reps: 12, tempo: '1-2-1-0', notes: 'Full squeeze at top', weights: ['','','',''], done: false, superset: 'A' },
    { name: 'Split squat', sets: 3, reps: 10, tempo: '2-1-1-0', notes: 'Modify to reverse lunge if knees ache', weights: ['','',''], done: false, superset: 'A' },
  ], rpe: '', sessionNotes: '', saved: false, started: false }] },
  { day: 'Tue', sessions: [{ type: 'run', title: 'Easy run — 30 min', goal: 'Keep effort conversational throughout. No racing today.', exercises: [
    { name: 'Easy run', sets: 1, reps: 1, tempo: '', notes: 'Zone 2 pace. Focus on cadence ~170 spm.', weights: [''], done: false, superset: null },
  ], rpe: '', sessionNotes: '', saved: false, started: false }] },
  { day: 'Wed', sessions: [{ type: 'strength', title: 'Upper body — push', goal: 'Quality over quantity. Control the lowering phase on all pressing.', exercises: [
    { name: 'DB press', sets: 4, reps: 8, tempo: '3-1-1-0', notes: '', weights: ['','','',''], done: false, superset: 'A' },
    { name: 'Lateral raise', sets: 3, reps: 15, tempo: '2-0-2-0', notes: 'Light weight, full range', weights: ['','',''], done: false, superset: 'A' },
    { name: 'Incline press', sets: 3, reps: 10, tempo: '3-0-1-0', notes: '', weights: ['','',''], done: false, superset: null },
    { name: 'Tricep dip', sets: 3, reps: 12, tempo: '2-1-1-0', notes: '', weights: ['','',''], done: false, superset: null },
  ], rpe: '', sessionNotes: '', saved: false, started: false }] },
  { day: 'Thu', sessions: [
    { type: 'run', title: 'Tempo intervals', goal: 'Hit the effort targets — use perceived effort not pace.', exercises: [
      { name: 'Warm-up jog', sets: 1, reps: 1, tempo: '', notes: '10 min easy', weights: [''], done: false, superset: null },
      { name: 'Tempo interval', sets: 3, reps: 1, tempo: '', notes: '8 min comfortably hard, 2 min walk recovery', weights: ['','',''], done: false, superset: null },
      { name: 'Cool-down jog', sets: 1, reps: 1, tempo: '', notes: '10 min easy', weights: [''], done: false, superset: null },
    ], rpe: '', sessionNotes: '', saved: false, started: false },
    { type: 'strength', title: 'Upper body — pull', goal: 'Focus on scapular retraction. Reduce assistance on pull-ups if feeling strong.', exercises: [
      { name: 'Assisted pull-up', sets: 4, reps: 6, tempo: '2-1-2-0', notes: 'Full hang at bottom', weights: ['','','',''], done: false, superset: 'A' },
      { name: 'Bent-over row', sets: 3, reps: 10, tempo: '2-1-1-0', notes: 'Neutral spine throughout', weights: ['','',''], done: false, superset: 'A' },
      { name: 'Face pull', sets: 3, reps: 15, tempo: '2-0-2-0', notes: 'External rotation at end range', weights: ['','',''], done: false, superset: null },
      { name: 'Bicep curl', sets: 3, reps: 12, tempo: '2-1-1-0', notes: '', weights: ['','',''], done: false, superset: null },
    ], rpe: '', sessionNotes: '', saved: false, started: false },
  ] },
  { day: 'Fri', sessions: [{ type: 'strength', title: 'Full body — power', goal: 'Prioritise quality on deadlift. Rest fully between sets.', exercises: [
    { name: 'Deadlift', sets: 4, reps: 5, tempo: '1-0-1-0', notes: 'Brace hard, push floor away', weights: ['','','',''], done: false, superset: null },
    { name: 'Box jump', sets: 3, reps: 6, tempo: '', notes: 'Step down, never jump down', weights: ['','',''], done: false, superset: 'B' },
    { name: 'KB swing', sets: 3, reps: 15, tempo: '', notes: 'Hip hinge power, not squat', weights: ['','',''], done: false, superset: 'B' },
    { name: 'Plank', sets: 3, reps: 1, tempo: '', notes: '30 sec hold', weights: ['','',''], done: false, superset: null },
  ], rpe: '', sessionNotes: '', saved: false, started: false }] },
  { day: 'Sat', sessions: [{ type: 'run', title: 'Long run — 50–55 min', goal: 'Easy effort throughout. Aerobic base work — resist the urge to push.', exercises: [
    { name: 'Long run', sets: 1, reps: 1, tempo: '', notes: 'Fuel at 40 min if needed.', weights: [''], done: false, superset: null },
  ], rpe: '', sessionNotes: '', saved: false, started: false }] },
  { day: 'Sun', sessions: [] },
]

function groupExercises(exercises) {
  const groups = []
  let i = 0
  while (i < exercises.length) {
    const ex = exercises[i]
    if (ex.superset) {
      const supersetGroup = [{ ex, idx: i }]
      let j = i + 1
      while (j < exercises.length && exercises[j].superset === ex.superset) {
        supersetGroup.push({ ex: exercises[j], idx: j })
        j++
      }
      groups.push({ type: 'superset', label: ex.superset, items: supersetGroup })
      i = j
    } else {
      groups.push({ type: 'single', items: [{ ex, idx: i }] })
      i++
    }
  }
  return groups
}

export default function ClientPage() {
  const [tab, setTab] = useState('plan')
  const [plan, setPlan] = useState(initialPlan)
  const [expandedDay, setExpandedDay] = useState(null)
  const [authed, setAuthed] = useState(false)
  const [clientData, setClientData] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [diaryForm, setDiaryForm] = useState({ breakfast: '', lunch: '', dinner: '', snacks: '', protein: '', carbs: '', fat: '', calories: '', notes: '' })
  const [diarySubmitted, setDiarySubmitted] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      supabase.from('clients').select('*').eq('user_id', session.user.id).single().then(({ data, error }) => {
        if (error || !data) { window.location.href = '/login'; return }
        setClientData(data)
        setAuthed(true)
        supabase.from('messages').select('*').eq('client_id', data.id).order('created_at', { ascending: true }).then(({ data: msgs }) => {
          if (msgs && msgs.length > 0) setMessages(msgs.map(m => ({ from: m.from_coach ? 'coach' : 'client', text: m.content, time: new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })))
        })
      })
    })
  }, [])

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
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert({ client_id: clientData.id, week: clientData.week, day: dayObj.day, type: session.type, title: session.title, goal: session.goal })
      .select().single()
    if (sessionError) { console.error('Error saving session:', sessionError); return }
    const { data: exerciseRows, error: exError } = await supabase
      .from('exercises')
      .insert(session.exercises.map((ex, i) => ({ session_id: sessionData.id, name: ex.name, sets: ex.sets, reps: ex.reps, tempo: ex.tempo, notes: ex.notes, order: i })))
      .select()
    if (exError) { console.error('Error saving exercises:', exError); return }
    const weightLogs = []
    session.exercises.forEach((ex, exIdx) => {
      ex.weights.forEach((w, setIdx) => {
        if (w !== '') weightLogs.push({ exercise_id: exerciseRows[exIdx].id, client_id: clientData.id, set_number: setIdx + 1, weight: parseFloat(w) })
      })
    })
    if (weightLogs.length > 0) await supabase.from('exercise_logs').insert(weightLogs)
    await supabase.from('session_logs').insert({ session_id: sessionData.id, client_id: clientData.id, rpe: session.rpe || null, notes: session.sessionNotes || null })
    const p = JSON.parse(JSON.stringify(plan))
    p[dayIdx].sessions[sessionIdx].saved = true
    setPlan(p)
  }

  async function sendMessage() {
    if (!msgInput.trim()) return
    const { error } = await supabase.from('messages').insert({
      client_id: clientData.id,
      from_coach: false,
      content: msgInput,
    })
    if (!error) {
      setMessages([...messages, { from: 'client', text: msgInput, time: 'just now' }])
      setMsgInput('')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function submitDiary() {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('diary_entries').insert({
      client_id: clientData.id, date: today,
      breakfast: diaryForm.breakfast, lunch: diaryForm.lunch, dinner: diaryForm.dinner, snacks: diaryForm.snacks,
      protein: diaryForm.protein ? parseInt(diaryForm.protein) : null,
      carbs: diaryForm.carbs ? parseInt(diaryForm.carbs) : null,
      fat: diaryForm.fat ? parseInt(diaryForm.fat) : null,
      calories: diaryForm.calories ? parseInt(diaryForm.calories) : null,
      notes: diaryForm.notes,
    })
    if (!error) setDiarySubmitted(true)
  }

  function resetDiary() {
    setDiarySubmitted(false)
    setDiaryForm({ breakfast: '', lunch: '', dinner: '', snacks: '', protein: '', carbs: '', fat: '', calories: '', notes: '' })
  }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading…</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <span className="text-lg font-medium">coach<span className="text-gray-400 font-normal">.phoebe</span></span>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">Hi {clientData.name.split(' ')[0]} 👋</div>
          <button onClick={signOut} className="text-xs text-gray-400 hover:text-gray-600">Sign out</button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {['plan', 'diary', 'messages'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t === 'plan' ? 'My plan' : t === 'diary' ? 'Food diary' : 'Messages'}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div>
          <div className="text-xs font-medium text-gray-500 mb-4">Week {clientData.week}</div>
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
                            {dayObj.sessions.length > 1 && (
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${session.type === 'strength' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{session.type === 'strength' ? 'Strength' : 'Run'}</span>
                                <span className="text-sm font-medium">{session.title}</span>
                              </div>
                            )}
                            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                              <div className="text-xs font-medium text-amber-700 mb-1">Session goal</div>
                              <div className="text-sm text-amber-900">{session.goal}</div>
                            </div>
                            {!session.started && !session.saved && (
                              <button onClick={() => startSession(dayIdx, sessionIdx)} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-3">Start session</button>
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
                                                  <button onClick={() => toggleDone(dayIdx, sessionIdx, idx)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                                    {ex.done && <span className="text-xs">✓</span>}
                                                  </button>
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
                                              <button onClick={() => toggleDone(dayIdx, sessionIdx, idx)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ex.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                                {ex.done && <span className="text-xs">✓</span>}
                                              </button>
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
                                    {session.rpe && <div className="text-xs text-gray-400 mt-1.5">{session.rpe <= 4 ? 'Easy — felt comfortable' : session.rpe <= 7 ? 'Moderate — good effort' : 'Hard — pushed it today'}</div>}
                                  </div>
                                  <div className="mb-3">
                                    <div className="text-xs text-gray-500 mb-1.5">Notes for Phoebe</div>
                                    <textarea value={session.sessionNotes} onChange={e => updateSessionNotes(dayIdx, sessionIdx, e.target.value)} placeholder="How did the session feel? Anything to flag..." rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none bg-white" />
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
        </div>
      )}

      {tab === 'diary' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="text-xs font-medium text-gray-600 mb-3">Log today's food</div>
            <div className="flex flex-col gap-3">
              {['breakfast', 'lunch', 'dinner', 'snacks'].map(meal => (
                <div key={meal}>
                  <div className="text-xs font-medium text-gray-500 mb-1 capitalize">{meal}</div>
                  <input type="text" value={diaryForm[meal]} onChange={e => setDiaryForm({ ...diaryForm, [meal]: e.target.value })} placeholder={`What did you have for ${meal}?`} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400" />
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {['protein', 'carbs', 'fat', 'calories'].map(macro => (
                  <div key={macro}>
                    <div className="text-xs font-medium text-gray-500 mb-1 capitalize">{macro}</div>
                    <input type="number" value={diaryForm[macro]} onChange={e => setDiaryForm({ ...diaryForm, [macro]: e.target.value })} placeholder="0" className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-gray-400 text-center" />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Notes for Phoebe</div>
                <textarea value={diaryForm.notes} onChange={e => setDiaryForm({ ...diaryForm, notes: e.target.value })} placeholder="Anything to flag about today's eating?" rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 resize-none" />
              </div>
              {diarySubmitted ? (
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-green-600 font-medium text-center py-1">Diary logged!</div>
                  <button onClick={resetDiary} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">Log another entry</button>
                </div>
              ) : (
                <button onClick={submitDiary} className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">Log today's diary</button>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div>
          <div className="flex flex-col gap-3 mb-4">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">No messages yet</div>
            ) : messages.map((m, i) => (
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