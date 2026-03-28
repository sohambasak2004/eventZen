// API Configuration
const API_CONFIG = {
  AUTH_SERVICE: "http://localhost:8081/api/v1/auth",
  VENUE_VENDOR_SERVICE: "http://localhost:3001/api/v1",
};

const STORAGE_KEYS = {
  TOKEN: "ems_token",
  USER: "ems_user",
  EVENTS: "ems_events",
  VENUES: "ems_venues",
  ATTENDEES: "ems_attendees",
};

const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

const normalizeUser = (data) => ({
  id: data.userId,
  firstName: data.firstName,
  lastName: data.lastName,
  name: `${data.firstName} ${data.lastName}`.trim(),
  email: data.email,
  roles: data.roles,
  phone: data.phone || "",
});

// Helper function to get auth headers
const getAuthHeaders = (token = localStorage.getItem(STORAGE_KEYS.TOKEN)) => {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

let refreshPromise = null;

const storeAuthenticatedUser = (data) => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, data.accessToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalizeUser(data.user)));
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        clearAuthStorage();
        const error = await response.json().catch(() => ({
          message: "Your authentication token has expired. Please login again.",
        }));
        throw new Error(
          error.message || "Your authentication token has expired. Please login again.",
        );
      }

      const data = await response.json();
      storeAuthenticatedUser(data);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

const fetchWithAuth = async (url, options = {}, retryOnUnauthorized = true) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const headers = {
    ...getAuthHeaders(token),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && token && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();

    return fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(refreshedToken),
        ...(options.headers || {}),
      },
    });
  }

  return response;
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    const validationMessage = Array.isArray(error.errors) && error.errors.length > 0
      ? error.errors.map((item) => item.message).join(", ")
      : null;

    throw new Error(
      validationMessage || error.message || error.error || "Request failed",
    );
  }
  return response.json();
};

// Legacy seed data and functions (kept for backward compatibility with events and attendees)
const seedEvents = [
  {
    id: "ev-1001",
    title: "Frontend Futures Summit",
    date: "2026-04-12",
    time: "10:00",
    location: "Kolkata Tech Park",
    category: "Conference",
    status: "Planned",
    capacity: 180,
    attendees: 92,
    budget: 4500,
    description: "A one-day summit on modern React architecture and DX.",
  },
  {
    id: "ev-1002",
    title: "Design Systems Workshop",
    date: "2026-04-28",
    time: "14:00",
    location: "City Innovation Hub",
    category: "Workshop",
    status: "Open",
    capacity: 80,
    attendees: 47,
    budget: 1800,
    description: "Hands-on workshop to create scalable component systems.",
  },
  {
    id: "ev-1003",
    title: "Founder Networking Night",
    date: "2026-05-04",
    time: "18:30",
    location: "Downtown Banquet Hall",
    category: "Networking",
    status: "Closed",
    capacity: 120,
    attendees: 120,
    budget: 3200,
    description: "Curated networking night for startup founders and operators.",
  },
];

const seedAttendees = [
  {
    id: "at-1001",
    name: "Arjun Sen",
    email: "arjun.sen@example.com",
    phone: "+91-90000-12001",
    eventName: "Frontend Futures Summit",
    ticketType: "VIP",
    status: "Confirmed",
  },
  {
    id: "at-1002",
    name: "Nisha Verma",
    email: "nisha.verma@example.com",
    phone: "+91-90000-12002",
    eventName: "Design Systems Workshop",
    ticketType: "Standard",
    status: "Checked-in",
  },
  {
    id: "at-1003",
    name: "Rohan Das",
    email: "rohan.das@example.com",
    phone: "+91-90000-12003",
    eventName: "Founder Networking Night",
    ticketType: "Standard",
    status: "Pending",
  },
];

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readStorage = (key, fallback) => safeParse(localStorage.getItem(key), fallback);
const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Initialize legacy storage for events and attendees
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    writeStorage(STORAGE_KEYS.EVENTS, seedEvents);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDEES)) {
    writeStorage(STORAGE_KEYS.ATTENDEES, seedAttendees);
  }
};

initializeStorage();

const API = {
  // Authentication API (existing)
  auth: {
    async register({ name, email, password }) {
      const [firstName, ...lastNameParts] = name.trim().split(" ");
      const lastName = lastNameParts.join(" ") || firstName;

      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await handleResponse(response);
      return { message: data.message, email: data.email };
    },

    async login({ email, password }) {
      const response = await fetch(`${API_CONFIG.AUTH_SERVICE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await handleResponse(response);
      storeAuthenticatedUser(data);
      return normalizeUser(data.user);
    },

    async logout() {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        try {
          await fetchWithAuth(`${API_CONFIG.AUTH_SERVICE}/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch (error) {
          console.error("Logout request failed:", error);
        }
      }
      clearAuthStorage();
    },

    async getCurrentUser() {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) return null;

      try {
        const response = await fetchWithAuth(`${API_CONFIG.AUTH_SERVICE}/me`);

        const data = await handleResponse(response);
        const user = normalizeUser(data);

        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        return user;
      } catch {
        clearAuthStorage();
        return null;
      }
    },

    async updateProfile(userId, payload) {
      const response = await fetchWithAuth(`${API_CONFIG.AUTH_SERVICE.replace("/auth", "")}/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const data = await handleResponse(response);
      const user = normalizeUser(data);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    },

    async changePassword(payload) {
      const response = await fetchWithAuth(`${API_CONFIG.AUTH_SERVICE}/change-password`, {
        method: "POST",
        body: JSON.stringify(payload),
        credentials: "include",
      });

      return handleResponse(response);
    },
  },

  // Venues API (connected to venue-vendor-service)
  venues: {
    async list(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value);
        }
      });

      const url = `${API_CONFIG.VENUE_VENDOR_SERVICE}/venues${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetchWithAuth(url);

      const data = await handleResponse(response);
      return data.data.venues || [];
    },

    async get(id) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/venues/${id}`);

      const data = await handleResponse(response);
      return data.data.venue;
    },

    async create(venueData) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/venues`, {
        method: "POST",
        body: JSON.stringify(venueData),
      });

      const data = await handleResponse(response);
      return data.data.venue;
    },

    async update(id, venueData) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/venues/${id}`, {
        method: "PUT",
        body: JSON.stringify(venueData),
      });

      const data = await handleResponse(response);
      return data.data.venue;
    },

    async remove(id) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/venues/${id}`, {
        method: "DELETE",
      });

      await handleResponse(response);
    },

    async checkAvailability(id, startDate, endDate) {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetchWithAuth(
        `${API_CONFIG.VENUE_VENDOR_SERVICE}/venues/${id}/availability?${params.toString()}`,
        {}
      );

      const data = await handleResponse(response);
      return data.data.availability;
    },

    async book(id, bookingData) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/venues/${id}/book`, {
        method: "POST",
        body: JSON.stringify(bookingData),
      });

      const data = await handleResponse(response);
      return data.data.booking;
    },
  },

  // Vendors API
  vendors: {
    async list(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value);
        }
      });

      const url = `${API_CONFIG.VENUE_VENDOR_SERVICE}/vendors${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetchWithAuth(url);

      const data = await handleResponse(response);
      return data.data.vendors || [];
    },

    async create(vendorData) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/vendors`, {
        method: "POST",
        body: JSON.stringify(vendorData),
      });

      const data = await handleResponse(response);
      return data.data.vendor;
    },

    async update(id, vendorData) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify(vendorData),
      });

      const data = await handleResponse(response);
      return data.data.vendor;
    },

    async remove(id) {
      const response = await fetchWithAuth(`${API_CONFIG.VENUE_VENDOR_SERVICE}/vendors/${id}`, {
        method: "DELETE",
      });

      await handleResponse(response);
    },
  },

  // Legacy Events API (unchanged for backward compatibility)
  events: {
    async list() {
      await delay(120);
      const events = readStorage(STORAGE_KEYS.EVENTS, []);
      return [...events].sort(
        (a, b) =>
          new Date(`${a.date}T${a.time || "00:00"}`).getTime() -
          new Date(`${b.date}T${b.time || "00:00"}`).getTime()
      );
    },

    async create(payload) {
      await delay();
      const events = readStorage(STORAGE_KEYS.EVENTS, []);
      const item = {
        ...payload,
        id: createId(),
        attendees: Number(payload.attendees || 0),
        budget: Number(payload.budget || 0),
        capacity: Number(payload.capacity || 0),
      };
      events.push(item);
      writeStorage(STORAGE_KEYS.EVENTS, events);
      return item;
    },

    async update(id, payload) {
      await delay();
      const events = readStorage(STORAGE_KEYS.EVENTS, []);
      const index = events.findIndex((event) => event.id === id);
      if (index === -1) throw new Error("Event not found.");

      const updated = {
        ...events[index],
        ...payload,
        attendees: Number(payload.attendees ?? events[index].attendees ?? 0),
        budget: Number(payload.budget ?? events[index].budget ?? 0),
        capacity: Number(payload.capacity ?? events[index].capacity ?? 0),
      };
      events[index] = updated;
      writeStorage(STORAGE_KEYS.EVENTS, events);
      return updated;
    },

    async remove(id) {
      await delay(100);
      const events = readStorage(STORAGE_KEYS.EVENTS, []);
      const filtered = events.filter((event) => event.id !== id);
      writeStorage(STORAGE_KEYS.EVENTS, filtered);
    },
  },

  // Legacy Attendees API (unchanged for backward compatibility)
  attendees: {
    async list() {
      await delay(120);
      return readStorage(STORAGE_KEYS.ATTENDEES, []);
    },

    async create(payload) {
      await delay();
      const attendees = readStorage(STORAGE_KEYS.ATTENDEES, []);
      const normalizedEmail = payload.email.trim().toLowerCase();
      const duplicate = attendees.find(
        (item) =>
          item.email.toLowerCase() === normalizedEmail &&
          item.eventName === payload.eventName
      );

      if (duplicate) {
        throw new Error("This attendee is already registered for the event.");
      }

      const item = {
        ...payload,
        id: createId(),
        email: normalizedEmail,
      };
      attendees.push(item);
      writeStorage(STORAGE_KEYS.ATTENDEES, attendees);
      return item;
    },

    async update(id, payload) {
      await delay();
      const attendees = readStorage(STORAGE_KEYS.ATTENDEES, []);
      const index = attendees.findIndex((attendee) => attendee.id === id);
      if (index === -1) throw new Error("Attendee not found.");

      const updated = {
        ...attendees[index],
        ...payload,
        email: (payload.email || attendees[index].email).trim().toLowerCase(),
      };
      attendees[index] = updated;
      writeStorage(STORAGE_KEYS.ATTENDEES, attendees);
      return updated;
    },

    async remove(id) {
      await delay(100);
      const attendees = readStorage(STORAGE_KEYS.ATTENDEES, []);
      const filtered = attendees.filter((attendee) => attendee.id !== id);
      writeStorage(STORAGE_KEYS.ATTENDEES, filtered);
    },
  },
};

export default API;
