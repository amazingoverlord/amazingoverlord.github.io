// contact_form.js
// Handles the About page contact form submission via EmailJS.
// Requires the EmailJS SDK to already be loaded and initialized on the page:
//   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
//   <script>emailjs.init("YOUR_PUBLIC_KEY");</script>

(function () {
  const form = document.getElementById('form');
  const btn = document.getElementById('button');

  if (!form || !btn) return; // page doesn't have the contact form; do nothing

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    btn.value = 'Sending...';

    const serviceID = 'service_fxxor7q';
    const templateID = 'template_mqtklbv';

    emailjs.sendForm(serviceID, templateID, form).then(
      () => {
        btn.value = 'Send Email';
        alert('Sent!');
      },
      (err) => {
        btn.value = 'Send Email';
        alert(JSON.stringify(err));
      }
    );
  });
})();
