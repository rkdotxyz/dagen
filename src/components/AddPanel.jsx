/*
  AddPanel.jsx — one place to add anything, from any screen.

  The "+ Add" button in the header (or N on a keyboard) opens it. It's the
  same TaskForm the category sections use, with one extra field in front:
  which category, since you didn't start from a section. Picking an Area
  in the form still decides the category, as everywhere else.
*/

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { CATEGORIES, getCategory } from '../config.js'
import TaskForm from './TaskForm.jsx'

function AddPanel({ areas, tasks, defaultDay, onAdd, onClose }) {
  const [categoryId, setCategoryId] = useState('personal')
  const category = getCategory(categoryId)

  return (
    <Card className="panel-card gap-3 py-3" role="region" aria-label="Add">
      <CardHeader>
        <CardTitle>Add</CardTitle>
      </CardHeader>
      <CardContent className="task-form">
        <NativeSelect
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Category"
        >
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>

        <TaskForm
          categoryId={category.id}
          categoryName={category.name}
          areas={areas}
          tasks={tasks}
          defaultDay={defaultDay}
          onSubmit={(details) => onAdd(category.id, details)}
          onCancel={onClose}
        />
      </CardContent>
    </Card>
  )
}

export default AddPanel
