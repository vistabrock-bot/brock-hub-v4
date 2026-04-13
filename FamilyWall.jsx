import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const FamilyWall = dynamic(() => import('../components/FamilyWall'), { ssr: false })
export default function FamilyWallPage() {
  return (
    <>
      <Head><title>Brock Family Wall</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{position:"relative"}}>
        <Link href="/" style={{position:"fixed",top:10,left:10,zIndex:1000,background:"rgba(26,20,16,0.85)",color:"#c4885a",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",padding:"5px 10px",borderRadius:6,textDecoration:"none",border:"1px solid rgba(196,136,90,0.3)"}}>← Hub</Link>
        <FamilyWall />
      </div>
    </>
  )
}
