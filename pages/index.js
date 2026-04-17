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

// Compute the coming weekend (Sat/Sun) relative to `today`.
// Mon–Fri → next Sat/Sun  |  Sat → this Sat + Sun  |  Sun → prev Sat + this Sun
function computeWeekendDates(today = new Date()) {
  const dow = today.getDay() // 0=Sun, 6=Sat
  const clone = (d) => new Date(d.getTime())
  let sat, sun
  if (dow === 0) {
    sat = clone(today); sat.setDate(today.getDate() - 1)
    sun = clone(today)
  } else if (dow === 6) {
    sat = clone(today)
    sun = clone(today); sun.setDate(today.getDate() + 1)
  } else {
    sat = clone(today); sat.setDate(today.getDate() + (6 - dow))
    sun = clone(sat); sun.setDate(sat.getDate() + 1)
  }
  return { sat, sun }
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

// ─── CURATED AUSTIN FAMILY DISCOVER FEED ─────────────────────────
// Categories: outdoor | kids | music | food | art | date
// dayPref: 'sat' | 'sun' | 'any' (used by weekend suggestions)
const DISCOVER_EVENTS = [
  { id:'zilker-botanical', title:'Zilker Botanical Garden — Spring Bloom', emoji:'🌳', category:'outdoor',
    venue:'Zilker Botanical Garden', address:'2220 Barton Springs Rd', dayPref:'sat',
    timeLabel:'10am–4pm', priceLabel:'Free', ages:'All ages', tags:['Outdoor','All ages'],
    heroGrad:'linear-gradient(135deg,#7C9A82,#C4A882)' },
  { id:'thinkery-openmake', title:'Thinkery Family Studio — Open Make', emoji:'🎨', category:'kids',
    venue:'Thinkery', address:'1830 Simond Ave', dayPref:'sat',
    timeLabel:'11am–2pm', priceLabel:'$14', ages:'2+', tags:['Kids','Indoor'],
    heroGrad:'linear-gradient(135deg,#7BA3BE,#9B8FC4)' },
  { id:'austin-symphony-family', title:'Austin Symphony — Family Concert', emoji:'🎶', category:'music',
    venue:'Long Center', address:'701 W Riverside Dr', dayPref:'sat',
    timeLabel:'11am', priceLabel:'$12 family', ages:'3+', tags:['Music','Kids'],
    heroGrad:'linear-gradient(135deg,#C08B8B,#9B8FC4)' },
  { id:'ladybird-loop', title:'Lady Bird Lake Loop — Family Bike Ride', emoji:'🚴', category:'outdoor',
    venue:'Auditorium Shores', address:'800 W Riverside Dr', dayPref:'sun',
    timeLabel:'Anytime', priceLabel:'Free', ages:'All ages', tags:['Outdoor','All ages'],
    heroGrad:'linear-gradient(135deg,#7C9A82,#C4A882)' },
  { id:'austin-zoo-toddler', title:'Austin Zoo — Toddler Sunday', emoji:'🦒', category:'kids',
    venue:'Austin Zoo', address:'10808 Rawhide Trail', dayPref:'sun',
    timeLabel:'9am–5pm', priceLabel:'$15/adult', ages:'Toddler+', tags:['Kids','Outdoor'],
    heroGrad:'linear-gradient(135deg,#C4A882,#C08B8B)' },
  { id:'bouldin-brunch', title:'Pancake Breakfast — Bouldin Acres', emoji:'🥞', category:'food',
    venue:'Bouldin Acres', address:'2027 S Lamar', dayPref:'sun',
    timeLabel:'9am–12pm', priceLabel:'$$', ages:'All ages', tags:['Family','Brunch'],
    heroGrad:'linear-gradient(135deg,#C4A882,#7BA3BE)' },
  { id:'mckinney-falls', title:'McKinney Falls Family Hike', emoji:'🥾', category:'outdoor',
    venue:'McKinney Falls State Park', address:'5808 McKinney Falls Pkwy', dayPref:'any',
    timeLabel:'Open dawn–dusk', priceLabel:'$6/car', ages:'All ages', tags:['Outdoor','Hike'],
    heroGrad:'linear-gradient(135deg,#7C9A82,#7BA3BE)' },
  { id:'acl-live-datenight', title:'ACL Live — Date Night Show', emoji:'🎵', category:'date',
    venue:'Moody Theater', address:'310 Willie Nelson Blvd', dayPref:'sat',
    timeLabel:'8pm', priceLabel:'$45+', ages:'Adults', tags:['Date','Music'],
    heroGrad:'linear-gradient(135deg,#C08B8B,#9B8FC4)' },
  { id:'deep-eddy', title:'Deep Eddy Pool — Morning Swim', emoji:'🏊', category:'outdoor',
    venue:'Deep Eddy Pool', address:'401 Deep Eddy Ave', dayPref:'sun',
    timeLabel:'8am–8pm', priceLabel:'$5/adult', ages:'All ages', tags:['Outdoor','Swim'],
    heroGrad:'linear-gradient(135deg,#7BA3BE,#7C9A82)' },
  { id:'blantonkids', title:'Blanton Museum — Kids Gallery Hunt', emoji:'🖼️', category:'art',
    venue:'Blanton Museum of Art', address:'200 E MLK Jr Blvd', dayPref:'any',
    timeLabel:'10am–5pm', priceLabel:'Free Sun', ages:'3+', tags:['Art','Indoor'],
    heroGrad:'linear-gradient(135deg,#9B8FC4,#7BA3BE)' },
  { id:'mueller-farmers', title:'Mueller Farmers Market', emoji:'🥕', category:'food',
    venue:'Branch Park Pavilion', address:'2300 Barbara Jordan Blvd', dayPref:'sun',
    timeLabel:'10am–2pm', priceLabel:'Free entry', ages:'All ages', tags:['Food','Outdoor'],
    heroGrad:'linear-gradient(135deg,#C4A882,#7C9A82)' },
  { id:'barton-springs', title:'Barton Springs — Family Splash', emoji:'💦', category:'outdoor',
    venue:'Barton Springs Pool', address:'2201 William Barton Dr', dayPref:'any',
    timeLabel:'5am–10pm', priceLabel:'$5/adult', ages:'All ages', tags:['Outdoor','Swim'],
    heroGrad:'linear-gradient(135deg,#7BA3BE,#7C9A82)' },
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

// ─── GOOGLE CALENDAR HELPERS ─────────────────────────────────────
function toGCalDate(dateStr, timeStr) {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' (24h) or empty for all-day
  if (!dateStr) return ''
  if (!timeStr) {
    const d = dateStr.replace(/-/g, '')
    return `${d}/${d}`
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const pad = n => String(n).padStart(2,'0')
  const fmtLocal = (y, mo, d, h, mi) => `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`
  const start = fmtLocal(year, month, day, hour, minute)
  const endMinute = minute + 60
  const endHour = hour + Math.floor(endMinute / 60)
  const end = fmtLocal(year, month, day, endHour % 24, endMinute % 60)
  return `${start}/${end}`
}

function buildGCalUrl(event) {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const title = encodeURIComponent(event.title || 'Event')
  const dates = encodeURIComponent(toGCalDate(event.date, event.time))
  const details = encodeURIComponent(event.description || '')
  const location = encodeURIComponent(event.location || '')
  return `${base}&text=${title}&dates=${dates}&details=${details}&location=${location}`
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────
export default function BrockFamilyHub() {
  const [tab, setTab]           = useState('home')
  const [plannerTab, setPlannerTab] = useState('this-weekend')
  const [lang, setLang]         = useState('en')
  const [now, setNow]           = useState(new Date())
  const [weather, setWeather]   = useState(null)
  const [mounted, setMounted]   = useState(false)

  // Schedule (persisted)
  const [schedule, setSchedule] = useState({})
  const [planKid, setPlanKid]   = useState('Monroe')
  const [campFilter, setCampFilter] = useState('All')

  // Custom Camps (persisted)
  const [customCamps, setCustomCamps] = useState([])
  const [campForm, setCampForm] = useState(null) // null = closed, {} = new, {..} = editing

  // Events (persisted)
  const [events, setEvents]     = useState([])
  const [eventForm, setEventForm] = useState(null) // null = closed, {} = new, {..} = editing

  // Tasks (persisted)
  const [tasks, setTasks]       = useState([])
  const [taskText, setTaskText] = useState('')
  const [taskAssign, setTaskAssign] = useState('Bakari')
  const [taskFilter, setTaskFilter] = useState('all')

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

  // Discover / Weekend state
  const [weekendSuggestions, setWeekendSuggestions] = useState([])
  const [weekendSuggestionsLoading, setWeekendSuggestionsLoading] = useState(false)
  const [discoverEvents, setDiscoverEvents] = useState([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverFilter, setDiscoverFilter] = useState('This Weekend')
  const [discoverLastUpdated, setDiscoverLastUpdated] = useState(null)
  const [quickAddText, setQuickAddText] = useState('')
  const [weekendWeather, setWeekendWeather] = useState({ sat: null, sun: null })

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSchedule(loadLS('schedule', {}))
    setPlannerTab(loadLS('plannerTab', 'this-weekend'))
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
    setEvents(loadLS('events', [
      { id:1, title:"Monroe T-ball", date:'2026-05-16', time:'09:30', location:'2417 Vista LN field', description:"Don't forget Monroe's cleats! ⚾", color:C.monroe },
      { id:2, title:"Westminster Last Day", date:'2026-05-22', time:'', location:'Westminster School', description:'Last day of school for Monroe', color:C.sky },
      { id:3, title:"Summer Camps Begin", date:'2026-06-01', time:'', location:'', description:'First week of summer camps!', color:C.sage },
      { id:4, title:"Anastasia 6-month Checkup", date:'2026-05-11', time:'10:00', location:'Austin Regional Clinic', description:'Schedule with pediatrician', color:C.rose },
    ]))
    setCustomCamps(loadLS('customCamps', []))
    setMounted(true)
  }, [])

  // Persist on change
  useEffect(() => { if(mounted) saveLS('schedule', schedule) }, [schedule, mounted])
  useEffect(() => { if(mounted) saveLS('plannerTab', plannerTab) }, [plannerTab, mounted])
  useEffect(() => { if(mounted) saveLS('tasks', tasks) }, [tasks, mounted])
  useEffect(() => { if(mounted) saveLS('notes', notes) }, [notes, mounted])
  useEffect(() => { if(mounted) saveLS('meals', meals) }, [meals, mounted])
  useEffect(() => { if(mounted) saveLS('events', events) }, [events, mounted])
  useEffect(() => { if(mounted) saveLS('customCamps', customCamps) }, [customCamps, mounted])

  // Clock
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t) }, [])

  // Weather
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.2672&longitude=-97.7431&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&timezone=America%2FChicago')
      .then(r => r.json())
      .then(d => setWeather({ temp:Math.round(d.current.temperature_2m), code:d.current.weathercode, wind:Math.round(d.current.windspeed_10m) }))
      .catch(() => setWeather({ temp:82, code:1, wind:8 }))
  }, [])

  // Weekend forecast weather
  useEffect(() => {
    const { sat, sun } = computeWeekendDates()
    const pad = n => String(n).padStart(2,'0')
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    const satStr = fmt(sat), sunStr = fmt(sun)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.2672&longitude=-97.7431&daily=weathercode,temperature_2m_max&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=14')
      .then(r=>r.json())
      .then(d=>{
        const dates = d.daily.time
        const si = dates.indexOf(satStr), ni = dates.indexOf(sunStr)
        setWeekendWeather({
          sat: si>=0?{code:d.daily.weathercode[si],temp:Math.round(d.daily.temperature_2m_max[si])}:{code:1,temp:82},
          sun: ni>=0?{code:d.daily.weathercode[ni],temp:Math.round(d.daily.temperature_2m_max[ni])}:{code:1,temp:82}
        })
      })
      .catch(()=>setWeekendWeather({sat:{code:1,temp:82},sun:{code:1,temp:82}}))
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

  // Fetch helpers for Discover / Weekend
  const fetchWeekendSuggestions = useCallback(async () => {
    setWeekendSuggestionsLoading(true)
    try {
      const res = await fetch('/api/discover?horizon=this%20weekend&filter=family')
      const data = await res.json()
      setWeekendSuggestions((data.events || []).slice(0, 6))
    } catch {
      setWeekendSuggestions([])
    } finally {
      setWeekendSuggestionsLoading(false)
    }
  }, [])

  const fetchDiscover = useCallback(async (horizon='this weekend', filter='family') => {
    setDiscoverLoading(true)
    try {
      const res = await fetch(`/api/discover?horizon=${encodeURIComponent(horizon)}&filter=${encodeURIComponent(filter)}`)
      const data = await res.json()
      setDiscoverEvents(data.events || [])
      setDiscoverLastUpdated(data.updated || new Date().toISOString())
    } catch {
      setDiscoverEvents([])
    } finally {
      setDiscoverLoading(false)
    }
  }, [])

  // Fetch weekend suggestions when landing on this-weekend view
  useEffect(() => {
    if (plannerTab === 'this-weekend' && weekendSuggestions.length === 0 && !weekendSuggestionsLoading) {
      fetchWeekendSuggestions()
    }
  }, [plannerTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch discover events when navigating to discover view or changing filter
  useEffect(() => {
    if (plannerTab === 'discover') {
      fetchDiscover(discoverFilter.toLowerCase(), 'family')
    }
  }, [plannerTab, discoverFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule helpers
  const allCamps = [...CAMPS, ...customCamps]
  const setWeekCamp = (kid, wk, cid) => {
    setSchedule(p => cid ? { ...p, [`${kid}-${wk}`]: cid } : Object.fromEntries(Object.entries(p).filter(([k])=>k!==`${kid}-${wk}`)))
  }
  const getWeekCamp = (kid, wk) => { const cid = schedule[`${kid}-${wk}`]; return cid ? allCamps.find(c => c.id === cid) : null }
  const kidCost = kid => Object.entries(schedule).filter(([k])=>k.startsWith(`${kid}-`)).reduce((s,[,cid])=>s+(allCamps.find(c=>c.id===cid)?.costWk||0),0)
  const totalCost = kidCost('Monroe') + kidCost('Genevieve')
  const weeksPlanned = kid => Object.keys(schedule).filter(k=>k.startsWith(`${kid}-`)).length
  const filteredCamps = campFilter === 'All' ? allCamps : allCamps.filter(c => c.tags.includes(campFilter) || c.type === campFilter)

  // Custom camp CRUD helpers
  const saveCamp = (form) => {
    if (!form.name?.trim()) return
    if (form.id) {
      setCustomCamps(p => p.map(c => c.id === form.id ? { ...form } : c))
    } else {
      const newCamp = {
        ...form,
        id: `custom_${Date.now()}`,
        costWk: Number(form.costWk) || 0,
        ageMin: Number(form.ageMin) || 0,
        ageMax: Number(form.ageMax) || 12,
        driveMins: Number(form.driveMins) || 0,
        weeks: [1,2,3,4,5,6,7,8,9,10,11],
        kids: form.kids || ['Monroe','Genevieve'],
        tags: form.tags || ['Custom'],
        color: form.color || C.sage,
        emoji: form.emoji || '🏕️',
      }
      setCustomCamps(p => [...p, newCamp])
    }
    setCampForm(null)
  }
  const deleteCamp = (id) => {
    setCustomCamps(p => p.filter(c => c.id !== id))
    setSchedule(p => Object.fromEntries(Object.entries(p).filter(([,cid]) => cid !== id)))
  }

  // Event CRUD helpers
  const saveEvent = (form) => {
    if (!form.title?.trim()) return
    if (form.id) {
      setEvents(p => p.map(e => e.id === form.id ? { ...form } : e))
    } else {
      setEvents(p => [...p, { ...form, id: Date.now() }])
    }
    setEventForm(null)
  }
  const deleteEvent = (id) => setEvents(p => p.filter(e => e.id !== id))
  const sortedEvents = [...events].sort((a,b) => (a.date||'').localeCompare(b.date||''))

  // Task helpers
  const addTask = () => {
    if (!taskText.trim()) return
    setTasks(p => [...p, { id:Date.now(), text:taskText.trim(), done:false, who:taskAssign, ts:Date.now() }])
    setTaskText('')
  }
  const toggleTask = id => setTasks(p => p.map(t => t.id === id ? { ...t, done:!t.done } : t))
  const removeTask = id => setTasks(p => p.filter(t => t.id !== id))
  const filteredTasks = taskFilter === 'all' ? tasks : taskFilter === 'done' ? tasks.filter(t=>t.done) : tasks.filter(t=>!t.done)

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
     {
  date: "Nov 11",
  label: `Anastasia turns ${(() => {
    const dob = new Date(2025, 10, 11); // Nov 11, 2025
    const now = new Date();
    const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    const nextBdayYear = now > thisYearBday ? now.getFullYear() + 1 : now.getFullYear();
    return nextBdayYear - dob.getFullYear();
  })()} 🎂`,
  color: C.rose
}
  ]

  // ─── WEEKEND DATE HELPERS ──────────────────────────────────────
  const getWeekendDates = (today = new Date()) => computeWeekendDates(today)
  const { sat: weekendSat, sun: weekendSun } = getWeekendDates(now)
  const padDate = n => String(n).padStart(2,'0')
  const fmtDateKey = d => `${d.getFullYear()}-${padDate(d.getMonth()+1)}-${padDate(d.getDate())}`
  const weekendSatStr = fmtDateKey(weekendSat)
  const weekendSunStr = fmtDateKey(weekendSun)

  // Summer 2026 gap count
  const summerGaps = (() => {
    let gaps = 0
    ;['Monroe','Genevieve'].forEach(kid => {
      SUMMER_WEEKS.forEach(week => { if (!schedule[`${kid}-${week.wk}`]) gaps++ })
    })
    return gaps
  })()

  // Quick-add natural language parse
  const parseQuickAdd = (text) => {
    const satMatch = /\bsat(urday)?\b/i.test(text)
    const sunMatch = /\bsun(day)?\b/i.test(text)
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i)
    const title = text.replace(/\b(sat(urday)?|sun(day)?)\b/gi, '').replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '').trim().replace(/\s+/g, ' ')
    const dateObj = sunMatch ? weekendSun : weekendSat
    return { title: title || text, date: fmtDateKey(dateObj), time: timeMatch ? timeMatch[1] : '', color: C.sage }
  }

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
            {[['home','🏠 Home'],['planner','📅 Planner'],['assistant','🤖 Assistant'],['todo','✅ To-Do']].map(([id,lbl]) => (
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
            <a href="/profile" style={{
              padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`,
              fontFamily:"'Outfit',sans-serif", fontSize:'0.6rem', fontWeight:600,
              color:C.textSoft, textDecoration:'none', background:C.bg, transition:'all 0.15s'
            }}>👤 Profile</a>
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
            <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16, alignItems:'start' }}>

              {/* Sidebar nav */}
              <div style={{ ...s.card({ padding:'10px 8px' }), position:'sticky', top:80 }}>
                {/* Plan Horizon section */}
                <div style={{ fontSize:'0.5rem', letterSpacing:'0.16em', textTransform:'uppercase', color:C.muted, fontWeight:700, padding:'4px 10px 8px' }}>Plan Horizon</div>
                {[
                  ['this-weekend','🌤️','This Weekend', null],
                  ['next-30','📅','Next 30 Days', null],
                  ['summer-2026','☀️','Summer 2026', summerGaps > 0 ? summerGaps : null],
                  ['discover','🎟️','Discover Austin', null],
                ].map(([id,icon,label,badge]) => (
                  <button key={id} onClick={()=>setPlannerTab(id)} style={{
                    display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 10px',
                    borderRadius:9, border:'none', cursor:'pointer', textAlign:'left',
                    fontFamily:"'Outfit',sans-serif", fontSize:'0.72rem', fontWeight:plannerTab===id?700:500,
                    background:plannerTab===id?C.sage+'18':'transparent',
                    color:plannerTab===id?C.sage:C.textSoft,
                    borderLeft:`3px solid ${plannerTab===id?C.sage:'transparent'}`,
                    transition:'all 0.15s',
                  }}>
                    <span style={{ fontSize:'0.9rem' }}>{icon}</span>
                    <span style={{ flex:1 }}>{label}</span>
                    {badge && (
                      <span style={{ background:C.rose, color:'#fff', borderRadius:10, fontSize:'0.5rem', fontWeight:700, padding:'2px 6px', minWidth:18, textAlign:'center' }}>{badge}</span>
                    )}
                  </button>
                ))}

                {/* Manage section */}
                <div style={{ fontSize:'0.5rem', letterSpacing:'0.16em', textTransform:'uppercase', color:C.muted, fontWeight:700, padding:'12px 10px 8px', marginTop:4, borderTop:`1px solid ${C.border}` }}>Manage</div>
                {[
                  ['all-events','🗂','All Events'],
                  ['camps','🏕️','Camps Library'],
                  ['scenario','🧠','Scenario Builder'],
                ].map(([id,icon,label]) => (
                  <button key={id} onClick={()=>setPlannerTab(id)} style={{
                    display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 10px',
                    borderRadius:9, border:'none', cursor:'pointer', textAlign:'left',
                    fontFamily:"'Outfit',sans-serif", fontSize:'0.72rem', fontWeight:plannerTab===id?700:500,
                    background:plannerTab===id?C.sage+'18':'transparent',
                    color:plannerTab===id?C.sage:C.textSoft,
                    borderLeft:`3px solid ${plannerTab===id?C.sage:'transparent'}`,
                    transition:'all 0.15s',
                  }}>
                    <span style={{ fontSize:'0.9rem' }}>{icon}</span>{label}
                  </button>
                ))}
              </div>

              {/* Submodule content */}
              <div>

                {/* ── VIEW 1: THIS WEEKEND ── */}
                {plannerTab === 'this-weekend' && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>
                    {/* Main: Sat + Sun cards */}
                    <div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem', marginBottom:16 }}>
                        This <span style={{ color:C.sage }}>Weekend</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        {[
                          { day: weekendSat, label: 'Saturday', dateStr: weekendSatStr, ww: weekendWeather.sat, suggestions: weekendSuggestions.slice(0,3) },
                          { day: weekendSun, label: 'Sunday',   dateStr: weekendSunStr, ww: weekendWeather.sun, suggestions: weekendSuggestions.slice(3,6) },
                        ].map(({ day, label, dateStr, ww, suggestions }) => {
                          const dayEvents = sortedEvents.filter(e => e.date === dateStr)
                          return (
                            <div key={label} style={s.card()}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                                <div>
                                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.4rem' }}>{label}</div>
                                  <div style={{ fontSize:'0.62rem', color:C.muted }}>
                                    {MONTH_FULL[day.getMonth()].slice(0,3)} {day.getDate()}, {day.getFullYear()}
                                  </div>
                                </div>
                                {ww && (
                                  <div style={{ fontSize:'0.62rem', background:C.bg, border:`1px solid ${C.border}`, borderRadius:20, padding:'4px 10px', display:'flex', alignItems:'center', gap:4 }}>
                                    <span>{WMO_EMOJI[ww.code]||'🌤️'}</span><span>{ww.temp}°F</span>
                                  </div>
                                )}
                              </div>
                              {/* Planned events */}
                              <div style={{ marginBottom:12 }}>
                                <div style={{ fontSize:'0.56rem', letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted, fontWeight:700, marginBottom:6 }}>Planned</div>
                                {dayEvents.length === 0 ? (
                                  <div style={{ fontSize:'0.7rem', color:C.dim, fontStyle:'italic' }}>Nothing planned yet — pick from below ↓</div>
                                ) : dayEvents.map(ev => (
                                  <div key={ev.id} style={{ display:'flex', gap:8, padding:'6px 8px', borderRadius:8, borderLeft:`3px solid ${ev.color||C.sage}`, background:(ev.color||C.sage)+'08', marginBottom:4 }}>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:'0.75rem', fontWeight:600 }}>{ev.title}</div>
                                      <div style={{ fontSize:'0.58rem', color:C.muted }}>{ev.time&&`🕐 ${ev.time}`}{ev.location&&` · 📍 ${ev.location}`}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {/* Suggestions */}
                              <div>
                                <div style={{ fontSize:'0.56rem', letterSpacing:'0.14em', textTransform:'uppercase', color:C.muted, fontWeight:700, marginBottom:6 }}>Suggested for {label}</div>
                                {weekendSuggestionsLoading ? (
                                  <div style={{ fontSize:'0.7rem', color:C.dim }}>Loading Austin events…</div>
                                ) : suggestions.length === 0 ? (
                                  <div style={{ fontSize:'0.7rem', color:C.dim }}>No suggestions available.</div>
                                ) : suggestions.map(ev => (
                                  <div key={ev.id} style={{ padding:'8px 10px', borderRadius:9, border:`1px solid ${C.border}`, marginBottom:6, background:C.bg }}>
                                    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                                      <span style={{ fontSize:'1.2rem', flexShrink:0 }}>{ev.emoji||'🎉'}</span>
                                      <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontSize:'0.75rem', fontWeight:600, marginBottom:2 }}>{ev.title}</div>
                                        <div style={{ fontSize:'0.58rem', color:C.muted, lineHeight:1.4 }}>
                                          {ev.time&&`🕐 ${ev.time} · `}{ev.location&&`📍 ${ev.location}`}{ev.price&&` · ${ev.price}`}
                                        </div>
                                        <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
                                          {ev.category&&<span style={{ fontSize:'0.52rem', padding:'1px 6px', borderRadius:8, background:C.sage+'15', color:C.sage, fontWeight:700 }}>{ev.category}</span>}
                                          {ev.ageRange&&<span style={{ fontSize:'0.52rem', padding:'1px 6px', borderRadius:8, background:C.stone+'15', color:C.stone, fontWeight:700 }}>{ev.ageRange}</span>}
                                        </div>
                                      </div>
                                      <button onClick={()=>saveEvent({ title:ev.title, date:dateStr, time:ev.time||'', location:ev.location||'', description:[ev.price,ev.url].filter(Boolean).join(' · '), color:C.sage })} style={{ ...s.btn(), padding:'5px 10px', fontSize:'0.6rem', flexShrink:0 }}>+ Add</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {/* Right rail */}
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      {/* Weekend Pulse */}
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Weekend Pulse<div style={s.labelLine}/></div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem' }}>
                            <span style={{ color:C.muted }}>Planned events</span>
                            <span style={{ fontWeight:700 }}>{events.filter(e=>e.date===weekendSatStr||e.date===weekendSunStr).length}</span>
                          </div>
                          {weekendWeather.sat && (
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem' }}>
                              <span style={{ color:C.muted }}>Saturday</span>
                              <span>{WMO_EMOJI[weekendWeather.sat.code]||'🌤️'} {weekendWeather.sat.temp}°F</span>
                            </div>
                          )}
                          {weekendWeather.sun && (
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem' }}>
                              <span style={{ color:C.muted }}>Sunday</span>
                              <span>{WMO_EMOJI[weekendWeather.sun.code]||'🌤️'} {weekendWeather.sun.temp}°F</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Who's Free */}
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Who&apos;s Free<div style={s.labelLine}/></div>
                        {[
                          { name:'Monroe',    emoji:'⚾', color:C.monroe,    note:'Free' },
                          { name:'Genevieve', emoji:'🩰', color:C.genevieve, note:'Free' },
                          { name:'Anastasia', emoji:'💛', color:C.anastasia, note:'Napping 12–2pm' },
                          { name:'Tanya',     emoji:'👵', color:C.muted,     note:'Free' },
                        ].map(p => (
                          <div key={p.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:'0.9rem' }}>{p.emoji}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:'0.72rem', fontWeight:600, color:p.color }}>{p.name}</div>
                              <div style={{ fontSize:'0.58rem', color:C.muted }}>{p.note}</div>
                            </div>
                            <span style={{ fontSize:'0.52rem', padding:'2px 7px', borderRadius:8, background:C.sage+'15', color:C.sage, fontWeight:700 }}>✓ Free</span>
                          </div>
                        ))}
                      </div>
                      {/* Quick Add */}
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Quick Add<div style={s.labelLine}/></div>
                        <input
                          value={quickAddText}
                          onChange={e=>setQuickAddText(e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter'&&quickAddText.trim()){ saveEvent(parseQuickAdd(quickAddText)); setQuickAddText('') } }}
                          placeholder="Type naturally… e.g. Sat 10am park"
                          style={{ ...s.input, marginBottom:8 }}
                        />
                        <button onClick={()=>{ if(quickAddText.trim()){ saveEvent(parseQuickAdd(quickAddText)); setQuickAddText('') } }} style={{ ...s.btn(), width:'100%' }}>
                          Parse &amp; Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── VIEW 2: NEXT 30 DAYS ── */}
                {plannerTab === 'next-30' && (() => {
                  const todayD = new Date(); todayD.setHours(0,0,0,0)
                  const limitD = new Date(todayD); limitD.setDate(todayD.getDate()+30)
                  const next30 = sortedEvents.filter(e => {
                    if (!e.date) return false
                    const d = new Date(e.date+'T12:00:00')
                    return d >= todayD && d <= limitD
                  })
                  return (
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                        <div>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem' }}>
                            Next <span style={{ color:C.sage }}>30 Days</span>
                          </div>
                          <div style={{ fontSize:'0.63rem', color:C.muted, marginTop:3 }}>{next30.length} events coming up</div>
                        </div>
                        <button onClick={()=>setEventForm({ title:'', date:'', time:'', location:'', description:'', color:C.sage })} style={{ ...s.btn(), fontSize:'0.65rem', padding:'7px 14px' }}>+ Add Event</button>
                      </div>
                      {next30.length === 0 ? (
                        <div style={{ ...s.card({ textAlign:'center', padding:'40px 20px', color:C.muted }) }}>
                          <div style={{ fontSize:'2rem', marginBottom:8 }}>📅</div>
                          <div style={{ fontSize:'0.8rem' }}>No events in the next 30 days.</div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {next30.map(ev => (
                            <div key={ev.id} style={{ ...s.card({ borderLeft:`4px solid ${ev.color||C.sage}`, display:'flex', alignItems:'flex-start', gap:14 }) }}>
                              <div style={{ minWidth:54, textAlign:'center' }}>
                                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.5rem', lineHeight:1, color:ev.color||C.sage }}>{new Date(ev.date+'T12:00:00').getDate()}</div>
                                <div style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted }}>{MONTH_FULL[new Date(ev.date+'T12:00:00').getMonth()]?.slice(0,3)}</div>
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:3 }}>{ev.title}</div>
                                <div style={{ display:'flex', gap:12, fontSize:'0.65rem', color:C.muted, flexWrap:'wrap', marginBottom:ev.description?6:0 }}>
                                  {ev.time&&<span>🕐 {ev.time}</span>}
                                  {ev.location&&<span>📍 {ev.location}</span>}
                                </div>
                                {ev.description&&<div style={{ fontSize:'0.72rem', color:C.textSoft, lineHeight:1.5 }}>{ev.description}</div>}
                              </div>
                              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                <button onClick={()=>setEventForm({...ev})} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.textSoft, fontSize:'0.6rem', cursor:'pointer' }}>✏️</button>
                                <button onClick={()=>deleteEvent(ev.id)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.rose}44`, background:C.roseBg, color:C.rose, fontSize:'0.6rem', cursor:'pointer' }}>🗑️</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── VIEW 3: SUMMER 2026 ── */}
                {plannerTab === 'summer-2026' && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16, alignItems:'start' }}>
                    <div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem', marginBottom:4 }}>
                        Summer <span style={{ color:C.sage }}>2026</span>
                      </div>
                      <div style={{ fontSize:'0.63rem', color:C.muted, marginBottom:16 }}>Jun 1 – Aug 14 · 11 weeks · Coverage overview</div>
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.72rem' }}>
                          <thead>
                            <tr>
                              <th style={{ padding:'8px 12px', textAlign:'left', fontSize:'0.56rem', letterSpacing:'0.12em', textTransform:'uppercase', color:C.muted, fontWeight:700, borderBottom:`1px solid ${C.border}`, minWidth:110 }}>Week</th>
                              <th style={{ padding:'8px 12px', textAlign:'left', fontSize:'0.56rem', letterSpacing:'0.12em', textTransform:'uppercase', color:C.monroe, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Monroe (5y)</th>
                              <th style={{ padding:'8px 12px', textAlign:'left', fontSize:'0.56rem', letterSpacing:'0.12em', textTransform:'uppercase', color:C.genevieve, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>Genevieve (3y)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {SUMMER_WEEKS.map((week, wi) => (
                              <tr key={week.wk} style={{ background: wi%2===0?C.bg:'transparent' }}>
                                <td style={{ padding:'8px 12px', color:C.textSoft, whiteSpace:'nowrap' }}>
                                  <span style={{ fontWeight:600 }}>W{week.wk}</span> <span style={{ color:C.muted, fontSize:'0.65rem' }}>{week.start}–{week.end}</span>
                                </td>
                                {['Monroe','Genevieve'].map(kid => {
                                  const camp = getWeekCamp(kid, week.wk)
                                  if (!camp) return (
                                    <td key={kid} style={{ padding:'8px 12px' }}>
                                      <span style={{ background:C.rose+'20', color:C.rose, padding:'3px 8px', borderRadius:6, fontSize:'0.65rem', fontWeight:600 }}>✗ No coverage</span>
                                    </td>
                                  )
                                  const isFull = camp.fullDay === true
                                  return (
                                    <td key={kid} style={{ padding:'8px 12px' }}>
                                      <span style={{ background:isFull?C.sage+'20':C.stone+'25', color:isFull?C.sage:C.stone, padding:'3px 8px', borderRadius:6, fontSize:'0.65rem', fontWeight:600 }}>
                                        {isFull?'✓':'~'} {camp.name.split(' ').slice(0,2).join(' ')}
                                      </span>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Right rail */}
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Coverage<div style={s.labelLine}/></div>
                        {['Monroe','Genevieve'].map(kid => {
                          const planned = SUMMER_WEEKS.filter(w=>getWeekCamp(kid,w.wk)).length
                          const m = FAMILY_MEMBERS.find(fm=>fm.name===kid)
                          return (
                            <div key={kid} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.72rem', marginBottom:6 }}>
                              <span style={{ color:m?.color, fontWeight:600 }}>{kid}</span>
                              <span>{planned}/11 weeks</span>
                            </div>
                          )
                        })}
                        <div style={{ marginTop:8 }}>
                          <span style={{ background:C.rose, color:'#fff', borderRadius:20, fontSize:'0.56rem', fontWeight:700, padding:'3px 10px' }}>{summerGaps} gaps to fill</span>
                        </div>
                      </div>
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Budget<div style={s.labelLine}/></div>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.1rem', marginBottom:4 }}>
                          ${totalCost.toLocaleString()} <span style={{ fontSize:'0.7rem', color:C.muted }}>/ $8,500</span>
                        </div>
                        <div style={{ background:C.border, borderRadius:10, height:8, overflow:'hidden', marginBottom:4 }}>
                          <div style={{ background:totalCost/8500>0.8?C.rose:C.sage, height:'100%', width:`${Math.min(100,(totalCost/8500)*100)}%`, borderRadius:10, transition:'width 0.3s' }}/>
                        </div>
                        <div style={{ fontSize:'0.6rem', color:C.muted }}>{Math.round((totalCost/8500)*100)}% of summer budget used</div>
                      </div>
                      <div style={{ ...s.card({ borderColor:C.sage+'44', background:C.sageBg }) }}>
                        <div style={{ fontSize:'0.75rem', fontWeight:700, marginBottom:4 }}>🧠 Scenario Builder</div>
                        <div style={{ fontSize:'0.62rem', color:C.muted, marginBottom:10 }}>Assign camps week by week for Monroe &amp; Genevieve</div>
                        <button onClick={()=>setPlannerTab('scenario')} style={{ ...s.btn(), width:'100%', fontSize:'0.65rem' }}>Open Scenario Builder →</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── VIEW 4: DISCOVER AUSTIN ── */}
                {plannerTab === 'discover' && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:16, alignItems:'start' }}>
                    <div>
                      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem', marginBottom:4 }}>
                        Discover <span style={{ color:C.sage }}>Austin</span>
                      </div>
                      {/* Filter chips */}
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                        {['This Weekend','Next 7 days','Free','Outdoor','Kids 3–6','Music','Food','Date Night'].map(f => (
                          <button key={f} style={s.pill(discoverFilter===f)} onClick={()=>setDiscoverFilter(f)}>{f}</button>
                        ))}
                      </div>
                      {discoverLoading ? (
                        <div style={{ ...s.card({ textAlign:'center', padding:'40px 20px', color:C.muted }) }}>
                          <div style={{ fontSize:'2rem', marginBottom:8 }}>🔍</div>
                          <div style={{ fontSize:'0.8rem' }}>Searching Austin for events…</div>
                        </div>
                      ) : discoverEvents.length === 0 ? (
                        <div style={{ ...s.card({ textAlign:'center', padding:'40px 20px', color:C.muted }) }}>
                          <div style={{ fontSize:'2rem', marginBottom:8 }}>🎟️</div>
                          <div style={{ fontSize:'0.8rem' }}>No events found. Try a different filter or refresh.</div>
                        </div>
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:14 }}>
                          {discoverEvents.map(ev => {
                            const catColor = {outdoor:C.sage,kids:C.stone,music:C.sky,food:C.rose,arts:C.lavender,sports:C.sage,datenight:C.rose}[ev.category] || C.sage
                            return (
                              <div key={ev.id} style={{ ...s.card({ display:'flex', flexDirection:'column', overflow:'hidden', padding:0 }) }}>
                                <div style={{ background:`linear-gradient(135deg, ${catColor}25, ${catColor}10)`, padding:'16px 16px 12px', display:'flex', alignItems:'center', gap:10 }}>
                                  <span style={{ fontSize:'2rem' }}>{ev.emoji||'🎉'}</span>
                                  <div>
                                    <div style={{ fontWeight:700, fontSize:'0.85rem', lineHeight:1.3 }}>{ev.title}</div>
                                    <div style={{ fontSize:'0.58rem', color:C.muted, marginTop:2 }}>{ev.date}{ev.time&&` · ${ev.time}`}</div>
                                  </div>
                                </div>
                                <div style={{ padding:'10px 16px 14px', flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                                  {ev.location&&<div style={{ fontSize:'0.65rem', color:C.textSoft }}>📍 {ev.location}</div>}
                                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                    {ev.price&&<span style={{ fontSize:'0.58rem', padding:'2px 8px', borderRadius:8, background:C.sage+'12', color:C.sage, fontWeight:700 }}>{ev.price}</span>}
                                    {ev.ageRange&&<span style={{ fontSize:'0.58rem', padding:'2px 8px', borderRadius:8, background:C.stone+'15', color:C.stone, fontWeight:700 }}>{ev.ageRange}</span>}
                                  </div>
                                  <div style={{ marginTop:'auto' }}>
                                    <button onClick={()=>setEventForm({ title:ev.title, date:'', time:ev.time||'', location:ev.location||'', description:[ev.price,ev.source?`Source: ${ev.source}`:'',ev.url].filter(Boolean).join(' · '), color:catColor })} style={{ ...s.btn(catColor), width:'100%', fontSize:'0.65rem', padding:'7px' }}>
                                      + Add to plan
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {/* Right rail */}
                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Sources<div style={s.labelLine}/></div>
                        {['do512.com','austin360.com','visitaustin.com','JCC Austin','Westminster','Thinkery ATX','Ticketmaster'].map(src => (
                          <div key={src} style={{ fontSize:'0.65rem', color:C.textSoft, padding:'3px 0', borderBottom:`1px solid ${C.border}` }}>🔗 {src}</div>
                        ))}
                      </div>
                      <div style={s.card()}>
                        <div style={s.sectionLabel}>Last Updated<div style={s.labelLine}/></div>
                        <div style={{ fontSize:'0.65rem', color:C.textSoft, marginBottom:8 }}>
                          {discoverLastUpdated ? new Date(discoverLastUpdated).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Not yet loaded'}
                        </div>
                        <button onClick={()=>fetchDiscover(discoverFilter.toLowerCase(),'family')} style={{ ...s.btn(), width:'100%', fontSize:'0.65rem', padding:'7px' }}>
                          🔄 Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── VIEW 5: ALL EVENTS (demoted to Manage) ── */}
                {plannerTab === 'all-events' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                      <div>
                        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem' }}>
                          Family <span style={{ color:C.sage }}>Events</span>
                        </div>
                        <div style={{ fontSize:'0.63rem', color:C.muted, marginTop:3 }}>
                          Manage family events · Add to Google Calendar · CRUD supported
                        </div>
                      </div>
                      <button onClick={()=>setEventForm({ title:'', date:'', time:'', location:'', description:'', color:C.sage })} style={{ ...s.btn(), fontSize:'0.65rem', padding:'7px 14px' }}>+ Add Event</button>
                    </div>

                    {sortedEvents.length === 0 && (
                      <div style={{ ...s.card({ textAlign:'center', padding:'40px 20px', color:C.muted }) }}>
                        <div style={{ fontSize:'2rem', marginBottom:8 }}>📆</div>
                        <div style={{ fontSize:'0.8rem' }}>No events yet. Add your first family event!</div>
                      </div>
                    )}

                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {sortedEvents.map(ev => (
                        <div key={ev.id} style={{ ...s.card({ borderLeft:`4px solid ${ev.color||C.sage}`, display:'flex', alignItems:'flex-start', gap:14 }) }}>
                          <div style={{ minWidth:54, textAlign:'center' }}>
                            {ev.date ? (
                              <>
                                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.5rem', lineHeight:1, color:ev.color||C.sage }}>{new Date(ev.date+'T12:00:00').getDate()}</div>
                                <div style={{ fontSize:'0.55rem', textTransform:'uppercase', letterSpacing:'0.1em', color:C.muted }}>
                                  {MONTH_FULL[new Date(ev.date+'T12:00:00').getMonth()]?.slice(0,3)}
                                </div>
                              </>
                            ) : <div style={{ fontSize:'0.65rem', color:C.muted }}>TBD</div>}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:3 }}>{ev.title}</div>
                            <div style={{ display:'flex', gap:12, fontSize:'0.65rem', color:C.muted, flexWrap:'wrap', marginBottom:ev.description?6:0 }}>
                              {ev.time&&<span>🕐 {ev.time}</span>}
                              {ev.location&&<span>📍 {ev.location}</span>}
                            </div>
                            {ev.description&&<div style={{ fontSize:'0.72rem', color:C.textSoft, lineHeight:1.5 }}>{ev.description}</div>}
                          </div>
                          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                            <a href={buildGCalUrl(ev)} target="_blank" rel="noopener noreferrer" style={{
                              padding:'6px 10px', borderRadius:8, border:`1px solid ${C.sage}44`,
                              background:C.sageBg, color:C.sage, fontSize:'0.62rem', fontWeight:700,
                              textDecoration:'none', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4
                            }}>📅 gCal</a>
                            <button onClick={()=>setEventForm({...ev})} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.textSoft, fontSize:'0.6rem', cursor:'pointer' }}>✏️</button>
                            <button onClick={()=>deleteEvent(ev.id)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${C.rose}44`, background:C.roseBg, color:C.rose, fontSize:'0.6rem', cursor:'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── VIEW 6: CAMPS LIBRARY ── */}
                {plannerTab === 'camps' && (
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
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1rem', color:C.sage }}>{allCamps.length}</span>
                          <span style={{ fontSize:'0.62rem', color:C.muted }}>camps curated</span>
                        </div>
                        <button onClick={()=>setCampForm({ name:'', type:'', emoji:'🏕️', ageMin:3, ageMax:12, costWk:'', driveMins:'', location:'', desc:'', color:C.sage, kids:['Monroe','Genevieve'], tags:['Custom'] })} style={{ ...s.btn(), fontSize:'0.65rem', padding:'7px 14px' }}>+ Add Camp</button>
                      </div>
                    </div>

                    {/* Filters */}
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:16 }}>
                      {['All','Sports','Gymnastics','Dance','STEAM','Art','Swim','Outdoor','Custom'].map(f => (
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
                            {(camp.kids||[]).map(k => {
                              const m = FAMILY_MEMBERS.find(fm=>fm.name===k)
                              return <span key={k} style={{ fontSize:'0.54rem', padding:'2px 7px', borderRadius:8, background:m?.color+'12', color:m?.color, fontWeight:600 }}>{k}</span>
                            })}
                          </div>

                          <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:10 }}>📍 {camp.location}</div>

                          <div style={{ marginTop:'auto', display:'flex', gap:6 }}>
                            {(camp.kids||[]).map(k => (
                              <button key={k} onClick={()=>{ setPlanKid(k); setPlannerTab('scenario') }} style={{
                                flex:1, padding:'7px 8px', borderRadius:8,
                                border:`1px solid ${FAMILY_MEMBERS.find(m=>m.name===k)?.color+'33'}`,
                                background:FAMILY_MEMBERS.find(m=>m.name===k)?.color+'08',
                                color:FAMILY_MEMBERS.find(m=>m.name===k)?.color,
                                fontFamily:"'Outfit',sans-serif", fontSize:'0.62rem', fontWeight:700, cursor:'pointer'
                              }}>+ {k}&apos;s Plan</button>
                            ))}
                            {camp.id.toString().startsWith('custom_') && (
                              <>
                                <button onClick={()=>setCampForm({...camp})} style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.textSoft, fontFamily:"'Outfit',sans-serif", fontSize:'0.6rem', cursor:'pointer' }}>✏️</button>
                                <button onClick={()=>deleteCamp(camp.id)} style={{ padding:'7px 10px', borderRadius:8, border:`1px solid ${C.rose}44`, background:C.roseBg, color:C.rose, fontFamily:"'Outfit',sans-serif", fontSize:'0.6rem', cursor:'pointer' }}>🗑️</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add/Edit Camp Modal */}
                    {campForm && (
                      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ ...s.card({ maxWidth:480, width:'100%', margin:16, padding:'24px 28px' }), position:'relative' }}>
                          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.25rem', marginBottom:16 }}>
                            {campForm.id ? 'Edit Camp' : 'Add New Camp'}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            {[['name','Camp Name','text'],['emoji','Emoji','text'],['type','Type (e.g. Sports)','text'],['location','Location','text'],['desc','Description','text']].map(([field,label]) => (
                              <div key={field}>
                                <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>{label}</div>
                                <input value={campForm[field]||''} onChange={e=>setCampForm(p=>({...p,[field]:e.target.value}))} style={{ ...s.input }} placeholder={label} />
                              </div>
                            ))}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              {[['costWk','$/week'],['driveMins','Drive min'],['ageMin','Age min'],['ageMax','Age max']].map(([field,label]) => (
                                <div key={field}>
                                  <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>{label}</div>
                                  <input type="number" value={campForm[field]||''} onChange={e=>setCampForm(p=>({...p,[field]:e.target.value}))} style={{ ...s.input }} placeholder={label} />
                                </div>
                              ))}
                            </div>
                            <div>
                              <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:6 }}>Kids</div>
                              <div style={{ display:'flex', gap:6 }}>
                                {['Monroe','Genevieve','Anastasia'].map(k => {
                                  const sel = (campForm.kids||[]).includes(k)
                                  const m = FAMILY_MEMBERS.find(fm=>fm.name===k)
                                  return (
                                    <button key={k} onClick={()=>setCampForm(p=>({...p,kids:sel?p.kids.filter(x=>x!==k):[...(p.kids||[]),k]}))} style={s.pill(sel, m?.color)}>{k}</button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:8, marginTop:18 }}>
                            <button onClick={()=>saveCamp(campForm)} style={{ ...s.btn(), flex:1 }}>💾 Save</button>
                            <button onClick={()=>setCampForm(null)} style={{ flex:1, padding:'9px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.textSoft, fontFamily:"'Outfit',sans-serif", fontSize:'0.7rem', cursor:'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── VIEW 7: SCENARIO BUILDER ── */}
                {plannerTab === 'scenario' && (
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
                        const eligible = allCamps.filter(c => (c.kids||[]).includes(planKid) && (c.weeks||[]).includes(week.wk))
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
                                  const camp = allCamps.find(c=>c.id===cid)
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

              </div>

              {/* ── SHARED EVENT FORM MODAL (planner-wide) ── */}
              {eventForm && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ ...s.card({ maxWidth:460, width:'100%', margin:16, padding:'24px 28px' }), position:'relative' }}>
                    <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.25rem', marginBottom:16 }}>
                      {eventForm.id ? 'Edit Event' : 'New Event'}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div>
                        <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>Event Title *</div>
                        <input value={eventForm.title||''} onChange={e=>setEventForm(p=>({...p,title:e.target.value}))} style={{ ...s.input }} placeholder="e.g. Monroe T-ball" />
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div>
                          <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>Date</div>
                          <input type="date" value={eventForm.date||''} onChange={e=>setEventForm(p=>({...p,date:e.target.value}))} style={{ ...s.input }} />
                        </div>
                        <div>
                          <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>Time (optional)</div>
                          <input type="time" value={eventForm.time||''} onChange={e=>setEventForm(p=>({...p,time:e.target.value}))} style={{ ...s.input }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>Location</div>
                        <input value={eventForm.location||''} onChange={e=>setEventForm(p=>({...p,location:e.target.value}))} style={{ ...s.input }} placeholder="e.g. Zilker Park" />
                      </div>
                      <div>
                        <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:3 }}>Notes / Description</div>
                        <input value={eventForm.description||''} onChange={e=>setEventForm(p=>({...p,description:e.target.value}))} style={{ ...s.input }} placeholder="Any details…" />
                      </div>
                      <div>
                        <div style={{ fontSize:'0.6rem', color:C.muted, marginBottom:6 }}>Color</div>
                        <div style={{ display:'flex', gap:8 }}>
                          {[C.sage,C.sky,C.stone,C.rose,C.lavender].map(col => (
                            <button key={col} onClick={()=>setEventForm(p=>({...p,color:col}))} style={{
                              width:24, height:24, borderRadius:'50%', background:col, border:eventForm.color===col?`2px solid ${C.text}`:'2px solid transparent', cursor:'pointer'
                            }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:18 }}>
                      <button onClick={()=>saveEvent(eventForm)} style={{ ...s.btn(), flex:1 }}>💾 Save</button>
                      {eventForm.id && (
                        <a href={buildGCalUrl(eventForm)} target="_blank" rel="noopener noreferrer" style={{
                          flex:1, padding:'9px', borderRadius:10, border:`1px solid ${C.sage}44`,
                          background:C.sageBg, color:C.sage, fontFamily:"'Outfit',sans-serif",
                          fontSize:'0.7rem', fontWeight:700, cursor:'pointer', textDecoration:'none',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:4
                        }}>📅 Add to gCal</a>
                      )}
                      <button onClick={()=>setEventForm(null)} style={{ flex:1, padding:'9px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.textSoft, fontFamily:"'Outfit',sans-serif", fontSize:'0.7rem', cursor:'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TO-DO TAB ──────────────────────────────────────── */}
          {tab === 'todo' && (
            <div style={{ maxWidth:800, margin:'0 auto' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'1.6rem' }}>
                    Family <span style={{ color:C.sage }}>To-Do</span>
                  </div>
                  <div style={{ fontSize:'0.63rem', color:C.muted, marginTop:3 }}>
                    {tasks.filter(t=>!t.done).length} open · {tasks.filter(t=>t.done).length} completed
                  </div>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  {[['all','All'],['open','Open'],['done','Done']].map(([f,lbl]) => (
                    <button key={f} style={s.pill(taskFilter===f)} onClick={()=>setTaskFilter(f)}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Add task */}
              <div style={{ ...s.card({ marginBottom:16 }) }}>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={taskText} onChange={e=>setTaskText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}
                    placeholder={ru?'Добавить задачу…':'Add a task…'}
                    style={{ ...s.input, flex:1 }} />
                  <select value={taskAssign} onChange={e=>setTaskAssign(e.target.value)} style={{ ...s.input, width:'auto', cursor:'pointer' }}>
                    {FAMILY_MEMBERS.filter(m=>['Bakari','Jenya'].includes(m.name)).map(m => (
                      <option key={m.id} value={m.name}>{m.emoji} {m.name}</option>
                    ))}
                  </select>
                  <button onClick={addTask} style={{ ...s.btn(), padding:'9px 16px' }}>+ Add</button>
                </div>
              </div>

              {/* Task list */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {filteredTasks.length === 0 && (
                  <div style={{ ...s.card({ textAlign:'center', padding:'32px', color:C.muted }) }}>
                    <div style={{ fontSize:'1.5rem', marginBottom:6 }}>✅</div>
                    <div style={{ fontSize:'0.8rem' }}>{taskFilter==='done'?'No completed tasks yet':'All done! Nothing here.'}</div>
                  </div>
                )}
                {filteredTasks.map(t => {
                  const m = FAMILY_MEMBERS.find(fm=>fm.name===t.who)
                  return (
                    <div key={t.id} style={{ ...s.card({ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', opacity:t.done?0.6:1 }) }}>
                      <button onClick={()=>toggleTask(t.id)} style={{
                        width:20, height:20, borderRadius:'50%', border:`2px solid ${t.done?C.sage:C.border}`,
                        background:t.done?C.sage:'transparent', cursor:'pointer', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'#fff', fontSize:'0.6rem',
                      }}>{t.done?'✓':''}</button>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.8rem', fontWeight:500, textDecoration:t.done?'line-through':'none', color:t.done?C.muted:C.text }}>{t.text}</div>
                        <div style={{ fontSize:'0.58rem', color:C.muted, marginTop:2 }}>
                          <span style={{ color:m?.color, fontWeight:600 }}>{t.who}</span>
                          {' · '}{new Date(t.ts).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                        </div>
                      </div>
                      <button onClick={()=>removeTask(t.id)} style={{
                        background:'none', border:'none', color:C.dim, cursor:'pointer', fontSize:'0.85rem', padding:'2px 4px'
                      }}>✕</button>
                    </div>
                  )
                })}
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
