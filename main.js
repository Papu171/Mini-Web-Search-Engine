// ─────────────────────────────────────────────
//  NFL Search Engine · main.js
// ─────────────────────────────────────────────

const form             = document.getElementById("searchForm");
const queryInput       = document.getElementById("queryInput");
const resultsArea      = document.getElementById("resultsArea");
const compareGrid      = document.getElementById("compareGrid");
const singleResults    = document.getElementById("singleResults");
const noResults        = document.getElementById("noResults");
const spinnerOverlay   = document.getElementById("spinnerOverlay");
const acDropdown       = document.getElementById("autocompleteDropdown");

// Suggestion data — document titles + categories from the corpus
// Populated after stats load
let suggestionData = [];
let acActiveIndex  = -1;

// ── Load stats on page load ──────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res  = await fetch("/stats");
    const data = await res.json();
    document.getElementById("statDocs").textContent  = data.total_documents;
    document.getElementById("statVocab").textContent = data.vocabulary_size.toLocaleString();
    document.getElementById("statAvg").textContent   = data.avg_document_length + " tk";

    // Update hero subtitle dynamically
    const heroSub = document.getElementById("heroSub");
    if (heroSub) {
      heroSub.textContent = `${data.total_documents} documents · BM25 vs TF-IDF comparison · Inverted index search`;
    }
  } catch (e) {
    console.error("Could not load stats:", e);
  }

  // Pre-load suggestion data from corpus titles
  try {
    const res  = await fetch("/suggestions");
    const data = await res.json();
    suggestionData = data.suggestions || [];
  } catch (e) {
    // Fallback: use hardcoded NFL terms
    suggestionData = buildFallbackSuggestions();
  }
});

// ── Fallback suggestions if /suggestions route missing ──
function buildFallbackSuggestions() {
  return [
    { text: "Tom Brady Super Bowl championship",   category: "players" },
    { text: "Patrick Mahomes Kansas City Chiefs",  category: "players" },
    { text: "Josh Allen Buffalo Bills quarterback",category: "players" },
    { text: "Aaron Donald defensive player",       category: "players" },
    { text: "Drew Brees New Orleans Saints",       category: "players" },
    { text: "Justin Jefferson wide receiver",      category: "players" },
    { text: "Joe Burrow Cincinnati Bengals",       category: "players" },
    { text: "Jerry Rice San Francisco 49ers",      category: "players" },
    { text: "Lamar Jackson Baltimore Ravens MVP",  category: "players" },
    { text: "Travis Kelce tight end",              category: "players" },
    { text: "Super Bowl comeback greatest",        category: "superbowls" },
    { text: "Super Bowl LI 28-3 comeback",         category: "superbowls" },
    { text: "Super Bowl XLII helmet catch",        category: "superbowls" },
    { text: "greatest defense NFL history",        category: "history" },
    { text: "New England Patriots dynasty",        category: "teams" },
    { text: "Kansas City Chiefs dynasty",          category: "teams" },
    { text: "Dallas Cowboys America's Team",       category: "teams" },
    { text: "Pittsburgh Steelers Steel Curtain",   category: "teams" },
    { text: "Green Bay Packers Lambeau Field",     category: "teams" },
    { text: "NFL Draft first overall pick",        category: "history" },
    { text: "Monday Night Football ABC ESPN",      category: "media" },
    { text: "CTE player safety concussion",        category: "history" },
    { text: "rushing yards touchdown record",      category: "players" },
    { text: "quarterback MVP award season",        category: "players" },
    { text: "wide receiver receiving yards",       category: "players" },
  ];
}

// ── Autocomplete logic ───────────────────────
queryInput.addEventListener("input", () => {
  const val = queryInput.value.trim();
  if (val.length < 2) {
    closeDropdown();
    return;
  }
  const matches = suggestionData
    .filter(s => s.text.toLowerCase().includes(val.toLowerCase()))
    .slice(0, 7);

  if (!matches.length) {
    closeDropdown();
    return;
  }

  acActiveIndex = -1;
  acDropdown.innerHTML = "";

  matches.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "ac-item";
    div.dataset.index = i;

    const highlighted = item.text.replace(
      new RegExp(`(${escapeRegex(val)})`, "gi"),
      "<mark>$1</mark>"
    );

    div.innerHTML = `
      <svg class="ac-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span class="ac-text">${highlighted}</span>
      <span class="ac-category">${item.category}</span>
    `;

    div.addEventListener("mousedown", (e) => {
      e.preventDefault();
      queryInput.value = item.text;
      closeDropdown();
      runSearch();
    });

    acDropdown.appendChild(div);
  });

  acDropdown.classList.add("visible");
});

// Keyboard navigation for dropdown
queryInput.addEventListener("keydown", (e) => {
  const items = acDropdown.querySelectorAll(".ac-item");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1);
    updateActiveItem(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    acActiveIndex = Math.max(acActiveIndex - 1, -1);
    updateActiveItem(items);
  } else if (e.key === "Escape") {
    closeDropdown();
  } else if (e.key === "Enter" && acActiveIndex >= 0) {
    e.preventDefault();
    queryInput.value = items[acActiveIndex].querySelector(".ac-text").textContent;
    closeDropdown();
    runSearch();
  }
});

function updateActiveItem(items) {
  items.forEach((el, i) => {
    el.classList.toggle("active", i === acActiveIndex);
    if (i === acActiveIndex) {
      queryInput.value = el.querySelector(".ac-text").textContent;
    }
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box-wrap")) closeDropdown();
});

function closeDropdown() {
  acDropdown.classList.remove("visible");
  acDropdown.innerHTML = "";
  acActiveIndex = -1;
}

// ── Quick suggestion chips ───────────────────
document.querySelectorAll(".sug-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    queryInput.value = chip.dataset.q;
    closeDropdown();
    runSearch();
  });
});

// ── Form submit ──────────────────────────────
form.addEventListener("submit", (e) => {
  e.preventDefault();
  closeDropdown();
  runSearch();
});

// ── Main search function ─────────────────────
async function runSearch() {
  const query = queryInput.value.trim();
  if (!query) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;

  showSpinner(true);
  hideAllPanels();

  try {
    const url = `/search?q=${encodeURIComponent(query)}&mode=${mode}&top_k=10`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) { showNoResults(); return; }

    document.getElementById("metaQuery").textContent = query;
    resultsArea.style.display = "block";
    resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });

    if (mode === "compare") renderCompare(data);
    else renderSingle(data, mode);

  } catch (err) {
    console.error("Search error:", err);
    showNoResults();
  } finally {
    showSpinner(false);
  }
}

// ── Render Compare Mode ──────────────────────
function renderCompare(data) {
  const bm25Results  = data.bm25?.results  || [];
  const tfidfResults = data.tfidf?.results || [];

  document.getElementById("metaTime").textContent =
    `BM25: ${data.bm25.time_ms}ms · TF-IDF: ${data.tfidf.time_ms}ms`;
  document.getElementById("bm25Time").textContent  = `${data.bm25.time_ms} ms`;
  document.getElementById("tfidfTime").textContent = `${data.tfidf.time_ms} ms`;

  if (!bm25Results.length && !tfidfResults.length) { showNoResults(); return; }

  renderResultList("bm25List",  bm25Results,  "bm25");
  renderResultList("tfidfList", tfidfResults, "tfidf");
  compareGrid.style.display = "grid";
}

// ── Render Single Mode ───────────────────────
function renderSingle(data, mode) {
  const results = data.results || [];
  document.getElementById("metaTime").textContent = "";

  if (!results.length) { showNoResults(); return; }

  const header  = document.getElementById("singleHeader");
  const isB     = mode === "bm25";
  header.className = `single-header algo-header ${isB ? "bm25-header" : "tfidf-header"}`;
  header.innerHTML = `
    <div class="algo-badge">${isB ? "BM25" : "TF-IDF"}</div>
    <div class="algo-desc">${isB ? "Best Match 25 · k₁=1.5 · b=0.75" : "Term Frequency · Inverse Document Frequency"}</div>
  `;

  renderResultList("singleList", results, mode);
  singleResults.style.display = "block";
}

// ── Build result cards ───────────────────────
function renderResultList(containerId, results, algo) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!results.length) {
    container.innerHTML = `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No results found.</p>`;
    return;
  }

  results.forEach((doc, i) => {
    const card = document.createElement("div");
    card.className = `result-card ${algo}-card`;
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-rank">${String(i + 1).padStart(2, "0")}</div>
        <div class="card-title-wrap">
          <div class="card-title">${escapeHtml(doc.title)}</div>
          <div class="card-meta">
            <span class="card-category">${doc.category}</span>
          </div>
        </div>
        <div class="card-score-wrap">
          <div class="card-score">${doc.score}</div>
          <div class="card-score-lbl">score</div>
        </div>
      </div>
      <div class="card-text">${escapeHtml(doc.text)}</div>
      <div class="card-source">
        📎 <a href="${doc.source}" target="_blank" rel="noopener">${doc.source}</a>
      </div>
    `;
    container.appendChild(card);
  });
}

// ── Helpers ──────────────────────────────────
function hideAllPanels() {
  compareGrid.style.display   = "none";
  singleResults.style.display = "none";
  noResults.style.display     = "none";
  resultsArea.style.display   = "none";
}

function showNoResults() {
  resultsArea.style.display = "block";
  noResults.style.display   = "block";
}

function showSpinner(visible) {
  spinnerOverlay.style.display = visible ? "flex" : "none";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// ── Load stats on page load ──────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res  = await fetch("/stats");
    const data = await res.json();
    document.getElementById("statDocs").textContent  = data.total_documents;
    document.getElementById("statVocab").textContent = data.vocabulary_size.toLocaleString();
    document.getElementById("statAvg").textContent   = data.avg_document_length + " tk";
  } catch (e) {
    console.error("Could not load stats:", e);
  }
});

// ── Quick suggestion chips ───────────────────
document.querySelectorAll(".sug-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    queryInput.value = chip.dataset.q;
    runSearch();
  });
});

// ── Form submit ──────────────────────────────
form.addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch();
});

// ── Main search function ─────────────────────
async function runSearch() {
  const query = queryInput.value.trim();
  if (!query) return;

  const mode = document.querySelector('input[name="mode"]:checked').value;

  showSpinner(true);
  hideAllPanels();

  try {
    const url = `/search?q=${encodeURIComponent(query)}&mode=${mode}&top_k=10`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      showNoResults();
      return;
    }

    // Update meta bar
    document.getElementById("metaQuery").textContent = query;
    resultsArea.style.display = "block";
    resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });

    if (mode === "compare") {
      renderCompare(data);
    } else {
      renderSingle(data, mode);
    }

  } catch (err) {
    console.error("Search error:", err);
    showNoResults();
  } finally {
    showSpinner(false);
  }
}

// ── Render Compare Mode ──────────────────────
function renderCompare(data) {
  const bm25Results  = data.bm25?.results  || [];
  const tfidfResults = data.tfidf?.results || [];

  document.getElementById("metaTime").textContent =
    `BM25: ${data.bm25.time_ms}ms · TF-IDF: ${data.tfidf.time_ms}ms`;

  document.getElementById("bm25Time").textContent  = `${data.bm25.time_ms} ms`;
  document.getElementById("tfidfTime").textContent = `${data.tfidf.time_ms} ms`;

  if (!bm25Results.length && !tfidfResults.length) {
    showNoResults();
    return;
  }

  renderResultList("bm25List",  bm25Results,  "bm25");
  renderResultList("tfidfList", tfidfResults, "tfidf");

  compareGrid.style.display = "grid";
}

// ── Render Single Mode ───────────────────────
function renderSingle(data, mode) {
  const results = data.results || [];

  document.getElementById("metaTime").textContent = "";

  if (!results.length) {
    showNoResults();
    return;
  }

  // Style the single header
  const header = document.getElementById("singleHeader");
  const isB = mode === "bm25";
  header.className = `single-header algo-header ${isB ? "bm25-header" : "tfidf-header"}`;
  header.innerHTML = `
    <div class="algo-badge">${isB ? "BM25" : "TF-IDF"}</div>
    <div class="algo-desc">${isB ? "Best Match 25 · k₁=1.5 · b=0.75" : "Term Frequency · Inverse Document Frequency"}</div>
  `;

  renderResultList("singleList", results, mode);
  singleResults.style.display = "block";
}

// ── Build result cards ───────────────────────
function renderResultList(containerId, results, algo) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!results.length) {
    container.innerHTML = `<p style="padding:20px;color:var(--text-muted);font-size:13px;">No results found.</p>`;
    return;
  }

  results.forEach((doc, i) => {
    const card = document.createElement("div");
    card.className = `result-card ${algo}-card`;
    card.style.animationDelay = `${i * 40}ms`;

    card.innerHTML = `
      <div class="card-top">
        <div class="card-rank">${String(i + 1).padStart(2, "0")}</div>
        <div class="card-title-wrap">
          <div class="card-title">${escapeHtml(doc.title)}</div>
          <div class="card-meta">
            <span class="card-category">${doc.category}</span>
          </div>
        </div>
        <div class="card-score-wrap">
          <div class="card-score">${doc.score}</div>
          <div class="card-score-lbl">score</div>
        </div>
      </div>
      <div class="card-text">${escapeHtml(doc.text)}</div>
      <div class="card-source">
        📎 <a href="${doc.source}" target="_blank" rel="noopener">${doc.source}</a>
      </div>
    `;

    container.appendChild(card);
  });
}

// ── Helpers ──────────────────────────────────
function hideAllPanels() {
  compareGrid.style.display   = "none";
  singleResults.style.display = "none";
  noResults.style.display     = "none";
  resultsArea.style.display   = "none";
}

function showNoResults() {
  resultsArea.style.display = "block";
  noResults.style.display   = "block";
}

function showSpinner(visible) {
  spinnerOverlay.style.display = visible ? "flex" : "none";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}