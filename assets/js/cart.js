(function () {
  function bindCheckoutForm(form) {
    if (form.dataset.checkoutBound === 'true') return;
    form.dataset.checkoutBound = 'true';

    window.App.bindRealtimeValidation(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!window.App.validateForm(form)) return;

      window.App.setFormMessage(form, '');
      window.App.setSubmitting(form, true);

      try {
        const response = await window.App.apiRequest('checkout.php', {
          method: 'POST',
          body: window.App.formToPayload(form),
        });
        const total = response?.data?.total_cost;
        const message = response?.message || 'Transaksi berhasil diproses.';

        window.App.setFormMessage(
          form,
          total === undefined || total === null
            ? message
            : `${message} Total: ${window.App.formatCurrency(total)}.`,
          'success',
        );
        form.reset();

        if (form.dataset.redirect) {
          window.setTimeout(
            () => window.App.navigate(form.dataset.redirect),
            900,
          );
        }
      } catch (error) {
        window.App.setFormMessage(
          form,
          error.message || 'Transaksi gagal. Silakan coba lagi.',
          'error',
        );
      } finally {
        window.App.setSubmitting(form, false);
      }
    });
  }

  function initCheckout() {
    if (!window.App) return;

    const form =
      document.getElementById('form-transaksi') ||
      document.getElementById('checkoutForm') ||
      document.getElementById('loanForm') ||
      document.getElementById('transactionForm') ||
      document.querySelector('[data-checkout-form]');

    if (form) bindCheckoutForm(form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckout, { once: true });
  } else {
    initCheckout();
  }

  document.addEventListener('app:navigated', initCheckout);
})();
