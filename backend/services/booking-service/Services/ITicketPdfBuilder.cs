using EventZen.BookingService.Models;

namespace EventZen.BookingService.Services;

public interface ITicketPdfBuilder
{
    byte[] Build(BookingRecord booking);
}
