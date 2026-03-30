import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Footer from "../components/layout/Footer";
import BookingAPI from "../services/bookingApi";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const checkoutSessionRequests = new Map();

const loadCheckoutSession = async (eventId) => {
  const activeRequest = checkoutSessionRequests.get(eventId);
  if (activeRequest) {
    return activeRequest;
  }

  const request = BookingAPI.createCheckoutSession(eventId)
    .then((response) => {
      checkoutSessionRequests.delete(eventId);
      return response;
    })
    .catch((error) => {
      checkoutSessionRequests.delete(eventId);
      throw error;
    });

  checkoutSessionRequests.set(eventId, request);
  return request;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function BookingCheckout() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await loadCheckoutSession(eventId);
        if (isMounted) {
          setSession(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to start checkout.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const expiresLabel = useMemo(() => {
    if (!session?.expiresAt) {
      return "";
    }

    return new Date(session.expiresAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [session]);

  const notifyParent = (bookingId) => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: "eventzen-booking-success", bookingId, eventId },
        window.location.origin,
      );
    }
  };

  const handlePayNow = async () => {
    if (!session) {
      return;
    }

    try {
      setIsPaying(true);
      setError("");
      await wait(1200);
      const response = await BookingAPI.confirmPayment(session.checkoutSessionId, {
        paymentMethod: "dummy_razorpay_cash",
      });
      checkoutSessionRequests.delete(eventId);
      setBooking(response.booking);
      notifyParent(response.booking.bookingId);
    } catch (err) {
      setError(err.message || "Payment failed.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!booking) {
      return;
    }

    try {
      setIsDownloading(true);
      await BookingAPI.downloadTicket(booking.bookingId);
    } catch (err) {
      setError(err.message || "Unable to download ticket.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="booking-shell-page">
        <div className="booking-window booking-window-center">
          <div className="loader-orb"></div>
          <p>Preparing your Razorpay checkout...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !session && !booking) {
    return (
      <div className="booking-shell-page">
        <div className="booking-window booking-window-center">
          <div className="booking-error-card">
            <h1>Checkout unavailable</h1>
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="booking-shell-page">
      <div className="booking-window">
        <div className="booking-shell">
          <section className="booking-hero">
            <span className="booking-badge">Dummy Razorpay Cash</span>
            <h1>{booking ? "Payment successful" : "Secure event checkout"}</h1>
            <p>
              {booking
                ? "Your ticket is ready. Download it now and keep the unique code handy."
                : "This popup simulates a Razorpay-style payment window for local development."}
            </p>
          </section>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          {booking ? (
            <section className="booking-panel">
              <div className="booking-summary-grid">
                <div>
                  <span>Event</span>
                  <strong>{booking.event.title}</strong>
                </div>
                <div>
                  <span>Paid Status</span>
                  <strong>{booking.payment.status}</strong>
                </div>
                <div>
                  <span>Paid At</span>
                  <strong>{new Date(booking.payment.paidAt).toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span>Unique Ticket Code</span>
                  <strong>{booking.ticket.ticketCode}</strong>
                </div>
              </div>

              <div className="booking-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadTicket}
                  disabled={isDownloading}
                >
                  {isDownloading ? "Downloading..." : "Download Ticket"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => window.close()}>
                  Close Window
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="booking-panel">
                <div className="booking-summary-grid">
                  <div>
                    <span>Merchant</span>
                    <strong>{session?.paymentWindow?.merchantName}</strong>
                  </div>
                  <div>
                    <span>Reference</span>
                    <strong
                      className="booking-reference-value"
                      title={session?.paymentWindow?.paymentReference}
                    >
                      {session?.paymentWindow?.paymentReference}
                    </strong>
                  </div>
                  <div>
                    <span>Expires At</span>
                    <strong>{expiresLabel}</strong>
                  </div>
                  <div>
                    <span>Mode</span>
                    <strong>Cash Simulation</strong>
                  </div>
                </div>
              </section>

              <section className="booking-panel">
                <div className="booking-order-head">
                  <div>
                    <span>Booking for</span>
                    <h2>{session?.event?.title}</h2>
                  </div>
                  <strong>{formatCurrency(session?.amount)}</strong>
                </div>

                <div className="booking-detail-list">
                  <div>
                    <span>Attendee</span>
                    <strong>{session?.buyer?.name}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{session?.buyer?.email}</strong>
                  </div>
                  <div>
                    <span>Venue</span>
                    <strong>{session?.event?.location}</strong>
                  </div>
                  <div>
                    <span>Date & Time</span>
                    <strong>{`${session?.event?.date} | ${session?.event?.time}`}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary booking-pay-button"
                  onClick={handlePayNow}
                  disabled={isPaying}
                >
                  {isPaying ? "Confirming payment..." : `Pay ${formatCurrency(session?.amount)}`}
                </button>
              </section>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default BookingCheckout;
