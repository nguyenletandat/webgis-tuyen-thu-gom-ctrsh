# WebGIS Thu gom & Tối ưu hóa Tuyến CTRSH — Phường Thủ Dầu Một

WebGIS tĩnh (HTML/CSS/JS thuần, không cần build tool) trực quan hóa và tối ưu hóa mạng
lưới thu gom chất thải rắn sinh hoạt (CTRSH), dựng từ dữ liệu của khóa luận tốt nghiệp
*"Đề xuất hệ thống thu gom vận chuyển CTRSH tại phường Thủ Dầu Một, TP.HCM"* (Võ Huỳnh
Bảo Hiền, 2026) kết hợp dữ liệu đường/POI thực tế từ OpenStreetMap.

## Chạy thử

Trình duyệt chặn `fetch()` đọc file cục bộ (`file://`) vì lý do CORS, nên **bắt buộc**
chạy qua một local server:

```bash
cd webapp
python -m http.server 8080
# hoặc: npx serve .
```

Sau đó mở `http://localhost:8080` trên trình duyệt (cần Internet để tải nền bản đồ
OpenStreetMap và thư viện Leaflet từ CDN — toàn bộ dữ liệu phân tích/tối ưu hóa vẫn chạy
offline vì đã có sẵn trong thư mục `data/`).

## Cấu trúc

```
webapp/
  index.html          giao diện chính (sidebar 5 tab + bản đồ Leaflet)
  style.css
  js/
    graph.js           đồ thị mạng lưới đường + Dijkstra (client-side, không cần OSRM)
    optimize.js         Nearest-Neighbor + 2-opt cho bài toán tối ưu thứ tự điểm hẹn
    app.js              nạp dữ liệu, dựng bản đồ, xử lý UI
  data/
    boundary.geojson         ranh giới hành chính phường (chính xác)
    roads.geojson             mạng lưới đường (OSM, đã cắt theo khu vực)
    graph.json                đồ thị định tuyến (~51k node / ~53k cạnh)
    routes.geojson            13 chuyến / 8 xe, tái dựng từ tên đường mô tả trong khóa luận
    meeting_points.geojson    13 điểm hẹn đề xuất (Bảng 3.4) + kiểm tra QCVN 01:2021/BXD
    fixed_points.geojson      2 bãi tập kết + 1 bãi đổ rác (tọa độ chính xác từ khóa luận)
    collection_points.geojson 120 điểm phát sinh rác (11 nhóm), từ POI thực tế OSM
    stats.json                số liệu Bảng 1.1/3.1/3.2/3.5 + căn cứ quy chuẩn
```

Toàn bộ pipeline tạo ra các file trong `data/` được ghi lại và có thể chạy lại tại
`../scripts/build_all.py`, `../scripts/build_points.py`, hoặc theo từng bước có giải
thích trong `../Quy_Trinh_Xu_Ly_Du_Lieu.ipynb`.

## Tính năng chính

- **5 tab bên trái:** Tổng quan (số liệu dân số/khối lượng rác), Tuyến thu gom (danh sách
  13 chuyến, bấm để phóng to bản đồ), Điểm hẹn & Lịch trình (Bảng 3.4 + so sánh Bảng 3.5),
  Tối ưu hóa tuyến, Quy chuẩn & tuân thủ (QCVN 01:2021/BXD).
- **Lớp bản đồ có thể bật/tắt** (góc dưới trái): ranh giới hành chính, mạng lưới đường,
  13 tuyến thu gom, điểm hẹn + vùng đệm 300m, bãi tập kết/đổ rác, 11 nhóm điểm phát sinh rác.
- **Công cụ tối ưu hóa (tab "Tối ưu hóa"):** chọn 1 chuyến có dữ liệu điểm hẹn, hệ thống
  tính khoảng cách thực trên mạng lưới đường (Dijkstra) giữa mọi cặp điểm, sau đó chạy
  Nearest-Neighbor + 2-opt để tìm thứ tự ghé ngắn hơn thứ tự đề xuất trong khóa luận —
  hiển thị so sánh trực tiếp trên bản đồ (đường nét đứt = thứ tự gốc, đường liền = sau tối
  ưu) kèm % quãng đường tiết kiệm được.

## Lưu ý về độ chính xác dữ liệu

Khóa luận gốc chỉ mô tả tuyến/điểm hẹn bằng **tên đường và địa danh** (bảng tọa độ CSV gốc
dùng để dựng bản đồ QGIS chỉ còn dưới dạng ảnh chụp trong phụ lục, không trích xuất được).
Toàn bộ vị trí trong WebGIS này được **tái dựng gần đúng** bằng cách khớp tên đường/POI
thực tế trên nền OpenStreetMap:

- Điểm gắn nhãn **"khớp địa danh thực tế"** (trong popup điểm hẹn) — vị trí khớp trực tiếp
  với một địa danh có tên trên OSM (VD: Sân vận động Gò Đậu, Chợ Thủ Dầu Một).
- Điểm gắn nhãn **"ước lượng theo tuyến đường"** — không tìm được địa danh khớp tên, dùng
  trung điểm đoạn đường được mô tả.
- 2 bãi tập kết (Bùi Quốc Khánh, Thích Quảng Đức) và bãi đổ rác Chánh Phú Hòa dùng **tọa độ
  chính xác** trích trực tiếp từ khóa luận (Bảng 3.3).

Vì vậy, các tuyến/điểm hẹn nên được xem là **bản dựng lại tham khảo** phục vụ minh họa và
thử nghiệm thuật toán tối ưu hóa, không phải bản đồ khảo sát GPS chính xác tuyệt đối.
