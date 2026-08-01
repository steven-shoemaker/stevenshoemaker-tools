# Org Chart from CSV — Sandbox model

Local-only, no accounts. Import snapshot + editable working chart + undo.

## Settled decisions

| Topic | Decision |
|---|---|
| Soft exit | **Remove** (not Terminate) — person goes to Removed tray; restorable |
| People without managers | **Unassigned** tray (import orphans + demote / collect fallout) |
| Become a manager | Derived: receive directs via **Move**. No separate Promote. |
| Demote | **Collect directs…** then leave Unassigned / Move / Make root |
| Add person | **In scope** — Add person (name + optional manager) |
| Duplicates in sandbox | Keep as separate people; no Merge |
| Rename | Out of scope (re-import) |
| History beyond undo | None |
| Export | Download CSV of InTree + Unassigned (blank manager); omit Removed |

## Objects

- **Person** — placement: `InTree` | `Unassigned` | `Removed`
- **Working chart** — editable local org; live SPOC; flags
- **Import snapshot** — frozen; Reset restores
- **Flag** — orphan/unassigned, unknown manager, duplicate, cycle, self-report, span/depth warns
- **Change** — undo unit

Manager is a **role** (has ≥1 direct), not a type.

## Actions

| Verb | Meaning |
|---|---|
| Move | Change manager (subtree comes); drag or search picker |
| Assign | Unassigned → manager or root |
| Make root | Clear manager |
| Collect directs | Place each direct before Remove / empty-out |
| Remove | Soft-remove to Removed tray |
| Restore | Removed → Assign or Make root |
| Add person | Create InTree (or Unassigned if no manager) |
| Undo / Redo / Reset / Download CSV | Chart-level |

## Cycle rule

Cannot Move under own descendant — block with reason.

## Places

Import → Sandbox → Move picker | Collect directs | Remove confirm | Restore picker | Reset confirm

## Interaction notes

- Remove with directs: Collect directs required first.
- “Make IC a manager”: Move people onto them.
- Autosave working chart to `localStorage`.
- Optimistic UI always (no network).
