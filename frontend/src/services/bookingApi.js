const BOOKING_API_BASE = "http://localhost:8082/api/v1";
const STORAGE_KEYS = {
  TOKEN: "ems_token",
  BOOKING_CACHE: "eventzen_paid_bookings",
};

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const readBookingCache = () => safeParse(localStorage.getItem(STORAGE_KEYS.BOOKING_CACHE), []);

const writeBookingCache = (bookings, { notify = false } = {}) => {
  const normalizedBookings = limitPaidBookings(bookings, Number.MAX_SAFE_INTEGER);
  localStorage.setItem(STORAGE_KEYS.BOOKING_CACHE, JSON.stringify(normalizedBookings));

  if (notify) {
    window.dispatchEvent(new CustomEvent("eventzen-bookings-updated"));
  }

  return normalizedBookings;
};

const getBookingTimestamp = (booking) =>
  new Date(booking?.payment?.paidAt || booking?.createdAt || 0).getTime();

const isPaidBooking = (booking) =>
  String(booking?.payment?.status || "").toLowerCase() === "paid";

const limitPaidBookings = (bookings, limit) =>
  mergeBookings(bookings)
    .filter(isPaidBooking)
    .slice(0, limit);

const normalizeBooking = (booking) => {
  if (!booking?.bookingId) {
    return null;
  }

  return {
    ...booking,
    user: {
      name: booking.user?.name || "Unknown attendee",
      email: booking.user?.email || "-",
      phone: booking.user?.phone || "",
      ...booking.user,
    },
    event: {
      title: booking.event?.title || "Untitled event",
      location: booking.event?.location || "Venue pending",
      ...booking.event,
    },
    payment: {
      status: booking.payment?.status || "PAID",
      provider: booking.payment?.provider || "dummy_razorpay_cash",
      paidAt: booking.payment?.paidAt || booking.createdAt || new Date().toISOString(),
      ...booking.payment,
    },
    ticket: {
      ticketCode: booking.ticket?.ticketCode || "-",
      ...booking.ticket,
    },
  };
};

const mergeBookings = (...sources) => {
  const merged = new Map();

  sources
    .flat()
    .map(normalizeBooking)
    .filter(Boolean)
    .forEach((booking) => {
      merged.set(booking.bookingId, booking);
    });

  return [...merged.values()].sort((left, right) => getBookingTimestamp(right) - getBookingTimestamp(left));
};

const persistBooking = (booking, options = {}) => {
  const { notify = true } = options;
  const normalizedBooking = normalizeBooking(booking);
  if (!normalizedBooking) {
    return null;
  }

  const cachedBookings = mergeBookings([normalizedBooking], readBookingCache());
  writeBookingCache(cachedBookings);
  if (notify) {
    window.dispatchEvent(new CustomEvent("eventzen-bookings-updated", { detail: normalizedBooking }));
  }
  return normalizedBooking;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleJsonResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));

    const bookingError = new Error(error.message || "Booking request failed.");
    bookingError.status = response.status;
    throw bookingError;
  }

  return response.json();
};

const getDownloadFileName = (response, fallback = "eventzen-ticket.pdf") => {
  const contentDisposition = response.headers.get("content-disposition");
  if (!contentDisposition) {
    return fallback;
  }

  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
};

const triggerDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const BookingAPI = {
  getCachedPaidBookings() {
    return limitPaidBookings(readBookingCache(), Number.MAX_SAFE_INTEGER);
  },

  async createCheckoutSession(eventId) {
    const response = await fetch(`${BOOKING_API_BASE}/bookings/checkout-sessions`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventId }),
    });

    return handleJsonResponse(response);
  },

  async confirmPayment(sessionId, payload = {}) {
    const response = await fetch(`${BOOKING_API_BASE}/bookings/checkout-sessions/${sessionId}/confirm`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await handleJsonResponse(response);
    persistBooking(data?.booking);
    return data;
  },

  async getMyBookings() {
    const response = await fetch(`${BOOKING_API_BASE}/bookings/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    const data = await handleJsonResponse(response);
    const items = Array.isArray(data?.items) ? data.items : [];
    items.forEach((booking) => {
      if (String(booking?.payment?.status || "").toLowerCase() === "paid") {
        persistBooking(booking, { notify: false });
      }
    });

    return {
      ...data,
      items: mergeBookings(items),
    };
  },

  async getRecentPaidBookings(limit = 10) {
    const cachedPaidBookings = this.getCachedPaidBookings();

    try {
      const response = await fetch(`${BOOKING_API_BASE}/admin/bookings/recent-paid?limit=${limit}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await handleJsonResponse(response);
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalizedItems = writeBookingCache(items);

      return {
        ...data,
        items: normalizedItems.slice(0, limit),
      };
    } catch (error) {
      const message = String(error?.message || "").toLowerCase();
      const shouldFallback =
        error?.status === 404 ||
        error?.status === 403 ||
        message.includes("booking not found") ||
        message.includes("forbid") ||
        message.includes("failed to fetch") ||
        message.includes("networkerror") ||
        message.includes("load failed");

      if (!shouldFallback) {
        throw error;
      }

      try {
        const legacyResponse = await fetch(`${BOOKING_API_BASE}/bookings/recent-paid?limit=${limit}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });

        const data = await handleJsonResponse(legacyResponse);
        const items = Array.isArray(data?.items) ? data.items : [];
        const normalizedItems = writeBookingCache(items);

        return {
          ...data,
          items: normalizedItems.slice(0, limit),
        };
      } catch {
        try {
          const myBookings = await this.getMyBookings();
          const items = Array.isArray(myBookings?.items) ? myBookings.items : [];

          return {
            items: limitPaidBookings([...items, ...cachedPaidBookings], limit),
          };
        } catch {
          if (cachedPaidBookings.length > 0) {
            return {
              items: cachedPaidBookings.slice(0, limit),
            };
          }

          throw new Error("Unable to load attendee bookings right now.");
        }
      }
    }
  },

  async getBooking(bookingId) {
    const response = await fetch(`${BOOKING_API_BASE}/bookings/${bookingId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return handleJsonResponse(response);
  },

  async getTicket(bookingId) {
    const response = await fetch(`${BOOKING_API_BASE}/bookings/${bookingId}/ticket`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return handleJsonResponse(response);
  },

  async downloadTicket(bookingId) {
    const response = await fetch(`${BOOKING_API_BASE}/bookings/${bookingId}/ticket/download`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || "Unable to download ticket.");
    }

    const blob = await response.blob();
    const fileName = getDownloadFileName(response);
    triggerDownload(blob, fileName);
    return { fileName };
  },
};

export default BookingAPI;
