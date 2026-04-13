import Head from 'next/head'
import Link from 'next/link'
export default function Home() {
  return (
    <>
      <Head><title>Brock Family Hub</title><meta name="viewport" content="width=device-width, initial-scale=1" /><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet" /></Head>
      <div style={{fontFamily:"'Jost',sans-serif",background:"#1a1410",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",color:"#f5f0e8"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(2rem,5vw,3rem)",fontWeight:300,letterSpacing:"0.08em"}}>Brock <span style={{color:"#c4885a"}}>Family</span> Hub</div>
          <div style={{fontSize:"0.62rem",letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(245,240,232,0.3)",marginTop:8}}>Austin, TX · 2417 Vista LN</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18,width:"100%",maxWidth:680}}>
          {[{href:"/family-wall",emoji:"🏠",title:"Family Wall",color:"#c4885a",desc:"Kitchen display · Live weather · Schedule · Family board · Austin activities · AI assistant (EN + RU for Tanya)"},
            {href:"/summer-planner",emoji:"🏕️",title:"Summer Planner",color:"#e8a87c",desc:"Summer 2026 camps · Week-by-week scheduler · Cost optimizer · Westminster + UT Lab school calendars"}
          ].map(a => (
            <Link key={a.href} href={a.href} style={{textDecoration:"none"}}>
              <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:14,padding:"28px 24px",borderTop:`3px solid ${a.color}`,cursor:"pointer"}}>
                <div style={{fontSize:"2rem",marginBottom:12}}>{a.emoji}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.35rem",fontWeight:600,marginBottom:8}}>{a.title}</div>
                <div style={{fontSize:"0.76rem",color:"rgba(245,240,232,0.48)",lineHeight:1.65}}>{a.desc}</div>
                <div style={{marginTop:18,fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:a.color}}>Open →</div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{marginTop:52,fontSize:"0.6rem",color:"rgba(245,240,232,0.18)",textAlign:"center",lineHeight:1.9}}>Monroe · Genevieve · Anastasia · Bakari · Jenya<br/>Built with Claude · Summer 2026</div>
      </div>
    </>
  )
}
