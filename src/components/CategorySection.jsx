/*
  CategorySection.jsx — one category: its header, its tasks in time order,
  and its own add panel.

  Since Phase 11 it also passes the Areas down: the form offers them,
  and each row shows the name of the Area its task belongs to.

  It owns two small things: whether the add panel is open, and which task
  is being edited. Everything that outlives a redraw is owned by App.
*/

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import TaskForm from './TaskForm.jsx'
import TaskItem from './TaskItem.jsx'
import { findArea } from '../lib/areas.js'

function CategorySection({
  category,
  areas = [],
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
          {/* The category's Google colour, as a solid dot. */}
          <span className="dot" style={{ backgroundColor: category.hex }} />
          <span className="category-name">{category.name}</span>
          <Badge variant="secondary">{remaining}</Badge>
        </button>

        <Button
          variant="outline"
          size="icon"
          onClick={startAdding}
          aria-label={`Add to ${category.name}`}
        >
          <PlusIcon />
        </Button>
      </div>

      {!isCollapsed && (
        <>
          {isAdding && (
            <TaskForm
              categoryId={category.id}
              categoryName={category.name}
              areas={areas}
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
                      categoryId={category.id}
                      categoryName={category.name}
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
