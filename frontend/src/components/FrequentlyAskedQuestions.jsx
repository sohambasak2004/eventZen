const faqs = [
  {
    question: "What can I manage with EventZen?",
    answer:
      "You can organize events, track attendees, monitor budgets, and keep venues and vendors connected in one workflow.",
  },
  {
    question: "Is EventZen useful for both small and large events?",
    answer:
      "Yes. EventZen is designed to support everything from focused workshops to larger conferences with more moving parts.",
  },
  {
    question: "Can my team monitor event budgets in real time?",
    answer:
      "Yes. Budget tracking helps your team stay aware of totals, changes, and spending visibility while planning moves forward.",
  },
  {
    question: "Do attendees and event details stay in one place?",
    answer:
      "Yes. EventZen keeps attendance, schedules, locations, and planning details organized together so updates are easier to manage.",
  },
];

function FrequentlyAskedQuestions() {
  return (
    <section className="faq-section" aria-labelledby="faq-title">
      <div className="faq-header">
        <p className="eyebrow">FAQs</p>
        <h2 id="faq-title">Answers to common planning questions.</h2>
        <p className="faq-copy">
          Everything your team needs to understand the basics before creating
          and managing events in EventZen.
        </p>
      </div>

      <div className="faq-list">
        {faqs.map((faq) => (
          <details key={faq.question} className="faq-item">
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default FrequentlyAskedQuestions;
