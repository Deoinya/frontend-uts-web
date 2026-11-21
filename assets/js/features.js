(function () {
  const CART_STORAGE_KEY = 'perpustakaan_cart_v1';
  const MAX_CART_ITEMS = 3;

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

    // Hapus input hidden lama agar tidak duplikat
    form.querySelectorAll('input[data-cart-hidden]').forEach((el) => el.remove());

    const cart = getCart();
    cart.forEach((book) => {
      const hiddenId = document.createElement('input');
      hiddenId.type = 'hidden';
      hiddenId.name = 'book_ids[]';
      hiddenId.value = String(book.id);
      hiddenId.dataset.cartHidden = 'true';
      form.append(hiddenId);
    });

    const totalCost = cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const hiddenTotal = document.createElement('input');
    hiddenTotal.type = 'hidden';
    hiddenTotal.name = 'estimated_cost';
    hiddenTotal.value = String(totalCost);
    hiddenTotal.dataset.cartHidden = 'true';
    form.append(hiddenTotal);
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

    // Set default minimal hari ini
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

  // --- PENCARIAN, FILTER KATEGORI & URUTKAN KATALOG ---
  function applyCatalogFilter() {
    const grid = document.getElementById('daftar-buku');
    if (!grid) return;

    const query = (document.getElementById('cari-buku')?.value || '').trim().toLowerCase();
    const selectedCategory = (document.getElementById('filter-kategori')?.value || '').trim().toLowerCase();
    const sortBy = document.getElementById('urutkan')?.value || 'terbaru';

    const cards = Array.from(grid.querySelectorAll('.book-card'));
    let visibleCount = 0;

    cards.forEach((card) => {
      const title = (card.querySelector('.book-card__title')?.textContent || '').toLowerCase();
      const author = (card.querySelector('.book-card__author')?.textContent || '').toLowerCase();
      const category = (card.dataset.kategori || '').toLowerCase();

      const matchQuery = !query || title.includes(query) || author.includes(query);
      const matchCategory = !selectedCategory || category === selectedCategory;
      const isVisible = matchQuery && matchCategory;

      card.hidden = !isVisible;
      if (isVisible) visibleCount++;
    });

    // Pengurutan kartu
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

    const countEl = document.getElementById('jumlah-buku');
    if (countEl) countEl.textContent = String(visibleCount);
  }

  function initCatalogFilter() {
    const filterForm = document.getElementById('form-filter');
    if (filterForm && filterForm.dataset.filterBound !== 'true') {
      filterForm.dataset.filterBound = 'true';

      filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        applyCatalogFilter();
      });

      document.getElementById('cari-buku')?.addEventListener('input', applyCatalogFilter);
      document.getElementById('filter-kategori')?.addEventListener('change', applyCatalogFilter);
      document.getElementById('urutkan')?.addEventListener('change', applyCatalogFilter);
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
          applyCatalogFilter();
          document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
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

  // --- EVENT DELEGATION GLOBAL (PINJAM, HAPUS, DETAIL, RESET CART SAAT CHECKOUT) ---
  function bindGlobalEvents() {
    if (document.body.dataset.featuresBound === 'true') return;
    document.body.dataset.featuresBound = 'true';

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      // 1. Klik tombol "Pinjam" pada katalog
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

      // 2. Klik tombol "Hapus" pada halaman keranjang
      const removeBtn = target.closest('button[data-aksi="hapus"]');
      if (removeBtn) {
        const item = removeBtn.closest('.cart-item');
        if (item?.dataset.id) removeFromCart(item.dataset.id);
        return;
      }

      // 3. Klik tombol "Detail" pada kartu buku
      const detailLink = target.closest('.book-card__footer a[href^="#detail-"]');
      if (detailLink) {
        event.preventDefault();
        const card = detailLink.closest('.book-card');
        if (card) showBookDetail(card);
      }
    });

    // Kosongkan keranjang otomatis setelah form transaksi di-reset oleh cart.js saat sukses
    document.addEventListener('reset', (event) => {
      if (event.target instanceof HTMLFormElement && event.target.id === 'form-transaksi') {
        saveCart([]);
        renderCartPage();
      }
    });
  }

  function initFeatures() {
    bindGlobalEvents();
    updateCartBadge();
    initCatalogFilter();
    renderCartPage();
    initDateCalculator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeatures, { once: true });
  } else {
    initFeatures();
  }

  document.addEventListener('app:navigated', initFeatures);
})();