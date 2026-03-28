import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import API from "../services/api";
import { useEvents } from "../context/EventContext";
import EventAPI from "../services/eventApi";
import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/roles";

const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Conference",
  "Workshop",
  "Networking",
  "Reception",
  "Festival",
  "Other",
];

const TICKETED_EVENT_TYPES = new Set([
  "Corporate",
  "Conference",
  "Workshop",
  "Networking",
]);

const initialForm = {
  eventType: "Wedding",
  eventDate: "",
  startTime: "",
  endTime: "",
  guestCount: 0,
  budget: 0,
  ticketPrice: 0,
  availableVendorId: "",
  availableVenueId: "",
  notes: "",
  organizerContact: {
    name: "",
    email: "",
    phone: "",
  },
};

function CreateEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createEvent, getEventById, updateEvent } = useEvents();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedEvent, setLoadedEvent] = useState(null);

  const editingEvent = useMemo(
    () => (id ? getEventById(id) || loadedEvent : null),
    [id, getEventById, loadedEvent],
  );
  const isEditMode = Boolean(id);
  const returnPath = hasRole(user, "admin") ? "/events" : "/my-events";
  const showsTicketPrice = TICKETED_EVENT_TYPES.has(form.eventType);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [venueList, vendorList] = await Promise.all([
          API.venues.list(),
          API.vendors.list({ limit: 100 }),
        ]);

        setVenues(venueList);
        setVendors(vendorList);
      } catch (err) {
        setError(err.message || "Unable to load available venues and vendors.");
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    if (!id || getEventById(id)) {
      return;
    }

    const loadEvent = async () => {
      try {
        setIsLoadingEvent(true);
        const event = await EventAPI.events.getById(id);
        setLoadedEvent(event);
      } catch (err) {
        setError(err.message || "Unable to load event details.");
      } finally {
        setIsLoadingEvent(false);
      }
    };

    loadEvent();
  }, [id, getEventById]);

  useEffect(() => {
    if (!editingEvent) {
      return;
    }

    setForm({
      eventType: editingEvent.eventType || editingEvent.category || "Wedding",
      eventDate: editingEvent.eventDate || editingEvent.date || "",
      startTime: editingEvent.startTime || editingEvent.time || "",
      endTime: editingEvent.endTime || "",
      guestCount: editingEvent.guestCount ?? editingEvent.capacity ?? 0,
      budget: editingEvent.budget ?? 0,
      ticketPrice: editingEvent.ticketPrice ?? 0,
      availableVendorId: editingEvent.availableVendorId || "",
      availableVenueId: editingEvent.availableVenueId || "",
      notes: editingEvent.notes || editingEvent.description || "",
      organizerContact: {
        name: editingEvent.organizerContact?.name || "",
        email: editingEvent.organizerContact?.email || "",
        phone: editingEvent.organizerContact?.phone || "",
      },
    });
  }, [editingEvent]);

  const selectedVenue = useMemo(
    () => venues.find((venue) => (venue.venueId || venue._id || venue.id) === form.availableVenueId) || null,
    [venues, form.availableVenueId],
  );

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => (vendor.vendorId || vendor._id || vendor.id) === form.availableVendorId) || null,
    [vendors, form.availableVendorId],
  );

  const availableVenues = useMemo(
    () =>
      venues.filter((venue) => {
        const venueId = venue.venueId || venue._id || venue.id;
        const isSelected = venueId === form.availableVenueId;
        const isAvailable = venue.isActive !== false && venue.availability?.isActive !== false;
        return isAvailable || isSelected;
      }),
    [venues, form.availableVenueId],
  );

  const availableVendors = useMemo(
    () =>
      vendors.filter((vendor) => {
        const vendorId = vendor.vendorId || vendor._id || vendor.id;
        return vendor.isActive !== false || vendorId === form.availableVendorId;
      }),
    [vendors, form.availableVendorId],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name.startsWith("organizerContact.")) {
      const contactField = name.replace("organizerContact.", "");
      setForm((prev) => ({
        ...prev,
        organizerContact: {
          ...prev.organizerContact,
          [contactField]: value,
        },
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.eventDate || !form.startTime || !form.endTime) {
      setError("Event date, start time, and end time are required.");
      return;
    }

    if (!form.organizerContact.name.trim()) {
      setError("Organizer contact name is required.");
      return;
    }

    if (!form.organizerContact.email.trim()) {
      setError("Organizer contact email is required.");
      return;
    }

    if (!form.organizerContact.phone.trim()) {
      setError("Organizer contact phone is required.");
      return;
    }

    if (Number(form.guestCount) <= 0) {
      setError("Number of guests must be greater than 0.");
      return;
    }

    if (Number(form.budget) < 0) {
      setError("Budget cannot be negative.");
      return;
    }

    if (Number(form.ticketPrice) < 0) {
      setError("Ticket price cannot be negative.");
      return;
    }

    if (form.endTime <= form.startTime) {
      setError("Event end time must be after the start time.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        eventType: form.eventType,
        eventDate: form.eventDate,
        startTime: form.startTime,
        endTime: form.endTime,
        guestCount: Number(form.guestCount),
        budget: Number(form.budget),
        ticketPrice: showsTicketPrice ? Number(form.ticketPrice) : 0,
        availableVendorId: form.availableVendorId || "",
        availableVendorName: selectedVendor?.vendorName || "",
        availableVenueId: form.availableVenueId || "",
        availableVenueName: selectedVenue?.venueName || "",
        notes: form.notes.trim(),
        organizerContact: {
          name: form.organizerContact.name.trim(),
          email: form.organizerContact.email.trim(),
          phone: form.organizerContact.phone.trim(),
        },
        // Derived fields kept for compatibility with the rest of the event UI.
        title: `${form.eventType} Event`,
        category: form.eventType,
        date: form.eventDate,
        time: form.startTime,
        location: selectedVenue?.venueName || "Venue not selected",
        capacity: Number(form.guestCount),
        attendees: 0,
        description: form.notes.trim(),
        status: isEditMode ? editingEvent?.status || "Planned" : "Planned",
      };

      if (isEditMode && id) {
        await updateEvent(id, payload);
      } else {
        await createEvent(payload);
      }

      navigate(returnPath);
    } catch (err) {
      setError(err.message || "Unable to save event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <section className="panel-head">
        <h2>{isEditMode ? "Edit Event" : "Create Event"}</h2>
        <Link to={returnPath} className="btn btn-outline-secondary">
          Back to {hasRole(user, "admin") ? "Events" : "My Events"}
        </Link>
      </section>

      <section className="content-panel">
        {isLoadingEvent ? (
          <p className="text-muted mb-0">Loading event details...</p>
        ) : isEditMode && !editingEvent ? (
          <p className="text-muted mb-0">Event not found.</p>
        ) : isLoadingOptions ? (
          <p className="text-muted mb-0">Loading available venues and vendors...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Event Type</label>
                <select
                  name="eventType"
                  className="form-select"
                  value={form.eventType}
                  onChange={handleChange}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Event Date</label>
                <input
                  type="date"
                  name="eventDate"
                  className="form-control"
                  value={form.eventDate}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Number of Guests</label>
                <input
                  type="number"
                  min="1"
                  name="guestCount"
                  className="form-control"
                  value={form.guestCount}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  className="form-control"
                  value={form.startTime}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">End Time</label>
                <input
                  type="time"
                  name="endTime"
                  className="form-control"
                  value={form.endTime}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Budget</label>
                <input
                  type="number"
                  min="0"
                  name="budget"
                  className="form-control"
                  value={form.budget}
                  onChange={handleChange}
                />
              </div>

              {showsTicketPrice ? (
                <div className="col-md-3">
                  <label className="form-label">Ticket Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="ticketPrice"
                    className="form-control"
                    value={form.ticketPrice}
                    onChange={handleChange}
                  />
                </div>
              ) : null}

              <div className="col-md-3">
                <label className="form-label">Available Vendor</label>
                <select
                  name="availableVendorId"
                  className="form-select"
                  value={form.availableVendorId}
                  onChange={handleChange}
                >
                  <option value="">Select vendor</option>
                  {availableVendors.map((vendor) => {
                    const vendorId = vendor.vendorId || vendor._id || vendor.id;
                    const vendorUnavailable = vendor.isActive === false;
                    return (
                      <option key={vendorId} value={vendorId}>
                        {vendor.vendorName}
                        {vendorUnavailable ? " (Unavailable - linked to this event)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Available Venue</label>
                <select
                  name="availableVenueId"
                  className="form-select"
                  value={form.availableVenueId}
                  onChange={handleChange}
                >
                  <option value="">Select venue</option>
                  {availableVenues.map((venue) => {
                    const venueId = venue.venueId || venue._id || venue.id;
                    const venueUnavailable =
                      venue.isActive === false || venue.availability?.isActive === false;
                    return (
                      <option key={venueId} value={venueId}>
                        {venue.venueName}
                        {venueUnavailable ? " (Unavailable - linked to this event)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Organizer Contact Name</label>
                <input
                  type="text"
                  name="organizerContact.name"
                  className="form-control"
                  value={form.organizerContact.name}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Organizer Contact Email</label>
                <input
                  type="email"
                  name="organizerContact.email"
                  className="form-control"
                  value={form.organizerContact.email}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Organizer Contact Phone</label>
                <input
                  type="tel"
                  name="organizerContact.phone"
                  className="form-control"
                  value={form.organizerContact.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Event Description / Notes</label>
                <textarea
                  name="notes"
                  className="form-control"
                  rows="4"
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button className="btn btn-primary mt-4" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Event"
                  : "Create Event"}
            </button>
          </form>
        )}
      </section>
    </AppLayout>
  );
}

export default CreateEvent;
