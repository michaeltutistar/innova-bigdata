(() => {
  const $ = (s) => document.querySelector(s);

  const form = $("#formSufragante");
  const alertBox = $("#alertBox");
  const yearNow = $("#yearNow");
  yearNow.textContent = new Date().getFullYear();

  const idlider = $("#idlider");
  const btnToggleLider = $("#btnToggleLider");
  const sectionSufragante = $("#sectionSufragante");
  const btnGuardar = $("#btnGuardar");
  const btnLimpiar = $("#btnLimpiar");

  const sectionTabla = $("#sectionTabla");
  const tbodyRegistros = $("#tbodyRegistros");

  // Modal
  const modalOtroEl = $("#modalOtro");
  const modalOtro = new bootstrap.Modal(modalOtroEl);
  const btnSiOtro = $("#btnSiOtro");
  const btnNoOtro = $("#btnNoOtro");

  // Leader display fields
  const liderNombre = $("#liderNombre");
  const liderCodigo = $("#liderCodigo");
  const liderMeta = $("#liderMeta");
  const liderZona = $("#liderZona");
  const liderIdentificacion = $("#liderIdentificacion");
  const liderCorreo = $("#liderCorreo");
  const liderTelefono = $("#liderTelefono");
  const liderDepartamento = $("#liderDepartamento");
  const liderMunicipio = $("#liderMunicipio");
  const liderPuesto = $("#liderPuesto");

  // Campos sufragante (no obligatorios)
  const fieldsToClear = [
    $("#idsufragante"),
    $("#identificacion"),
    $("#nombre_completo"),
    $("#correo"),
    $("#nrocontacto"),
    $("#direccion"),
    $("#departamento"),
    $("#municipio"),
    $("#lugarvotacion"),
    $("#mesavotacion"),
    $("#activo"),
    $("#incidencia"),
    $("#edad"),
    $("#rol"),
    $("#sector"),
    $("#grupoetico"),
    $("#genero"),
    $("#poblacionobjetivo"),
  ];

  // Tabla acumulativa por líder (en memoria)
  // estructura: { idlider: [registro, registro, ...] }
  const registrosPorLider = {};

  // ====== DEMO líderes (por ahora). Luego lo conectamos a BD ======
  const LIDERES = [
    {
      idlider: "LDR-0001",
      codigo_lider: "LDR-0001",
      identificacion: "123456789",
      nombre_completo: "María Fernanda Ríos",
      correo: "maria.rios@demo.com",
      telefono: "3001112233",
      zona: "URBANA",
      meta_votos: "1000",
      departamento: "Nariño",
      municipio: "Pasto",
      puesto_votacion: "Colegio Central"
    },
    {
      idlider: "LDR-0002",
      codigo_lider: "LDR-0002",
      identificacion: "987654321",
      nombre_completo: "Juan Carlos Paredes",
      correo: "juan.paredes@demo.com",
      telefono: "3014445566",
      zona: "RURAL",
      meta_votos: "500",
      departamento: "Nariño",
      municipio: "Ipiales",
      puesto_votacion: "Institución Educativa Norte"
    }
  ];

  function setAlert(type, msg){
    alertBox.classList.remove("d-none", "alert-danger", "alert-warning", "alert-success");
    alertBox.classList.add(type === "success" ? "alert-success" : type === "warning" ? "alert-warning" : "alert-danger");
    alertBox.innerHTML = msg;
  }
  function clearAlert(){
    alertBox.classList.add("d-none");
    alertBox.innerHTML = "";
  }

  function setLoading(isLoading){
    const txt = btnGuardar.querySelector(".se-btn-text");
    const load = btnGuardar.querySelector(".se-btn-loading");
    btnGuardar.disabled = isLoading;
    txt.classList.toggle("d-none", isLoading);
    load.classList.toggle("d-none", !isLoading);
  }

  function enableSufraganteForm(enable){
    sectionSufragante.style.opacity = enable ? "1" : ".6";
    sectionSufragante.setAttribute("aria-disabled", enable ? "false" : "true");
    btnGuardar.disabled = !enable;
  }

  function loadLideres(){
    idlider.innerHTML = `<option value="" selected>Seleccione un líder...</option>`;
    LIDERES.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.idlider;
      opt.textContent = `${l.nombre_completo} — (${l.codigo_lider})`;
      idlider.appendChild(opt);
    });
  }

  function fillLiderInfo(l){
    liderNombre.textContent = l?.nombre_completo || "—";
    liderCodigo.innerHTML = `<i class="bi bi-upc-scan me-1"></i> ${l?.codigo_lider || "—"}`;
    liderMeta.innerHTML = `<i class="bi bi-bar-chart me-1"></i> Meta: ${l?.meta_votos || "—"}`;
    liderZona.innerHTML = `<i class="bi bi-geo-alt me-1"></i> ${l?.zona || "—"}`;

    liderIdentificacion.textContent = l?.identificacion || "—";
    liderCorreo.textContent = l?.correo || "—";
    liderTelefono.textContent = l?.telefono || "—";
    liderDepartamento.textContent = l?.departamento || "—";
    liderMunicipio.textContent = l?.municipio || "—";
    liderPuesto.textContent = l?.puesto_votacion || "—";
  }

  function clearSufragante(keepLeader=true){
    fieldsToClear.forEach(f => {
      if (!f) return;
      if (f.tagName === "SELECT") f.value = "";
      else f.value = "";
      f.classList.remove("is-invalid");
    });

    clearAlert();

    if (!keepLeader){
      idlider.value = "";
      btnToggleLider.disabled = true;
      enableSufraganteForm(false);
      fillLiderInfo(null);
    }
  }

  function renderTablaForLeader(leaderId){
    const list = registrosPorLider[leaderId] || [];
    if (!list.length){
      sectionTabla.classList.add("d-none");
      tbodyRegistros.innerHTML = "";
      return;
    }

    sectionTabla.classList.remove("d-none");
    tbodyRegistros.innerHTML = list.map((r, idx) => {
      const lugarMesa = `${r.lugarvotacion || "—"} / ${r.mesavotacion || "—"}`;
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.identificacion || "—"}</td>
          <td>${r.nombres || "—"}</td>
          <td>${r.nrocontacto || "—"}</td>
          <td>${lugarMesa}</td>
          <td>${r.activo || "—"}</td>
        </tr>
      `;
    }).join("");
  }

  // === Eventos ===
  idlider.addEventListener("change", () => {
    clearAlert();
    const val = idlider.value;
    const l = LIDERES.find(x => x.idlider === val);

    if (!l){
      btnToggleLider.disabled = true;
      enableSufraganteForm(false);
      fillLiderInfo(null);
      renderTablaForLeader(val);
      return;
    }

    btnToggleLider.disabled = false;
    fillLiderInfo(l);
    enableSufraganteForm(true);

    // Mostrar tabla acumulativa del líder
    renderTablaForLeader(val);

    setAlert("success", `<i class="bi bi-check2-circle me-2"></i> Líder seleccionado. Ya puede registrar sufragantes para este líder.`);
  });

  btnLimpiar.addEventListener("click", () => {
    clearSufragante(true); // mantiene select líder
    const leaderId = idlider.value;
    if (leaderId) renderTablaForLeader(leaderId);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAlert();

    const leaderId = idlider.value;
    if (!leaderId){
      setAlert("danger", `<i class="bi bi-shield-exclamation me-2"></i> Seleccione un líder antes de guardar.`);
      return;
    }

    // Construir payload según tu tabla sufragantes
    const payload = {
      idsufragante: $("#idsufragante").value.trim(),
      identificacion: $("#identificacion").value.trim(),
      nombres: $("#nombre_completo").value.trim(), // un solo campo
      correo: $("#correo").value.trim(),
      nrocontacto: $("#nrocontacto").value.trim(),
      direccion: $("#direccion").value.trim(),
      departamento: $("#departamento").value.trim(),
      municipio: $("#municipio").value.trim(),
      lugarvotacion: $("#lugarvotacion").value.trim(),
      mesavotacion: $("#mesavotacion").value.trim(),
      idlider: leaderId,
      activo: $("#activo").value.trim(),
      incidencia: $("#incidencia").value.trim(),
      edad: $("#edad").value.trim(),
      rol: $("#rol").value.trim(),
      sector: $("#sector").value.trim(),
      grupoetico: $("#grupoetico").value.trim(),
      genero: $("#genero").value.trim(),
      poblacionobjetivo: $("#poblacionobjetivo").value.trim(),
    };

    // Guardado (por ahora simulado). Aquí conectas a backend POST /sufragantes
    setLoading(true);
    setTimeout(() => {
      setLoading(false);

      // Guardar en tabla acumulativa (memoria)
      if (!registrosPorLider[leaderId]) registrosPorLider[leaderId] = [];
      registrosPorLider[leaderId].push(payload);

      renderTablaForLeader(leaderId);

      setAlert("success", `<i class="bi bi-check2-circle me-2"></i> Sufragante guardado correctamente.`);
      modalOtro.show();
    }, 650);
  });

  // Modal actions
  btnSiOtro.addEventListener("click", () => {
    modalOtro.hide();
    clearSufragante(true); // limpia excepto líder
    $("#identificacion").focus();
  });

  btnNoOtro.addEventListener("click", () => {
    // Limpia formulario excepto el select del líder (regla)
    clearSufragante(true);
    // Tabla queda visible como historial del líder actual (útil)
    const leaderId = idlider.value;
    if (leaderId) renderTablaForLeader(leaderId);
  });

  // Init
  loadLideres();
  enableSufraganteForm(false);
})();
