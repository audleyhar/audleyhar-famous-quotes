/**
 * QuoteWise - Plain Vanilla JavaScript Client
 */

(function () {
  'use strict';

  // Application State
  const state = {
    featuredQuote: null,
    activeCategory: 'all',
    activeAuthor: 'all',
    searchQuery: '',
    toastTimer: null,
    searchDebounceTimer: null
  };

  // DOM Elements
  const elements = {
    featuredCard: document.getElementById('featuredQuoteCard'),
    featuredQuoteText: document.getElementById('featuredQuoteText'),
    featuredAuthor: document.getElementById('featuredAuthor'),
    featuredCategoryBadge: document.getElementById('featuredCategoryBadge'),
    btnNewRandom: document.getElementById('btnNewRandom'),
    btnCopyFeatured: document.getElementById('btnCopyFeatured'),
    btnFilterByAuthor: document.getElementById('btnFilterByAuthor'),
    searchInput: document.getElementById('searchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    authorSelect: document.getElementById('authorSelect'),
    categoryPills: document.getElementById('categoryPills'),
    resultsCount: document.getElementById('resultsCount'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    btnEmptyReset: document.getElementById('btnEmptyReset'),
    quotesGrid: document.getElementById('quotesGrid'),
    emptyState: document.getElementById('emptyState'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    totalQuotesBadge: document.getElementById('totalQuotesBadge')
  };

  /**
   * Helper: Show toast notification
   */
  function showToast(message) {
    if (!elements.toast) return;
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');

    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
    }

    state.toastTimer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2400);
  }

  /**
   * Helper: Copy text to clipboard
   */
  async function copyQuote(quote, author) {
    const formatted = `"${quote}" — ${author}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formatted);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('Quote copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy quote: ', err);
      showToast('Could not copy to clipboard');
    }
  }

  /**
   * Fetch and display a random quote in the featured section
   */
  async function fetchRandomQuote() {
    try {
      let url = '/api/quotes/random';
      const params = new URLSearchParams();
      if (state.featuredQuote && state.featuredQuote.id) {
        params.append('exclude_id', state.featuredQuote.id);
      }
      if (state.activeCategory && state.activeCategory !== 'all') {
        params.append('category', state.activeCategory);
      }
      if (state.activeAuthor && state.activeAuthor !== 'all') {
        params.append('author', state.activeAuthor);
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      elements.featuredQuoteText.style.opacity = '0.4';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load random quote');
      }
      const data = await response.json();
      if (data.quote) {
        renderFeaturedQuote(data.quote);
      }
    } catch (err) {
      console.error(err);
    } finally {
      elements.featuredQuoteText.style.opacity = '1';
    }
  }

  /**
   * Render featured quote into the hero card
   */
  function renderFeaturedQuote(quote) {
    state.featuredQuote = quote;
    elements.featuredQuoteText.textContent = `"${quote.quote}"`;
    elements.featuredAuthor.textContent = quote.author;
    elements.featuredCategoryBadge.textContent = quote.category;
  }

  /**
   * Fetch categories from API and create filter pills
   */
  async function loadCategories() {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to load categories');
      const data = await response.json();

      if (data.total_quotes && elements.totalQuotesBadge) {
        elements.totalQuotesBadge.textContent = `${data.total_quotes} Quotes`;
      }

      elements.categoryPills.innerHTML = '';

      // "All" Pill
      const allPill = document.createElement('button');
      allPill.className = `pill ${state.activeCategory === 'all' ? 'active' : ''}`;
      allPill.textContent = `All (${data.total_quotes || 100})`;
      allPill.dataset.category = 'all';
      allPill.addEventListener('click', () => setCategory('all'));
      elements.categoryPills.appendChild(allPill);

      // Individual category pills
      data.categories.forEach(cat => {
        const pill = document.createElement('button');
        pill.className = `pill ${state.activeCategory === cat.name ? 'active' : ''}`;
        pill.textContent = `${cat.name} (${cat.count})`;
        pill.dataset.category = cat.name;
        pill.addEventListener('click', () => setCategory(cat.name));
        elements.categoryPills.appendChild(pill);
      });
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Fetch authors and populate dropdown
   */
  async function loadAuthors() {
    try {
      const response = await fetch('/api/authors');
      if (!response.ok) throw new Error('Failed to load authors');
      const data = await response.json();

      // Clear existing except default
      elements.authorSelect.innerHTML = '<option value="all">All Authors (Everyone)</option>';

      data.authors.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = `${item.name} (${item.count})`;
        if (state.activeAuthor === item.name) {
          option.selected = true;
        }
        elements.authorSelect.appendChild(option);
      });
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Search and filter quotes from API
   */
  async function fetchQuotes() {
    try {
      const params = new URLSearchParams();
      if (state.searchQuery.trim()) {
        params.append('search', state.searchQuery.trim());
      }
      if (state.activeCategory && state.activeCategory !== 'all') {
        params.append('category', state.activeCategory);
      }
      if (state.activeAuthor && state.activeAuthor !== 'all') {
        params.append('author', state.activeAuthor);
      }

      const url = `/api/quotes?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch quotes');
      const data = await response.json();

      renderQuotesGrid(data.quotes || []);
      updateResultsUI(data.total || 0);
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Render cards inside quotes grid
   */
  function renderQuotesGrid(quotes) {
    elements.quotesGrid.innerHTML = '';

    if (quotes.length === 0) {
      elements.quotesGrid.classList.add('hidden');
      elements.emptyState.classList.remove('hidden');
      return;
    }

    elements.quotesGrid.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    quotes.forEach(item => {
      const card = document.createElement('article');
      card.className = 'quote-card';

      // Card Header
      const cardTop = document.createElement('div');
      cardTop.className = 'card-top';

      const catBadge = document.createElement('button');
      catBadge.className = 'card-category';
      catBadge.textContent = item.category;
      catBadge.title = `Filter by ${item.category}`;
      catBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        setCategory(item.category);
      });

      const copyBtn = document.createElement('button');
      copyBtn.className = 'card-btn-copy';
      copyBtn.title = 'Copy quote';
      copyBtn.setAttribute('aria-label', 'Copy quote');
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `;
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyQuote(item.quote, item.author);
      });

      cardTop.appendChild(catBadge);
      cardTop.appendChild(copyBtn);

      // Quote Text
      const quoteText = document.createElement('p');
      quoteText.className = 'card-quote-text';
      quoteText.textContent = `"${item.quote}"`;

      // Card Footer
      const cardFooter = document.createElement('div');
      cardFooter.className = 'card-footer';

      const authorLink = document.createElement('span');
      authorLink.className = 'card-author';
      authorLink.textContent = item.author;
      authorLink.title = `Filter by ${item.author}`;
      authorLink.addEventListener('click', () => {
        setAuthor(item.author);
      });

      cardFooter.appendChild(authorLink);

      // Append elements
      card.appendChild(cardTop);
      card.appendChild(quoteText);
      card.appendChild(cardFooter);

      fragment.appendChild(card);
    });

    elements.quotesGrid.appendChild(fragment);
  }

  /**
   * Update results count and reset filters button visibility
   */
  function updateResultsUI(count) {
    const hasFilter =
      (state.activeCategory && state.activeCategory !== 'all') ||
      (state.activeAuthor && state.activeAuthor !== 'all') ||
      state.searchQuery.trim().length > 0;

    elements.resultsCount.textContent = `Showing ${count} quote${count === 1 ? '' : 's'}`;

    if (hasFilter) {
      elements.btnResetFilters.classList.remove('hidden');
    } else {
      elements.btnResetFilters.classList.add('hidden');
    }
  }

  /**
   * Set category filter
   */
  function setCategory(category) {
    state.activeCategory = category;

    // Update active pill UI
    const pills = elements.categoryPills.querySelectorAll('.pill');
    pills.forEach(pill => {
      if (pill.dataset.category.toLowerCase() === category.toLowerCase()) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    fetchQuotes();
  }

  /**
   * Set author filter
   */
  function setAuthor(author) {
    state.activeAuthor = author;
    elements.authorSelect.value = author;
    fetchQuotes();
  }

  /**
   * Reset all filters
   */
  function resetAllFilters() {
    state.activeCategory = 'all';
    state.activeAuthor = 'all';
    state.searchQuery = '';
    elements.searchInput.value = '';
    elements.btnClearSearch.classList.add('hidden');
    elements.authorSelect.value = 'all';

    // Update category pills
    const pills = elements.categoryPills.querySelectorAll('.pill');
    pills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.category === 'all');
    });

    fetchQuotes();
  }

  /**
   * Bind event listeners
   */
  function setupEventListeners() {
    // New Random Quote button
    elements.btnNewRandom.addEventListener('click', () => {
      fetchRandomQuote();
    });

    // Copy Featured button
    elements.btnCopyFeatured.addEventListener('click', () => {
      if (state.featuredQuote) {
        copyQuote(state.featuredQuote.quote, state.featuredQuote.author);
      }
    });

    // Filter by featured author
    elements.btnFilterByAuthor.addEventListener('click', () => {
      if (state.featuredQuote) {
        setAuthor(state.featuredQuote.author);
        elements.quotesGrid.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Click featured category badge
    elements.featuredCategoryBadge.addEventListener('click', () => {
      if (state.featuredQuote) {
        setCategory(state.featuredQuote.category);
        elements.quotesGrid.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Search input (debounced)
    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      state.searchQuery = val;
      if (val.length > 0) {
        elements.btnClearSearch.classList.remove('hidden');
      } else {
        elements.btnClearSearch.classList.add('hidden');
      }

      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        fetchQuotes();
      }, 250);
    });

    // Clear search button
    elements.btnClearSearch.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.btnClearSearch.classList.add('hidden');
      fetchQuotes();
      elements.searchInput.focus();
    });

    // Author select dropdown
    elements.authorSelect.addEventListener('change', (e) => {
      setAuthor(e.target.value);
    });

    // Reset filters buttons
    elements.btnResetFilters.addEventListener('click', resetAllFilters);
    elements.btnEmptyReset.addEventListener('click', resetAllFilters);
  }

  /**
   * Initialize App
   */
  async function init() {
    setupEventListeners();
    await Promise.all([
      fetchRandomQuote(),
      loadCategories(),
      loadAuthors(),
      fetchQuotes()
    ]);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
