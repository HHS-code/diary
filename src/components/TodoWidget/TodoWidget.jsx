import { useEffect, useState } from 'react'
import { loadAllDiaryData, saveAllDiaryData, getDateTodos, setDateTodos } from '../../storage/diaryStorage'

function toggleTodoDone(todos, todoId) {
  return todos.map(todo => (todo.id === todoId ? { ...todo, done: !todo.done } : todo))
}

function removeTodo(todos, todoId) {
  return todos.filter(todo => todo.id !== todoId)
}

function renderTodoItem(todo, onToggleDone, onDelete) {
  const textStyle = {
    flex: 1,
    fontSize: '13px',
    color: todo.done ? '#888' : '#333',
    textDecoration: todo.done ? 'line-through' : 'none',
  }
  return (
    <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
      <input type="checkbox" checked={todo.done} onChange={() => onToggleDone(todo.id)} />
      <span style={textStyle}>{todo.text}</span>
      <button
        onClick={() => onDelete(todo.id)}
        style={{
          border: '1px solid #0a246a',
          background: '#ece9d8',
          borderRadius: '2px',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        삭제
      </button>
    </li>
  )
}

/**
 * 선택된 날짜의 할 일 목록을 보여주는 위젯. 추가/체크/삭제 시 storage/diaryStorage.js를 통해 즉시 저장한다.
 * @param {{ selectedDate: string }} props
 */
export function TodoWidget({ selectedDate }) {
  const [todos, setTodos] = useState([])
  const [newTodoText, setNewTodoText] = useState('')

  useEffect(() => {
    const data = loadAllDiaryData()
    setTodos(getDateTodos(data, selectedDate))
  }, [selectedDate])

  function saveTodos(updatedTodos) {
    setTodos(updatedTodos)
    const data = loadAllDiaryData()
    saveAllDiaryData(setDateTodos(data, selectedDate, updatedTodos))
  }

  function handleAddTodo() {
    const text = newTodoText.trim()
    if (text === '') {
      return
    }
    const newTodo = { id: crypto.randomUUID(), text, done: false }
    saveTodos([...todos, newTodo])
    setNewTodoText('')
  }

  function handleAddTodoOnEnter(event) {
    if (event.key === 'Enter') {
      handleAddTodo()
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        border: '2px solid #0a246a',
        borderRadius: '4px',
        background: '#ece9d8',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0a246a', marginBottom: '8px', flexShrink: 0 }}>할 일</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px 0', flex: 1, minHeight: 0, overflow: 'auto' }}>
        {todos.map(todo => renderTodoItem(todo, todoId => saveTodos(toggleTodoDone(todos, todoId)), todoId => saveTodos(removeTodo(todos, todoId))))}
      </ul>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        <input
          type="text"
          value={newTodoText}
          onChange={event => setNewTodoText(event.target.value)}
          onKeyDown={handleAddTodoOnEnter}
          style={{ flex: 1, fontSize: '13px', border: '1px solid #0a246a', borderRadius: '2px' }}
        />
        <button
          onClick={handleAddTodo}
          style={{
            border: '1px solid #0a246a',
            background: '#ece9d8',
            borderRadius: '2px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          추가
        </button>
      </div>
    </div>
  )
}
