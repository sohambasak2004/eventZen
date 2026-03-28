const EVENT_API_BASE =
  import.meta.env.VITE_EVENT_SERVICE_URL || "http://localhost:3002/api/v1";
const AUTH_API_BASE =
  import.meta.env.VITE_AUTH_SERVICE_URL || "http://localhost:8081/api/v1/auth";

const STORAGE_KEYS = {
  TOKEN: "ems_token",
  USER: "ems_user",
};

const getAuthHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

let refreshPromise = null;

const storeAuthenticatedUser = (data) => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, data.accessToken);
  localStorage.setItem(
    STORAGE_KEYS.USER,
    JSON.stringify({
      id: data.user.userId,
      name: `${data.user.firstName} ${data.user.lastName}`,
      email: data.user.email,
      roles: data.user.roles,
      phone: data.user.phone,
    }),
  );
};

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${AUTH_API_BASE}/refresh`, {
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
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  if (response.status === 401 && token && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshedToken}`,
        ...(options.headers || {}),
      },
      credentials: options.credentials || "include",
    });
  }

  return response;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));

    const validationMessage = Array.isArray(error.errors) && error.errors.length > 0
      ? error.errors.map((item) => item.message).join(", ")
      : null;

    throw new Error(validationMessage || error.message || error.error || "Request failed");
  }

  return response.json();
};

const toQueryString = (options = {}) => {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  return params.toString();
};

const EventAPI = {
  events: {
    async list(options = {}) {
      const queryString = toQueryString(options);
      const response = await fetchWithAuth(
        `${EVENT_API_BASE}/events${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
        },
      );

      const result = await handleResponse(response);
      return result.data.events || [];
    },

    async getById(id) {
      const response = await fetchWithAuth(`${EVENT_API_BASE}/events/${id}`, {
        method: "GET",
      });

      const result = await handleResponse(response);
      return result.data.event;
    },

    async getByOrganizer(organizerId, options = {}) {
      const queryString = toQueryString(options);
      const response = await fetchWithAuth(
        `${EVENT_API_BASE}/events/organizer/${organizerId}${queryString ? `?${queryString}` : ""}`,
        {
          method: "GET",
        },
      );

      const result = await handleResponse(response);
      return result.data.events || [];
    },

    async create(payload) {
      const response = await fetchWithAuth(`${EVENT_API_BASE}/events`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const result = await handleResponse(response);
      return result.data.event;
    },

    async update(id, payload) {
      const response = await fetchWithAuth(`${EVENT_API_BASE}/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const result = await handleResponse(response);
      return result.data.event;
    },

    async remove(id) {
      const response = await fetchWithAuth(`${EVENT_API_BASE}/events/${id}`, {
        method: "DELETE",
      });

      return handleResponse(response);
    },

    async getUpcoming(limit = 10) {
      const response = await fetchWithAuth(`${EVENT_API_BASE}/events/upcoming?limit=${limit}`, {
        method: "GET",
      });

      const result = await handleResponse(response);
      return result.data.events || [];
    },

    async search(searchTerm, filters = {}) {
      const params = new URLSearchParams({ q: searchTerm });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value);
        }
      });

      const response = await fetchWithAuth(`${EVENT_API_BASE}/events/search?${params.toString()}`, {
        method: "GET",
      });

      const result = await handleResponse(response);
      return result.data.events || [];
    },

    async getStats() {
      const response = await fetchWithAuth(`${EVENT_API_BASE}/events/admin/stats`, {
        method: "GET",
      });

      const result = await handleResponse(response);
      return result.data.stats;
    },
  },
};

export default EventAPI;
