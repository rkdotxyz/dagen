/*
  DataSection.jsx — your planner as text: copy it out, or paste one in.

  Copy as JSON puts the whole planner on the clipboard. If the browser
  won't allow that (some don't, outside a secure page), the text is shown
  in a box to copy by hand instead.

  Import JSON reads pasted text and, only if it's a real Dagen export,
  replaces everything with it. App offers Undo for a few seconds after.
  The checking is in backup.js; this only draws and reports.
*/

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseImport } from '../lib/backup.js'

function DataSection({ getExport, onImport }) {
  const [message, setMessage] = useState(null)
  // Shown when the clipboard can't be used: the text to copy by hand.
  const [manual, setManual] = useState(null)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState(null)

  async function copy() {
    const text = getExport()
    try {
      // navigator.clipboard only exists on secure pages (https, localhost).
      await navigator.clipboard.writeText(text)
      setManual(null)
      setMessage('Copied. Paste it somewhere safe.')
    } catch {
      setManual(text)
      setMessage('Your browser won’t let Dagen copy. Select the text below and copy it.')
    }
  }

  function importIt() {
    const result = parseImport(pasted)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    setPasted('')
    onImport(result.planner)
  }

  return (
    <section aria-label="Data">
      <h3 className="panel-subhead">Data</h3>

      <div className="form-row">
        <Button variant="outline" onClick={copy}>
          Copy as JSON
        </Button>
      </div>
      {message && (
        <p className="form-summary" role="status">
          {message}
        </p>
      )}
      {manual && (
        <Textarea
          className="data-text"
          value={manual}
          readOnly
          aria-label="Your planner as JSON"
          onFocus={(event) => event.target.select()}
        />
      )}

      <div className="task-form data-import">
        <Textarea
          className="data-text"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          placeholder="Paste an export here to replace everything with it"
          aria-label="Paste an export"
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-row">
          <Button variant="outline" onClick={importIt}>
            Import JSON
          </Button>
        </div>
      </div>
    </section>
  )
}

export default DataSection
