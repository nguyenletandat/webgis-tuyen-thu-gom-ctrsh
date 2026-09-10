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
  "Cơ sở tôn giáo": "#a0522d",
  "Cơ sở sản xuất - dịch vụ / Kho bãi": "#607d8b",
  "Khu dân cư": "#c2985b",
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
  "Cơ sở tôn giáo": "🛐",
  "Cơ sở sản xuất - dịch vụ / Kho bãi": "⚙️",
  "Khu dân cư": "🏘️",
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
    style: { color: "#0b3d2e", weight: 2.5, dashArray: "1,7", lineCap: "round", fill: true, fillOpacity: 0.02 },
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
  const invisible = L.divIcon({ className: "", html: "", iconSize: [0, 0] });
  L.geoJSON(geojson, {
    style: { color: "#9aa89f", weight: 1, opacity: 0.55 },
    // degenerate Point slivers can appear inside road features after boundary clipping
    // (a road segment that only grazes the boundary edge collapses to a point) — they
    // carry no road geometry, so never let them fall back to Leaflet's default pin icon.
    filter: (f) => f.geometry.type !== "Point" && f.geometry.type !== "MultiPoint",
    pointToLayer: (f, latlng) => L.marker(latlng, { icon: invisible, interactive: false }),
  }).addTo(roadsLayerGroup);
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
      ${t("popup_khunggio")}: ${formatGio(p.gio)}<br/>
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
  boundary: `<svg width="22" height="14" viewBox="0 0 22 14"><line x1="1" y1="7" x2="21" y2="7" stroke="#0b3d2e" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.5,4.5"/></svg>`,
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
      <label class="legend-row"><input type="checkbox" id="lyr-meeting" ${chk("lyr-meeting", true)}/> ${LEGEND_ICONS.meeting} <span>${t("lyr_meeting")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-fixed" ${chk("lyr-fixed", true)}/> ${LEGEND_ICONS.fixed} <span>${t("lyr_fixed")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-collection" ${chk("lyr-collection", false)}/> ${LEGEND_ICONS.collection} <span>${t("lyr_collection")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-routes" ${chk("lyr-routes", true)}/> ${LEGEND_ICONS.routes} <span>${t("lyr_routes")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-roads" ${chk("lyr-roads", true)}/> ${LEGEND_ICONS.roads} <span>${t("lyr_roads")}</span></label>
      <label class="legend-row"><input type="checkbox" id="lyr-boundary" ${chk("lyr-boundary", true)}/> ${LEGEND_ICONS.boundary} <span>${t("lyr_boundary")}</span></label>
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
      const wasToiuu = document.querySelector(".tab-btn.active")?.dataset.tab === "toiuu";
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(`panel-${btn.dataset.tab}`).classList.remove("hidden");
      // leaving the Optimization tab: undo its heavy dimming of the other 12 routes
      if (wasToiuu && btn.dataset.tab !== "toiuu") resetRouteEmphasis();
      // entering the Routes tab: re-apply whatever the timeline slider currently says
      if (btn.dataset.tab === "tuyen") applyTimelineFilter();
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
let highlightedRouteLayer = null;
let highlightHaloLayer = null;
function highlightRoute(layer) {
  if (highlightedRouteLayer && highlightedRouteLayer !== layer) {
    highlightedRouteLayer.setStyle({ weight: 4, opacity: 0.85 });
  }
  if (highlightHaloLayer) {
    routesLayerGroup.removeLayer(highlightHaloLayer);
    highlightHaloLayer = null;
  }
  // make sure the routes layer itself is switched on, then bring this one to the very front
  if (!map.hasLayer(routesLayerGroup)) {
    map.addLayer(routesLayerGroup);
    const box = document.getElementById("lyr-routes");
    if (box) box.checked = true;
  }
  // thin white halo drawn under the selected line so it reads clearly against the other
  // routes, while its own directional flow animation still plays on top, uninterrupted
  const sub = layer.getLayers && layer.getLayers()[0];
  if (sub && sub.getLatLngs) {
    highlightHaloLayer = L.polyline(sub.getLatLngs(), {
      color: "#ffffff",
      weight: 8,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(routesLayerGroup);
    highlightHaloLayer.bringToBack();
  }
  layer.bringToFront();
  layer.setStyle({ weight: 7, opacity: 1 });
  highlightedRouteLayer = layer;
}

// Fades every route except one (used by the Optimization tab so the single route being
// checked stands out clearly instead of competing visually with the other 12 on the map).
function dimAllRoutesExcept(exceptKey) {
  Object.entries(DATA.routeLayers || {}).forEach(([key, layer]) => {
    if (key !== exceptKey) layer.setStyle({ opacity: 0.1, weight: 2 });
  });
}

// Restores every route to its normal look (called when leaving the Optimization tab).
function resetRouteEmphasis() {
  if (highlightHaloLayer) {
    routesLayerGroup.removeLayer(highlightHaloLayer);
    highlightHaloLayer = null;
  }
  highlightedRouteLayer = null;
  Object.values(DATA.routeLayers || {}).forEach((layer) => layer.setStyle({ opacity: 0.85, weight: 4 }));
}

// ---------------- Dòng thời gian / Timeline ----------------
// Domain: minutes since 17:00 (the earliest any trip starts) up to 04:00 the next day (660 min),
// so overnight windows like "22:30–03:00" plot as one continuous span with no wraparound.
const TIMELINE_DOMAIN_MIN = 660;
function minutesSince17(h, m) {
  return (((h - 17 + 24) % 24) * 60) + m;
}
function parseGioWindow(gio) {
  const m = /^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/.exec((gio || "").trim());
  if (!m) return null;
  const start = minutesSince17(+m[1], +m[2]);
  let end = minutesSince17(+m[3], +m[4]);
  if (end <= start) end += 24 * 60; // safety net; shouldn't trigger given the 17:00-04:00 domain
  return { start, end };
}
// A trip with no parseable "gio" value (e.g. Xe 7's placeholder "~") isn't a data gap to
// hide -- the source study describes it as running continuously with no fixed time slot.
// Show that in plain words instead of a bare "~", so its always-on timeline behavior (see
// applyTimelineFilter) reads as intentional rather than a glitch.
function formatGio(gio) {
  return parseGioWindow(gio) ? gio : t("gio_lien_tuc");
}
function formatClock(minSince17) {
  const total = (17 * 60 + minSince17) % (24 * 60);
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

let timelineTimer = null;
function renderTimeline(geojson) {
  const gantt = clear("timeline-gantt");
  const axis = el(`<div class="timeline-axis"></div>`);
  for (let hr = 17; hr <= 17 + Math.floor(TIMELINE_DOMAIN_MIN / 60); hr++) {
    const pct = (((hr - 17) * 60) / TIMELINE_DOMAIN_MIN) * 100;
    const label = `${String(hr % 24).padStart(2, "0")}:00`;
    axis.appendChild(el(`<span style="left:${pct}%">${label}</span>`));
  }
  gantt.appendChild(axis);

  DATA.routeWindows = {};
  geojson.features.forEach((f) => {
    const p = f.properties;
    const key = `${p.xe}|${p.chuyen}`;
    const win = parseGioWindow(p.gio);
    DATA.routeWindows[key] = win;
    const label = trLabel(p.xe) + (p.chuyen ? " " + trLabel(p.chuyen) : "");
    const row = el(`<div class="timeline-row"></div>`);
    if (win) {
      const left = Math.max(0, Math.min(100, (win.start / TIMELINE_DOMAIN_MIN) * 100));
      const width = Math.max(0.5, ((Math.min(win.end, TIMELINE_DOMAIN_MIN) - win.start) / TIMELINE_DOMAIN_MIN) * 100);
      row.appendChild(el(`<div class="timeline-bar" style="left:${left}%;width:${width}%;background:${p.mau}"></div>`));
    } else {
      row.appendChild(el(`<div class="timeline-bar unscheduled" style="left:0;width:100%;--route-color:${p.mau}"></div>`));
    }
    row.appendChild(el(`<span class="timeline-row-label">${label}</span>`));
    row.title = `${label} · ${formatGio(p.gio)}`;
    gantt.appendChild(row);
  });
  gantt.appendChild(el(`<div class="timeline-cursor" id="timeline-cursor" style="left:0%"></div>`));

  applyTimelineFilter();
}

function applyTimelineFilter() {
  const slider = document.getElementById("time-slider");
  const cursor = document.getElementById("timeline-cursor");
  if (!slider || !DATA.routeWindows) return;
  const t = +slider.value;
  document.getElementById("time-label").textContent = formatClock(t);
  if (cursor) cursor.style.left = `${(t / TIMELINE_DOMAIN_MIN) * 100}%`;

  Object.entries(DATA.routeLayers || {}).forEach(([key, layer]) => {
    const win = DATA.routeWindows[key];
    // a trip with no parseable schedule (e.g. Xe 7, which the source study reports as running
    // continuously along a main road with no fixed time slot) has an unknown window, not a "not
    // running" one -- fading it out at every position on the slider would misrepresent that.
    // Only trips WITH a known window get dimmed outside it; unscheduled trips stay fully visible.
    const active = win ? t >= win.start && t <= win.end : true;
    layer.setStyle({ opacity: active ? 1 : 0.1, weight: active ? 5 : 3 });
    if (active && layer.bringToFront) layer.bringToFront();
  });
}

function initTimelineControls() {
  const slider = document.getElementById("time-slider");
  slider.addEventListener("input", applyTimelineFilter);

  const playBtn = document.getElementById("timeline-play");
  playBtn.addEventListener("click", () => {
    if (timelineTimer) {
      clearInterval(timelineTimer);
      timelineTimer = null;
      playBtn.classList.remove("playing");
      playBtn.textContent = "▶";
      return;
    }
    playBtn.classList.add("playing");
    playBtn.textContent = "❚❚";
    timelineTimer = setInterval(() => {
      let v = +slider.value + 5;
      if (v > TIMELINE_DOMAIN_MIN) v = 0;
      slider.value = v;
      applyTimelineFilter();
    }, 300);
  });
}

function renderRouteList(geojson) {
  const list = clear("route-list");
  geojson.features.forEach((f) => {
    const p = f.properties;
    const label = trLabel(p.xe) + (p.chuyen ? " – " + trLabel(p.chuyen) : "");
    const item = el(`
      <div class="route-item">
        <div class="row1"><span class="route-swatch" style="background:${p.mau}"></span>${label}</div>
        <div class="meta">${p.khu_vuc} · ${formatGio(p.gio)} · ${p.distance_km} km</div>
        <div class="diem">${p.diem_thu_gom[0] || ""}</div>
      </div>
    `);
    item.addEventListener("click", () => {
      const key = `${p.xe}|${p.chuyen}`;
      const layer = DATA.routeLayers[key];
      if (layer) {
        map.fitBounds(layer.getBounds(), { maxZoom: 16 });
        highlightRoute(layer);
        layer.openPopup();
      }
    });
    list.appendChild(item);
  });
}

// ---------------- Điểm hẹn & lịch trình / Meeting points & schedule ----------------
// Why a meeting point is flagged "Kiểm tra" (fails or can't yet confirm the QCVN
// 01:2021/BXD ≥20m minimum setback from the nearest building).
function qcvnReasonNote(p) {
  if (p.dat_qcvn_01_2021) return "";
  const d = p.khoang_cach_cong_trinh_gan_nhat_m;
  const text = d == null ? t("qcvn_reason_unknown") : t("qcvn_reason_tooclose").replace("{d}", d);
  return `<br/><small class="muted">${text}</small>`;
}

function renderMeetingTable(geojson) {
  const tbody = clear(document.querySelector("#tbl-diemhen tbody"));
  geojson.features.forEach((f) => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const badge = p.dat_qcvn_01_2021
      ? `<span class="badge ok">${t("badge_dat")}</span>`
      : `<span class="badge warn">${t("badge_kiemtra")}</span>${qcvnReasonNote(p)}`;
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

// "Xe 1|Chuyến 1" -> "Xe 1 - Chuyến 1"; "Xe 6|" -> "Xe 6" (single-trip vehicles have no chuyến).
function formatTripKey(key) {
  const [xe, chuyen] = key.split("|");
  return chuyen ? `${xe} - ${chuyen}` : xe;
}

// For each of the 13 trips (routes.geojson is the authoritative list), pick the richest
// available stop-order source: the official meeting-point schedule if it has >=2 points,
// else the GIS-derived waste-generation points along the route if it has >=2, else fall
// back to just the route's own reconstructed geometry (no order to check, e.g. Vehicle 4 -
// Trip 2 and both trips of Vehicle 5 currently have only a single registered point).
function buildUnifiedTripOptions() {
  return (DATA.routes.features || []).map((f) => {
    const p = f.properties;
    const routeKey = `${p.xe}|${p.chuyen || ""}`;
    const label = formatTripKey(routeKey);
    const meetStops = DATA.tripGroups[label];
    const genStops = DATA.routeStopGroups[routeKey];
    if (meetStops && meetStops.length >= 2) return { routeKey, label, kind: "meet", stops: meetStops, count: meetStops.length };
    if (genStops && genStops.length >= 2) return { routeKey, label, kind: "gen", stops: genStops, count: genStops.length };
    return { routeKey, label, kind: "route", stops: null, count: 0, feature: f };
  });
}

// Looks up the pre-built option data for a "trip:<xe>|<chuyen>" select value.
function stopsForSelectValue(value) {
  return (DATA.tripOptions && DATA.tripOptions[value]) || null;
}

function populateTripSelect() {
  const select = document.getElementById("select-trip");
  const prevValue = select.value;
  clear(select);
  DATA.tripOptions = {};
  buildUnifiedTripOptions().forEach((opt) => {
    const value = `trip:${opt.routeKey}`;
    DATA.tripOptions[value] = opt;
    const el2 = document.createElement("option");
    el2.value = value;
    const suffix =
      opt.kind === "meet" ? t("trip_options_suffix") : opt.kind === "gen" ? t("trip_options_suffix_gen") : t("trip_options_suffix_route");
    el2.textContent = opt.kind === "route" ? `${trLabel(opt.label)} (${suffix})` : `${trLabel(opt.label)} (${opt.count} ${suffix})`;
    select.appendChild(el2);
  });
  if ([...select.options].some((o) => o.value === prevValue)) select.value = prevValue;
}

function initOptimizeControls() {
  const speedSlider = document.getElementById("speed-slider");
  const speedVal = document.getElementById("speed-val");
  speedSlider.addEventListener("input", () => (speedVal.textContent = speedSlider.value));

  document.getElementById("btn-optimize").addEventListener("click", () => {
    const value = document.getElementById("select-trip").value;
    const picked = stopsForSelectValue(value);
    if (!picked) return;
    if (picked.kind === "route") {
      // too little point data to order (currently: Vehicle 4 - Trip 2, both trips of
      // Vehicle 5) -- show the trip's own reconstructed/surveyed path directly instead
      renderOptimizeResult(null, picked.label, picked.feature);
    } else {
      const speed = parseFloat(speedSlider.value);
      const result = RouteOptimizer.optimize(picked.stops, 0, speed);
      renderOptimizeResult(result, picked.label);
    }
    // also highlight the matching real route (if any) so it's clear which vehicle this is,
    // and fade the other 12 routes well down so the checked one stands out on the map
    const realLayer = DATA.routeLayers[picked.routeKey];
    if (realLayer) highlightRoute(realLayer);
    dimAllRoutesExcept(picked.routeKey);
  });
}

function renderOptimizeResult(result, tuyen, routeOnlyFeature) {
  optimizeLayerGroup.clearLayers();

  // Only one route is ever physically driven -- the actual/practical visiting order
  // (baseline: along-street position, or scheduled arrival time for meeting points).
  // The optimizer still runs internally (see RouteOptimizer.optimize) purely to check
  // whether a shorter order exists in theory; that check feeds the insight note below,
  // it never gets its own line on the map.
  const isRouteOnly = !!routeOnlyFeature;
  const route = isRouteOnly
    ? {
        coords: routeOnlyFeature.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
        names: routeOnlyFeature.properties.streets || [],
        distanceKm: routeOnlyFeature.properties.distance_km,
        timeMin: null,
      }
    : result.baseline;

  if (route.coords.length > 1) {
    L.polyline(route.coords, {
      color: "#ffffff", weight: 8, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false,
    }).addTo(optimizeLayerGroup);
  }
  L.polyline(route.coords, { color: "#1c9457", weight: 5, className: "route-flow" })
    .bindTooltip(t("optimize_tooltip_route"))
    .addTo(optimizeLayerGroup);

  if (route.coords.length) {
    map.fitBounds(L.polyline(route.coords).getBounds(), { maxZoom: 16 });
  }

  const box = clear("optimize-result");
  box.appendChild(
    el(`
    <div class="result-card">
      <b>${trLabel(tuyen)} — ${t("optimize_result_title")}</b>
      <div class="result-row stack"><span>${isRouteOnly ? t("popup_tuyenduong") : t("optimize_thutu")}</span><span>${route.names.join(" → ")}</span></div>
      <div class="result-row"><span>${t("optimize_quangduong")}</span><b>${route.distanceKm.toFixed(2)} ${t("unit_km")}</b></div>
      ${route.timeMin != null ? `<div class="result-row"><span>${t("optimize_thoigian")}</span><b>${route.timeMin.toFixed(0)} ${t("unit_phut_full")}</b></div>` : ""}
    </div>
  `)
  );

  const foundShorter = !isRouteOnly && result.savingsPct > 0.5;
  const insightText = isRouteOnly ? t("insight_route_only") : foundShorter ? t("insight_improved") : t("insight_already_optimal");
  const insightClass = !isRouteOnly && !foundShorter ? "insight-good" : "insight-neutral";
  box.appendChild(el(`<div class="insight-box ${insightClass}">${insightText}</div>`));
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
  renderTimeline(DATA.routes);
  renderMeetingTable(DATA.meeting);
  renderCompareTable(DATA.stats);
  renderQuyChuan(DATA.stats, DATA.meeting);
  populateTripSelect();
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
  initTimelineControls();

  const [boundary, roads, routes, meeting, fixed, collection, stats, routeStops] = await Promise.all([
    fetchJSON("data/boundary.geojson"),
    fetchJSON("data/roads.geojson"),
    fetchJSON("data/routes.geojson"),
    fetchJSON("data/meeting_points.geojson"),
    fetchJSON("data/fixed_points.geojson"),
    fetchJSON("data/collection_points.geojson"),
    fetchJSON("data/stats.json"),
    fetchJSON("data/route_stops.json"),
  ]);
  Object.assign(DATA, { boundary, roads, routes, meeting, fixed, collection, stats });
  DATA.tripGroups = groupMeetingPointsByTrip(meeting);
  DATA.routeStopGroups = routeStops;

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
  renderTimeline(routes);
  renderMeetingTable(meeting);
  renderCompareTable(stats);
  renderQuyChuan(stats, meeting);

  await RoadGraph.load("data/graph.json");
  populateTripSelect();
  initOptimizeControls();
}

main().catch((err) => {
  console.error(err);
  alert(t("err_load") + ": " + err.message + "\n" + t("err_load_hint"));
});
