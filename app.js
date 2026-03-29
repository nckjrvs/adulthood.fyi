// ============================================
// DATA
// ============================================
const categoryKeys = ['money','job','paying','freedom','relationships','time_energy','purpose'];

const categoryMeta = {
  money:         { name: "Making Money™", tagline: "Income, stability, pressure", desc: "How it feels to earn a living, manage money, and deal with the constant pressure of financial survival." },
  job:           { name: "Having a Job™", tagline: "Daily work, burnout, purpose", desc: "The daily grind of employment — showing up, burning out, and wondering if this is really what you signed up for." },
  paying:        { name: "Paying for Life™", tagline: "Bills, rent, cost of living", desc: "The never-ending stream of bills, subscriptions, and costs that somehow always go up." },
  freedom:       { name: "Freedom™", tagline: "Independence, decision-making", desc: "The part where you realize you can do whatever you want — and that it's terrifying." },
  relationships: { name: "Relationships™", tagline: "Dating, friendships, marriage", desc: "Navigating love, friendships, and the people who make life either worth it or unbearable." },
  time_energy:   { name: "Time & Energy™", tagline: "Fatigue, mental load", desc: "The resource you never have enough of, spent on things you didn't plan for." },
  purpose:       { name: "Purpose & Progress™", tagline: "Direction, growth", desc: "The feeling of moving forward — or not. Growth, stagnation, and the search for meaning." },
};

const displayOrder = ['freedom','relationships','money','job','purpose','paying','time_energy'];

const overallLabels = ['', 'Rough.', 'Could be better.', "It's fine. Mostly.", 'Pretty good, actually.', 'Living the dream.'];
const lifeTags = ['parent', 'single', 'married', 'divorced', 'student', 'homeowner', 'renter', 'remote worker', 'freelancer', 'full-time', 'part-time', 'caregiver'];

const ageGroupDefs = [
  { range: "18\u201324", min: 18, max: 24, subtitle: "\"Wait, I have to do this every day?\"" },
  { range: "25\u201334", min: 25, max: 34, subtitle: "\"I should probably figure this out.\"" },
  { range: "35\u201344", min: 35, max: 44, subtitle: "\"Oh, so this is it.\"" },
  { range: "45+",     min: 45, max: 999, subtitle: "\"It gets... different.\"" },
];

// ============================================
// GOOGLE SHEETS API
// ============================================
// Replace this URL after deploying your Apps Script web app
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbxMRsfAt1hJE6gxhFWZFujqS6_HsazbWiVekk6T6qLgWchTYaBz84YeJRvb2aUvtDA0zw/exec';

// ============================================
// STATE
// ============================================
let currentStep = 1;
let formData = { overall: 0, categories: {}, reflection: {}, age: null, state: '', tags: [] };
let cachedReviews = JSON.parse(localStorage.getItem('adulthood_reviews') || '[]');

function getReviews() {
  return cachedReviews;
}

function fetchReviewsFromSheet() {
  if (SHEET_API_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return Promise.resolve(cachedReviews);
  return fetch(SHEET_API_URL)
    .then(function(res) { return res.json(); })
    .then(function(reviews) {
      cachedReviews = reviews;
      localStorage.setItem('adulthood_reviews', JSON.stringify(reviews));
      return reviews;
    })
    .catch(function() {
      return cachedReviews;
    });
}

function postReviewToSheet(review) {
  if (SHEET_API_URL === 'YOUR_APPS_SCRIPT_URL_HERE') return Promise.resolve();
  return fetch(SHEET_API_URL, {
    method: 'POST',
    body: JSON.stringify(review),
  }).catch(function() {});
}

// ============================================
// HELPERS
// ============================================
function starsString(rating) {
  const full = Math.round(rating);
  return '\u2605'.repeat(full) + '\u2606'.repeat(5 - full);
}

function getCategoryAverages(reviewList) {
  if (!reviewList.length) return {};
  const avgs = {};
  categoryKeys.forEach(key => {
    const vals = reviewList.map(r => r.categories[key]).filter(v => v != null);
    avgs[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  return avgs;
}

function getOverallAverage(reviewList) {
  if (!reviewList.length) return 0;
  const vals = reviewList.map(r => {
    if (r.overall) return r.overall;
    const cats = Object.values(r.categories);
    return cats.reduce((a, b) => a + b, 0) / cats.length;
  });
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ============================================
// HOMEPAGE RENDERING
// ============================================
function renderHomepage() {
  const allReviews = getReviews();
  renderHero(allReviews);
  renderCategories(allReviews);
  renderCategoryLinks(allReviews);
  renderReviews(allReviews);
  renderAgeGroups(allReviews);
}

function renderCategoryLinks(allReviews) {
  const grid = document.getElementById('category-links');
  const avgs = getCategoryAverages(allReviews);
  grid.innerHTML = displayOrder.map(key => {
    const meta = categoryMeta[key];
    const avg = avgs[key] || 0;
    const count = allReviews.filter(r => r.categories[key] != null).length;
    return `<a class="cat-link" href="#/category/${key}">
      <div class="cat-link-name">${meta.name}</div>
      <div class="cat-link-tagline">${meta.tagline}</div>
      <div class="cat-link-bottom">
        <span class="cat-link-stars">${count ? starsString(avg) : '\u2606\u2606\u2606\u2606\u2606'}</span>
        <span class="cat-link-avg">${count ? avg.toFixed(1) : '--'}</span>
      </div>
    </a>`;
  }).join('');
}

function renderHero(allReviews) {
  const starsEl = document.getElementById('hero-stars');
  const textEl = document.getElementById('hero-rating-text');
  const countEl = document.getElementById('hero-rating-count');

  if (!allReviews.length) {
    starsEl.textContent = '\u2606\u2606\u2606\u2606\u2606';
    textEl.textContent = '-- out of 5';
    countEl.textContent = 'No reviews yet. Be the first.';
  } else {
    const avg = getOverallAverage(allReviews);
    starsEl.textContent = starsString(avg);
    textEl.textContent = avg.toFixed(1) + ' out of 5';
    countEl.textContent = `Based on ${allReviews.length} review${allReviews.length === 1 ? '' : 's'}`;
  }
}

function getSentimentLabel(rating) {
  if (rating >= 4) return { emoji: '\u2764\uFE0F', text: 'Loved', cls: 'pos' };
  if (rating >= 3) return { emoji: '\uD83D\uDE10', text: "It's okay", cls: 'mid' };
  return { emoji: '\uD83D\uDC4E', text: "Didn't like", cls: 'neg' };
}

function getInitialColor(name) {
  const colors = ['#7c8ba0','#b8956a','#c47d6d','#6b9b8a','#9b7db8','#b0855c','#6a8fb8'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const reflectionTypes = [
  { key: 'harder', name: 'Harder than expected' },
  { key: 'better', name: 'Better than expected' },
  { key: 'learned', name: "What I've learned" },
];

function getReviewRating(r) {
  const cats = Object.values(r.categories);
  return cats.length ? cats.reduce((a, b) => a + b, 0) / cats.length : 0;
}

function buildReflectionReviewCards(reviews, reflectionKey) {
  const filtered = reviews.filter(r => r.reflection && r.reflection[reflectionKey]);

  if (!filtered.length) return '<div style="padding:16px;color:#8a8478;font-size:14px;">No responses yet.</div>';

  // Shuffle using reflection key as seed for consistent but unique order per section
  const shuffled = [...filtered];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const seed = reflectionKey.charCodeAt(0) * 31 + i * 17;
    const j = seed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const ratings = shuffled.map(r => getReviewRating(r));
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;

  const allReviews = getReviews();
  const cards = shuffled.slice(0, 20).map((r, i) => {
    const rating = getReviewRating(r);
    const sentiment = getSentimentLabel(rating);
    const seed = `${r.age}-${r.state || ''}-${i}`;
    const initial = String(r.age).charAt(0);
    const color = getInitialColor(seed);
    const tagParts = [];
    if (r.state) tagParts.push(r.state);
    tagParts.push(...(r.tags || []));
    const tagsStr = tagParts.join(' \u00B7 ');
    const reviewIdx = allReviews.indexOf(r);

    return `<div class="cat-review-card" onclick="openReviewModal(${reviewIdx})" style="cursor:pointer">
      <div class="cat-review-name">Age ${r.age}</div>
      <div class="cat-review-contributions">${tagsStr}</div>
      <div class="cat-review-sentiment cat-sentiment-${sentiment.cls}">
        <span class="cat-sentiment-badge">${sentiment.emoji} <strong>${sentiment.text}</strong></span>
        <span class="cat-sentiment-meta">\u00B7 ${starsString(rating)}</span>
      </div>
      <div class="cat-review-quote">${r.reflection[reflectionKey]}</div>
    </div>`;
  });

  const scrollId = `ref-scroll-${reflectionKey}`;
  return `
    <div class="cat-reviews-panel">
      <div class="cat-reviews-scroll" id="${scrollId}">
        ${cards.join('')}
      </div>
      <div class="cat-scroll-arrows">
        <button class="cat-scroll-btn" onclick="document.getElementById('${scrollId}').scrollBy({left:-300,behavior:'smooth'})">\u2039</button>
        <button class="cat-scroll-btn" onclick="document.getElementById('${scrollId}').scrollBy({left:300,behavior:'smooth'})">\u203A</button>
      </div>
    </div>`;
}

function toggleReflectionAccordion(key, allReviews) {
  const panel = document.getElementById(`ref-panel-${key}`);
  const row = panel.previousElementSibling;
  const isOpen = panel.classList.contains('open');

  document.querySelectorAll('.category-panel.open').forEach(p => {
    p.classList.remove('open');
    p.style.maxHeight = null;
    p.previousElementSibling.classList.remove('expanded');
  });

  if (!isOpen) {
    if (!panel.dataset.loaded) {
      panel.innerHTML = buildReflectionReviewCards(allReviews, key);
      panel.dataset.loaded = '1';
    }
    panel.classList.add('open');
    panel.style.maxHeight = panel.scrollHeight + 'px';
    row.classList.add('expanded');
  }
}

function renderCategories(allReviews) {
  const grid = document.getElementById('category-grid');
  if (!allReviews.length) {
    grid.innerHTML = reflectionTypes.map(rt => `
      <div class="category-row">
        <div class="category-name">${rt.name}</div>
        <div class="category-stars" style="color:#ccc">\u2606\u2606\u2606\u2606\u2606</div>
        <div class="category-quip">No responses yet</div>
      </div>`).join('');
    return;
  }
  grid.innerHTML = reflectionTypes.map(rt => {
    const filtered = allReviews.filter(r => r.reflection && r.reflection[rt.key]);
    const count = filtered.length;
    let avg = 0;
    if (count) {
      const ratings = filtered.map(r => getReviewRating(r));
      avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
    return `
    <div class="category-row" onclick="toggleReflectionAccordion('${rt.key}', getReviews())" style="cursor:pointer">
      <div class="category-name">${rt.name}</div>
      <div class="category-stars">${count ? starsString(avg) : '\u2606\u2606\u2606\u2606\u2606'}</div>
      <div class="category-quip">${count ? avg.toFixed(1) + ' avg' : 'No responses yet'}</div>
      <div class="category-chevron">\u203A</div>
    </div>
    <div class="category-panel" id="ref-panel-${rt.key}"></div>`;
  }).join('');
}

function renderReviews(allReviews) {
  const grid = document.getElementById('reviews-grid');
  if (!allReviews.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-title">No reviews yet</div>
      <div class="empty-state-sub">Be the first to rate your experience.</div>
      <button class="cta-button" onclick="startReview()">Leave a Review</button>
    </div>`;
    return;
  }
  // Show most recent first
  const sorted = [...allReviews].reverse();
  grid.innerHTML = sorted.map(r => {
    const catVals = Object.values(r.categories);
    const avg = r.overall || (catVals.reduce((a, b) => a + b, 0) / catVals.length);
    // Pick the best reflection to show
    let label = '', quote = '';
    if (r.reflection.harder) { label = 'Harder than expected'; quote = r.reflection.harder; }
    else if (r.reflection.better) { label = 'Better than expected'; quote = r.reflection.better; }
    else if (r.reflection.learned) { label = "What I've learned"; quote = r.reflection.learned; }

    const locationStr = r.state ? ` <span class="review-location">&middot; ${r.state}</span>` : '';
    const tagsStr = (r.tags || []).map(t => `<span class="review-tag">${t}</span>`).join('');
    const quoteHtml = quote ? `<div class="review-label">${label}</div><div class="review-quote">&ldquo;${quote}&rdquo;</div>` : '';

    return `<div class="review-card">
      <div class="review-header">
        <div><div class="review-meta">Age ${r.age}${locationStr}</div></div>
        <div class="review-stars">${starsString(avg)}</div>
      </div>
      ${tagsStr ? `<div class="review-tags">${tagsStr}</div>` : ''}
      ${quoteHtml}
    </div>`;
  }).join('');
}

function renderAgeGroups(allReviews) {
  const grid = document.getElementById('age-grid');
  if (!allReviews.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-title">Not enough data yet</div>
      <div class="empty-state-sub">Age breakdowns appear after reviews come in.</div>
    </div>`;
    return;
  }

  const groups = ageGroupDefs.map(g => {
    const groupReviews = allReviews.filter(r => r.age >= g.min && r.age <= g.max);
    return { ...g, reviews: groupReviews };
  }).filter(g => g.reviews.length > 0);

  if (!groups.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-title">Not enough data yet</div>
      <div class="empty-state-sub">Age breakdowns appear after reviews come in.</div>
    </div>`;
    return;
  }

  grid.innerHTML = groups.map(g => {
    const avgs = getCategoryAverages(g.reviews);
    // Show top 2 and bottom 2 categories
    const sorted = categoryKeys
      .filter(k => avgs[k] != null)
      .sort((a, b) => avgs[b] - avgs[a]);
    const show = sorted.slice(0, 2).concat(sorted.slice(-2)).filter((v, i, a) => a.indexOf(v) === i);

    return `<div class="age-card">
      <div class="age-range">${g.range}</div>
      <div class="age-subtitle">${g.subtitle} <span style="color:#9e978d;font-size:12px">(${g.reviews.length})</span></div>
      ${show.map(key => `<div class="age-stat">
        <span class="age-stat-label">${categoryMeta[key].name}</span>
        <span class="age-stat-value">${starsString(avgs[key])} ${avgs[key].toFixed(1)}</span>
      </div>`).join('')}
    </div>`;
  }).join('');
}

// ============================================
// MAP
// ============================================
const stateNameToAbbr = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
  'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
  'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS',
  'kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA',
  'michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT',
  'nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM',
  'new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK',
  'oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC',
  'south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT',
  'virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
  'washington dc':'DC','dc':'DC',
  // Also allow abbreviations directly
  'al':'AL','ak':'AK','az':'AZ','ar':'AR','ca':'CA','co':'CO','ct':'CT','de':'DE',
  'fl':'FL','ga':'GA','hi':'HI','id':'ID','il':'IL','in':'IN','ia':'IA','ks':'KS',
  'ky':'KY','la':'LA','me':'ME','md':'MD','ma':'MA','mi':'MI','mn':'MN','ms':'MS',
  'mo':'MO','mt':'MT','ne':'NE','nv':'NV','nh':'NH','nj':'NJ','nm':'NM','ny':'NY',
  'nc':'NC','nd':'ND','oh':'OH','ok':'OK','or':'OR','pa':'PA','ri':'RI','sc':'SC',
  'sd':'SD','tn':'TN','tx':'TX','ut':'UT','vt':'VT','va':'VA','wa':'WA','wv':'WV',
  'wi':'WI','wy':'WY'
};

let activeMapFilter = null;

function resolveStateAbbr(input) {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase().replace(/[.,]/g, '');
  // Direct match
  if (stateNameToAbbr[cleaned]) return stateNameToAbbr[cleaned];
  // Try extracting state from "City, State" format
  const parts = cleaned.split(',').map(s => s.trim());
  for (const part of parts) {
    if (stateNameToAbbr[part]) return stateNameToAbbr[part];
  }
  // Try last word (e.g. "Salt Lake City UT")
  const words = cleaned.split(/\s+/);
  const last = words[words.length - 1];
  if (stateNameToAbbr[last]) return stateNameToAbbr[last];
  // Try last two words
  if (words.length >= 2) {
    const lastTwo = words.slice(-2).join(' ');
    if (stateNameToAbbr[lastTwo]) return stateNameToAbbr[lastTwo];
  }
  return null;
}

function getReviewsByState(allReviews) {
  const byState = {};
  allReviews.forEach(r => {
    const abbr = resolveStateAbbr(r.state);
    if (abbr) {
      if (!byState[abbr]) byState[abbr] = [];
      byState[abbr].push(r);
    }
  });
  return byState;
}

function renderMap(allReviews) {
  const byState = getReviewsByState(allReviews);
  const counts = Object.values(byState).map(r => r.length);
  const maxCount = Math.max(...counts, 1);

  // Reset all states
  document.querySelectorAll('#us-map path').forEach(path => {
    path.className.baseVal = '';
  });

  // Color states with reviews
  Object.entries(byState).forEach(([abbr, reviews]) => {
    const el = document.getElementById(abbr);
    if (!el) return;
    const ratio = reviews.length / maxCount;
    let heat = 1;
    if (ratio > 0.8) heat = 5;
    else if (ratio > 0.6) heat = 4;
    else if (ratio > 0.4) heat = 3;
    else if (ratio > 0.2) heat = 2;
    el.className.baseVal = `has-reviews heat-${heat}`;
    if (activeMapFilter === abbr) el.className.baseVal += ' selected';
  });

  // Tooltip + click handlers
  const tooltip = document.getElementById('map-tooltip');
  const wrap = document.getElementById('map-wrap');

  document.querySelectorAll('#us-map path').forEach(path => {
    path.addEventListener('mouseenter', (e) => {
      const abbr = path.id;
      const stateName = path.dataset.state;
      const stateReviews = byState[abbr];
      if (stateReviews && stateReviews.length) {
        const avg = getOverallAverage(stateReviews);
        tooltip.textContent = `${stateName}: ${avg.toFixed(1)} avg, ${stateReviews.length} review${stateReviews.length === 1 ? '' : 's'}`;
      } else {
        tooltip.textContent = `${stateName}: No reviews yet`;
      }
      tooltip.classList.add('visible');
    });

    path.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      tooltip.style.left = (e.clientX - rect.left) + 'px';
      tooltip.style.top = (e.clientY - rect.top) + 'px';
    });

    path.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });

    path.addEventListener('click', () => {
      const abbr = path.id;
      const stateReviews = byState[abbr];
      if (stateReviews && stateReviews.length) {
        activeMapFilter = abbr;
        document.querySelectorAll('#us-map path').forEach(p => p.classList.remove('selected'));
        path.classList.add('selected');
        document.getElementById('map-filter-bar').classList.remove('hidden');
        document.getElementById('map-filter-label').textContent =
          `Showing reviews from ${path.dataset.state} (${stateReviews.length})`;
        document.getElementById('reviews-section-label').textContent = `Reviews from ${path.dataset.state}`;
        renderReviews(stateReviews);
      }
    });
  });
}

function clearMapFilter() {
  activeMapFilter = null;
  document.querySelectorAll('#us-map path').forEach(p => p.classList.remove('selected'));
  document.getElementById('map-filter-bar').classList.add('hidden');
  document.getElementById('reviews-section-label').textContent = 'User Reviews';
  renderReviews(getReviews());
}

// Routing (hash-based for file:// compatibility)
function hideAllPages() {
  ['homepage','banner','about-page','review-flow','category-page'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
}

function handleRoute() {
  const hash = window.location.hash;
  hideAllPages();

  if (hash === '#/about') {
    document.getElementById('about-page').classList.remove('hidden');
  } else if (hash.startsWith('#/category/')) {
    const key = hash.replace('#/category/', '');
    if (categoryMeta[key]) {
      document.getElementById('category-page').classList.remove('hidden');
      renderCategoryPage(key);
    } else {
      document.getElementById('homepage').classList.remove('hidden');
      document.getElementById('banner').classList.remove('hidden');
    }
  } else {
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('banner').classList.remove('hidden');
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleRoute);

// Section scroll links (prevent hash-based routing from firing for #section- anchors)
document.querySelectorAll('.global-nav-link[data-section]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const id = this.getAttribute('href').replace('#', '');
    // If not on homepage, go home first
    if (window.location.hash && window.location.hash !== '') {
      window.location.hash = '';
    }
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const navHeight = document.getElementById('global-nav').offsetHeight;
        const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }, 50);
  });
});

// Active nav state based on scroll position
const sectionIds = ['section-experience','section-categories','section-map','section-ages','section-reviews'];

function updateActiveNav() {
  // Only highlight on homepage
  if (window.location.hash && window.location.hash !== '') {
    document.querySelectorAll('.global-nav-link.active').forEach(l => l.classList.remove('active'));
    // Highlight About if on about page
    if (window.location.hash === '#/about') {
      document.querySelectorAll('.global-nav-link[href="#/about"]').forEach(l => l.classList.add('active'));
    }
    return;
  }

  const navHeight = document.getElementById('global-nav').offsetHeight;
  let current = '';

  for (const id of sectionIds) {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top - navHeight - 20;
      if (top <= 0) current = id;
    }
  }

  document.querySelectorAll('.global-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '#' + current) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
window.addEventListener('hashchange', updateActiveNav);
updateActiveNav();

function toggleMobileNav() {
  document.getElementById('nav-mobile').classList.toggle('hidden');
}

function closeMobileNav() {
  document.getElementById('nav-mobile').classList.add('hidden');
}

// Initial render with cached data, then refresh from sheet
renderHomepage();
renderMap(getReviews());
handleRoute();

fetchReviewsFromSheet().then(function() {
  renderHomepage();
  renderMap(getReviews());
});

// ============================================
// FLOW: NAVIGATION
// ============================================
function startReview() {
  formData = { overall: 0, categories: {}, reflection: {}, age: null, state: '', tags: [] };
  currentStep = 1;
  hideAllPages();
  document.getElementById('review-flow').classList.remove('hidden');
  window.scrollTo(0, 0);
  showStep(1);
  buildOverallStars();
  buildCategoryRatings();
  buildLifeTags();
  // Reset form fields
  document.getElementById('ref-harder').value = '';
  document.getElementById('ref-better').value = '';
  document.getElementById('ref-learned').value = '';
  document.getElementById('ctx-age').value = '';
  document.getElementById('ctx-state').value = '';
}

function goHome() {
  hideAllPages();
  document.getElementById('homepage').classList.remove('hidden');
  document.getElementById('banner').classList.remove('hidden');
  renderHomepage();
  activeMapFilter = null;
  renderMap(getReviews());
  document.getElementById('map-filter-bar').classList.add('hidden');
  document.getElementById('reviews-section-label').textContent = 'User Reviews';
  window.location.hash = '';
  window.scrollTo(0, 0);
}

function showAbout() {
  window.location.hash = '#/about';
}

function showStep(n) {
  currentStep = n;
  document.querySelectorAll('.flow-step').forEach(el => el.classList.remove('active'));
  const target = document.querySelector(`.flow-step[data-step="${n}"]`);
  if (target) {
    target.classList.remove('active');
    void target.offsetWidth;
    target.classList.add('active');
  }
  document.querySelectorAll('.flow-progress-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i < n);
  });
}

function nextStep() { if (currentStep < 5) showStep(currentStep + 1); }
function prevStep() { if (currentStep > 1) showStep(currentStep - 1); }
function skipOverall() { formData.overall = 0; nextStep(); }

// ============================================
// FLOW: STEP 1 — Overall Stars
// ============================================
function buildOverallStars() {
  const container = document.getElementById('overall-stars');
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '\u2605';
    star.dataset.value = i;
    star.addEventListener('mouseenter', () => hoverOverall(i));
    star.addEventListener('mouseleave', () => unhoverOverall());
    star.addEventListener('click', () => selectOverall(i));
    container.appendChild(star);
  }
}

function hoverOverall(n) {
  document.querySelectorAll('#overall-stars .star').forEach((s, i) => {
    s.classList.toggle('hovered', i < n);
  });
  document.getElementById('overall-label').textContent = overallLabels[n];
}

function unhoverOverall() {
  document.querySelectorAll('#overall-stars .star').forEach(s => s.classList.remove('hovered'));
  document.getElementById('overall-label').textContent = formData.overall ? overallLabels[formData.overall] : '\u00a0';
}

function selectOverall(n) {
  formData.overall = n;
  document.querySelectorAll('#overall-stars .star').forEach((s, i) => {
    s.classList.toggle('selected', i < n);
  });
  document.getElementById('overall-label').textContent = overallLabels[n];
}

// ============================================
// FLOW: STEP 2 — Category Ratings
// ============================================
function buildCategoryRatings() {
  const list = document.getElementById('category-rating-list');
  list.innerHTML = categoryKeys.map(key => {
    const meta = categoryMeta[key];
    const stars = [1,2,3,4,5].map(i =>
      `<span class="star" data-cat="${key}" data-value="${i}"
        onmouseenter="hoverCat('${key}',${i})"
        onmouseleave="unhoverCat('${key}')"
        onclick="selectCat('${key}',${i})">\u2605</span>`
    ).join('');
    return `<div class="category-rating-row">
      <div class="category-rating-name">${meta.name}</div>
      <div class="star-picker">${stars}</div>
    </div>`;
  }).join('');
}

function hoverCat(key, n) {
  document.querySelectorAll(`.star[data-cat="${key}"]`).forEach((s, i) => {
    s.classList.toggle('hovered', i < n);
  });
}

function unhoverCat(key) {
  document.querySelectorAll(`.star[data-cat="${key}"]`).forEach(s => s.classList.remove('hovered'));
}

function selectCat(key, n) {
  formData.categories[key] = n;
  document.querySelectorAll(`.star[data-cat="${key}"]`).forEach((s, i) => {
    s.classList.toggle('selected', i < n);
  });
  checkStep2Complete();
}

function checkStep2Complete() {
  document.getElementById('step2-next').disabled = !categoryKeys.every(k => formData.categories[k]);
}

// ============================================
// FLOW: STEP 4 — Life Tags
// ============================================
function buildLifeTags() {
  const container = document.getElementById('life-tags');
  container.innerHTML = lifeTags.map(t =>
    `<button class="flow-tag" onclick="toggleTag(this, '${t}')">${t}</button>`
  ).join('');
  document.getElementById('ctx-age').addEventListener('input', checkStep4Complete);
}

function toggleTag(el, tag) {
  el.classList.toggle('selected');
  if (formData.tags.includes(tag)) {
    formData.tags = formData.tags.filter(t => t !== tag);
  } else {
    formData.tags.push(tag);
  }
}

function checkStep4Complete() {
  const age = parseInt(document.getElementById('ctx-age').value);
  document.getElementById('step4-next').disabled = !(age >= 18 && age <= 120);
}

// ============================================
// SUBMIT & RESULTS
// ============================================
function submitReview() {
  formData.age = parseInt(document.getElementById('ctx-age').value);
  formData.state = document.getElementById('ctx-state').value.trim();
  formData.reflection = {
    harder: document.getElementById('ref-harder').value.trim(),
    better: document.getElementById('ref-better').value.trim(),
    learned: document.getElementById('ref-learned').value.trim(),
  };

  // Save review
  const review = { ...formData, created_at: new Date().toISOString() };
  cachedReviews.push(review);
  localStorage.setItem('adulthood_reviews', JSON.stringify(cachedReviews));
  postReviewToSheet(review);

  // Calculate overall if skipped
  const catValues = Object.values(formData.categories);
  const catAvg = catValues.reduce((a, b) => a + b, 0) / catValues.length;
  const displayOverall = formData.overall || Math.round(catAvg * 10) / 10;

  // Render results
  document.getElementById('results-overall-score').textContent =
    (formData.overall || catAvg.toFixed(1)) + ' / 5';
  document.getElementById('results-overall-stars').textContent =
    starsString(displayOverall);

  // Category comparison — compare against all other reviews
  const allReviews = getReviews();
  const globalAvgs = getCategoryAverages(allReviews);

  document.getElementById('results-categories').innerHTML = categoryKeys.map(key => {
    const yours = formData.categories[key];
    const avg = globalAvgs[key];
    const diff = yours - avg;
    let vsClass = 'same', vsText = 'Average';
    if (allReviews.length > 1) {
      if (diff >= 0.5) { vsClass = 'above'; vsText = `+${diff.toFixed(1)} above avg`; }
      else if (diff <= -0.5) { vsClass = 'below'; vsText = `${diff.toFixed(1)} below avg`; }
    } else {
      vsText = 'First review';
    }
    return `<div class="results-cat-row">
      <span class="results-cat-name">${categoryMeta[key].name}</span>
      <div class="results-cat-right">
        <span class="results-cat-stars">${starsString(yours)}</span>
        <span class="results-cat-vs ${vsClass}">${vsText}</span>
      </div>
    </div>`;
  }).join('');

  // Reflections
  const refs = [];
  if (formData.reflection.harder) refs.push({ label: 'Harder than expected', text: formData.reflection.harder });
  if (formData.reflection.better) refs.push({ label: 'Better than expected', text: formData.reflection.better });
  if (formData.reflection.learned) refs.push({ label: "What I've learned", text: formData.reflection.learned });

  const refContainer = document.getElementById('results-reflection');
  if (refs.length) {
    refContainer.classList.remove('hidden');
    refContainer.innerHTML = refs.map(r =>
      `<div class="results-reflection-item">
        <div class="results-reflection-label">${r.label}</div>
        <div class="results-reflection-text">&ldquo;${r.text}&rdquo;</div>
      </div>`
    ).join('');
  } else {
    refContainer.classList.add('hidden');
  }

  showStep(5);
}

// ============================================
// CATEGORY DETAIL PAGE
// ============================================
function renderCategoryPage(key) {
  const meta = categoryMeta[key];
  const allReviews = getReviews();
  const catReviews = allReviews.filter(r => r.categories[key] != null);
  const ratings = catReviews.map(r => r.categories[key]);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  // Distribution (1-5 stars)
  const dist = [0, 0, 0, 0, 0];
  ratings.forEach(r => { if (r >= 1 && r <= 5) dist[r - 1]++; });
  const maxDist = Math.max(...dist, 1);

  const distHtml = [5, 4, 3, 2, 1].map(n => {
    const count = dist[n - 1];
    const pct = (count / maxDist) * 100;
    return `<div class="cp-dist-row">
      <span class="cp-dist-label">${n}</span>
      <div class="cp-dist-bar"><div class="cp-dist-fill" style="width:${pct}%"></div></div>
      <span class="cp-dist-count">${count}</span>
    </div>`;
  }).join('');

  // Age breakdown for this category
  const ageHtml = ageGroupDefs.map(g => {
    const groupReviews = catReviews.filter(r => r.age >= g.min && r.age <= g.max);
    if (!groupReviews.length) return '';
    const groupAvg = groupReviews.map(r => r.categories[key]).reduce((a, b) => a + b, 0) / groupReviews.length;
    return `<div class="cp-age-row">
      <span class="cp-age-range">${g.range}</span>
      <span class="cp-age-stars">${starsString(groupAvg)}</span>
      <span class="cp-age-avg">${groupAvg.toFixed(1)}</span>
      <span class="cp-age-count">${groupReviews.length} review${groupReviews.length !== 1 ? 's' : ''}</span>
    </div>`;
  }).join('');

  // Recent reviews with reflections
  const reviewCards = catReviews
    .filter(r => r.reflection && (r.reflection.harder || r.reflection.better || r.reflection.learned))
    .sort((a, b) => (b.categories[key] || 0) - (a.categories[key] || 0))
    .slice(0, 12)
    .map(r => {
      const rating = r.categories[key];
      const sentiment = getSentimentLabel(rating);
      const tags = (r.tags || []);
      const tagParts = [];
      if (r.state) tagParts.push(r.state);
      tagParts.push(...tags);
      const reviewIdx = allReviews.indexOf(r);

      const reflections = [];
      if (r.reflection.harder) reflections.push({ label: 'Harder than expected', text: r.reflection.harder });
      if (r.reflection.better) reflections.push({ label: 'Better than expected', text: r.reflection.better });
      if (r.reflection.learned) reflections.push({ label: "What I've learned", text: r.reflection.learned });

      return `<div class="cp-review-card" onclick="openReviewModal(${reviewIdx})" style="cursor:pointer">
        <div class="cp-review-top">
          <div>
            <div class="cp-review-name">Age ${r.age}</div>
            <div class="cp-review-tags">${tagParts.join(' \u00B7 ')}</div>
          </div>
          <div class="cp-review-stars">${starsString(rating)}</div>
        </div>
        <div class="cat-review-sentiment cat-sentiment-${sentiment.cls}">
          <span class="cat-sentiment-badge">${sentiment.emoji} <strong>${sentiment.text}</strong></span>
        </div>
        ${reflections.map(ref => `
          <div class="cp-review-ref">
            <div class="cp-review-ref-label">${ref.label}</div>
            <div class="cp-review-ref-text">&ldquo;${ref.text}&rdquo;</div>
          </div>
        `).join('')}
      </div>`;
    }).join('');

  // Related categories (others sorted by how they correlate)
  const otherCats = displayOrder.filter(k => k !== key).map(k => {
    const otherAvg = catReviews.length
      ? catReviews.map(r => r.categories[k]).filter(v => v != null).reduce((a, b) => a + b, 0) / catReviews.length
      : 0;
    return `<a class="cp-related-cat" href="#/category/${k}">
      <span class="cp-related-name">${categoryMeta[k].name}</span>
      <span class="cp-related-stars">${starsString(otherAvg)} ${otherAvg.toFixed(1)}</span>
    </a>`;
  }).join('');

  document.getElementById('category-page-content').innerHTML = `
    <div class="cp-layout">
      <div class="cp-left">
        <button class="about-back" onclick="goHome()">&larr; Back</button>
        <div class="cp-sticky">
          <div class="cp-image-placeholder">
            <div class="cp-image-icon">${meta.name.replace(/™/g, '')}</div>
          </div>
          <div class="cp-rating-big">${avg.toFixed(1)}</div>
          <div class="cp-rating-stars">${starsString(avg)}</div>
          <div class="cp-rating-count">${ratings.length} rating${ratings.length !== 1 ? 's' : ''}</div>
          <div class="cp-distribution">${distHtml}</div>
        </div>
      </div>
      <div class="cp-right">
        <div class="cp-header">
          <div class="cp-tagline">${meta.tagline}</div>
          <h1 class="cp-title">${meta.name}</h1>
          <p class="cp-desc">${meta.desc}</p>
        </div>

        <hr class="cp-divider">

        <div class="cp-section">
          <div class="cp-section-label">By Age Group</div>
          <div class="cp-age-grid">${ageHtml || '<div style="color:#8a8478">Not enough data yet.</div>'}</div>
        </div>

        <hr class="cp-divider">

        <div class="cp-section">
          <div class="cp-section-label">What People Are Saying</div>
          <div class="cp-reviews-list">${reviewCards || '<div style="color:#8a8478">No written reviews yet.</div>'}</div>
        </div>

        <hr class="cp-divider">

        <div class="cp-section">
          <div class="cp-section-label">Other Categories</div>
          <div class="cp-related-grid">${otherCats}</div>
        </div>
      </div>
    </div>`;
}

// ============================================
// REVIEW DETAIL MODAL
// ============================================
function openReviewModal(idx) {
  const r = getReviews()[idx];
  if (!r) return;

  const rating = getReviewRating(r);
  const seed = `${r.age}-${r.state || ''}-${idx}`;
  const initial = String(r.age).charAt(0);
  const color = getInitialColor(seed);
  const sentiment = getSentimentLabel(rating);
  const tags = (r.tags || []);

  const tagsHtml = tags.length ? `<div class="rm-tags">${tags.map(t => `<span class="rm-tag">${t}</span>`).join('')}</div>` : '';

  const catRows = displayOrder.map(key => `
    <div class="rm-cat-row">
      <div class="rm-cat-name">${categoryMeta[key].name}</div>
      <div class="rm-cat-stars">${starsString(r.categories[key])}</div>
    </div>`).join('');

  const reflections = [];
  if (r.reflection) {
    if (r.reflection.harder) reflections.push({ label: 'Harder than expected', text: r.reflection.harder });
    if (r.reflection.better) reflections.push({ label: 'Better than expected', text: r.reflection.better });
    if (r.reflection.learned) reflections.push({ label: "What I've learned", text: r.reflection.learned });
  }
  const refHtml = reflections.map(ref => `
    <div class="rm-reflection">
      <div class="rm-ref-label">${ref.label}</div>
      <div class="rm-ref-text">&ldquo;${ref.text}&rdquo;</div>
    </div>`).join('');

  document.getElementById('review-modal-content').innerHTML = `
    <div class="rm-header">
      <div class="rm-avatar" style="background:${color}">${initial}</div>
      <div>
        <div class="rm-name">Age ${r.age}</div>
        <div class="rm-meta">${r.state || 'Anonymous'}${tags.length ? ' \u00B7 ' + tags.join(', ') : ''}</div>
      </div>
    </div>

    <div class="rm-overall">
      <div class="rm-overall-stars">${starsString(rating)}</div>
      <div class="rm-overall-label">${sentiment.emoji} ${sentiment.text} \u00B7 ${rating.toFixed(1)} overall</div>
    </div>

    ${tagsHtml}

    <div class="rm-section">
      <div class="rm-section-title">Category Ratings</div>
      <div class="rm-categories">${catRows}</div>
    </div>

    ${reflections.length ? `<div class="rm-section"><div class="rm-section-title">Reflections</div>${refHtml}</div>` : ''}
  `;

  document.getElementById('review-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeReviewModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('review-modal').classList.remove('open');
  document.body.style.overflow = '';
}
