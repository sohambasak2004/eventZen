import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { hasRole } from "../utils/roles";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatPricePerDay = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "N/A";
  }

  return currencyFormatter.format(amount);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected photo."));
    reader.readAsDataURL(file);
  });

const initialForm = {
  venueName: "",
  description: "",
  address: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
  },
  capacity: 0,
  pricePerDay: 0,
  type: "Conference Hall",
  contactInfo: {
    email: "",
    phone: "",
  },
  photo: {
    url: "",
    alt: "",
  },
  availability: {
    isActive: true,
  },
};

function Venues() {
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingVenueId, setDeletingVenueId] = useState(null);
  const [photoFileName, setPhotoFileName] = useState("");
  const selectedPhotoLabel =
    photoFileName || (form.photo.url ? "Existing venue photo loaded" : "No file chosen");
  const isAdmin = hasRole(user, "admin");
  const isOrganizer = hasRole(user, "organizer");
  const canManageVenues = isAdmin || isOrganizer;

  // Helper function to get consistent venue identifier
  const getVenueId = (venue) => {
    return venue.venueId || venue._id || venue.id;
  };

  const getVenuePhoto = (venue) => venue.primaryImage?.url || venue.images?.[0]?.url || "";

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const data = await API.venues.list();
        setVenues(data);
      } finally {
        setIsLoading(false);
      }
    };

    loadVenues();
  }, []);

  const filteredVenues = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return venues;
    }

    return venues.filter(
      (venue) =>
        venue.venueName?.toLowerCase().includes(term) ||
        venue.address?.city?.toLowerCase().includes(term) ||
        venue.amenities?.some((amenity) =>
          amenity.toLowerCase().includes(term),
        ),
    );
  }, [venues, searchTerm]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    // Handle nested address fields
    if (name.startsWith("address.")) {
      const addressField = name.replace("address.", "");
      setForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    }
    // Handle nested contactInfo fields
    else if (name.startsWith("contactInfo.")) {
      const contactField = name.replace("contactInfo.", "");
      setForm((prev) => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          [contactField]: value,
        },
      }));
    }
    else if (name.startsWith("photo.")) {
      const photoField = name.replace("photo.", "");
      setForm((prev) => ({
        ...prev,
        photo: {
          ...prev.photo,
          [photoField]: value,
        },
      }));
    }
    // Handle regular fields
    else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the venue photo.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError("Venue photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const photoUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({
        ...prev,
        photo: {
          ...prev.photo,
          url: photoUrl,
          alt: prev.photo.alt || prev.venueName.trim(),
        },
      }));
      setPhotoFileName(file.name);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load the selected photo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({
      ...prev,
      photo: {
        url: "",
        alt: "",
      },
    }));
    setPhotoFileName("");
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
    setError("");
    setPhotoFileName("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // Validate required fields
    if (!form.venueName.trim()) {
      setError("Venue name is required.");
      return;
    }
    if (
      !form.address.street.trim() ||
      !form.address.city.trim() ||
      !form.address.state.trim() ||
      !form.address.zipCode.trim()
    ) {
      setError("Complete address (street, city, state, zip code) is required.");
      return;
    }
    if (form.capacity <= 0) {
      setError("Capacity must be greater than 0.");
      return;
    }
    if (form.pricePerDay < 0) {
      setError("Price per day cannot be negative.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare data for backend
      const venueData = {
        venueName: form.venueName.trim(),
        description: form.description.trim() || undefined,
        address: {
          street: form.address.street.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          zipCode: form.address.zipCode.trim(),
          country: form.address.country.trim() || "USA",
        },
        capacity: parseInt(form.capacity, 10),
        pricePerDay: parseFloat(form.pricePerDay),
        amenities: form.type ? [form.type] : [],
        contactInfo: {
          email: form.contactInfo.email.trim() || undefined,
          phone: form.contactInfo.phone.trim() || undefined,
        },
        images: form.photo.url
          ? [
              {
                url: form.photo.url,
                alt: form.photo.alt.trim() || form.venueName.trim(),
                isPrimary: true,
              },
            ]
          : [],
        availability: {
          isActive: form.availability.isActive,
        },
      };

      // Remove undefined values from contactInfo
      if (!venueData.contactInfo.email && !venueData.contactInfo.phone) {
        delete venueData.contactInfo;
      }

      if (!venueData.description) {
        delete venueData.description;
      }

      if (editingId) {
        const updated = await API.venues.update(editingId, venueData);
        setVenues((prev) =>
          prev.map((venue) => {
            const venueIdentifier = getVenueId(venue);
            return venueIdentifier === editingId ? updated : venue;
          }),
        );
      } else {
        const created = await API.venues.create(venueData);
        setVenues((prev) => [created, ...prev]);
      }

      resetForm();
    } catch (err) {
      setError(err.message || "Unable to save venue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (venue) => {
    // Use consistent ID field
    const venueIdentifier = getVenueId(venue);
    setEditingId(venueIdentifier);
    setForm({
      venueName: venue.venueName || "",
      description: venue.description || "",
      address: {
        street: venue.address?.street || "",
        city: venue.address?.city || "",
        state: venue.address?.state || "",
        zipCode: venue.address?.zipCode || "",
        country: venue.address?.country || "USA",
      },
      capacity: venue.capacity || 0,
      pricePerDay: venue.pricePerDay || 0,
      type: venue.amenities?.[0] || "Conference Hall",
      contactInfo: {
        email: venue.contactInfo?.email || "",
        phone: venue.contactInfo?.phone || "",
      },
      photo: {
        url: venue.primaryImage?.url || venue.images?.[0]?.url || "",
        alt: venue.primaryImage?.alt || venue.images?.[0]?.alt || "",
      },
      availability: {
        isActive: venue.availability?.isActive ?? true,
      },
    });
    setPhotoFileName("");
    setError("");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this venue?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingVenueId(id);
      setError(""); // Clear any previous errors

      // Call API to delete venue from database
      await API.venues.remove(id);

      // Only update frontend state if API call succeeded
      setVenues((prev) => prev.filter((venue) => {
        const venueIdentifier = getVenueId(venue);
        return venueIdentifier !== id;
      }));

      // If we were editing this venue, reset the form
      if (editingId === id) {
        resetForm();
      }

    } catch (err) {
      console.error('Venue deletion failed:', err);
      const errorMessage = err.message || "Failed to delete venue. Please try again.";
      setError(errorMessage);

      // Show alert for immediate user feedback
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeletingVenueId(null);
    }
  };

  return (
    <AppLayout>
      <section className="panel-head">
        <h2>{canManageVenues ? "Venue Management" : "Venues"}</h2>
        {isAdmin ? (
          <Link className="btn btn-outline-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        ) : null}
      </section>

      {canManageVenues && (
        <section className="content-panel mb-3">
          <h4>{editingId ? "Edit Venue" : "Add Venue"}</h4>

          {error && <div className="alert alert-danger mt-3">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-3">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Venue Name *</label>
                <input
                  type="text"
                  name="venueName"
                  value={form.venueName}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Optional description"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Street Address *</label>
                <input
                  type="text"
                  name="address.street"
                  value={form.address.street}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  name="address.city"
                  value={form.address.city}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  name="address.state"
                  value={form.address.state}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-1">
                <label className="form-label">Zip *</label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={form.address.zipCode}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Capacity *</label>
                <input
                  type="number"
                  min="1"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Price/Day *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="pricePerDay"
                  value={form.pricePerDay}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option>Conference Hall</option>
                  <option>Auditorium</option>
                  <option>Banquet</option>
                  <option>Open Ground</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  name="contactInfo.email"
                  value={form.contactInfo.email}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Optional"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  name="contactInfo.phone"
                  value={form.contactInfo.phone}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Optional"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Venue Photo</label>
                <label
                  className="form-control d-flex align-items-center p-0 overflow-hidden"
                  style={{ cursor: "pointer" }}
                >
                  <span
                    className="px-3 d-flex align-items-center border-end bg-light"
                    style={{ minHeight: "46px", whiteSpace: "nowrap" }}
                  >
                    Choose File
                  </span>
                  <span
                    className="px-3 text-muted text-truncate d-flex align-items-center flex-grow-1"
                    style={{ minHeight: "46px" }}
                  >
                    {selectedPhotoLabel}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                  />
                </label>
                <small className="text-muted d-block mt-1">
                  Upload one image up to 5 MB. It will be stored with the venue in MongoDB.
                </small>
              </div>

              <div className="col-md-2">
                <label className="form-label d-block">&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={handleRemovePhoto}
                  disabled={!form.photo.url}
                >
                  Remove Photo
                </button>
              </div>

              <div className="col-md-4">
                <label className="form-label">Photo Alt Text</label>
                <input
                  type="text"
                  name="photo.alt"
                  value={form.photo.alt}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Optional accessibility text"
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Status</label>
                <select
                  name="availability.isActive"
                  value={form.availability.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      availability: {
                        ...prev.availability,
                        isActive: e.target.value === "true",
                      },
                    }))
                  }
                  className="form-select"
                >
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>

              {form.photo.url && (
                <div className="col-12">
                  <label className="form-label">Photo Preview</label>
                  <div>
                    <img
                      src={form.photo.url}
                      alt={form.photo.alt || form.venueName || "Venue preview"}
                      style={{
                        width: "200px",
                        maxWidth: "100%",
                        height: "140px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        border: "1px solid rgba(0, 0, 0, 0.08)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="alert alert-info mt-3">
              <small>
                <strong>Note:</strong> Fields marked with * are required.
              </small>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Update Venue"
                    : "Create Venue"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="content-panel">
        {!canManageVenues && error && (
          <div className="alert alert-danger mb-3">{error}</div>
        )}
        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by venue, city, or type"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-muted mb-0">Loading venues...</p>
        ) : filteredVenues.length === 0 ? (
          <p className="text-muted mb-0">No venues found.</p>
        ) : !canManageVenues ? (
          <div className="event-cards-grid">
            {filteredVenues.map((venue) => {
              const venueIdentifier = getVenueId(venue);
              const venuePhoto = getVenuePhoto(venue);
              const venueLocation = [
                venue.address?.city,
                venue.address?.state,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <article key={venueIdentifier} className="event-card">
                  <div className="event-card-image">
                    <img
                      src={
                        venuePhoto ||
                        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&h=300&fit=crop&q=80"
                      }
                      alt={venue.primaryImage?.alt || venue.venueName}
                    />
                    <span className="event-card-badge">
                      {venue.amenities?.[0] || "Venue"}
                    </span>
                  </div>
                  <div className="event-card-content">
                    <div className="event-card-date">
                      {venue.availability?.isActive ? "Available Now" : "Currently Unavailable"}
                    </div>
                    <h3 className="event-card-title">{venue.venueName}</h3>
                    <p className="event-card-description">
                      {venue.description ||
                        "Explore this venue for your next event, gathering, or celebration."}
                    </p>
                    <p className="event-card-description">
                      Capacity: {venue.capacity || "N/A"} guests
                      {" | "}
                      Price: {formatPricePerDay(venue.pricePerDay)} / day
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
                        <span>{venueLocation || "Location unavailable"}</span>
                      </div>
                      <Link
                        to={`/venues/${venueIdentifier}`}
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
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Venue Name</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Price/Day</th>
                  <th>Status</th>
                  {canManageVenues && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVenues.map((venue) => {
                  const venueIdentifier = getVenueId(venue);
                  const venuePhoto = getVenuePhoto(venue);
                  return (
                  <tr key={venueIdentifier}>
                    <td>
                      {venuePhoto ? (
                        <img
                          src={venuePhoto}
                          alt={venue.primaryImage?.alt || venue.venueName}
                          style={{
                            width: "64px",
                            height: "48px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid rgba(0, 0, 0, 0.08)",
                          }}
                        />
                      ) : (
                        <span className="text-muted">No photo</span>
                      )}
                    </td>
                    <td>{venue.venueName}</td>
                    <td>{venue.address?.city}</td>
                    <td>{venue.amenities?.[0] || "N/A"}</td>
                    <td>{venue.capacity}</td>
                    <td>{formatPricePerDay(venue.pricePerDay)}</td>
                    <td>
                      <span className="status-pill">
                        {venue.availability?.isActive
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </td>
                    {canManageVenues && (
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(venue)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(venueIdentifier)}
                            disabled={deletingVenueId === venueIdentifier}
                          >
                            {deletingVenueId === venueIdentifier
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    )}
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

export default Venues;
