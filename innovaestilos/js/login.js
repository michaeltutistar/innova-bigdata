(() => {
  const form = document.getElementById("formLogin");
  const correo = document.getElementById("correo");
  const password = document.getElementById("password");
  const alertBox = document.getElementById("alertBox");
  const btnLogin = document.getElementById("btnLogin");
  const togglePass = document.getElementById("togglePass");
  const yearNow = document.getElementById("yearNow");

  yearNow.textContent = new Date().getFullYear();

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
    const txt = btnLogin.querySelector(".se-btn-text");
    const load = btnLogin.querySelector(".se-btn-loading");
    btnLogin.disabled = isLoading;
    txt.classList.toggle("d-none", isLoading);
    load.classList.toggle("d-none", !isLoading);
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

  function isValidEmail(value){
    // Validación simple pero sólida para UX
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  function isStrongPassword(value){
    return rules.len(value) && rules.upper(value) && rules.lower(value) && rules.num(value) && rules.special(value);
  }

  // Toggle password visibility
  togglePass.addEventListener("click", () => {
    const isPass = password.type === "password";
    password.type = isPass ? "text" : "password";
    togglePass.querySelector("i").className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });

  // Live validation
  password.addEventListener("input", () => {
    updateRuleUI();
    if (password.value.length > 0) password.classList.remove("is-invalid");
  });

  correo.addEventListener("input", () => {
    if (correo.value.length > 0) correo.classList.remove("is-invalid");
  });

  // Initial UI
  updateRuleUI();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAlert();

    const emailVal = correo.value.trim();
    const passVal = password.value;

    let ok = true;

    if (!isValidEmail(emailVal)){
      correo.classList.add("is-invalid");
      ok = false;
    } else {
      correo.classList.remove("is-invalid");
    }

    if (!isStrongPassword(passVal)){
      password.classList.add("is-invalid");
      ok = false;
      updateRuleUI();
    } else {
      password.classList.remove("is-invalid");
    }

    if (!ok){
      setAlert("danger", `<i class="bi bi-shield-exclamation me-2"></i> Verifique los campos obligatorios antes de continuar.`);
      return;
    }

    // Simulación de envío (aquí conectarás tu backend PHP/Node/etc.)
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAlert("success", `<i class="bi bi-check2-circle me-2"></i> Validación correcta. Listo para enviar al servidor.`);
      // Aquí harías el submit real:
      // form.submit();
      // o fetch(...) hacia tu endpoint
    }, 600);
  });
})();
