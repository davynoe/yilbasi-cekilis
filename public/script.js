const joinButton = document.getElementById("joinButton");
const revealSection = document.getElementById("revealSection");
const authForm = document.getElementById("authForm");
const signupAction = document.getElementById("signupAction");
const loginAction = document.getElementById("loginAction");
const statusEl = document.getElementById("status");

function generateSnowGradient() {
  const density = 35;
  const size = 400;
  const gradients = [];
  for (let i = 0; i < density; i += 1) {
    const v = Math.floor(Math.random() * 4) + 2; // 2-5px
    const a = Math.random() * 0.5 + 0.5; // 0.5 - 1.0 opacity
    const x = Math.floor(Math.random() * (size - v * 2) + v);
    const y = Math.floor(Math.random() * (size - v * 2) + v);
    gradients.push(
      `radial-gradient(${v}px ${v}px at ${x}px ${y}px, rgba(255,255,255,${a}) 50%, rgba(0,0,0,0))`
    );
  }
  return gradients.join(",");
}

// Apply snow gradient to root
document.documentElement.style.setProperty("--snow-grad", generateSnowGradient());

const toggleReveal = () => {
  if (!revealSection) return;
  // Animate join button out
  joinButton.classList.add("fade-out");
  joinButton.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    joinButton.classList.add("hidden-btn");
  }, 260);

  revealSection.classList.remove("hidden");
  revealSection.classList.add("visible");
};

joinButton.addEventListener("click", toggleReveal);

async function handleSubmit(url, payload, { onSuccess } = {}) {
  statusEl.textContent = "Çalışıyor...";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Bir şeyler ters gitti.");
    }

    statusEl.textContent = data.message;
    statusEl.style.color = "#66d4ff";
    if (onSuccess) onSuccess(data);
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.style.color = "#ff9b9b";
  }
}

function getFormData() {
  const formData = new FormData(authForm);
  return {
    username: formData.get("username"),
    surname: formData.get("surname"),
    password: formData.get("password"),
  };
}

signupAction.addEventListener("click", () => {
  const payload = getFormData();
  handleSubmit("/api/signup", payload);
});

loginAction.addEventListener("click", () => {
  const payload = getFormData();
  handleSubmit(
    "/api/login",
    payload,
    {
      onSuccess: (data) => {
        const role = data.role || "user";
        localStorage.setItem("giveaway-role", role);
        localStorage.setItem("giveaway-username", payload.username);
        localStorage.setItem("giveaway-surname", payload.surname);
        // Clear any stale matches cache when logging in as a user.
        localStorage.removeItem("giveaway-matches");
        statusEl.textContent = "Giriş başarılı. Üyeler yükleniyor...";
        setTimeout(() => {
          window.location.href = "/members.html";
        }, 400);
      },
    }
  );
});

// Close modal when clicking outside the card.
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    hideModal();
  }
});

