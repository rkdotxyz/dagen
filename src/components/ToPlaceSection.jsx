/*
  ToPlaceSection.jsx — tasks that don't have a day yet.

  Since Phase 11 a task can be saved with "No day yet". It isn't on any
  day, so the day sections can't show it, and it never goes to Google
  Calendar. It waits here instead, until you edit it and give it a day.

  This is the simple first version. Phase 12 moves it next to the Week
  view and adds deadlines, a "Place on..." picker and the "pushed" count.

  Like CategorySection, it only owns which row is being edited.
*/

import { useState } from 'react'
import { DrawablyBadge, DrawablyDivider } from 'drawably/react'
import { getCategory } from '../config.js'
import { findArea } from '../lib/areas.js'
import TaskForm from './TaskForm.jsx'
import TaskItem from './TaskItem.jsx'

function ToPlaceSection({
  tasks,
  areas,
  allTasks,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
}) {
  const [editingId, setEditingId] = useState(null)

  return (
    <section className="category to-place" aria-label="To place">
      <div className="category-header">
        <h2 className="section-title">
          To place
          <DrawablyBadge className="category-count">{tasks.length}</DrawablyBadge>
        </h2>
      </div>

      <DrawablyDivider className="category-rule" />

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
                // Unplaced tasks have no time, so nothing can clash.
                conflicts={[]}
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
