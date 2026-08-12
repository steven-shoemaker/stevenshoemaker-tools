import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import type { DecisionMatrixApi } from '../model/useDecisionMatrix'
import {
  PALETTE,
  criterionColor,
  rankColor,
  swatchName,
} from '../model/palette'
import { scoreKey, type Criterion, type Option, type OptionResult } from '../model/types'

/** Bounce stays at 0 — this is data settling, not a toy. */
const SPRING = { type: 'spring', duration: 0.4, bounce: 0 } as const

type Props = {
  api: DecisionMatrixApi
}

export function ScoreGrid({ api }: Props) {
  const {
    state,
    compute,
    docId,
    setScore,
    addOption,
    renameOption,
    removeOption,
    reorderOptions,
    addCriterion,
    renameCriterion,
    setCriterionWeight,
    setCriterionColor,
    removeCriterion,
  } = api
  const gridRef = useRef<HTMLDivElement>(null)
  const [fadeEnd, setFadeEnd] = useState(false)
  const [moveAnnounce, setMoveAnnounce] = useState('')

  useEffect(() => {
    const el = gridRef.current
    if (!el) return

    const updateFade = () => {
      const canScroll = el.scrollWidth > el.clientWidth + 2
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      setFadeEnd(canScroll && !atEnd)
    }

    updateFade()
    el.addEventListener('scroll', updateFade, { passive: true })
    const ro = new ResizeObserver(updateFade)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateFade)
      ro.disconnect()
    }
  }, [state.options.length, state.criteria.length])

  const tbodyRef = useRef<HTMLTableSectionElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  /**
   * Reorders by hit-testing the pointer against the live row rects rather than
   * using Motion's layout projection, which does not survive `display: table-row`
   * or the sticky identity column.
   */
  useEffect(() => {
    if (!draggingId) return

    const onMove = (e: PointerEvent) => {
      const rows = Array.from(tbodyRef.current?.rows ?? [])
      const from = state.options.findIndex((o) => o.id === draggingId)
      if (from < 0) return
      const to = rows.findIndex((r) => {
        const b = r.getBoundingClientRect()
        return e.clientY >= b.top && e.clientY <= b.bottom
      })
      if (to < 0 || to === from) return
      const next = [...state.options]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      reorderOptions(next)
    }

    const onEnd = () => {
      const i = state.options.findIndex((o) => o.id === draggingId)
      const item = state.options[i]
      if (item) {
        setMoveAnnounce(
          `${item.name} moved to position ${i + 1} of ${state.options.length}`,
        )
      }
      setDraggingId(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [draggingId, state.options, reorderOptions])

  /** The keyboard path for reordering; dragging is a pointer-only shortcut. */
  const moveOption = useCallback(
    (index: number, delta: number) => {
      const target = index + delta
      if (target < 0 || target >= state.options.length) return
      const next = [...state.options]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      reorderOptions(next)
      setMoveAnnounce(
        `${item.name} moved to position ${target + 1} of ${next.length}`,
      )
    },
    [state.options, reorderOptions],
  )

  return (
    <section className="dm-grid-section dm-card" aria-labelledby="dm-grid-title">
      <div className="dm-grid-head">
        <div>
          <h2 id="dm-grid-title" className="dm-section-title">
            Decision matrix
          </h2>
          <p className="dm-section-sub">
            Set how much each criterion matters, then rate every option from{' '}
            {state.scaleMin} to {state.scaleMax}. The percentages are each
            criterion&rsquo;s share of the total, so they always add up to 100%.
          </p>
        </div>
      </div>

      <div className="dm-sr-only" role="status" aria-live="polite">
        {moveAnnounce}
      </div>

      <div
        ref={gridRef}
        className={`dm-grid-scroll${fadeEnd ? ' dm-grid-scroll-fade' : ''}`}
      >
        <table className="dm-grid">
          <thead>
            <tr>
              <th scope="col" className="dm-grid-corner">
                Option
              </th>
              {state.criteria.map((c, col) => (
                <CriterionHeader
                  key={c.id}
                  index={col}
                  name={c.name}
                  weight={c.weight}
                  color={criterionColor(col, c.color)}
                  onColor={(hex) => setCriterionColor(c.id, hex)}
                  share={compute.shares[c.id] ?? 0}
                  onRename={(v) => renameCriterion(c.id, v)}
                  onWeight={(v) => setCriterionWeight(c.id, v)}
                  onRemove={() => removeCriterion(c.id)}
                />
              ))}
              <th scope="col" className="dm-add-col">
                <button
                  type="button"
                  className="dm-add-btn"
                  onClick={addCriterion}
                  aria-label="Add criterion"
                  title="Add criterion"
                >
                  <PlusIcon />
                </button>
              </th>
              <th scope="col" className="dm-grid-total-head">
                Total
              </th>
            </tr>
          </thead>

          {/* Keyed on docId: Sample, Clear and Import replace every option id
              at once, and without this the old rows animate out while the new
              ones animate in, doubling the table mid-transition. */}
          <tbody key={docId} ref={tbodyRef}>
            <AnimatePresence initial={false}>
              {state.options.map((o, row) => (
                <OptionRow
                  key={o.id}
                  option={o}
                  index={row}
                  count={state.options.length}
                  criteria={state.criteria}
                  scores={state.scores}
                  scaleMin={state.scaleMin}
                  scaleMax={state.scaleMax}
                  result={compute.results.find((r) => r.optionId === o.id)}
                  hasWeights={compute.hasWeights}
                  onRename={(v) => renameOption(o.id, v)}
                  onRemove={() => removeOption(o.id)}
                  onScore={(cid, v) => setScore(o.id, cid, v)}
                  onMove={(delta) => moveOption(row, delta)}
                  dragging={draggingId === o.id}
                  onDragStart={() => setDraggingId(o.id)}
                />
              ))}
            </AnimatePresence>

            <tr className="dm-add-row">
              <th scope="row" className="dm-add-row-head">
                <button
                  type="button"
                  className="dm-add-btn dm-add-btn-wide"
                  onClick={addOption}
                  aria-label="Add option"
                  title="Add option"
                >
                  <PlusIcon />
                </button>
              </th>
              <td colSpan={state.criteria.length + 2} />
            </tr>
          </tbody>
        </table>
      </div>

    </section>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

type OptionRowProps = {
  option: Option
  index: number
  count: number
  criteria: Criterion[]
  scores: Record<string, number>
  scaleMin: number
  scaleMax: number
  result: OptionResult | undefined
  hasWeights: boolean
  onRename: (value: string) => void
  onRemove: () => void
  onScore: (criterionId: string, value: number) => void
  onMove: (delta: number) => void
  dragging: boolean
  onDragStart: () => void
}

function OptionRow({
  option,
  index,
  count,
  criteria,
  scores,
  scaleMin,
  scaleMax,
  result,
  hasWeights,
  onRename,
  onRemove,
  onScore,
  onMove,
  dragging,
  onDragStart,
}: OptionRowProps) {

  const onHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    onMove(e.key === 'ArrowUp' ? -1 : 1)
  }

  return (
    <motion.tr
      className={
        dragging ? 'dm-option-row dm-option-row-dragging' : 'dm-option-row'
      }
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={SPRING}
    >
      <th scope="row" className="dm-grid-row-head">
        <div className="dm-row-head-inner">
          <button
            type="button"
            className="dm-drag-handle"
            aria-label={`Reorder ${option.name}, position ${index + 1} of ${count}. Use up and down arrows to move.`}
            onPointerDown={(e) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture?.(e.pointerId)
              onDragStart()
            }}
            onKeyDown={onHandleKeyDown}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
              <g fill="currentColor">
                <circle cx="2" cy="3" r="1.3" />
                <circle cx="8" cy="3" r="1.3" />
                <circle cx="2" cy="8" r="1.3" />
                <circle cx="8" cy="8" r="1.3" />
                <circle cx="2" cy="13" r="1.3" />
                <circle cx="8" cy="13" r="1.3" />
              </g>
            </svg>
          </button>
          <RankChip
            rank={hasWeights && result ? result.rank : undefined}
            fallback={index + 1}
          />
          <EditableName
            value={option.name}
            onChange={onRename}
            label={`Option ${index + 1} name`}
            className="dm-option-name"
          />
          <button
            type="button"
            className="dm-btn dm-btn-ghost dm-btn-icon"
            onClick={onRemove}
            aria-label={`Remove ${option.name}`}
            title={`Remove ${option.name}`}
          >
            <span aria-hidden>&times;</span>
          </button>
        </div>
      </th>

      {criteria.map((c) => (
        <td key={c.id} className="dm-grid-cell">
          <ScoreCell
            label={`${option.name}, ${c.name}`}
            value={scores[scoreKey(option.id, c.id)] ?? scaleMin}
            min={scaleMin}
            max={scaleMax}
            onChange={(v) => onScore(c.id, v)}
          />
        </td>
      ))}

      <td className="dm-add-col-cell" />

      <td className="dm-grid-total-cell">
        {result && hasWeights ? (
          <>
            <span className="dm-total-num">
              <AnimatedScore value={result.total} />
            </span>
            <span className="dm-total-pct">{result.percent}%</span>
            <span className="dm-total-bar" aria-hidden>
              {result.breakdown.map((b, i) => (
                <motion.span
                  key={b.criterionId}
                  className="dm-total-seg"
                  style={{
                    flexBasis: 0,
                    background: criterionColor(
                      i,
                      criteria.find((c) => c.id === b.criterionId)?.color,
                    ),
                  }}
                  animate={{ flexGrow: b.contribution }}
                  transition={SPRING}
                />
              ))}
            </span>
          </>
        ) : (
          <span className="dm-muted dm-total-empty">&mdash;</span>
        )}
      </td>
    </motion.tr>
  )
}

type EditableNameProps = {
  value: string
  onChange: (value: string) => void
  /** Positional label, so the accessible name is stable while typing. */
  label: string
  className: string
}

/**
 * Reads as plain text until activated, then becomes a real input. A text node
 * can size to its content and wrap; an input cannot, which is what was
 * truncating longer criterion names.
 */
function EditableName({ value, onChange, label, className }: EditableNameProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const originalRef = useRef(value)
  const returnFocusRef = useRef(false)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false
      buttonRef.current?.focus()
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`dm-name-input ${className}`}
        size={1}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            returnFocusRef.current = true
            setEditing(false)
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            onChange(originalRef.current)
            returnFocusRef.current = true
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`dm-name-display ${className}`}
      aria-label={`${label}: ${value || 'empty'}. Activate to edit.`}
      onClick={() => {
        originalRef.current = value
        setEditing(true)
      }}
    >
      {value || <span className="dm-name-empty">Unnamed</span>}
    </button>
  )
}

type CriterionHeaderProps = {
  index: number
  name: string
  weight: number
  color: string
  onColor: (hex: string) => void
  share: number
  onRename: (value: string) => void
  onWeight: (value: number) => void
  onRemove: () => void
}

function CriterionHeader({
  index,
  name,
  weight,
  color,
  onColor,
  share,
  onRename,
  onWeight,
  onRemove,
}: CriterionHeaderProps) {
  return (
    <th scope="col" className="dm-grid-col-head">
      <div className="dm-col-top">
        <ColorPicker value={color} onSelect={onColor} criterion={name} />
        <EditableName
          value={name}
          onChange={onRename}
          label={`Criterion ${index + 1} name`}
          className="dm-col-name"
        />
        <button
          type="button"
          className="dm-btn dm-btn-ghost dm-btn-icon"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          title={`Remove ${name}`}
        >
          <span aria-hidden>&times;</span>
        </button>
      </div>
      <div className="dm-col-weight">
        <input
          type="range"
          className="dm-weight-slider"
          min={0}
          max={100}
          step={1}
          value={weight}
          onChange={(e) => onWeight(Number(e.target.value))}
          aria-label={`Weight for ${name}`}
        />
        <span className="dm-col-share">{share}%</span>
      </div>
    </th>
  )
}

type ColorPickerProps = {
  value: string
  onSelect: (hex: string) => void
  criterion: string
}

/** The swatch is the trigger; the popover mirrors the export menu's pattern. */
function ColorPicker({ value, onSelect, criterion }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!open) return
    const items = popRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')
    items?.[0]?.focus()

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (!items || items.length === 0) return
      const list = [...items]
      const i = list.indexOf(document.activeElement as HTMLElement)
      const move = (next: number) => {
        e.preventDefault()
        list[(next + list.length) % list.length]?.focus()
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i + 1)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i - 1)
      if (e.key === 'Home') move(0)
      if (e.key === 'End') move(list.length - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  return (
    <span className="dm-color-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="dm-color-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Colour for ${criterion}: ${swatchName(value)}. Activate to change.`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dm-col-dot" style={{ background: value }} aria-hidden />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="dm-export-backdrop"
            aria-label="Close colour picker"
            tabIndex={-1}
            onClick={close}
          />
          <div
            ref={popRef}
            className="dm-color-pop"
            role="radiogroup"
            aria-label={`Colour for ${criterion}`}
          >
            {PALETTE.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                role="radio"
                aria-checked={sw.hex === value}
                tabIndex={sw.hex === value ? 0 : -1}
                className={
                  sw.hex === value
                    ? 'dm-swatch dm-swatch-on'
                    : 'dm-swatch'
                }
                style={{ background: sw.hex }}
                title={sw.name}
                aria-label={sw.name}
                onClick={() => {
                  onSelect(sw.hex)
                  close()
                }}
              />
            ))}
          </div>
        </>
      )}
    </span>
  )
}

type RankChipProps = {
  /** Undefined until weights exist; the row then shows its entry position. */
  rank: number | undefined
  fallback: number
}

/**
 * A rank change is the one moment the ordering actually moves, so the digit
 * swaps rather than cutting. Under reduced motion it crossfades instead.
 */
function RankChip({ rank, fallback }: RankChipProps) {
  const reduced = useReducedMotion()
  const shown = rank ?? fallback

  const hidden = reduced
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.72, filter: 'blur(4px)' }
  const visible = reduced
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: 'blur(0px)' }

  return (
    <span
      className="dm-rank-chip"
      style={{ '--dm-rank-fill': rankColor(rank) } as CSSProperties}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={shown}
          className="dm-rank-num"
          aria-hidden
          initial={hidden}
          animate={visible}
          exit={hidden}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
        >
          {shown}
        </motion.span>
      </AnimatePresence>
      {rank !== undefined && <span className="dm-sr-only">Rank {rank}</span>}
    </span>
  )
}

type ScoreCellProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

/**
 * A fixed 1-5 scale is a picker, not a numeric field. One radiogroup per cell
 * keeps the whole cell to a single tab stop while arrow keys set the score.
 */
function ScoreCell({ label, value, min, max, onChange }: ScoreCellProps) {
  const ref = useRef<HTMLDivElement>(null)
  const values: number[] = []
  for (let v = min; v <= max; v++) values.push(v)

  const select = useCallback(
    (next: number) => {
      onChange(next)
      ref.current?.querySelector<HTMLElement>(`[data-score="${next}"]`)?.focus()
    },
    [onChange],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = values.indexOf(value)
    let next: number | undefined
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = values[(i + 1) % values.length]
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = values[(i - 1 + values.length) % values.length]
        break
      case 'Home':
        next = values[0]
        break
      case 'End':
        next = values[values.length - 1]
        break
      default:
        return
    }
    e.preventDefault()
    if (next !== undefined) select(next)
  }

  // One highlight that slides between the options, rather than each option
  // owning a background that cuts in and out. Segments are equal width, so the
  // position is pure arithmetic - no measuring the DOM.
  const activeIndex = Math.max(0, values.indexOf(value))

  return (
    <div
      ref={ref}
      className="dm-score-seg"
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      style={
        {
          '--dm-seg-count': values.length,
          '--dm-seg-index': activeIndex,
        } as CSSProperties
      }
    >
      <span className="dm-score-thumb" aria-hidden />
      {values.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          data-score={v}
          aria-checked={v === value}
          tabIndex={v === value ? 0 : -1}
          className="dm-score-opt"
          onClick={() => select(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

/**
 * Counts the total to its new value so a weight change reads as the numbers
 * moving, not as the page swapping under you. Drives a MotionValue directly so
 * it does not re-render the row on every frame.
 */
function AnimatedScore({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => formatScore(v))

  useEffect(() => {
    if (reduced) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, SPRING)
    return () => controls.stop()
  }, [value, reduced, mv])

  return <motion.span>{text}</motion.span>
}

function formatScore(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}
