export function PlantLogo({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/haven-logo.png"
      alt="Haven"
      width={size}
      height={size}
      style={{ borderRadius: '50%', border: '2px solid var(--border-mid)' }}
    />
  )
}
