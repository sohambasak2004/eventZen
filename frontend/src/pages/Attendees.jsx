import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import BookingAPI from "../services/bookingApi";

const formatPaidAt = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatProvider = (provider) =>
  String(provider || "razorpay")
    .replace(/^dummy_/i, "")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase();

function Attendees() {
  const cachedBookings = useMemo(
    () => BookingAPI.getCachedPaidBookings().slice(0, 12),
    [],
  );
  const [bookings, setBookings] = useState(cachedBookings);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(cachedBookings.length === 0);

  useEffect(() => {
    let isMounted = true;

    const loadRecentBookings = async ({ preserveVisibleList = false } = {}) => {
      try {
        if (isMounted && !preserveVisibleList) {
          setIsLoading(true);
        }
        const data = await BookingAPI.getRecentPaidBookings(12);
        if (isMounted) {
          setBookings(data.items || []);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load recent paid bookings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRecentBookings({ preserveVisibleList: cachedBookings.length > 0 });

    const handleBookingsUpdated = () => {
      loadRecentBookings({ preserveVisibleList: true });
    };

    const handleWindowFocus = () => {
      loadRecentBookings({ preserveVisibleList: true });
    };

    const handleStorage = (event) => {
      if (event.key === "eventzen_paid_bookings") {
        loadRecentBookings({ preserveVisibleList: true });
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
  }, [cachedBookings.length]);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      if (!term) {
        return true;
      }

      return [
        booking.user?.name,
        booking.user?.email,
        booking.event?.title,
        booking.event?.location,
        booking.ticket?.ticketCode,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [bookings, searchTerm]);

  return (
    <AppLayout>
      <section className="panel-head">
        <div>
          <h2>Attendee Management</h2>
        </div>
        <Link className="btn btn-outline-secondary" to="/dashboard">
          Back to Dashboard
        </Link>
      </section>

      <section className="content-panel">
        {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by attendee, email, event, venue, or ticket code"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="form-control bg-light d-flex align-items-center">
            {filteredBookings.length} paid booking
            {filteredBookings.length === 1 ? "" : "s"}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted mb-0">Loading attendees...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="text-muted mb-0">No paid bookings match your search.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Event</th>
                  <th>Venue</th>
                  <th>Payment</th>
                  <th>Ticket Code</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td>{booking.user.name}</td>
                    <td>{booking.user.email}</td>
                    <td>{booking.event.title}</td>
                    <td>{booking.event.location}</td>
                    <td>
                      <span className="status-pill">
                        {formatProvider(booking.payment.provider)} |{" "}
                        {formatPaidAt(booking.payment.paidAt)}
                      </span>
                    </td>
                    <td>{booking.ticket.ticketCode}</td>
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

export default Attendees;
