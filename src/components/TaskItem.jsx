/*
  TaskItem.jsx — one row in the task list.

  It receives a single task from App (through "props") and shows it.
  In this first step it only displays; ticking and deleting come in step 2.
*/

// Props arrive as one object. { task } picks out the "task" part,
// so we can write task.title instead of props.task.title.
function TaskItem({ task }) {
  return (
    <li className="task">
      <span className="task-title">{task.title}</span>
    </li>
  )
}

export default TaskItem
