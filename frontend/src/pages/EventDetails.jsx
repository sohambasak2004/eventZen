import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../context/EventContext";
import BookingAPI from "../services/bookingApi";
import EventAPI from "../services/eventApi";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&h=500&fit=crop&q=80";

const TICKETED_EVENT_TYPES = new Set([
  "corporate",
  "conference",
  "workshop",
  "networking",
]);

const NON_BOOKABLE_EVENT_TYPES = new Set([
  "wedding",
  "birthday",
  "reception",
  "festival",
]);

const formatDate = (value) => {
  if (!value) {
    return "Date to be announced";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "On request";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const toAmenities = (event) => {
  const values = [
    event.availableVenue?.amenities,
    event.amenities,
    event.availableVenue?.meta?.amenities,
  ]
    .flat()
    .filter(Boolean)
    .flatMap((item) => (Array.isArray(item) ? item : [item]));

  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
};

function InfoCard({ title, children, className = "" }) {
  return (
    <section className={`event-details-card ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getEventById } = useEvents();
  const [event, setEvent] = useState(() => getEventById(id));
  const [isLoading, setIsLoading] = useState(!getEventById(id));
  const [error, setError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [currentBooking, setCurrentBooking] = useState(null);
  const [isBookingStatusLoading, setIsBookingStatusLoading] = useState(true);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  useEffect(() => {
    const cachedEvent = getEventById(id);
    if (cachedEvent) {
      setEvent(cachedEvent);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadEvent = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await EventAPI.events.getById(id);
        if (isMounted) {
          setEvent(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load event details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [id, getEventById]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentBooking = async () => {
      if (!user) {
        if (isMounted) {
          setCurrentBooking(null);
          setIsBookingStatusLoading(false);
        }
        return;
      }

      try {
        setIsBookingStatusLoading(true);
        const response = await BookingAPI.getMyBookings();
        const matchingBooking = (response?.items || [])
          .filter((booking) => booking?.event?.eventId === id)
          .sort(
            (left, right) =>
              new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime(),
          )[0] || null;

        if (isMounted) {
          setCurrentBooking(matchingBooking);
        }
      } catch {
        if (isMounted) {
          setCurrentBooking(null);
        }
      } finally {
        if (isMounted) {
          setIsBookingStatusLoading(false);
        }
      }
    };

    loadCurrentBooking();

    return () => {
      isMounted = false;
    };
  }, [id, user]);

  useEffect(() => {
    const handleBookingMessage = (messageEvent) => {
      if (messageEvent.origin !== window.location.origin) {
        return;
      }

      if (
        messageEvent.data?.type === "eventzen-booking-success" &&
        messageEvent.data?.eventId === id
      ) {
        setBookingMessage("Payment completed successfully. Your ticket is ready in the checkout window.");
        setCurrentBooking((previousBooking) => ({
          ...(previousBooking || {}),
          bookingId: messageEvent.data.bookingId || previousBooking?.bookingId,
          event: {
            eventId: id,
          },
          createdAt: new Date().toISOString(),
        }));
      }
    };

    window.addEventListener("message", handleBookingMessage);
    return () => window.removeEventListener("message", handleBookingMessage);
  }, [id]);

  const details = useMemo(() => {
    if (!event) {
      return null;
    }

    const bannerImage =
      event.availableVenue?.meta?.imageUrl || event.image || FALLBACK_IMAGE;
    const title = event.title || `${event.eventType || event.category || "Event"} Details`;
    const subtitle =
      event.description ||
      event.notes ||
      "Explore the full event information, venue details, and organizer contact information.";
    const type = event.eventType || event.category || "Event";
    const normalizedType = String(type).toLowerCase();
    const showsTicketPrice = TICKETED_EVENT_TYPES.has(normalizedType);
    const hidesBookNow = NON_BOOKABLE_EVENT_TYPES.has(normalizedType);
    const bookingsClosed = showsTicketPrice && String(event.status || "").toLowerCase() === "completed";
    const venueName =
      event.availableVenueName ||
      event.availableVenue?.venueName ||
      event.location ||
      "Venue to be announced";
    const location =
      event.location ||
      [
        event.availableVenue?.address?.street,
        event.availableVenue?.address?.city,
        event.availableVenue?.address?.state,
        event.availableVenue?.address?.zipCode,
      ]
        .filter(Boolean)
        .join(", ") ||
      "Location to be announced";
    const cityLine = [
      event.availableVenue?.address?.city,
      event.availableVenue?.address?.state,
      event.availableVenue?.address?.country,
    ]
      .filter(Boolean)
      .join(", ");
    const schedule = [formatDate(event.eventDate || event.date), event.startTime, event.endTime]
      .filter(Boolean)
      .join(" | ");
    const status = event.status || "Planned";
    const capacity = event.guestCount ?? event.capacity ?? "TBD";
    const budget = event.budget ?? 0;
    const ticketPrice = event.ticketPrice ?? 0;
    const organizerName = event.organizerContact?.name || "Organizer details pending";
    const organizerEmail = event.organizerContact?.email || "Not provided";
    const organizerPhone = event.organizerContact?.phone || "Not provided";
    const vendor = event.availableVendorName || "Assigned later";
    const amenities = toAmenities(event);

    return {
      bannerImage,
      title,
      subtitle,
      type,
      venueName,
      location,
      cityLine,
      schedule,
      status,
      capacity,
      budget,
      ticketPrice,
      showsTicketPrice,
      hidesBookNow,
      bookingsClosed,
      organizerName,
      organizerEmail,
      organizerPhone,
      vendor,
      amenities,
    };
  }, [event]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="content-panel">
          <div className="loader-orb"></div>
          <p className="text-muted mb-0">Loading event details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !details) {
    return (
      <AppLayout>
        <section className="content-panel">
          <h2>Event not found</h2>
          <p className="text-muted">
            {error || "We could not find the selected event details."}
          </p>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/event-listing")}
          >
            Back to Discover Events
          </button>
        </section>
      </AppLayout>
    );
  }

  const handleBookNow = () => {
    const popup = window.open(
      `${window.location.origin}/checkout/${id}`,
      "eventzen-booking-popup",
      "width=560,height=860,resizable=yes,scrollbars=yes",
    );

    if (!popup) {
      navigate(`/checkout/${id}`);
    }
  };

  const handleDownloadTicket = async () => {
    if (!currentBooking?.bookingId) {
      return;
    }

    try {
      setIsDownloadingTicket(true);
      await BookingAPI.downloadTicket(currentBooking.bookingId);
    } catch (downloadError) {
      setBookingMessage(downloadError.message || "Unable to download your ticket right now.");
    } finally {
      setIsDownloadingTicket(false);
    }
  };

  const isTicketAvailable = Boolean(currentBooking?.bookingId);
  const isPrimaryActionDisabled =
    isBookingStatusLoading || (isTicketAvailable && isDownloadingTicket);
  const primaryActionLabel = isBookingStatusLoading
    ? "Checking booking..."
    : isTicketAvailable
      ? (isDownloadingTicket ? "Downloading..." : "Download Ticket")
      : "Book Now";
  const handlePrimaryAction = isTicketAvailable ? handleDownloadTicket : handleBookNow;
  const shouldShowPrimaryAction =
    isTicketAvailable || (!details.hidesBookNow && !details.bookingsClosed);

  return (
    <AppLayout>
      <div className="event-details-page">
        {bookingMessage ? (
          <div className="alert alert-success event-booking-success">{bookingMessage}</div>
        ) : null}
        <section className="event-details-hero">
          <img src={details.bannerImage} alt={details.title} />

          <div className="event-details-hero-panel">
            <button
              type="button"
              className="event-details-back"
              onClick={() => navigate("/event-listing")}
            >
              Back to Events
            </button>

            <div className="event-details-hero-content">
              <div>
                <span className="event-details-eyebrow">Event Profile</span>
                <h1>{details.title}</h1>
                <p>{details.subtitle}</p>
              </div>

              <div className="event-details-stat-stack">
                <div className="event-details-stat">
                  <span>Budget</span>
                  <strong>{formatCurrency(details.budget)}</strong>
                </div>
                <div className="event-details-stat">
                  <span>Capacity</span>
                  <strong>{details.capacity} guests</strong>
                </div>
                {details.showsTicketPrice ? (
                  <div className="event-details-stat">
                    <span>Ticket Price</span>
                    <strong>{formatCurrency(details.ticketPrice)}</strong>
                  </div>
                ) : null}
                {shouldShowPrimaryAction ? (
                  <button
                    type="button"
                    className="btn btn-primary event-details-book-now"
                    onClick={handlePrimaryAction}
                    disabled={isPrimaryActionDisabled}
                  >
                    {primaryActionLabel}
                  </button>
                ) : null}
                {!isTicketAvailable && details.bookingsClosed ? (
                  <p className="event-details-closed-note">
                    Bookings are closed as the event has already concluded.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="event-details-tags">
              <span className="event-details-tag event-details-tag-primary">
                {details.type}
              </span>
              <span className="event-details-tag">{details.status}</span>
              <span className="event-details-tag">{details.schedule}</span>
            </div>
          </div>
        </section>

        <section className="event-details-grid">
          <div className="event-details-main">
            <InfoCard title="Event Information">
              <div className="event-details-info-grid">
                <div className="event-details-info-box">
                  <span>Venue</span>
                  <strong>{details.venueName}</strong>
                </div>
                <div className="event-details-info-box">
                  <span>Vendor</span>
                  <strong>{details.vendor}</strong>
                </div>
                <div className="event-details-info-box">
                  <span>Schedule</span>
                  <strong>{details.schedule}</strong>
                </div>
                <div className="event-details-info-box">
                  <span>Status</span>
                  <strong>{details.status}</strong>
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Location">
              <div className="event-details-location">
                <p>{details.location}</p>
                {details.cityLine ? <p>{details.cityLine}</p> : null}
              </div>
            </InfoCard>

            <InfoCard title="Description">
              <p className="event-details-description">{details.subtitle}</p>
            </InfoCard>

            <InfoCard title="Amenities">
              {details.amenities.length > 0 ? (
                <div className="event-details-tags">
                  {details.amenities.map((amenity) => (
                    <span key={amenity} className="event-details-tag">
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">
                  Amenities will be shared closer to the event date.
                </p>
              )}
            </InfoCard>
          </div>

          <div className="event-details-side">
            <InfoCard title="Contact Details">
              <div className="event-details-contact-list">
                <div>
                  <span>Phone</span>
                  <strong>{details.organizerPhone}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{details.organizerEmail}</strong>
                </div>
                <div>
                  <span>Organizer Name</span>
                  <strong>{details.organizerName}</strong>
                </div>
                <div>
                  <span>Venue</span>
                  <strong>{details.venueName}</strong>
                </div>
              </div>
            </InfoCard>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default EventDetails;
