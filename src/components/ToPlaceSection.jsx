/*
  ToPlaceSection.jsx — tasks that don't have a day yet.

  A task saved with "No day yet", or one that rolled over, waits here. It
  never goes to Google Calendar until it has a time.

  Since Phase 12 each row says when to start (from its deadline) and how
  often it was pushed, and can be put on a day with "Place on…". A task
  pushed 3 times or more also offers:
    Halve it   half the estimate, and the pushed count back to 0
    Drop       delete it (App shows an Undo for a few seconds)

  On a computer, rows can be dragged onto a day in the Week view, and
  tasks dragged back here are unplaced.

  The order of the list is decided in planning.js (toPlaceList).
*/

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { PUSHED_LIMIT, getCategory } from '../config.js'
import { findArea } from '../lib/areas.js'
import { addDays, formatDay } from '../lib/dates.js'
import TaskForm from './TaskForm.jsx'
import TaskItem from './TaskItem.jsx'

// The days offered by "Place on…": today and the next two weeks.
function placeOptions(today) {
  return Array.from({ length: 14 }, (_, index) => addDays(today, index))
}

function ToPlaceSection({
  tasks,
  areas,
  allTasks,
  today,
  timer = null,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onPlace,
  onHalve,
  onDrop,
  onDragStart,
  onDropHere,
}) {
  const [editingId, setEditingId] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // The controls under each row.
  function extraFor(task) {
    const pushedTooOften = (task.rolled ?? 0) >= PUSHED_LIMIT

    return (
      <div className="to-place-actions">
        <NativeSelect
          className="place-on"
          value=""
          onChange={(event) => event.target.value && onPlace(task.id, event.target.value)}
          aria-label={`Place ${task.title} on a day`}
        >
          <option value="">Place on…</option>
          {placeOptions(today).map((day) => (
            <option key={day} value={day}>
              {formatDay(day, new Date(`${today}T12:00`))}
            </option>
          ))}
        </NativeSelect>

        {pushedTooOften && (
          <>
            <Button size="sm" variant="outline" onClick={() => onHalve(task.id)}>
              Halve it
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => onDrop(task.id)}
            >
              Drop
            </Button>
          </>
        )}
      </div>
    )
  }

  // Dropping a dragged task here unplaces it. preventDefault on dragover
  // is what tells the browser "dropping here is allowed".
  const dropProps = {
    onDragOver: (event) => {
      event.preventDefault()
      setIsDragOver(true)
    },
    onDragLeave: () => setIsDragOver(false),
    onDrop: (event) => {
      event.preventDefault()
      setIsDragOver(false)
      const id = event.dataTransfer.getData('text/plain')
      if (id) onDropHere(id)
    },
  }

  return (
    <section
      className={isDragOver ? 'category to-place drag-over' : 'category to-place'}
      aria-label="To place"
      {...dropProps}
    >
      <div className="category-header">
        <h2 className="section-title">
          To place
          <Badge variant="secondary">{tasks.length}</Badge>
        </h2>
      </div>

      {tasks.length === 0 ? (
        <p className="empty">
          Nothing waiting. Pick &quot;No day yet&quot; when you add a task to park it here.
        </p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) =>
            task.id === editingId ? (
              <li key={task.id}>
                <TaskForm
                  categoryId={task.categoryId}
                  categoryName={getCategory(task.categoryId).name}
                  areas={areas}
                  tasks={allTasks}
                  task={task}
                  onSubmit={(details) => {
                    onUpdateTask(task.id, details)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <TaskItem
                key={task.id}
                task={task}
                area={findArea(areas, task.areaId)}
                today={today}
                // Unplaced tasks have no time, so nothing can clash.
                conflicts={[]}
                extra={extraFor(task)}
                timer={timer}
                draggable
                onDragStart={onDragStart}
                onToggle={onToggleTask}
                onEdit={setEditingId}
                onDelete={onDeleteTask}
              />
            ),
          )}
        </ul>
      )}
    </section>
  )
}

export default ToPlaceSection
