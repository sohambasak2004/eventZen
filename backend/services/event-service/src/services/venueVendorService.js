const config = require('../config');

const buildHeaders = (authorization) => ({
  'Content-Type': 'application/json',
  ...(authorization ? { Authorization: authorization } : {})
});

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
};

const deleteJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: 'DELETE',
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
};

const getVenueById = async (venueId) => {
  const data = await fetchJson(`${config.externalServices.venueVendorServiceUrl}/venues/${venueId}`);
  return data.data?.venue || null;
};

const getVendorById = async (vendorId, authorization) => {
  const data = await fetchJson(`${config.externalServices.venueVendorServiceUrl}/vendors/${vendorId}`, {
    headers: buildHeaders(authorization)
  });

  return data.data?.vendor || null;
};

const cleanupVenueVendorEventData = async (eventId, authorization) => {
  return deleteJson(`${config.externalServices.venueVendorServiceUrl}/events/${eventId}/cleanup`, {
    headers: buildHeaders(authorization)
  });
};

const cleanupBookingEventData = async (eventId, authorization) => {
  return deleteJson(`${config.externalServices.bookingServiceUrl}/bookings/events/${eventId}/cleanup`, {
    headers: buildHeaders(authorization)
  });
};

module.exports = {
  getVenueById,
  getVendorById,
  cleanupVenueVendorEventData,
  cleanupBookingEventData
};
