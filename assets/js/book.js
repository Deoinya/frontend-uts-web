(function () {
  function getCategory(book) {
    return book.category ?? book.kategori ?? 'Umum';
  }

  function createBookCard(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.dataset.id = book.id ?? '';
    card.dataset.kategori = String(getCategory(book)).toLowerCase();

    if (book.price !== undefined) {
      card.dataset.price = String(book.price);
    }

    const cover = document.createElement('figure');
    cover.className = 'book-card__cover';

    const coverSource = book.cover ?? book.image ?? '';
    if (coverSource) {
      const image = document.createElement('img');
      image.src = coverSource;
      image.alt = `Sampul buku ${book.title ?? ''}`.trim();
      image.width = 240;
      image.height = 320;
      image.loading = 'lazy';

      image.onerror = function () {
  this.onerror = null;
  this.src = 'public/images/covers/buku-01.jpg'; // atau URL placeholder
};

      cover.append(image);
    }

    const body = document.createElement('div');
    body.className = 'book-card__body';

    const title = document.createElement('h3');
    title.className = 'book-card__title';
    title.textContent = book.title ?? 'Tanpa judul';

    const author = document.createElement('p');
    author.className = 'book-card__author';
    author.textContent = book.author ?? 'Penulis tidak diketahui';

    const meta = document.createElement('p');
    meta.className = 'book-card__meta';

    const category = document.createElement('span');
    category.className = 'tag';
    category.textContent = getCategory(book);

    const status = document.createElement('span');
    const isBorrowed = ['borrowed', 'dipinjam', 'tidak tersedia'].includes(
      String(book.status ?? '').toLowerCase(),
    );
    status.className = `book-card__status book-card__status--${
      isBorrowed ? 'borrowed' : 'available'
    }`;
    status.textContent = isBorrowed ? 'Sedang dipinjam' : 'Tersedia';

    meta.append(category, status);
    body.append(title, author, meta);

    const footer = document.createElement('footer');
    footer.className = 'book-card__footer';

    const borrowButton = document.createElement('button');
    borrowButton.className = 'btn btn--primary';
    borrowButton.type = 'button';
    borrowButton.dataset.aksi = 'pinjam';
    borrowButton.textContent = 'Pinjam';
    borrowButton.disabled = isBorrowed;

    const detailLink = document.createElement('a');
    detailLink.className = 'btn btn--ghost';
    detailLink.href = `#detail-${book.id ?? ''}`;
    detailLink.textContent = 'Detail';

    footer.append(borrowButton, detailLink);
    card.append(cover, body, footer);

    return card;
  }

  function setBookCount(count) {
    const countElement = document.getElementById('jumlah-buku');
    if (countElement) countElement.textContent = String(count);
  }

  function removeCatalogMessage() {
    const messageElement = document.getElementById('book-list-message');
    if (messageElement) messageElement.remove();
  }

  function showCatalogMessage(container, message, state) {
    let element = document.getElementById('book-list-message');

    if (!element) {
      element = document.createElement('p');
      element.id = 'book-list-message';
      element.className = 'section-header__desc';
      container.insertAdjacentElement('beforebegin', element);
    }

    element.dataset.state = state;
    element.textContent = message;
  }

  async function loadCatalog(container) {
    container.setAttribute('aria-busy', 'true');

    try {
      const response = await window.App.apiRequest('get_books.php', {
        method: 'GET',
      });
      const responseData = response?.data;
      const books = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.books)
          ? responseData.books
          : Array.isArray(response)
            ? response
            : [];

      if (books.length === 0) {
        const existingCards = container.querySelectorAll('.book-card').length;
        setBookCount(existingCards);

        if (existingCards === 0) {
          showCatalogMessage(container, 'Belum ada buku di katalog.', 'empty');
        }
        return;
      }

      const fragment = document.createDocumentFragment();
      books.forEach((book) => fragment.append(createBookCard(book)));
      container.replaceChildren(fragment);
      setBookCount(books.length);
      removeCatalogMessage();

      // Beri tahu features.js bahwa katalog siap dipaginasi & difilter
      document.dispatchEvent(new CustomEvent('catalog:loaded'));
    } catch (error) {
      if (container.querySelectorAll('.book-card').length === 0) {
        showCatalogMessage(
          container,
          error.message || 'Gagal memuat katalog buku.',
          'error',
        );
      }
    } finally {
      container.removeAttribute('aria-busy');
    }
  }

  function initCatalog() {
    if (!window.App) return;

    const container = document.querySelector('#daftar-buku, [data-book-list]');
    if (!container || container.dataset.catalogBound === 'true') return;

    container.dataset.catalogBound = 'true';
    loadCatalog(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalog, { once: true });
  } else {
    initCatalog();
  }

  document.addEventListener('app:navigated', initCatalog);
})();
