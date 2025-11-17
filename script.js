// script.js — full interactive prototype with persistence, per-college notices, student-wants, animations
// (Updated: removed Export CSV + Zero Distraction acts like demo feature instead of toggling layout)

// Storage keys
const LIST_KEY = "studyflow_colleges";
const FAV_KEY = "studyflow_favorites";
const BULLETIN_KEY = "studyflow_bulletins";
const WANTS_KEY = "studyflow_wants";
const WANTS_VOTES_KEY = "studyflow_wants_votes";
const REQ_KEY = "studyflow_requests"; // new

// Basic DOM refs
const listSection = document.getElementById("listSection");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const resultCount = document.getElementById("resultCount");
const currentQuery = document.getElementById("currentQuery");
const filterChips = document.getElementById("filterChips");

const profileDrawer = document.getElementById("profileDrawer");
const profileContent = document.getElementById("profileContent");
const closeDrawer = document.getElementById("closeDrawer");

// modal refs
const studentModal = document.getElementById("studentModal");
const teacherModal = document.getElementById("teacherModal");
const addCollegeModal = document.getElementById("addCollegeModal");
const facultyModal = document.getElementById("facultyModal");

// request UI
const reqFeatureBtn = document.getElementById("reqFeatureBtn");
const reqBadge = document.getElementById("reqBadge");

// wire nav buttons
document.getElementById("openStudent").addEventListener("click", () => openModal("studentModal"));
document.getElementById("openTeacher").addEventListener("click", () => openModal("teacherModal"));
document.getElementById("addCollege").addEventListener("click", () => openModal("addCollegeModal"));

// Modal helpers
function setupModalCloseHandlers() {
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", (e) => {
    closeModal(e.currentTarget.getAttribute("data-close"));
  }));
  document.querySelectorAll(".modal-close").forEach(b => b.addEventListener("click", () => {
    const m = b.closest(".modal");
    if (m) m.setAttribute("aria-hidden", "true");
  }));
  document.querySelectorAll(".modal").forEach(m => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.setAttribute("aria-hidden", "true");
    });
  });
}
setupModalCloseHandlers();

// IMPORTANT: ensure only one modal shows at a time to prevent overlap
function openModal(id) {
  // hide all modals first
  document.querySelectorAll(".modal").forEach(m => {
    m.setAttribute("aria-hidden", "true");
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute("aria-hidden", "false");
  const firstInput = el.querySelector("input, textarea, select, button");
  if (firstInput) setTimeout(() => firstInput.focus(), 170);
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute("aria-hidden", "true");
}

// load/save helpers
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.warn("load error", e);
    return fallback;
  }
}
function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){ console.warn("save error", e); }
}

// Load initial data (persisted) — if none, use window.SEED from data.js
function loadCollegesFromStorage() {
  const raw = loadFromStorage(LIST_KEY, null);
  if (raw && Array.isArray(raw)) return raw;
  return (window.SEED || []).slice();
}
function loadFavoritesFromStorage() {
  const arr = loadFromStorage(FAV_KEY, null);
  return Array.isArray(arr) ? new Set(arr) : new Set();
}
function saveCollegesToStorage() { saveToStorage(LIST_KEY, colleges); }
function saveFavoritesToStorage() { saveToStorage(FAV_KEY, Array.from(favorites)); }

// Bulletins (global)
function loadBulletinsFromStorage() {
  const raw = loadFromStorage(BULLETIN_KEY, null);
  if (!raw) return [{ id: "b-welcome", title: "Welcome to StudyFlow", body: "Prototype live — add notices here.", ts: Date.now() }];
  return Array.isArray(raw) ? raw : [];
}
function saveBulletinsToStorage(){ saveToStorage(BULLETIN_KEY, bulletins); }

// Student wants
function loadWantsFromStorage(){ return loadFromStorage(WANTS_KEY, []); }
function saveWantsToStorage(){ saveToStorage(WANTS_KEY, studentWants); }
function loadWantsVotes(){ return loadFromStorage(WANTS_VOTES_KEY, {}); }
function saveWantsVotes(v){ saveToStorage(WANTS_VOTES_KEY, v); }

// Requests
function loadRequestsFromStorage(){ return loadFromStorage(REQ_KEY, []); }
function saveRequestsToStorage(){ saveToStorage(REQ_KEY, requests); }

// Global state
let colleges = [];
let favorites = new Set();
let bulletins = [];
let studentWants = [];
let wantsVotes = {};
let requests = []; // new: { id, type, extra, details, ts, resolved:false }

// UI helpers
function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// Toast utility with actionable Undo
let _toastTimer = null;
function showActionableToast(message, { actionText = null, actionCallback = null, duration = 6000 } = {}) {
  const t = document.getElementById("sf-toast");
  if (!t) return;

  // clear prior
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  t.innerHTML = "";

  const msg = document.createElement("span");
  msg.textContent = message;
  t.appendChild(msg);

  if (actionText && typeof actionCallback === "function") {
    const btn = document.createElement("button");
    btn.className = "toast-action";
    btn.type = "button";
    btn.textContent = actionText;
    btn.style.marginLeft = "12px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.color = "#065f46";
    btn.style.fontWeight = "700";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
      actionCallback();
      t.classList.remove("show");
      setTimeout(()=> t.innerHTML = "", 300);
    };
    t.appendChild(btn);
  }

  t.classList.add("show");
  _toastTimer = setTimeout(() => {
    t.classList.remove("show");
    _toastTimer = null;
    setTimeout(()=> { t.innerHTML = ""; }, 300);
  }, duration);
}

// simple wrapper
function showToast(msg, ms = 1800) {
  showActionableToast(msg, { duration: ms });
}

// Render chips
function renderChips() {
  const cities = [...new Set(colleges.map(c => c.city || "").filter(Boolean))];
  const courses = [...new Set(colleges.flatMap(c => c.courses || []))];
  const all = ["All", ...cities.slice(0,4), ...courses.slice(0,4)];
  filterChips.innerHTML = all.map(x => `<button class="chip ${x==="All" ? "active" : ""}" data-chip="${x}">${x}</button>`).join("");
  filterChips.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterChips.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      doSearch(searchInput.value, e.currentTarget.getAttribute("data-chip"));
    });
  });
}

// Render list of colleges (UPDATED: shows college logo on each card)
function renderList(items) {
  listSection.innerHTML = "";
  items.forEach((c, idx) => {
    const el = document.createElement("article");
    el.className = "card";
    // stagger animation delay
    el.style.animationDelay = `${Math.min(0.15 * idx, 0.9)}s`;

    const isFav = favorites.has(c.id);
    // use college-specific logo or default
    const cardLogo = escapeHtml(c.logo || 'assets/assets/assets/logos/default-college.png');

    el.innerHTML = `
      <div class="card-head" style="align-items:center">
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${cardLogo}" alt="${escapeHtml(c.name)} logo" class="card-logo" onerror="this.onerror=null;this.src='assets/assets/assets/logos/default-college.png'"/>
          <div>
            <h3>${escapeHtml(c.name)}</h3>
            <div class="muted">${escapeHtml(c.city)}, ${escapeHtml(c.state)}</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;align-items:end;gap:8px">
          <div class="badge">${escapeHtml(c.affiliation)}</div>
          <button class="star ${isFav ? "fav" : ""}" data-fav="${c.id}" title="${isFav ? "Remove favorite" : "Add favorite"}">
            ${isFav ? "★" : "☆"}
          </button>
        </div>
      </div>

      <div class="muted" style="margin-top:8px">${escapeHtml(c.description)}</div>

      <div class="meta">
        <div class="muted">${(c.courses||[]).slice(0,2).join(", ")}</div>
        <div class="actions">
          <button class="action-link" data-slug="${c.slug}">View profile</button>
          <button class="action-link" data-open="${c.id}">Open top resource</button>
          <button class="action-link remove" data-remove="${c.id}" title="Remove college" style="color:#ef4444">Remove</button>
        </div>
      </div>
    `;
    listSection.appendChild(el);
  });

  // listeners
  listSection.querySelectorAll("[data-slug]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const slug = e.currentTarget.getAttribute("data-slug");
      const found = colleges.find(x => x.slug === slug);
      if (found) openProfile(found);
    });
  });
  listSection.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-open");
      const found = colleges.find(x => x.id === id);
      if (found && found.resources && found.resources.length) {
        const r = found.resources[0];
        window.open(r.fileUrl, "_blank");
      } else {
        alert("No resources available in this sample college.");
      }
    });
  });
  listSection.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-fav");
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      saveFavoritesToStorage();
      renderList(currentDisplay);
    });
  });

  // attach remove handlers after rendering
  attachRemoveHandlers();
}

function attachRemoveHandlers() {
  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-remove");
      const col = colleges.find(c => c.id === id);
      if (!col) return alert("College not found.");
      const ok = confirm(`Remove "${col.name}" from this demo? This action will be permanent in this browser (can be undone by re-adding). Continue?`);
      if (!ok) return;
      colleges = colleges.filter(c => c.id !== id);
      saveCollegesToStorage();
      renderChips();
      doSearch(searchInput.value);
      showToast("College removed");
    });
  });
}

// Search + filter
let currentDisplay = [];
function doSearch(query="", chip="All") {
  const q = (query || "").toLowerCase().trim();
  currentQuery.textContent = `Showing: ${q || chip || "all"}`;
  let filtered = colleges.filter(c => {
    const text = `${c.name} ${c.city} ${c.description} ${(c.faculty||[]).map(f=>f.name).join(" ")} ${(c.resources||[]).map(r=>r.title).join(" ")}`.toLowerCase();
    return !q || text.includes(q);
  });
  if (chip && chip !== "All") {
    filtered = filtered.filter(c => (c.city === chip) || (c.courses || []).some(co => co === chip));
  }
  currentDisplay = filtered;
  renderList(filtered);
  resultCount.textContent = `${filtered.length} colleges`;
}

// Add College (persistent)
document.getElementById("addCollegeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("ac-name").value.trim();
  const city = document.getElementById("ac-city").value.trim();
  const state = document.getElementById("ac-state").value.trim();
  const aff = document.getElementById("ac-aff").value.trim();
  if (!name || !city) return alert("Please provide name and city.");
  const id = "c" + (Date.now());
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  const newC = { id, name, slug, city, state, affiliation: aff, description: "Added in demo", courses: [], faculty: [], resources: [], notices: [] };
  colleges.unshift(newC);
  saveCollegesToStorage();
  renderChips();
  doSearch(searchInput.value);
  closeModal("addCollegeModal");
  document.getElementById("addCollegeForm").reset();
  showToast("College added");
});

// Student / Teacher demo sign-in (no auth)
document.getElementById("studentForm").addEventListener("submit", (e) => { e.preventDefault(); alert("Signed in as student (demo)."); closeModal("studentModal"); });
document.getElementById("teacherForm").addEventListener("submit", (e) => { e.preventDefault(); alert("Signed in as teacher (demo)."); closeModal("teacherModal"); });

// Feature actions & distraction toggle
document.addEventListener("click", (e) => {
  const fb = e.target.closest && e.target.closest(".feature-btn");
  if (!fb) return;
  const feat = fb.getAttribute("data-feature");
  // changed: Zero Distraction now opens demo modal instead of toggling layout
  if (!feat && fb.id === "toggleDistraction") {
    openFeatureModal("Zero Distraction Mode (Demo)", `<p>Zero Distraction Mode is available in the full app. This is a demo version.</p>
      <div style="margin-top:10px">
        <button class="btn primary" onclick="alert('Zero Distraction demo activated')">Try Demo</button>
      </div>`);
    return;
  }
  if (!feat) return;
  switch (feat) {
    case "flashcards":
      openFeatureModal("Adaptive Flashcards (demo)", `<p>Demo flashcards — flip, star, and save progress (client-only).</p>
        <button class="btn primary" onclick="alert('Open adaptive flashcards (demo)')">Open Flashcards</button>`);
      break;
    case "schedule":
      openFeatureModal("Smart Schedule Builder (demo)", `<p>Create study blocks & auto-suggest sessions based on difficulty and upcoming PYQs.</p>
        <button class="btn primary" onclick="alert('Open Scheduler (demo)')">Open Scheduler</button>`);
      break;
    case "hub":
      openFeatureModal("College Content Hub", `<p>All resources (notes, PYQs, slides) in one place — filter by course & faculty.</p>
        <button class="btn primary" onclick="alert('Open Content Hub (demo)')">Open Content Hub</button>`);
      break;
    case "mock":
      openFeatureModal("Mock Tests", `<p>Timed mock-tests, auto-evaluation and instant reports (demo).</p>
        <button class="btn primary" onclick="alert('Start Mock Test (demo)')">Start Mock Test</button>`);
      break;
    case "live":
      openFeatureModal("Live Faculty Support", `<p>Request live guidance — book 1:1 slots with faculty (demo).</p>
        <button class="btn primary" onclick="alert('Request Live Session (demo)')">Request Faculty</button>`);
      break;

    // NEW: Student Request Center
    case "requests":
      openFeatureModal("Student Request Center", `<p>Need documents, issues, or form assistance? Submit your request.</p>
        <div style="margin-top:8px">
          <button class="btn primary" onclick="openModal('requestModal')">Submit Request</button>
          <button class="btn ghost" onclick="openModal('requestListModal')">View Requests</button>
        </div>`);
      break;

    default:
      openFeatureModal("Feature", "<p>Demo feature.</p>");
  }
});

function openFeatureModal(title, html) {
  const modal = document.getElementById("featureModal");
  const body = document.getElementById("featureModalBody");
  body.innerHTML = `<h3>${escapeHtml(title)}</h3><div style="margin-top:10px">${html}</div>`;
  openModal("featureModal");
}

// Bulletin board (global) rendering & handlers
function renderBulletins() {
  const container = document.getElementById("bulletinList");
  if (!container) return;
  container.innerHTML = "";
  const now = Date.now();
  bulletins = bulletins.filter(b => !b.expiry || (new Date(b.expiry).getTime() >= now));
  if (!bulletins.length) { container.innerHTML = `<div class="muted">No announcements</div>`; return; }
  const items = bulletins.slice().sort((a,b) => b.ts - a.ts);
  items.forEach((b, idx) => {
    const item = document.createElement("div");
    item.className = "bulletin-item";
    item.style.animationDelay = `${Math.min(0.08 * idx, 0.8)}s`;
    item.innerHTML = `
      <div class="bulletin-left">
        <div class="bulletin-dot" aria-hidden="true"></div>
        <div class="bulletin-content">
          <div class="bulletin-title">${escapeHtml(b.title)}</div>
          <div class="bulletin-meta">${escapeHtml(b.body)} · <span style="opacity:.7">${new Date(b.ts).toLocaleString()}</span>${b.expiry ? ` · Expires: ${new Date(b.expiry).toLocaleDateString()}` : ""}</div>
        </div>
      </div>
      <div class="bulletin-actions">
        <button data-delete="${escapeHtml(b.id)}" title="Delete announcement">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-delete");
      const ok = confirm("Delete this announcement?");
      if (!ok) return;
      bulletins = bulletins.filter(x => x.id !== id);
      saveBulletinsToStorage();
      renderBulletins();
      showToast("Announcement deleted");
    });
  });
}

// add/clear global bulletin
document.getElementById("addBulletinBtn").addEventListener("click", () => {
  const modal = document.getElementById("bulletinModal");
  modal.dataset.targetCollege = ""; // global
  document.getElementById("bulletinTitle").value = "";
  document.getElementById("bulletinBody").value = "";
  document.getElementById("bulletinExpiry").value = "";
  openModal("bulletinModal");
});
document.getElementById("clearBulletinsBtn").addEventListener("click", () => {
  if (!confirm("Clear all global announcements?")) return;
  bulletins = [];
  saveBulletinsToStorage();
  renderBulletins();
  showToast("Announcements cleared");
});

// Bulletin form submit: supports global or per-college (modal.dataset.targetCollege)
document.getElementById("bulletinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const titleEl = document.getElementById("bulletinTitle");
  const bodyEl = document.getElementById("bulletinBody");
  const expEl = document.getElementById("bulletinExpiry");
  const title = (titleEl.value || "").trim();
  const body = (bodyEl.value || "").trim();
  const expiry = expEl.value ? new Date(expEl.value).toISOString() : null;

  if (!title) { alert("Please enter a title."); titleEl.focus(); return; }
  if (!body) { alert("Please enter a message."); bodyEl.focus(); return; }

  const id = "b" + Date.now();
  const item = { id, title, body, ts: Date.now(), expiry };

  const modal = document.getElementById("bulletinModal");
  const targetCollegeId = modal.dataset.targetCollege || "";

  if (targetCollegeId) {
    const col = colleges.find(c => c.id === targetCollegeId);
    if (col) {
      col.notices = Array.isArray(col.notices) ? col.notices : [];
      col.notices.unshift(item);
      saveCollegesToStorage();
      // refresh profile view for that college
      openProfile(col);
    } else {
      // fallback to global
      bulletins.unshift(item);
      saveBulletinsToStorage();
      renderBulletins();
    }
  } else {
    bulletins.unshift(item);
    saveBulletinsToStorage();
    renderBulletins();
  }

  // cleanup & toast
  delete modal.dataset.targetCollege;
  closeModal("bulletinModal");
  showToast("Announcement added");
});

// Faculty bio modal
function openFacultyModal(fac) {
  const modal = document.getElementById("facultyModal");
  const content = document.getElementById("facultyModalContent");
  const photo = fac.photo || "assets/faculty/default-avatar.svg";
  const experience = fac.experience ? `<div class="muted">Experience: ${escapeHtml(fac.experience)}</div>` : "";
  const bio = fac.bio ? `<p>${escapeHtml(fac.bio)}</p>` : `<p class="muted">Bio not provided.</p>`;

  content.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <img src="${escapeHtml(photo)}" alt="${escapeHtml(fac.name)}" onerror="this.src='assets/faculty/default-avatar.svg'" style="width:96px;height:96px;border-radius:12px;object-fit:cover;border:1px solid rgba(2,6,23,0.04)"/>
      <div class="bio-block">
        <h4>${escapeHtml(fac.name)}</h4>
        <div class="muted">${escapeHtml(fac.department)} · ${escapeHtml(fac.designation || "")}</div>
        ${experience}
        ${bio}
      </div>
    </div>
  `;
  openModal("facultyModal");
}

// Profile drawer (updated to include per-college notices + add notice per-college)
// *** MODIFIED: includes college logo rendering with fallback ***
function openProfile(college) {
  profileContent.innerHTML = "";
  profileDrawer.setAttribute("aria-hidden", "false");

  college.notices = Array.isArray(college.notices) ? college.notices : [];

  // Prepare faculty HTML
  const facultyHtml = (college.faculty && college.faculty.length)
    ? college.faculty.map((f) => {
        const photo = f.photo || "assets/faculty/default-avatar.svg";
        const preview = f.bio ? (f.bio.length > 80 ? escapeHtml(f.bio.slice(0, 80)) + "…" : escapeHtml(f.bio)) : "";
        return `
          <div class="faculty-item" data-fid="${escapeHtml(f.id)}" style="cursor:pointer">
            <img src="${escapeHtml(photo)}" alt="${escapeHtml(f.name)}" class="faculty-photo" onerror="this.src='assets/faculty/default-avatar.svg'"/>
            <div class="faculty-meta">
              <div class="faculty-name">${escapeHtml(f.name)}</div>
              <div class="muted faculty-info">${escapeHtml(f.department)} · ${escapeHtml(f.designation || "")}</div>
              ${preview ? `<div class="muted" style="font-size:13px;margin-top:6px">${preview}</div>` : ""}
            </div>
          </div>
        `;
      }).join("")
    : "<div class='muted'>No faculty listed</div>";

  // Prepare notices HTML
  const noticesHtml = (college.notices && college.notices.length)
    ? college.notices.slice().sort((a,b)=>b.ts-a.ts).map(n => `
        <div class="bulletin-item" data-bid="${escapeHtml(n.id)}">
          <div class="bulletin-left">
            <div class="bulletin-dot" aria-hidden="true"></div>
            <div class="bulletin-content">
              <div class="bulletin-title">${escapeHtml(n.title)}</div>
              <div class="bulletin-meta">${escapeHtml(n.body)} · <span style="opacity:.7">${new Date(n.ts).toLocaleString()}</span>${n.expiry ? ` · Expires: ${new Date(n.expiry).toLocaleDateString()}` : ""}</div>
            </div>
          </div>
          <div class="bulletin-actions">
            <button class="btn ghost" data-del="${escapeHtml(n.id)}" title="Delete notice">Delete</button>
          </div>
        </div>
      `).join("")
    : `<div class="muted">No notices for this college</div>`;

  // Logo path (fall back to default if not provided)
  const logoPath = college.logo || 'assets/assets/assets/logos/default-college.png';

  const html = `
    <header style="display:flex;align-items:center;gap:12px">
      <img src="${escapeHtml(logoPath)}" alt="${escapeHtml(college.name)} logo" class="college-drawer-logo" onerror="this.onerror=null;this.src='assets/assets/assets/logos/default-college.png'"/>
      <div>
        <h2>${escapeHtml(college.name)}</h2>
        <div class="muted">${escapeHtml(college.city)} · ${escapeHtml(college.state)} · ${escapeHtml(college.affiliation || "")}</div>
      </div>
    </header>

    <div style="margin-top:12px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="flex:1;">
          <section>
            <h4>About</h4>
            <p class="muted">${escapeHtml(college.description || "—")}</p>
          </section>

          <section style="margin-top:12px;">
            <h4>Courses</h4>
            ${Array.isArray(college.courses) ? `<ul>${college.courses.map(c=>`<li>• ${escapeHtml(c)}</li>`).join("")}</ul>` : "<div class='muted'>No courses listed</div>"}
          </section>

          <section style="margin-top:12px;">
            <h4>Resources</h4>
            ${ (college.resources && college.resources.length) ? college.resources.map(r=>`
              <div class="resource"><div style="font-weight:700">${escapeHtml(r.title)}</div><div class="muted">${escapeHtml(r.subject||'')} · ${escapeHtml(r.year||'')}</div><div><a href="${escapeHtml(r.fileUrl)}" target="_blank" rel="noreferrer">Open</a></div></div>
            `).join('') : "<div class='muted'>No resources yet.</div>" }
          </section>
        </div>

        <aside style="width:340px">
          <section>
            <h4>Faculty</h4>
            <div class="faculty-grid">
              ${facultyHtml}
            </div>
          </section>

          <section style="margin-top:14px;">
            <h4>College Notices</h4>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <button class="btn primary" id="addCollegeNoticeBtn">+ Add Notice</button>
              <button class="btn ghost" id="clearCollegeNoticesBtn">Clear</button>
            </div>
            <div id="collegeNoticesList">${noticesHtml}</div>
          </section>

          <div style="margin-top:12px;">
            <button class="btn primary" onclick="alert('Request guidance (demo)')">Request Guidance</button>
          </div>
        </aside>
      </div>
    </div>
  `;

  profileContent.innerHTML = html;
  closeDrawer.focus();

  // decorate some photos with float
  profileContent.querySelectorAll(".faculty-photo").forEach((img,i)=>{
    if (i % 2 === 0) img.classList.add("float");
  });

  // faculty click -> bio modal
  profileContent.querySelectorAll(".faculty-item").forEach(el => {
    el.addEventListener("click", () => {
      const fid = el.getAttribute("data-fid");
      const fac = (college.faculty || []).find(f => f.id === fid);
      if (fac) openFacultyModal(fac);
    });
  });

  // add college-specific notice handlers
  const addBtn = document.getElementById("addCollegeNoticeBtn");
  const clearBtn = document.getElementById("clearCollegeNoticesBtn");
  const noticesContainer = document.getElementById("collegeNoticesList");

  if (addBtn) addBtn.addEventListener("click", () => {
    const modal = document.getElementById("bulletinModal");
    modal.dataset.targetCollege = college.id;
    document.getElementById("bulletinTitle").value = "";
    document.getElementById("bulletinBody").value = "";
    document.getElementById("bulletinExpiry").value = "";
    openModal("bulletinModal");
  });

  if (clearBtn) clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all notices for this college?")) return;
    college.notices = [];
    saveCollegesToStorage();
    openProfile(college);
    showToast("College notices cleared");
  });

  // delete per-college notice
  noticesContainer.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-del");
      college.notices = college.notices.filter(n => n.id !== id);
      saveCollegesToStorage();
      openProfile(college);
      showToast("College notice deleted");
    });
  });
}

// close drawer
closeDrawer.addEventListener("click", () => profileDrawer.setAttribute("aria-hidden", "true"));
profileDrawer.addEventListener("click", (e) => { if (e.target === profileDrawer) profileDrawer.setAttribute("aria-hidden", "true"); });

// Student Wants - modal and list with upvotes (persistent) + delete+undo support
function renderWants() {
  const container = document.getElementById("wantsList");
  if (!container) return;
  container.innerHTML = "";
  if (!studentWants.length) { container.innerHTML = `<div class="muted">No suggestions yet — be the first to suggest!</div>`; return; }
  const items = studentWants.slice().sort((a,b) => b.votes - a.votes || b.ts - a.ts);
  items.forEach((w, idx) => {
    const el = document.createElement("div");
    el.className = "want-item";
    el.style.animationDelay = `${Math.min(0.06 * idx, 0.8)}s`;
    el.innerHTML = `
      <div class="want-left">
        <div>
          <div class="want-title">${escapeHtml(w.title)}</div>
          <div class="want-meta">${escapeHtml(w.details || "")} · <span style="opacity:.7">${new Date(w.ts).toLocaleString()}</span></div>
        </div>
      </div>
      <div class="want-actions">
        <div class="want-count">${w.votes}</div>
        <button class="btn ghost" data-up="${escapeHtml(w.id)}" title="Upvote">▲</button>
        <button class="btn small danger" data-del="${escapeHtml(w.id)}" title="Remove suggestion" style="margin-left:6px">✕</button>
      </div>
    `;
    container.appendChild(el);
  });

  // upvote handlers
  container.querySelectorAll("[data-up]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-up");
      if (wantsVotes[id]) { showToast("You already upvoted this (browser-limited)"); return; }
      const it = studentWants.find(s => s.id === id);
      if (!it) return;
      it.votes = (it.votes || 0) + 1;
      wantsVotes[id] = true;
      saveWantsToStorage();
      saveWantsVotes(wantsVotes);
      renderWants();
    });
  });

  // delete handlers (instant) — Undo handled via actionable toast
  container.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-del");
      const idx = studentWants.findIndex(x => x.id === id);
      if (idx === -1) return;
      const backup = studentWants[idx];
      studentWants.splice(idx, 1);
      saveWantsToStorage();
      renderWants();
      showActionableToast("Suggestion removed", {
        actionText: "Undo",
        actionCallback: () => {
          studentWants.unshift(backup);
          saveWantsToStorage();
          renderWants();
          showToast("Suggestion restored");
        },
        duration: 6000
      });
    });
  });
}

// Suggest modal handling
document.getElementById("openSuggestModal").addEventListener("click", () => {
  document.getElementById("suggestTitle").value = "";
  document.getElementById("suggestDetails").value = "";
  openModal("suggestModal");
});
document.getElementById("suggestForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = (document.getElementById("suggestTitle").value || "").trim();
  const details = (document.getElementById("suggestDetails").value || "").trim();
  if (!title) { alert("Please enter a short title."); return; }
  const id = "w" + Date.now();
  studentWants.unshift({ id, title, details, votes: 0, ts: Date.now() });
  saveWantsToStorage();
  renderWants();
  closeModal("suggestModal");
  showToast("Suggestion added");
});

// ===============================
// STUDENT REQUEST CENTER
// ===============================
function updateRequestBadge() {
  const pending = requests.filter(r => !r.resolved).length;
  if (reqBadge) reqBadge.textContent = pending;
  // small visual pulse when new
  if (pending > 0 && reqBadge) {
    reqBadge.style.transform = "scale(1.12)";
    setTimeout(()=> reqBadge.style.transform = "", 260);
  }
}

// Request submit handler
const requestFormEl = document.getElementById("requestForm");
if (requestFormEl) {
  requestFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("reqType").value;
    const extra = (document.getElementById("reqExtra").value || "").trim();
    const details = (document.getElementById("reqDetails").value || "").trim();
    if (!details) { alert("Please describe your request."); return; }

    const id = "req" + Date.now();
    const req = { id, type, extra, details, ts: Date.now(), resolved: false };
    requests.unshift(req);
    saveRequestsToStorage();
    updateRequestBadge();
    closeModal("requestModal");
    showToast("Request submitted");
    // reset
    document.getElementById("reqType").value = "document";
    document.getElementById("reqExtra").value = "";
    document.getElementById("reqDetails").value = "";
  });
}

// show requests list modal
function renderRequestsList() {
  const container = document.getElementById("requestsList");
  if (!container) return;
  container.innerHTML = "";
  if (!requests.length) { container.innerHTML = `<div class="muted">No requests yet.</div>`; return; }
  requests.slice().forEach((r, idx) => {
    const item = document.createElement("div");
    item.className = "request-item";
    item.style.animationDelay = `${Math.min(0.06 * idx, 0.8)}s`;
    item.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(r.type)} ${r.extra ? `· ${escapeHtml(r.extra)}` : ""}${r.resolved ? " (resolved)" : ""}</div>
        <div class="request-meta">${escapeHtml(r.details)} · <span style="opacity:.7">${new Date(r.ts).toLocaleString()}</span></div>
      </div>
      <div class="request-actions">
        ${r.resolved ? `<button class="btn ghost" data-unresolve="${r.id}">Mark Open</button>` : `<button class="btn primary" data-resolve="${r.id}">Mark Resolved</button>`}
        <button class="btn ghost" data-delete="${r.id}">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });

  // handlers
  container.querySelectorAll("[data-resolve]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-resolve");
      const it = requests.find(x => x.id === id);
      if (!it) return;
      it.resolved = true;
      saveRequestsToStorage();
      renderRequestsList();
      updateRequestBadge();
      showToast("Marked resolved");
    });
  });
  container.querySelectorAll("[data-unresolve]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-unresolve");
      const it = requests.find(x => x.id === id);
      if (!it) return;
      it.resolved = false;
      saveRequestsToStorage();
      renderRequestsList();
      updateRequestBadge();
      showToast("Marked open");
    });
  });
  container.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-delete");
      if (!confirm("Delete this request?")) return;
      requests = requests.filter(x => x.id !== id);
      saveRequestsToStorage();
      renderRequestsList();
      updateRequestBadge();
      showToast("Request deleted");
    });
  });
}

// wire request list modal open & clear button
if (reqFeatureBtn) {
  reqFeatureBtn.addEventListener("click", () => {
    openModal('requestListModal');
    renderRequestsList();
  });
}
const clearAllBtn = document.getElementById("clearAllReqs");
if (clearAllBtn) clearAllBtn.addEventListener("click", () => {
  if (!confirm("Clear all requests?")) return;
  requests = [];
  saveRequestsToStorage();
  renderRequestsList();
  updateRequestBadge();
  showToast("All requests cleared");
});

// update extra field placeholder depending on type
const reqTypeEl = document.getElementById("reqType");
const reqExtraEl = document.getElementById("reqExtra");
if (reqTypeEl && reqExtraEl) {
  reqTypeEl.addEventListener("change", () => {
    const v = reqTypeEl.value;
    if (v === "document") reqExtraEl.placeholder = "Document name (optional)";
    else if (v === "problem") reqExtraEl.placeholder = "Problem category (e.g. missing pages, unreadable equations)";
    else if (v === "formFill") reqExtraEl.placeholder = "Form name (optional)";
    else reqExtraEl.placeholder = "Extra details (optional)";
  });
}

// Initialization & data loading
function initData() {
  colleges = loadCollegesFromStorage();
  favorites = loadFavoritesFromStorage();
  bulletins = loadBulletinsFromStorage();
  studentWants = loadWantsFromStorage();
  wantsVotes = loadWantsVotes() || {};
  requests = loadRequestsFromStorage() || [];
  // ensure arrays exist
  if (!Array.isArray(colleges)) colleges = [];
  if (!Array.isArray(bulletins)) bulletins = [];
  if (!Array.isArray(studentWants)) studentWants = [];
  if (!Array.isArray(requests)) requests = [];
}

function initUI() {
  renderChips();
  doSearch("");
  renderBulletins();
  renderWants();
  updateRequestBadge();
}

function init() {
  initData();
  initUI();
}

// wire search & clear
searchBtn.addEventListener("click", () => doSearch(searchInput.value));
searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(searchInput.value); });
clearBtn.addEventListener("click", () => { searchInput.value = ""; doSearch(""); });

// hook for requestList modal to re-render when closed
document.querySelectorAll("[data-close]").forEach(b => {
  b.addEventListener("click", () => {
    renderRequestsList();
    updateRequestBadge();
  });
});

document.addEventListener("DOMContentLoaded", init);
