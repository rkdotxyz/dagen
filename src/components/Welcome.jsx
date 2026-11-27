/*
  Welcome.jsx — what a brand-new planner says first.

  With nothing in it yet (no Areas, tasks, rules or tracked time), the
  Day screen starts with this card instead of eight empty sections and
  no idea where to begin. It goes away by itself as soon as there's
  something in the planner.
*/

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Welcome({ onAddAreas, onAddTask }) {
  return (
    <Card className="welcome gap-3 py-4" role="region" aria-label="Welcome">
      <CardHeader>
        <CardTitle>Start by adding your Areas</CardTitle>
      </CardHeader>
      <CardContent className="task-form">
        <p className="welcome-text">
          An Area is one thing you&apos;re involved in: a course, a project, the job
          search. Add the few that matter this quarter, give them some hours a month,
          then plan your week around them.
        </p>
        <div className="form-row">
          <Button onClick={onAddAreas}>Add your Areas</Button>
          <Button variant="outline" onClick={onAddTask}>
            Or add a task
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default Welcome
