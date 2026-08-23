document.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();

  const contactForm = document.querySelector("#contact-form");
  const formStatus = document.querySelector("#form-status");
  const submitButton = contactForm?.querySelector('button[type="submit"]');
  const startedAt = Date.now();

  if (submitButton) submitButton.textContent = "Send Message";

  if (!contactForm) return;

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const honeypot = String(formData.get("website") || "").trim();

    if (honeypot) return;

    if (Date.now() - startedAt < 2500) {
      if (formStatus) {
        formStatus.textContent = "Please take a moment to review your message and try again.";
      }
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      need: String(formData.get("need") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: honeypot,
      turnstileToken: window.turnstileToken || ""
    };

    if (!payload.name || !payload.email || !payload.need || !payload.message) {
      if (formStatus) formStatus.textContent = "Please complete the required fields.";
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }
    if (formStatus) formStatus.textContent = "Sending your message securely...";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Message could not be sent.");
      }

      contactForm.reset();
      if (formStatus) {
        formStatus.textContent = result.message || "Thanks — your message was sent successfully.";
      }
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = error.message || "I couldn't send your message right now. Please try again in a few minutes.";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    }
  });
});

// Preview redeploy trigger after environment variable setup.
