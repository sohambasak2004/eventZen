import VenueVendorAPI from "./venueVendorApi.js";
import EventAPI from "./eventApi.js";

const STORAGE_KEYS = {
  ATTENDEES: "ems_attendees",
};

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

if (!localStorage.getItem(STORAGE_KEYS.ATTENDEES)) {
  writeStorage(STORAGE_KEYS.ATTENDEES, seedAttendees);
}

const API = {
  auth: VenueVendorAPI.auth,
  venues: VenueVendorAPI.venues,
  vendors: VenueVendorAPI.vendors,
  events: EventAPI.events,

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
          item.eventName === payload.eventName,
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

      if (index === -1) {
        throw new Error("Attendee not found.");
      }

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
