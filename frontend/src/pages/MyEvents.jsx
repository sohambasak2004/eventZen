import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../context/EventContext";
import EventAPI from "../services/eventApi";

function MyEvents() {
  const { user } = useAuth();
  const { deleteEvent } = useEvents();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingEventId, setDeletingEventId] = useState(null);

  const loadEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      return;
    }

    const organizerEvents = await EventAPI.events.getByOrganizer(user.id);
    setEvents(organizerEvents);
    setError("");
  }, [user?.id]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        await loadEvents();
      } catch (err) {
        setError(err.message || "Unable to load your events.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const localDate = event.date
        ? new Date(event.date).toLocaleDateString().toLowerCase()
        : "";
      const isoDate = event.date
        ? new Date(event.date).toISOString().slice(0, 10)
        : "";
      const matchesSearch =
        event.title.toLowerCase().includes(normalizedSearch) ||
        event.location.toLowerCase().includes(normalizedSearch) ||
        localDate.includes(normalizedSearch) ||
        isoDate.includes(normalizedSearch);

      return matchesSearch;
    });
  }, [events, searchTerm]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this event permanently?");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingEventId(id);
      await deleteEvent(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete event.");
    } finally {
      setDeletingEventId(null);
    }
  };

  const getStatusClassName = (status) =>
    `status-pill ${String(status || "").toLowerCase() === "completed" ? "status-pill-completed" : ""}`.trim();

  return (
    <AppLayout>
      <section className="panel-head">
        <h2>My Events</h2>
        <Link className="btn btn-primary" to="/events/new">
          + Create My Event
        </Link>
      </section>

      <section className="content-panel">
        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by title, location, or date"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-muted mb-0">Loading your events...</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-muted mb-0">
            You have not created any events yet.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <div className="small text-muted">{event.category}</div>
                    </td>
                    <td>{new Date(event.date).toLocaleDateString()}</td>
                    <td>{event.location}</td>
                    <td>
                      {event.attendees}/{event.capacity}
                    </td>
                    <td>
                      <span className={getStatusClassName(event.status)}>{event.status}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Link
                          className="btn btn-sm btn-outline-primary"
                          to={`/events/${event.id}/edit`}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(event.id)}
                          disabled={deletingEventId === event.id}
                        >
                          {deletingEventId === event.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

export default MyEvents;
