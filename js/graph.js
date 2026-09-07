// Client-side road-network graph engine: nearest-node snapping + Dijkstra shortest path.
// Loaded once from data/graph.json ({ nodes: [[lat,lon],...], edges: [[u,v,weight_m],...] }).

const RoadGraph = (() => {
  let nodes = null;      // [[lat, lon], ...]
  let adj = null;        // adjacency list: Map<nodeIdx, Array<[neighborIdx, weight]>>
  let grid = null;       // spatial hash for nearest-node lookup
  const CELL = 0.003;    // ~300m grid cell size in degrees

  function cellKey(lat, lon) {
    return `${Math.floor(lat / CELL)}_${Math.floor(lon / CELL)}`;
  }

  async function load(url = "data/graph.json") {
    const res = await fetch(url);
    const g = await res.json();
    nodes = g.nodes;
    adj = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) adj[i] = [];
    for (const [u, v, w] of g.edges) {
      adj[u].push([v, w]);
      adj[v].push([u, w]);
    }
    grid = new Map();
    for (let i = 0; i < nodes.length; i++) {
      const [lat, lon] = nodes[i];
      const k = cellKey(lat, lon);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    return { nodeCount: nodes.length, edgeCount: g.edges.length };
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dphi = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function nearestNode(lat, lon) {
    let best = -1;
    let bestD = Infinity;
    const cx = Math.floor(lat / CELL);
    const cy = Math.floor(lon / CELL);
    for (let radius = 0; radius <= 6; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const key = `${cx + dx}_${cy + dy}`;
          const bucket = grid.get(key);
          if (!bucket) continue;
          for (const idx of bucket) {
            const [nlat, nlon] = nodes[idx];
            const d = haversine(lat, lon, nlat, nlon);
            if (d < bestD) {
              bestD = d;
              best = idx;
            }
          }
        }
      }
      if (best !== -1 && radius >= 1) break; // found something reasonably close, stop expanding
    }
    return { idx: best, dist: bestD };
  }

  // Binary-heap-free Dijkstra using a simple array-based priority queue (sufficient at ~50k nodes).
  function dijkstra(srcIdx, dstIdx) {
    const dist = new Float64Array(nodes.length).fill(Infinity);
    const prev = new Int32Array(nodes.length).fill(-1);
    const visited = new Uint8Array(nodes.length);
    dist[srcIdx] = 0;
    // simple binary heap
    const heap = [[0, srcIdx]];
    const push = (item) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        while (true) {
          let l = i * 2 + 1, r = i * 2 + 2, smallest = i;
          if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
          if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
          if (smallest === i) break;
          [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
          i = smallest;
        }
      }
      return top;
    };

    while (heap.length) {
      const [d, u] = pop();
      if (visited[u]) continue;
      visited[u] = 1;
      if (u === dstIdx) break;
      const neighbors = adj[u];
      for (let k = 0; k < neighbors.length; k++) {
        const [v, w] = neighbors[k];
        const nd = d + w;
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
          push([nd, v]);
        }
      }
    }
    if (dist[dstIdx] === Infinity) return null;
    const path = [dstIdx];
    let cur = dstIdx;
    while (cur !== srcIdx) {
      cur = prev[cur];
      path.push(cur);
    }
    path.reverse();
    return { distance: dist[dstIdx], path: path.map((i) => nodes[i]) };
  }

  function routeBetween(latA, lonA, latB, lonB) {
    const a = nearestNode(latA, lonA);
    const b = nearestNode(latB, lonB);
    if (a.idx === -1 || b.idx === -1) return null;
    const result = dijkstra(a.idx, b.idx);
    if (!result) return null;
    return { distance: result.distance, coords: result.path };
  }

  return { load, nearestNode, dijkstra, routeBetween, haversine };
})();
