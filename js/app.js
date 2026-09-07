// Main application: loads all data layers, builds the Leaflet map, wires the sidebar UI.
// Bilingual (VI/EN) via i18n.js: t(), trLabel(), trNhom(), bi() — see that file for scope notes.

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
let currentBasemapKey = "osm";

// Emoji markers instead of plain circles/squares — self-explanatory at a glance, no icon
// image assets or extra libraries needed (emoji render crisply as vector glyphs at any zoom).
const NHOM_ICONS = {
  "Trường học": "🏫",
  "Trường học (mầm non)": "🧸",
  "Chợ": "🛒",
  "Siêu thị": "🏪",
  "Thương mại - dịch vụ": "🏬",
  "Khu vực hành chính": "🏛️",
  "Y tế": "🏥",
  "Khu vực công cộng": "🌳",
  "Cơ quan công sở": "🏢",
};
function emojiIcon(emoji, bgColor, size = 26) {
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;line-height:${size}px;text-align:center;
      background:${bgColor};border:2px solid #fff;border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.4);font-size:${size * 0.6}px;">${emoji}</div>`,
    className: "emoji-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function el(html) {
  // Returns a single Element when the template has exactly one top-level element
  // (so callers can attach listeners to it), otherwise returns the DocumentFragment
  // itself so appendChild() transfers *all* top-level nodes, not just the first.
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.children.length === 1 ? t.content.firstElementChild : t.content;
}

function clear(idOrEl) {
  const node = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  if (node) node.innerHTML = "";
  return node;
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// ---------------- Basemaps ----------------
// OPTIONAL — Google Maps basemap: Google's tiles may only be used via the official Google Maps
// JavaScript API (raw tile-URL scraping violates Google's Terms of Service and gets blocked).
// To enable it: (1) create an API key at https://console.cloud.google.com/google/maps-apis
//               with the "Maps JavaScript API" enabled, (2) paste it below, (3) reload the page.
// When empty (default), the Google option is simply not shown — no key is required otherwise.
const GOOGLE_MAPS_API_KEY = "";

// NOTE: CARTO's free "basemaps.cartocdn.com" tiles (Positron/Dark Matter/Voyager) now require a
// CARTO account API key — anonymous requests return a placeholder "API KEY REQUIRED" tile image
// (HTTP 200, but not an actual map). All basemaps below instead use Esri's ArcGIS Online tile
// services, which remain free and keyless for this kind of use, same server family as the
// satellite layer.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const BASEMAPS = {
  // Esri World Street Map: full-color streets with clear road/place labels — a much richer look
  // than plain OSM raster tiles, no API key required.
  osm: L.tileLayer(`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, {
    attribution: "Tiles &copy; Esri — Source: Esri, HERE, Garmin, USGS, NGA, EPA, USDA",
    maxZoom: 19,
  }),
  // Esri World Imagery alone has no text — pair it with Esri's reference overlay so street/place
  // names and boundaries are drawn on top of the satellite photo.
  satellite: L.layerGroup([
    L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
      maxZoom: 19,
    }),
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      pane: "shadowPane",
    }),
  ]),
  // Esri light/dark "Canvas" basemaps: muted background + a separate reference layer with labels.
  light: L.layerGroup([
    L.tileLayer(`${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: "Tiles &copy; Esri",
      maxZoom: 16,
    }),
    L.tileLayer(`${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16 }),
  ]),
  dark: L.layerGroup([
    L.tileLayer(`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: "Tiles &copy; Esri",
      maxZoom: 16,
    }),
    L.tileLayer(`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16 }),
  ]),
};

function setBasemap(key) {
  Object.values(BASEMAPS).forEach((layer) => map.removeLayer(layer));
  (BASEMAPS[key] || BASEMAPS.osm).addTo(map);
  currentBasemapKey = key;
}

// Loads the official Google Maps JS API + the GoogleMutant Leaflet plugin, then registers
// "google_roadmap" / "google_satellite" / "google_hybrid" basemaps. Only runs if a key is set.
function initGoogleBasemaps() {
  if (!GOOGLE_MAPS_API_KEY) return;
  const gscript = document.createElement("script");
  gscript.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
  gscript.onload = () => {
    const mutant = document.createElement("script");
    mutant.src = "https://cdnjs.cloudflare.com/ajax/libs/Leaflet.GridLayer.GoogleMutant/0.13.5/Leaflet.GoogleMutant.min.js";
    mutant.onload = () => {
      BASEMAPS.google_roadmap = L.gridLayer.googleMutant({ type: "roadmap" });
      BASEMAPS.google_satellite = L.gridLayer.googleMutant({ type: "satellite" });
      BASEMAPS.google_hybrid = L.gridLayer.googleMutant({ type: "hybrid" });
      document.getElementById("google-basemap-options")?.classList.remove("hidden");
    };
    document.head.appendChild(mutant);
  };
  document.head.appendChild(gscript);
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView(STUDY_CENTER, 14);
  BASEMAPS.osm.addTo(map);

  boundaryLayerGroup = L.layerGroup().addTo(map);
  roadsLayerGroup = L.layerGroup().addTo(map);
  routesLayerGroup = L.layerGroup().addTo(map);
  meetingLayerGroup = L.layerGroup().addTo(map);
  fixedLayerGroup = L.layerGroup().addTo(map);
  collectionLayerGroup = L.layerGroup();
  optimizeLayerGroup = L.layerGroup().addTo(map);
}

// ---------------- Map layers (re-invocable: each clears its group first so
// calling again after a language switch just refreshes popup text) ----------------
function addBoundaryLayer(geojson) {
  boundaryLayerGroup.clearLayers();
  const layer = L.geoJSON(geojson, {
    style: { color: "#0b3d2e", weight: 2.5, dashArray: "8,5", fill: true, fillOpacity: 0.02 },
  });
  const p = geojson.features[0]?.properties;
  if (p) {
    const locale = currentLang === "en" ? "en-US" : "vi-VN";
    layer.bindPopup(
      `<b>${t("popup_phuong")} ${p.ten_xa}</b><br/>${t("popup_dientich")}: ${p.dtich_km2} km²<br/>` +
      `${t("popup_danso")}: ${p.dan_so?.toLocaleString(locale)} ${t("unit_nguoi")}<br/>` +
      `${t("popup_matdo")}: ${p.matdo_km2?.toLocaleString(locale)} ${t("unit_nguoi_km2")}`
    );
  }
  layer.addTo(boundaryLayerGroup);
  return layer;
}

function addRoadsLayer(geojson) {
  roadsLayerGroup.clearLayers();
  L.geoJSON(geojson, { style: { color: "#9aa89f", weight: 1, opacity: 0.55 } }).addTo(roadsLayerGroup);
}

function addRoutesLayer(geojson) {
  routesLayerGroup.clearLayers();
  DATA.routeLayers = {};
  geojson.features.forEach((f) => {
    const p = f.properties;
    const layer = L.geoJSON(f, {
      style: { color: p.mau || "#333", weight: 4, opacity: 0.85, className: "route-flow" },
    });
    const key = `${p.xe}|${p.chuyen}`;
    const label = trLabel(p.xe) + (p.chuyen ? " – " + trLabel(p.chuyen) : "");
    const popup = `
      <b>${label}</b><br/>
      ${t("popup_khuvuc")}: ${p.khu_vuc}<br/>
      ${t("popup_khunggio")}: ${p.gio}<br/>
      ${t("popup_quangduong")}: ${p.distance_km} km<br/>
      ${t("popup_tuyenduong")}: ${p.streets.join(" → ")}<br/>
      ${t("popup_diemthugom")}:<br/>&bull; ${p.diem_thu_gom.join("<br/>&bull; ")}
    `;
    layer.bindPopup(popup);
    layer.addTo(routesLayerGroup);
    DATA.routeLayers[key] = layer;
  });
}

function addMeetingPointsLayer(geojson) {
  meetingLayerGroup.clearLayers();
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const ok = p.dat_qcvn_01_2021;
    L.circle([lat, lon], {
      radius: p.ban_kinh_phuc_vu_m || 300,
      color: "#3cb44b",
      weight: 1,
      fillColor: "#3cb44b",
      fillOpacity: 0.08,
    }).addTo(meetingLayerGroup);

    const dot = L.marker([lat, lon], {
      icon: emojiIcon("⏰", ok ? "#c0392b" : "#e0912b", 24),
    });
    const confidence = p.do_tin_cay_vi_tri === "chinh_xac_poi" ? t("dotincay_chinhxac") : t("dotincay_uocluong");
    dot.bindPopup(`
      <b>${p.ten}</b><br/>
      ${t("popup_tuyen")}: ${trLabel(p.tuyen)}<br/>
      ${t("popup_gioden")}: ${p.gio_den} · ${t("popup_dung")}: ${p.thoi_gian_dung_phut} ${t("popup_phut")} · ${t("popup_gioroi")}: ${p.gio_roi}<br/>
      ${t("popup_bankinh")}: ${p.ban_kinh_phuc_vu_m} m<br/>
      ${t("popup_khoangcach_ct")}: ${p.khoang_cach_cong_trinh_gan_nhat_m ?? "n/a"} m<br/>
      QCVN 01:2021/BXD: ${ok ? t("popup_dattqcvn") : t("popup_chuadat_qcvn")}<br/>
      <i>${t("popup_dotincay")}: ${confidence}</i>
    `);
    dot.addTo(meetingLayerGroup);
  });
}

function addFixedPointsLayer(geojson) {
  fixedLayerGroup.clearLayers();
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const isDump = p.loai.includes("đổ rác");
    const marker = L.marker([lat, lon], {
      icon: emojiIcon(isDump ? "🏭" : "🗑️", isDump ? "#000075" : "#9A6324", 30),
    });
    marker.bindPopup(`<b>${p.name}</b><br/>${p.loai}` + (isDump ? `<br/><i>${t("popup_ghichu_baidoRac")}</i>` : ""));
    marker.addTo(fixedLayerGroup);
  });
}

function addCollectionPointsLayer(geojson) {
  collectionLayerGroup.clearLayers();
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const color = NHOM_COLORS[p.nhom] || "#777";
    const icon = NHOM_ICONS[p.nhom] || "📍";
    const marker = L.marker([lat, lon], { icon: emojiIcon(icon, color, 20) });
    marker.bindPopup(`<b>${p.name}</b><br/>${t("popup_nhom")}: ${trNhom(p.nhom)}`);
    marker.addTo(collectionLayerGroup);
  });
}

// ---------------- Legend (basemap switcher + layer toggles) ----------------
const LEGEND_ICONS = {
  boundary: `<svg width="22" height="14" viewBox="0 0 22 14"><line x1="1" y1="7" x2="21" y2="7" stroke="#0b3d2e" stroke-width="2.4" stroke-dasharray="4,2.5"/></svg>`,
  roads: `<svg width="22" height="14" viewBox="0 0 22 14"><line x1="1" y1="7" x2="21" y2="7" stroke="#9aa89f" stroke-width="1.6"/></svg>`,
  routes: `<svg width="22" height="14" viewBox="0 0 22 14">
      <line x1="1" y1="4" x2="8" y2="4" stroke="#e6194B" stroke-width="2.6"/>
      <line x1="8" y1="9" x2="15" y2="9" stroke="#4363d8" stroke-width="2.6"/>
      <line x1="15" y1="4" x2="21" y2="4" stroke="#911eb4" stroke-width="2.6"/>
    </svg>`,
  meeting: `<svg width="22" height="14" viewBox="0 0 22 14">
      <circle cx="11" cy="7" r="6.5" fill="#3cb44b" fill-opacity="0.18" stroke="#3cb44b" stroke-width="1"/>
    </svg><span style="margin-left:-16px;font-size:13px;">⏰</span>`,
  fixed: `<span style="font-size:15px;">🗑️🏭</span>`,
  collection: `<span style="font-size:13px;">🏫🛒🏥</span>`,
};

// remember which overlay checkboxes are checked across a legend rebuild (language switch)
function currentLayerCheckedState() {
  const ids = ["lyr-boundary", "lyr-roads", "lyr-routes", "lyr-meeting", "lyr-fixed", "lyr-collection"];
  const state = {};
  ids.forEach((id) => {
    const elm = document.getElementById(id);
    if (elm) state[id] = elm.checked;
  });
  return state;
}

function buildLegend() {
  const prevState = currentLayerCheckedState();
  const legend = clear("legend");
  const chk = (id, def) => (id in prevState ? prevState[id] : def) ? "checked" : "";
  legend.appendChild(
    el(`
    <div>
      <h4 data-i18n="legend_basemap_title">${t("legend_basemap_title")}</h4>
      <div class="basemap-switch">
        <label><input type="radio" name="basemap" value="osm" ${currentBasemapKey === "osm" ? "checked" : ""}/> <span>${t("basemap_osm")}</span></label>
        <label><input type="radio" name="basemap" value="satellite" ${currentBasemapKey === "satellite" ? "checked" : ""}/> <span>${t("basemap_satellite")}</span></label>
        <label><input type="radio" name="basemap" value="light" ${currentBasemapKey === "light" ? "checked" : ""}/> <span>${t("basemap_light")}</span></label>
        <label><input type="radio" name="basemap" value="dark" ${currentBasemapKey === "dark" ? "checked" : ""}/> <span>${t("basemap_dark")}</span></label>
      </div>
      <div class="basemap-switch ${BASEMAPS.google_roadmap ? "" : "hidden"}" id="google-basemap-options">
        <label><input type="radio" name="basemap" value="google_roadmap" ${currentBasemapKey === "google_roadmap" ? "checked" : ""}/> <span>Google</span></label>
        <label><input type="radio" name="basemap" value="google_satellite" ${currentBasemapKey === "google_satellite" ? "checked" : ""}/> <span>Google Sat.</span></label>
        <label><input type="radio" name="basemap" value="google_hybrid" ${currentBasemapKey === "google_hybrid" ? "checked" : ""}/> <span>Google Hybrid</span></label>
      </div>
      <h4>${t("legend_title")}</h4>
      <label class="legend-row"><input type="checkbox" id="lyr-boundary" ${chk("lyr-boundary", true)}/> ${LEGEND_ICONS.boundary} <span>${t("lyr_boundary")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-roads" ${chk("lyr-roads", true)}/> ${LEGEND_ICONS.roads} <span>${t("lyr_roads")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-routes" ${chk("lyr-routes", true)}/> ${LEGEND_ICONS.routes} <span>${t("lyr_routes")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-meeting" ${chk("lyr-meeting", true)}/> ${LEGEND_ICONS.meeting} <span>${t("lyr_meeting")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-fixed" ${chk("lyr-fixed", true)}/> ${LEGEND_ICONS.fixed} <span>${t("lyr_fixed")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-collection" ${chk("lyr-collection", false)}/> ${LEGEND_ICONS.collection} <span>${t("lyr_collection")}</span></label>
    </div>
  `)
  );
  const bind = (id, group) => {
    const box = document.getElementById(id);
    box.addEventListener("change", (e) => {
      if (e.target.checked) map.addLayer(group);
      else map.removeLayer(group);
    });
    if (box.checked) map.addLayer(group);
    else map.removeLayer(group);
  };
  document.querySelectorAll('input[name="basemap"]').forEach((radio) => {
    radio.addEventListener("change", (e) => setBasemap(e.target.value));
  });
  bind("lyr-boundary", boundaryLayerGroup);
  bind("lyr-roads", roadsLayerGroup);
  bind("lyr-routes", routesLayerGroup);
  bind("lyr-meeting", meetingLayerGroup);
  bind("lyr-fixed", fixedLayerGroup);
  bind("lyr-collection", collectionLayerGroup);
}

// ---------------- Sidebar tabs (bound once; language-independent) ----------------
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

// ---------------- Tổng quan / Overview ----------------
function renderTongQuan(stats) {
  const totalKg = stats.khoi_luong_rac.khu_vuc.reduce((s, k) => s + k.khoi_luong_tan_ngay_tong, 0);
  const locale = currentLang === "en" ? "en-US" : "vi-VN";
  const cards = [
    [stats.dan_so.tong_ho_dan.toLocaleString(locale), t("stat_ho_dan")],
    [stats.dan_so.tong_nhan_khau.toLocaleString(locale), t("stat_nhan_khau")],
    [stats.dan_so.dien_tich_km2 + " km²", t("stat_dien_tich")],
    [totalKg.toFixed(1) + " " + t("unit_ton_ngay"), t("stat_khoi_luong")],
    [t("fleet_value"), t("stat_mang_luoi")],
    [t("meeting_value"), t("stat_diem_hen")],
  ];
  const grid = clear("stat-cards");
  cards.forEach(([num, label]) => {
    grid.appendChild(el(`<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`));
  });

  const maxHo = Math.max(...stats.dan_so.khu_vuc.map((k) => k.ho_dan));
  const chart = clear("chart-khuvuc");
  stats.khoi_luong_rac.khu_vuc.forEach((k) => {
    const hoDan = stats.dan_so.khu_vuc.find((h) => h.ten === k.ten)?.ho_dan || 0;
    const pct = (hoDan / maxHo) * 100;
    chart.appendChild(
      el(`
      <div class="bar-row">
        <div class="bar-label"><span>${k.ten} (${k.xe})</span><span>${hoDan.toLocaleString(locale)} ${t("unit_ho")} · ${k.khoi_luong_tan_ngay_tong} ${t("unit_ton_ngay")}</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `)
    );
  });

  document.getElementById("donvi-thugom").textContent = stats.don_vi_thu_gom;

  const g = stats.chi_tieu_phat_sinh_doi_chieu;
  const genRows = [
    [t("gen_khoaluan"), g.so_lieu_khoa_luan_kg_nguoi_ngay],
    [t("gen_tphcm"), g.so_lieu_do_thuc_te_tphcm_kg_nguoi_ngay],
    [t("gen_giaotrinh"), g.so_lieu_giao_trinh_kg_nguoi_ngay],
  ];
  const maxGen = Math.max(...genRows.map((r) => r[1]));
  const genChart = clear("chart-phatsinh");
  genRows.forEach(([label, val]) => {
    genChart.appendChild(
      el(`
      <div class="bar-row">
        <div class="bar-label"><span>${label}</span><span>${val} ${t("unit_kg_nguoi_ngay")}</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${(val / maxGen) * 100}%"></div></div>
      </div>
    `)
    );
  });
  genChart.appendChild(el(`<p class="footnote">${bi(g, "ghi_chu")}</p>`));
}

// ---------------- Tuyến thu gom / Routes ----------------
function renderRouteList(geojson) {
  const list = clear("route-list");
  geojson.features.forEach((f) => {
    const p = f.properties;
    const label = trLabel(p.xe) + (p.chuyen ? " – " + trLabel(p.chuyen) : "");
    const item = el(`
      <div class="route-item">
        <div class="row1"><span class="route-swatch" style="background:${p.mau}"></span>${label}</div>
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

// ---------------- Điểm hẹn & lịch trình / Meeting points & schedule ----------------
function renderMeetingTable(geojson) {
  const tbody = clear(document.querySelector("#tbl-diemhen tbody"));
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const badge = p.dat_qcvn_01_2021
      ? `<span class="badge ok">${t("badge_dat")}</span>`
      : `<span class="badge warn">${t("badge_kiemtra")}</span>`;
    const row = el(`
      <tr>
        <td>${trLabel(p.tuyen)}</td>
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
  const box = clear("compare-table");
  box.appendChild(
    el(`
    <div class="result-card">
      <b>${t("compare_hientrang")}</b>
      <div class="result-row stack"><span>${t("compare_xedo")}</span><span>${bi(c.hien_trang, "thoi_gian_xe_do_1_diem")}</span></div>
      <div class="result-row stack"><span>${t("compare_danhgia")}</span><span>${bi(c.hien_trang, "danh_gia")}</span></div>
    </div>
    <div class="result-card better">
      <b>${t("compare_dexuat")}</b>
      <div class="result-row"><span>${t("compare_xedo")}</span><b>${c.de_xuat.thoi_gian_xe_do_1_diem_phut} ${t("unit_phut_full")}</b></div>
      <div class="result-row"><span>${t("compare_tongthoigian")}</span><b>${c.de_xuat.tong_thoi_gian_hoan_thanh_3_diem_phut} ${t("unit_phut_full")}</b></div>
      <div class="result-row stack"><span>${t("compare_danhgia")}</span><span>${bi(c.de_xuat, "danh_gia")}</span></div>
    </div>
  `)
  );
}

// ---------------- Tối ưu hóa / Optimization ----------------
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

function populateTripSelect(groups) {
  const select = document.getElementById("select-trip");
  const prevValue = select.value;
  clear(select);
  Object.entries(groups).forEach(([tuyen, stops]) => {
    if (stops.length < 2) return;
    const opt = document.createElement("option");
    opt.value = tuyen;
    opt.textContent = `${trLabel(tuyen)} (${stops.length} ${t("trip_options_suffix")})`;
    select.appendChild(opt);
  });
  if ([...select.options].some((o) => o.value === prevValue)) select.value = prevValue;
}

function initOptimizeControls(groups) {
  const speedSlider = document.getElementById("speed-slider");
  const speedVal = document.getElementById("speed-val");
  speedSlider.addEventListener("input", () => (speedVal.textContent = speedSlider.value));

  document.getElementById("btn-optimize").addEventListener("click", () => {
    const tuyen = document.getElementById("select-trip").value;
    const stops = DATA.tripGroups[tuyen];
    if (!stops || stops.length < 2) return;
    const speed = parseFloat(speedSlider.value);
    const result = RouteOptimizer.optimize(stops, 0, speed);
    renderOptimizeResult(result, tuyen);
  });
}

function renderOptimizeResult(result, tuyen) {
  optimizeLayerGroup.clearLayers();

  L.polyline(result.baseline.coords, { color: "#999", weight: 4, dashArray: "6,6" })
    .bindTooltip(t("optimize_tooltip_baseline"))
    .addTo(optimizeLayerGroup);
  L.polyline(result.optimized.coords, { color: "#1c9457", weight: 5 })
    .bindTooltip(t("optimize_tooltip_optimized"))
    .addTo(optimizeLayerGroup);

  if (result.baseline.coords.length) {
    map.fitBounds(L.polyline(result.baseline.coords.concat(result.optimized.coords)).getBounds(), { maxZoom: 16 });
  }

  const box = clear("optimize-result");
  const better = result.savingsPct > 0.5;
  box.appendChild(
    el(`
    <div class="result-card">
      <b>${trLabel(tuyen)} — ${t("optimize_baseline_title")}</b>
      <div class="result-row stack"><span>${t("optimize_thutu")}</span><span>${result.baseline.names.join(" → ")}</span></div>
      <div class="result-row"><span>${t("optimize_quangduong")}</span><b>${result.baseline.distanceKm.toFixed(2)} ${t("unit_km")}</b></div>
      <div class="result-row"><span>${t("optimize_thoigian")}</span><b>${result.baseline.timeMin.toFixed(0)} ${t("unit_phut_full")}</b></div>
    </div>
    <div class="result-card ${better ? "better" : ""}">
      <b>${t("optimize_optimized_title")}</b>
      <div class="result-row stack"><span>${t("optimize_thutu")}</span><span>${result.optimized.names.join(" → ")}</span></div>
      <div class="result-row"><span>${t("optimize_quangduong")}</span><b>${result.optimized.distanceKm.toFixed(2)} ${t("unit_km")}</b></div>
      <div class="result-row"><span>${t("optimize_thoigian")}</span><b>${result.optimized.timeMin.toFixed(0)} ${t("unit_phut_full")}</b></div>
      <div class="result-row"><span>${t("optimize_tietkiem")}</span><b>${result.savingsPct.toFixed(1)}%</b></div>
      <div class="result-row"><span>${t("optimize_nhienlieu")}</span><b>${result.fuelSavedL.toFixed(2)} ${t("unit_lit")}</b></div>
      <div class="result-row"><span>${t("optimize_co2")}</span><b>${result.co2SavedKg.toFixed(2)} ${t("unit_kg")}</b></div>
    </div>
  `)
  );
}

function renderBenchmark(stats) {
  const b = stats.doi_chieu_y_van;
  if (!b) return;
  const list = clear("benchmark-list");
  b.case_studies.forEach((c) => {
    list.appendChild(
      el(`
      <div class="result-row stack">
        <span>${c.noi}</span>
        <span>${bi(c, "tiet_kiem")} <span class="muted">(${c.nguon})</span></span>
      </div>
    `)
    );
  });
  document.getElementById("benchmark-note").textContent = bi(b, "nhan_dinh");
}

// ---------------- Quy chuẩn / Compliance ----------------
function renderQuyChuan(stats, meetingGeojson) {
  const q = stats.quy_chuan;
  const box = clear("qcvn-box");
  box.appendChild(
    el(`
    <div class="result-card">
      <div class="result-row"><span>${t("qcvn_nguon")}</span><b>${q.nguon}</b></div>
      <div class="result-row"><span>${t("qcvn_thoigianca")}</span><b>${q.tram_trung_chuyen_khong_co_dinh.thoi_gian_van_hanh_toi_da_phut_ca} ${t("unit_phut_full")}</b></div>
      <div class="result-row"><span>${t("qcvn_thoigianngay")}</span><b>${q.tram_trung_chuyen_khong_co_dinh.thoi_gian_van_hanh_toi_da_h_ngay} ${t("unit_gio")}</b></div>
      <div class="result-row"><span>${t("qcvn_khoangcach")}</span><b>${q.tram_trung_chuyen_khong_co_dinh.khoang_cach_atmt_toi_thieu_m} ${t("unit_m")}</b></div>
      <div class="result-row"><span>${t("qcvn_bankinh")}</span><b>${q.ban_kinh_phuc_vu_de_xuat_m} ${t("unit_m")}</b></div>
    </div>
    <p class="muted">${bi(q, "ghi_chu")}</p>
  `)
  );

  const luatList = clear("luat-bvmt-list");
  (q.luat_bvmt_2020 || []).forEach((d) => {
    luatList.appendChild(el(`<div class="result-card"><b>${d.dieu}</b><p class="muted" style="margin:4px 0 0">${bi(d, "noi_dung")}</p></div>`));
  });

  const list = clear("qcvn-list");
  let passCount = 0;
  meetingGeojson.features.forEach((f) => {
    const p = f.properties;
    if (p.dat_qcvn_01_2021) passCount++;
    const badgeClass = p.dat_qcvn_01_2021 ? "ok" : "warn";
    list.appendChild(
      el(`
      <div class="result-row">
        <span>${p.ten} <span class="muted">(${trLabel(p.tuyen)})</span></span>
        <span class="badge ${badgeClass}">${p.khoang_cach_cong_trinh_gan_nhat_m ?? "n/a"} m</span>
      </div>
    `)
    );
  });
  list.insertAdjacentElement(
    "afterbegin",
    el(`<p class="muted"><b>${passCount}/${meetingGeojson.features.length}</b> ${t("qcvn_summary_suffix")}</p>`)
  );
}

// ---------------- Language switching ----------------
function applyStaticI18n() {
  document.documentElement.lang = currentLang === "en" ? "en" : "vi";
  document.title = t("app_title");
  document.querySelectorAll("[data-i18n]").forEach((elm) => {
    elm.textContent = t(elm.dataset.i18n);
  });
  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) langBtn.textContent = t("lang_switch_label");
}

function renderAll() {
  applyStaticI18n();

  addBoundaryLayer(DATA.boundary);
  addRoadsLayer(DATA.roads);
  addRoutesLayer(DATA.routes);
  addMeetingPointsLayer(DATA.meeting);
  addFixedPointsLayer(DATA.fixed);
  addCollectionPointsLayer(DATA.collection);
  buildLegend();

  renderTongQuan(DATA.stats);
  renderRouteList(DATA.routes);
  renderMeetingTable(DATA.meeting);
  renderCompareTable(DATA.stats);
  renderQuyChuan(DATA.stats, DATA.meeting);
  renderBenchmark(DATA.stats);
  populateTripSelect(DATA.tripGroups);
}

function setLanguage(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem("webgis_lang", lang);
  renderAll();
}

function initLanguageToggle() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;
  btn.textContent = t("lang_switch_label");
  btn.addEventListener("click", () => setLanguage(currentLang === "en" ? "vi" : "en"));
}

// ---------------- Boot ----------------
async function main() {
  initMap();
  initTabs();
  initLanguageToggle();
  initGoogleBasemaps();

  const [boundary, roads, routes, meeting, fixed, collection, stats] = await Promise.all([
    fetchJSON("data/boundary.geojson"),
    fetchJSON("data/roads.geojson"),
    fetchJSON("data/routes.geojson"),
    fetchJSON("data/meeting_points.geojson"),
    fetchJSON("data/fixed_points.geojson"),
    fetchJSON("data/collection_points.geojson"),
    fetchJSON("data/stats.json"),
  ]);
  Object.assign(DATA, { boundary, roads, routes, meeting, fixed, collection, stats });
  DATA.tripGroups = groupMeetingPointsByTrip(meeting);

  const boundaryLayer = addBoundaryLayer(boundary);
  map.fitBounds(boundaryLayer.getBounds(), { padding: [20, 20] });
  addRoadsLayer(roads);
  addRoutesLayer(routes);
  addMeetingPointsLayer(meeting);
  addFixedPointsLayer(fixed);
  addCollectionPointsLayer(collection);
  buildLegend();

  applyStaticI18n();
  renderTongQuan(stats);
  renderRouteList(routes);
  renderMeetingTable(meeting);
  renderCompareTable(stats);
  renderQuyChuan(stats, meeting);
  renderBenchmark(stats);

  await RoadGraph.load("data/graph.json");
  populateTripSelect(DATA.tripGroups);
  initOptimizeControls(DATA.tripGroups);
}

main().catch((err) => {
  console.error(err);
  alert(t("err_load") + ": " + err.message + "\n" + t("err_load_hint"));
});
