/*
  CategorySection.jsx — one category: its coloured header, its tasks,
  and its own add box.

  It owns one small thing: whether its add box is open. Everything that
  outlives a redraw (the tasks, which sections are collapsed) is owned by
  App, so this component can stay simple.
*/

import { useState } from 'react'
import AddTaskForm from './AddTaskForm.jsx'
import TaskItem from './TaskItem.jsx'

function CategorySection({
  category,
  tasks,
  isCollapsed,
  onToggleCollapse,
  onAdd,
  onToggleTask,
  onDeleteTask,
}) {
  const [isAdding, setIsAdding] = useState(false)

  const remaining = tasks.filter((task) => task.status !== 'done').length

  function startAdding() {
    setIsAdding(true)
    // Adding to a folded section would hide what you just typed, so open it.
    if (isCollapsed) onToggleCollapse(category.id)
  }

  return (
    // aria-label names the section for screen readers (and for tests).
    <section className="category" aria-label={category.name}>
      <div className="category-header">
        {/* The whole header is a button, so tapping anywhere folds it.
            aria-expanded tells assistive tech whether it's open. */}
        <button
          type="button"
          className="category-toggle"
          onClick={() => onToggleCollapse(category.id)}
          aria-expanded={!isCollapsed}
        >
          {/* The one place the category's colour is painted. style={{ }}:
              the outer braces mean "JavaScript", the inner ones an object. */}
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

      {/* Collapsed means: draw the header, and nothing below it. */}
      {!isCollapsed && (
        // <>...</> is a "fragment": a wrapper that groups things without
        // adding an extra tag to the page.
        <>
          {isAdding && (
            <AddTaskForm
              categoryName={category.name}
              onAdd={(title) => onAdd(category.id, title)}
              onCancel={() => setIsAdding(false)}
            />
          )}

          {tasks.length === 0 ? (
            <p className="empty">Nothing here yet.</p>
          ) : (
            <ul className="task-list">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default CategorySection
