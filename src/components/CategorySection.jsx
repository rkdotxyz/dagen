/*
  CategorySection.jsx — one category: its header, its tasks in time order,
  and its own add panel.

  It owns two small things: whether the add panel is open, and which task
  is being edited. Everything that outlives a redraw is owned by App.
*/

import { useState } from 'react'
import { DrawablyBadge, DrawablyButton, DrawablyDivider } from 'drawably/react'
import TaskForm from './TaskForm.jsx'
import TaskItem from './TaskItem.jsx'

function CategorySection({
  category,
  tasks,
  allTasks,
  conflicts,
  selectedDay,
  isCollapsed,
  onToggleCollapse,
  onAdd,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const remaining = tasks.filter((task) => task.status !== 'done').length

  function startAdding() {
    setIsAdding(true)
    if (isCollapsed) onToggleCollapse(category.id)
  }

  return (
    <section className="category" aria-label={category.name}>
      <div className="category-header">
        <button
          type="button"
          className="category-toggle"
          onClick={() => onToggleCollapse(category.id)}
          aria-expanded={!isCollapsed}
        >
          {/* The one place Google's category colour still appears: a solid
              swatch with a white ring, so even the darker Google colours
              stay visible on blue paper. */}
          <span className="dot" style={{ backgroundColor: category.hex }} />
          <span className="category-name">{category.name}</span>
          <DrawablyBadge className="category-count">{remaining}</DrawablyBadge>
        </button>

        <DrawablyButton
          className="add-button"
          onClick={startAdding}
          aria-label={`Add to ${category.name}`}
        >
          +
        </DrawablyButton>
      </div>

      <DrawablyDivider className="category-rule" />

      {!isCollapsed && (
        <>
          {isAdding && (
            <TaskForm
              categoryName={category.name}
              tasks={allTasks}
              defaultDay={selectedDay}
              onSubmit={(details) => onAdd(category.id, details)}
              onCancel={() => setIsAdding(false)}
            />
          )}

          {tasks.length === 0 ? (
            <p className="empty">Nothing on this day.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((task) =>
                task.id === editingId ? (
                  <li key={task.id}>
                    <TaskForm
                      categoryName={category.name}
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
                    conflicts={conflicts[task.id] ?? []}
                    onToggle={onToggleTask}
                    onEdit={setEditingId}
                    onDelete={onDeleteTask}
                  />
                ),
              )}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default CategorySection
