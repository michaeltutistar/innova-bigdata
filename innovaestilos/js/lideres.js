(() => {
  const $ = (s) => document.querySelector(s);

  const form = $("#formLider");
  const alertBox = $("#alertBox");
  const btnGuardar = $("#btnGuardar");
  const yearNow = $("#yearNow");
  yearNow.textContent = new Date().getFullYear();

  const progressBar = $("#progressBar");
  const progressTxt = $("#progressTxt");

  const departamento = $("#departamento");
  const municipio = $("#municipio");

  // Campos requeridos (para progreso)
  const requiredFields = [
    $("#tipo_doc"),
    $("#identificacion"),
    $("#nombre_completo"),
    $("#correo"),
    $("#telefono"),
    $("#zona"),
    $("#meta_votos"),
    $("#departamento"),
    $("#municipio"),
    $("#puesto_votacion"),
    $("#direccion"),
  ];

  // Demo data (luego lo conectamos a tu tabla departamentos en PostgreSQL)
  const DEP_MUN = {
    "Nariño": ["Pasto", "Ipiales", "Tumaco", "Túquerres", "La Unión"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Guapi"],
    "Valle del Cauca": ["Cali", "Palmira", "Buenaventura"]
  };

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

  function isValidEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  function onlyDigits(value){
    return value.replace(/\D/g, "");
  }

  function calcProgress(){
    const total = requiredFields.length;
    let filled = 0;

    requiredFields.forEach((el) => {
      const v = (el.value || "").trim();
      if (v) filled++;
    });

    const pct = Math.round((filled / total) * 100);
    progressBar.style.width = `${pct}%`;
    progressTxt.textContent = `${pct}%`;
  }

  // Inputs formatting
  $("#identificacion").addEventListener("input", (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 15);
    e.target.classList.remove("is-invalid");
    calcProgress();
  });

  $("#telefono").addEventListener("input", (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 10);
    e.target.classList.remove("is-invalid");
    calcProgress();
  });

  $("#meta_votos").addEventListener("input", (e) => {
    e.target.value = onlyDigits(e.target.value).slice(0, 6);
    e.target.classList.remove("is-invalid");
    calcProgress();
  });

  // Generic listeners for progress
  requiredFields.forEach((el) => {
    el.addEventListener("input", () => {
      el.classList.remove("is-invalid");
      calcProgress();
    });
    el.addEventListener("change", () => {
      el.classList.remove("is-invalid");
      calcProgress();
    });
  });

  // Load departments
  function loadDepartamentos(){
    departamento.innerHTML = `<option value="" selected>Seleccione...</option>`;
    Object.keys(DEP_MUN).forEach(dep => {
      const opt = document.createElement("option");
      opt.value = dep;
      opt.textContent = dep;
      departamento.appendChild(opt);
    });
  }

  // Dependent municipios
  departamento.addEventListener("change", () => {
    const dep = departamento.value;
    municipio.disabled = !dep;
    municipio.innerHTML = dep
      ? `<option value="" selected>Seleccione...</option>`
      : `<option value="" selected>Seleccione un departamento...</option>`;

    if (dep){
      DEP_MUN[dep].forEach(mun => {
        const opt = document.createElement("option");
        opt.value = mun;
        opt.textContent = mun;
        municipio.appendChild(opt);
      });
    }
    calcProgress();
  });

  // Submit validation
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAlert();

    let ok = true;

    // Required
    requiredFields.forEach((el) => {
      const v = (el.value || "").trim();
      if (!v){
        el.classList.add("is-invalid");
        ok = false;
      }
    });

    // Email
    const email = $("#correo");
    if (email.value && !isValidEmail(email.value)){
      email.classList.add("is-invalid");
      ok = false;
    }

    // Identificación length
    const id = $("#identificacion");
    if (id.value && (id.value.length < 5 || id.value.length > 15)){
      id.classList.add("is-invalid");
      ok = false;
    }

    // Teléfono length
    const tel = $("#telefono");
    if (tel.value && (tel.value.length < 7 || tel.value.length > 10)){
      tel.classList.add("is-invalid");
      ok = false;
    }

    // Meta votos >= 1
    const meta = $("#meta_votos");
    if (meta.value && parseInt(meta.value, 10) < 1){
      meta.classList.add("is-invalid");
      ok = false;
    }

    if (!ok){
      setAlert("danger", `<i class="bi bi-shield-exclamation me-2"></i> Verifique los campos obligatorios antes de guardar.`);
      return;
    }

    // Simulación de guardado
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert("success", `<i class="bi bi-check2-circle me-2"></i> Registro validado. Listo para enviarse al servidor.`);
      // Aquí conectarás tu backend: fetch('/api/lideres', {method:'POST', body: new FormData(form)})
      // form.reset(); municipio.disabled = true; loadDepartamentos(); calcProgress();
    }, 650);
  });

  // Init
  loadDepartamentos();
  calcProgress();
})();
