type Props = {
  name: string
  query: string
}

/** Highlights the first case-insensitive substring match. */
export function HighlightName({ name, query }: Props) {
  const q = query.trim()
  if (!q) return name

  const lower = name.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx < 0) return name

  return (
    <>
      {name.slice(0, idx)}
      <mark className="oc-match">{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  )
}
