using System.Globalization;
using System.Text;
using EventZen.BookingService.Models;

namespace EventZen.BookingService.Services;

public sealed class TicketPdfBuilder : ITicketPdfBuilder
{
    public byte[] Build(BookingRecord booking)
    {
        var lines = new[]
        {
            new TicketLine(booking.Event.Title, 24),
            new TicketLine("EventZen booking confirmed", 14),
            TicketLine.Spacer,
            new TicketLine($"Booked By: {booking.User.Name}"),
            new TicketLine($"Location: {booking.Event.Location}"),
            new TicketLine($"Date: {booking.Event.Date}"),
            new TicketLine($"Time: {booking.Event.Time}"),
            new TicketLine($"Payment Status: {booking.Payment.Status}"),
            new TicketLine($"Paid At: {booking.Payment.PaidAt.UtcDateTime:yyyy-MM-dd HH:mm:ss 'UTC'}"),
            TicketLine.Spacer,
            new TicketLine($"Ticket ID: {booking.Ticket.TicketCode}", 18),
            new TicketLine($"Ticket Code: {booking.Ticket.TicketCode}"),
            new TicketLine($"Booking ID: {booking.BookingId}"),
            TicketLine.Spacer,
            new TicketLine("Show this ticket ID at entry for verification.")
        };

        return PdfDocument.Create(lines);
    }

    private sealed record TicketLine(string Text, int FontSize = 12, bool IsSpacer = false)
    {
        public static TicketLine Spacer => new(string.Empty, 12, true);
    }

    private static class PdfDocument
    {
        private static readonly Encoding PdfEncoding = Encoding.ASCII;
        private const string NewLine = "\n";

        public static byte[] Create(IEnumerable<TicketLine> lines)
        {
            var contentBytes = PdfEncoding.GetBytes(BuildContentStream(lines));
            using var stream = new MemoryStream();
            using var writer = new BinaryWriter(stream, PdfEncoding, leaveOpen: true);

            WriteAscii(writer, "%PDF-1.4\n");
            writer.Write(new byte[] { 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A });

            var offsets = new List<long> { 0 };
            WriteObject(writer, offsets, 1, "<< /Type /Catalog /Pages 2 0 R >>");
            WriteObject(writer, offsets, 2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
            WriteObject(writer, offsets, 3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
            WriteObject(writer, offsets, 4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

            offsets.Add(stream.Position);
            WriteAscii(writer, $"5 0 obj{NewLine}");
            WriteAscii(writer, $"<< /Length {contentBytes.Length} >>{NewLine}");
            WriteAscii(writer, $"stream{NewLine}");
            writer.Write(contentBytes);
            WriteAscii(writer, $"{NewLine}endstream{NewLine}");
            WriteAscii(writer, $"endobj{NewLine}");

            var xrefOffset = stream.Position;
            WriteAscii(writer, $"xref{NewLine}");
            WriteAscii(writer, $"0 {offsets.Count}{NewLine}");
            WriteAscii(writer, $"0000000000 65535 f {NewLine}");

            foreach (var offset in offsets.Skip(1))
            {
                WriteAscii(writer, $"{offset.ToString("D10", CultureInfo.InvariantCulture)} 00000 n {NewLine}");
            }

            WriteAscii(writer, $"trailer{NewLine}");
            WriteAscii(writer, $"<< /Size {offsets.Count} /Root 1 0 R >>{NewLine}");
            WriteAscii(writer, $"startxref{NewLine}");
            WriteAscii(writer, $"{xrefOffset.ToString(CultureInfo.InvariantCulture)}{NewLine}");
            WriteAscii(writer, "%%EOF");
            writer.Flush();

            return stream.ToArray();
        }

        private static void WriteObject(BinaryWriter writer, List<long> offsets, int objectNumber, string body)
        {
            offsets.Add(writer.BaseStream.Position);
            WriteAscii(writer, $"{objectNumber} 0 obj{NewLine}");
            WriteAscii(writer, $"{body}{NewLine}");
            WriteAscii(writer, $"endobj{NewLine}");
        }

        private static string BuildContentStream(IEnumerable<TicketLine> lines)
        {
            var builder = new StringBuilder();
            var y = 740;

            foreach (var line in lines)
            {
                if (y < 72)
                {
                    break;
                }

                if (line.IsSpacer)
                {
                    y -= 14;
                    continue;
                }

                var safeText = EscapePdfText(ToPdfText(line.Text));
                builder.Append("BT\n");
                builder.Append(CultureInfo.InvariantCulture, $"/F1 {line.FontSize} Tf\n");
                builder.Append(CultureInfo.InvariantCulture, $"1 0 0 1 72 {y} Tm\n");
                builder.Append(CultureInfo.InvariantCulture, $"({safeText}) Tj\n");
                builder.Append("ET\n");

                y -= line.FontSize + 10;
            }

            return builder.ToString();
        }

        private static string ToPdfText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value.Normalize(NormalizationForm.FormKD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                builder.Append(character <= 0x7F ? character : '?');
            }

            return builder.ToString();
        }

        private static string EscapePdfText(string value) =>
            value
                .Replace("\\", "\\\\", StringComparison.Ordinal)
                .Replace("(", "\\(", StringComparison.Ordinal)
                .Replace(")", "\\)", StringComparison.Ordinal);

        private static void WriteAscii(BinaryWriter writer, string value) =>
            writer.Write(PdfEncoding.GetBytes(value));
    }
}
