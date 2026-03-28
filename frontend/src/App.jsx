import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { EventProvider } from "./context/EventContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/auth/login";
import Register from "./pages/auth/Register";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventListing from "./pages/EventListing";
import CreateEvent from "./pages/CreateEvent";
import MyEvents from "./pages/MyEvents";
import Privacy from "./pages/Privacy";
import MyBookings from "./pages/MyBookings";
import Terms from "./pages/Terms";
import Venues from "./pages/Venues";
import Vendors from "./pages/Vendors";
import VenueDetails from "./pages/VenueDetails";
import Attendees from "./pages/Attendees";
import UserProfile from "./pages/UserProfile";
import EventDetails from "./pages/EventDetails";
import BookingCheckout from "./pages/BookingCheckout";
import BookingTicket from "./pages/BookingTicket";
import BudgetManagement from "./pages/BudgetManagement";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms-and-conditions" element={<Terms />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/event-listing"
              element={
                <ProtectedRoute>
                  <EventListing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/new"
              element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-events"
              element={
                <ProtectedRoute>
                  <MyEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <EventDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout/:eventId"
              element={
                <ProtectedRoute>
                  <BookingCheckout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:bookingId/ticket"
              element={
                <ProtectedRoute>
                  <BookingTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id/edit"
              element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venues"
              element={
                <ProtectedRoute requiredRoles={["customer", "organizer", "admin"]}>
                  <Venues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venues/:id"
              element={
                <ProtectedRoute requiredRoles={["customer", "organizer", "admin"]}>
                  <VenueDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute>
                  <Vendors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendees"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Attendees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/budgets"
              element={
                <ProtectedRoute requiredRole="admin">
                  <BudgetManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Home />} />
          </Routes>
        </EventProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
