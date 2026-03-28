import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import BookingAPI from "../services/bookingApi";

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadBookings = async () => {
      try {
        setIsLoading(true);
        const response = await BookingAPI.getMyBookings();
        if (isMounted) {
          setBookings(response.items || []);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load your bookings.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return bookings;
    }

    return bookings.filter((booking) =>
      [
        booking.event?.title,
        booking.event?.location,
        booking.ticket?.ticketCode,
        booking.payment?.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [bookings, searchTerm]);

  return (
    <AppLayout>
      <section className="panel-head">
        <div>
          <h2>My Bookings</h2>
          <p className="text-muted mb-0">
            Review your confirmed bookings and open your ticket details.
          </p>
        </div>
      </section>

      <section className="content-panel">
        {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by event, venue, status, or ticket code"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="form-control bg-light d-flex align-items-center">
            {filteredBookings.length} booking{filteredBookings.length === 1 ? "" : "s"}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted mb-0">Loading your bookings...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="text-muted mb-0">You do not have any bookings yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date & Time</th>
                  <th>Venue</th>
                  <th>Amount</th>
                  <th>Ticket Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td>{booking.event?.title || "Untitled event"}</td>
                    <td>{formatDateTime(booking.payment?.paidAt || booking.createdAt)}</td>
                    <td>{booking.event?.location || "Venue pending"}</td>
                    <td>{formatCurrency(booking.payment?.amount ?? booking.event?.amount)}</td>
                    <td>{booking.ticket?.ticketCode || "-"}</td>
                    <td>
                      <span className="status-pill">
                        {booking.payment?.status || booking.bookingStatus || "Paid"}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/bookings/${booking.bookingId}/ticket`}
                      >
                        View Ticket
                      </Link>
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

export default MyBookings;
