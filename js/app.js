const UNITED_YEARS = [1983, 1985, 1989, 1994, 1999, 2004, 2009];
const AP_YEARS = [2014, 2019, 2024];
const TG_YEARS = [2014, 2018, 2023];
const AP_SET = new Set(AP_YEARS);
const TG_SET = new Set(TG_YEARS);

const state = {
  year: 2024,
  region: "ap",
  era: "split",
  archive: null,
  winners: null,
  tgShapes: null,
  tgCands: {},
  selected: null,
  byAc: new Map(),
  geo: null,
  bounds: null,
  mapReady: false,
  unitedGeo: null,
  unitedBounds: null,
  unitedResults: null,
  cam: { k: 1, x: 0, y: 0 },
  camKey: "",
  dragging: false
};

const $ = (sel) => document.querySelector(sel);

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN");
}
function fmtPct(n) {
  if (n == null || n === "") return "—";
  return (Math.round(Number(n) * 10) / 10).toFixed(1) + "%";
}

function currentScope() {
  if (state.era === "united") return "united";
  return state.region || "ap";
}

function visibleYears() {
  const scope = currentScope();
  if (scope === "tg") return TG_YEARS.slice();
  if (scope === "ap") return AP_YEARS.slice();
  return UNITED_YEARS.slice();
}

function current() {
  if (currentScope() === "tg") {
    return (state.archive.telangana || []).find((e) => e.year === state.year)
      || state.archive.telangana.slice(-1)[0];
  }
  return (state.archive.assembly || []).find((e) => e.year === state.year)
    || state.archive.assembly.slice(-1)[0];
}

function electionForYear(y) {
  if (currentScope() === "tg") {
    return (state.archive.telangana || []).find((e) => e.year === y);
  }
  return (state.archive.assembly || []).find((e) => e.year === y);
}

function scopeLabel() {
  if (currentScope() === "tg") return "Telangana";
  if (currentScope() === "ap") return "Andhra Pradesh";
  return "United Andhra Pradesh";
}

function renderScopes() {
  const scope = currentScope();
  document.querySelectorAll("#scopes [data-scope]").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.scope === scope);
  });
}

function renderYears() {
  $("#years").innerHTML = visibleYears().map((y) => {
    const e = electionForYear(y);
    return `<button type="button" data-year="${y}" class="${y === state.year ? "is-on" : ""}">${y}${e && e.era ? `<small>${e.era}</small>` : ""}</button>`;
  }).join("");
}

function renderBrief(e) {
  if (!e) return;
  const scope = e.scope === "andhra"
    ? "Andhra Pradesh after the 2014 split"
    : e.scope === "telangana"
      ? "Telangana · 119 assembly seats"
      : "United Andhra Pradesh, including the Telangana region";
  const pills = (e.parties || []).map((p) => {
    const meta = partyMeta(p.code);
    return `<span class="pill"><i class="dot" style="background:${meta.color}"></i><b>${p.code}</b> ${p.seats}${p.share != null ? " · " + fmtPct(p.share) : ""}</span>`;
  }).join("");
  const seatTotal = e.seats || (e.parties || []).reduce((n, p) => n + (p.seats || 0), 0) || 1;
  const seatbar = (e.parties || []).map((p) => {
    const meta = partyMeta(p.code);
    const w = Math.max(1.2, ((p.seats || 0) / seatTotal) * 100);
    return `<i style="width:${w}%;background:${meta.color}" title="${p.code} ${p.seats}"></i>`;
  }).join("");
  const people = (e.leaders || []).map((l) =>
    `<div class="person"><b>${l.name}</b><span>${l.party} · ${l.role}</span></div>`
  ).join("");
  const years = visibleYears();
  const ix = years.indexOf(e.year);
  const prev = ix > 0 ? years[ix - 1] : null;
  const next = ix >= 0 && ix < years.length - 1 ? years[ix + 1] : null;
  const prevE = prev ? electionForYear(prev) : null;
  const nextE = next ? electionForYear(next) : null;
  const atSplitForward = currentScope() === "united" && !next;
  const atSplitBack = (currentScope() === "ap" || currentScope() === "tg") && !prev;

  let nextHtml = "";
  if (next) {
    nextHtml = `<button type="button" data-year="${next}" class="go">${next}${nextE && nextE.era ? " · " + nextE.era : ""} →</button>`;
  } else if (atSplitForward) {
    nextHtml = `<div class="split-links">
      <button type="button" data-go-scope="ap" data-go-year="2014" class="go">Andhra Pradesh 2014 →</button>
      <button type="button" data-go-scope="tg" data-go-year="2014" class="go">Telangana 2014 →</button>
    </div>`;
  } else {
    nextHtml = `<span class="done">Latest election in this series.</span>`;
  }

  let prevHtml = "";
  if (prev) {
    prevHtml = `<button type="button" data-year="${prev}">← ${prev}${prevE && prevE.era ? " · " + prevE.era : ""}</button>`;
  } else if (atSplitBack) {
    prevHtml = `<button type="button" data-go-scope="united" data-go-year="2009">← 2009 · United AP</button>`;
  } else {
    prevHtml = "<span></span>";
  }

  $("#brief").innerHTML = `
    <div class="brief-hero">
      <p class="kicker">${e.year} Assembly · ${scope}</p>
      <h2>${e.title}</h2>
      ${e.hook ? `<p class="hook">${e.hook}</p>` : ""}
      <p class="meta">${e.date || ""}${e.cm ? " · Chief Minister " + e.cm : ""}</p>
      <div class="stats">
        <div><span>Seats</span><strong>${e.seats}</strong></div>
        <div><span>Majority</span><strong>${e.majority}</strong></div>
        <div><span>Turnout</span><strong>${fmtPct(e.turnout)}</strong></div>
        <div><span>Largest party</span><strong>${(e.parties && e.parties[0] && e.parties[0].code) || "—"}</strong></div>
      </div>
    </div>
    <div class="brief-tally">
      <div class="seatbar" aria-hidden="true">${seatbar}</div>
      <div class="legend">${pills}</div>
    </div>
    <div class="chapters">
      <section class="chapter">
        <h3>The contest</h3>
        <p>${e.hype || ""}</p>
        <div class="people">${people}</div>
        <p class="meta" style="margin-top:10px"><b>Opposition:</b> ${e.opposition || ""}<br><b>Government formed:</b> ${e.coalition || ""}</p>
      </section>
      <div class="split-why">
        <section class="chapter">
          <h3>Why they won</h3>
          <ul>${(e.whyWon || []).map((x) => `<li>${x}</li>`).join("")}</ul>
        </section>
        <section class="chapter">
          <h3>Why the rest lost</h3>
          <ul>${(e.whyLost || []).map((x) => `<li>${x}</li>`).join("")}</ul>
        </section>
      </div>
      <section class="chapter">
        <h3>After the count</h3>
        <p>${e.aftermath || ""}</p>
        <ul>${(e.changes || []).map((x) => `<li>${x}</li>`).join("")}</ul>
      </section>
    </div>
    ${atSplitForward ? `<p class="split-note">The state was divided on 2 June 2014. Continue in either successor state.</p>` : ""}
    <div class="nextbar">${prevHtml}${nextHtml}</div>`;
}

function partyRows(e) {
  return (e.parties || []).map((p) => {
    const meta = partyMeta(p.code);
    return `<tr>
      <td><span class="pill" style="padding:2px 7px"><i class="dot" style="background:${meta.color}"></i>${p.code}</span></td>
      <td>${meta.name}</td>
      <td class="num">${p.seats}</td>
      <td class="num">${p.share != null ? fmtPct(p.share) : "—"}</td>
    </tr>`;
  }).join("");
}

function renderSnapshot(e) {
  if (!e) return;
  $("#panel-body").innerHTML = `
    <p class="panel-kicker">This election</p>
    <h2>${e.year}</h2>
    <p class="ac-meta">${scopeLabel()} · ${e.seats} seats · majority ${e.majority}</p>
    <p class="hint">Click a constituency on the map for the result. After 2014 the top five candidates are listed.</p>
    <h3>Seat result</h3>
    <table class="party-table">
      <thead><tr><th></th><th>Party</th><th class="num">Seats</th><th class="num">Vote</th></tr></thead>
      <tbody>${partyRows(e)}</tbody>
    </table>
    ${e.cm ? `<p class="hint" style="margin-top:14px">Chief Minister after the count: <b>${e.cm}</b></p>` : ""}`;
}

function geoBounds(geo) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const walk = (node) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number") {
      minX = Math.min(minX, node[0]); maxX = Math.max(maxX, node[0]);
      minY = Math.min(minY, node[1]); maxY = Math.max(maxY, node[1]);
      return;
    }
    node.forEach(walk);
  };
  geo.features.forEach((f) => walk(f.geometry.coordinates));
  return [minX, minY, maxX, maxY];
}
function projector(w, h) {
  const [minX, minY, maxX, maxY] = state.bounds;
  const pad = 24;
  const s = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
  const ox = (w - (maxX - minX) * s) / 2;
  const oy = (h - (maxY - minY) * s) / 2;
  return (lon, lat) => [ox + (lon - minX) * s, oy + (maxY - lat) * s];
}
function ringPath(ring, proj) {
  return ring.map((pt, i) => {
    const [x, y] = proj(pt[0], pt[1]);
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}
function featurePath(feat, proj) {
  const g = feat.geometry;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.map((poly) => poly.map((ring) => ringPath(ring, proj)).join(" ")).join(" ");
}

function apRec(acNo) {
  const ac = state.byAc.get(acNo);
  if (AP_SET.has(state.year) && ac) return ac.results[String(state.year)];
  return state.winners?.ap_old?.[String(state.year)]?.[String(acNo)] || null;
}

function tgRow(slug) {
  const rows = state.winners?.tg?.[String(state.year)] || [];
  return rows.find((r) => r.slug === slug) || null;
}

function unitedRec(feat) {
  const list = state.unitedResults?.[String(state.year)] || [];
  const pr = feat.properties || {};
  if (pr.ac_no != null) {
    const hit = list.find((r) => r.ac_no === pr.ac_no && r.winner);
    if (hit) return hit;
  }
  return list.find((r) => r.slug === pr.slug && r.winner)
    || list.find((r) => r.name === pr.name && r.winner)
    || null;
}

function mapKey() {
  return `${currentScope()}-${state.year}`;
}

function applyCam() {
  const g = document.getElementById("map-stage");
  if (!g) return;
  const { k, x, y } = state.cam;
  g.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
}

function resetCamIfNeeded() {
  const key = mapKey();
  if (state.camKey !== key) {
    state.cam = { k: 1, x: 0, y: 0 };
    state.camKey = key;
  }
}

function mapStage(svg) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", "map-stage");
  svg.appendChild(g);
  return g;
}

function zoomBy(factor, cx, cy) {
  const svg = $("#map");
  if (!svg) return;
  const box = svg.viewBox.baseVal;
  const cX = cx == null ? box.x + box.width / 2 : cx;
  const cY = cy == null ? box.y + box.height / 2 : cy;
  const cam = state.cam;
  const nk = Math.min(10, Math.max(1, cam.k * factor));
  cam.x = cX - ((cX - cam.x) * nk) / cam.k;
  cam.y = cY - ((cY - cam.y) * nk) / cam.k;
  cam.k = nk;
  if (nk === 1) { cam.x = 0; cam.y = 0; }
  applyCam();
}

function svgPoint(evt) {
  const svg = $("#map");
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function drawUnited() {
  const svg = $("#map");
  if (!state.unitedGeo) return;
  const wrap = svg.parentElement;
  const w = wrap.clientWidth || 800;
  const h = Math.max(wrap.clientHeight || 0, 560);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.removeAttribute("preserveAspectRatio");
  const [minX, minY, maxX, maxY] = state.unitedBounds;
  const pad = 20;
  const s = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
  const ox = (w - (maxX - minX) * s) / 2;
  const oy = (h - (maxY - minY) * s) / 2;
  const proj = (lon, lat) => [ox + (lon - minX) * s, oy + (maxY - lat) * s];
  resetCamIfNeeded();
  svg.innerHTML = "";
  const g = mapStage(svg);
  state.unitedGeo.features.forEach((feat, idx) => {
    const rec = unitedRec(feat);
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", featurePath(feat, proj));
    el.setAttribute("fill", rec ? partyMeta(rec.party).color : "#cfc8b8");
    el.setAttribute("class", `ac-poly${state.selected === "u" + idx ? " is-selected" : ""}`);
    el.dataset.uidx = idx;
    g.appendChild(el);
  });
  applyCam();
}

function drawMap() {
  const svg = $("#map");
  if (!svg) return;
  if (currentScope() === "united" || state.year < 2014) {
    drawUnited();
    return;
  }
  if (currentScope() === "tg" && TG_SET.has(state.year)) {
    drawTgSvg();
    return;
  }
  if (!state.geo) return;
  const wrap = svg.parentElement;
  const w = wrap.clientWidth || 800;
  const h = Math.max(wrap.clientHeight || 0, 520);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.removeAttribute("preserveAspectRatio");
  const proj = projector(w, h);
  resetCamIfNeeded();
  svg.innerHTML = "";
  const g = mapStage(svg);
  state.geo.features.forEach((feat) => {
    const ac = feat.properties.ac_no;
    const rec = apRec(ac);
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", featurePath(feat, proj));
    el.setAttribute("fill", rec ? partyMeta(rec.party).color : "#cfc8b8");
    el.setAttribute("class", `ac-poly${state.selected === ac ? " is-selected" : ""}`);
    el.dataset.ac = ac;
    g.appendChild(el);
  });
  applyCam();
}

function drawTgSvg() {
  const svg = $("#map");
  const wrap = svg.parentElement;
  const w = wrap.clientWidth || 800;
  const h = Math.max(wrap.clientHeight || 0, 520);
  svg.setAttribute("viewBox", "0 0 600 660");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  resetCamIfNeeded();
  svg.innerHTML = "";
  const g = mapStage(svg);
  (state.tgShapes || []).forEach((s) => {
    const row = tgRow(s.slug);
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", s.d);
    el.setAttribute("fill", row ? partyMeta(row.party).color : "#cfc8b8");
    el.setAttribute("class", `ac-poly${state.selected === s.slug ? " is-selected" : ""}`);
    el.dataset.slug = s.slug;
    g.appendChild(el);
  });
  applyCam();
}

function topCandidates(rec, extraKey) {
  let list = [];
  if (rec?.candidates?.length) list = rec.candidates.slice();
  else if (extraKey && state.tgCands[extraKey]?.candidates?.length) {
    list = state.tgCands[extraKey].candidates.slice();
  } else {
    if (rec?.winner) list.push({ name: rec.winner, party: rec.party, votes: rec.votes || 0, share: rec.share || 0 });
    if (rec?.runner) list.push({ name: rec.runner, party: rec.runner_party, votes: rec.runner_votes || 0, share: rec.runner_share || 0 });
  }
  list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
  return list.slice(0, 5);
}

function isPostSplit() {
  return currentScope() !== "united" && state.year >= 2014;
}

function renderDetailFrom(rec, title, meta, extraKey) {
  if (!rec) {
    $("#panel-body").innerHTML = `
      <p class="panel-kicker">${scopeLabel()}</p>
      <h2>${title}</h2>
      <p class="hint">No matching result for this constituency in ${state.year}.</p>`;
    return;
  }
  const p = partyMeta(rec.party);
  const cands = topCandidates(rec, extraKey);
  const maxVotes = Math.max(...cands.map((c) => c.votes || 0), 1);
  const post = isPostSplit();
  const listTitle = post || cands.length >= 5 ? "Top five candidates" : "Winner and runner-up";
  const extraBits = [];
  if (rec.turnout) extraBits.push("Turnout " + fmtPct(rec.turnout));
  if (rec.electors) extraBits.push(fmt(rec.electors) + " electors");
  if (rec.polled) extraBits.push(fmt(rec.polled) + " votes polled");

  $("#panel-body").innerHTML = `
    <div class="panel-head">
      <div>
        <p class="panel-kicker">${scopeLabel()} · ${state.year}</p>
        <h2>${title}</h2>
        <p class="ac-meta">${meta || ""}${extraBits.length ? " · " + extraBits.join(" · ") : ""}</p>
      </div>
      <button type="button" class="clear-btn" id="clear-detail">Clear</button>
    </div>
    ${rec.note ? `<p class="ac-meta">${rec.note}${rec.source_name ? " Official seat name then: " + rec.source_name + "." : ""}</p>` : ""}
    <div class="elected">
      <p class="party-name">Elected · ${p.name}</p>
      <strong>${rec.winner}</strong>
    </div>
    <div class="metrics">
      <div class="metric"><span>Votes</span><strong>${rec.votes ? fmt(rec.votes) : "—"}</strong></div>
      <div class="metric"><span>Vote share</span><strong>${fmtPct(rec.share)}</strong></div>
      <div class="metric"><span>Margin</span><strong>${rec.majority ? fmt(rec.majority) : "—"}</strong></div>
      <div class="metric"><span>Party</span><strong>${rec.party || "—"}</strong></div>
    </div>
    <h3>${listTitle}</h3>
    <div class="cand-list">
      ${cands.map((c, i) => {
        const cp = partyMeta(c.party);
        return `<div class="cand">
          <div class="cand-top">
            <span class="rank${i === 0 ? " is-win" : ""}" style="${i === 0 ? "background:" + cp.color : ""}">${i + 1}</span>
            <div class="who">${c.name}<small>${cp.name}${c.party && cp.name !== c.party ? " · " + c.party : ""}</small></div>
            <div class="nums"><b>${c.share ? fmtPct(c.share) : "—"}</b><div>${c.votes ? fmt(c.votes) : ""}</div></div>
          </div>
          <div class="track"><i style="width:${((c.votes || 0) / maxVotes) * 100}%;background:${cp.color}"></i></div>
        </div>`;
      }).join("")}
    </div>`;
  $("#clear-detail")?.addEventListener("click", clearSelection);
}

function clearSelection() {
  state.selected = null;
  renderSnapshot(current());
  drawMap();
}

function revealPanel() {
  if (window.matchMedia("(max-width: 980px)").matches) {
    $("#panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function selectAp(acNo) {
  state.selected = acNo;
  const ac = state.byAc.get(acNo);
  const rec = apRec(acNo);
  const title = ac ? ac.name : "Constituency";
  const meta = ac ? `#${ac.ac_no}${ac.district ? " · " + ac.district : ""}${ac.reservation ? " · " + ac.reservation : ""}` : "";
  renderDetailFrom(rec, title, meta);
  drawMap();
}

function selectTg(slug) {
  state.selected = slug;
  const row = tgRow(slug);
  const shape = (state.tgShapes || []).find((s) => s.slug === slug);
  renderDetailFrom(row, shape?.name || row?.name || slug, "Telangana", `${state.year}:${slug}`);
  drawMap();
}

function selectUnited(idx) {
  const feat = state.unitedGeo.features[idx];
  if (!feat) return;
  state.selected = "u" + idx;
  const rec = unitedRec(feat);
  const region = feat.properties.region === "tg" ? "Telangana region" : "Coastal Andhra / Rayalaseema";
  renderDetailFrom(rec, feat.properties.name, region);
  drawMap();
}

function restoreSelection() {
  if (state.selected == null) {
    renderSnapshot(current());
    return;
  }
  if (typeof state.selected === "string" && state.selected.startsWith("u")) {
    if (currentScope() !== "united") { state.selected = null; renderSnapshot(current()); return; }
    selectUnited(Number(state.selected.slice(1)));
    return;
  }
  if (currentScope() === "tg") {
    selectTg(state.selected);
    return;
  }
  if (currentScope() === "ap") {
    selectAp(state.selected);
    return;
  }
  state.selected = null;
  renderSnapshot(current());
}

function wireMap() {
  const svg = $("#map");
  const tip = $("#tooltip");
  let drag = null;
  $("#zoom-in")?.addEventListener("click", () => zoomBy(1.35));
  $("#zoom-out")?.addEventListener("click", () => zoomBy(1 / 1.35));
  $("#zoom-reset")?.addEventListener("click", () => { state.cam = { k: 1, x: 0, y: 0 }; applyCam(); });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = svgPoint(e);
    zoomBy(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
  }, { passive: false });
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const p = svgPoint(e);
    drag = { x: p.x, y: p.y, moved: false };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = svgPoint(e);
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) {
      state.cam.x += dx;
      state.cam.y += dy;
      drag.x = p.x;
      drag.y = p.y;
      applyCam();
      tip.hidden = true;
    }
  });
  svg.addEventListener("pointerup", () => { state.dragging = !!(drag && drag.moved); drag = null; });
  svg.addEventListener("pointercancel", () => { drag = null; state.dragging = false; });
  svg.addEventListener("mousemove", (e) => {
    const el = e.target.closest(".ac-poly");
    if (!el) { tip.hidden = true; return; }
    const rect = svg.parentElement.getBoundingClientRect();
    tip.hidden = false;
    tip.style.left = Math.min(e.clientX - rect.left + 12, rect.width - 180) + "px";
    tip.style.top = e.clientY - rect.top + 12 + "px";
    if (el.dataset.uidx != null) {
      const feat = state.unitedGeo.features[Number(el.dataset.uidx)];
      const rec = unitedRec(feat);
      tip.innerHTML = `<b>${feat.properties.name}</b><i>${rec ? rec.winner + " · " + rec.party : "No result matched"}</i>`;
    } else if (el.dataset.slug) {
      const row = tgRow(el.dataset.slug);
      tip.innerHTML = `<b>${row?.name || el.dataset.slug}</b><i>${row ? row.winner + " · " + row.party : ""}</i>`;
    } else {
      const ac = state.byAc.get(Number(el.dataset.ac));
      const rec = apRec(Number(el.dataset.ac));
      tip.innerHTML = `<b>${ac?.name || ""}</b><i>${rec ? rec.winner + " · " + rec.party : "No matching result"}</i>`;
    }
  });
  svg.addEventListener("mouseleave", () => { tip.hidden = true; });
  svg.addEventListener("click", (e) => {
    if (state.dragging) { state.dragging = false; return; }
    const el = e.target.closest(".ac-poly");
    if (!el) return;
    if (el.dataset.uidx != null) selectUnited(Number(el.dataset.uidx));
    else if (el.dataset.slug) selectTg(el.dataset.slug);
    else selectAp(Number(el.dataset.ac));
    revealPanel();
  });
  $("#search").addEventListener("input", () => {
    const q = $("#search").value.trim().toLowerCase();
    const box = $("#search-results");
    if (q.length < 2) { box.hidden = true; return; }
    let hits = [];
    if (currentScope() === "united" && state.unitedResults) {
      hits = (state.unitedResults[String(state.year)] || []).filter((r) =>
        `${r.name} ${r.winner || ""} ${r.party || ""}`.toLowerCase().includes(q)
      ).slice(0, 8);
      box.innerHTML = hits.map((r) =>
        `<li data-uname="${r.name}">${r.name}<small>${r.winner || "—"} · ${r.party || ""}</small></li>`
      ).join("");
    } else if (currentScope() === "tg") {
      hits = (state.winners?.tg?.[String(state.year)] || []).filter((r) =>
        `${r.name} ${r.winner} ${r.party}`.toLowerCase().includes(q)
      ).slice(0, 8);
      box.innerHTML = hits.map((r) => `<li data-slug="${r.slug}">${r.name}<small>${r.winner} · ${r.party}</small></li>`).join("");
    } else {
      for (const ac of state.byAc.values()) {
        const rec = apRec(ac.ac_no);
        const blob = `${ac.name} ${ac.district || ""} ${rec?.winner || ""} ${rec?.party || ""}`.toLowerCase();
        if (blob.includes(q)) hits.push({ ac, rec });
        if (hits.length >= 8) break;
      }
      box.innerHTML = hits.map(({ ac, rec }) =>
        `<li data-ac="${ac.ac_no}">${ac.name}<small>${rec ? rec.winner + " · " + rec.party : ac.district || ""}</small></li>`
      ).join("");
    }
    box.hidden = !hits.length;
  });
  $("#search-results").addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    if (li.dataset.uname) {
      const idx = state.unitedGeo.features.findIndex((f) => f.properties.name === li.dataset.uname);
      if (idx >= 0) selectUnited(idx);
    } else if (li.dataset.slug) selectTg(li.dataset.slug);
    else selectAp(Number(li.dataset.ac));
    $("#search-results").hidden = true;
    $("#search").value = "";
    revealPanel();
  });
}

async function ensureMap() {
  if (state.mapReady) return;
  const [results, geo, winners, shapes, cands, united, unitedRes] = await Promise.all([
    fetch("data/results.json").then((r) => r.json()),
    fetch("data/constituencies.geojson").then((r) => r.json()),
    fetch("data/year_winners.json").then((r) => r.json()),
    fetch("data/tg_shapes.json").then((r) => r.json()),
    fetch("data/tg_candidates.json").then((r) => r.ok ? r.json() : {}).catch(() => ({})),
    fetch("data/united.geojson").then((r) => r.json()),
    fetch("data/united_results.json").then((r) => r.json())
  ]);
  results.constituencies.forEach((c) => state.byAc.set(c.ac_no, c));
  state.geo = geo;
  state.bounds = geoBounds(geo);
  state.winners = winners;
  state.tgShapes = shapes;
  state.tgCands = cands || {};
  state.unitedGeo = united;
  state.unitedBounds = geoBounds(united);
  state.unitedResults = unitedRes;
  state.mapReady = true;
  wireMap();
}

function snapYearToScope() {
  const years = visibleYears();
  if (years.length && !years.includes(state.year)) {
    state.year = years[years.length - 1];
  }
}

async function paint() {
  snapYearToScope();
  renderScopes();
  renderYears();
  const e = current();
  if (e) renderBrief(e);
  $("#map-kicker").textContent = scopeLabel();
  $("#map-title").textContent = e ? `${e.year} · ${e.seats} seats` : "";
  const legend = $("#map-legend");
  if (legend && e && e.parties) {
    legend.innerHTML = e.parties.map((p) => {
      const meta = partyMeta(p.code);
      return `<div class="pill"><i class="dot" style="background:${meta.color}"></i><b>${p.code}</b> ${p.seats}</div>`;
    }).join("");
  }
  await ensureMap();
  restoreSelection();
  requestAnimationFrame(drawMap);
}

function setYear(year) {
  state.year = year;
  if (typeof state.selected === "string" && state.selected.startsWith("u") && currentScope() !== "united") {
    state.selected = null;
  }
  paint();
}

function setScope(scope, year) {
  const prevYear = year || state.year;
  if (scope === "united") {
    state.era = "united";
    state.region = null;
    state.year = UNITED_YEARS.includes(prevYear) ? prevYear : (year || 2009);
  } else {
    state.era = "split";
    state.region = scope;
    const years = scope === "tg" ? TG_YEARS : AP_YEARS;
    state.year = years.includes(prevYear) ? prevYear : years[years.length - 1];
  }
  if (scope === "united") state.selected = typeof state.selected === "string" && state.selected.startsWith("u") ? state.selected : null;
  else if (scope === "tg") state.selected = typeof state.selected === "string" && !state.selected.startsWith("u") ? state.selected : null;
  else state.selected = typeof state.selected === "number" ? state.selected : null;
  paint();
}

async function init() {
  state.archive = await fetch("data/archive.json").then((r) => r.json());
  $("#scopes").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-scope]");
    if (btn) setScope(btn.dataset.scope);
  });
  $("#years").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-year]");
    if (btn) setYear(Number(btn.dataset.year));
  });
  $("#brief").addEventListener("click", (e) => {
    const go = e.target.closest("[data-go-scope]");
    if (go) {
      setScope(go.dataset.goScope, go.dataset.goYear ? Number(go.dataset.goYear) : undefined);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const y = e.target.closest("[data-year]");
    if (y) {
      setYear(Number(y.dataset.year));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  window.addEventListener("resize", () => {
    if (state.mapReady) drawMap();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) $("#search-results").hidden = true;
  });
  await paint();
  $("#boot").classList.add("is-done");
}

init().catch((err) => { $("#boot").textContent = "Could not load archive: " + err.message; });
