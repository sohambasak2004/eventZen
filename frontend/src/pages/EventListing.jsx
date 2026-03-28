import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useEvents } from "../context/EventContext";
import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/roles";

const getEffectiveEventStatus = (event) => {
  const rawStatus = String(event?.status || "Planned");
  const normalizedStatus = rawStatus.toLowerCase();

  if (normalizedStatus === "completed" || normalizedStatus === "cancelled") {
    return rawStatus;
  }

  const eventDate = new Date(event?.eventDate || event?.date || 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (!Number.isNaN(eventDate.getTime()) && eventDate < startOfToday) {
    return "Completed";
  }

  return rawStatus;
};

function EventListing() {
  const { events, isLoading } = useEvents();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [email, setEmail] = useState("");
  const isAdmin = hasRole(user, "admin");

  const filters = useMemo(() => {
    const eventTypeFilters = [...new Set(
      events
        .map((event) => event.eventType || event.category)
        .filter(Boolean),
    )].map((type) => ({
      id: String(type).toLowerCase(),
      label: type,
    }));

    return [
      { id: "all", label: "All Events" },
      { id: "upcoming", label: "Upcoming" },
      ...eventTypeFilters,
    ];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") {
      return events;
    }
    if (activeFilter === "upcoming") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return events.filter((event) => new Date(event.date) >= today);
    }
    return events.filter((event) =>
      (event.eventType || event.category || "")
        .toLowerCase()
        .includes(activeFilter.toLowerCase()),
    );
  }, [events, activeFilter]);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you for subscribing with ${email}!`);
    setEmail("");
  };

  const getCardStatusClassName = (status) =>
    `event-card-status ${String(status || "").toLowerCase() === "completed" ? "event-card-status-completed" : ""}`.trim();

  return (
    <AppLayout>
      {/* Hero Section */}
      <section className="event-listing-hero">
        <div className="event-listing-hero-content">
          <h1>Discover Premium Experiences</h1>
          <p className="hero-subtitle">
            Explore curated events, workshops, and networking sessions designed
            to inspire and connect. From music festivals to business
            conferences, find your next unforgettable experience.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="event-filter-section">
        <div className="event-filter-tabs">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`filter-tab ${
                activeFilter === filter.id ? "filter-tab-active" : ""
              }`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <Link className="btn btn-primary" to="/events/new">
            + Create Event
          </Link>
        )}
      </section>

      {/* Events Grid */}
      <section className="events-listing-section">
        {isLoading ? (
          <div className="text-center py-5">
            <div className="loader-orb"></div>
            <p className="text-muted">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <h3>No Events Found</h3>
            <p className="text-muted">
              {activeFilter === "all"
                ? "No events are available at the moment."
                : `No ${activeFilter} events found. Try another filter.`}
            </p>
            {isAdmin && (
              <Link className="btn btn-primary mt-3" to="/events/new">
                Create First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="event-cards-grid">
            {filteredEvents.map((event) => {
              const displayStatus = getEffectiveEventStatus(event);

              return (
                <article key={event.id} className="event-card">
                  <div className="event-card-image">
                    <img
                      src={
                        event.availableVenue?.meta?.imageUrl ||
                        event.image ||
                        `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=300&fit=crop&q=80`
                      }
                      alt={event.availableVenue?.meta?.imageAlt || event.title}
                    />
                    <div className="event-card-badges">
                      <span className="event-card-badge">{event.category}</span>
                      <span className={getCardStatusClassName(displayStatus)}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>
                  <div className="event-card-content">
                    <div className="event-card-date">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {event.startTime ? ` - ${event.startTime}` : ""}
                    </div>
                    <h3 className="event-card-title">{event.title}</h3>
                    <p className="event-card-description">
                      {event.description ||
                        "Join us for an unforgettable experience filled with inspiration, networking, and celebration."}
                    </p>
                    <p className="event-card-description">
                      {event.availableVenueName || event.location}
                      {event.availableVendorName
                        ? ` - Vendor: ${event.availableVendorName}`
                        : ""}
                    </p>
                    <div className="event-card-footer">
                      <div className="event-card-location">
                        <svg
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 0a5 5 0 0 0-5 5c0 3.192 4.5 10.5 5 11 .5-.5 5-7.808 5-11a5 5 0 0 0-5-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                      <Link
                        to={`/events/${event.id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="newsletter-content">
          <h2>Stay in the Loop</h2>
          <p>
            Subscribe to our newsletter and never miss out on upcoming events,
            exclusive offers, and industry insights.
          </p>
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="newsletter-input"
            />
            <button type="submit" className="btn btn-primary">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </AppLayout>
  );
}

export default EventListing;
