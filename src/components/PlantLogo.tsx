// PlantLogo.tsx
// Replace this entire component with your own logo by:
// 1. Saving your image to src/assets/haven-logo.png
// 2. Uncommenting the img tag below and commenting out the SVG

 import havenLogo from '../assets/haven-logo.png'  // ← uncomment this line

export function PlantLogo({ size = 48 }: { size?: number }) {
  // ↓ Uncomment this and delete the SVG below to use your own logo:
   return <img src='haven-logo.png' alt="Haven" width={size} height={size} style={{borderRadius:'50%', border:'2px solid var(--border-mid)'}} />

  // return (
  //   <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden className="plant-animated">
  //     <circle cx="28" cy="28" r="26" fill="var(--accent-pale)" stroke="var(--accent-mid)" strokeWidth="1.5"/>
  //     <path d="M18 44 C17 49 40 50 40 44 L37 35 C37 35 34 33 28 33 C22 33 19 35 19 35Z"
  //       fill="#d9c9b0" stroke="#8b7355" strokeWidth="1.5" strokeLinejoin="round"/>
  //     <ellipse cx="28" cy="35" rx="9" ry="3" fill="#c4a882" stroke="#8b7355" strokeWidth="1"/>
  //     <path d="M28 35 C28 35 27.5 24 28 19" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"/>
  //     <path d="M28 26 C28 26 19 23 18 15 C18 15 26 15 28 26Z" fill="#a8c8aa" stroke="var(--accent)" strokeWidth="1" strokeLinejoin="round"/>
  //     <path d="M28 21 C28 21 37 18 38 10 C38 10 30 10 28 21Z" fill="#c8deca" stroke="var(--accent)" strokeWidth="1" strokeLinejoin="round"/>
  //     <circle cx="28" cy="18" r="2" fill="var(--accent-pale)" stroke="var(--accent)" strokeWidth="1"/>
  //   </svg>
  // )
}
