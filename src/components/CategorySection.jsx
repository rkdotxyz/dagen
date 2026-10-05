/*
  CategorySection.jsx — one category: its coloured header, its tasks in
  time order, and its own add panel.

  It owns one small thing: whether its add panel is open. Everything that
  outlives a redraw is owned by App.
*/

import { useState } from 'react'
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
  // Which task is open for editing, or null. Only one at a time.
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
          <span className="dot" style={{ backgroundColor: category.hex }} />
          <span className="category-name">{category.name}</span>
          <span className="category-count">{remaining}</span>
        </button>

        <button
          type="button"
          className="add-button"
          onClick={startAdding}
          aria-label={`Add to ${category.name}`}
        >
          +
        </button>
      </div>

      {!isCollapsed && (
        <>
          {isAdding && (
            <TaskForm
              categoryName={category.name}
              // The form checks against EVERY task, not just this
              // category's: a clash doesn't care which section it's in.
              tasks={allTasks}
              // New tasks land on the day the week strip is showing.
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
                // The row being edited is replaced by the form, in place.
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
                    // ?? [] means "if there's no entry for this id, use an
                    // empty list", so TaskItem never has to check for null.
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
