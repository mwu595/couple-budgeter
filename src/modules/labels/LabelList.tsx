'use client'

import { GripVertical, Pencil, Tag } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/core/store'
import type { Label, Transaction } from '@/core/types'

interface LabelListProps {
  labels: Label[]
  transactions: Transaction[]
  onEdit: (label: Label) => void
}

export function LabelList({ labels, transactions, onEdit }: LabelListProps) {
  const reorderLabels = useAppStore((s) => s.reorderLabels)

  // PointerSensor with a small distance threshold prevents drag from firing
  // on a plain click of the Edit button. TouchSensor with delay gives mobile
  // users room to scroll the page without the row latching to their finger.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = labels.findIndex((l) => l.id === active.id)
    const newIndex = labels.findIndex((l) => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(labels, oldIndex, newIndex)
    void reorderLabels(next.map((l) => l.id))
  }

  if (labels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Tag className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No labels yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Add your first label to start categorizing transactions.
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={labels.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul className="divide-y">
          {labels.map((label) => {
            const count = transactions.filter((tx) => tx.labelIds.includes(label.id)).length
            return (
              <SortableLabelRow
                key={label.id}
                label={label}
                count={count}
                onEdit={() => onEdit(label)}
              />
            )
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

interface SortableLabelRowProps {
  label: Label
  count: number
  onEdit: () => void
}

function SortableLabelRow({ label, count, onEdit }: SortableLabelRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: label.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
    background: isDragging ? 'var(--background)' : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-3.5 hover:bg-muted/30 transition-colors"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none flex items-center justify-center w-7 h-7 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        aria-label={`Reorder ${label.name}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Color swatch */}
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: label.color }}
        aria-hidden="true"
      />

      {/* Name + count */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: label.color }}>
          {label.icon && <span className="mr-1">{label.icon}</span>}
          {label.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {count} transaction{count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Edit button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground mr-2"
        onClick={onEdit}
        aria-label={`Edit ${label.name}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
    </li>
  )
}
