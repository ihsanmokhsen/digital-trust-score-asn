"use client";

import { useEffect, useRef, useState } from "react";
import {
  AGENCIES,
  AWARENESS_AREAS,
  DEMO_USERS,
  INITIAL_ASN,
  LIKERT_OPTIONS,
  QUESTION_SETS,
  TREND_BY_AGENCY,
} from "../lib/data";
import {
  average,
  buildRecommendations,
  calculateScore,
  formatLocalDate,
  getRiskLevel,
  shortAgency,
  withDerivedMetrics,
} from "../lib/utils";

export default function DigitalTrustPrototype() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [currentAgency, setCurrentAgency] = useState("all");
  const [asnList, setAsnList] = useState(() => INITIAL_ASN.map(withDerivedMetrics));
  const [selectedAsnId, setSelectedAsnId] = useState(1);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showPrototypeModal, setShowPrototypeModal] = useState(false);
  const [asnTestStarted, setAsnTestStarted] = useState(false);
  const [asnQuestionIndex, setAsnQuestionIndex] = useState(0);
  const [asnTimeLeft, setAsnTimeLeft] = useState(30);
  const [loginError, setLoginError] = useState("");

  const riskChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const radarChartRef = useRef(null);
  const agencyChartRef = useRef(null);

  const isAsnRole = currentUser?.role === "ASN";
  const availablePages = isAsnRole
    ? [
        ["assessment", "Assessment"],
        ["my-score", "Nilai Saya"],
      ]
    : [
        ["dashboard", "Dashboard"],
        ["assessment", "Assessment"],
        ["asn-list", "ASN List"],
        ["analytics", "Analytics"],
        ["settings", "Settings"],
      ];

  const agencyScopedAsnList =
    currentAgency === "all" ? asnList : asnList.filter((item) => item.agency === currentAgency);

  const selectedAsn = isAsnRole
    ? asnList.find((item) => item.id === currentUser?.asnId) ?? null
    : asnList.find((item) => item.id === selectedAsnId && (currentAgency === "all" || item.agency === currentAgency)) ||
      agencyScopedAsnList[0] ||
      asnList[0] ||
      null;

  const stats = getStats(agencyScopedAsnList);
  const assessmentSummary = getAssessmentSummary(assessmentAnswers);
  const agencyScores = AGENCIES.map((agency) => {
    const list = asnList.filter((item) => item.agency === agency);
    const agencyStats = getStats(list);
    const dominantRisk =
      agencyStats.highRisk >= agencyStats.mediumRisk && agencyStats.highRisk >= agencyStats.lowRisk
        ? "High Risk"
        : agencyStats.mediumRisk >= agencyStats.lowRisk
          ? "Medium Risk"
          : "Low Risk";

    return {
      label: agency,
      shortLabel: shortAgency(agency),
      score: agencyStats.averageScore,
      count: list.length,
      dominantRisk,
    };
  });

  const filteredAsnList = agencyScopedAsnList.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.unit.toLowerCase().includes(term) ||
      item.agency.toLowerCase().includes(term);
    const matchesFilter = riskFilter === "all" || item.riskLevel.label === riskFilter;
    return matchesTerm && matchesFilter;
  });

  const asnQuestionFlow = [
    ...QUESTION_SETS.knowledge.map((question, index) => ({
      name: `knowledge-${index}`,
      label: "Pemahaman Keamanan",
      question,
    })),
    ...QUESTION_SETS.attitude.map((question, index) => ({
      name: `attitude-${index}`,
      label: "Sikap Kepatuhan",
      question,
    })),
    ...QUESTION_SETS.behavior.map((question, index) => ({
      name: `behavior-${index}`,
      label: "Perilaku Keamanan",
      question,
    })),
  ];

  useEffect(() => {
    if (!isAsnRole || currentPage !== "assessment" || !asnTestStarted) return undefined;
    if (asnTimeLeft <= 0) {
      void advanceAsnQuestion();
      return undefined;
    }

    const timer = setTimeout(() => setAsnTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [asnQuestionIndex, asnTestStarted, asnTimeLeft, currentPage, isAsnRole]);

  useEffect(() => {
    if (!riskChartRef.current || isAsnRole || currentPage !== "dashboard") return undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (riskChartRef.current) {
        drawRiskDistributionChart(riskChartRef.current, stats);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [currentPage, currentUser, isAsnRole, showPrototypeModal, stats.highRisk, stats.mediumRisk, stats.lowRisk]);

  useEffect(() => {
    if (!trendChartRef.current || isAsnRole || currentPage !== "dashboard") return undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (trendChartRef.current) {
        drawTrendChart(
          trendChartRef.current,
          currentAgency === "all" ? averageTrend() : TREND_BY_AGENCY[currentAgency]
        );
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [currentAgency, currentPage, currentUser, isAsnRole, showPrototypeModal]);

  useEffect(() => {
    if (!radarChartRef.current || !selectedAsn || (currentPage !== "my-score" && currentPage !== "asn-list")) {
      return undefined;
    }
    const frameId = window.requestAnimationFrame(() => {
      if (radarChartRef.current) {
        drawRadarChart(radarChartRef.current, selectedAsn);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [currentPage, selectedAsn, showPrototypeModal]);

  useEffect(() => {
    if (!agencyChartRef.current || isAsnRole || currentPage !== "analytics") return undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (agencyChartRef.current) {
        drawAgencyChart(agencyChartRef.current, agencyScores);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [agencyScores, currentPage, isAsnRole, showPrototypeModal]);

  function averageTrend() {
    const entries = Object.values(TREND_BY_AGENCY);
    return entries[0].map((_, index) => average(entries.map((item) => item[index])));
  }

  function getAgencyLabel() {
    return currentAgency === "all" ? "Semua Instansi" : currentAgency;
  }

  function getDefaultSelectedAsnIdForUser(user) {
    if (user.role === "ASN") return user.asnId ?? null;
    return asnList[0]?.id ?? 1;
  }

  async function advanceAsnQuestion() {
    if (asnQuestionIndex >= asnQuestionFlow.length - 1) {
      finalizeAssessment();
      return;
    }
    setAsnQuestionIndex((value) => value + 1);
    setAsnTimeLeft(30);
  }

  function finalizeAssessment() {
    if (!selectedAsn) return;
    const summary = getAssessmentSummary(assessmentAnswers);
    setAsnList((current) =>
      current.map((item) =>
        item.id === selectedAsn.id
          ? withDerivedMetrics({
              ...item,
              knowledge: summary.knowledge,
              attitude: summary.attitude,
              behavior: summary.behavior,
              lastAssessment: formatLocalDate(new Date()),
            })
          : item
      )
    );
    setAsnTestStarted(false);
    setAsnQuestionIndex(0);
    setAsnTimeLeft(30);
    setCurrentPage(isAsnRole ? "my-score" : "asn-list");
  }

  function finalizeSimulation() {
    setCurrentPage("dashboard");
  }

  function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const role = formData.get("role");
    const username = formData.get("username");
    const password = formData.get("password");
    const user = DEMO_USERS.find(
      (item) => item.role === role && item.username === username && item.password === password
    );

    if (!user) {
      setLoginError("Login gagal. Gunakan akun demo yang tersedia pada panel informasi.");
      return;
    }

    setLoginError("");
    setCurrentUser(user);
    setCurrentAgency(user.role === "ASN" ? user.agency : "all");
    setCurrentPage(user.role === "ASN" ? "assessment" : "dashboard");
    setSelectedAsnId(getDefaultSelectedAsnIdForUser(user));
    setShowPrototypeModal(true);
    setAsnTestStarted(false);
    setAsnQuestionIndex(0);
    setAsnTimeLeft(30);
    setAssessmentAnswers({});
  }

  function handleRolePrefill(event) {
    const selectedRole = event.target.value;
    const user = DEMO_USERS.find((item) => item.role === selectedRole);
    if (!user) return;
    const form = event.target.form;
    form.username.value = user.username;
    form.password.value = user.password;
  }

  function startAsnTest() {
    if (!selectedAsn) return;
    setAssessmentAnswers({});
    setAsnQuestionIndex(0);
    setAsnTimeLeft(30);
    setAsnTestStarted(true);
  }

  function renderBadge(label) {
    const tone = label === "High Risk" ? "high" : label === "Medium Risk" ? "medium" : "low";
    return <span className={`badge ${tone}`}>{label}</span>;
  }

  if (!currentUser) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <section className="hero-panel">
            <div className="logo-stack">
              <img className="logo-badge" src="/logoaplikasi.png" alt="Logo aplikasi Digital Trust Score ASN" />
            </div>
            <div className="brand-chip">
              <span>Digital Trust Score ASN</span>
            </div>
            <div className="team-signature">prototype by do&apos;a ibu</div>
            <div className="team-website">ihsanmokhsen.com</div>
            <h1>Digital Trust Score ASN</h1>
            <p>Platform Monitoring Perilaku Keamanan Informasi ASN</p>
            <p>Platform Pengukuran dan Monitoring Kesadaran Keamanan Data Pemerintah.</p>
            <div className="hero-grid">
              <div className="hero-metric">
                <strong>3 Instansi</strong>
                BPAD Provinsi NTT, Dinas Kominfo, dan Inspektorat
              </div>
              <div className="hero-metric">
                <strong>Assessment</strong>
                Pengukuran perilaku keamanan informasi ASN
              </div>
              <div className="hero-metric">
                <strong>Lokal</strong>
                Data dummy tanpa API dan tanpa koneksi eksternal
              </div>
            </div>
          </section>
          <section className="login-panel">
            <h2 className="section-title">Masuk ke Prototype</h2>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="role">Role</label>
                <select defaultValue="Admin" id="role" name="role" onChange={handleRolePrefill}>
                  <option value="Admin">Admin</option>
                  <option value="Pimpinan">Pimpinan</option>
                  <option value="ASN">ASN</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input defaultValue="admin" id="username" name="username" />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input defaultValue="admin123" id="password" name="password" type="password" />
              </div>
              <button className="button" type="submit">
                Masuk ke Dashboard
              </button>
              <div className="error-text">{loginError}</div>
            </form>
            <div className="demo-box">
              <h3>Informasi Login Prototype</h3>
              <ul>
                <li>
                  <strong>Admin:</strong> <code>admin</code> / <code>admin123</code>
                </li>
                <li>
                  <strong>Pimpinan:</strong> <code>pimpinan</code> / <code>pimpinan123</code>
                </li>
                <li>
                  <strong>ASN:</strong> <code>asn</code> / <code>asn123</code>
                </li>
              </ul>
              <div className="team-signature subtle">do&apos;a ibu</div>
              <div className="team-website subtle">ihsanmokhsen.com</div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="logo-stack sidebar-logos">
            <img className="logo-badge" src="/logoaplikasi.png" alt="Logo aplikasi Digital Trust Score ASN" />
          </div>
          <div className="brand-chip">
            <span>Digital Trust Score ASN</span>
          </div>
          <div className="muted">Platform Monitoring Perilaku Keamanan Informasi ASN</div>
          <div className="team-signature subtle sidebar-signature">do&apos;a ibu</div>
          <div className="team-website subtle">ihsanmokhsen.com</div>
          <nav className="nav-list">
            {availablePages.map(([page, label]) => (
              <button
                key={page}
                className={`nav-button ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <strong>{currentUser.role}</strong>
            <div>{currentUser.name}</div>
            <div className="muted">Mode prototype lokal aktif</div>
            <button
              className="button"
              onClick={() => {
                setCurrentUser(null);
                setShowPrototypeModal(false);
                setAsnTestStarted(false);
                setAsnQuestionIndex(0);
                setAsnTimeLeft(30);
              }}
              type="button"
            >
              Keluar
            </button>
          </div>
        </aside>

        <main className="content">
          <header className="topbar">
            <div>
              <h1>Digital Trust Score ASN</h1>
              <p>Platform Pengukuran dan Monitoring Kesadaran Keamanan Data Pemerintah</p>
            </div>
            <div className="topbar-meta">
              <div className="topbar-pill">Role aktif: {currentUser.role}</div>
              <div className="topbar-pill">Instansi: {getAgencyLabel()}</div>
            </div>
          </header>

          {currentPage === "dashboard" && !isAsnRole && (
            <>
              <div className="agency-strip">
                <AgencyFilters currentAgency={currentAgency} onChange={setCurrentAgency} />
              </div>
              <div className="instansi-grid">
                {AGENCIES.map((agency) => {
                  const agencyStats = getStats(asnList.filter((item) => item.agency === agency));
                  return (
                    <div className={`card agency-card ${currentAgency === agency ? "active" : ""}`} key={agency}>
                      <div className="card-label">{agency}</div>
                      <div className="card-value">{agencyStats.averageScore}</div>
                      <div className="card-trend">{asnList.filter((item) => item.agency === agency).length} ASN contoh • {agencyStats.highRisk} high risk</div>
                    </div>
                  );
                })}
              </div>
              <div className="stats-grid">
                <SummaryCard label="Rata-rata Digital Trust Score" value={stats.averageScore} trend={`Ringkasan untuk ${getAgencyLabel()}`} />
                <SummaryCard label="Jumlah ASN Risiko Tinggi" value={stats.highRisk} trend="Memerlukan intervensi prioritas" />
                <SummaryCard label="Jumlah ASN Risiko Sedang" value={stats.mediumRisk} trend="Perlu penguatan awareness berkala" />
                <SummaryCard label="Jumlah ASN Risiko Rendah" value={stats.lowRisk} trend="Pertahankan budaya keamanan positif" />
              </div>
              <div className="insight-grid">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Distribusi Risiko ASN</h2>
                      <div className="panel-subtitle">Distribusi risiko untuk {getAgencyLabel()}.</div>
                    </div>
                  </div>
                  <canvas height="280" ref={riskChartRef} width="560" />
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Top Risiko</h2>
                      <div className="panel-subtitle">Simulasi area prioritas berbasis data dummy prototype.</div>
                    </div>
                  </div>
                  <div className="risk-list">
                    {AWARENESS_AREAS.map((item) => (
                      <div className="risk-item" key={item.name}>
                        <strong>{item.name}</strong>
                        Gap awareness: {item.value}% ASN masih memerlukan penguatan pada area ini.
                        <div className="risk-meta">{renderBadge(item.tone === "high" ? "High Risk" : item.tone === "medium" ? "Medium Risk" : "Low Risk")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="insight-grid">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Trend Awareness Keamanan</h2>
                      <div className="panel-subtitle">Simulasi 7 periode monitoring untuk {getAgencyLabel()} berbasis data dummy.</div>
                    </div>
                  </div>
                  <canvas height="280" ref={trendChartRef} width="560" />
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Ringkasan Tindakan</h2>
                      <div className="panel-subtitle">Contoh intervensi cepat untuk kebutuhan demo dan presentasi.</div>
                    </div>
                  </div>
                  <div className="activity-list">
                    <div className="activity-item">
                      <strong>Pelatihan keamanan triwulanan</strong>
                      Fokus untuk unit dengan skor perilaku di bawah 70.
                    </div>
                    <div className="activity-item">
                      <strong>Awareness reminder mingguan</strong>
                      Kirim pesan singkat keamanan terkait phishing dan tata kelola data.
                    </div>
                    <div className="activity-item">
                      <strong>Simulasi phishing internal</strong>
                      Ukur peningkatan perilaku aman setelah intervensi pembelajaran.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentPage === "assessment" && !isAsnRole && (
            <div className="form-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Assessment Digital Trust</h2>
                    <div className="panel-subtitle">Simulasi kuesioner untuk preview hasil assessment di {getAgencyLabel()}.</div>
                  </div>
                </div>
                <form
                  className="question-group"
                  onSubmit={(event) => {
                    event.preventDefault();
                    finalizeSimulation();
                  }}
                >
                  <QuestionSection answers={assessmentAnswers} label="Pemahaman Keamanan" namePrefix="knowledge" onChange={setAssessmentAnswers} questions={QUESTION_SETS.knowledge} />
                  <QuestionSection answers={assessmentAnswers} label="Sikap Kepatuhan" namePrefix="attitude" onChange={setAssessmentAnswers} questions={QUESTION_SETS.attitude} />
                  <QuestionSection answers={assessmentAnswers} label="Perilaku Keamanan" namePrefix="behavior" onChange={setAssessmentAnswers} questions={QUESTION_SETS.behavior} />
                  <button className="button" type="submit">Lihat Hasil Simulasi</button>
                  <div className="form-note dark-note">Hasil pada panel kanan adalah simulasi untuk demo. Data ASN dan dashboard tidak diubah dari halaman ini.</div>
                </form>
              </div>
              <AssessmentSidebar renderBadge={renderBadge} summary={assessmentSummary} />
            </div>
          )}

          {currentPage === "assessment" && isAsnRole && (
            !selectedAsn ? (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Assessment Digital Trust</h2>
                    <div className="panel-subtitle">Profil ASN untuk akun ini belum terhubung.</div>
                  </div>
                </div>
                <div className="empty-state">
                  Hubungi admin prototype untuk menghubungkan akun ASN ke data penilaian yang sesuai.
                </div>
              </div>
            ) : !asnTestStarted ? (
              <div className="asn-test-layout">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Assessment Digital Trust</h2>
                      <div className="panel-subtitle">Test pribadi untuk {selectedAsn.name}.</div>
                    </div>
                  </div>
                  <div className="test-intro-card">
                    <div className="test-intro-tag">Mode Test ASN</div>
                    <h3>Mulai test assessment pribadi</h3>
                    <p>Setiap soal memiliki waktu 30 detik. Setelah waktu habis, soal akan otomatis berpindah ke soal berikutnya.</p>
                    <div className="test-rule-list">
                      <div className="recommendation-item"><strong>Total Soal</strong>15 soal assessment perilaku keamanan informasi</div>
                      <div className="recommendation-item"><strong>Durasi</strong>30 detik per soal</div>
                      <div className="recommendation-item"><strong>Hasil</strong>Skor dan risiko hanya untuk akun Anda sendiri</div>
                    </div>
                    <button className="button" onClick={startAsnTest} type="button">Mulai Test</button>
                  </div>
                </div>
                <aside className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Nilai Saat Ini</h2>
                      <div className="panel-subtitle">Ringkasan hasil terakhir yang tersimpan.</div>
                    </div>
                  </div>
                  <CurrentScoreCard renderBadge={renderBadge} selectedAsn={selectedAsn} />
                </aside>
              </div>
            ) : (
              <div className="asn-test-layout">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Assessment Digital Trust</h2>
                      <div className="panel-subtitle">Soal {asnQuestionIndex + 1} dari {asnQuestionFlow.length} untuk {selectedAsn.name}.</div>
                    </div>
                    <div className="timer-chip">00:{String(asnTimeLeft).padStart(2, "0")}</div>
                  </div>
                  <div className="test-progress">
                    <div className="test-progress-bar" style={{ width: `${((asnQuestionIndex + 1) / asnQuestionFlow.length) * 100}%` }} />
                  </div>
                  <div className="question-card test-question-card">
                    <div className="test-domain">{asnQuestionFlow[asnQuestionIndex].label}</div>
                    <h3>{asnQuestionIndex + 1}. {asnQuestionFlow[asnQuestionIndex].question}</h3>
                    <div className="test-option-grid">
                      {LIKERT_OPTIONS.map((option, optionIndex) => {
                        const value = optionIndex + 1;
                        return (
                          <button
                            key={option}
                            className={`test-option ${Number(assessmentAnswers[asnQuestionFlow[asnQuestionIndex].name]) === value ? "selected" : ""}`}
                            onClick={() =>
                              setAssessmentAnswers((current) => ({
                                ...current,
                                [asnQuestionFlow[asnQuestionIndex].name]: value,
                              }))
                            }
                            type="button"
                          >
                            <strong>{value}</strong>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="test-actions">
                      <div className="dark-note">Waktu per soal 30 detik. Jika tidak dijawab, sistem akan lanjut otomatis.</div>
                      <button className="button" onClick={() => void advanceAsnQuestion()} type="button">
                        {asnQuestionIndex === asnQuestionFlow.length - 1 ? "Selesai Test" : "Lanjut Soal"}
                      </button>
                    </div>
                  </div>
                </div>
                <aside className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Hasil Sementara</h2>
                      <div className="panel-subtitle">Skor diperbarui selama test berjalan.</div>
                    </div>
                  </div>
                  <AssessmentSidebar compact renderBadge={renderBadge} summary={assessmentSummary} />
                </aside>
              </div>
            )
          )}

          {currentPage === "my-score" && selectedAsn && (
            <div className="detail-grid">
              <div className="panel">
                <div className="detail-header">
                  <div className="detail-meta">
                    <h2>{selectedAsn.name}</h2>
                    <p>{selectedAsn.agency} • {selectedAsn.unit} • Assessment terakhir {selectedAsn.lastAssessment}</p>
                  </div>
                  <div>{renderBadge(selectedAsn.riskLevel.label)}</div>
                </div>
                <canvas height="320" ref={radarChartRef} width="560" />
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Nilai Saya</h2>
                    <div className="panel-subtitle">Ringkasan hasil Digital Trust Score pribadi Anda.</div>
                  </div>
                </div>
                <div className="recommendation-list">
                  <div className="recommendation-item"><strong>Score Digital Trust</strong>{selectedAsn.score}</div>
                  <div className="recommendation-item"><strong>Pemahaman Keamanan</strong>{selectedAsn.knowledge}</div>
                  <div className="recommendation-item"><strong>Sikap Kepatuhan</strong>{selectedAsn.attitude}</div>
                  <div className="recommendation-item"><strong>Perilaku Keamanan</strong>{selectedAsn.behavior}</div>
                  <div className="recommendation-item"><strong>Risk Level</strong>{selectedAsn.riskLevel.label}</div>
                  {selectedAsn.recommendations.map((item) => (
                    <div className="recommendation-item" key={item}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentPage === "my-score" && !selectedAsn && (
            <div className="panel">
              <div className="empty-state">Data nilai pribadi belum tersedia untuk akun ini.</div>
            </div>
          )}

          {currentPage === "asn-list" && !isAsnRole && (
            <>
              <div className="agency-strip">
                <AgencyFilters currentAgency={currentAgency} onChange={setCurrentAgency} />
              </div>
              <div className="panel gap-bottom">
                <div className="panel-header">
                  <div>
                    <h2>User List ASN</h2>
                    <div className="panel-subtitle">Data ASN untuk {getAgencyLabel()}.</div>
                  </div>
                </div>
                <div className="toolbar">
                  <input className="search-input" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari nama atau unit kerja" value={searchTerm} />
                  <select className="filter-select" onChange={(event) => setRiskFilter(event.target.value)} value={riskFilter}>
                    <option value="all">Semua Risiko</option>
                    <option value="High Risk">High Risk</option>
                    <option value="Medium Risk">Medium Risk</option>
                    <option value="Low Risk">Low Risk</option>
                  </select>
                </div>
                <div className="table-wrap">
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
                      {filteredAsnList.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.agency}</td>
                          <td>{item.unit}</td>
                          <td>{item.score}</td>
                          <td>{renderBadge(item.riskLevel.label)}</td>
                          <td>{item.lastAssessment}</td>
                          <td>
                            <button className="table-action" onClick={() => setSelectedAsnId(item.id)} type="button">
                              Lihat Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filteredAsnList.length && <div className="empty-state">Tidak ada data ASN yang sesuai filter dan instansi aktif.</div>}
              </div>
              <div className="detail-grid">
                <div className="panel">
                  <div className="detail-header">
                    <div className="detail-meta">
                      <h2>{selectedAsn.name}</h2>
                      <p>{selectedAsn.agency} • {selectedAsn.unit} • Assessment terakhir {selectedAsn.lastAssessment}</p>
                    </div>
                    <div>{renderBadge(selectedAsn.riskLevel.label)}</div>
                  </div>
                  <canvas height="320" ref={radarChartRef} width="560" />
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Detail ASN</h2>
                      <div className="panel-subtitle">Score Digital Trust dan rekomendasi otomatis.</div>
                    </div>
                  </div>
                  <div className="recommendation-list">
                    <div className="recommendation-item"><strong>Score Digital Trust</strong>{selectedAsn.score}</div>
                    <div className="recommendation-item"><strong>Risk Level</strong>{selectedAsn.riskLevel.label}</div>
                    {selectedAsn.recommendations.map((item) => (
                      <div className="recommendation-item" key={item}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {currentPage === "analytics" && !isAsnRole && (
            <>
              <div className="panel gap-bottom">
                <div className="panel-header">
                  <div>
                    <h2>Analytics Antar Instansi</h2>
                    <div className="panel-subtitle">Perbandingan 3 instansi contoh berbasis data dummy pada prototype.</div>
                  </div>
                </div>
                <canvas height="300" ref={agencyChartRef} width="560" />
              </div>
              <div className="settings-grid">
                {agencyScores.map((agency) => (
                  <div className="panel" key={agency.label}>
                    <div className="panel-header">
                      <div>
                        <h2>{agency.shortLabel}</h2>
                        <div className="panel-subtitle">{agency.label}</div>
                      </div>
                    </div>
                    <div className="recommendation-item"><strong>Rata-rata Score</strong>{agency.score}</div>
                    <div className="recommendation-item"><strong>Jumlah ASN</strong>{agency.count}</div>
                    <div className="recommendation-item"><strong>Risiko Dominan</strong>{agency.dominantRisk}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {currentPage === "settings" && !isAsnRole && (
            <div className="settings-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Skema Penilaian</h2>
                    <div className="panel-subtitle">Indikator assessment perilaku keamanan digunakan secara seimbang.</div>
                  </div>
                </div>
                <div className="recommendation-item">0-59 = High Risk</div>
                <div className="recommendation-item">60-79 = Medium Risk</div>
                <div className="recommendation-item">80-100 = Low Risk</div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Stack Aplikasi</h2>
                    <div className="panel-subtitle">Prototype sudah dimigrasikan ke Next.js App Router.</div>
                  </div>
                </div>
                <div className="recommendation-item"><code>app/</code> untuk route dan layout</div>
                <div className="recommendation-item"><code>components/</code> untuk komponen client</div>
                <div className="recommendation-item"><code>lib/</code> untuk data dummy dan utilitas</div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Logo</h2>
                    <div className="panel-subtitle">Favicon dan logo aplikasi memakai satu aset utama.</div>
                  </div>
                </div>
                <div className="recommendation-item"><code>public/logoaplikasi.png</code> untuk favicon dan logo</div>
                <div className="recommendation-item">Logo Pemprov tidak lagi ditampilkan</div>
              </div>
            </div>
          )}

          <footer className="footer">
            <div>Team Do&apos;a Ibu - BPAD Provinsi NTT</div>
            <div className="footer-disclaimer">Prototype ini disusun khusus untuk kebutuhan hackathon.</div>
          </footer>
        </main>
      </div>

      <div className={`modal-overlay ${showPrototypeModal ? "" : "hidden"}`}>
        <div className="modal-card">
          <div className="modal-chip">Informasi Prototype</div>
          <h2>Digdaya X Hackaton Pusat Inovasi Digital Indonesia 2026</h2>
          <p>Ini adalah prototype untuk Digdaya X Hackaton Pusat Inovasi Digital Indonesia 2026.</p>
          <p>Prototype ini disusun khusus untuk kebutuhan hackathon dan presentasi alur solusi.</p>
          <p>Segala data yang ditampilkan merupakan data dummy dan hanya digunakan untuk menyampaikan alur dari aplikasi ini.</p>
          <button className="button" onClick={() => setShowPrototypeModal(false)} type="button">
            Saya Mengerti
          </button>
        </div>
      </div>
    </>
  );
}

function SummaryCard({ label, value, trend }) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      <div className="card-trend">{trend}</div>
    </div>
  );
}

function AgencyFilters({ currentAgency, onChange }) {
  const items = [["all", "Semua Instansi"], ...AGENCIES.map((agency) => [agency, agency])];
  return items.map(([value, label]) => (
    <button
      className={`agency-pill ${currentAgency === value ? "active" : ""}`}
      key={value}
      onClick={() => onChange(value)}
      type="button"
    >
      {label}
    </button>
  ));
}

function QuestionSection({ answers, label, namePrefix, onChange, questions }) {
  return (
    <div className="question-card">
      <h4>{label}</h4>
      <div className="question-group">
        {questions.map((question, index) => {
          const name = `${namePrefix}-${index}`;
          return (
            <div className="question-card inner" key={name}>
              <div className="question-title">{index + 1}. {question}</div>
              <div className="radio-row">
                {LIKERT_OPTIONS.map((option, optionIndex) => {
                  const value = optionIndex + 1;
                  return (
                    <label className="radio-card" key={`${name}-${value}`}>
                      <input
                        checked={Number(answers[name]) === value}
                        name={name}
                        onChange={() => onChange((current) => ({ ...current, [name]: value }))}
                        type="radio"
                        value={value}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssessmentSidebar({ compact = false, renderBadge, summary }) {
  return (
    <aside className="panel">
      <div className="panel-header">
        <div>
          <h2>{compact ? "Hasil Sementara" : "Hasil Otomatis"}</h2>
          <div className="panel-subtitle">
            {compact ? "Skor diperbarui selama test berjalan." : "Ringkasan indikator assessment dan klasifikasi risiko."}
          </div>
        </div>
      </div>
      <div className="result-box">
        <div className="score-ring" style={{ background: `conic-gradient(var(--primary) ${(summary.score / 100) * 360}deg, #d9e7f4 ${(summary.score / 100) * 360}deg)` }}>
          <div className="score-ring-value">{summary.score}</div>
        </div>
        <div className="centered">{renderBadge(summary.riskLevel.label)}</div>
        <div className="recommendation-list">
          <div className="recommendation-item"><strong>Pemahaman Keamanan</strong>{summary.knowledge}</div>
          <div className="recommendation-item"><strong>Sikap Kepatuhan</strong>{summary.attitude}</div>
          <div className="recommendation-item"><strong>Perilaku Keamanan</strong>{summary.behavior}</div>
        </div>
      </div>
      {!compact && (
        <div className="subpanel">
          <h3>Recommendation Panel</h3>
          <div className="recommendation-list">
            {summary.recommendations.map((item) => (
              <div className="recommendation-item" key={item}>{item}</div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function CurrentScoreCard({ renderBadge, selectedAsn }) {
  return (
    <div className="result-box">
      <div className="score-ring" style={{ background: `conic-gradient(var(--primary) ${(selectedAsn.score / 100) * 360}deg, #d9e7f4 ${(selectedAsn.score / 100) * 360}deg)` }}>
        <div className="score-ring-value">{selectedAsn.score}</div>
      </div>
      <div className="centered">{renderBadge(selectedAsn.riskLevel.label)}</div>
      <div className="recommendation-list">
        <div className="recommendation-item"><strong>Pemahaman Keamanan</strong>{selectedAsn.knowledge}</div>
        <div className="recommendation-item"><strong>Sikap Kepatuhan</strong>{selectedAsn.attitude}</div>
        <div className="recommendation-item"><strong>Perilaku Keamanan</strong>{selectedAsn.behavior}</div>
      </div>
    </div>
  );
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

function getAssessmentSummary(answers) {
  const knowledge = calculateSectionScore("knowledge", answers);
  const attitude = calculateSectionScore("attitude", answers);
  const behavior = calculateSectionScore("behavior", answers);
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

function calculateSectionScore(key, answers) {
  const values = QUESTION_SETS[key].map((_, index) => Number(answers[`${key}-${index}`] ?? 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / (values.length * 5)) * 100);
}

function drawRiskDistributionChart(canvas, stats) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const data = [
    { label: "High", value: stats.highRisk, color: "#cf3347" },
    { label: "Medium", value: stats.mediumRisk, color: "#f0b429" },
    { label: "Low", value: stats.lowRisk, color: "#1f8b4c" },
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let startAngle = -Math.PI / 2;
  data.forEach((item, index) => {
    const slice = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(160, 140);
    ctx.arc(160, 140, 92, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    startAngle += slice;
    ctx.fillStyle = "#ebf2ff";
    ctx.font = "14px Segoe UI";
    ctx.fillText(`${item.label}: ${item.value}`, 320, 80 + index * 34);
    ctx.fillStyle = item.color;
    ctx.fillRect(286, 69 + index * 34, 20, 12);
  });
  ctx.beginPath();
  ctx.fillStyle = "#0d1737";
  ctx.arc(160, 140, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ebf2ff";
  ctx.font = "700 28px Segoe UI";
  ctx.fillText(String(total), 148, 148);
}

function drawTrendChart(canvas, trendData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const labels = ["Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr"];
  const padding = 34;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#3f5fa7";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#35d6ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  trendData.forEach((value, index) => {
    const x = padding + (width / (trendData.length - 1)) * index;
    const y = padding + height - ((value - 50) / 35) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  trendData.forEach((value, index) => {
    const x = padding + (width / (trendData.length - 1)) * index;
    const y = padding + height - ((value - 50) / 35) * height;
    ctx.fillStyle = "#0d1737";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#35d6ff";
    ctx.stroke();
    ctx.fillStyle = "#9aa9df";
    ctx.font = "12px Segoe UI";
    ctx.fillText(labels[index], x - 10, canvas.height - 10);
    ctx.fillText(String(value), x - 8, y - 12);
  });
}

function drawRadarChart(canvas, selectedAsn) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const values = [selectedAsn.knowledge, selectedAsn.attitude, selectedAsn.behavior];
  const labels = ["Pemahaman", "Sikap", "Perilaku"];
  const cx = 250;
  const cy = 160;
  const radius = 110;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let ring = 1; ring <= 4; ring += 1) {
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
      const x = cx + Math.cos(angle) * ((radius / 4) * ring);
      const y = cy + Math.sin(angle) * ((radius / 4) * ring);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#3f5fa7";
    ctx.stroke();
  }
  labels.forEach((label, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 3;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#3f5fa7";
    ctx.stroke();
    ctx.fillStyle = "#ebf2ff";
    ctx.font = "13px Segoe UI";
    ctx.fillText(label, cx + Math.cos(angle) * (radius + 18) - 28, cy + Math.sin(angle) * (radius + 18));
  });
  ctx.beginPath();
  values.forEach((value, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 3;
    const x = cx + Math.cos(angle) * ((value / 100) * radius);
    const y = cy + Math.sin(angle) * ((value / 100) * radius);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(53, 214, 255, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "#35d6ff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAgencyChart(canvas, agencyScores) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const baseY = canvas.height - 40;
  const barWidth = 78;
  const gap = 34;
  agencyScores.forEach((item, index) => {
    const x = 55 + index * (barWidth + gap);
    const height = (item.score / 100) * 190;
    ctx.fillStyle = "#263d80";
    ctx.fillRect(x, baseY - height, barWidth, height);
    ctx.fillStyle = "#35d6ff";
    ctx.fillRect(x, baseY - height, barWidth, 20);
    ctx.fillStyle = "#ebf2ff";
    ctx.font = "12px Segoe UI";
    ctx.fillText(String(item.score), x + 28, baseY - height - 8);
    ctx.fillText(item.shortLabel, x - 6, baseY + 20);
  });
}
