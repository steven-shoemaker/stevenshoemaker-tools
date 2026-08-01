import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  canMoveUnder,
  getDirects,
  inTreePeople,
} from '../model/graph'
import type { DirectPlacement, Person } from '../model/types'
import type { OrgChartApi } from '../model/useOrgChart'

type Props = {
  api: OrgChartApi
}

const ModalCloseContext = createContext<() => void>(() => {})

function useModalClose() {
  return useContext(ModalCloseContext)
}

function Backdrop({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  const [leaving, setLeaving] = useState(false)
  const close = useCallback(() => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(onClose, 180)
  }, [leaving, onClose])

  return (
    <ModalCloseContext.Provider value={close}>
      <div
        className={['oc-modal-backdrop', leaving ? 'is-leaving' : '']
          .filter(Boolean)
          .join(' ')}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      >
        {children}
      </div>
    </ModalCloseContext.Provider>
  )
}

function ManagerPickerList({
  people,
  personId,
  query,
  selectedManagerId,
  onSelect,
}: {
  people: Person[]
  personId: string
  query: string
  selectedManagerId: string | null
  onSelect: (id: string) => void
}) {
  const q = query.trim().toLowerCase()
  const candidates = inTreePeople(people)
    .filter((p) => p.id !== personId)
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .slice(0, 12)

  return (
    <div className="oc-result-list">
      {candidates.map((p) => {
        const check = canMoveUnder(people, personId, p.id)
        const directs = getDirects(people, p.id).length
        return (
          <button
            key={p.id}
            type="button"
            className={
              selectedManagerId === p.id
                ? 'oc-result oc-result-active'
                : 'oc-result'
            }
            disabled={!check.ok}
            onClick={() => onSelect(p.id)}
          >
            <span>
              <strong>{p.name}</strong>
              <span>
                {check.ok
                  ? `${directs} direct${directs === 1 ? '' : 's'}${p.managerId ? '' : ' · Root'}`
                  : check.reason}
              </span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 500 }}>
              {check.ok ? 'Select' : 'Blocked'}
            </span>
          </button>
        )
      })}
      {candidates.length === 0 ? (
        <p className="oc-modal-sub">No matches</p>
      ) : null}
    </div>
  )
}

export function Dialogs({ api }: Props) {
  const { dialog, setDialog, working, runMove, runMakeRoot, runCollect, runRemove, runRestore, runAdd, reset } =
    api

  if (!working || dialog.type === 'none') return null

  if (dialog.type === 'move' || dialog.type === 'restore') {
    return (
      <MoveDialog
        mode={dialog.type}
        personId={dialog.personId}
        people={working.people}
        onClose={() => setDialog({ type: 'none' })}
        onMove={(managerId) => {
          if (dialog.type === 'restore') runRestore(dialog.personId, managerId)
          else runMove(dialog.personId, managerId)
        }}
        onRoot={() => {
          if (dialog.type === 'restore') runRestore(dialog.personId, null)
          else runMakeRoot(dialog.personId)
        }}
      />
    )
  }

  if (dialog.type === 'collect') {
    return (
      <CollectDialog
        personId={dialog.personId}
        thenRemove={dialog.thenRemove}
        people={working.people}
        onClose={() => setDialog({ type: 'none' })}
        onApply={(placements, thenRemove) =>
          runCollect(dialog.personId, placements, thenRemove)
        }
      />
    )
  }

  if (dialog.type === 'remove') {
    const person = working.people.find((p) => p.id === dialog.personId)
    return (
      <RemoveConfirmDialog
        name={person?.name ?? 'this person'}
        onClose={() => setDialog({ type: 'none' })}
        onConfirm={() => runRemove(dialog.personId)}
      />
    )
  }

  if (dialog.type === 'add') {
    return (
      <AddDialog
        people={working.people}
        onClose={() => setDialog({ type: 'none' })}
        onAdd={runAdd}
      />
    )
  }

  if (dialog.type === 'reset') {
    return (
      <ResetConfirmDialog
        onClose={() => setDialog({ type: 'none' })}
        onConfirm={() => {
          reset()
          setDialog({ type: 'none' })
        }}
      />
    )
  }

  const _exhaustive: never = dialog
  return _exhaustive
}

function RemoveConfirmDialog({
  name,
  onClose,
  onConfirm,
}: {
  name: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Backdrop onClose={onClose}>
      <RemoveConfirmBody name={name} onConfirm={onConfirm} />
    </Backdrop>
  )
}

function RemoveConfirmBody({
  name,
  onConfirm,
}: {
  name: string
  onConfirm: () => void
}) {
  const close = useModalClose()
  return (
    <div className="oc-modal" role="dialog" aria-modal="true">
      <div>
        <h2>Remove {name}?</h2>
        <p className="oc-modal-sub">
          Moves to Removed · not in Download CSV · Restore anytime
        </p>
      </div>
      <div className="oc-note">
        <span>
          If they still have directs, you’ll place them first via Collect.
        </span>
      </div>
      <div className="oc-modal-foot">
        <div className="oc-modal-foot-right">
          <button type="button" className="oc-btn oc-btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="button" className="oc-btn oc-btn-danger" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetConfirmDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Backdrop onClose={onClose}>
      <ResetConfirmBody onConfirm={onConfirm} />
    </Backdrop>
  )
}

function ResetConfirmBody({ onConfirm }: { onConfirm: () => void }) {
  const close = useModalClose()
  return (
    <div className="oc-modal" role="dialog" aria-modal="true">
      <div>
        <h2>Reset sandbox?</h2>
        <p className="oc-modal-sub">
          Discards edits and restores the import snapshot. Undo history clears.
        </p>
      </div>
      <div className="oc-modal-foot">
        <div className="oc-modal-foot-right">
          <button type="button" className="oc-btn oc-btn-ghost" onClick={close}>
            Cancel
          </button>
          <button type="button" className="oc-btn oc-btn-primary" onClick={onConfirm}>
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

function MoveDialog({
  mode,
  personId,
  people,
  onClose,
  onMove,
  onRoot,
}: {
  mode: 'move' | 'restore'
  personId: string
  people: Person[]
  onClose: () => void
  onMove: (managerId: string) => void
  onRoot: () => void
}) {
  return (
    <Backdrop onClose={onClose}>
      <MoveDialogBody
        mode={mode}
        personId={personId}
        people={people}
        onMove={onMove}
        onRoot={onRoot}
      />
    </Backdrop>
  )
}

function MoveDialogBody({
  mode,
  personId,
  people,
  onMove,
  onRoot,
}: {
  mode: 'move' | 'restore'
  personId: string
  people: Person[]
  onMove: (managerId: string) => void
  onRoot: () => void
}) {
  const close = useModalClose()
  const person = people.find((p) => p.id === personId)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const directs = getDirects(people, personId).length

  return (
    <div className="oc-modal" role="dialog" aria-modal="true">
      <div>
        <h2>
          {mode === 'restore' ? 'Restore' : 'Move'} {person?.name}
        </h2>
        <p className="oc-modal-sub">
          {mode === 'move' && directs > 0
            ? `${directs} directs come along · search for a new manager`
            : 'Search for a manager, or Make root'}
        </p>
      </div>
      <div className="oc-search">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.2" stroke="#A1A1AA" strokeWidth="1.4" />
          <path
            d="M9.2 9.2L12 12"
            stroke="#A1A1AA"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search managers…"
          autoFocus
        />
      </div>
      <ManagerPickerList
        people={people}
        personId={personId}
        query={query}
        selectedManagerId={selected}
        onSelect={setSelected}
      />
      <div className="oc-modal-foot">
        <button type="button" className="oc-btn oc-btn-secondary" onClick={onRoot}>
          Make root instead
        </button>
        <div className="oc-modal-foot-right">
          <button type="button" className="oc-btn oc-btn-ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="oc-btn oc-btn-primary"
            disabled={!selected}
            onClick={() => selected && onMove(selected)}
          >
            {mode === 'restore' ? 'Restore here' : 'Move here'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CollectDialog({
  personId,
  thenRemove,
  people,
  onClose,
  onApply,
}: {
  personId: string
  thenRemove: boolean
  people: Person[]
  onClose: () => void
  onApply: (placements: Record<string, DirectPlacement>, thenRemove: boolean) => void
}) {
  const [placements, setPlacements] = useState<Record<string, DirectPlacement>>(
    {},
  )
  const [pickingFor, setPickingFor] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const directs = useMemo(() => getDirects(people, personId), [people, personId])

  if (pickingFor) {
    return (
      <Backdrop onClose={() => setPickingFor(null)}>
        <CollectPickBody
          name={directs.find((d) => d.id === pickingFor)?.name ?? ''}
          personId={pickingFor}
          people={people}
          query={query}
          setQuery={setQuery}
          onSelect={(managerId) => {
            setPlacements((prev) => ({
              ...prev,
              [pickingFor]: { kind: 'move', managerId },
            }))
            setPickingFor(null)
            setQuery('')
          }}
        />
      </Backdrop>
    )
  }

  return (
    <Backdrop onClose={onClose}>
      <CollectBody
        personName={people.find((p) => p.id === personId)?.name ?? ''}
        thenRemove={thenRemove}
        people={people}
        directs={directs}
        placements={placements}
        setPlacements={setPlacements}
        onPick={setPickingFor}
        onApply={onApply}
      />
    </Backdrop>
  )
}

function CollectPickBody({
  name,
  personId,
  people,
  query,
  setQuery,
  onSelect,
}: {
  name: string
  personId: string
  people: Person[]
  query: string
  setQuery: (q: string) => void
  onSelect: (managerId: string) => void
}) {
  const close = useModalClose()
  return (
    <div className="oc-modal" role="dialog" aria-modal="true">
      <div>
        <h2>Move {name}</h2>
        <p className="oc-modal-sub">Choose their new manager</p>
      </div>
      <div className="oc-search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search managers…"
          autoFocus
        />
      </div>
      <ManagerPickerList
        people={people}
        personId={personId}
        query={query}
        selectedManagerId={null}
        onSelect={onSelect}
      />
      <div className="oc-modal-foot">
        <button type="button" className="oc-btn oc-btn-ghost" onClick={close}>
          Back
        </button>
      </div>
    </div>
  )
}

function CollectBody({
  personName,
  thenRemove,
  people,
  directs,
  placements,
  setPlacements,
  onPick,
  onApply,
}: {
  personName: string
  thenRemove: boolean
  people: Person[]
  directs: Person[]
  placements: Record<string, DirectPlacement>
  setPlacements: Dispatch<SetStateAction<Record<string, DirectPlacement>>>
  onPick: (id: string) => void
  onApply: (placements: Record<string, DirectPlacement>, thenRemove: boolean) => void
}) {
  const close = useModalClose()
  const placed = directs.filter((d) => placements[d.id]).length

  return (
    <div className="oc-modal oc-modal-wide" role="dialog" aria-modal="true">
      <div>
        <h2>Collect {personName}’s directs</h2>
        <p className="oc-modal-sub">
          Place each person before Remove — or empty them to an IC
        </p>
      </div>
      <div className="oc-collect-progress">
        <span>
          {placed} of {directs.length} placed
        </span>
        <em>Unplaced → Unassigned</em>
      </div>
      <div className="oc-result-list">
        {directs.map((d) => {
          const placement = placements[d.id]
          const label =
            placement?.kind === 'move'
              ? `→ ${people.find((p) => p.id === placement.managerId)?.name ?? '…'}`
              : placement?.kind === 'root'
                ? '→ Make root'
                : placement?.kind === 'unassigned'
                  ? '→ Unassigned'
                  : 'Choose placement'
          return (
            <div
              key={d.id}
              className={
                placement ? 'oc-collect-row oc-collect-row-done' : 'oc-collect-row'
              }
            >
              <span>
                <strong style={{ display: 'block', fontSize: 13 }}>{d.name}</strong>
                <span style={{ fontSize: 11, color: 'var(--oc-muted)' }}>
                  {label}
                </span>
              </span>
              {placement ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--oc-green-ink)',
                  }}
                >
                  Placed
                </span>
              ) : (
                <div className="oc-collect-actions">
                  <button
                    type="button"
                    className="oc-row-action"
                    onClick={() => onPick(d.id)}
                  >
                    Move…
                  </button>
                  <button
                    type="button"
                    className="oc-row-action"
                    onClick={() =>
                      setPlacements((prev) => ({
                        ...prev,
                        [d.id]: { kind: 'root' },
                      }))
                    }
                  >
                    Root
                  </button>
                  <button
                    type="button"
                    className="oc-row-action"
                    style={{
                      background: 'var(--oc-amber-wash)',
                      borderColor: 'transparent',
                      color: 'var(--oc-amber)',
                    }}
                    onClick={() =>
                      setPlacements((prev) => ({
                        ...prev,
                        [d.id]: { kind: 'unassigned' },
                      }))
                    }
                  >
                    Unassigned
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="oc-modal-foot">
        <button type="button" className="oc-btn oc-btn-ghost" onClick={close}>
          Cancel
        </button>
        <div className="oc-modal-foot-right">
          <button
            type="button"
            className="oc-btn oc-btn-secondary"
            onClick={() => onApply(placements, false)}
          >
            Apply placements
          </button>
          {thenRemove ? (
            <button
              type="button"
              className="oc-btn oc-btn-primary"
              onClick={() => onApply(placements, true)}
            >
              Apply & Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function AddDialog({
  people,
  onClose,
  onAdd,
}: {
  people: Person[]
  onClose: () => void
  onAdd: (name: string, managerId: string | null | 'unassigned') => void
}) {
  return (
    <Backdrop onClose={onClose}>
      <AddDialogBody people={people} onAdd={onAdd} />
    </Backdrop>
  )
}

function AddDialogBody({
  people,
  onAdd,
}: {
  people: Person[]
  onAdd: (name: string, managerId: string | null | 'unassigned') => void
}) {
  const close = useModalClose()
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [managerId, setManagerId] = useState<string | null>(null)

  return (
    <div className="oc-modal" role="dialog" aria-modal="true">
      <div>
        <h2>Add person</h2>
        <p className="oc-modal-sub">
          Local only · leave manager blank to put in Unassigned
        </p>
      </div>
      <div className="oc-field">
        <label htmlFor="oc-add-name">Name</label>
        <input
          id="oc-add-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="oc-field">
        <label>Manager (optional)</label>
        <div className="oc-search">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setManagerId(null)
            }}
            placeholder="Search managers…"
          />
        </div>
        {query.trim() ? (
          <ManagerPickerList
            people={[
              ...people,
              {
                id: '__new__',
                name: name || 'New',
                managerId: null,
                placement: 'inTree',
              },
            ]}
            personId="__new__"
            query={query}
            selectedManagerId={managerId}
            onSelect={setManagerId}
          />
        ) : null}
        {managerId ? (
          <p className="oc-modal-sub">
            Manager: {people.find((p) => p.id === managerId)?.name}
          </p>
        ) : null}
      </div>
      <div className="oc-modal-foot">
        <button
          type="button"
          className="oc-btn oc-btn-secondary"
          onClick={() => onAdd(name, null)}
          disabled={!name.trim()}
        >
          Add as root
        </button>
        <div className="oc-modal-foot-right">
          <button type="button" className="oc-btn oc-btn-ghost" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="oc-btn oc-btn-primary"
            disabled={!name.trim()}
            onClick={() =>
              onAdd(name, managerId ?? 'unassigned')
            }
          >
            Add person
          </button>
        </div>
      </div>
    </div>
  )
}
