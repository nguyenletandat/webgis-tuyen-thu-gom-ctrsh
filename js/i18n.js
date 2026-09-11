// Lightweight i18n: dictionary + helpers. Proper nouns (street/place/route names) are
// intentionally NOT translated — only UI chrome and narrative/analysis text switch language.

const I18N = {
  vi: {
    app_title: "WebGIS Tối ưu hóa Tuyến Thu gom CTRSH — Phường Thủ Dầu Một",
    header_title: "WebGIS Thu gom & Tối ưu hóa Tuyến CTRSH",
    header_subtitle: "Phường Thủ Dầu Một, Thành phố Hồ Chí Minh",
    header_credit: "Nguyễn Lê Tấn Đạt, Bùi Phạm Phương Thanh · Viện Công nghệ Xanh và Bền vững",

    tab_tongquan: "Tổng quan",
    tab_tuyen: "Tuyến thu gom",
    tab_diemhen: "Điểm hẹn",
    tab_toiuu: "Tối ưu hóa",
    tab_quychuan: "Quy chuẩn",

    tongquan_h2: "Tổng quan khu vực",
    tongquan_h3_khuvuc: "Hộ dân & khối lượng rác theo khu vực",
    tongquan_h3_phatsinh: "Chỉ tiêu phát sinh rác (kg/người/ngày)",
    tongquan_h3_donvi: "Đơn vị thu gom",
    tongquan_footnote: "Ranh giới hành chính lấy từ dữ liệu OSM (OpenStreetMap relation 8448188, mã xã 25747), diện tích tính được 15,57 km² — khớp sai số dưới 1% với số liệu chính thức 15,682 km² (bộ 34 tỉnh/thành) nên được dùng làm ranh giới chuẩn để cắt toàn bộ lớp đường/tuyến/điểm trong phân tích này. Lớp đường/POI lấy từ OpenStreetMap.",

    stat_ho_dan: "Tổng hộ dân",
    stat_nhan_khau: "Tổng nhân khẩu",
    stat_dien_tich: "Diện tích tự nhiên",
    stat_khoi_luong: "Khối lượng CTRSH thu gom",
    stat_mang_luoi: "Mạng lưới vận chuyển",
    stat_diem_hen: "Điểm hẹn đề xuất",
    unit_ton_ngay: "tấn/ngày",
    unit_ho: "hộ",
    unit_kg_nguoi_ngay: "kg/người/ngày",
    fleet_value: "8 xe / 13 chuyến",
    meeting_value: "13 điểm",
    gen_khoaluan: "Nghiên cứu này (Thủ Dầu Một)",
    gen_tphcm: "Đo thực tế tại TP.HCM (tham khảo)",
    gen_giaotrinh: "Giáo trình Trần Thị Mỹ Diệu (2010)",

    tuyen_h2: "13 chuyến / 8 xe ép rác",
    timeline_h3: "Dòng thời gian hoạt động",
    timeline_note: "Kéo thanh trượt (hoặc bấm ▶) để xem những xe nào đang hoạt động tại một thời điểm bất kỳ trong ca làm việc.",

    diemhen_h2: "Lịch trình điểm hẹn (đề xuất)",
    diemhen_note: "Định mức dừng cố định: 15 phút/điểm (trong giới hạn ≤ 45 phút/ca theo QCVN 01:2021/BXD).",
    th_tuyen: "Tuyến",
    th_diemhen: "Điểm hẹn",
    th_den: "Đến",
    th_roi: "Rời",
    th_qcvn: "QCVN",
    diemhen_h3_sosanh: "So sánh hiệu quả vận hành (Bảng 3.5, trích Xe 1 - Chuyến 1)",
    badge_dat: "Đạt",
    badge_kiemtra: "Kiểm tra",
    qcvn_reason_unknown: "Chưa đo được khoảng cách tới công trình gần nhất",
    qcvn_reason_tooclose: "Cách công trình gần nhất {d} m — chưa đạt mức tối thiểu 20 m theo QCVN 01:2021/BXD",

    toiuu_h2: "Lộ trình ghé điểm & kiểm chứng tối ưu",
    toiuu_note: "Thứ tự ghé điểm dưới đây là thứ tự thực tế xe phải theo — dọc một con đường thì phải đi qua các điểm theo đúng thứ tự chúng nằm trên đường, còn ở điểm hẹn thì phải theo đúng giờ hẹn đã thống nhất với xe thô sơ. Công cụ chạy thêm Dijkstra trên mạng lưới đường thật + Nearest-Neighbor/2-opt chỉ để kiểm chứng xem thứ tự này đã ngắn nhất về mặt không gian hay chưa.",
    label_chontuyen: "Chọn chuyến (13 chuyến):",
    label_tocdo: "Tốc độ trung bình giả định (km/h):",
    btn_toiuu: "🔍 Kiểm tra lộ trình",
    trip_options_suffix: "điểm hẹn",
    trip_options_suffix_gen: "điểm phát sinh rác",
    trip_options_suffix_route: "theo tuyến đường thực tế",
    optimize_result_title: "Lộ trình ghé điểm (thứ tự thực tế)",
    optimize_legend_full: "Tuyến thu gom đầy đủ đang chọn (toàn bộ điểm GPS đã khảo sát)",
    optimize_legend_checked: "Lộ trình nối các điểm dừng — thứ tự đang được kiểm tra",
    insight_improved: "ℹ️ Thuật toán tìm được một thứ tự khác ngắn hơn về mặt lý thuyết (khoảng cách hình học thuần túy), nhưng không thể áp dụng trực tiếp: thứ tự hiển thị ở trên là thứ tự xe bắt buộc phải theo, do bị ràng buộc bởi trình tự con đường hoặc giờ hẹn đã thống nhất với xe thô sơ.",
    insight_already_optimal: "✓ Đã kiểm chứng: thứ tự thực tế ở trên cũng chính là thứ tự ngắn nhất về mặt không gian — không có cách sắp xếp lại nào rút ngắn thêm quãng đường.",
    insight_route_only: "ℹ️ Chuyến này chỉ ghi nhận được 1 điểm phát sinh rác (không đủ để xếp thứ tự), nên hiển thị trực tiếp theo tuyến đường đã khảo sát/tái dựng thay vì danh sách điểm dừng.",

    quychuan_h2: "Căn cứ quy chuẩn",
    quychuan_h3_luat: "Luật Bảo vệ môi trường 2020 (72/2020/QH14)",
    quychuan_h3_kiemtra: "Kiểm tra 13 điểm hẹn",

    legend_basemap_title: "Nền bản đồ",
    basemap_osm: "Bản đồ đường",
    basemap_satellite: "Vệ tinh",
    basemap_light: "Sáng (Light)",
    basemap_dark: "Tối (Dark)",
    legend_routes_title: "Các tuyến xe",
    legend_title: "Lớp bản đồ",
    lyr_boundary: "Ranh giới hành chính (chính xác)",
    lyr_landfill: "Bãi đổ rác Chánh Phú Hòa + tuyến vận chuyển",
    lyr_oldwards: "Ranh giới hành chính cũ (Phú Cường, Chánh Nghĩa, Phú Thọ)",
    landfill_name: "Bãi rác Chánh Phú Hòa",
    lyr_roads: "Mạng lưới đường (OSM)",
    lyr_routes: "13 tuyến thu gom",
    lyr_meeting: "Điểm hẹn + vùng đệm 300m",
    lyr_fixed: "Bãi tập kết / đổ rác",
    lyr_collection: "Điểm phát sinh rác (10 nhóm)",

    // Route popup
    popup_khuvuc: "Khu vực",
    popup_khunggio: "Khung giờ",
    popup_quangduong: "Quãng đường (mạng lưới thực)",
    popup_tuyenduong: "Tuyến đường",
    popup_diemthugom: "Điểm thu gom trọng yếu",
    // Boundary popup
    popup_phuong: "Phường",
    popup_dientich: "Diện tích",
    popup_danso: "Dân số",
    popup_matdo: "Mật độ",
    unit_nguoi: "người",
    unit_nguoi_km2: "người/km²",
    // Meeting point popup
    popup_tuyen: "Tuyến",
    popup_gioden: "Giờ đến",
    popup_dung: "Dừng",
    popup_gioroi: "Giờ rời",
    popup_phut: "phút",
    popup_bankinh: "Bán kính phục vụ",
    popup_khoangcach_ct: "Khoảng cách công trình gần nhất",
    popup_dattqcvn: "✅ Đạt",
    popup_chuadat_qcvn: "⚠️ Cần kiểm tra",
    popup_dotincay: "Độ tin cậy vị trí",
    dotincay_chinhxac: "khớp địa danh thực tế",
    dotincay_uocluong: "ước lượng theo tuyến đường",
    // Fixed points popup
    popup_ghichu_baidoRac: "~23km về phía Bắc khu vực nghiên cứu",
    // Collection points popup
    popup_nhom: "Nhóm",

    optimize_thutu: "Thứ tự",
    optimize_quangduong: "Quãng đường",
    optimize_thoigian: "Thời gian ước tính",
    optimize_tooltip_route: "Lộ trình ghé điểm (thứ tự thực tế)",
    unit_phut_full: "phút",
    unit_km: "km",
    unit_lit: "lít",
    unit_kg: "kg",

    compare_hientrang: "Hiện trạng",
    compare_dexuat: "Đề xuất (điểm hẹn 15 phút)",
    compare_xedo: "Thời gian xe đỗ / điểm",
    compare_danhgia: "Đánh giá",
    compare_tongthoigian: "Tổng thời gian hoàn thành 3 điểm",

    qcvn_nguon: "Nguồn",
    qcvn_thoigianca: "Thời gian vận hành tối đa / ca",
    qcvn_thoigianngay: "Thời gian vận hành tối đa / ngày",
    qcvn_khoangcach: "Khoảng cách ATMT tối thiểu",
    qcvn_bankinh: "Bán kính phục vụ áp dụng",
    qcvn_summary_suffix: "điểm hẹn đạt khoảng cách ATMT ≥ 20m.",
    unit_gio: "giờ",
    unit_m: "m",
    gio_lien_tuc: "Chạy liên tục, không có khung giờ cố định",

    err_load: "Lỗi tải dữ liệu",
    err_load_hint: "Hãy chạy web app qua một local server (xem README).",

    lang_switch_label: "EN",
  },

  en: {
    app_title: "WebGIS for Optimizing MSW Collection Routes — Thu Dau Mot Ward",
    header_title: "WebGIS Waste Collection & Route Optimization",
    header_subtitle: "Thu Dau Mot Ward, Ho Chi Minh City",
    header_credit: "Nguyen Le Tan Dat, Bui Pham Phuong Thanh · Institute of Green Technology and Sustainability",

    tab_tongquan: "Overview",
    tab_tuyen: "Routes",
    tab_diemhen: "Meeting Points",
    tab_toiuu: "Optimization",
    tab_quychuan: "Compliance",

    tongquan_h2: "Area Overview",
    tongquan_h3_khuvuc: "Households & Waste Volume by Sub-area",
    tongquan_h3_phatsinh: "Waste Generation Rate (kg/person/day)",
    tongquan_h3_donvi: "Collection Contractor",
    tongquan_footnote: "The administrative boundary is sourced from OpenStreetMap (relation 8448188, ward code 25747), with a computed area of 15.57 km² — within 1% of the official 15.682 km² figure (34-province dataset) — and is used as the authoritative boundary for clipping every road/route/point layer in this analysis. Road/POI layers come from OpenStreetMap.",

    stat_ho_dan: "Total Households",
    stat_nhan_khau: "Total Population",
    stat_dien_tich: "Natural Area",
    stat_khoi_luong: "MSW Collected",
    stat_mang_luoi: "Collection Fleet",
    stat_diem_hen: "Proposed Meeting Points",
    unit_ton_ngay: "t/day",
    unit_ho: "households",
    unit_kg_nguoi_ngay: "kg/person/day",
    fleet_value: "8 vehicles / 13 trips",
    meeting_value: "13 points",
    gen_khoaluan: "This study (Thu Dau Mot)",
    gen_tphcm: "Field-measured in HCMC (reference)",
    gen_giaotrinh: "Tran Thi My Dieu textbook (2010)",

    tuyen_h2: "13 Trips / 8 Compactor Trucks",
    timeline_h3: "Operating Timeline",
    timeline_note: "Drag the slider (or press ▶) to see which vehicles are active at any point during the shift.",

    diemhen_h2: "Proposed Meeting-Point Schedule",
    diemhen_note: "Fixed dwell time: 15 min/point (within the ≤45 min/shift limit of QCVN 01:2021/BXD).",
    th_tuyen: "Trip",
    th_diemhen: "Meeting Point",
    th_den: "Arrival",
    th_roi: "Departure",
    th_qcvn: "QCVN",
    diemhen_h3_sosanh: "Operational Efficiency Comparison (Table 3.5, Vehicle 1 – Trip 1 excerpt)",
    badge_dat: "Pass",
    badge_kiemtra: "Review",
    qcvn_reason_unknown: "Distance to the nearest building has not been measured yet",
    qcvn_reason_tooclose: "{d} m from the nearest building — below the 20 m minimum required by QCVN 01:2021/BXD",

    toiuu_h2: "Stop-Visiting Route & Optimality Check",
    toiuu_note: "The visiting order below is the order the vehicle actually has to follow -- along a street it necessarily passes stops in the order they lie on that street, and at meeting points it must keep the arrival time agreed with the handcart crews. The tool additionally runs Dijkstra on the real road network plus Nearest-Neighbor/2-opt purely to verify whether this order is already the shortest one possible.",
    label_chontuyen: "Select a trip (13 trips):",
    label_tocdo: "Assumed average speed (km/h):",
    btn_toiuu: "🔍 Check Route",
    trip_options_suffix: "meeting points",
    trip_options_suffix_gen: "waste-generation points",
    trip_options_suffix_route: "actual route only",
    optimize_result_title: "Stop-visiting route (actual order)",
    optimize_legend_full: "Selected full collection route (all surveyed GPS points)",
    optimize_legend_checked: "Path connecting the stops — order being checked",
    insight_improved: "ℹ️ The algorithm found a different order that is shorter in theory (pure geometric distance), but it cannot be applied directly: the order shown above is the one the vehicle must follow, constrained by street sequence or by the arrival times agreed with handcart crews.",
    insight_already_optimal: "✓ Verified: the actual order shown above is also the spatially shortest possible one -- no resequencing would shorten the distance further.",
    insight_route_only: "ℹ️ Only one waste-generation point was registered for this trip (not enough to order), so it's shown directly along the route as reconstructed/surveyed instead of a stop list.",

    quychuan_h2: "Regulatory Basis",
    quychuan_h3_luat: "2020 Law on Environmental Protection (No. 72/2020/QH14)",
    quychuan_h3_kiemtra: "Compliance Check for the 13 Meeting Points",

    legend_basemap_title: "Basemap",
    basemap_osm: "Street map",
    basemap_satellite: "Satellite",
    basemap_light: "Light",
    basemap_dark: "Dark",
    legend_routes_title: "Vehicle Routes",
    legend_title: "Map Layers",
    lyr_boundary: "Administrative boundary (accurate)",
    lyr_landfill: "Chánh Phú Hòa landfill + transport routes",
    lyr_oldwards: "Former ward boundaries (Phú Cường, Chánh Nghĩa, Phú Thọ)",
    landfill_name: "Chánh Phú Hòa Landfill",
    lyr_roads: "Road network (OSM)",
    lyr_routes: "13 collection routes",
    lyr_meeting: "Meeting points + 300m buffer",
    lyr_fixed: "Transfer / disposal stations",
    lyr_collection: "Waste-generation points (10 groups)",

    popup_khuvuc: "Sub-area",
    popup_khunggio: "Operating window",
    popup_quangduong: "Distance (real road network)",
    popup_tuyenduong: "Streets",
    popup_diemthugom: "Key collection points",
    popup_phuong: "Ward",
    popup_dientich: "Area",
    popup_danso: "Population",
    popup_matdo: "Density",
    unit_nguoi: "people",
    unit_nguoi_km2: "people/km²",
    popup_tuyen: "Trip",
    popup_gioden: "Arrival",
    popup_dung: "Dwell",
    popup_gioroi: "Departure",
    popup_phut: "min",
    popup_bankinh: "Service radius",
    popup_khoangcach_ct: "Distance to nearest structure",
    popup_dattqcvn: "✅ Pass",
    popup_chuadat_qcvn: "⚠️ Needs review",
    popup_dotincay: "Position confidence",
    dotincay_chinhxac: "matched to a real landmark",
    dotincay_uocluong: "estimated along the described street",
    popup_ghichu_baidoRac: "~23 km north of the study area",
    popup_nhom: "Category",

    optimize_thutu: "Order",
    optimize_quangduong: "Distance",
    optimize_thoigian: "Estimated time",
    optimize_tooltip_route: "Stop-visiting route (actual order)",
    unit_phut_full: "min",
    unit_km: "km",
    unit_lit: "L",
    unit_kg: "kg",

    compare_hientrang: "Current practice",
    compare_dexuat: "Proposed (15-min meeting point)",
    compare_xedo: "Truck dwell time / point",
    compare_danhgia: "Assessment",
    compare_tongthoigian: "Total time for 3 points",

    qcvn_nguon: "Source",
    qcvn_thoigianca: "Max operating time / shift",
    qcvn_thoigianngay: "Max operating time / day",
    qcvn_khoangcach: "Minimum safety distance",
    qcvn_bankinh: "Applied service radius",
    qcvn_summary_suffix: "meeting points meet the ≥20m safety-distance requirement.",
    unit_gio: "hours",
    unit_m: "m",
    gio_lien_tuc: "Runs continuously; no fixed time slot",

    err_load: "Failed to load data",
    err_load_hint: "Please run the web app via a local server (see README).",

    lang_switch_label: "VI",
  },
};

let currentLang = localStorage.getItem("webgis_lang") || "vi";

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) ?? I18N.vi[key] ?? key;
}

// Translates the "Xe N" / "Chuyến N" structural labels found in data values,
// while leaving everything else (street/place names) untouched.
function trLabel(str) {
  if (!str) return str;
  if (currentLang !== "en") return str;
  return str.replace(/^Xe\b/, "Vehicle").replace(/Chuyến\b/, "Trip");
}

// Waste-generation-point category names (generic categories, not proper nouns) — safe to translate.
const NHOM_EN = {
  "Trường học": "School",
  "Trường học (mầm non)": "School (kindergarten)",
  "Chợ": "Market",
  "Siêu thị": "Supermarket",
  "Thương mại - dịch vụ": "Commercial / services",
  "Khu vực hành chính": "Administrative area",
  "Y tế": "Healthcare",
  "Khu vực công cộng": "Public space",
  "Cơ quan công sở": "Government office",
  "Cơ sở tôn giáo": "Religious site",
  "Cơ sở sản xuất - dịch vụ / Kho bãi": "Production / service / warehouse",
  "Khu dân cư": "Residential area",
};
function trNhom(nhom) {
  return currentLang === "en" ? NHOM_EN[nhom] || nhom : nhom;
}

// Reads a bilingual field from a data object: obj.field_en when in English mode and present,
// otherwise falls back to the Vietnamese obj.field.
function bi(obj, field) {
  if (!obj) return "";
  if (currentLang === "en" && obj[field + "_en"]) return obj[field + "_en"];
  return obj[field];
}
