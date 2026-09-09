// VRPTW-lite optimizer: given an ordered list of stops {lat, lon, name, service_min},
// build a real road-network distance matrix (via RoadGraph Dijkstra) and search for a
// shorter visiting order using Nearest-Neighbor construction + 2-opt local search.
// The start stop is kept fixed (first scheduled meeting point); the path is open (no return).

const RouteOptimizer = (() => {
  function buildDistanceMatrix(stops) {
    const n = stops.length;
    const D = Array.from({ length: n }, () => new Array(n).fill(0));
    const pathCache = {};
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r = RoadGraph.routeBetween(stops[i].lat, stops[i].lon, stops[j].lat, stops[j].lon);
        const d = r ? r.distance : RoadGraph.haversine(stops[i].lat, stops[i].lon, stops[j].lat, stops[j].lon) * 1.3;
        D[i][j] = d;
        D[j][i] = d;
        pathCache[`${i}_${j}`] = r ? r.coords : null;
        pathCache[`${j}_${i}`] = r ? r.coords.slice().reverse() : null;
      }
    }
    return { D, pathCache };
  }

  function routeLength(order, D) {
    let total = 0;
    for (let i = 0; i < order.length - 1; i++) total += D[order[i]][order[i + 1]];
    return total;
  }

  function nearestNeighborOrder(D, start) {
    const n = D.length;
    const visited = new Array(n).fill(false);
    const order = [start];
    visited[start] = true;
    let cur = start;
    for (let step = 1; step < n; step++) {
      let best = -1, bestD = Infinity;
      for (let j = 0; j < n; j++) {
        if (!visited[j] && D[cur][j] < bestD) {
          bestD = D[cur][j];
          best = j;
        }
      }
      order.push(best);
      visited[best] = true;
      cur = best;
    }
    return order;
  }

  // 2-opt for an open path with fixed start (index 0 of `order` never moves).
  function twoOpt(order, D) {
    let improved = true;
    let best = order.slice();
    let bestLen = routeLength(best, D);
    while (improved) {
      improved = false;
      for (let i = 1; i < best.length - 1; i++) {
        for (let k = i + 1; k < best.length; k++) {
          const candidate = best
            .slice(0, i)
            .concat(best.slice(i, k + 1).reverse())
            .concat(best.slice(k + 1));
          const len = routeLength(candidate, D);
          if (len < bestLen - 1e-6) {
            best = candidate;
            bestLen = len;
            improved = true;
          }
        }
      }
    }
    return { order: best, length: bestLen };
  }

  // Xe ép rác chuyên dụng đô thị, chạy-dừng liên tục: giả định tiêu hao nhiên liệu và hệ số
  // phát thải diesel theo tài liệu tham khảo (Sustainability 2024; Cairo VRP fuel model).
  const FUEL_L_PER_KM = 0.4;
  const CO2_KG_PER_L_DIESEL = 2.68;

  function optimize(stops, startIndex = 0, avgSpeedKmh = 15, serviceMinDefault = 15) {
    const { D, pathCache } = buildDistanceMatrix(stops);
    const baselineOrder = stops.map((_, i) => i);
    const baselineLen = routeLength(baselineOrder, D);

    const nnOrder = nearestNeighborOrder(D, startIndex);
    const { order: twoOptOrder, length: twoOptLen } = twoOpt(nnOrder, D);
    // 2-opt only guarantees an improvement over ITS OWN nearest-neighbor starting tour, not
    // over the baseline (the stops' original listed order) -- for short trips with few stops,
    // the greedy NN construction can land in a worse local optimum than the baseline order
    // already is. Never surface a result worse than the baseline: fall back to it instead.
    const optimizedIsBetter = twoOptLen < baselineLen - 1e-6;
    const optOrder = optimizedIsBetter ? twoOptOrder : baselineOrder.slice();
    const optLen = optimizedIsBetter ? twoOptLen : baselineLen;

    const speedMs = (avgSpeedKmh * 1000) / 3600;
    const serviceSec = (order) => order.reduce((s, i) => s + (stops[i].service_min ?? serviceMinDefault) * 60, 0);

    const baselineTimeSec = baselineLen / speedMs + serviceSec(baselineOrder);
    const optTimeSec = optLen / speedMs + serviceSec(optOrder);

    const pathFor = (order) => {
      let coords = [];
      for (let i = 0; i < order.length - 1; i++) {
        const seg = pathCache[`${order[i]}_${order[i + 1]}`];
        if (seg) {
          if (coords.length && seg.length && coords[coords.length - 1][0] === seg[0][0] && coords[coords.length - 1][1] === seg[0][1]) {
            coords = coords.concat(seg.slice(1));
          } else {
            coords = coords.concat(seg);
          }
        } else {
          coords.push([stops[order[i]].lat, stops[order[i]].lon]);
          coords.push([stops[order[i + 1]].lat, stops[order[i + 1]].lon]);
        }
      }
      return coords;
    };

    return {
      baseline: {
        order: baselineOrder,
        names: baselineOrder.map((i) => stops[i].name),
        distanceKm: baselineLen / 1000,
        timeMin: baselineTimeSec / 60,
        coords: pathFor(baselineOrder),
      },
      optimized: {
        order: optOrder,
        names: optOrder.map((i) => stops[i].name),
        distanceKm: optLen / 1000,
        timeMin: optTimeSec / 60,
        coords: pathFor(optOrder),
      },
      savingsPct: baselineLen > 0 ? ((baselineLen - optLen) / baselineLen) * 100 : 0,
      fuelSavedL: ((baselineLen - optLen) / 1000) * FUEL_L_PER_KM,
      co2SavedKg: ((baselineLen - optLen) / 1000) * FUEL_L_PER_KM * CO2_KG_PER_L_DIESEL,
    };
  }

  return { optimize };
})();
