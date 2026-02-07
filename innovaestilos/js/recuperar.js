(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const form = $("#formRecover");
  const alertBox = $("#alertBox");

  const stepPanels = $$(".se-step-panel");
  const stepDots = $$(".se-step");

  const correo = $("#correo");
  const btnSendCode = $("#btnSendCode");
  const btnVerifyCode = $("#btnVerifyCode");
  const btnResend = $("#btnResend");
  const btnBack1 = $("#btnBack1");

  const otpInputs = $$(".se-otp-in");
  const otpInvalid = $("#otpInvalid");

  const newPass = $("#newPass");
  const confirmPass = $("#confirmPass");
  const toggleNewPass = $("#toggleNewPass");
  const toggleConfirmPass = $("#toggleConfirmPass");

  const timerTxt = $("#timerTxt");
  const yearNow = $("#yearNow");
  yearNow.textContent = new Date().getFullYear();

  const rules = {
    len: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    lower: (v) => /[a-z]/.test(v),
    num: (v) => /[0-9]/.test(v),
    special: (v) => /[^A-Za-z0-9]/.test(v),
  };

  function isValidEmail(value){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  function isStrongPassword(value){
    return rules.len(value) && rules.upper(value) && rules.lower(value) && rules.num(value) && rules.special(value);
  }

  function setAlert(type, msg){
    alertBox.classList.remove("d-none", "alert-danger", "alert-warning", "alert-success");
    alertBox.classList.add(type === "success" ? "alert-success" : type === "warning" ? "alert-warning" : "alert-danger");
    alertBox.innerHTML = msg;
  }
  function clearAlert(){
    alertBox.classList.add("d-none");
    alertBox.innerHTML = "";
  }

  function setLoading(btn, isLoading){
    const txt = btn.querySelector(".se-btn-text");
    const load = btn.querySelector(".se-btn-loading");
    btn.disabled = isLoading;
    txt.classList.toggle("d-none", isLoading);
    load.classList.toggle("d-none", !isLoading);
  }

  function showStep(n){
    stepPanels.forEach(p => p.classList.toggle("d-none", p.getAttribute("data-step") !== String(n)));
    stepDots.forEach(d => d.classList.toggle("is-active", d.getAttribute("data-step-dot") === String(n)));
    clearAlert();
  }

  function updateRulesUI(){
    const v = newPass.value || "";
    document.querySelectorAll(".se-rule").forEach((el) => {
      const k = el.getAttribute("data-rule");
      const ok = rules[k](v);
      el.classList.toggle("is-ok", ok);
      el.querySelector("i").className = ok ? "bi bi-check2-circle" : "bi bi-dot";
    });
  }

  function getOtpValue(){
    return Array.from(otpInputs).map(i => i.value.trim()).join("");
  }

  // Password toggles
  toggleNewPass?.addEventListener("click", () => {
    const isPass = newPass.type === "password";
    newPass.type = isPass ? "text" : "password";
    toggleNewPass.querySelector("i").className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });

  toggleConfirmPass?.addEventListener("click", () => {
    const isPass = confirmPass.type === "password";
    confirmPass.type = isPass ? "text" : "password";
    toggleConfirmPass.querySelector("i").className = isPass ? "bi bi-eye-slash" : "bi bi-eye";
  });

  // OTP UX: auto focus + only digits
  otpInputs.forEach((inp, idx) => {
    inp.addEventListener("input", (e) => {
      inp.value = inp.value.replace(/\D/g, "").slice(0,1);
      otpInvalid.classList.add("d-none");
      if (inp.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });

    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && idx > 0) {
        otpInputs[idx - 1].focus();
      }
    });

    inp.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0,6);
      if (!text) return;
      text.split("").forEach((ch, i) => {
        if (otpInputs[i]) otpInputs[i].value = ch;
      });
      otpInputs[Math.min(text.length, 6) - 1]?.focus();
    });
  });

  // Timer 5:00 (simulado)
  let timer = null;
  let seconds = 300;

  function startTimer(){
    seconds = 300;
    timerTxt.textContent = "05:00";
    if (timer) clearInterval(timer);

    timer = setInterval(() => {
      seconds--;
      const m = String(Math.floor(seconds / 60)).padStart(2,"0");
      const s = String(seconds % 60).padStart(2,"0");
      timerTxt.textContent = `${m}:${s}`;

      if (seconds <= 0){
        clearInterval(timer);
        setAlert("warning", `<i class="bi bi-exclamation-triangle me-2"></i> El código expiró. Por favor reenviar.`);
      }
    }, 1000);
  }

  // STEP 1: send code
  btnSendCode.addEventListener("click", async () => {
    clearAlert();
    const emailVal = correo.value.trim();

    if (!isValidEmail(emailVal)){
      correo.classList.add("is-invalid");
      setAlert("danger", `<i class="bi bi-envelope-x me-2"></i> Ingrese un correo válido para continuar.`);
      return;
    }
    correo.classList.remove("is-invalid");

    setLoading(btnSendCode, true);

    // Aquí llamarás tu backend: /api/send-code (POST)
    // Simulación:
    setTimeout(() => {
      setLoading(btnSendCode, false);
      setAlert("success", `<i class="bi bi-send-check me-2"></i> Código enviado. Revise su correo.`);
      showStep(2);
      otpInputs[0].focus();
      startTimer();
    }, 650);
  });

  btnResend.addEventListener("click", () => {
    clearAlert();
    setAlert("success", `<i class="bi bi-arrow-repeat me-2"></i> Código reenviado (simulación).`);
    otpInputs.forEach(i => i.value = "");
    otpInputs[0].focus();
    startTimer();
  });

  btnBack1.addEventListener("click", () => {
    otpInputs.forEach(i => i.value = "");
    otpInvalid.classList.add("d-none");
    showStep(1);
  });

  // STEP 2: verify code
  btnVerifyCode.addEventListener("click", () => {
    clearAlert();
    const code = getOtpValue();

    if (code.length !== 6){
      otpInvalid.classList.remove("d-none");
      setAlert("danger", `<i class="bi bi-shield-exclamation me-2"></i> Ingrese el código completo (6 dígitos).`);
      return;
    }

    if (seconds <= 0){
      setAlert("warning", `<i class="bi bi-exclamation-triangle me-2"></i> El código expiró. Reenvíelo para continuar.`);
      return;
    }

    setLoading(btnVerifyCode, true);

    // Aquí verificarías en backend /api/verify-code (POST)
    // Simulación:
    setTimeout(() => {
      setLoading(btnVerifyCode, false);
      setAlert("success", `<i class="bi bi-shield-check me-2"></i> Código verificado correctamente.`);
      showStep(3);
      newPass.focus();
      updateRulesUI();
    }, 600);
  });

  // Step 3: password rules UI
  newPass?.addEventListener("input", () => {
    updateRulesUI();
    if (newPass.value.length > 0) newPass.classList.remove("is-invalid");
  });

  confirmPass?.addEventListener("input", () => {
    if (confirmPass.value.length > 0) confirmPass.classList.remove("is-invalid");
  });

  // Submit final
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearAlert();

    const p1 = newPass.value;
    const p2 = confirmPass.value;

    let ok = true;

    if (!isStrongPassword(p1)){
      newPass.classList.add("is-invalid");
      ok = false;
      updateRulesUI();
    } else {
      newPass.classList.remove("is-invalid");
    }

    if (p1 !== p2 || !p2){
      confirmPass.classList.add("is-invalid");
      ok = false;
    } else {
      confirmPass.classList.remove("is-invalid");
    }

    if (!ok){
      setAlert("danger", `<i class="bi bi-x-octagon me-2"></i> Verifique la nueva contraseña antes de continuar.`);
      return;
    }

    const btnResetPass = $("#btnResetPass");
    setLoading(btnResetPass, true);

    // Aquí enviarías al backend /api/reset-password (POST)
    setTimeout(() => {
      setLoading(btnResetPass, false);
      setAlert("success", `<i class="bi bi-check2-circle me-2"></i> Contraseña actualizada (simulación). Ya puede iniciar sesión.`);
      // Opcional: redirigir:
      // window.location.href = "login.html";
    }, 700);
  });

  // init
  showStep(1);
  updateRulesUI();
})();
