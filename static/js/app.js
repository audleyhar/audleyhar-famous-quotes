/**
 * QuoteWise - Plain Vanilla JavaScript Client
 */

(function () {
  'use strict';

  // Application State
  const state = {
    featuredQuote: null,
    currentQuotes: [],
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
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnEmptyReset: document.getElementById('btnEmptyReset'),
    themeToggleCheckbox: document.getElementById('themeToggleCheckbox'),
    btnBackToTop: document.getElementById('btnBackToTop'),
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
   * Helper: Copy text to clipboard with optional button visual feedback
   */
  async function copyQuote(quote, author, buttonEl = null) {
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

      if (buttonEl) {
        const originalHTML = buttonEl.innerHTML;
        buttonEl.classList.add('copied');
        buttonEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          buttonEl.classList.remove('copied');
          buttonEl.innerHTML = originalHTML;
        }, 1800);
      }

      showToast('Quote copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy quote: ', err);
      showToast('Could not copy to clipboard');
    }
  }

  /**
   * Export currently displayed quotes to a downloadable CSV file
   */
  function exportQuotesToCSV() {
    const quotes = state.currentQuotes || [];
    if (quotes.length === 0) {
      showToast('No quotes to export');
      return;
    }

    const headers = ['ID', 'Quote', 'Author', 'Category'];
    const rows = quotes.map(q => [
      q.id,
      `"${(q.quote || '').replace(/"/g, '""')}"`,
      `"${(q.author || '').replace(/"/g, '""')}"`,
      `"${(q.category || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    let filename = 'quotes';
    if (state.activeCategory && state.activeCategory !== 'all') {
      filename += `-${state.activeCategory.toLowerCase()}`;
    }
    if (state.activeAuthor && state.activeAuthor !== 'all') {
      filename += `-${state.activeAuthor.toLowerCase().replace(/\s+/g, '_')}`;
    }
    link.download = `${filename}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${quotes.length} quotes to CSV!`);
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
    state.currentQuotes = quotes;
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

      cardTop.appendChild(catBadge);

      // Quote Text
      const quoteText = document.createElement('p');
      quoteText.className = 'card-quote-text';
      quoteText.textContent = `"${item.quote}"`;

      // Card Footer with Author and prominent Copy to Clipboard button
      const cardFooter = document.createElement('div');
      cardFooter.className = 'card-footer';

      const authorLink = document.createElement('span');
      authorLink.className = 'card-author';
      authorLink.textContent = item.author;
      authorLink.title = `Filter by ${item.author}`;
      authorLink.addEventListener('click', () => {
        setAuthor(item.author);
      });

      const copyBtn = document.createElement('button');
      copyBtn.className = 'card-btn-copy';
      copyBtn.title = 'Copy quote to clipboard';
      copyBtn.setAttribute('aria-label', 'Copy quote to clipboard');
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        <span>Copy</span>
      `;
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyQuote(item.quote, item.author, copyBtn);
      });

      cardFooter.appendChild(authorLink);
      cardFooter.appendChild(copyBtn);

      // Assemble card
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
        copyQuote(state.featuredQuote.quote, state.featuredQuote.author, elements.btnCopyFeatured);
      }
    });

    // Export to CSV button
    if (elements.btnExportCSV) {
      elements.btnExportCSV.addEventListener('click', exportQuotesToCSV);
    }


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
   * Initialize Theme Switch & Preference Persistence
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('quotewise-theme');
    const isLight = savedTheme === 'light';

    if (elements.themeToggleCheckbox) {
      elements.themeToggleCheckbox.checked = isLight;
      elements.themeToggleCheckbox.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        if (newTheme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('quotewise-theme', newTheme);
        showToast(`Switched to ${newTheme} mode`);
      });
    }
  }

  /**
   * Initialize Floating Back to Top Button
   */
  function initBackToTop() {
    if (!elements.btnBackToTop) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 350) {
        elements.btnBackToTop.classList.add('visible');
      } else {
        elements.btnBackToTop.classList.remove('visible');
      }
    }, { passive: true });

    elements.btnBackToTop.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /**
   * Initialize App
   */
  async function init() {
    initTheme();
    initBackToTop();
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

