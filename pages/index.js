import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'

// ─── SOFT NEUTRAL THEME ─────────────────────────────────────────
const C = {
  bg:        '#F7F6F3',
  bgWarm:    '#F0EDE8',
  panel:     '#FFFFFF',
  card:      '#FFFFFF',
  cardHover: '#FAFAF8',
  border:    'rgba(0,0,0,0.07)',
  borderMed: 'rgba(0,0,0,0.12)',
  shadow:    '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
  shadowLg:  '0 4px 12px rgba(0,0,0,0.06)',
  text:      '#2C3338',
  textSoft:  '#555D64',
  muted:     '#8A9199',
  dim:       '#B5BCC3',
  // Accent palette — warm, muted, organic
  sage:      '#7C9A82',
  sageBg:    'rgba(124,154,130,0.08)',
  stone:     '#C4A882',
  stoneBg:   'rgba(196,168,130,0.10)',
  sky:       '#7BA3BE',
  skyBg:     'rgba(123,163,190,0.08)',
  rose:      '#C08B8B',
  roseBg:    'rgba(192,139,139,0.08)',
  lavender:  '#9B8FC4',
  lavBg:     'rgba(155,143,196,0.08)',
  warmBg:    'rgba(196,168,130,0.06)',
  // Per-person
  bakari:     '#7BA3BE',
  jenya:      '#9B8FC4',
  monroe:     '#7C9A82',
  genevieve:  '#C4A882',
  anastasia:  '#C08B8B',
  family:     '#C4A882',
}

// ─── FAMILY DATA ─────────────────────────────────────────────────
const FAMILY_MEMBERS = [
  { id:'bakari',    name:'Bakari',    emoji:'👨🏾', color:C.bakari,    role:'Dad',       dob:'1989-01-01' },
  { id:'jenya',     name:'Jenya',     emoji:'👩',  color:C.jenya,     role:'Mom',       dob:'1991-01-01' },
  { id:'monroe',    name:'Monroe',    emoji:'⚾',  color:C.monroe,    role:'Son',       dob:'2021-03-10' },
  { id:'genevieve', name:'Genevieve', emoji:'🩰',  color:C.genevieve, role:'Daughter',  dob:'2022-11-11' },
  { id:'anastasia', name:'Anastasia', emoji:'💛',  color:C.anastasia, role:'Daughter',  dob:'2025-11-11' },
]

function getAge(dob) {
  const b = new Date(dob), n = new Date()
  let age = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--
  if (age < 1) {
    const months = (n.getFullYear()-b.getFullYear())*12 + n.getMonth()-b.getMonth()
    return months <= 0 ? 'newborn' : `${months}mo`
  }
  return `${age}y`
}

const EMERGENCY = [
  { label:'Pediatrician', name:'Austin Regional Clinic', phone:'(512) 555-0100', icon:'🩺' },
  { label:'Poison Control', name:'TX Poison Center', phone:'1-800-222-1222', icon:'☎️' },
  { label:'Westminster School', name:'Front Office', phone:'(512) 555-0200', icon:'🏫' },
  { label:'Plumber', name:'Radiant Plumbing', phone:'(512) 555-0300', icon:'🔧' },
]

const SUMMER_WEEKS = [
  { wk:1,  start:'Jun 1',  end:'Jun 5'  },
  { wk:2,  start:'Jun 8',  end:'Jun 12' },
  { wk:3,  start:'Jun 15', end:'Jun 19' },
  { wk:4,  start:'Jun 22', end:'Jun 26' },
  { wk:5,  start:'Jun 29', end:'Jul 3'  },
  { wk:6,  start:'Jul 7',  end:'Jul 11' },
  { wk:7,  start:'Jul 14', end:'Jul 18' },
  { wk:8,  start:'Jul 21', end:'Jul 25' },
  { wk:9,  start:'Jul 28', end:'Aug 1'  },
  { wk:10, start:'Aug 3',  end:'Aug 7'  },
  { wk:11, start:'Aug 10', end:'Aug 14' },
]

const CAMPS = [
  { id:'kidventure', name:'Kidventure Discoverers', type:'Multi-Activity', emoji:'🌟',
    ageMin:3, ageMax:5, costWk:370, fullDay:true,
    location:'Multiple Austin locations', driveMins:12,
    weeks:[1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve'],
    desc:'STEAM, arts, field trips. Age 3–5 program. Potty-trained required.',
    color:C.sage, tags:['STEAM','Full-Day','Multi'] },
  { id:'campjump', name:'Camp Jump! Gymnastics', type:'Gymnastics', emoji:'🤸',
    ageMin:3, ageMax:10, costWk:355, costFull:445, fullDay:true,
    location:'6800 Westgate Blvd · 2117 W Anderson Ln', driveMins:9,
    weeks:[1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve'],
    desc:'Gymnastics, dance, art, yoga, drama. 8× Austin Family Most Fun Camp.',
    color:C.stone, tags:['Gymnastics','Dance','Art'] },
  { id:'ymca', name:'Austin YMCA', type:'Multi-Sport', emoji:'🏊',
    ageMin:4, ageMax:12, costWk:272, fullDay:true,
    location:'Multiple locations', driveMins:10,
    weeks:[0,1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve'],
    desc:'Daily swim, STEM, arts & crafts, weekly field trips.',
    color:C.sky, tags:['Swim','Sports','STEAM'] },
  { id:'thinkery', name:'Thinkery STEAM Camp', type:'STEAM', emoji:'🔬',
    ageMin:5, ageMax:10, costWk:280, fullDay:false,
    location:'1830 Simond Ave, Mueller (3 mi)', driveMins:11,
    weeks:[1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe'],
    desc:'Nature, Art, Maker, Storytelling themes. K–3rd grade.',
    color:C.lavender, tags:['STEAM','Science'] },
  { id:'sportsball', name:'Sportsball Multi-Sport', type:'Sports', emoji:'⚽',
    ageMin:3, ageMax:6, costWk:225, fullDay:false,
    location:'1314 Exposition Blvd (1.4 mi!)', driveMins:5,
    weeks:[1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve'],
    desc:'Soccer, baseball, basketball, football. Closest camp to home.',
    color:C.sage, tags:['Sports','Half-Day'] },
  { id:'synergy', name:'Synergy Dance Studio', type:'Dance', emoji:'🩰',
    ageMin:2, ageMax:6, costWk:175, fullDay:false,
    location:'Westlake studio (10 min)', driveMins:10,
    weeks:[1,2,3,4,5,6,7,8,9,10], kids:['Genevieve'],
    desc:'Unicorns & Mermaids, K-Pop, Princess Party themes. Ages 2–6.',
    color:C.lavender, tags:['Dance','Ballet','Preschool'] },
  { id:'createstudio', name:'Create Studio ATX', type:'Art', emoji:'🎨',
    ageMin:3, ageMax:15, costWk:260, fullDay:false,
    location:'2438 W Anderson Ln Suite A-2', driveMins:14,
    weeks:[1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve'],
    desc:'Professional artist-educators. Clay, paint, Procreate. Materials included.',
    color:C.rose, tags:['Art','Creative'] },
  { id:'cityparks', name:'Austin Parks & Rec', type:'Outdoor', emoji:'🌳',
    ageMin:4, ageMax:12, costWk:80, fullDay:false,
    location:'Multiple city parks', driveMins:8,
    weeks:[2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve'],
    desc:'Most affordable option. Nature, STEM, cultural arts for Austin residents.',
    color:C.sage, tags:['Outdoor','Budget'] },
  { id:'goldfish', name:'Goldfish Swim School', type:'Swim', emoji:'🐟',
    ageMin:0, ageMax:12, costWk:38, fullDay:false,
    location:'NW Hills & South Austin', driveMins:15,
    weeks:[1,2,3,4,5,6,7,8,9,10,11], kids:['Monroe','Genevieve','Anastasia'],
    desc:'Year-round swim lessons from 4 months. 4:1 ratio. Shiver-free pools.',
    color:C.sky, tags:['Swim','Infant','Year-Round'] },
]

const SCHOOLS = [
  { name:'Westminster School', short:'Westminster', address:'7900 Northoaks Dr', driveMins:14, lastDay:'May 22, 2026', firstDay:'Aug 24, 2026', color:C.sky },
  { name:'Priscilla Pond Flawn Lab', short:'UT Lab School', address:'108 E Dean Keeton', driveMins:8, lastDay:'~May 16, 2026', firstDay:'Aug 2026', color:C.stone },
]

const WMO_EMOJI = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',53:'🌦️',61:'🌧️',63:'🌧️',65:'⛈️',71:'❄️',80:'🌦️',95:'⛈️'}
const WMO_LABEL = {0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',51:'Light drizzle',53:'Drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Snow',80:'Showers',95:'Thunderstorm'}
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

const AI_SYSTEM = `You are the Brock Family Hub AI — an embedded smart assistant for the Brock family in Austin, TX.

FAMILY:
• Bakari Brock — dad, GM Director at Microsoft for Startups, Austin TX
• Jenya Brock (Женя) — mom, originally from Berdyansk Ukraine, speaks Russian
• Monroe — son, age 5, T-ball ⚾, dragons, adventure, starts Kindergarten Aug 2026
• Genevieve — daughter, age 3, ballet 🩰, mermaids, creative arts
• Anastasia Helen — daughter, 5 months old (born Nov 11 2025)
• Tanya & Igor — Jenya's parents; Tanya speaks Russian primarily
• Home: 2417 Vista LN, Austin TX 78703

SCHOOLS:
• Westminster School: 7900 Northoaks Dr, 14 min drive. Last day May 22. Resumes Aug 24.
• UT Priscilla Pond Flawn Lab School: 108 E Dean Keeton, 8 min drive. Ends ~May 16.

SUMMER 2026 CAMPS (Jun 1–Aug 14, 11 weeks):
• Kidventure Discoverers: ages 3–5, $370/wk, full-day
• Camp Jump! Gymnastics: ages 3–10, $355 half/$445 full
• Austin YMCA: ages 4–12, $272/wk, daily swim
• Thinkery STEAM: ages 5–10, ~$280/wk — Monroe only
• Sportsball Multi-Sport: ages 3–6, $225/wk, 1.4 mi from home
• Synergy Dance: ages 2–6, $175/wk — Genevieve
• Create Studio ATX: ages 3–15, $260/wk, art
• Austin Parks & Rec: ages 4–12, $80/wk — budget option
• Goldfish Swim: from 4 months, $38/wk — all 3 kids

RULES:
• Be warm, practical, concise (2–4 sentences unless asked for detail)
• Respond in Russian if asked in Russian — Tanya uses this feature
• Match camp suggestions to kid ages and interests
• Note free vs paid, drive time, registration urgency
• When making a schedule, calculate total weekly and summer cost
• You can also help with meal ideas, tasks, and family logistics`

// ─── PERSISTENCE HELPERS ─────────────────────────────────────────
function loadLS(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try { const v = localStorage.getItem(`bfh_${key}`); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
function saveLS(key, val) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(`bfh_${key}`, JSON.stringify(val)) } catch {}
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────
export default function BrockFamilyHub() {
  const [tab, setTab]           = useState('home')
  const [lang, setLang]         = useState('en')
  const [now, setNow]           = useState(new Date())
  const [weather, setWeather]   = useState(null)
  const [mounted, setMounted]   = useState(false)

  // Schedule (persisted)
  const [schedule, setSchedule] = useState({})
  const [planKid, setPlanKid]   = useState('Monroe')
  const [campFilter, setCampFilter] = useState('All')

  // Tasks (persisted)
  const [tasks, setTasks]       = useState([])
  const [taskText, setTaskText] = useState('')
  const [taskAssign, setTaskAssign] = useState('Bakari')

  // Meals (persisted)
  const [meals, setMeals]       = useState({})
  const [mealDay, setMealDay]   = useState('')
  const [mealText, setMealText] = useState('')

  // Notes (persisted)
  const [notes, setNotes]       = useState([])
  const [noteText, setNoteText] = useState('')
  const [noteAuthor, setNoteAuthor] = useState('Bakari')

  // AI
  const [aiMsgs, setAiMsgs]     = useState([{
    role:'assistant',
    content:"Hi Brock family! 👋 I know your schedule, all Austin summer camps with costs and drive times, and can help with meals, tasks, and planning. Ask me anything — in English or Russian."
  }])
  const [aiInput, setAiInput]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatRef = useRef(null)
  const ru = lang === 'ru'

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSchedule(loadLS('schedule', {}))
    setTasks(loadLS('tasks', [
      { id:1, text:"Register Monroe for Kidventure Week 1", done:false, who:'Bakari', ts:Date.now()-86400000 },
      { id:2, text:"Schedule Anastasia's 6-month checkup", done:false, who:'Jenya', ts:Date.now()-43200000 },
      { id:3, text:"Buy sunscreen for camp bags", done:false, who:'Jenya', ts:Date.now() },
    ]))
    setNotes(loadLS('notes', [
      { id:1, author:'Bakari', text:"T-ball at 9:30 — don't forget Monroe's cleats! ⚾", ts:Date.now()-3600000 },
      { id:2, author:'Jenya', text:'Salmon in the fridge tonight 🐟', ts:Date.now()-1800000 },
    ]))
    setMeals(loadLS('meals', {
      Mon:'Grilled salmon & roasted veggies',
      Tue:'Chicken stir-fry with rice',
      Wed:'Taco night 🌮',
      Thu:'Pasta bolognese',
      Fri:'Pizza Friday 🍕',
      Sat:'Grilled burgers',
      Sun:'Borscht (Tanya\'s recipe) 🇺🇦',
    }))
    setMounted(true)
  }, [])

  // Persist on change
  useEffect(() => { if(mounted) saveLS('schedule', schedule) }, [schedule, mounted])
  useEffect(() => { if(mounted) saveLS('tasks', tasks) }, [tasks, mounted])
  useEffect(() => { if(mounted) saveLS('notes', notes) }, [notes, mounted])
  useEffect(() => { if(mounted) saveLS('meals', meals) }, [meals, mounted])

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])

  // Weather
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.2672&longitude=-97.7431&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&timezone=America%2FChicago')
      .then(r => r.json())
      .then(d => setWeather({ temp:Math.round(d.current.temperature_2m), code:d.current.weathercode, wind:Math.round(d.current.windspeed_10m) }))
      .catch(() => setWeather({ temp:82, code:1, wind:8 }))
  }, [])

  // AI send
  const sendAI = useCallback(async () => {
    const msg = aiInput.trim()
    if (!msg || aiLoading) return
    const msgs = [...aiMsgs, { role:'user', content:msg }]
    setAiMsgs(msgs)
    setAiInput('')
    setAiLoading(true)

    const schedCtx = Object.entries(schedule).map(([k, cid]) => {
      const [kid, wk] = k.split('-')
      const camp = CAMPS.find(c => c.id === cid)
      const week = SUMMER_WEEKS.find(w => w.wk === parseInt(wk))
      return `${kid} Week ${wk} (${week?.start}): ${camp?.name} $${camp?.costWk}/wk`
    }).join('\n')

    const system = AI_SYSTEM + (schedCtx ? `\n\nCURRENT PLANNED SCHEDULE:\n${schedCtx}` : '')

    try {
      const res = await fetch('/api/ai', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, system, messages: msgs.filter(m=>m.role!=='system').map(m=>({role:m.role,content:m.content})) })
      })
      const data = await res.json()
      setAiMsgs(p => [...p, { role:'assistant', content: data.content?.[0]?.text || 'Sorry, try again.' }])
    } catch {
      setAiMsgs(p => [...p, { role:'assistant', content:'Connection error — try again.' }])
    } finally {
      setAiLoading(false)
    }
  }, [aiInput, aiMsgs, aiLoading, schedule])

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior:'smooth' }) }, [aiMsgs])

  // Schedule helpers
  const setWeekCamp = (kid, wk, cid) => {
    setSchedule(p => cid ? { ...p, [`${kid}-${wk}`]: cid } : Object.fromEntries(Object.entries(p).filter(([k])=>k!==`${kid}-${wk}`)))
  }
  const getWeekCamp = (kid, wk) => { const cid = schedule[`${kid}-${wk}`]; return cid ? CAMPS.find(c => c.id === cid) : null }
  const kidCost = kid => Object.entries(schedule).filter(([k])=>k.startsWith(`${kid}-`)).reduce((s,[,cid])=>s+(CAMPS.find(c=>c.id===cid)?.costWk||0),0)
  const totalCost = kidCost('Monroe') + kidCost('Genevieve')
  const weeksPlanned = kid => Object.keys(schedule).filter(k=>k.startsWith(`${kid}-`)).length
  const filteredCamps = campFilter === 'All' ? CAMPS : CAMPS.filter(c => c.tags.includes(campFilter) || c.type === campFilter)

  // Task helpers
  const addTask = () => {
    if (!taskText.trim()) return
    setTasks(p => [...p, { id:Date.now(), text:taskText.trim(), done:false, who:taskAssign, ts:Date.now() }])
    setTaskText('')
  }
  const toggleTask = id => setTasks(p => p.map(t => t.id === id ? { ...t, done:!t.done } : t))
  const removeTask = id => setTasks(p => p.filter(t => t.id !== id))

  // Meal helpers
  const setMeal = () => {
    if (!mealDay || !mealText.trim()) return
    setMeals(p => ({ ...p, [mealDay]: mealText.trim() }))
    setMealText(''); setMealDay('')
  }

  const fmtTime = d => { const h=d.getHours(),m=String(d.getMinutes()).padStart(2,'0'); return `${h%12||12}:${m} ${h>=12?'PM':'AM'}` }
  const wEmoji = WMO_EMOJI[weather?.code??1] ?? '🌤️'
  const wLabel = WMO_LABEL[weather?.code??1] ?? 'Partly cloudy'

  // ─── UPCOMING EVENTS (dynamic) ──────
  const UPCOMING = [
    { date:'May 16', label:'UT Lab School — last day', color:C.stone },
    { date:'May 22', label:'Westminster — last day', color:C.sky },
    { date:'Jun 1',  label:'Summer camps begin', color:C.sage },
    { date:'Aug 14', label:'Summer camps end', color:C.sage },
    { date:'Aug 24', label:'Westminster resumes — Monroe starts K!', color:C.sky },
    { date:'Nov 11', label:"Anastasia turns 1 🎂", color:C.rose },
  ]

  // ─── STYLES ────────────────────────────────────────────────────
  const s = {
    card: (extra={}) => ({
      background:C.card, borderRadius:14, padding:'16px 18px',
      border:`1px solid ${C.border}`, boxShadow:C.shadow, ...extra
    }),
    sectionLabel: {
      fontSize:'0.62rem', letterSpacing:'0.16em', textTransform:'uppercase',
      fontWeight:700, color:C.muted, marginBottom:12, display:'flex', alignItems:'center', gap:8
    },
    labelLine: { flex:1, height:1, background:C.border },
    tabBtn: active => ({
      padding:'8px 18px', borderRadius:10, border:'none', cursor:'pointer',
      fontFamily:"'Outfit',sans-serif", fontSize:'0.72rem', fontWeight:active?700:500,
      letterSpacing:'0.04em', transition:'all 0.2s ease',
      background:active?C.sage:'transparent',
      color:active?'#fff':C.muted,
      boxShadow:active?'0 2px 8px rgba(124,154,130,0.25)':'none',
    }),
    pill: (active, color=C.sage) => ({
      padding:'5px 14px', borderRadius:20, border:`1px solid ${active?color:C.border}`,
      cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontSize:'0.65rem', fontWeight:600,
      transition:'all 0.15s', background:active?color+'18':'transparent',
      color:active?color:C.muted,
    }),
    input: {
      background:C.bg, border:`1px solid ${C.border}`, borderRadius:10,
      padding:'9px 13px', fontFamily:"'Outfit',sans-serif", fontSize:'0.78rem',
      color:C.text, outline:'none', width:'100%', transition:'border 0.15s',
    },
    btn: (color=C.sage) => ({
      padding:'9px 18px', borderRadius:10, border:'none', cursor:'pointer',
      fontFamily:"'Outfit',sans-serif", fontSize:'0.7rem', fontWeight:700,
      background:color, color:'#fff', transition:'all 0.15s',
      boxShadow:`0 2px 6px ${color}33`,
    }),
    memberColor: id => FAMILY_MEMBERS.find(m=>m.id===id)?.color || C.muted,
  }

  // ─── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Brock Family Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily:"'Outfit',sans-serif", background:C.bg, minHeight:'100vh', color:C.text }}>

        {/* ═══ TOP BAR ═══════════════════════════════════════════ */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 24px', background:C.panel, borderBottom:`1px solid ${C.border}`,
          position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 4px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
            <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.15rem', fontWeight:400, color:C.text }}>
              Brock <span style={{ color:C.sage }}>Family</span> Hub
            </span>
            <span style={{ fontSize:'0.52rem', letterSpacing:'0.14em', textTransform:'uppercase', color:C.dim }}>Austin · 78703</span>
          </div>

          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center' }}>
            {[['home','🏠 Home'],['planner','📅 Planner'],['camps','🏕️ Camps'],['assistant','🤖 Assistant']].map(([id,lbl]) => (
              <button key={id} style={s.tabBtn(tab===id)} onClick={()=>setTab(id)}>{lbl}</button>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', background:C.bg, borderRadius:20, overflow:'hidden', border:`1px solid ${C.border}` }}>
              {[['EN','en'],['РУ','ru']].map(([lbl,code]) => (
                <button key={code} onClick={()=>setLang(code)} style={{
                  padding:'4px 12px', border:'none', cursor:'pointer',
                  fontFamily:"'Outfit',sans-serif", fontSize:'0.6rem', fontWeight:700,
                  background:lang===code?C.sage:'transparent',
                  color:lang===code?'#fff':C.muted, transition:'all 0.18s'
                }}>{lbl}</button>
              ))}
            </div>
            <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.15rem', fontWeight:400, color:C.textSoft }}>
              {fmtTime(now)}
            </span>
          </div>
        </div>

        {/* ═══ CONTENT ═══════════════════════════════════════════ */}
        <div style={{ padding:'20px 24px', maxWidth:1400, margin:'0 auto' }}>

          {/* ── HOME TAB ──────────────────────────────────────── */}
          {tab === 'home' && (
            <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 280px', gap:16, alignItems:'start' }}>

              {/* LEFT COLUMN */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                {/* Date + Weather */}
                <div style={{ ...s.card({ background:`linear-gradient(135deg, ${C.panel}, ${C.bgWarm})`, padding:'20px 18px' }) }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'3.2rem', fontWeight:400, lineHeight:1, color:C.sage }}>
                    {now.getDate()}
                  </div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1rem', color:C.text, marginTop:2 }}>
                    {MONTH_FULL[now.getMonth()]} {now.getFullYear()}
                  </div>
                  <div style={{ fontSize:'0.58rem', letterSpacing:'0.16em', textTransform:'uppercase', color:C.dim, marginTop:4 }}>
                    {DAYS_FULL[now.getDay()]}
                  </div>
                  <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:'1.6rem' }}>{wEmoji}</span>
                    <div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem', fontWeight:400, color:C.text }}>
                        {weather ? `${weather.temp}°F` : '—'}
                      </div>
                      <div style={{ fontSize:'0.62rem', color:C.muted }}>{weather ? wLabel : 'Loading…'}</div>
                    </div>
                  </div>
                </div>

                {/* Family Members */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Семья':'Family'}<div style={s.labelLine}/></div>
                  {FAMILY_MEMBERS.map((m,i) => (
                    <div key={m.id} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'7px 0',
                      borderBottom:i<FAMILY_MEMBERS.length-1?`1px solid ${C.border}`:'none'
                    }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%', background:m.color+'15',
                        border:`1.5px solid ${m.color}44`, display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:'0.95rem', flexShrink:0
                      }}>{m.emoji}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'0.8rem' }}>{m.name}</div>
                        <div style={{ fontSize:'0.6rem', color:C.muted }}>{m.role} · {getAge(m.dob)}</div>
                      </div>
                      <div style={{ width:7, height:7, borderRadius:'50%', background:m.color, opacity:0.6 }}/>
                    </div>
                  ))}
                </div>

                {/* Schools */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Школы':'Schools'}<div style={s.labelLine}/></div>
                  {SCHOOLS.map((sch,i) => (
                    <div key={i} style={{ marginBottom:i<SCHOOLS.length-1?10:0 }}>
                      <div style={{ fontSize:'0.78rem', fontWeight:600, color:sch.color }}>{sch.short}</div>
                      <div style={{ fontSize:'0.6rem', color:C.muted, marginTop:2 }}>📍 {sch.address} · 🚗 {sch.driveMins} min</div>
                      <div style={{ fontSize:'0.58rem', color:C.dim, marginTop:1 }}>Last day {sch.lastDay} · Back {sch.firstDay}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CENTER COLUMN */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                {/* Today's Events */}
                <div style={s.card()}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.35rem' }}>
                      {ru?'Сегодня':'Today'} — {DAYS_FULL[now.getDay()]}
                    </div>
                    <span style={{
                      fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
                      padding:'3px 10px', borderRadius:20, background:C.sageBg, color:C.sage
                    }}>LIVE</span>
                  </div>

                  {[
                    { time:'7:30', period:'AM', title:'Kids Prep & School Dropoff', sub:'Recurring Mon/Wed/Fri', person:'Family', color:C.stone },
                    { time:'9:30', period:'AM', title:'T-ball Game ⚾', sub:'📍 WAYA · 1314 Exposition Blvd', person:'Monroe', color:C.sage },
                    { time:'5:00', period:'PM', title:'Family Walk / Pool Time', sub:'📍 Neighborhood', person:'Family', color:C.sky },
                  ].map((evt,i) => {
                    const mc = FAMILY_MEMBERS.find(m=>m.name===evt.person)
                    return (
                      <div key={i} style={{
                        display:'flex', gap:12, padding:'12px 14px', borderRadius:10, marginBottom:8,
                        borderLeft:`3px solid ${evt.color}`, background:evt.color+'08'
                      }}>
                        <div style={{ minWidth:50 }}>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1rem', color:C.text }}>{evt.time}</div>
                          <div style={{ fontSize:'0.52rem', textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted }}>{evt.period}</div>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:'0.82rem' }}>{evt.title}</div>
                          <div style={{ fontSize:'0.65rem', color:C.muted, marginTop:2 }}>{evt.sub}</div>
                        </div>
                        <span style={{
                          fontSize:'0.55rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
                          padding:'2px 8px', borderRadius:8, background:evt.color+'15', color:evt.color, alignSelf:'flex-start'
                        }}>{evt.person}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Tasks */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Задачи':'Tasks'}<div style={s.labelLine}/></div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12, maxHeight:220, overflowY:'auto' }}>
                    {tasks.map(t => {
                      const mc = FAMILY_MEMBERS.find(m=>m.name===t.who)
                      return (
                        <div key={t.id} style={{
                          display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                          borderRadius:8, background:t.done?C.bg:'transparent',
                          border:`1px solid ${t.done?'transparent':C.border}`,
                          opacity:t.done?0.5:1, transition:'all 0.2s'
                        }}>
                          <div onClick={()=>toggleTask(t.id)} style={{
                            width:20, height:20, borderRadius:6, border:`2px solid ${t.done?C.sage:C.border}`,
                            background:t.done?C.sage:'transparent', cursor:'pointer', flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color:'#fff', fontSize:'0.6rem', fontWeight:700, transition:'all 0.15s'
                          }}>{t.done?'✓':''}</div>
                          <div style={{ flex:1, textDecoration:t.done?'line-through':'none' }}>
                            <div style={{ fontSize:'0.78rem', lineHeight:1.4 }}>{t.text}</div>
                          </div>
                          <span style={{
                            fontSize:'0.52rem', fontWeight:700, color:mc?.color||C.muted,
                            padding:'2px 6px', borderRadius:6, background:mc?.color+'12'||C.bg,
                          }}>{t.who}</span>
                          <button onClick={()=>removeTask(t.id)} style={{
                            background:'none', border:'none', color:C.dim, cursor:'pointer',
                            fontSize:'0.7rem', padding:'2px 4px', borderRadius:4,
                          }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', gap:6, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                    <select value={taskAssign} onChange={e=>setTaskAssign(e.target.value)} style={{
                      ...s.input, width:100, padding:'7px 8px', fontSize:'0.7rem',
                    }}>
                      {FAMILY_MEMBERS.filter(m=>['bakari','jenya'].includes(m.id)).map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <input value={taskText} onChange={e=>setTaskText(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&addTask()}
                      placeholder={ru?'Добавить задачу…':'Add a task…'}
                      style={{ ...s.input, flex:1 }} />
                    <button onClick={addTask} style={{ ...s.btn(), padding:'7px 14px' }}>+</button>
                  </div>
                </div>

                {/* Family Board */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Доска':'Family Board'}<div style={s.labelLine}/></div>
                  <div style={{ maxHeight:180, overflowY:'auto', display:'flex', flexDirection:'column', gap:7, marginBottom:10 }}>
                    {notes.map(n => {
                      const m = FAMILY_MEMBERS.find(fm=>fm.name===n.author)
                      return (
                        <div key={n.id} style={{
                          background:m?.color+'08', borderRadius:10, padding:'9px 12px',
                          border:`1px solid ${m?.color+'18'||C.border}`
                        }}>
                          <div style={{ fontSize:'0.55rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:m?.color||C.muted, marginBottom:3 }}>{n.author}</div>
                          <div style={{ fontSize:'0.78rem', lineHeight:1.5 }}>{n.text}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                    <select value={noteAuthor} onChange={e=>setNoteAuthor(e.target.value)} style={{ ...s.input, padding:'5px 8px', fontSize:'0.7rem' }}>
                      {FAMILY_MEMBERS.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <div style={{ display:'flex', gap:6 }}>
                      <input value={noteText} onChange={e=>setNoteText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter'&&noteText.trim()){setNotes(p=>[...p,{id:Date.now(),author:noteAuthor,text:noteText.trim(),ts:Date.now()}]);setNoteText('')}}}
                        placeholder={ru?'Написать…':'Write a note…'} maxLength={160}
                        style={{ ...s.input, flex:1 }} />
                      <button onClick={()=>{if(noteText.trim()){setNotes(p=>[...p,{id:Date.now(),author:noteAuthor,text:noteText.trim(),ts:Date.now()}]);setNoteText('')}}}
                        style={{ ...s.btn(C.stone), padding:'7px 14px' }}>→</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                {/* Summer Budget */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Лето 2026':'Summer 2026'}<div style={s.labelLine}/></div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'2rem', color:C.sage }}>
                    ${totalCost.toLocaleString()}
                  </div>
                  <div style={{ fontSize:'0.62rem', color:C.muted, marginBottom:10 }}>{ru?'Запланировано':'budgeted so far'}</div>
                  {['Monroe','Genevieve'].map(k => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', padding:'5px 0', borderTop:`1px solid ${C.border}` }}>
                      <span style={{ color:FAMILY_MEMBERS.find(m=>m.name===k)?.color, fontWeight:600 }}>{k}</span>
                      <span>{weeksPlanned(k)}/11 wks · <span style={{ color:C.sage, fontWeight:600 }}>${kidCost(k).toLocaleString()}</span></span>
                    </div>
                  ))}
                  <button onClick={()=>setTab('planner')} style={{
                    ...s.btn(), width:'100%', marginTop:12, fontSize:'0.62rem', letterSpacing:'0.08em', textTransform:'uppercase'
                  }}>{ru?'Открыть планировщик →':'Open Planner →'}</button>
                </div>

                {/* Meal Plan */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Меню':'Meal Plan'}<div style={s.labelLine}/></div>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                    <div key={day} style={{
                      display:'flex', gap:8, padding:'5px 0', fontSize:'0.72rem',
                      borderBottom:`1px solid ${C.border}`, alignItems:'center'
                    }}>
                      <span style={{ width:32, fontWeight:700, color:C.muted, fontSize:'0.6rem', textTransform:'uppercase' }}>{day}</span>
                      <span style={{ flex:1, color:meals[day]?C.text:C.dim }}>
                        {meals[day] || '—'}
                      </span>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:4, marginTop:10 }}>
                    <select value={mealDay} onChange={e=>setMealDay(e.target.value)} style={{ ...s.input, width:70, padding:'5px', fontSize:'0.65rem' }}>
                      <option value="">Day</option>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><option key={d} value={d}>{d}</option>)}
                    </select>
                    <input value={mealText} onChange={e=>setMealText(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&setMeal()}
                      placeholder="Meal…" style={{ ...s.input, flex:1, padding:'5px 8px', fontSize:'0.65rem' }} />
                    <button onClick={setMeal} style={{ ...s.btn(C.stone), padding:'5px 10px', fontSize:'0.6rem' }}>Set</button>
                  </div>
                </div>

                {/* Upcoming */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Скоро':'Coming Up'}<div style={s.labelLine}/></div>
                  {UPCOMING.map((item,i,arr) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'6px 0', borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none' }}>
                      <div style={{ minWidth:36, textAlign:'center' }}>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'0.95rem', color:item.color, lineHeight:1 }}>
                          {item.date.split(' ')[1]}
                        </div>
                        <div style={{ fontSize:'0.5rem', textTransform:'uppercase', letterSpacing:'0.08em', color:C.muted }}>
                          {item.date.split(' ')[0]}
                        </div>
                      </div>
                      <div style={{ fontSize:'0.72rem', color:C.textSoft, lineHeight:1.4 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Emergency Contacts */}
                <div style={s.card()}>
                  <div style={s.sectionLabel}>{ru?'Экстренные':'Emergency'}<div style={s.labelLine}/></div>
                  {EMERGENCY.map((c,i) => (
                    <div key={i} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:i<EMERGENCY.length-1?`1px solid ${C.border}`:'none', alignItems:'center' }}>
                      <span style={{ fontSize:'0.9rem' }}>{c.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.72rem', fontWeight:600 }}>{c.label}</div>
                        <div style={{ fontSize:'0.58rem', color:C.muted }}>{c.name}</div>
                      </div>
                      <a href={`tel:${c.phone.replace(/\D/g,'')}`} style={{ fontSize:'0.62rem', color:C.sage, fontWeight:600, textDecoration:'none' }}>{c.phone}</a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PLANNER TAB ─────────────────────────────────── */}
          {tab === 'planner' && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem' }}>
                    Summer <span style={{ color:C.sage }}>Scenario Builder</span>
                  </div>
                  <div style={{ fontSize:'0.65rem', color:C.muted, marginTop:3 }}>
                    Jun 1 – Aug 14, 2026 · 11 weeks · Assign camps week by week · Changes auto-save
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {['Monroe','Genevieve'].map(k => {
                    const m = FAMILY_MEMBERS.find(fm=>fm.name===k)
                    return (
                      <div key={k} style={{ ...s.card({ textAlign:'center', minWidth:110 }) }}>
                        <div style={{ fontSize:'0.55rem', letterSpacing:'0.1em', textTransform:'uppercase', color:m?.color, marginBottom:3, fontWeight:700 }}>{k}</div>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.3rem', color:C.sage }}>${kidCost(k).toLocaleString()}</div>
                        <div style={{ fontSize:'0.56rem', color:C.muted }}>{weeksPlanned(k)}/11 weeks</div>
                      </div>
                    )
                  })}
                  <div style={{ ...s.card({ textAlign:'center', minWidth:100, borderColor:C.sage+'44', background:C.sageBg }) }}>
                    <div style={{ fontSize:'0.55rem', letterSpacing:'0.1em', textTransform:'uppercase', color:C.sage, marginBottom:3, fontWeight:700 }}>Total</div>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.3rem', color:C.sage }}>${totalCost.toLocaleString()}</div>
                    <div style={{ fontSize:'0.56rem', color:C.muted }}>summer budget</div>
                  </div>
                </div>
              </div>

              {/* Kid selector */}
              <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                {['Monroe','Genevieve'].map(k => {
                  const m = FAMILY_MEMBERS.find(fm=>fm.name===k)
                  return <button key={k} style={s.pill(planKid===k, m?.color)} onClick={()=>setPlanKid(k)}>{m?.emoji} {k}</button>
                })}
                <span style={{ fontSize:'0.62rem', color:C.muted, alignSelf:'center', marginLeft:8 }}>
                  Click a week to assign or change a camp
                </span>
              </div>

              {/* Week grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px,1fr))', gap:10, marginBottom:20 }}>
                {SUMMER_WEEKS.map(week => {
                  const assigned = getWeekCamp(planKid, week.wk)
                  const eligible = CAMPS.filter(c => c.kids.includes(planKid) && c.weeks.includes(week.wk))
                  const isJul4 = week.wk === 5
                  return (
                    <div key={week.wk} style={{
                      ...s.card({
                        minHeight:130,
                        borderColor:assigned?assigned.color+'55':C.border,
                        background:assigned?assigned.color+'08':C.card,
                        position:'relative'
                      })
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                        <div>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1rem', color:assigned?assigned.color:C.muted }}>W{week.wk}</div>
                          <div style={{ fontSize:'0.56rem', color:C.muted }}>{week.start}–{week.end}</div>
                        </div>
                        {isJul4 && <span style={{ fontSize:'0.56rem', color:C.stone }}>🎆 Jul 4</span>}
                      </div>
                      {assigned ? (
                        <div>
                          <div style={{ fontSize:'0.75rem', fontWeight:700, color:assigned.color, lineHeight:1.2, marginBottom:4 }}>{assigned.emoji} {assigned.name}</div>
                          <div style={{ fontSize:'0.6rem', color:C.muted }}>${assigned.costWk}/wk · {assigned.driveMins} min</div>
                          <button onClick={()=>setWeekCamp(planKid,week.wk,null)} style={{
                            position:'absolute', top:8, right:8, background:C.bg, border:`1px solid ${C.border}`,
                            color:C.muted, borderRadius:6, padding:'2px 7px', fontSize:'0.58rem', cursor:'pointer'
                          }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {eligible.slice(0,3).map(c => (
                            <button key={c.id} onClick={()=>setWeekCamp(planKid,week.wk,c.id)} style={{
                              padding:'4px 8px', borderRadius:7, border:`1px solid ${c.color}33`,
                              background:c.color+'0a', color:c.color, fontFamily:"'Outfit',sans-serif",
                              fontSize:'0.6rem', fontWeight:600, cursor:'pointer', textAlign:'left',
                              transition:'all 0.12s'
                            }}>
                              {c.emoji} {c.name.split(' ').slice(0,2).join(' ')} — ${c.costWk}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              {Object.keys(schedule).length > 0 && (
                <div style={{ ...s.card({ borderColor:C.sage+'33' }), marginBottom:16 }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.15rem', marginBottom:12 }}>Schedule Summary</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                    {['Monroe','Genevieve'].map(k => {
                      const entries = Object.entries(schedule).filter(([key])=>key.startsWith(`${k}-`))
                      const m = FAMILY_MEMBERS.find(fm=>fm.name===k)
                      return (
                        <div key={k}>
                          <div style={{ fontSize:'0.58rem', letterSpacing:'0.12em', textTransform:'uppercase', color:m?.color, marginBottom:8, fontWeight:700 }}>{k}</div>
                          {entries.length===0 ? <div style={{ fontSize:'0.72rem', color:C.muted }}>No camps assigned yet</div> : entries.map(([key,cid]) => {
                            const wk = parseInt(key.split('-')[1])
                            const camp = CAMPS.find(c=>c.id===cid)
                            const week = SUMMER_WEEKS.find(w=>w.wk===wk)
                            return (
                              <div key={key} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.68rem', padding:'3px 0', borderBottom:`1px solid ${C.border}` }}>
                                <span style={{ color:C.muted }}>{week?.start}–{week?.end}</span>
                                <span>{camp?.emoji} {camp?.name.split(' ').slice(0,2).join(' ')}</span>
                                <span style={{ color:C.sage, fontWeight:600 }}>${camp?.costWk}</span>
                              </div>
                            )
                          })}
                          <div style={{ marginTop:6, fontSize:'0.72rem', fontWeight:700, color:C.sage }}>Total: ${kidCost(k).toLocaleString()}</div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={()=>{setAiInput('Review my current schedule and optimize it.');setTab('assistant')}} style={{
                    ...s.btn(), marginTop:14, letterSpacing:'0.06em',
                  }}>🤖 Optimize with AI →</button>
                </div>
              )}
            </div>
          )}

          {/* ── CAMPS TAB ─────────────────────────────────── */}
          {tab === 'camps' && (
            <div>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem' }}>
                    Austin Summer <span style={{ color:C.sage }}>Camps 2026</span>
                  </div>
                  <div style={{ fontSize:'0.63rem', color:C.muted, marginTop:3 }}>
                    Sources: KidsOutAndAbout · Austin Chronicle · Do512 Family · AustinFunForKids
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1rem', color:C.sage }}>{CAMPS.length}</span>
                  <span style={{ fontSize:'0.62rem', color:C.muted }}>camps curated</span>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16 }}>
                {['All','Sports','Gymnastics','Dance','STEAM','Art','Swim','Outdoor'].map(f => (
                  <button key={f} style={s.pill(campFilter===f)} onClick={()=>setCampFilter(f)}>{f}</button>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12 }}>
                {filteredCamps.map(camp => (
                  <div key={camp.id} style={{
                    ...s.card({ borderLeft:`3px solid ${camp.color}`, display:'flex', flexDirection:'column' })
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:8 }}>
                      <span style={{ fontSize:'1.4rem', lineHeight:1 }}>{camp.emoji}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:'0.85rem', lineHeight:1.2 }}>{camp.name}</div>
                        <div style={{ fontSize:'0.58rem', color:C.muted, marginTop:1 }}>{camp.type}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.05rem', color:C.sage }}>${camp.costWk}</div>
                        <div style={{ fontSize:'0.52rem', color:C.muted }}>/week</div>
                      </div>
                    </div>

                    <div style={{ fontSize:'0.72rem', lineHeight:1.55, color:C.textSoft, marginBottom:8 }}>{camp.desc}</div>

                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                      <span style={{ fontSize:'0.56rem', padding:'2px 8px', borderRadius:8, background:camp.color+'12', color:camp.color, fontWeight:700 }}>Ages {camp.ageMin}–{camp.ageMax}</span>
                      <span style={{ fontSize:'0.56rem', padding:'2px 8px', borderRadius:8, background:C.bg, color:C.muted }}>🚗 {camp.driveMins} min</span>
                      {camp.kids.map(k => {
                        const m = FAMILY_MEMBERS.find(fm=>fm.name===k)
                        return <span key={k} style={{ fontSize:'0.54rem', padding:'2px 7px', borderRadius:8, background:m?.color+'12', color:m?.color, fontWeight:600 }}>{k}</span>
                      })}
                    </div>

                    <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:10 }}>📍 {camp.location}</div>

                    <div style={{ marginTop:'auto', display:'flex', gap:6 }}>
                      {camp.kids.map(k => (
                        <button key={k} onClick={()=>{setPlanKid(k);setTab('planner')}} style={{
                          flex:1, padding:'7px 8px', borderRadius:8,
                          border:`1px solid ${FAMILY_MEMBERS.find(m=>m.name===k)?.color+'33'}`,
                          background:FAMILY_MEMBERS.find(m=>m.name===k)?.color+'08',
                          color:FAMILY_MEMBERS.find(m=>m.name===k)?.color,
                          fontFamily:"'Outfit',sans-serif", fontSize:'0.62rem', fontWeight:700, cursor:'pointer'
                        }}>+ {k}'s Plan</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ASSISTANT TAB ──────────────────────────────── */}
          {tab === 'assistant' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, height:'calc(100vh - 140px)' }}>

              {/* Chat */}
              <div style={{ ...s.card({ display:'flex', flexDirection:'column' }) }}>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.35rem' }}>
                    Family <span style={{ color:C.sage }}>AI Assistant</span>
                  </div>
                  <div style={{ fontSize:'0.6rem', color:C.muted }}>
                    Knows camps, costs, drive times, schedules · Responds in Russian for Tanya
                  </div>
                </div>

                <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:9, paddingRight:2 }}>
                  {aiMsgs.map((m,i) => (
                    <div key={i} style={{
                      maxWidth:'84%', alignSelf:m.role==='user'?'flex-end':'flex-start',
                      background:m.role==='user'?C.sage:C.bg,
                      color:m.role==='user'?'#fff':C.text,
                      borderRadius:m.role==='user'?'14px 14px 3px 14px':'14px 14px 14px 3px',
                      padding:'11px 14px', fontSize:'0.78rem', lineHeight:1.6,
                      border:m.role==='user'?'none':`1px solid ${C.border}`,
                      boxShadow:m.role==='user'?'0 2px 8px rgba(124,154,130,0.2)':'none',
                    }}>{m.content}</div>
                  ))}
                  {aiLoading && (
                    <div style={{
                      alignSelf:'flex-start', padding:'11px 14px', background:C.bg,
                      borderRadius:'14px 14px 14px 3px', fontSize:'0.75rem', color:C.muted,
                      border:`1px solid ${C.border}`
                    }}>{ru?'Думаю…':'Thinking…'}</div>
                  )}
                  <div ref={chatRef}/>
                </div>

                <div style={{ display:'flex', gap:8, paddingTop:12, borderTop:`1px solid ${C.border}`, marginTop:8 }}>
                  <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendAI()}
                    placeholder={ru?'Спроси о лагерях, расписании, стоимости…':'Ask about camps, schedules, costs, meals…'}
                    style={{ ...s.input, flex:1 }} />
                  <button onClick={sendAI} disabled={aiLoading} style={{
                    ...s.btn(), opacity:aiLoading?0.5:1, padding:'9px 18px'
                  }}>→</button>
                </div>
              </div>

              {/* Quick prompts */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
                <div style={{ fontSize:'0.55rem', letterSpacing:'0.16em', textTransform:'uppercase', color:C.muted, fontWeight:700, marginBottom:4 }}>Quick Prompts</div>
                {[
                  { icon:'🏆', label:'Best full summer plan', q:'Suggest the optimal 11-week summer plan for Monroe and Genevieve — balance their interests, minimize drive time from 2417 Vista LN, stay under $8,000 total.' },
                  { icon:'💰', label:'Budget under $4,000', q:'Create a summer schedule for both kids under $4,000 total, prioritizing camps close to home.' },
                  { icon:'⚽', label:'Sports-heavy Monroe', q:'Monroe loves sports and adventure. Plan his 11-week summer focusing on sports and active camps with variety.' },
                  { icon:'🩰', label:'Dance & art Genevieve', q:'Genevieve loves ballet and creative arts. Plan her summer around dance and art camps.' },
                  { icon:'📍', label:'Closest to home', q:'Which camps are closest to 2417 Vista LN? Rank by drive time and build a low-commute summer schedule.' },
                  { icon:'📊', label:'Full cost breakdown', q:'Give me a side-by-side cost comparison of all 9 available camps, cheapest to most expensive, with drive times.' },
                  { icon:'🗓', label:'No coverage gaps', q:'Westminster ends May 22 and resumes Aug 24. UT Lab ends mid-May. How do I structure summer with zero coverage gaps?' },
                  { icon:'🍽', label:'Weekly meal ideas', q:'Suggest a week of family-friendly dinners. Keep it healthy but kid-approved. Include one Russian dish for Tanya.' },
                  { icon:'🇷🇺', label:'Спроси по-русски', q:'Какие лагеря лучше всего подходят для Женевьевы этим летом? Расскажи о танцевальных и творческих вариантах.' },
                ].map((p,i) => (
                  <button key={i} onClick={()=>{setAiInput(p.q)}}
                    style={{ ...s.card({ padding:'10px 12px', cursor:'pointer', textAlign:'left', transition:'all 0.12s' }) }}>
                    <div style={{ fontSize:'0.72rem', fontWeight:600, marginBottom:3 }}>{p.icon} {p.label}</div>
                    <div style={{ fontSize:'0.58rem', color:C.muted, lineHeight:1.4 }}>{p.q.slice(0,65)}…</div>
                  </button>
                ))}

                {/* Current plan in sidebar */}
                {Object.keys(schedule).length > 0 && (
                  <div style={{ ...s.card({ borderColor:C.sage+'33', background:C.sageBg, marginTop:4 }) }}>
                    <div style={{ fontSize:'0.55rem', letterSpacing:'0.12em', textTransform:'uppercase', color:C.sage, marginBottom:6, fontWeight:700 }}>Current Plan</div>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.3rem', color:C.sage }}>${totalCost.toLocaleString()}</div>
                    <div style={{ fontSize:'0.65rem', color:C.muted }}>Monroe {weeksPlanned('Monroe')} wks · Genevieve {weeksPlanned('Genevieve')} wks</div>
                    <button onClick={()=>setAiInput('Review my current planned schedule and suggest improvements.')} style={{
                      marginTop:8, width:'100%', padding:'6px', borderRadius:7,
                      border:`1px solid ${C.sage}44`, background:'transparent',
                      color:C.sage, fontFamily:"'Outfit',sans-serif", fontSize:'0.62rem', fontWeight:700, cursor:'pointer'
                    }}>Review Current Plan →</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ═══ FOOTER ═══════════════════════════════════════════ */}
        <div style={{
          textAlign:'center', padding:'20px 24px', fontSize:'0.55rem',
          color:C.dim, letterSpacing:'0.08em', borderTop:`1px solid ${C.border}`, marginTop:40
        }}>
          Brock Family Hub v2.0 · Austin, TX · Built with ❤️
        </div>
      </div>
    </>
  )
}
