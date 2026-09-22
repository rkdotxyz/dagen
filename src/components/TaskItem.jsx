/*
  TaskItem.jsx — one row in the task list.

  Shows a task with a checkbox and a delete button. It never changes
  the task itself: it tells App what happened (onToggle, onDelete)
  and App updates the list. One place owns the data.
*/

function TaskItem({ task, onToggle, onDelete }) {
  const isDone = task.status === 'done'

  return (
    // Two class names when done ("task done"), one otherwise.
    // The CSS for .task.done draws the line through the title.
    <li className={isDone ? 'task done' : 'task'}>
      {/* Wrapping the checkbox and title in <label> makes the
          whole title tappable, not just the tiny box. */}
      <label className="task-main">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => onToggle(task.id)}
        />
        <span className="task-title">{task.title}</span>
      </label>

      {/* type="button" so it never acts like a form submit.
          aria-label gives screen readers a proper name for "×". */}
      <button
        type="button"
        className="delete"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete ${task.title}`}
      >
        ×
      </button>
    </li>
  )
}

export default TaskItem
