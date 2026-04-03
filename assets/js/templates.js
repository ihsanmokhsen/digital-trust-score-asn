export const loginTemplate = `
<div class="login-shell">
  <div class="login-card">
    <section class="hero-panel">
      <div class="logo-stack">
        <img class="logo-badge" src="assets/images/logoaplikasi.png" alt="Logo aplikasi Digital Trust Score ASN" />
      </div>
      <div class="brand-chip">
        <span>Digital Trust Score ASN</span>
      </div>
      <div class="team-signature">prototype by do'a ibu</div>
      <h1>Digital Trust Score ASN</h1>
      <p>Platform Monitoring Perilaku Keamanan Informasi ASN</p>
      <p>Platform Pengukuran dan Monitoring Kesadaran Keamanan Data Pemerintah.</p>
      <div class="hero-grid">
        <div class="hero-metric">
          <strong>3 Instansi</strong>
          BPAD Provinsi NTT, Dinas Kominfo, dan Inspektorat
        </div>
        <div class="hero-metric">
          <strong>Assessment</strong>
          Pengukuran perilaku keamanan informasi ASN
        </div>
        <div class="hero-metric">
          <strong>Lokal</strong>
          Data dummy tanpa API dan tanpa koneksi eksternal
        </div>
      </div>
    </section>
    <section class="login-panel">
      <h2 class="section-title">Masuk ke Prototype</h2>
      <form class="login-form" id="login-form">
        <div class="field">
          <label for="role">Role</label>
          <select id="role" name="role">
            <option value="Admin">Admin</option>
            <option value="Pimpinan">Pimpinan</option>
            <option value="ASN">ASN</option>
          </select>
        </div>
        <div class="field">
          <label for="username">Username</label>
          <input id="username" name="username" placeholder="Masukkan username demo" value="admin" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Masukkan password demo" value="admin123" />
        </div>
        <button class="button" type="submit">Masuk ke Dashboard</button>
        <div class="error-text" id="login-error"></div>
      </form>
      <div class="demo-box">
        <h3>Informasi Login Prototype</h3>
        <ul>
          <li><strong>Admin:</strong> <code>admin</code> / <code>admin123</code></li>
          <li><strong>Pimpinan:</strong> <code>pimpinan</code> / <code>pimpinan123</code></li>
          <li><strong>ASN:</strong> <code>asn</code> / <code>asn123</code></li>
        </ul>
        <div class="team-signature subtle">do'a ibu</div>
      </div>
    </section>
  </div>
</div>
`;

export const appShellTemplate = `
<div class="app-shell">
  <aside class="sidebar">
    <div class="logo-stack sidebar-logos">
      <img class="logo-badge" src="assets/images/logoaplikasi.png" alt="Logo aplikasi Digital Trust Score ASN" />
    </div>
    <div class="brand-chip">
      <span>Digital Trust Score ASN</span>
    </div>
    <div class="muted">Platform Monitoring Perilaku Keamanan Informasi ASN</div>
    <div class="team-signature subtle sidebar-signature">do'a ibu</div>
    <nav class="nav-list" id="sidebar-nav"></nav>
    <div class="sidebar-footer">
      <strong id="current-role"></strong>
      <div id="current-name"></div>
      <div class="muted">Mode prototype lokal aktif</div>
      <button class="button" id="logout-button" type="button">Keluar</button>
    </div>
  </aside>

  <main class="content">
    <header class="topbar">
      <div>
        <h1>Digital Trust Score ASN</h1>
        <p>Platform Pengukuran dan Monitoring Kesadaran Keamanan Data Pemerintah</p>
      </div>
      <div class="topbar-meta">
        <div class="topbar-pill" id="role-pill"></div>
        <div class="topbar-pill" id="agency-pill"></div>
      </div>
    </header>

    <div id="page-content"></div>
    <footer class="footer">Team Do'a Ibu - BPAD Provinsi NTT</footer>
  </main>
</div>

<div class="modal-overlay hidden" id="prototype-modal">
  <div class="modal-card">
    <div class="modal-chip">Informasi Prototype</div>
    <h2>Digdaya X Hackaton Pusat Inovasi Digital Indonesia 2026</h2>
    <p>
      Ini adalah prototype untuk Digdaya X Hackaton Pusat Inovasi Digital Indonesia 2026.
    </p>
    <p>
      Segala data yang ditampilkan merupakan data dummy dan hanya digunakan untuk menyampaikan alur dari aplikasi ini.
    </p>
    <button class="button" id="close-prototype-modal" type="button">Saya Mengerti</button>
  </div>
</div>
`;
