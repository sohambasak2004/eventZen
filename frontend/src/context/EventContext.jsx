/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import EventAPI from "../services/eventApi";
import { useAuth } from "./AuthContext";
import { hasRole } from "../utils/roles";

const EventContext = createContext(null);

export function EventProvider({ children }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await EventAPI.events.list(
        hasRole(user, "admin") ? { visibility: "all" } : {},
      );
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    refreshEvents();
  }, [user, refreshEvents]);

  const createEvent = useCallback(async (payload) => {
    const created = await EventAPI.events.create(payload);
    setEvents((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateEvent = useCallback(async (id, payload) => {
    const updated = await EventAPI.events.update(id, payload);
    setEvents((prev) =>
      prev.map((item) => (item.id === id ? updated : item)),
    );
    return updated;
  }, []);

  const deleteEvent = useCallback(async (id) => {
    try {
      await EventAPI.events.remove(id);
      setEvents((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete event:", error);
      throw error; // Re-throw so the UI can handle it
    }
  }, []);

  const getEventById = useCallback((id) =>
    events.find((item) => item.id === id) || null,
    [events]
  );

  const value = useMemo(
    () => ({
      events,
      isLoading,
      refreshEvents,
      createEvent,
      updateEvent,
      deleteEvent,
      getEventById,
    }),
    [events, isLoading, refreshEvents, createEvent, updateEvent, deleteEvent, getEventById],
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);

  if (!context) {
    throw new Error("useEvents must be used inside EventProvider");
  }

  return context;
}
