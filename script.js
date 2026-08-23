document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const contactForm = document.querySelector("#contact-form");
  const formStatus = document.querySelector("#form-status");
  const startedAt = Date.now();

  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const formData = new FormData(contactForm);
      const honeypot = String(formData.get("website") || "").trim();

      if (honeypot) {
        return;
      }

      if (Date.now() - startedAt < 2500) {
        if (formStatus) {
          formStatus.textContent = "Please take a moment to review your message and try again.";
        }
        return;
      }

      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const company = String(formData.get("company") || "").trim();
      const need = String(formData.get("need") || "").trim();
      const message = String(formData.get("message") || "").trim();

      if (!name || !email || !need || !message) {
        if (formStatus) {
          formStatus.textContent = "Please complete the required fields.";
        }
        return;
      }

      const destination = [
        99, 114, 121, 115, 116, 97, 108, 119, 97, 116, 115, 111, 110,
        46, 97, 105, 64, 103, 109, 97, 105, 108, 46, 99, 111, 109
      ].map((code) => String.fromCharCode(code)).join("");

      const subject = `Portfolio inquiry from ${name}`;
      const body = [
        `Name: ${name}`,
        `Email: ${email}`,
        company ? `Company: ${company}` : "Company: Not provided",
        `What they need help with: ${need}`,
        "",
        "Message:",
        message
      ].join("\n");

      const mailto = `mailto:${destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      if (formStatus) {
        formStatus.textContent = "Opening your email app with the message prepared. Review it, then press Send.";
      }

      window.location.href = mailto;
    });
  }
});
