(function () {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ROUTER_VIEW_SELECTOR = 'main#konten-utama, [data-router-view]';
  const API_BASE = (
    document.querySelector('meta[name="api-base"]')?.content ||
    'http://localhost:8000/api'
  ).replace(/\/+$/, '');

  let routerInitialized = false;
  let navigating = false;

  function normalizeName(name) {
    return String(name || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  function getFormType(form) {
    const id = normalizeName(form.id);

    if (id.includes('login')) return 'login';
    if (id.includes('register') || id.includes('daftar')) return 'register';
    if (
      form.hasAttribute('data-checkout-form') ||
      id.includes('checkout') ||
      id.includes('loan') ||
      id.includes('borrow') ||
      id.includes('pinjam') ||
      id.includes('transaksi')
    ) {
      return 'transaction';
    }

    return normalizeName(form.dataset.formType);
  }

  function findField(form, normalizedName) {
    return (
      Array.from(form.elements).find(
        (element) => element.name && normalizeName(element.name) === normalizedName,
      ) || null
    );
  }

  function humanizeName(name) {
    return String(name || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .trim();
  }

  function getFieldLabel(field) {
    if (field.dataset.label) return field.dataset.label;

    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label?.textContent.trim()) return label.textContent.trim();
    }

    const wrappingLabel = field.closest('label');
    if (wrappingLabel?.textContent.trim()) return wrappingLabel.textContent.trim();

    return humanizeName(field.name) || 'Kolom';
  }

  function getErrorElement(field) {
    const key = field.id || field.name;
    const container = field.closest('[data-field]') || field.parentElement;
    let error = field.id ? document.getElementById(`${field.id}-error`) : null;

    if (!error && container) {
      const containerErrors = Array.from(
        container.querySelectorAll('.error-message, .form__hint--error'),
      );

      error =
        containerErrors.find((element) => element.dataset.errorFor === key) ||
        (containerErrors.length === 1 ? containerErrors[0] : null);
    }

    if (
      !error &&
      field.nextElementSibling?.matches('.error-message, .form__hint--error')
    ) {
      error = field.nextElementSibling;
    }

    if (!error) {
      error = document.createElement('p');
      error.className = 'form__hint form__hint--error';
      error.dataset.errorFor = key;
      error.setAttribute('role', 'alert');
      error.hidden = true;

      if (field.type === 'checkbox' || field.type === 'radio') {
        const group = field.closest('.form__group');
        if (group) {
          group.insertAdjacentElement('afterend', error);
        } else {
          field.insertAdjacentElement('afterend', error);
        }
      } else {
        field.insertAdjacentElement('afterend', error);
      }
    }

    if (!error.id) {
      const formPrefix = normalizeName(field.form?.id) || 'form';
      const fieldKey = normalizeName(key) || 'field';
      error.id = `${formPrefix}-${fieldKey}-error`;
    }

    const describedBy = (field.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter(Boolean);

    if (!describedBy.includes(error.id)) {
      describedBy.push(error.id);
      field.setAttribute('aria-describedby', describedBy.join(' '));
    }

    return error;
  }

  function setFieldError(field, message) {
    const error = getErrorElement(field);
    error.textContent = message;
    error.hidden = !message;

    if (message) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
  }

  function getFieldRule(form, field) {
    const formType = getFormType(form);
    const name = normalizeName(field.name);
    const rule = {
      required: field.required || field.dataset.required === 'true',
      email: field.type === 'email' || name === 'email',
      minLength: field.minLength > 0 ? field.minLength : 0,
      min: field.min !== '' ? Number(field.min) : null,
      match: field.dataset.match || '',
      integer: field.dataset.integer === 'true' || field.step === '1',
    };

    if (formType === 'login') {
      if (name === 'email') {
        rule.required = true;
        rule.email = true;
      }
      if (name === 'password') rule.required = true;
    }

    if (formType === 'register') {
      if (['name', 'fullname', 'nama', 'namalengkap'].includes(name)) {
        rule.required = true;
      }
      if (name === 'email') {
        rule.required = true;
        rule.email = true;
      }
      if (name === 'password') {
        rule.required = true;
        rule.minLength = Math.max(rule.minLength, 6);
      }
      if (
        [
          'konfirmasi',
          'confirmpassword',
          'passwordconfirmation',
          'konfirmasipassword',
        ].includes(name)
      ) {
        rule.required = true;
        rule.match = 'password';
      }
    }

    if (formType === 'transaction') {
      rule.required = field.dataset.optional !== 'true';
      if (
        name.includes('rental') ||
        name.includes('duration') ||
        name.includes('durasi') ||
        name === 'days' ||
        name === 'hari'
      ) {
        rule.required = true;
        rule.min = rule.min === null ? 1 : Math.max(rule.min, 1);
        rule.integer = true;
      }
    }

    return rule;
  }

  function validateField(form, field) {
    if (
      !(field instanceof HTMLElement) ||
      !field.name ||
      field.disabled ||
      ['submit', 'button', 'reset', 'hidden', 'file'].includes(field.type)
    ) {
      return true;
    }

    const rule = getFieldRule(form, field);
    const value = field.value;
    const trimmed = value.trim();
    let message = '';

    if (rule.required && field.type === 'checkbox' && !field.checked) {
      message = normalizeName(field.name).includes('setuju')
        ? 'Persetujuan wajib dicentang.'
        : `${getFieldLabel(field)} wajib dicentang.`;
    } else if (rule.required && !trimmed) {
      message = `${getFieldLabel(field)} wajib diisi.`;
    } else if (trimmed && rule.email && !EMAIL_PATTERN.test(trimmed)) {
      message = 'Format email tidak valid.';
    } else if (value && rule.minLength && value.length < rule.minLength) {
      message = `${getFieldLabel(field)} minimal ${rule.minLength} karakter.`;
    } else if (
      trimmed &&
      rule.min !== null &&
      Number.isFinite(Number(value)) &&
      Number(value) < rule.min
    ) {
      message = `${getFieldLabel(field)} minimal ${rule.min}.`;
    } else if (trimmed && rule.integer && !Number.isInteger(Number(value))) {
      message = `${getFieldLabel(field)} harus berupa bilangan bulat.`;
    } else if (trimmed && rule.match) {
      const target = findField(form, normalizeName(rule.match));
      if (target && value !== target.value) {
        message = 'Konfirmasi password tidak cocok.';
      }
    }

    setFieldError(field, message);
    return !message;
  }

  function validateForm(form) {
    const fields = Array.from(form.elements).filter((field) => field.name);
    const results = fields.map((field) => validateField(form, field));
    const firstInvalid = fields.find(
      (field) => field.getAttribute('aria-invalid') === 'true',
    );

    if (firstInvalid) firstInvalid.focus();
    return !results.includes(false);
  }

  function bindRealtimeValidation(form) {
    if (!form || form.dataset.validationBound === 'true') return;
    form.dataset.validationBound = 'true';
    form.noValidate = true;

    form.addEventListener('focusout', (event) => {
      const field = event.target;
      if (field instanceof HTMLElement && field.name) validateField(form, field);
    });

    form.addEventListener('input', (event) => {
      const field = event.target;
      if (!(field instanceof HTMLElement) || !field.name) return;

      if (field.getAttribute('aria-invalid') === 'true') {
        validateField(form, field);
      }

      if (normalizeName(field.name) === 'password') {
        const confirmation =
          findField(form, 'konfirmasi') ||
          findField(form, 'confirmpassword') ||
          findField(form, 'passwordconfirmation') ||
          findField(form, 'konfirmasipassword');

        if (confirmation && confirmation.getAttribute('aria-invalid') === 'true') {
          validateField(form, confirmation);
        }
      }
    });
  }

  function formToPayload(form) {
    const payload = {};
    const formData = new FormData(form);

    for (const [name, rawValue] of formData.entries()) {
      const normalized = normalizeName(name);
      if (
        normalized.startsWith('confirm') ||
        normalized.startsWith('konfirmasi') ||
        normalized.endsWith('confirmation')
      ) {
        continue;
      }

      const field = form.elements.namedItem(name);
      let value = rawValue;

      if (typeof value === 'string') {
        if (field instanceof HTMLElement && field.type === 'number' && value !== '') {
          value = Number(value);
        } else if (!(field instanceof HTMLElement) || field.type !== 'password') {
          value = value.trim();
        }
      }

      payload[name] = value;
    }

    return payload;
  }

  function setFormMessage(form, message, state = 'info') {
    let element = form.querySelector('[data-form-message], .form__error');

    if (!element) {
      element = document.createElement('p');
      element.className = 'form__error';
      form.prepend(element);
    }

    element.dataset.formMessage = '';
    element.dataset.state = state;
    element.setAttribute('role', state === 'error' ? 'alert' : 'status');
    element.textContent = message || '';
    element.hidden = !message;

    if (state === 'error') {
      element.classList.remove('form__hint');
      element.classList.add('form__error');
    } else {
      element.classList.remove('form__error');
      element.classList.add('form__hint');
    }
  }

  function setSubmitting(form, isSubmitting) {
    const submitButton = form.querySelector(
      'button[type="submit"], input[type="submit"], button:not([type])',
    );
    form.setAttribute('aria-busy', String(isSubmitting));

    if (!submitButton) return;

    if (isSubmitting) {
      submitButton.dataset.originalHtml = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = submitButton.dataset.loadingText || 'Memproses...';
      return;
    }

    submitButton.disabled = false;

    if (submitButton.dataset.originalHtml !== undefined) {
      submitButton.innerHTML = submitButton.dataset.originalHtml;
      delete submitButton.dataset.originalHtml;
    }
  }

  async function apiRequest(endpoint, options = {}) {
    const { method = 'GET', body, headers = {} } = options;
    const url = /^https?:\/\//i.test(endpoint)
      ? endpoint
      : `${API_BASE}/${String(endpoint).replace(/^\/+/, '')}`;
    const config = {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    };

    if (body instanceof FormData || body instanceof URLSearchParams) {
      config.body = body;
    } else if (body && typeof body === 'object') {
      const params = new URLSearchParams();

      Object.entries(body).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, String(item)));
        } else {
          params.set(key, String(value));
        }
      });

      config.body = params;
    }

    const response = await fetch(url, config);
    const rawText = await response.text();
    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        if (!response.ok) {
          throw new Error(`Permintaan gagal (${response.status}).`);
        }
        throw new Error('Respons server bukan JSON yang valid.');
      }
    }

    if (!response.ok || data?.status === 'error' || data?.success === false) {
      const error = new Error(
        data?.message || data?.error || `Permintaan gagal (${response.status}).`,
      );
      error.data = data;
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function formatCurrency(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return String(value ?? '');

    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function getRouterView() {
    return document.querySelector(ROUTER_VIEW_SELECTOR);
  }

  function isRouterLink(link, event) {
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return false;
    }

    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download') || link.dataset.noRouter === 'true') return false;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) {
      return false;
    }

    const lastSegment = url.pathname.split('/').pop() || '';
    return lastSegment === '' || /\.html?$/i.test(lastSegment) || !lastSegment.includes('.');
  }

  function updateActiveNav(url) {
    const target = new URL(url, location.href);

    document.querySelectorAll('.main-nav__link').forEach((link) => {
      const linkUrl = new URL(link.href, location.href);
      const isCurrent =
        linkUrl.pathname === target.pathname && linkUrl.hash === target.hash;

      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function scrollToHash(hash) {
    if (!hash) return;

    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadPage(url, pushState) {
    if (navigating) return;

    const targetUrl = new URL(url, location.href);
    const currentView = getRouterView();
    if (!currentView) {
      window.location.assign(targetUrl.href);
      return;
    }

    navigating = true;
    currentView.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(targetUrl.href, {
        headers: { Accept: 'text/html' },
      });
      if (!response.ok) throw new Error('Gagal memuat halaman.');

      const html = await response.text();
      const documentPage = new DOMParser().parseFromString(html, 'text/html');
      const nextView = documentPage.querySelector(ROUTER_VIEW_SELECTOR);

      if (!nextView) {
        window.location.assign(targetUrl.href);
        return;
      }

      currentView.innerHTML = nextView.innerHTML;
      document.title = documentPage.title || document.title;
      document.body.className = documentPage.body.className;
      updateActiveNav(targetUrl.href);

      if (pushState) {
        history.pushState({ url: targetUrl.href }, '', targetUrl.href);
      }

      if (targetUrl.hash) {
        scrollToHash(targetUrl.hash);
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }

      if (typeof currentView.animate === 'function') {
        currentView.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 180,
          easing: 'ease-in',
        });
      }

      document.dispatchEvent(
        new CustomEvent('app:navigated', { detail: { url: targetUrl.href } }),
      );
    } catch {
      window.location.assign(targetUrl.href);
    } finally {
      currentView.removeAttribute('aria-busy');
      navigating = false;
    }
  }

  function navigate(url, pushState = true) {
    return loadPage(new URL(url, location.href).href, pushState);
  }

  function initRouter() {
    if (routerInitialized || !getRouterView()) return;
    routerInitialized = true;

    document.addEventListener('click', (event) => {
      const link =
        event.target instanceof Element ? event.target.closest('a[href]') : null;

      if (!isRouterLink(link, event)) return;

      event.preventDefault();
      navigate(link.href, true);
    });

    window.addEventListener('popstate', () => {
      loadPage(location.href, false);
    });
  }

  window.App = {
    apiRequest,
    bindRealtimeValidation,
    validateForm,
    validateField,
    setFieldError,
    formToPayload,
    setFormMessage,
    setSubmitting,
    formatCurrency,
    navigate,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRouter, { once: true });
  } else {
    initRouter();
  }
})();
