(() => {
  const $ = (s) => document.querySelector(s);

  const yearNow = $("#yearNow");
  yearNow.textContent = new Date().getFullYear();

  // Drawer (no desplaza contenido)
  const sideNav = $("#sideNav");
  const navOverlay = $("#navOverlay");
  const btnOpenNav = $("#btnOpenNav");
  const btnCloseNav = $("#btnCloseNav");

  const openNav = () => {
    sideNav.classList.add("is-open");
    navOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  const closeNav = () => {
    sideNav.classList.remove("is-open");
    navOverlay.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  btnOpenNav?.addEventListener("click", openNav);
  btnCloseNav?.addEventListener("click", closeNav);
  navOverlay?.addEventListener("click", closeNav);

  // "Detalle bajo demanda" (cambia con menú)
  const detailTitle = $("#detailTitle");
  const detailList = $("#detailList");
  const navLinks = document.querySelectorAll(".se-nav-link");
  const navSubLinks = document.querySelectorAll(".se-nav-sublink");

  const VIEWS = {
    overview: {
        title: "Visión general",
        items: [
            ["Calidad de registros", "El sistema detecta consistencia en la captura. Recomendación: mantener ritmo."],
            ["Riesgo operacional", "Señales bajas. No hay picos anómalos de incidencias."],
            ["Próximo paso sugerido", "Enfocar digitación en 2 municipios con menor crecimiento (insight automático)."],
        ],
        modes: ["rank_top5", "top_referrals"]
    },

    lideres: {
      title: "Líderes",
      items: [
        ["Top rendimiento", "LDR-0001 presenta crecimiento sostenido sin incrementar incidencias."],
        ["Líderes en riesgo", "2 líderes con caída de ritmo. Sugerencia: reforzar gestión de referidos."],
        ["Acción rápida", "Revisar distribución por zona y puesto para optimizar captación."],
      ],
    },
    sufragantes: {
      title: "Sufragantes",
      items: [
        ["Patrón de registro", "Mayor captación en franjas 9–11am. Recomiendo intensificar en ese horario."],
        ["Campos críticos", "Incidencias asociadas a identificación incompleta. Activar validación ligera."],
        ["Acción rápida", "Usar “copiar datos del líder” para reducir fricción cognitiva."],
      ],
    },
    incidencias: {
      title: "Incidencias",
      items: [
        ["Señales discretas", "Las incidencias actuales no son críticas. Mantener monitoreo."],
        ["Causa probable", "Errores de digitación y datos incompletos (no estructurales)."],
        ["Acción recomendada", "Mostrar guía contextual en campos sensibles (micro-tips)."],
      ],
    },
    reportes: {
      title: "Reportes",
      items: [
        ["Exportación", "Generar reporte por líder + municipio con un clic (mínima fricción)."],
        ["Lectura ejecutiva", "Resumen de 1 página: avances, riesgos y recomendaciones."],
        ["Siguiente mejora", "Incluir resumen IA narrativo por día / semana."],
      ],
    },
    lideres_rank: {
        title: "Ranking líderes • Top 5 (avance)",
        items: [
            ["Insight", "Top 5 ordenado por ritmo de captación. Se muestra solo lo esencial: progreso y tendencia."],
        ],
        mode: "rank_top5"
        },

        lideres_riesgo: {
        title: "Líder en riesgo (discreto)",
        items: [
            ["Alerta silenciosa", "Señal de riesgo detectada: caída de ritmo y aumento leve de incidencias."],
        ],
        mode: "risk_leader"
        },

        lideres_referidos: {
        title: "Líder con más referidos (Top 5)",
        items: [
            ["Insight", "Top 5 ordenado por número de referidos registrados. Recomendación: replicar patrón del líder #1."],
        ],
        mode: "top_referrals"
    },
  };

// DATA DEMO (luego conecta a PostgreSQL)
const LEADERS_STATS = [
  { code: "LDR-0001", name: "María Fernanda Ríos", progress: 86, meta: 1000, referrals: 210, incidencias: 1 },
  { code: "LDR-0002", name: "Juan Carlos Paredes", progress: 74, meta: 800,  referrals: 180, incidencias: 2 },
  { code: "LDR-0003", name: "Camila Andrade",       progress: 62, meta: 900,  referrals: 165, incidencias: 4 },
  { code: "LDR-0004", name: "David Benavides",      progress: 58, meta: 700,  referrals: 140, incidencias: 3 },
  { code: "LDR-0005", name: "Laura Narváez",        progress: 49, meta: 650,  referrals: 120, incidencias: 2 },
  { code: "LDR-0006", name: "Santiago Guerrero",    progress: 41, meta: 700,  referrals: 95,  incidencias: 6 } // riesgo
];

function makeRank(rows, metricLabel){
  const max = Math.max(...rows.map(r => r.val), 1);
  return `
    <div class="se-rank">
      ${rows.map((r, idx) => {
        const w = Math.round((r.val / max) * 100);
        return `
          <div class="se-rank-row">
            <div class="se-rank-left">
              <div class="se-rank-num">${idx + 1}</div>
              <div style="min-width:0;">
                <div class="se-rank-name">${r.name} <span class="se-soft">(${r.code})</span></div>
                <div class="se-rank-sub">${metricLabel}: <span class="se-soft">${r.val}</span></div>
              </div>
            </div>
            <div class="se-rank-right">
              <div class="se-rank-val">${r.val}</div>
              <div class="se-bar"><span style="width:${w}%"></span></div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderView(key){
  const v = VIEWS[key] || VIEWS.overview;
  detailTitle.textContent = v.title;

  // base items
  const base = (v.items || []).map(([k, val]) => `
    <div class="se-item">
      <div class="se-item-k">${k}</div>
      <div class="se-item-v">${val}</div>
    </div>
  `).join("");

  // modo avanzado
  let extra = "";
    const modes = Array.isArray(v.modes) ? v.modes : (v.mode ? [v.mode] : []);

  for (const mode of modes) {
    if (mode === "rank_top5") {
      const rows = [...LEADERS_STATS]
        .sort((a,b) => b.progress - a.progress)
        .slice(0,5)
        .map(x => ({ code: x.code, name: x.name, val: x.progress }));
      extra += `<div class="mt-3"></div>` + makeRank(rows, "Registrados hoy");
    }

    if (mode === "top_referrals") {
      const rows = [...LEADERS_STATS]
        .sort((a,b) => b.referrals - a.referrals)
        .slice(0,5)
        .map(x => ({ code: x.code, name: x.name, val: x.referrals }));
      extra += `<div class="mt-3"></div>` + makeRank(rows, "Referidos");
    }

    if (mode === "risk_leader") {
      const risk = [...LEADERS_STATS]
        .sort((a,b) => (b.incidencias*10 - b.progress) - (a.incidencias*10 - a.progress))[0];

      extra += `
        <div class="mt-3"></div>
        <div class="se-rank">
          <div class="se-rank-row" style="border-color: rgba(255,196,87,.16);">
            <div class="se-rank-left">
              <div class="se-rank-num" style="background: rgba(255,196,87,.12); border-color: rgba(255,196,87,.18);">
                <i class="bi bi-exclamation"></i>
              </div>
              <div style="min-width:0;">
                <div class="se-rank-name">${risk.name} <span class="se-soft">(${risk.code})</span> <span class="se-pill se-pill-warn ms-2">RIESGO</span></div>
                <div class="se-rank-sub">Incidencias: <span class="se-soft">${risk.incidencias}</span> • Registrados hoy: <span class="se-soft">${risk.progress}</span></div>
              </div>
            </div>
            <div class="se-rank-right">
              <div class="se-rank-val">${risk.incidencias}</div>
              <div class="se-bar"><span style="width:${Math.min(100, risk.incidencias * 12)}%; background: rgba(255,196,87,.88); box-shadow: 0 0 18px rgba(255,196,87,.18);"></span></div>
            </div>
          </div>
        </div>
      `;
    }
  }

  if (v.mode === "rank_top5"){
    const rows = [...LEADERS_STATS]
      .sort((a,b) => b.progress - a.progress)
      .slice(0,5)
      .map(x => ({ code: x.code, name: x.name, val: x.progress }));
    extra = makeRank(rows, "Registrados hoy");
  }

  if (v.mode === "top_referrals"){
    const rows = [...LEADERS_STATS]
      .sort((a,b) => b.referrals - a.referrals)
      .slice(0,5)
      .map(x => ({ code: x.code, name: x.name, val: x.referrals }));
    extra = makeRank(rows, "Referidos");
  }

  if (v.mode === "risk_leader"){
    // criterio demo: mayor incidencias + menor progreso relativo
    const risk = [...LEADERS_STATS]
      .sort((a,b) => (b.incidencias*10 - b.progress) - (a.incidencias*10 - a.progress))[0];

    extra = `
      <div class="se-rank">
        <div class="se-rank-row" style="border-color: rgba(255,196,87,.16);">
          <div class="se-rank-left">
            <div class="se-rank-num" style="background: rgba(255,196,87,.12); border-color: rgba(255,196,87,.18);">
              <i class="bi bi-exclamation"></i>
            </div>
            <div style="min-width:0;">
              <div class="se-rank-name">${risk.name} <span class="se-soft">(${risk.code})</span> <span class="se-pill se-pill-warn ms-2">RIESGO</span></div>
              <div class="se-rank-sub">Incidencias: <span class="se-soft">${risk.incidencias}</span> • Registrados hoy: <span class="se-soft">${risk.progress}</span></div>
            </div>
          </div>
          <div class="se-rank-right">
            <div class="se-rank-val">${risk.incidencias}</div>
            <div class="se-bar"><span style="width:${Math.min(100, risk.incidencias * 12)}%; background: rgba(255,196,87,.88); box-shadow: 0 0 18px rgba(255,196,87,.18);"></span></div>
          </div>
        </div>
      </div>
    `;
  }

  detailList.innerHTML = base + extra;
}


navLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.getAttribute("data-view");
    if(!view) return;

    navLinks.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    renderView(view);

    if (window.matchMedia("(max-width: 991.98px)").matches) closeNav();
  });
});


  navSubLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    // activa el sublink seleccionado
    navSubLinks.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    // desactiva "link principal" activo (visual)
    navLinks.forEach(b => b.classList.remove("is-active"));

    renderView(btn.getAttribute("data-view"));

    if (window.matchMedia("(max-width: 991.98px)").matches) closeNav();
  });
});

// ==============================
// Padres (Líderes / Sufragantes / Reportes) estado visual según collapse
// ==============================
const navParents = document.querySelectorAll(".se-nav-parent");

function syncParentState(){
  navParents.forEach(p => {
    const targetSel = p.getAttribute("data-bs-target");
    if(!targetSel) return;
    const el = document.querySelector(targetSel);
    if(!el) return;

    // set initial state
    p.classList.toggle("is-open", el.classList.contains("show"));

    // bootstrap events
    el.addEventListener("shown.bs.collapse", () => p.classList.add("is-open"));
    el.addEventListener("hidden.bs.collapse", () => p.classList.remove("is-open"));
  });
}
syncParentState();



  renderView("overview");

  // KPI / Mood (elemento "emocional")
  const moodDot = $("#moodDot");
  const badgeMood = $("#badgeMood");
  const headlineTxt = $("#headlineTxt");
  const aiSummary = $("#aiSummary");

  const moods = [
    { key: "calma", label: "Calma", icon: "bi-emoji-smile", headline: "Calma operativa: registros estables y sin incidencias críticas.", ai: "Hoy el sistema muestra estabilidad. El líder con mejor ritmo de crecimiento supera la media sin aumentar incidencias." },
    { key: "crecimiento", label: "Crecimiento", icon: "bi-graph-up-arrow", headline: "Crecimiento sostenido: el ritmo de captación aumenta sin fricción.", ai: "El incremento está concentrado en 2 municipios. Recomendación: replicar patrón del líder top." },
    { key: "riesgo", label: "Riesgo", icon: "bi-exclamation-triangle", headline: "Atención discreta: pequeñas señales de incidencia podrían escalar.", ai: "Se detecta aumento de incidencias por digitación. Recomendación: activar validaciones ligeras y guías." },
  ];

  function setMood(m){
    moodDot.style.background = "var(--dash-accent)";
    moodDot.style.boxShadow = "0 0 0 6px rgba(110,231,255,.10)";
    badgeMood.innerHTML = `<i class="bi ${m.icon} me-1"></i> ${m.label}`;
    headlineTxt.textContent = m.headline;
    aiSummary.textContent = m.ai;
  }

  // Micro-interacción: al refrescar, cambia mood rotando
  let moodIndex = 0;

  // Charts (máximo 3)
  const common = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 260, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(10,12,18,.92)",
        titleColor: "rgba(255,255,255,.92)",
        bodyColor: "rgba(236,240,255,.78)",
        borderColor: "rgba(255,255,255,.10)",
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { display: false } },
      y: { grid: { display: false }, ticks: { display: false } },
    }
  };

  // Main line chart
  const ctxMain = $("#chartMain").getContext("2d");
  const mainChart = new Chart(ctxMain, {
    type: "line",
    data: {
      labels: ["", "", "", "", "", "", "", ""],
      datasets: [{
        data: [120, 140, 138, 156, 160, 168, 175, 182],
        tension: 0.42,
        borderWidth: 2,
        borderColor: "rgba(110,231,255,.95)",
        pointRadius: 0,
        fill: true,
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "rgba(110,231,255,.10)";
          const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(110,231,255,.18)");
          g.addColorStop(1, "rgba(110,231,255,.02)");
          return g;
        }
      }]
    },
    options: { ...common }
  });

  // Sparkline 1
  const spark1 = new Chart($("#spark1").getContext("2d"), {
    type: "line",
    data: {
      labels: ["","","","","","","",""],
      datasets: [{
        data: [8, 10, 9, 12, 13, 14, 15, 16],
        tension: 0.45,
        borderWidth: 2,
        borderColor: "rgba(167,139,250,.92)",
        pointRadius: 0,
        fill: false
      }]
    },
    options: { ...common }
  });

  // Sparkline 2
  const spark2 = new Chart($("#spark2").getContext("2d"), {
    type: "line",
    data: {
      labels: ["","","","","","","",""],
      datasets: [{
        data: [3, 2, 2, 3, 2, 2, 1, 2],
        tension: 0.45,
        borderWidth: 2,
        borderColor: "rgba(110,231,255,.72)",
        pointRadius: 0,
        fill: false
      }]
    },
    options: { ...common }
  });

  // Donut (3er gráfico)
  const donut = new Chart($("#chartDonut").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Convertido", "Pendiente"],
      datasets: [{
        data: [71, 29],
        backgroundColor: ["rgba(110,231,255,.92)", "rgba(255,255,255,.10)"],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 260, easing: "easeOutQuart" },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      cutout: "74%"
    }
  });

  // Botones top
  $("#btnRefresh").addEventListener("click", () => {
    // micro feedback inmediato (sin esperar)
    const kpiTotal = $("#kpiTotal");
    const current = parseInt(kpiTotal.textContent.replace(/,/g,""), 10) || 12480;
    const next = current + Math.floor(Math.random() * 25) + 6;
    kpiTotal.textContent = next.toLocaleString("en-US");

    // mood rotativo
    moodIndex = (moodIndex + 1) % moods.length;
    setMood(moods[moodIndex]);

    // animación suave con update
    mainChart.data.datasets[0].data = mainChart.data.datasets[0].data.map(v => v + (Math.random() > .6 ? 2 : 1));
    mainChart.update();

    spark1.data.datasets[0].data = spark1.data.datasets[0].data.map(v => v + (Math.random() > .7 ? 1 : 0));
    spark1.update();

    spark2.data.datasets[0].data = spark2.data.datasets[0].data.map(v => Math.max(0, v + (Math.random() > .7 ? 1 : -1)));
    spark2.update();

    const conv = 68 + Math.floor(Math.random() * 10);
    $("#kpiConv").textContent = `${conv}%`;
    donut.data.datasets[0].data = [conv, 100 - conv];
    donut.update();
  });

  $("#btnExport").addEventListener("click", () => {
    // feedback inmediato
    const btn = $("#btnExport");
    btn.classList.add("se-pulse");
    setTimeout(() => btn.classList.remove("se-pulse"), 420);
  });

  $("#btnHint").addEventListener("click", () => {
    renderView(document.querySelector(".se-nav-link.is-active")?.getAttribute("data-view") || "overview");
  });

  // Tema (placeholder - mantienes dark mode como default “caro”)
    const btnToggleTheme = $("#btnToggleTheme");
    const body = document.body;

    function setTheme(theme){
    body.setAttribute("data-theme", theme);
    const isDark = theme === "dark";
    btnToggleTheme.innerHTML = isDark
        ? `<i class="bi bi-moon-stars me-2"></i>Modo oscuro <span class="ms-1">• activo</span>`
        : `<i class="bi bi-brightness-high me-2"></i>Modo claro <span class="ms-1">• activo</span>`;
    }

    btnToggleTheme.addEventListener("click", () => {
    const cur = body.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
    });

    // init
    setTheme(body.getAttribute("data-theme") || "dark");


  // init
  setMood(moods[0]);

  // micro pulse class (inyectada)
  const style = document.createElement("style");
  style.textContent = `
    .se-pulse{ animation: sePulse .38s ease-out; }
    @keyframes sePulse{ 0%{ transform: translateY(0) scale(1); } 60%{ transform: translateY(-1px) scale(1.02); } 100%{ transform: translateY(0) scale(1); } }
  `;
  document.head.appendChild(style);
})();
