import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/venueVendorApi";
import AppLayout from "../components/layout/AppLayout";
import { hasRole } from "../utils/roles";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&h=500&fit=crop&q=80";

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

function InfoCard({ title, children, className = "" }) {
  return (
    <section className={`event-details-card ${className}`.trim()}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const VenueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [bookingData, setBookingData] = useState({
    eventId: "",
    eventName: "",
    startDate: "",
    endDate: "",
    purpose: "",
    expectedAttendees: "",
    paymentMethod: "credit_card",
  });

  const isOrganizer = hasRole(user, "organizer");
  const isAdmin = hasRole(user, "admin");
  const canBook = isOrganizer || isAdmin;

  const fetchVenueDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await API.venues.get(id);
      setVenue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVenueDetails();
  }, [fetchVenueDetails]);

  const details = useMemo(() => {
    if (!venue) {
      return null;
    }

    const bannerImage =
      venue.primaryImage?.url || venue.images?.[0]?.url || FALLBACK_IMAGE;
    const title = venue.venueName || "Venue Details";
    const subtitle =
      venue.description ||
      "Explore the full venue profile, amenities, location, and booking details.";
    const type = venue.amenities?.[0] || "Venue";
    const status = venue.availability?.isActive ? "Available" : "Unavailable";
    const fullLocation = [
      venue.address?.street,
      venue.address?.city,
      venue.address?.state,
      venue.address?.zipCode,
    ]
      .filter(Boolean)
      .join(", ");
    const cityLine = [venue.address?.city, venue.address?.state]
      .filter(Boolean)
      .join(", ");
    const halls = (venue.halls || []).filter(Boolean);

    return {
      bannerImage,
      title,
      subtitle,
      type,
      status,
      capacity: venue.capacity ?? "TBD",
      pricePerDay: venue.pricePerDay ?? 0,
      location: fullLocation || "Location details unavailable",
      cityLine,
      contactEmail: venue.contactInfo?.email || "Not provided",
      contactPhone: venue.contactInfo?.phone || "Not provided",
      halls,
    };
  }, [venue, canBook]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      const start = new Date(bookingData.startDate);
      const end = new Date(bookingData.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const totalAmount = venue.pricePerDay * days;

      const bookingPayload = {
        eventId: bookingData.eventId,
        eventName: bookingData.eventName,
        organizerId: user.id,
        booking: {
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          purpose: bookingData.purpose,
          expectedAttendees: parseInt(bookingData.expectedAttendees, 10),
        },
        payment: {
          method: bookingData.paymentMethod,
          amount: totalAmount,
        },
      };

      await API.venues.book(id, bookingPayload);
      alert("Venue booked successfully!");
      setShowBookingModal(false);
      navigate("/bookings");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({ ...prev, [name]: value }));
  };

  const calculatePrice = () => {
    if (!bookingData.startDate || !bookingData.endDate || !venue) {
      return 0;
    }

    const start = new Date(bookingData.startDate);
    const end = new Date(bookingData.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return venue.pricePerDay * days;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="content-panel">
          <div className="loader-orb"></div>
          <p className="text-muted mb-0">Loading venue details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !details) {
    return (
      <AppLayout>
        <section className="content-panel">
          <h2>Venue not found</h2>
          <p className="text-muted">
            {error || "We could not find the selected venue details."}
          </p>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/venues")}
          >
            Back to Venues
          </button>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="event-details-page venue-details-page">
        {error ? (
          <div className="alert alert-danger event-booking-success">{error}</div>
        ) : null}

        <section className="event-details-hero venue-details-hero">
          <img src={details.bannerImage} alt={details.title} />

          <div className="event-details-hero-panel">
            <button
              type="button"
              className="event-details-back"
              onClick={() => navigate("/venues")}
            >
              Back to Venues
            </button>

            <div className="event-details-hero-content">
              <div>
                <span className="event-details-eyebrow">Venue Profile</span>
                <h1>{details.title}</h1>
                <p>{details.subtitle}</p>
              </div>

              <div className="event-details-stat-stack">
                <div className="event-details-stat">
                  <span>Price / Day</span>
                  <strong>{formatCurrency(details.pricePerDay)}</strong>
                </div>
                <div className="event-details-stat">
                  <span>Capacity</span>
                  <strong>{details.capacity} guests</strong>
                </div>
                {canBook ? (
                  <button
                    type="button"
                    className="btn btn-primary event-details-book-now"
                    onClick={() => setShowBookingModal(true)}
                  >
                    Book Venue
                  </button>
                ) : null}
              </div>
            </div>

            <div className="event-details-tags">
              <span className="event-details-tag event-details-tag-primary">
                {details.type}
              </span>
              <span className="event-details-tag">{details.status}</span>
            </div>
          </div>
        </section>

        <section className="event-details-grid">
          <div className="event-details-main">
            <InfoCard title="Venue Information">
              <div className="event-details-info-grid">
                <div className="event-details-info-box">
                  <span>Venue Type</span>
                  <strong>{details.type}</strong>
                </div>
                <div className="event-details-info-box">
                  <span>Status</span>
                  <strong>{details.status}</strong>
                </div>
                <div className="event-details-info-box">
                  <span>Capacity</span>
                  <strong>{details.capacity} guests</strong>
                </div>
                <div className="event-details-info-box">
                  <span>Price / Day</span>
                  <strong>{formatCurrency(details.pricePerDay)}</strong>
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

            {details.halls.length > 0 ? (
              <InfoCard title="Available Halls">
                <div className="event-details-contact-list">
                  {details.halls.map((hall, index) => (
                    <div key={`${hall.hallName || "hall"}-${index}`}>
                      <span>{hall.hallName || `Hall ${index + 1}`}</span>
                      <strong>
                        Capacity: {hall.capacity || "N/A"}
                        {hall.amenities?.length
                          ? ` | ${hall.amenities.join(", ")}`
                          : ""}
                      </strong>
                    </div>
                  ))}
                </div>
              </InfoCard>
            ) : null}
          </div>

          <div className="event-details-side">
            <InfoCard title="Contact Details">
              <div className="event-details-contact-list">
                <div>
                  <span>Phone</span>
                  <strong>{details.contactPhone}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{details.contactEmail}</strong>
                </div>
              </div>
            </InfoCard>
          </div>
        </section>
      </div>

      {showBookingModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowBookingModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book {venue.venueName}</h2>
              <button
                className="modal-close"
                onClick={() => setShowBookingModal(false)}
              >
                x
              </button>
            </div>

            <form onSubmit={handleBookingSubmit}>
              <div className="form-group">
                <label>Event ID *</label>
                <input
                  type="text"
                  name="eventId"
                  value={bookingData.eventId}
                  onChange={handleInputChange}
                  placeholder="Enter event ID"
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  name="eventName"
                  value={bookingData.eventName}
                  onChange={handleInputChange}
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={bookingData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={bookingData.endDate}
                    onChange={handleInputChange}
                    min={bookingData.startDate}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Purpose *</label>
                <input
                  type="text"
                  name="purpose"
                  value={bookingData.purpose}
                  onChange={handleInputChange}
                  placeholder="E.g., Corporate Conference"
                  required
                />
              </div>

              <div className="form-group">
                <label>Expected Attendees *</label>
                <input
                  type="number"
                  name="expectedAttendees"
                  value={bookingData.expectedAttendees}
                  onChange={handleInputChange}
                  min="1"
                  max={venue.capacity}
                  required
                />
                <small>Maximum capacity: {venue.capacity}</small>
              </div>

              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  name="paymentMethod"
                  value={bookingData.paymentMethod}
                  onChange={handleInputChange}
                  required
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {bookingData.startDate && bookingData.endDate ? (
                <div className="price-summary">
                  <h3>Price Summary</h3>
                  <p>
                    Rate: Rs. {venue.pricePerDay} / day x{" "}
                    {Math.ceil(
                      (new Date(bookingData.endDate) -
                        new Date(bookingData.startDate)) /
                        (1000 * 60 * 60 * 24),
                    ) + 1}{" "}
                    days
                  </p>
                  <p className="total-price">Total: Rs. {calculatePrice()}</p>
                </div>
              ) : null}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default VenueDetails;
