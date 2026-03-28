import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Footer from "../components/layout/Footer";
import BookingAPI from "../services/bookingApi";

function BookingTicket() {
  const { bookingId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTicket = async () => {
      try {
        setIsLoading(true);
        const response = await BookingAPI.getTicket(bookingId);
        if (isMounted) {
          setTicket(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Unable to load ticket.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTicket();

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await BookingAPI.downloadTicket(bookingId);
    } catch (err) {
      setError(err.message || "Unable to download ticket.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="booking-shell-page">
      <div className="booking-window booking-window-center">
        <div className="booking-panel booking-ticket-card">
          {isLoading ? (
            <>
              <div className="loader-orb"></div>
              <p>Loading ticket...</p>
            </>
          ) : error ? (
            <>
              <h1>Ticket unavailable</h1>
              <p>{error}</p>
            </>
          ) : (
            <>
              <h1>Your ticket is ready</h1>
              <p>Ticket code: <strong>{ticket.ticketCode}</strong></p>
              <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? "Downloading..." : "Download Ticket"}
              </button>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default BookingTicket;
