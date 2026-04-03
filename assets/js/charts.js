export function renderCharts(context) {
  if (context.stats) drawRiskDistributionChart(context);
  if (context.trendData) drawTrendChart(context);
  if (context.selectedAsn) drawRadarChart(context);
  if (context.agencyScores) drawAgencyChart(context);
}

function drawRiskDistributionChart({ canvasId, stats }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
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
    ctx.fillStyle = "#18324a";
    ctx.font = "14px Segoe UI";
    ctx.fillText(`${item.label}: ${item.value}`, 320, 80 + index * 34);
    ctx.fillStyle = item.color;
    ctx.fillRect(286, 69 + index * 34, 20, 12);
  });
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(160, 140, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#18324a";
  ctx.font = "700 28px Segoe UI";
  ctx.fillText(String(total), 148, 148);
}

function drawTrendChart({ canvasId, trendData }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const labels = ["Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr"];
  const padding = 34;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#cfdbe8";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#0d5cab";
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
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0d5cab";
    ctx.stroke();
    ctx.fillStyle = "#64809a";
    ctx.font = "12px Segoe UI";
    ctx.fillText(labels[index], x - 10, canvas.height - 10);
    ctx.fillText(String(value), x - 8, y - 12);
  });
}

function drawRadarChart({ canvasId, selectedAsn }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !selectedAsn) return;
  const ctx = canvas.getContext("2d");
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
    ctx.strokeStyle = "#d7e1ec";
    ctx.stroke();
  }

  labels.forEach((label, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 3;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#d7e1ec";
    ctx.stroke();
    ctx.fillStyle = "#18324a";
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
  ctx.fillStyle = "rgba(13, 92, 171, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "#0d5cab";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawAgencyChart({ canvasId, agencyScores }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const baseY = canvas.height - 40;
  const barWidth = 78;
  const gap = 34;
  agencyScores.forEach((item, index) => {
    const x = 55 + index * (barWidth + gap);
    const height = (item.score / 100) * 190;
    ctx.fillStyle = "#cfe2f8";
    ctx.fillRect(x, baseY - height, barWidth, height);
    ctx.fillStyle = "#0d5cab";
    ctx.fillRect(x, baseY - height, barWidth, 20);
    ctx.fillStyle = "#18324a";
    ctx.font = "12px Segoe UI";
    ctx.fillText(String(item.score), x + 28, baseY - height - 8);
    ctx.fillText(item.shortLabel, x - 6, baseY + 20);
  });
}
