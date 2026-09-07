// Main application: loads all data layers, builds the Leaflet map, wires the sidebar UI.

const STUDY_CENTER = [10.975, 106.66];
const NHOM_COLORS = {
  "Trường học": "#3366cc",
  "Trường học (mầm non)": "#66a3ff",
  "Chợ": "#e6194B",
  "Siêu thị": "#f58231",
  "Thương mại - dịch vụ": "#911eb4",
  "Khu vực hành chính": "#000075",
  "Y tế": "#e6007a",
  "Khu vực công cộng": "#3cb44b",
  "Cơ quan công sở": "#808000",
};

let map, routesLayerGroup, roadsLayerGroup, meetingLayerGroup, fixedLayerGroup, collectionLayerGroup;
let optimizeLayerGroup, boundaryLayerGroup;
let DATA = {};

function el(html) {
  // Returns a single Element when the template has exactly one top-level element
  // (so callers can attach listeners to it), otherwise returns the DocumentFragment
  // itself so appendChild() transfers *all* top-level nodes, not just the first.
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.children.length === 1 ? t.content.firstElementChild : t.content;
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView(STUDY_CENTER, 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  boundaryLayerGroup = L.layerGroup().addTo(map);
  roadsLayerGroup = L.layerGroup().addTo(map);
  routesLayerGroup = L.layerGroup().addTo(map);
  meetingLayerGroup = L.layerGroup().addTo(map);
  fixedLayerGroup = L.layerGroup().addTo(map);
  collectionLayerGroup = L.layerGroup();
  optimizeLayerGroup = L.layerGroup().addTo(map);
}

function addBoundaryLayer(geojson) {
  const layer = L.geoJSON(geojson, {
    style: {
      color: "#0b3d2e",
      weight: 2.5,
      dashArray: "8,5",
      fill: true,
      fillOpacity: 0.02,
    },
  });
  const p = geojson.features[0]?.properties;
  if (p) {
    layer.bindPopup(
      `<b>Phường ${p.ten_xa}</b><br/>Diện tích: ${p.dtich_km2} km²<br/>Dân số: ${p.dan_so?.toLocaleString("vi-VN")} người<br/>Mật độ: ${p.matdo_km2?.toLocaleString("vi-VN")} người/km²`
    );
  }
  layer.addTo(boundaryLayerGroup);
  return layer;
}

function addRoadsLayer(geojson) {
  const layer = L.geoJSON(geojson, {
    style: { color: "#9aa89f", weight: 1, opacity: 0.55 },
  });
  layer.addTo(roadsLayerGroup);
}

function addRoutesLayer(geojson) {
  DATA.routeLayers = {};
  geojson.features.forEach((f) => {
    const p = f.properties;
    const layer = L.geoJSON(f, {
      style: { color: p.mau || "#333", weight: 4, opacity: 0.85 },
    });
    const key = `${p.xe}|${p.chuyen}`;
    const popup = `
      <b>${p.xe}${p.chuyen ? " – " + p.chuyen : ""}</b><br/>
      Khu vực: ${p.khu_vuc}<br/>
      Khung giờ: ${p.gio}<br/>
      Quãng đường (mạng lưới thực): ${p.distance_km} km<br/>
      Tuyến đường: ${p.streets.join(" → ")}<br/>
      Điểm thu gom trọng yếu:<br/>&bull; ${p.diem_thu_gom.join("<br/>&bull; ")}
    `;
    layer.bindPopup(popup);
    layer.addTo(routesLayerGroup);
    DATA.routeLayers[key] = layer;
  });
}

function addMeetingPointsLayer(geojson) {
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const ok = p.dat_qcvn_01_2021;
    const circle = L.circle([lat, lon], {
      radius: p.ban_kinh_phuc_vu_m || 300,
      color: "#3cb44b",
      weight: 1,
      fillColor: "#3cb44b",
      fillOpacity: 0.08,
    });
    circle.addTo(meetingLayerGroup);

    const dot = L.circleMarker([lat, lon], {
      radius: 7,
      color: "#fff",
      weight: 1.5,
      fillColor: ok ? "#c0392b" : "#e0912b",
      fillOpacity: 1,
    });
    dot.bindPopup(`
      <b>${p.ten}</b><br/>
      Tuyến: ${p.tuyen}<br/>
      Giờ đến: ${p.gio_den} · Dừng: ${p.thoi_gian_dung_phut} phút · Giờ rời: ${p.gio_roi}<br/>
      Bán kính phục vụ: ${p.ban_kinh_phuc_vu_m} m<br/>
      Khoảng cách công trình gần nhất: ${p.khoang_cach_cong_trinh_gan_nhat_m ?? "n/a"} m<br/>
      QCVN 01:2021/BXD: ${ok ? "✅ Đạt" : "⚠️ Cần kiểm tra"}<br/>
      <i>Độ tin cậy vị trí: ${p.do_tin_cay_vi_tri === "chinh_xac_poi" ? "khớp địa danh thực tế" : "ước lượng theo tuyến đường"}</i>
    `);
    dot.addTo(meetingLayerGroup);
  });
}

function addFixedPointsLayer(geojson) {
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const isDump = p.loai.includes("đổ rác");
    const marker = L.circleMarker([lat, lon], {
      radius: 10,
      color: "#fff",
      weight: 2,
      fillColor: isDump ? "#000075" : "#9A6324",
      fillOpacity: 1,
    });
    marker.bindPopup(`<b>${p.name}</b><br/>${p.loai}` + (isDump ? "<br/><i>~23km về phía Bắc khu vực nghiên cứu</i>" : ""));
    marker.addTo(fixedLayerGroup);
  });
}

function addCollectionPointsLayer(geojson) {
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const color = NHOM_COLORS[p.nhom] || "#777";
    const marker = L.circleMarker([lat, lon], {
      radius: 4,
      color: color,
      weight: 1,
      fillColor: color,
      fillOpacity: 0.7,
    });
    marker.bindPopup(`<b>${p.name}</b><br/>Nhóm: ${p.nhom}`);
    marker.addTo(collectionLayerGroup);
  });
}

function buildLegend() {
  const legend = document.getElementById("legend");
  legend.appendChild(
    el(`
    <div>
      <h4>Lớp bản đồ</h4>
      <label class="legend-row"><input type="checkbox" id="lyr-boundary" checked/> Ranh giới hành chính (chính xác)</label>
      <label class="legend-row"><input type="checkbox" id="lyr-roads" checked/> Mạng lưới đường (OSM)</label>
      <label class="legend-row"><input type="checkbox" id="lyr-routes" checked/> 13 tuyến thu gom</label>
      <label class="legend-row"><input type="checkbox" id="lyr-meeting" checked/> Điểm hẹn + vùng đệm 300m</label>
      <label class="legend-row"><input type="checkbox" id="lyr-fixed" checked/> Bãi tập kết / đổ rác</label>
      <label class="legend-row"><input type="checkbox" id="lyr-collection"/> Điểm phát sinh rác (11 nhóm)</label>
    </div>
  `)
  );
  const bind = (id, group) => {
    document.getElementById(id).addEventListener("change", (e) => {
      if (e.target.checked) map.addLayer(group);
      else map.removeLayer(group);
    });
  };
  bind("lyr-boundary", boundaryLayerGroup);
  bind("lyr-roads", roadsLayerGroup);
  bind("lyr-routes", routesLayerGroup);
  bind("lyr-meeting", meetingLayerGroup);
  bind("lyr-fixed", fixedLayerGroup);
  bind("lyr-collection", collectionLayerGroup);
}

// ---------------- Sidebar tabs ----------------
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.remove("hidden");
    });
  });
}

// ---------------- Tổng quan ----------------
function renderTongQuan(stats) {
  const totalKg = stats.khoi_luong_rac.khu_vuc.reduce((s, k) => s + k.khoi_luong_tan_ngay_tong, 0);
  const cards = [
    [stats.dan_so.tong_ho_dan.toLocaleString("vi-VN"), "Tổng hộ dân"],
    [stats.dan_so.tong_nhan_khau.toLocaleString("vi-VN"), "Tổng nhân khẩu"],
    [stats.dan_so.dien_tich_km2 + " km²", "Diện tích tự nhiên"],
    [totalKg.toFixed(1) + " tấn/ngày", "Khối lượng CTRSH thu gom"],
    ["8 xe / 13 chuyến", "Mạng lưới vận chuyển"],
    ["13 điểm", "Điểm hẹn đề xuất"],
  ];
  const grid = document.getElementById("stat-cards");
  cards.forEach(([num, label]) => {
    grid.appendChild(el(`<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`));
  });

  const maxHo = Math.max(...stats.dan_so.khu_vuc.map((k) => k.ho_dan));
  const chart = document.getElementById("chart-khuvuc");
  stats.khoi_luong_rac.khu_vuc.forEach((k) => {
    const hoDan = stats.dan_so.khu_vuc.find((h) => h.ten === k.ten)?.ho_dan || 0;
    const pct = (hoDan / maxHo) * 100;
    chart.appendChild(
      el(`
      <div class="bar-row">
        <div class="bar-label"><span>${k.ten} (${k.xe})</span><span>${hoDan.toLocaleString("vi-VN")} hộ · ${k.khoi_luong_tan_ngay_tong} tấn/ngày</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `)
    );
  });

  document.getElementById("donvi-thugom").textContent = stats.don_vi_thu_gom;

  const g = stats.chi_tieu_phat_sinh_doi_chieu;
  const genRows = [
    ["Khóa luận (Thủ Dầu Một)", g.so_lieu_khoa_luan_kg_nguoi_ngay],
    ["Đo thực tế tại TP.HCM (tham khảo)", g.so_lieu_do_thuc_te_tphcm_kg_nguoi_ngay],
    ["Giáo trình Trần Thị Mỹ Diệu (2010)", g.so_lieu_giao_trinh_kg_nguoi_ngay],
  ];
  const maxGen = Math.max(...genRows.map((r) => r[1]));
  const genChart = document.getElementById("chart-phatsinh");
  genRows.forEach(([label, val]) => {
    genChart.appendChild(
      el(`
      <div class="bar-row">
        <div class="bar-label"><span>${label}</span><span>${val} kg/người/ngày</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${(val / maxGen) * 100}%"></div></div>
      </div>
    `)
    );
  });
  genChart.appendChild(el(`<p class="footnote">${g.ghi_chu}</p>`));
}

// ---------------- Tuyến thu gom ----------------
function renderRouteList(geojson) {
  const list = document.getElementById("route-list");
  geojson.features.forEach((f) => {
    const p = f.properties;
    const item = el(`
      <div class="route-item">
        <div class="row1"><span class="route-swatch" style="background:${p.mau}"></span>${p.xe}${p.chuyen ? " – " + p.chuyen : ""}</div>
        <div class="meta">${p.khu_vuc} · ${p.gio} · ${p.distance_km} km</div>
        <div class="diem">${p.diem_thu_gom[0] || ""}</div>
      </div>
    `);
    item.addEventListener("click", () => {
      const key = `${p.xe}|${p.chuyen}`;
      const layer = DATA.routeLayers[key];
      if (layer) {
        map.fitBounds(layer.getBounds(), { maxZoom: 16 });
        layer.openPopup();
      }
    });
    list.appendChild(item);
  });
}

// ---------------- Điểm hẹn & lịch trình ----------------
function renderMeetingTable(geojson) {
  const tbody = document.querySelector("#tbl-diemhen tbody");
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const badge = p.dat_qcvn_01_2021
      ? `<span class="badge ok">Đạt</span>`
      : `<span class="badge warn">Kiểm tra</span>`;
    const row = el(`
      <tr>
        <td>${p.tuyen}</td>
        <td>${p.ten}</td>
        <td>${p.gio_den}</td>
        <td>${p.gio_roi}</td>
        <td>${badge}</td>
      </tr>
    `);
    row.addEventListener("click", () => map.setView([lat, lon], 17));
    tbody.appendChild(row);
  });
}

function renderCompareTable(stats) {
  const c = stats.so_sanh_hien_trang_de_xuat;
  const box = document.getElementById("compare-table");
  box.appendChild(
    el(`
    <div class="result-card">
      <b>Hiện trạng</b>
      <div class="result-row stack"><span>Thời gian xe đỗ / điểm</span><span>${c.hien_trang.thoi_gian_xe_do_1_diem}</span></div>
      <div class="result-row stack"><span>Đánh giá</span><span>${c.hien_trang.danh_gia}</span></div>
    </div>
    <div class="result-card better">
      <b>Đề xuất (điểm hẹn 15 phút)</b>
      <div class="result-row"><span>Thời gian xe đỗ / điểm</span><b>${c.de_xuat.thoi_gian_xe_do_1_diem_phut} phút</b></div>
      <div class="result-row"><span>Tổng thời gian hoàn thành 3 điểm</span><b>${c.de_xuat.tong_thoi_gian_hoan_thanh_3_diem_phut} phút</b></div>
      <div class="result-row stack"><span>Đánh giá</span><span>${c.de_xuat.danh_gia}</span></div>
    </div>
  `)
  );
}

// ---------------- Tối ưu hóa ----------------
function groupMeetingPointsByTrip(geojson) {
  const groups = {};
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    if (!groups[p.tuyen]) groups[p.tuyen] = [];
    groups[p.tuyen].push({ name: p.ten, lat, lon, service_min: p.thoi_gian_dung_phut, gio_den: p.gio_den });
  });
  return groups;
}

function renderOptimizeTab(groups) {
  const select = document.getElementById("select-trip");
  Object.entries(groups).forEach(([tuyen, stops]) => {
    if (stops.length < 2) return;
    const opt = document.createElement("option");
    opt.value = tuyen;
    opt.textContent = `${tuyen} (${stops.length} điểm hẹn)`;
    select.appendChild(opt);
  });

  const speedSlider = document.getElementById("speed-slider");
  const speedVal = document.getElementById("speed-val");
  speedSlider.addEventListener("input", () => (speedVal.textContent = speedSlider.value));

  document.getElementById("btn-optimize").addEventListener("click", () => {
    const tuyen = select.value;
    const stops = groups[tuyen];
    if (!stops || stops.length < 2) return;
    const speed = parseFloat(speedSlider.value);
    const result = RouteOptimizer.optimize(stops, 0, speed);
    renderOptimizeResult(result, tuyen);
  });
}

function renderOptimizeResult(result, tuyen) {
  optimizeLayerGroup.clearLayers();

  L.polyline(result.baseline.coords, { color: "#999", weight: 4, dashArray: "6,6" })
    .bindTooltip("Thứ tự đề xuất trong khóa luận")
    .addTo(optimizeLayerGroup);
  L.polyline(result.optimized.coords, { color: "#1c9457", weight: 5 })
    .bindTooltip("Thứ tự sau tối ưu hóa (Nearest-Neighbor + 2-opt)")
    .addTo(optimizeLayerGroup);

  if (result.baseline.coords.length) {
    map.fitBounds(L.polyline(result.baseline.coords.concat(result.optimized.coords)).getBounds(), { maxZoom: 16 });
  }

  const box = document.getElementById("optimize-result");
  box.innerHTML = "";
  const better = result.savingsPct > 0.5;
  box.appendChild(
    el(`
    <div class="result-card">
      <b>${tuyen} — Thứ tự đề xuất (khóa luận)</b>
      <div class="result-row stack"><span>Thứ tự</span><span>${result.baseline.names.join(" → ")}</span></div>
      <div class="result-row"><span>Quãng đường</span><b>${result.baseline.distanceKm.toFixed(2)} km</b></div>
      <div class="result-row"><span>Thời gian ước tính</span><b>${result.baseline.timeMin.toFixed(0)} phút</b></div>
    </div>
    <div class="result-card ${better ? "better" : ""}">
      <b>Thứ tự sau tối ưu hóa</b>
      <div class="result-row stack"><span>Thứ tự</span><span>${result.optimized.names.join(" → ")}</span></div>
      <div class="result-row"><span>Quãng đường</span><b>${result.optimized.distanceKm.toFixed(2)} km</b></div>
      <div class="result-row"><span>Thời gian ước tính</span><b>${result.optimized.timeMin.toFixed(0)} phút</b></div>
      <div class="result-row"><span>Tiết kiệm quãng đường</span><b>${result.savingsPct.toFixed(1)}%</b></div>
      <div class="result-row"><span>Nhiên liệu tiết kiệm (ước tính)</span><b>${result.fuelSavedL.toFixed(2)} lít</b></div>
      <div class="result-row"><span>CO₂ giảm phát thải (ước tính)</span><b>${result.co2SavedKg.toFixed(2)} kg</b></div>
    </div>
  `)
  );
}

function renderBenchmark(stats) {
  const b = stats.doi_chieu_y_van;
  if (!b) return;
  const list = document.getElementById("benchmark-list");
  b.case_studies.forEach((c) => {
    list.appendChild(
      el(`
      <div class="result-row stack">
        <span>${c.noi}</span>
        <span>${c.tiet_kiem} <span class="muted">(${c.nguon})</span></span>
      </div>
    `)
    );
  });
  document.getElementById("benchmark-note").textContent = b.nhan_dinh;
}

// ---------------- Quy chuẩn ----------------
function renderQuyChuan(stats, meetingGeojson) {
  const q = stats.quy_chuan;
  const box = document.getElementById("qcvn-box");
  box.appendChild(
    el(`
    <div class="result-card">
      <div class="result-row"><span>Nguồn</span><b>${q.nguon}</b></div>
      <div class="result-row"><span>Thời gian vận hành tối đa / ca</span><b>${q.tram_trung_chuyen_khong_co_dinh.thoi_gian_van_hanh_toi_da_phut_ca} phút</b></div>
      <div class="result-row"><span>Thời gian vận hành tối đa / ngày</span><b>${q.tram_trung_chuyen_khong_co_dinh.thoi_gian_van_hanh_toi_da_h_ngay} giờ</b></div>
      <div class="result-row"><span>Khoảng cách ATMT tối thiểu</span><b>${q.tram_trung_chuyen_khong_co_dinh.khoang_cach_atmt_toi_thieu_m} m</b></div>
      <div class="result-row"><span>Bán kính phục vụ áp dụng</span><b>${q.ban_kinh_phuc_vu_de_xuat_m} m</b></div>
    </div>
    <p class="muted">${q.ghi_chu}</p>
  `)
  );

  const luatList = document.getElementById("luat-bvmt-list");
  (q.luat_bvmt_2020 || []).forEach((d) => {
    luatList.appendChild(el(`<div class="result-card"><b>${d.dieu}</b><p class="muted" style="margin:4px 0 0">${d.noi_dung}</p></div>`));
  });

  const list = document.getElementById("qcvn-list");
  let passCount = 0;
  meetingGeojson.features.forEach((f) => {
    const p = f.properties;
    if (p.dat_qcvn_01_2021) passCount++;
    const badgeClass = p.dat_qcvn_01_2021 ? "ok" : "warn";
    list.appendChild(
      el(`
      <div class="result-row">
        <span>${p.ten} <span class="muted">(${p.tuyen})</span></span>
        <span class="badge ${badgeClass}">${p.khoang_cach_cong_trinh_gan_nhat_m ?? "n/a"} m</span>
      </div>
    `)
    );
  });
  list.insertAdjacentElement(
    "afterbegin",
    el(`<p class="muted"><b>${passCount}/${meetingGeojson.features.length}</b> điểm hẹn đạt khoảng cách ATMT ≥ 20m.</p>`)
  );
}

// ---------------- Boot ----------------
async function main() {
  initMap();
  initTabs();

  const [boundary, roads, routes, meeting, fixed, collection, stats] = await Promise.all([
    fetchJSON("data/boundary.geojson"),
    fetchJSON("data/roads.geojson"),
    fetchJSON("data/routes.geojson"),
    fetchJSON("data/meeting_points.geojson"),
    fetchJSON("data/fixed_points.geojson"),
    fetchJSON("data/collection_points.geojson"),
    fetchJSON("data/stats.json"),
  ]);
  DATA.stats = stats;

  const boundaryLayer = addBoundaryLayer(boundary);
  map.fitBounds(boundaryLayer.getBounds(), { padding: [20, 20] });
  addRoadsLayer(roads);
  addRoutesLayer(routes);
  addMeetingPointsLayer(meeting);
  addFixedPointsLayer(fixed);
  addCollectionPointsLayer(collection);
  buildLegend();

  renderTongQuan(stats);
  renderRouteList(routes);
  renderMeetingTable(meeting);
  renderCompareTable(stats);
  renderQuyChuan(stats, meeting);
  renderBenchmark(stats);

  await RoadGraph.load("data/graph.json");
  const groups = groupMeetingPointsByTrip(meeting);
  renderOptimizeTab(groups);
}

main().catch((err) => {
  console.error(err);
  alert("Lỗi tải dữ liệu: " + err.message + "\nHãy chạy web app qua một local server (xem README).");
});
