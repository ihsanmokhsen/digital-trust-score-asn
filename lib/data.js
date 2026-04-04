export const DEMO_USERS = [
  { role: "Admin", username: "admin", password: "admin123", name: "Administrator Pusat" },
  { role: "Pimpinan", username: "pimpinan", password: "pimpinan123", name: "Pimpinan Instansi" },
  {
    role: "ASN",
    username: "asn",
    password: "asn123",
    name: "ASN BPAD NTT",
    asnId: 2,
    agency: "BPAD Provinsi NTT",
  },
];

export const AGENCIES = [
  "BPAD Provinsi NTT",
  "Dinas Kominfo Provinsi NTT",
  "Inspektorat Daerah Provinsi NTT",
];

export const LIKERT_OPTIONS = [
  "Sangat Tidak Setuju",
  "Tidak Setuju",
  "Netral",
  "Setuju",
  "Sangat Setuju",
];

export const QUESTION_SETS = {
  knowledge: [
    "Saya memahami pentingnya penggunaan kata sandi yang kuat dan unik.",
    "Saya mengetahui prosedur pelaporan insiden keamanan informasi.",
    "Saya memahami cara mengenali email phishing atau tautan mencurigakan.",
    "Saya mengetahui aturan klasifikasi dan penanganan data pemerintah.",
    "Saya memahami kewajiban menjaga kerahasiaan informasi dinas.",
  ],
  attitude: [
    "Saya menilai keamanan informasi sebagai tanggung jawab pribadi saya.",
    "Saya merasa penting mematuhi kebijakan keamanan meski pekerjaan sedang sibuk.",
    "Saya percaya pelaporan insiden harus dilakukan segera tanpa ditunda.",
    "Saya mendukung budaya saling mengingatkan tentang keamanan informasi.",
    "Saya menganggap pelatihan keamanan digital penting untuk ASN.",
  ],
  behavior: [
    "Saya rutin mengganti kata sandi layanan kerja secara berkala.",
    "Saya memverifikasi pengirim sebelum membuka lampiran email dinas.",
    "Saya mengunci perangkat saat meninggalkan meja kerja.",
    "Saya menghindari berbagi akun atau kredensial dengan rekan kerja.",
    "Saya melaporkan kejadian mencurigakan kepada pihak terkait.",
  ],
};

export const INITIAL_ASN = [
  {
    id: 1,
    name: "Maria Yosefina",
    agency: "BPAD Provinsi NTT",
    unit: "Bidang Arsip Dinamis",
    knowledge: 78,
    attitude: 84,
    behavior: 72,
    lastAssessment: "2026-03-28",
  },
  {
    id: 2,
    name: "Benediktus Natonis",
    agency: "BPAD Provinsi NTT",
    unit: "Sekretariat BPAD",
    knowledge: 64,
    attitude: 71,
    behavior: 58,
    lastAssessment: "2026-03-30",
  },
  {
    id: 3,
    name: "Theresia Lede",
    agency: "Dinas Kominfo Provinsi NTT",
    unit: "Bidang Persandian",
    knowledge: 88,
    attitude: 90,
    behavior: 86,
    lastAssessment: "2026-03-29",
  },
  {
    id: 4,
    name: "Yohanis Kelen",
    agency: "Dinas Kominfo Provinsi NTT",
    unit: "Bidang Infrastruktur TIK",
    knowledge: 55,
    attitude: 62,
    behavior: 49,
    lastAssessment: "2026-03-25",
  },
  {
    id: 5,
    name: "Rika Seran",
    agency: "Inspektorat Daerah Provinsi NTT",
    unit: "Inspektur Pembantu I",
    knowledge: 81,
    attitude: 76,
    behavior: 83,
    lastAssessment: "2026-03-31",
  },
  {
    id: 6,
    name: "Samuel Dethan",
    agency: "Inspektorat Daerah Provinsi NTT",
    unit: "Inspektur Pembantu Khusus",
    knowledge: 69,
    attitude: 65,
    behavior: 61,
    lastAssessment: "2026-03-27",
  },
];

export const TREND_BY_AGENCY = {
  "BPAD Provinsi NTT": [61, 64, 66, 69, 70, 72, 75],
  "Dinas Kominfo Provinsi NTT": [65, 68, 71, 73, 75, 77, 79],
  "Inspektorat Daerah Provinsi NTT": [60, 62, 65, 67, 69, 71, 74],
};

export const AWARENESS_AREAS = [
  { name: "Password", value: 38, tone: "high" },
  { name: "Incident Reporting", value: 31, tone: "medium" },
  { name: "Information Handling", value: 22, tone: "low" },
];
