(function () {
  const CART_STORAGE_KEY = 'perpustakaan_cart_v1';
  const USER_STORAGE_KEY = 'perpustakaan_user_v1';
  const MAX_CART_ITEMS = 3;
  const ITEMS_PER_PAGE = 6; // Ubah jumlah buku per halaman sesuai kebutuhan

  let currentPage = 1;

  // --- MANAJEMEN USER ---
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function logoutUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
    updateAuthUI();
    syncCheckoutPayload();
    alert('Anda telah keluar dari akun.');
    if (window.App?.navigate) {
      window.App.navigate('login.html');
    } else {
      window.location.href = 'login.html';
    }
  }

  function updateAuthUI() {
    const user = getCurrentUser();
    const navList = document.querySelector('.main-nav__list');
    if (!navList) return;

    const authLink = navList.querySelector('a[href="login.html"]');
    const existingStatus = document.getElementById('nav-user-status');

    if (user) {
      if (authLink && authLink.parentElement) {
        authLink.parentElement.hidden = true;
      }

      let statusItem = existingStatus;
      if (!statusItem) {
        statusItem = document.createElement('li');
        statusItem.id = 'nav-user-status';
        statusItem.style.cssText = 'display:flex;align-items:center;gap:0.5rem;';
        navList.append(statusItem);
      }

      const memberBadge = user.member_type ? ` (${user.member_type})` : '';
      statusItem.innerHTML = `
        <span class="main-nav__link" style="font-weight:600;">Halo, ${user.name}${memberBadge}</span>
        <button type="button" id="btn-logout" class="btn btn--ghost" style="padding:0.25rem 0.6rem;font-size:0.85rem;">Keluar</button>
      `;

      statusItem.querySelector('#btn-logout')?.addEventListener('click', logoutUser);

      const mainContainer = document.querySelector('main#konten-utama > .container, main#konten-utama');
      let banner = document.getElementById('user-session-banner');
      if (mainContainer && !banner) {
        banner = document.createElement('div');
        banner.id = 'user-session-banner';
        banner.style.cssText =
          'background:#ecfdf5;border:1px solid #10b981;color:#065f46;padding:0.65rem 1rem;border-radius:8px;margin:0.75rem auto;max-width:1120px;font-size:0.9rem;';
        mainContainer.prepend(banner);
      }
      if (banner) {
        banner.textContent = `Masuk sebagai ${user.name} (${user.email}) • Status Keanggotaan: ${user.member_type || 'Reguler'}`;
      }
    } else {
      if (authLink && authLink.parentElement) {
        authLink.parentElement.hidden = false;
      }
      if (existingStatus) existingStatus.remove();
      document.getElementById('user-session-banner')?.remove();
    }
  }

  // --- MANAJEMEN KERANJANG (LOCALSTORAGE) ---
  function getCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    updateCartBadge();
    syncCheckoutPayload();
  }

  function updateCartBadge() {
    const count = getCart().length;
    document.querySelectorAll('#cart-count').forEach((badge) => {
      badge.textContent = String(count);
    });
  }

  function addToCart(book) {
    const cart = getCart();

    if (cart.some((item) => String(item.id) === String(book.id))) {
      alert(`"${book.title}" sudah ada di keranjang peminjaman.`);
      return;
    }

    if (cart.length >= MAX_CART_ITEMS) {
      alert(`Maksimal peminjaman adalah ${MAX_CART_ITEMS} e-book sekaligus.`);
      return;
    }

    cart.push(book);
    saveCart(cart);
    alert(`"${book.title}" berhasil ditambahkan ke keranjang!`);
  }

  function removeFromCart(bookId) {
    const updated = getCart().filter((item) => String(item.id) !== String(bookId));
    saveCart(updated);
    renderCartPage();
  }

  // --- SINKRONISASI DATA BUKU KE FORM CHECKOUT ---
  function syncCheckoutPayload() {
    const form = document.getElementById('form-transaksi');
    if (!form) return;

    form.querySelectorAll('input[data-cart-hidden]').forEach((el) => el.remove());

    const cart = getCart();

    const hiddenIds = document.createElement('input');
    hiddenIds.type = 'hidden';
    hiddenIds.name = 'book_ids';
    hiddenIds.value = cart.map((book) => String(book.id)).join(',');
    hiddenIds.dataset.cartHidden = 'true';
    form.append(hiddenIds);

    const totalCost = cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const hiddenTotal = document.createElement('input');
    hiddenTotal.type = 'hidden';
    hiddenTotal.name = 'estimated_cost';
    hiddenTotal.value = String(totalCost);
    hiddenTotal.dataset.cartHidden = 'true';
    form.append(hiddenTotal);

    const currentUser = getCurrentUser();
    if (currentUser) {
      const userFields = {
        user_id: currentUser.id || 'M-GUEST',
        user_name: currentUser.name || 'Anggota',
        user_email: currentUser.email || '',
        member_type: currentUser.member_type || 'Reguler',
      };

      Object.entries(userFields).forEach(([key, val]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(val);
        input.dataset.cartHidden = 'true';
        form.append(input);
      });
    }
  }

  // --- RENDER HALAMAN KERANJANG (cart.html) ---
  function renderCartPage() {
    const listContainer = document.getElementById('daftar-cart');
    const emptyState = document.getElementById('cart-empty');
    const itemCountOutput = document.getElementById('jumlah-item');

    if (!listContainer) return;

    const cart = getCart();
    if (itemCountOutput) itemCountOutput.textContent = String(cart.length);

    if (cart.length === 0) {
      listContainer.replaceChildren();
      if (emptyState) emptyState.hidden = false;
      syncCheckoutPayload();
      return;
    }

    if (emptyState) emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    cart.forEach((book) => {
      const article = document.createElement('article');
      article.className = 'cart-item';
      article.dataset.id = String(book.id);

      const coverSrc = book.cover || 'public/images/covers/buku-01.jpg';
      const priceText =
        book.price && window.App?.formatCurrency
          ? ` • ${window.App.formatCurrency(book.price)}`
          : '';

      article.innerHTML = `
        <figure class="cart-item__cover">
          <img src="${coverSrc}" alt="Sampul buku ${book.title}" width="80" height="107" loading="lazy">
        </figure>
        <div class="cart-item__body">
          <h3 class="cart-item__title">${book.title}</h3>
          <p class="cart-item__author">${book.author}</p>
          <p class="cart-item__meta"><span class="tag">${book.category}</span>${priceText}</p>
        </div>
        <footer class="cart-item__footer">
          <button class="btn btn--ghost" type="button" data-aksi="hapus" aria-label="Hapus ${book.title} dari cart">Hapus</button>
        </footer>
      `;
      fragment.append(article);
    });

    listContainer.replaceChildren(fragment);
    syncCheckoutPayload();
  }

  // --- KALKULASI OTOMATIS TANGGAL KEMBALI (+7 HARI) ---
  function initDateCalculator() {
    const startDateInput = document.getElementById('tanggal-pinjam');
    const dueDateOutput = document.getElementById('tanggal-kembali');

    if (!startDateInput || !dueDateOutput) return;

    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;

    function updateDueDate() {
      if (!startDateInput.value) {
        dueDateOutput.textContent = '-';
        return;
      }

      const start = new Date(`${startDateInput.value}T00:00:00`);
      if (Number.isNaN(start.getTime())) {
        dueDateOutput.textContent = '-';
        return;
      }

      start.setDate(start.getDate() + 7);
      dueDateOutput.textContent = start.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    if (startDateInput.dataset.dateBound !== 'true') {
      startDateInput.dataset.dateBound = 'true';
      startDateInput.addEventListener('change', updateDueDate);
    }

    updateDueDate();
  }

  // --- PAGINATION + FILTER + SORTING KATALOG ---
  function renderPaginationControls(totalItems, totalPages) {
    const nav = document.querySelector('#pagination-katalog, .pagination');
    if (!nav) return;

    let list = nav.querySelector('.pagination__list');
    if (!list) {
      list = document.createElement('ul');
      list.className = 'pagination__list';
      nav.append(list);
    }

    // Sembunyikan pagination jika hasil kosong atau hanya 1 halaman
    if (totalItems === 0 || totalPages <= 1) {
      list.replaceChildren();
      nav.hidden = true;
      return;
    }

    nav.hidden = false;
    const fragment = document.createDocumentFragment();

    const createPageItem = (label, page, { disabled = false, active = false, ariaLabel = '' } = {}) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'pagination__link';
      link.href = `#katalog-page-${page}`;
      link.textContent = label;
      link.dataset.page = String(page);

      if (ariaLabel) link.setAttribute('aria-label', ariaLabel);

      if (active) {
        link.classList.add('is-active', 'pagination__link--active');
        link.setAttribute('aria-current', 'page');
      }

      if (disabled) {
        link.classList.add('is-disabled', 'pagination__link--disabled');
        link.setAttribute('aria-disabled', 'true');
        link.tabIndex = -1;
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
      }

      li.append(link);
      return li;
    };

    // Tombol Sebelumnya
    fragment.append(
      createPageItem('Sebelumnya', Math.max(1, currentPage - 1), {
        disabled: currentPage <= 1,
        ariaLabel: 'Halaman sebelumnya',
      }),
    );

    // Tombol Nomor Halaman
    for (let page = 1; page <= totalPages; page++) {
      fragment.append(
        createPageItem(String(page), page, {
          active: page === currentPage,
          ariaLabel: `Halaman ${page}`,
        }),
      );
    }

    // Tombol Berikutnya
    fragment.append(
      createPageItem('Berikutnya', Math.min(totalPages, currentPage + 1), {
        disabled: currentPage >= totalPages,
        ariaLabel: 'Halaman berikutnya',
      }),
    );

    list.replaceChildren(fragment);
  }

  function applyCatalogFilter(resetPage = false) {
    const grid = document.getElementById('daftar-buku');
    if (!grid) return;

    if (resetPage) currentPage = 1;

    const query = (document.getElementById('cari-buku')?.value || '').trim().toLowerCase();
    const selectedCategory = (document.getElementById('filter-kategori')?.value || '').trim().toLowerCase();
    const sortBy = document.getElementById('urutkan')?.value || 'terbaru';

    const cards = Array.from(grid.querySelectorAll('.book-card'));

    // 1. Urutkan kartu terlebih dahulu
    const sortedCards = [...cards].sort((a, b) => {
      if (sortBy === 'judul') {
        const titleA = a.querySelector('.book-card__title')?.textContent || '';
        const titleB = b.querySelector('.book-card__title')?.textContent || '';
        return titleA.localeCompare(titleB, 'id');
      }
      if (sortBy === 'populer') {
        const borrowedA = a.querySelector('.book-card__status--borrowed') ? 1 : 0;
        const borrowedB = b.querySelector('.book-card__status--borrowed') ? 1 : 0;
        return borrowedB - borrowedA;
      }
      return Number(a.dataset.id || 0) - Number(b.dataset.id || 0);
    });

    sortedCards.forEach((card) => grid.append(card));

    // 2. Saring buku yang sesuai pencarian & kategori
    const matchedCards = sortedCards.filter((card) => {
      const title = (card.querySelector('.book-card__title')?.textContent || '').toLowerCase();
      const author = (card.querySelector('.book-card__author')?.textContent || '').toLowerCase();
      const category = (card.dataset.kategori || '').toLowerCase();

      const matchQuery = !query || title.includes(query) || author.includes(query);
      const matchCategory = !selectedCategory || category === selectedCategory;
      return matchQuery && matchCategory;
    });

    // 3. Hitung rentang pagination
    const totalMatched = matchedCards.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / ITEMS_PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const visibleSet = new Set(matchedCards.slice(startIndex, endIndex));

    // 4. Tampilkan hanya buku pada halaman aktif
    sortedCards.forEach((card) => {
      card.hidden = !visibleSet.has(card);
    });

    // 5. Perbarui informasi jumlah buku & render tombol pagination
    const countEl = document.getElementById('jumlah-buku');
    if (countEl) {
      countEl.textContent =
        totalMatched > visibleSet.size
          ? `${visibleSet.size} dari ${totalMatched}`
          : String(totalMatched);
    }

    renderPaginationControls(totalMatched, totalPages);
  }

  function initCatalogFilter() {
    const filterForm = document.getElementById('form-filter');
    if (filterForm && filterForm.dataset.filterBound !== 'true') {
      filterForm.dataset.filterBound = 'true';

      filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        applyCatalogFilter(true);
      });

      document.getElementById('cari-buku')?.addEventListener('input', () => applyCatalogFilter(true));
      document.getElementById('filter-kategori')?.addEventListener('change', () => applyCatalogFilter(true));
      document.getElementById('urutkan')?.addEventListener('change', () => applyCatalogFilter(true));
    }

    // Klik kategori pada sidebar
    document.querySelectorAll('.category-list a[data-kategori]').forEach((link) => {
      if (link.dataset.catBound === 'true') return;
      link.dataset.catBound = 'true';

      link.addEventListener('click', (event) => {
        event.preventDefault();
        const select = document.getElementById('filter-kategori');
        if (select) {
          select.value = link.dataset.kategori || '';
          applyCatalogFilter(true);
          document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Terapkan pagination jika kartu buku sudah ada di DOM
    applyCatalogFilter(false);
  }

  // --- MODAL DETAIL BUKU ---
  function showBookDetail(card) {
    let dialog = document.getElementById('book-detail-modal');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'book-detail-modal';
      dialog.style.cssText =
        'max-width:460px;width:90%;border:none;border-radius:12px;padding:1.5rem;box-shadow:0 10px 30px rgba(0,0,0,0.2);';
      document.body.append(dialog);

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
    }

    const title = card.querySelector('.book-card__title')?.textContent || '-';
    const author = card.querySelector('.book-card__author')?.textContent || '-';
    const category = card.querySelector('.tag')?.textContent || 'Umum';
    const status = card.querySelector('.book-card__status')?.textContent || '-';
    const price = card.dataset.price
      ? window.App?.formatCurrency(card.dataset.price)
      : 'Gratis / Anggota';

    dialog.innerHTML = `
      <h3 style="margin-top:0;">${title}</h3>
      <p><strong>Penulis:</strong> ${author}</p>
      <p><strong>Kategori:</strong> ${category}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Biaya Sewa:</strong> ${price}</p>
      <p style="font-size:0.9rem;color:#555;">E-book tersedia dalam format digital EPUB/PDF dengan masa pinjam 7 hari.</p>
      <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1.25rem;">
        <button type="button" class="btn btn--ghost" id="close-detail-modal">Tutup</button>
      </div>
    `;

    dialog.querySelector('#close-detail-modal')?.addEventListener('click', () => dialog.close());
    dialog.showModal();
  }

  // --- RENDER RIWAYAT PEMINJAMAN DARI BACKEND ---
  function formatIndoDate(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  async function renderTransactionHistory() {
    const tbody = document.getElementById('isi-riwayat');
    if (!tbody || !window.App?.apiRequest) return;

    const currentUser = getCurrentUser();
    const endpoint = currentUser?.email
      ? `get_transactions.php?email=${encodeURIComponent(currentUser.email)}`
      : 'get_transactions.php';

    try {
      const response = await window.App.apiRequest(endpoint, { method: 'GET' });
      const items = Array.isArray(response?.data) ? response.data : [];

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" style="text-align:center;color:#666;">Belum ada riwayat peminjaman.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = items
        .map((item) => {
          const isDone = item.status === 'Selesai' || item.status === 'Dikembalikan';
          const statusClass = isDone ? 'status--done' : 'status--active';

          return `
            <tr>
              <td>${item.title}</td>
              <td><time datetime="${item.tanggal_pinjam}">${formatIndoDate(item.tanggal_pinjam)}</time></td>
              <td><time datetime="${item.tanggal_kembali}">${formatIndoDate(item.tanggal_kembali)}</time></td>
              <td><span class="status ${statusClass}">${item.status}</span></td>
            </tr>
          `;
        })
        .join('');
    } catch {
      // Biarkan tampilan apa adanya jika backend gagal dihubungi
    }
  }

  // --- EVENT DELEGATION GLOBAL ---
  function bindGlobalEvents() {
    if (document.body.dataset.featuresBound === 'true') return;
    document.body.dataset.featuresBound = 'true';

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      // 1. Klik tombol Pagination
      const pageLink = target.closest('.pagination__link');
      if (pageLink) {
        event.preventDefault();
        if (
          pageLink.getAttribute('aria-disabled') === 'true' ||
          pageLink.classList.contains('is-disabled')
        ) {
          return;
        }

        const nextPage = Number(pageLink.dataset.page);
        if (Number.isInteger(nextPage) && nextPage >= 1) {
          currentPage = nextPage;
          applyCatalogFilter(false);
          document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      // 2. Klik tombol "Pinjam" pada katalog
      const borrowBtn = target.closest('button[data-aksi="pinjam"]');
      if (borrowBtn) {
        const card = borrowBtn.closest('.book-card');
        if (!card) return;

        addToCart({
          id: card.dataset.id || Date.now(),
          title: card.querySelector('.book-card__title')?.textContent?.trim() || 'Tanpa Judul',
          author: card.querySelector('.book-card__author')?.textContent?.trim() || '-',
          category: card.querySelector('.tag')?.textContent?.trim() || 'Umum',
          price: card.dataset.price ? Number(card.dataset.price) : 0,
          cover: card.querySelector('img')?.getAttribute('src') || '',
        });
        return;
      }

      // 3. Klik tombol "Hapus" pada halaman keranjang
      const removeBtn = target.closest('button[data-aksi="hapus"]');
      if (removeBtn) {
        const item = removeBtn.closest('.cart-item');
        if (item?.dataset.id) removeFromCart(item.dataset.id);
        return;
      }

      // 4. Klik tombol "Detail" pada kartu buku
      const detailLink = target.closest('.book-card__footer a[href^="#detail-"]');
      if (detailLink) {
        event.preventDefault();
        const card = detailLink.closest('.book-card');
        if (card) showBookDetail(card);
      }
    });

    // Kosongkan keranjang otomatis setelah form transaksi sukses
    document.addEventListener('reset', (event) => {
      if (event.target instanceof HTMLFormElement && event.target.id === 'form-transaksi') {
        saveCart([]);
        renderCartPage();
        renderTransactionHistory();
      }
    });
  }

  function initFeatures() {
    bindGlobalEvents();
    updateAuthUI();
    updateCartBadge();
    initCatalogFilter();
    renderCartPage();
    initDateCalculator();
    renderTransactionHistory();
  }

  document.addEventListener('catalog:loaded', () => {
    currentPage = 1;
    applyCatalogFilter(true);
  });

  document.addEventListener('app:auth-changed', () => {
    updateAuthUI();
    syncCheckoutPayload();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeatures, { once: true });
  } else {
    initFeatures();
  }

  document.addEventListener('app:navigated', () => {
    currentPage = 1;
    initFeatures();
  });
})();