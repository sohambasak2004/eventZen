import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useEvents } from "../context/EventContext";

function Events() {
  const { events, isLoading, deleteEvent } = useEvents();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deletingEventId, setDeletingEventId] = useState(null);

  const statuses = useMemo(
    () => ["All", ...new Set(events.map((event) => event.status || "Planned"))],
    [events],
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this event permanently?");
    if (!confirmed) {
      return;
    }

    setDeletingEventId(id);
    try {
      await deleteEvent(id);
      // The EventContext already updates the state after successful deletion
      // Optional: Show success message if you have a toast/notification system
      // toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert(error.message || "Failed to delete event. Please try again.");
    } finally {
      setDeletingEventId(null);
    }
  };

  const getStatusClassName = (status) =>
    `status-pill ${String(status || "").toLowerCase() === "completed" ? "status-pill-completed" : ""}`.trim();

  return (
    <AppLayout>
      <section className="panel-head">
        <h2>Events</h2>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
          <Link className="btn btn-primary" to="/events/new">
            + Add Event
          </Link>
        </div>
      </section>

      <section className="content-panel">
        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by title or location"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <select
            className="form-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="text-muted">Loading events...</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-muted mb-0">
            No events match the current filters.
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

export default Events;
