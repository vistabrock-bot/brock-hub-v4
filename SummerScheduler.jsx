import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const SummerScheduler = dynamic(() => import('../components/SummerScheduler'), { ssr: false })
export default function SummerPlannerPage() {
  return (
    <>
      <Head><title>Brock Summer Planner 2026</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{position:"relative"}}>
        <Link href="/" style={{position:"fixed",top:10,left:10,zIndex:1000,background:"rgba(15,20,32,0.85)",color:"#e8a87c",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"5px 10px",borderRadius:6,textDecoration:"none",border:"1px solid rgba(232,168,124,0.3)"}}>← Hub</Link>
        <SummerScheduler />
      </div>
    </>
  )
}
