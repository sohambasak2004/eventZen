import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useEvents } from "../context/EventContext";
import BookingAPI from "../services/bookingApi";
import EventAPI from "../services/eventApi";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function Dashboard() {
  const { events, isLoading } = useEvents();
  const [adminStats, setAdminStats] = useState(null);
  const [statsError, setStatsError] = useState("");
  const [liveBookingCount, setLiveBookingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadAdminStats = async () => {
      try {
        const stats = await EventAPI.events.getStats();
        if (isMounted) {
          setAdminStats(stats);
          setStatsError("");
        }
      } catch (error) {
        if (isMounted) {
          setStatsError(error.message || "Unable to load admin statistics.");
        }
      }
    };

    loadAdminStats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncLiveBookingCount = async () => {
      const cachedCount = BookingAPI.getCachedPaidBookings().length;

      if (isMounted) {
        setLiveBookingCount(cachedCount);
      }

      try {
        const data = await BookingAPI.getRecentPaidBookings(500);
        if (isMounted) {
          setLiveBookingCount(data.items?.length || 0);
        }
      } catch {
        // Keep the cached count when the live booking feed is unavailable.
      }
    };

    syncLiveBookingCount();

    const handleBookingsUpdated = () => {
      syncLiveBookingCount();
    };

    const handleWindowFocus = () => {
      syncLiveBookingCount();
    };

    const handleStorage = (event) => {
      if (event.key === "eventzen_paid_bookings") {
        syncLiveBookingCount();
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

  const totalEvents = events.length;
  const totalAttendees = events.reduce(
    (sum, event) => sum + Number(event.attendees || 0),
    0,
  );
  const resolvedTotalAttendees = Math.max(
    adminStats?.totalAttendees ?? 0,
    totalAttendees,
    liveBookingCount,
  );
  const totalBudget = events.reduce(
    (sum, event) => sum + Number(event.budget || 0),
    0,
  );
  const upcomingEvents = [...events]
    .filter(
      (event) =>
        new Date(event.date).getTime() >= new Date().setHours(0, 0, 0, 0),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
  const eventsTodayCount = events.filter((event) => {
    const eventDate = new Date(event.date);
    const today = new Date();

    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate() &&
      ["planned", "open"].includes(String(event.status || "").toLowerCase())
    );
  }).length;
  const statCards = [
    {
      label: "Total Events",
      value: adminStats?.totalEvents ?? totalEvents,
    },
    {
      label: "Upcoming Events",
      value: adminStats?.upcomingEvents ?? upcomingEvents.length,
    },
    {
      label: "Events Today",
      value: adminStats?.eventsToday ?? eventsTodayCount,
    },
    {
      label: "Total Attendees",
      value: resolvedTotalAttendees,
    },
    {
      label: "Total Capacity",
      value: adminStats?.totalCapacity ?? events.reduce(
        (sum, event) => sum + Number(event.capacity || 0),
        0,
      ),
    },
  ];

  const getStatusClassName = (status) =>
    `status-pill ${String(status || "").toLowerCase() === "completed" ? "status-pill-completed" : ""}`.trim();

  return (
    <AppLayout>
      <section className="panel-head">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="text-muted mb-0">
            Track platform-wide event activity and operational health.
          </p>
        </div>
        <Link className="btn btn-primary" to="/events/new">
          + New Event
        </Link>
      </section>

      <section className="stats-grid">
        {statCards.map((card) => (
          <article className="stat-card" key={card.label}>
            <p>{card.label}</p>
            <h3>{card.value}</h3>
          </article>
        ))}
        <article className="stat-card">
          <p>Total Budget</p>
          <h3>{currency.format(totalBudget)}</h3>
        </article>
      </section>

      {statsError ? (
        <section className="content-panel">
          <p className="text-muted mb-0">
            Live admin stats are unavailable right now, so this page is showing
            data from the loaded event list instead.
          </p>
        </section>
      ) : null}

      <section className="content-panel">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Upcoming Events</h4>
          <Link to="/events">View all</Link>
        </div>

        {isLoading ? (
          <p className="text-muted">Loading events...</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-muted">
            No upcoming events. Create one to get started.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{event.title}</td>
                    <td>{new Date(event.date).toLocaleDateString()}</td>
                    <td>{event.location}</td>
                    <td>
                      <span className={getStatusClassName(event.status)}>{event.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="content-panel mt-3">
        <h4 className="mb-3">Admin Controls</h4>
        <div className="module-grid">
          <Link className="module-tile" to="/events">
            <h5>Event Management</h5>
            <p>Review, update, and monitor the event lifecycle.</p>
          </Link>
          <Link className="module-tile" to="/venues">
            <h5>Venue Management</h5>
            <p>Manage venue inventory, approvals, and availability.</p>
          </Link>
          <Link className="module-tile" to="/vendors">
            <h5>Vendor Management</h5>
            <p>Oversee vendor records and marketplace readiness.</p>
          </Link>
          <Link className="module-tile" to="/attendees">
            <h5>Attendee Management</h5>
            <p>Handle attendee registration and check-in status.</p>
          </Link>
          <Link className="module-tile" to="/admin/budgets">
            <h5>Budget Management</h5>
            <p>View the budget defined for each event and track totals.</p>
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}

export default Dashboard;
