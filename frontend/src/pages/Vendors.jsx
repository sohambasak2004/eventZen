import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { hasRole } from "../utils/roles";

const SERVICE_TYPES = [
  "catering",
  "photography",
  "videography",
  "music_dj",
  "lighting",
  "decoration",
  "security",
  "transportation",
  "cleaning",
  "equipment_rental",
  "entertainment",
  "floral",
  "planning",
  "other",
];

const initialForm = {
  vendorName: "",
  businessName: "",
  serviceType: "catering",
  website: "",
  isActive: true,
};

const formatServiceType = (value) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState(null);

  const isAdmin = hasRole(user, "admin");

  const getVendorId = (vendor) => vendor.vendorId || vendor.id || vendor._id;

  const loadVendorPageData = useCallback(async () => {
    const vendorData = await API.vendors.list({
      limit: 100,
      includeInactive: true,
    });
    setVendors(vendorData);
    setError("");
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadVendorPageData();
      } catch (err) {
        setError(err.message || "Unable to load vendor data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadVendorPageData]);

  const filteredVendors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return vendors;
    }

    return vendors.filter((vendor) =>
      [
        vendor.vendorName,
        vendor.businessName,
        vendor.serviceType,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [searchTerm, vendors]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
    setError("");
  };

  const ensureAdminAccess = (message) => {
    if (isAdmin) {
      return true;
    }

    setError(message);
    return false;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!ensureAdminAccess("Only admins can add or update vendors.")) {
      return;
    }

    if (!form.vendorName.trim()) {
      setError("Vendor name is required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const vendorData = {
        vendorName: form.vendorName.trim(),
        businessName: form.businessName.trim() || undefined,
        serviceType: form.serviceType,
        website: form.website.trim() || undefined,
        isActive: form.isActive,
      };

      if (!vendorData.businessName) {
        delete vendorData.businessName;
      }

      if (!vendorData.website) {
        delete vendorData.website;
      }

      if (editingId) {
        const updated = await API.vendors.update(editingId, vendorData);
        setVendors((prev) =>
          prev.map((vendor) =>
            getVendorId(vendor) === editingId ? updated : vendor,
          ),
        );
      } else {
        const created = await API.vendors.create(vendorData);
        setVendors((prev) => [created, ...prev]);
      }

      await loadVendorPageData();
      resetForm();
    } catch (err) {
      setError(err.message || "Unable to save vendor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (vendor) => {
    if (!ensureAdminAccess("Only admins can edit vendors.")) {
      return;
    }

    setEditingId(getVendorId(vendor));
    setForm({
      vendorName: vendor.vendorName || "",
      businessName: vendor.businessName || "",
      serviceType: vendor.serviceType || "catering",
      website: vendor.website || "",
      isActive: vendor.isActive ?? true,
    });
    setError("");
  };

  const handleDelete = async (id) => {
    if (!ensureAdminAccess("Only admins can delete vendors.")) {
      return;
    }

    const confirmed = window.confirm("Delete this vendor?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingVendorId(id);
      setError("");
      await API.vendors.remove(id);
      await loadVendorPageData();

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err.message || "Failed to delete vendor.");
    } finally {
      setDeletingVendorId(null);
    }
  };

  return (
    <AppLayout>
      <section className="panel-head">
        <h2>Vendors</h2>
        {isAdmin ? (
          <Link className="btn btn-outline-secondary" to="/dashboard">
            Back to Dashboard
          </Link>
        ) : null}
      </section>

      {isAdmin ? (
        <section className="content-panel mb-3">
          <h4>{editingId ? "Edit Vendor" : "Add Vendor"}</h4>

          {error && <div className="alert alert-danger mt-3">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-3">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Vendor Name *</label>
                <input
                  type="text"
                  name="vendorName"
                  value={form.vendorName}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Service Type *</label>
                <select
                  name="serviceType"
                  value={form.serviceType}
                  onChange={handleChange}
                  className="form-select"
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatServiceType(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Website</label>
                <input
                  type="url"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="https://example.com"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select
                  name="isActive"
                  value={String(form.isActive)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.value === "true",
                    }))
                  }
                  className="form-select"
                >
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>

            </div>

            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Update Vendor"
                    : "Create Vendor"}
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
      ) : null}

      <section className="content-panel">
        {!isAdmin && error ? (
          <div className="alert alert-danger mb-3">{error}</div>
        ) : null}
        <div className="filter-row mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by vendor, business, or service type"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-muted mb-0">Loading vendors...</p>
        ) : filteredVendors.length === 0 ? (
          <p className="text-muted mb-0">No vendors found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Business Name</th>
                  <th>Service Type</th>
                  <th>Website</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => {
                  const vendorIdentifier = getVendorId(vendor);
                  return (
                    <tr key={vendorIdentifier}>
                      <td>{vendor.vendorName}</td>
                      <td>{vendor.businessName || "N/A"}</td>
                      <td>{formatServiceType(vendor.serviceType || "other")}</td>
                      <td>{vendor.website || "N/A"}</td>
                      <td>
                        <span className="status-pill">
                          {vendor.isActive ? "Available" : "Unavailable"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEdit(vendor)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(vendorIdentifier)}
                              disabled={deletingVendorId === vendorIdentifier}
                            >
                              {deletingVendorId === vendorIdentifier
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

export default Vendors;
