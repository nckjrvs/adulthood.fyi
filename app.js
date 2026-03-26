// ============================================
// DATA
// ============================================
const categoryKeys = ['money','job','paying','freedom','relationships','time_energy','purpose'];

const categoryMeta = {
  money:         { name: "Making Money™" },
  job:           { name: "Having a Job™" },
  paying:        { name: "Paying for Life™" },
  freedom:       { name: "Freedom™" },
  relationships: { name: "Relationships™" },
  time_energy:   { name: "Time & Energy™" },
  purpose:       { name: "Purpose & Progress™" },
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
  renderReviews(allReviews);
  renderAgeGroups(allReviews);
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

function renderCategories(allReviews) {
  const grid = document.getElementById('category-grid');
  if (!allReviews.length) {
    grid.innerHTML = displayOrder.map(key => `
      <div class="category-row">
        <div class="category-name">${categoryMeta[key].name}</div>
        <div class="category-stars" style="color:#ccc">\u2606\u2606\u2606\u2606\u2606</div>
        <div class="category-quip">No ratings yet</div>
      </div>`).join('');
    return;
  }
  const avgs = getCategoryAverages(allReviews);
  grid.innerHTML = displayOrder.map(key => `
    <div class="category-row">
      <div class="category-name">${categoryMeta[key].name}</div>
      <div class="category-stars">${starsString(avgs[key])}</div>
      <div class="category-quip">${avgs[key].toFixed(1)} avg</div>
    </div>`).join('');
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

// Initial render with cached data, then refresh from sheet
renderHomepage();
renderMap(getReviews());

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
  document.getElementById('homepage').classList.add('hidden');
  document.getElementById('about-page').classList.add('hidden');
  document.getElementById('banner').classList.add('hidden');
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
  document.getElementById('review-flow').classList.add('hidden');
  document.getElementById('about-page').classList.add('hidden');
  document.getElementById('homepage').classList.remove('hidden');
  document.getElementById('banner').classList.remove('hidden');
  renderHomepage();
  activeMapFilter = null;
  renderMap(getReviews());
  document.getElementById('map-filter-bar').classList.add('hidden');
  document.getElementById('reviews-section-label').textContent = 'User Reviews';
  window.scrollTo(0, 0);
}

function showAbout() {
  document.getElementById('homepage').classList.add('hidden');
  document.getElementById('banner').classList.add('hidden');
  document.getElementById('about-page').classList.remove('hidden');
  window.scrollTo(0, 0);
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
