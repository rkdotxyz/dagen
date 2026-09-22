/*
  App.jsx — the main component of Dagen.

  Right now it only shows the app's name and today's date.
  In Phase 1 this file becomes the home of your task list.
*/

// A component is just a function that returns what should appear on screen.
// Its name starts with a capital letter so React knows it's a component.
function App() {
  // new Date() is "this exact moment".
  // toLocaleDateString(...) turns that moment into readable text.
  // 'en-GB' means British English order: "Friday 18 September".
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', // full day name, e.g. "Friday"
    day: 'numeric', // day of the month as a number, e.g. "18"
    month: 'long', // full month name, e.g. "September"
  })

  // Everything inside return ( ... ) is JSX: HTML-like tags inside JavaScript.
  // It must have ONE outer tag, which is why everything sits inside <main>.
  return (
    // "className" instead of "class": class is a reserved word in JavaScript.
    // The names here match the styles in index.css.
    <main className="app">
      <h1>Dagen</h1>
      {/* Curly braces switch back to JavaScript and insert a value. */}
      <p className="today">{today}</p>
    </main>
  )
}

// Make App available to other files. main.jsx imports it and draws it.
export default App
