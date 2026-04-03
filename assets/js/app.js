import {
  AGENCIES,
  AWARENESS_AREAS,
  DEMO_USERS,
  INITIAL_ASN,
  LIKERT_OPTIONS,
  QUESTION_SETS,
  TREND_BY_AGENCY,
} from "./data.js";
import {
  average,
  buildRecommendations,
  calculateScore,
  escapeHtml,
  getRiskLevel,
  renderBadge,
  withDerivedMetrics,
} from "./utils.js";
import { renderCharts } from "./charts.js";
import { appShellTemplate, loginTemplate } from "./templates.js";

let asnQuestionTimer = null;

const state = {
  currentUser: null,
  currentPage: "dashboard",
  currentAgency: "all",
  asnList: INITIAL_ASN.map(withDerivedMetrics),
  selectedAsnId: 1,
  assessmentAnswers: {},
  searchTerm: "",
  riskFilter: "all",
  showPrototypeModal: false,
  asnTestStarted: false,
  asnQuestionIndex: 0,
  asnTimeLeft: 30,
};

function isAsnRole() {
  return state.currentUser?.role === "ASN";
}

function getAvailablePages() {
  if (isAsnRole()) {
    return [
      ["assessment", "Assessment"],
      ["my-score", "Nilai Saya"],
    ];
  }
  return [
    ["dashboard", "Dashboard"],
    ["assessment", "Assessment"],
    ["asn-list", "ASN List"],
    ["analytics", "Analytics"],
    ["settings", "Settings"],
  ];
}

async function renderApp() {
  const root = document.getElementById("app");
  root.innerHTML = state.currentUser ? appShellTemplate : loginTemplate;

  if (state.currentUser) {
    populateAppShell();
  }

  bindEvents();
  syncAsnQuestionTimer();
}

function populateAppShell() {
  document.getElementById("current-role").textContent = state.currentUser.role;
  document.getElementById("current-name").textContent = state.currentUser.name;
  document.getElementById("role-pill").textContent = `Role aktif: ${state.currentUser.role}`;
  document.getElementById("agency-pill").textContent = `Instansi: ${getAgencyLabel()}`;
  document.getElementById("sidebar-nav").innerHTML = renderSidebarNav();
  document.getElementById("page-content").innerHTML = renderCurrentPage();
  togglePrototypeModal();
  drawCurrentPageCharts();
}

function togglePrototypeModal() {
  const modal = document.getElementById("prototype-modal");
  if (!modal) return;
  modal.classList.toggle("hidden", !state.showPrototypeModal);
}

function renderSidebarNav() {
  return getAvailablePages()
    .map(
      ([page, label]) =>
        `<button class="nav-button ${state.currentPage === page ? "active" : ""}" data-page="${page}" type="button">${label}</button>`
    )
    .join("");
}

function renderCurrentPage() {
  if (isAsnRole() && !getAvailablePages().some(([page]) => page === state.currentPage)) {
    state.currentPage = "assessment";
  }
  if (state.currentPage === "my-score") return renderMyScorePage();
  if (state.currentPage === "assessment") return renderAssessmentPage();
  if (state.currentPage === "asn-list") return renderAsnListPage();
  if (state.currentPage === "analytics") return renderAnalyticsPage();
  if (state.currentPage === "settings") return renderSettingsPage();
  return renderDashboardPage();
}

function renderDashboardPage() {
  const filteredList = getAgencyScopedAsnList();
  const stats = getStats(filteredList);
  return `
    <div class="agency-strip">
      ${renderAgencyFilters()}
    </div>
    <div class="instansi-grid">
      ${getAgencyCards()}
    </div>
    <div class="stats-grid">
      <div class="card">
        <div class="card-label">Rata-rata Digital Trust Score</div>
        <div class="card-value">${stats.averageScore}</div>
        <div class="card-trend">Ringkasan untuk ${getAgencyLabel()}</div>
      </div>
      <div class="card">
        <div class="card-label">Jumlah ASN Risiko Tinggi</div>
        <div class="card-value">${stats.highRisk}</div>
        <div class="card-trend">Memerlukan intervensi prioritas</div>
      </div>
      <div class="card">
        <div class="card-label">Jumlah ASN Risiko Sedang</div>
        <div class="card-value">${stats.mediumRisk}</div>
        <div class="card-trend">Perlu penguatan awareness berkala</div>
      </div>
      <div class="card">
        <div class="card-label">Jumlah ASN Risiko Rendah</div>
        <div class="card-value">${stats.lowRisk}</div>
        <div class="card-trend">Pertahankan budaya keamanan positif</div>
      </div>
    </div>
    <div class="insight-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Distribusi Risiko ASN</h2>
            <div class="panel-subtitle">Distribusi risiko untuk ${getAgencyLabel()}.</div>
          </div>
        </div>
        <canvas id="risk-distribution-chart" width="560" height="280"></canvas>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Top Risiko</h2>
            <div class="panel-subtitle">Area prioritas perbaikan awareness keamanan.</div>
          </div>
        </div>
        <div class="risk-list">
          ${AWARENESS_AREAS.map(
            (item) => `
              <div class="risk-item">
                <strong>${item.name}</strong>
                Gap awareness: ${item.value}% ASN masih memerlukan penguatan pada area ini.
                <div class="risk-meta">${renderBadge(getRiskLabelByTone(item.tone))}</div>
              </div>
            `
          ).join("")}
        </div>
      </div>
    </div>
    <div class="insight-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Trend Awareness Keamanan</h2>
            <div class="panel-subtitle">7 periode monitoring terakhir untuk ${getAgencyLabel()}.</div>
          </div>
        </div>
        <canvas id="trend-chart" width="560" height="280"></canvas>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Ringkasan Tindakan</h2>
            <div class="panel-subtitle">Intervensi cepat yang direkomendasikan untuk pimpinan instansi.</div>
          </div>
        </div>
        <div class="activity-list">
          <div class="activity-item">
            <strong>Pelatihan keamanan triwulanan</strong>
            Fokus untuk unit dengan skor behavior di bawah 70.
          </div>
          <div class="activity-item">
            <strong>Awareness reminder mingguan</strong>
            Kirim pesan singkat keamanan terkait phishing dan tata kelola data.
          </div>
          <div class="activity-item">
            <strong>Simulasi phishing internal</strong>
            Ukur peningkatan perilaku aman setelah intervensi pembelajaran.
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAssessmentPage() {
  const summary = getAssessmentSummary();
  const selected = getSelectedAsn();
  if (isAsnRole()) {
    return renderAsnAssessmentPage(summary, selected);
  }
  return `
    <div class="agency-strip">${renderAgencyFilters()}</div>
    <div class="form-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Assessment Digital Trust</h2>
            <div class="panel-subtitle">Kuesioner untuk instansi ${getAgencyLabel()}.</div>
          </div>
        </div>
        <form id="assessment-form" class="question-group">
          ${renderQuestionSection("knowledge", "Pemahaman Keamanan")}
          ${renderQuestionSection("attitude", "Sikap Kepatuhan")}
          ${renderQuestionSection("behavior", "Perilaku Keamanan")}
          <button class="button" type="submit">Submit Assessment</button>
          <div class="form-note dark-note">Skor akan dihitung otomatis dan disimpan pada ASN terpilih di instansi aktif.</div>
        </form>
      </div>
      <aside class="panel">
        <div class="panel-header">
          <div>
            <h2>Hasil Otomatis</h2>
            <div class="panel-subtitle">Ringkasan indikator assessment dan klasifikasi risiko.</div>
          </div>
        </div>
        <div class="result-box">
          <div class="score-ring" id="score-ring">
            <div class="score-ring-value">${summary.score}</div>
          </div>
          <div class="centered">${renderBadge(summary.riskLevel.label)}</div>
          <div class="recommendation-list">
            <div class="recommendation-item"><strong>Pemahaman Keamanan</strong>${summary.knowledge}</div>
            <div class="recommendation-item"><strong>Sikap Kepatuhan</strong>${summary.attitude}</div>
            <div class="recommendation-item"><strong>Perilaku Keamanan</strong>${summary.behavior}</div>
          </div>
        </div>
        <div class="subpanel">
          <h3>Recommendation Panel</h3>
          <div class="recommendation-list">
            ${summary.recommendations.map((item) => `<div class="recommendation-item">${item}</div>`).join("")}
          </div>
        </div>
      </aside>
    </div>
  `;
}

function renderAsnAssessmentPage(summary, selected) {
  if (!state.asnTestStarted) {
    return `
      <div class="asn-test-layout">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>Assessment Digital Trust</h2>
              <div class="panel-subtitle">Test pribadi untuk ${escapeHtml(selected.name)}.</div>
            </div>
          </div>
          <div class="test-intro-card">
            <div class="test-intro-tag">Mode Test ASN</div>
            <h3>Mulai test assessment pribadi</h3>
            <p>Setiap soal memiliki waktu 30 detik. Setelah waktu habis, soal akan otomatis berpindah ke soal berikutnya.</p>
            <div class="test-rule-list">
              <div class="recommendation-item"><strong>Total Soal</strong>15 soal assessment perilaku keamanan informasi</div>
              <div class="recommendation-item"><strong>Durasi</strong>30 detik per soal</div>
              <div class="recommendation-item"><strong>Hasil</strong>Skor dan risiko hanya untuk akun Anda sendiri</div>
            </div>
            <button class="button" id="start-asn-test" type="button">Mulai Test</button>
          </div>
        </div>
        <aside class="panel">
          <div class="panel-header">
            <div>
              <h2>Nilai Saat Ini</h2>
              <div class="panel-subtitle">Ringkasan hasil terakhir yang tersimpan.</div>
            </div>
          </div>
          <div class="result-box">
            <div class="score-ring" id="score-ring">
              <div class="score-ring-value">${selected.score}</div>
            </div>
            <div class="centered">${renderBadge(selected.riskLevel.label)}</div>
            <div class="recommendation-list">
              <div class="recommendation-item"><strong>Pemahaman Keamanan</strong>${selected.knowledge}</div>
              <div class="recommendation-item"><strong>Sikap Kepatuhan</strong>${selected.attitude}</div>
              <div class="recommendation-item"><strong>Perilaku Keamanan</strong>${selected.behavior}</div>
            </div>
          </div>
        </aside>
      </div>
    `;
  }

  const questions = getAsnQuestionFlow();
  const currentQuestion = questions[state.asnQuestionIndex];
  const selectedValue = state.assessmentAnswers[currentQuestion.name] || "";
  const isLastQuestion = state.asnQuestionIndex === questions.length - 1;
  return `
    <div class="asn-test-layout">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Assessment Digital Trust</h2>
            <div class="panel-subtitle">Soal ${state.asnQuestionIndex + 1} dari ${questions.length} untuk ${escapeHtml(selected.name)}.</div>
          </div>
          <div class="timer-chip" id="asn-timer">00:${String(state.asnTimeLeft).padStart(2, "0")}</div>
        </div>
        <div class="test-progress">
          <div class="test-progress-bar" style="width:${((state.asnQuestionIndex + 1) / questions.length) * 100}%"></div>
        </div>
        <div class="question-card test-question-card">
          <div class="test-domain">${currentQuestion.label}</div>
          <h3>${state.asnQuestionIndex + 1}. ${currentQuestion.question}</h3>
          <div class="test-option-grid">
            ${LIKERT_OPTIONS.map((option, optionIndex) => {
              const value = optionIndex + 1;
              return `
                <button class="test-option ${Number(selectedValue) === value ? "selected" : ""}" data-test-answer="${value}" type="button">
                  <strong>${value}</strong>
                  <span>${option}</span>
                </button>
              `;
            }).join("")}
          </div>
          <div class="test-actions">
            <div class="dark-note">Waktu per soal 30 detik. Jika tidak dijawab, sistem akan lanjut otomatis.</div>
            <button class="button" data-next-question type="button">${isLastQuestion ? "Selesai Test" : "Lanjut Soal"}</button>
          </div>
        </div>
      </div>
      <aside class="panel">
        <div class="panel-header">
          <div>
            <h2>Hasil Sementara</h2>
            <div class="panel-subtitle">Skor diperbarui selama test berjalan.</div>
          </div>
        </div>
        <div class="result-box">
          <div class="score-ring" id="score-ring">
            <div class="score-ring-value">${summary.score}</div>
          </div>
          <div class="centered">${renderBadge(summary.riskLevel.label)}</div>
          <div class="recommendation-list">
            <div class="recommendation-item"><strong>Pemahaman Keamanan</strong>${summary.knowledge}</div>
            <div class="recommendation-item"><strong>Sikap Kepatuhan</strong>${summary.attitude}</div>
            <div class="recommendation-item"><strong>Perilaku Keamanan</strong>${summary.behavior}</div>
          </div>
        </div>
      </aside>
    </div>
  `;
}

function getAsnQuestionFlow() {
  return [
    ...QUESTION_SETS.knowledge.map((question, index) => ({ name: `knowledge-${index}`, label: "Pemahaman Keamanan", question })),
    ...QUESTION_SETS.attitude.map((question, index) => ({ name: `attitude-${index}`, label: "Sikap Kepatuhan", question })),
    ...QUESTION_SETS.behavior.map((question, index) => ({ name: `behavior-${index}`, label: "Perilaku Keamanan", question })),
  ];
}

function renderMyScorePage() {
  const selected = getSelectedAsn();
  return `
    <div class="detail-grid">
      <div class="panel">
        <div class="detail-header">
          <div class="detail-meta">
            <h2>${escapeHtml(selected.name)}</h2>
            <p>${escapeHtml(selected.agency)} • ${escapeHtml(selected.unit)} • Assessment terakhir ${selected.lastAssessment}</p>
          </div>
          <div>${renderBadge(selected.riskLevel.label)}</div>
        </div>
        <canvas id="detail-radar-chart" width="560" height="320"></canvas>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Nilai Saya</h2>
            <div class="panel-subtitle">Ringkasan hasil Digital Trust Score pribadi Anda.</div>
          </div>
        </div>
        <div class="recommendation-list">
          <div class="recommendation-item"><strong>Score Digital Trust</strong>${selected.score}</div>
          <div class="recommendation-item"><strong>Pemahaman Keamanan</strong>${selected.knowledge}</div>
          <div class="recommendation-item"><strong>Sikap Kepatuhan</strong>${selected.attitude}</div>
          <div class="recommendation-item"><strong>Perilaku Keamanan</strong>${selected.behavior}</div>
          <div class="recommendation-item"><strong>Risk Level</strong>${selected.riskLevel.label}</div>
          ${selected.recommendations.map((item) => `<div class="recommendation-item">${item}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderQuestionSection(key, label) {
  return `
    <div class="question-card">
      <h4>${label}</h4>
      <div class="question-group">
        ${QUESTION_SETS[key]
          .map((question, index) => {
            const name = `${key}-${index}`;
            return `
              <div class="question-card inner">
                <div class="question-title">${index + 1}. ${question}</div>
                <div class="radio-row">
                  ${LIKERT_OPTIONS.map((option, optionIndex) => {
                    const value = optionIndex + 1;
                    const checked = Number(state.assessmentAnswers[name]) === value ? "checked" : "";
                    return `
                      <label class="radio-card">
                        <input type="radio" name="${name}" value="${value}" ${checked} />
                        <span>${option}</span>
                      </label>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderAsnListPage() {
  const list = getFilteredAsnList();
  const selected = getSelectedAsn();
  return `
    <div class="agency-strip">
      ${renderAgencyFilters()}
    </div>
    <div class="panel gap-bottom">
      <div class="panel-header">
        <div>
          <h2>User List ASN</h2>
          <div class="panel-subtitle">Data ASN untuk ${getAgencyLabel()}.</div>
        </div>
      </div>
      <div class="toolbar">
        <input class="search-input" id="asn-search" placeholder="Cari nama atau unit kerja" value="${escapeHtml(state.searchTerm)}" />
        <select class="filter-select" id="asn-filter">
          <option value="all" ${state.riskFilter === "all" ? "selected" : ""}>Semua Risiko</option>
          <option value="High Risk" ${state.riskFilter === "High Risk" ? "selected" : ""}>High Risk</option>
          <option value="Medium Risk" ${state.riskFilter === "Medium Risk" ? "selected" : ""}>Medium Risk</option>
          <option value="Low Risk" ${state.riskFilter === "Low Risk" ? "selected" : ""}>Low Risk</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Instansi</th>
              <th>Unit Kerja</th>
              <th>Score</th>
              <th>Risk Level</th>
              <th>Last Assessment</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.agency)}</td>
                    <td>${escapeHtml(item.unit)}</td>
                    <td>${item.score}</td>
                    <td>${renderBadge(item.riskLevel.label)}</td>
                    <td>${item.lastAssessment}</td>
                    <td><button class="table-action" data-asn-detail="${item.id}" type="button">Lihat Detail</button></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${list.length ? "" : '<div class="empty-state">Tidak ada data ASN yang sesuai filter dan instansi aktif.</div>'}
    </div>
    <div class="detail-grid">
      <div class="panel">
        <div class="detail-header">
          <div class="detail-meta">
            <h2>${escapeHtml(selected.name)}</h2>
            <p>${escapeHtml(selected.agency)} • ${escapeHtml(selected.unit)} • Assessment terakhir ${selected.lastAssessment}</p>
          </div>
          <div>${renderBadge(selected.riskLevel.label)}</div>
        </div>
        <canvas id="detail-radar-chart" width="560" height="320"></canvas>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Detail ASN</h2>
            <div class="panel-subtitle">Score Digital Trust dan rekomendasi otomatis.</div>
          </div>
        </div>
        <div class="recommendation-list">
          <div class="recommendation-item"><strong>Score Digital Trust</strong>${selected.score}</div>
          <div class="recommendation-item"><strong>Risk Level</strong>${selected.riskLevel.label}</div>
          ${selected.recommendations.map((item) => `<div class="recommendation-item">${item}</div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderAnalyticsPage() {
  const agencyScores = getAgencyScoreSummary();
  return `
    <div class="panel gap-bottom">
      <div class="panel-header">
        <div>
          <h2>Analytics Antar Instansi</h2>
          <div class="panel-subtitle">Perbandingan 3 instansi contoh pada prototype.</div>
        </div>
      </div>
      <canvas id="agency-chart" width="560" height="300"></canvas>
    </div>
    <div class="settings-grid">
      ${agencyScores
        .map(
          (agency) => `
            <div class="panel">
              <div class="panel-header">
                <div>
                  <h2>${agency.shortLabel}</h2>
                  <div class="panel-subtitle">${agency.label}</div>
                </div>
              </div>
              <div class="recommendation-item"><strong>Rata-rata Score</strong>${agency.score}</div>
              <div class="recommendation-item"><strong>Jumlah ASN</strong>${agency.count}</div>
              <div class="recommendation-item"><strong>Risiko Dominan</strong>${agency.dominantRisk}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSettingsPage() {
  return `
    <div class="settings-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Skema Penilaian</h2>
            <div class="panel-subtitle">Indikator assessment perilaku keamanan digunakan secara seimbang.</div>
          </div>
        </div>
        <div class="recommendation-item">0-59 = High Risk</div>
        <div class="recommendation-item">60-79 = Medium Risk</div>
        <div class="recommendation-item">80-100 = Low Risk</div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Struktur File</h2>
            <div class="panel-subtitle">HTML dipecah ke partial, CSS dan JS dipisah ke folder assets.</div>
          </div>
        </div>
        <div class="recommendation-item"><code>partials/login.html</code> untuk halaman login</div>
        <div class="recommendation-item"><code>partials/app-shell.html</code> untuk layout utama</div>
        <div class="recommendation-item"><code>assets/js/*.js</code> untuk data, utilitas, chart, dan logic app</div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Logo</h2>
            <div class="panel-subtitle">Anda bisa langsung mengganti file logo pada lokasi berikut.</div>
          </div>
        </div>
        <div class="recommendation-item"><code>assets/images/logontt.png</code> untuk logo Pemprov NTT</div>
        <div class="recommendation-item"><code>assets/images/logoaplikasi.png</code> untuk logo aplikasi</div>
      </div>
    </div>
  `;
}

function renderAgencyFilters() {
  const items = [["all", "Semua Instansi"], ...AGENCIES.map((agency) => [agency, agency])];
  return items
    .map(
      ([value, label]) =>
        `<button class="agency-pill ${state.currentAgency === value ? "active" : ""}" data-agency="${value}" type="button">${label}</button>`
    )
    .join("");
}

function getAgencyCards() {
  return AGENCIES.map((agency) => {
    const list = state.asnList.filter((item) => item.agency === agency);
    const stats = getStats(list);
    return `
      <div class="card agency-card ${state.currentAgency === agency ? "active" : ""}">
        <div class="card-label">${agency}</div>
        <div class="card-value">${stats.averageScore}</div>
        <div class="card-trend">${list.length} ASN contoh • ${stats.highRisk} high risk</div>
      </div>
    `;
  }).join("");
}

function getAgencyScopedAsnList() {
  if (state.currentAgency === "all") return state.asnList;
  return state.asnList.filter((item) => item.agency === state.currentAgency);
}

function getStats(list) {
  const scores = list.map((item) => item.score);
  return {
    averageScore: average(scores),
    highRisk: list.filter((item) => item.riskLevel.label === "High Risk").length,
    mediumRisk: list.filter((item) => item.riskLevel.label === "Medium Risk").length,
    lowRisk: list.filter((item) => item.riskLevel.label === "Low Risk").length,
  };
}

function getAgencyLabel() {
  return state.currentAgency === "all" ? "Semua Instansi" : state.currentAgency;
}

function getRiskLabelByTone(tone) {
  if (tone === "high") return "High Risk";
  if (tone === "medium") return "Medium Risk";
  return "Low Risk";
}

function getAssessmentSummary() {
  const knowledge = calculateSectionScore("knowledge");
  const attitude = calculateSectionScore("attitude");
  const behavior = calculateSectionScore("behavior");
  const score = calculateScore(knowledge, attitude, behavior);
  return {
    knowledge,
    attitude,
    behavior,
    score,
    riskLevel: getRiskLevel(score),
    recommendations: buildRecommendations(knowledge, attitude, behavior),
  };
}

function calculateSectionScore(key) {
  const values = QUESTION_SETS[key].map((_, index) => state.assessmentAnswers[`${key}-${index}`] || 3);
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / (values.length * 5)) * 100);
}

function getFilteredAsnList() {
  const term = state.searchTerm.trim().toLowerCase();
  const filter = state.riskFilter;
  return getAgencyScopedAsnList().filter((item) => {
    const matchesTerm =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.unit.toLowerCase().includes(term) ||
      item.agency.toLowerCase().includes(term);
    const matchesFilter = filter === "all" || item.riskLevel.label === filter;
    return matchesTerm && matchesFilter;
  });
}

function getSelectedAsn() {
  const selected = state.asnList.find((item) => item.id === state.selectedAsnId);
  if (selected && (state.currentAgency === "all" || selected.agency === state.currentAgency)) return selected;
  return getAgencyScopedAsnList()[0] || state.asnList[0];
}

function getDefaultSelectedAsnIdForUser(user) {
  if (user?.role === "ASN") {
    return 2;
  }
  return getAgencyScopedAsnList()[0]?.id || state.asnList[0]?.id || 1;
}

function getAgencyScoreSummary() {
  return AGENCIES.map((agency) => {
    const list = state.asnList.filter((item) => item.agency === agency);
    const stats = getStats(list);
    const dominantRisk =
      stats.highRisk >= stats.mediumRisk && stats.highRisk >= stats.lowRisk
        ? "High Risk"
        : stats.mediumRisk >= stats.lowRisk
          ? "Medium Risk"
          : "Low Risk";
    return {
      label: agency,
      shortLabel: shortAgency(agency),
      score: stats.averageScore,
      count: list.length,
      dominantRisk,
    };
  });
}

function shortAgency(agency) {
  if (agency.includes("BPAD")) return "BPAD";
  if (agency.includes("Kominfo")) return "Kominfo";
  return "Inspektorat";
}

function drawCurrentPageCharts() {
  const selectedAsn = getSelectedAsn();
  const scopedList = getAgencyScopedAsnList();
  const trendData =
    state.currentAgency === "all"
      ? averageTrend()
      : TREND_BY_AGENCY[state.currentAgency];

  renderCharts({
    canvasId: "risk-distribution-chart",
    stats: getStats(scopedList),
  });
  renderCharts({
    canvasId: "trend-chart",
    trendData,
  });
  renderCharts({
    canvasId: "detail-radar-chart",
    selectedAsn,
  });
  renderCharts({
    canvasId: "agency-chart",
    agencyScores: getAgencyScoreSummary(),
  });
  updateScoreRing(getAssessmentSummary().score);
}

function averageTrend() {
  const entries = Object.values(TREND_BY_AGENCY);
  return entries[0].map((_, index) => average(entries.map((item) => item[index])));
}

function updateScoreRing(score) {
  const ring = document.getElementById("score-ring");
  if (!ring) return;
  const degrees = Math.max(0, Math.min(360, (score / 100) * 360));
  ring.style.background = `conic-gradient(var(--primary) ${degrees}deg, #d9e7f4 ${degrees}deg)`;
}

function clearAsnQuestionTimer() {
  if (asnQuestionTimer) {
    clearInterval(asnQuestionTimer);
    asnQuestionTimer = null;
  }
}

function syncAsnQuestionTimer() {
  clearAsnQuestionTimer();
  if (!isAsnRole() || state.currentPage !== "assessment" || !state.asnTestStarted) {
    return;
  }
  const timerElement = document.getElementById("asn-timer");
  if (timerElement) {
    timerElement.textContent = `00:${String(state.asnTimeLeft).padStart(2, "0")}`;
  }
  asnQuestionTimer = setInterval(async () => {
    state.asnTimeLeft -= 1;
    const activeTimerElement = document.getElementById("asn-timer");
    if (activeTimerElement) {
      activeTimerElement.textContent = `00:${String(Math.max(state.asnTimeLeft, 0)).padStart(2, "0")}`;
    }
    if (state.asnTimeLeft <= 0) {
      await advanceAsnQuestion();
    }
  }, 1000);
}

async function startAsnTest() {
  state.assessmentAnswers = {};
  state.asnTestStarted = true;
  state.asnQuestionIndex = 0;
  state.asnTimeLeft = 30;
  await renderApp();
}

async function advanceAsnQuestion() {
  const questions = getAsnQuestionFlow();
  clearAsnQuestionTimer();
  if (state.asnQuestionIndex >= questions.length - 1) {
    await finalizeAssessment();
    return;
  }
  state.asnQuestionIndex += 1;
  state.asnTimeLeft = 30;
  await renderApp();
}

async function finalizeAssessment() {
  clearAsnQuestionTimer();
  const summary = getAssessmentSummary();
  const target = getSelectedAsn();
  state.asnList = state.asnList.map((item) =>
    item.id === target.id
      ? withDerivedMetrics({
          ...item,
          knowledge: summary.knowledge,
          attitude: summary.attitude,
          behavior: summary.behavior,
          lastAssessment: new Date().toISOString().slice(0, 10),
        })
      : item
  );
  state.asnTestStarted = false;
  state.asnQuestionIndex = 0;
  state.asnTimeLeft = 30;
  state.currentPage = isAsnRole() ? "my-score" : "asn-list";
  await renderApp();
}

function bindEvents() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const roleSelect = document.getElementById("role");
  if (roleSelect) roleSelect.addEventListener("change", handleRolePrefill);

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.currentPage = button.dataset.page;
      await renderApp();
    });
  });

  document.querySelectorAll("[data-agency]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.currentAgency = button.dataset.agency;
      const firstItem = getAgencyScopedAsnList()[0];
      if (firstItem) state.selectedAsnId = firstItem.id;
      await renderApp();
    });
  });

  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      state.currentUser = null;
      state.showPrototypeModal = false;
      state.asnTestStarted = false;
      state.asnQuestionIndex = 0;
      state.asnTimeLeft = 30;
      clearAsnQuestionTimer();
      await renderApp();
    });
  }

  const closePrototypeModal = document.getElementById("close-prototype-modal");
  if (closePrototypeModal) {
    closePrototypeModal.addEventListener("click", () => {
      state.showPrototypeModal = false;
      togglePrototypeModal();
    });
  }

  const assessmentForm = document.getElementById("assessment-form");
  if (assessmentForm) {
    assessmentForm.addEventListener("change", handleAssessmentChange);
    assessmentForm.addEventListener("submit", handleAssessmentSubmit);
  }

  const startAsnTestButton = document.getElementById("start-asn-test");
  if (startAsnTestButton) {
    startAsnTestButton.addEventListener("click", startAsnTest);
  }

  document.querySelectorAll("[data-test-answer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const currentQuestion = getAsnQuestionFlow()[state.asnQuestionIndex];
      state.assessmentAnswers[currentQuestion.name] = Number(button.dataset.testAnswer);
      await renderApp();
    });
  });

  const nextQuestionButton = document.querySelector("[data-next-question]");
  if (nextQuestionButton) {
    nextQuestionButton.addEventListener("click", async () => {
      await advanceAsnQuestion();
    });
  }

  const searchInput = document.getElementById("asn-search");
  if (searchInput) {
    searchInput.addEventListener("input", async (event) => {
      state.searchTerm = event.target.value;
      await renderApp();
    });
  }

  const filterSelect = document.getElementById("asn-filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", async (event) => {
      state.riskFilter = event.target.value;
      await renderApp();
    });
  }

  document.querySelectorAll("[data-asn-detail]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.selectedAsnId = Number(button.dataset.asnDetail);
      await renderApp();
    });
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const role = formData.get("role");
  const username = formData.get("username");
  const password = formData.get("password");
  const user = DEMO_USERS.find(
    (item) => item.role === role && item.username === username && item.password === password
  );
  const errorBox = document.getElementById("login-error");
  if (!user) {
    errorBox.textContent = "Login gagal. Gunakan akun demo yang tersedia pada panel informasi.";
    return;
  }
  state.currentUser = user;
  state.currentAgency = user.role === "ASN" ? "BPAD Provinsi NTT" : "all";
  state.currentPage = user.role === "ASN" ? "assessment" : "dashboard";
  state.showPrototypeModal = true;
  state.asnTestStarted = false;
  state.asnQuestionIndex = 0;
  state.asnTimeLeft = 30;
  state.selectedAsnId = getDefaultSelectedAsnIdForUser(user);
  await renderApp();
}

function handleRolePrefill(event) {
  const selectedRole = event.target.value;
  const user = DEMO_USERS.find((item) => item.role === selectedRole);
  if (!user) return;
  document.getElementById("username").value = user.username;
  document.getElementById("password").value = user.password;
}

function handleAssessmentChange(event) {
  if (!event.target.name) return;
  state.assessmentAnswers[event.target.name] = Number(event.target.value);
  const summary = getAssessmentSummary();
  const scoreValue = document.querySelector(".score-ring-value");
  if (scoreValue) scoreValue.textContent = summary.score;
  updateScoreRing(summary.score);
}

async function handleAssessmentSubmit(event) {
  event.preventDefault();
  await finalizeAssessment();
}

renderApp();
