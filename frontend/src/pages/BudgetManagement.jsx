import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useEvents } from "../context/EventContext";
import BookingAPI from "../services/bookingApi";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const NON_TICKETED_EVENT_TYPES = new Set([
  "wedding",
  "birthday",
  "reception",
  "festival",
]);

const formatCurrency = (value) => currency.format(Number(value) || 0);

function BudgetManagement() {
  const { events, isLoading } = useEvents();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paidBookings, setPaidBookings] = useState(() =>
    BookingAPI.getCachedPaidBookings(),
  );

  useEffect(() => {
    let isMounted = true;

    const loadPaidBookings = async () => {
      try {
        const data = await BookingAPI.getRecentPaidBookings(500);
        if (isMounted) {
          setPaidBookings(data.items || []);
        }
      } catch {
        if (isMounted) {
          setPaidBookings(BookingAPI.getCachedPaidBookings());
        }
      }
    };

    loadPaidBookings();

    const handleBookingsUpdated = () => {
      setPaidBookings(BookingAPI.getCachedPaidBookings());
      loadPaidBookings();
    };

    const handleWindowFocus = () => {
      loadPaidBookings();
    };

    const handleStorage = (event) => {
      if (event.key === "eventzen_paid_bookings") {
        setPaidBookings(BookingAPI.getCachedPaidBookings());
      }
    };

    window.addEventListener("eventzen-bookings-updated", handleBookingsUpdated);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("eventzen-bookings-updated", handleBookingsUpdated);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const statuses = useMemo(
    () => ["All", ...new Set(events.map((event) => event.status || "Planned"))],
    [events],
  );

  const ticketsSoldByEventId = useMemo(() => {
    return paidBookings.reduce((totals, booking) => {
      const eventId = booking?.event?.eventId;
      if (!eventId) {
        return totals;
      }

      const amount = Number(
        booking?.payment?.amount ?? booking?.event?.amount ?? 0,
      );

      totals[eventId] = (totals[eventId] || 0) + amount;
      return totals;
    }, {});
  }, [paidBookings]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          event.title,
          event.eventType,
          event.category,
          event.location,
          event.availableVenueName,
          event.organizerContact?.name,
          event.organizerContact?.email,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );

      const matchesStatus =
        statusFilter === "All" || (event.status || "Planned") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  const getStatusClassName = (status) =>
    `status-pill ${String(status || "").toLowerCase() === "completed" ? "status-pill-completed" : ""}`.trim();

  return (
    <AppLayout>
      <section className="panel-head">
        <div>
          <h2>Budget Management</h2>
        </div>
        <Link className="btn btn-outline-secondary" to="/dashboard">
          Back to Dashboard
        </Link>
      </section>

      <section className="content-panel">
        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by title, organizer, venue, or location"
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
          <p className="text-muted mb-0">Loading budget data...</p>
        ) : filteredEvents.length === 0 ? (
          <div className="budget-empty-state">
            <h4>No budgets found</h4>
            <p className="text-muted mb-0">
              No events match the current filters, or no budgets have been
              created yet.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Organizer</th>
                  <th>Venue</th>
                  <th>Budget</th>
                  <th>Ticket Price</th>
                  <th>Tickets Sold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents
                  .slice()
                  .sort(
                    (left, right) =>
                      new Date(left.eventDate || left.date || 0).getTime() -
                      new Date(right.eventDate || right.date || 0).getTime(),
                  )
                  .map((event) => {
                    const normalizedType = String(
                      event.eventType || event.category || "",
                    ).toLowerCase();
                    const isTicketedEvent =
                      !NON_TICKETED_EVENT_TYPES.has(normalizedType);

                    return (
                      <tr key={event.id}>
                        <td>
                          <strong>
                            {event.title || `${event.eventType || "Event"} Event`}
                          </strong>
                          <div className="small text-muted">
                            {event.eventType || event.category || "General"}
                          </div>
                        </td>
                        <td>
                          {new Date(
                            event.eventDate || event.date,
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          <div>
                            {event.organizerContact?.name || "Not provided"}
                          </div>
                          <div className="small text-muted">
                            {event.organizerContact?.email ||
                              event.organizerEmail ||
                              "No email"}
                          </div>
                        </td>
                        <td>
                          {event.availableVenueName ||
                            event.location ||
                            "Not assigned"}
                        </td>
                        <td>
                          <span className="budget-amount">
                            {formatCurrency(event.budget)}
                          </span>
                        </td>
                        <td>
                          {isTicketedEvent
                            ? formatCurrency(event.ticketPrice)
                            : "NA"}
                        </td>
                        <td>
                          {isTicketedEvent
                            ? formatCurrency(
                                ticketsSoldByEventId[event.eventId || event.id] || 0,
                              )
                            : "NA"}
                        </td>
                        <td>
                          <span className={getStatusClassName(event.status)}>
                            {event.status || "Planned"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

export default BudgetManagement;
