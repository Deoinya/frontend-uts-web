(function () {
  function bindLoginForm(form) {
    if (form.dataset.authBound === 'true') return;
    form.dataset.authBound = 'true';

    window.App.bindRealtimeValidation(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!window.App.validateForm(form)) return;

      window.App.setFormMessage(form, '');
      window.App.setSubmitting(form, true);

      try {
        const response = await window.App.apiRequest('login.php', {
          method: 'POST',
          body: window.App.formToPayload(form),
        });

        window.App.setFormMessage(
          form,
          response?.message || 'Login berhasil.',
          'success',
        );

        if (form.dataset.redirect) {
          window.setTimeout(
            () => window.App.navigate(form.dataset.redirect),
            700,
          );
        }
      } catch (error) {
        window.App.setFormMessage(
          form,
          error.message || 'Login gagal. Silakan coba lagi.',
          'error',
        );
      } finally {
        window.App.setSubmitting(form, false);
      }
    });
  }

  function bindRegisterForm(form) {
    if (form.dataset.authBound === 'true') return;
    form.dataset.authBound = 'true';

    window.App.bindRealtimeValidation(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!window.App.validateForm(form)) return;

      window.App.setFormMessage(form, '');
      window.App.setSubmitting(form, true);

      try {
        const response = await window.App.apiRequest('register.php', {
          method: 'POST',
          body: window.App.formToPayload(form),
        });

        window.App.setFormMessage(
          form,
          response?.message || 'Registrasi berhasil.',
          'success',
        );
        form.reset();

        if (form.dataset.redirect) {
          window.setTimeout(
            () => window.App.navigate(form.dataset.redirect),
            700,
          );
        }
      } catch (error) {
        window.App.setFormMessage(
          form,
          error.message || 'Registrasi gagal. Silakan coba lagi.',
          'error',
        );
      } finally {
        window.App.setSubmitting(form, false);
      }
    });
  }

  function initAuth() {
    if (!window.App) return;

    const loginForm =
      document.getElementById('form-login') || document.getElementById('loginForm');
    const registerForm =
      document.getElementById('form-register') ||
      document.getElementById('registerForm');

    if (loginForm) bindLoginForm(loginForm);
    if (registerForm) bindRegisterForm(registerForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth, { once: true });
  } else {
    initAuth();
  }

  document.addEventListener('app:navigated', initAuth);
})();
