export function calculateScore(knowledge, attitude, behavior) {
  return Math.round((knowledge + attitude + behavior) / 3);
}

export function getRiskLevel(score) {
  if (score <= 59) {
    return { label: "High Risk", tone: "high" };
  }
  if (score <= 79) {
    return { label: "Medium Risk", tone: "medium" };
  }
  return { label: "Low Risk", tone: "low" };
}

export function buildRecommendations(knowledge, attitude, behavior) {
  const recommendations = [];
  if (behavior < 70) recommendations.push("Perlu pelatihan pelaporan insiden");
  if (knowledge < 70) recommendations.push("Perlu edukasi keamanan informasi");
  if (attitude < 70) recommendations.push("Perlu kampanye awareness");
  if (!recommendations.length) {
    recommendations.push("Pertahankan kepatuhan keamanan dan lakukan simulasi phishing berkala");
  }
  return recommendations;
}

export function withDerivedMetrics(item) {
  const score = calculateScore(item.knowledge, item.attitude, item.behavior);
  return {
    ...item,
    score,
    riskLevel: getRiskLevel(score),
    recommendations: buildRecommendations(item.knowledge, item.attitude, item.behavior),
  };
}

export function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function shortAgency(agency) {
  if (agency.includes("BPAD")) return "BPAD";
  if (agency.includes("Kominfo")) return "Kominfo";
  return "Inspektorat";
}
