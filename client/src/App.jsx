import { useEffect, useMemo, useState } from 'react'
import api from './api/client'
import { socket } from './api/socket'
import { useAuth } from './context/useAuth'

const emptyEvent = {
  title: '',
  description: '',
  location: '',
  category: '',
  eventDate: '',
  capacity: 50,
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const { user, loading, login, signup, logout } = useAuth()
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [events, setEvents] = useState([])
  const [rsvps, setRsvps] = useState([])
  const [eventForm, setEventForm] = useState(emptyEvent)
  const [editingEvent, setEditingEvent] = useState(null)
  const [rsvpNotes, setRsvpNotes] = useState({})
  const [message, setMessage] = useState('')
  const [realtimeLog, setRealtimeLog] = useState([])

  const myRsvps = useMemo(() => {
    return rsvps.reduce((map, rsvp) => {
      if (rsvp.user?._id === user?.id || rsvp.user?.id === user?.id) {
        map[rsvp.event?._id || rsvp.event] = rsvp
      }

      return map
    }, {})
  }, [rsvps, user])

  useEffect(() => {
    let active = true

    Promise.all([api.get('/events'), api.get('/rsvps')])
      .then(([eventsResponse, rsvpsResponse]) => {
        if (!active) {
          return
        }

        setEvents(eventsResponse.data)
        setRsvps(rsvpsResponse.data)
      })
      .catch(() => {
        if (active) {
          setMessage('Could not load events. Is the backend running?')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    socket.connect()

    function logRealtime(label) {
      setRealtimeLog((items) => [label, ...items].slice(0, 6))
    }

    function upsertEvent(event) {
      setEvents((items) => {
        const exists = items.some((item) => item._id === event._id)
        const next = exists
          ? items.map((item) => (item._id === event._id ? event : item))
          : [event, ...items]

        return next.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      })
    }

    socket.on('event:created', (event) => {
      upsertEvent(event)
      logRealtime(`New event: ${event.title}`)
    })
    socket.on('event:updated', (event) => {
      upsertEvent(event)
      logRealtime(`Event updated: ${event.title}`)
    })
    socket.on('event:deleted', ({ id }) => {
      setEvents((items) => items.filter((event) => event._id !== id))
      setRsvps((items) => items.filter((rsvp) => (rsvp.event?._id || rsvp.event) !== id))
      logRealtime('An event was deleted')
    })
    socket.on('rsvp:created', (rsvp) => {
      setRsvps((items) => [rsvp, ...items.filter((item) => item._id !== rsvp._id)])
      logRealtime(`${rsvp.user?.name || 'Someone'} RSVP'd`)
    })
    socket.on('rsvp:updated', (rsvp) => {
      setRsvps((items) => items.map((item) => (item._id === rsvp._id ? rsvp : item)))
      logRealtime(`${rsvp.user?.name || 'Someone'} changed an RSVP`)
    })
    socket.on('rsvp:deleted', ({ id }) => {
      setRsvps((items) => items.filter((rsvp) => rsvp._id !== id))
      logRealtime('An RSVP was removed')
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setMessage('')

    try {
      if (authMode === 'login') {
        await login(authForm.email, authForm.password)
      } else {
        await signup(authForm.name, authForm.email, authForm.password)
      }
      setAuthForm({ name: '', email: '', password: '' })
      setMessage('Authentication successful')
    } catch (error) {
      setMessage(error.response?.data?.message || 'Authentication failed')
    }
  }

  async function handleEventSubmit(event) {
    event.preventDefault()
    setMessage('')

    try {
      const payload = {
        ...eventForm,
        capacity: Number(eventForm.capacity),
      }

      if (editingEvent) {
        await api.put(`/events/${editingEvent}`, payload)
        setEditingEvent(null)
        setMessage('Event updated')
      } else {
        await api.post('/events', payload)
        setMessage('Event created')
      }

      setEventForm(emptyEvent)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Event save failed')
    }
  }

  function startEdit(event) {
    setEditingEvent(event._id)
    setEventForm({
      title: event.title,
      description: event.description,
      location: event.location,
      category: event.category,
      eventDate: event.eventDate.slice(0, 16),
      capacity: event.capacity,
    })
  }

  async function deleteEvent(id) {
    await api.delete(`/events/${id}`)
  }

  async function createOrUpdateRsvp(eventId, status) {
    const existing = myRsvps[eventId]
    const note = rsvpNotes[eventId] || ''

    if (existing) {
      await api.put(`/rsvps/${existing._id}`, { status, note })
    } else {
      await api.post('/rsvps', { event: eventId, status, note })
    }
  }

  async function deleteRsvp(rsvpId) {
    await api.delete(`/rsvps/${rsvpId}`)
  }

  if (loading) {
    return <main className="shell">Loading...</main>
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Full-stack campus events</p>
          <h1>EventHub</h1>
          <p>
            Create campus events, RSVP in real time, and watch updates appear instantly through
            WebSocket events.
          </p>
        </div>
        <div className="user-card">
          {user ? (
            <>
              <p>Signed in as</p>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
              <button type="button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <AuthForm
              authForm={authForm}
              authMode={authMode}
              onChange={setAuthForm}
              onModeChange={setAuthMode}
              onSubmit={handleAuthSubmit}
            />
          )}
        </div>
      </header>

      {message && <p className="message">{message}</p>}

      <section className="grid">
        <div className="panel">
          <div className="section-title">
            <h2>{editingEvent ? 'Edit event' : 'Create event'}</h2>
            {editingEvent && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditingEvent(null)
                  setEventForm(emptyEvent)
                }}
              >
                Cancel
              </button>
            )}
          </div>
          {user ? (
            <EventForm
              eventForm={eventForm}
              onChange={setEventForm}
              onSubmit={handleEventSubmit}
            />
          ) : (
            <p>Please log in to create and manage events.</p>
          )}
        </div>

        <div className="panel">
          <h2>Live WebSocket feed</h2>
          {realtimeLog.length === 0 ? (
            <p>No real-time events yet. Open this app in two tabs to test live updates.</p>
          ) : (
            <ul className="log">
              {realtimeLog.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="events">
        <div className="section-title">
          <h2>Upcoming events</h2>
          <span>{events.length} events</span>
        </div>

        <div className="cards">
          {events.map((event) => {
            const owner = event.creator?._id === user?.id || event.creator?.id === user?.id
            const myRsvp = myRsvps[event._id]

            return (
              <article className="card" key={event._id}>
                <div className="card-header">
                  <span>{event.category}</span>
                  <strong>{formatDate(event.eventDate)}</strong>
                </div>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <p className="meta">
                  {event.location} | Capacity {event.capacity} | By {event.creator?.name}
                </p>

                {user && (
                  <div className="rsvp-box">
                    <input
                      value={rsvpNotes[event._id] || myRsvp?.note || ''}
                      onChange={(changeEvent) =>
                        setRsvpNotes((notes) => ({
                          ...notes,
                          [event._id]: changeEvent.target.value,
                        }))
                      }
                      placeholder="Optional RSVP note"
                    />
                    <div className="actions">
                      <button type="button" onClick={() => createOrUpdateRsvp(event._id, 'going')}>
                        Going
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => createOrUpdateRsvp(event._id, 'interested')}
                      >
                        Interested
                      </button>
                      {myRsvp && (
                        <button type="button" className="danger" onClick={() => deleteRsvp(myRsvp._id)}>
                          Remove RSVP
                        </button>
                      )}
                    </div>
                    {myRsvp && <small>Your RSVP: {myRsvp.status}</small>}
                  </div>
                )}

                {owner && (
                  <div className="actions">
                    <button type="button" className="secondary" onClick={() => startEdit(event)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => deleteEvent(event._id)}>
                      Delete
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function AuthForm({ authForm, authMode, onChange, onModeChange, onSubmit }) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <h2>{authMode === 'login' ? 'Log in' : 'Sign up'}</h2>
      {authMode === 'signup' && (
        <input
          value={authForm.name}
          onChange={(event) => onChange({ ...authForm, name: event.target.value })}
          placeholder="Name"
          required
        />
      )}
      <input
        type="email"
        value={authForm.email}
        onChange={(event) => onChange({ ...authForm, email: event.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={authForm.password}
        onChange={(event) => onChange({ ...authForm, password: event.target.value })}
        placeholder="Password"
        minLength="6"
        required
      />
      <button type="submit">{authMode === 'login' ? 'Log in' : 'Create account'}</button>
      <button
        type="button"
        className="ghost"
        onClick={() => onModeChange(authMode === 'login' ? 'signup' : 'login')}
      >
        {authMode === 'login' ? 'Need an account?' : 'Already have an account?'}
      </button>
    </form>
  )
}

function EventForm({ eventForm, onChange, onSubmit }) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <input
        value={eventForm.title}
        onChange={(event) => onChange({ ...eventForm, title: event.target.value })}
        placeholder="Event title"
        required
      />
      <textarea
        value={eventForm.description}
        onChange={(event) => onChange({ ...eventForm, description: event.target.value })}
        placeholder="Description"
        rows="4"
        required
      />
      <input
        value={eventForm.location}
        onChange={(event) => onChange({ ...eventForm, location: event.target.value })}
        placeholder="Location"
        required
      />
      <input
        value={eventForm.category}
        onChange={(event) => onChange({ ...eventForm, category: event.target.value })}
        placeholder="Category"
        required
      />
      <input
        type="datetime-local"
        value={eventForm.eventDate}
        onChange={(event) => onChange({ ...eventForm, eventDate: event.target.value })}
        required
      />
      <input
        type="number"
        min="1"
        value={eventForm.capacity}
        onChange={(event) => onChange({ ...eventForm, capacity: event.target.value })}
        placeholder="Capacity"
        required
      />
      <button type="submit">Save event</button>
    </form>
  )
}

export default App
