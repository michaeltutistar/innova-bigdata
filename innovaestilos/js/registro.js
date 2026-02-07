(() => {
  const form = document.getElementById("formRegistro");
  const alertBox = document.getElementById("alertBox");
  const yearNow = document.getElementById("yearNow");
  yearNow.textContent = new Date().getFullYear();

  const nombreCompleto = document.getElementById("nombre_completo");
  const correo = document.getElementById("correo");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  const btnRegistrar = document.getElementById("btnRegistrar");
  const togglePass = document.getElementById("togglePass");
  const toggleConfirm = document.getElementById("toggleConfirm");

  const rules = {
    len: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    lower: (v) => /[a-z]/.test(v),
    num: (v) => /[0-9]/.test(v),
    special: (v) => /[^A-Za-z0-9]/.test(v),
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
    const txt = btnRegistrar.querySelector(".se-btn-text");
    const load = btnRegistrar.querySelector(".se-btn-loading");
    btnRegistrar.disabled = isLoading;
    txt.classList.toggle("d-none", isLoading);
    load.classList.toggle("d-none", !isLoading);
  }

  function isValidEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  function isValidFullName(value){
    const v = value.trim().replace(/\s+/g, " ");
    if (v.length < 6) return false;
    const parts = v.split(" ").filter(Boolean);
    // mínimo 2 palabras
    return parts.length >= 2;
  }

  function updateRuleUI(){
    const v = password.value || "";
    document.querySelectorAll(".se-rule").forEach((el) => {
      const k = el.getAttribute("data-rule");
      const ok = rules[k](v);
      el.classList.toggle("is-ok", ok);
      el.querySelector("i").className = ok ? "bi bi-check2-circle" : "bi bi-dot";
    });
  }

  function isStrongPassword(value){
    return rules.len(value) && rules.upper(value) && rules.lower(value) && rules.num(value) && rules.special(value);
  }

  // Toggles
  togglePass.addEventListener("click", () => {
    const isPass = password.type === "password";
    password.type = isPass ? "text" : "password";
    togglePass.querySelector("i").className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });

  toggleConfirm.addEventListener("click", () => {
    const isPass = confirmPassword.type === "password";
    confirmPassword.type = isPass ? "text" : "password";
    toggleConfirm.querySelector("i").className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });

  // Live validation
  nombreCompleto.addEventListener("input", () => {
    nombreCompleto.value = nombreCompleto.value.replace(/\s{2,}/g, " ");
    nombreCompleto.classList.remove("is-invalid");
  });

  correo.addEventListener("input", () => correo.classList.remove("is-invalid"));

  password.addEventListener("input", () => {
    updateRuleUI();
    password.classList.remove("is-invalid");
  });

  confirmPassword.addEventListener("input", () => confirmPassword.classList.remove("is-invalid"));

  updateRuleUI();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAlert();

    let ok = true;

    // Nombre completo obligatorio
    if (!isValidFullName(nombreCompleto.value)){
      nombreCompleto.classList.add("is-invalid");
      ok = false;
    }

    // Correo obligatorio
    if (!isValidEmail(correo.value)){
      correo.classList.add("is-invalid");
      ok = false;
    }

    // Password fuerte
    if (!isStrongPassword(password.value)){
      password.classList.add("is-invalid");
      ok = false;
      updateRuleUI();
    }

    // Confirmación
    if (confirmPassword.value !== password.value || !confirmPassword.value){
      confirmPassword.classList.add("is-invalid");
      ok = false;
    }

    if (!ok){
      setAlert("danger", `<i class="bi bi-shield-exclamation me-2"></i> Verifique los campos obligatorios antes de crear el usuario.`);
      return;
    }

    // Simulación de envío (conectar a backend)
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert("success", `<i class="bi bi-check2-circle me-2"></i> Registro validado. Listo para enviarse al servidor.`);
      // Aquí conectarías tu backend: fetch('/api/users', {method:'POST', body:new FormData(form)})
    }, 650);
  });
})();
