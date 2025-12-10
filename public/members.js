const membersList = document.getElementById("membersList");
const memberCount = document.getElementById("memberCount");
const membersStatus = document.getElementById("membersStatus");
const matchButton = document.getElementById("matchButton");
const assignmentText = document.getElementById("assignmentText");
const assignmentCard = document.querySelector(".assignment-card");
const actionsCard = document.querySelector(".actions-card");
let currentMembers = [];
let pairsMap = [];

async function loadMembers() {
  membersStatus.textContent = "Katılımcılar yükleniyor...";
  try {
    const res = await fetch("/api/members");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Katılımcılar yüklenemedi.");
    }

    currentMembers = data.members || [];
    memberCount.textContent = `${currentMembers.length} kişi katıldı`;
    membersList.innerHTML = "";

    if (!currentMembers.length) {
      membersStatus.textContent = "Henüz katılım yok. İlk sen katıl!";
      return;
    }

    renderMembersList();

    membersStatus.textContent = "";
  } catch (error) {
    membersStatus.textContent = error.message;
    membersStatus.style.color = "#ff9b9b";
  }
}

loadMembers();

function isSuperuser() {
  const isAdmin = localStorage.getItem("giveaway-role") === "superuser";
  if (isAdmin) {
    document.body.classList.add("role-superuser");
  } else {
    document.body.classList.remove("role-superuser");
  }
  return isAdmin;
}

function getUserIdentity() {
  return {
    username: localStorage.getItem("giveaway-username") || "",
    surname: localStorage.getItem("giveaway-surname") || "",
  };
}

function renderMembersList() {
  membersList.innerHTML = "";
  const isAdmin = isSuperuser();
  currentMembers.forEach(({ username, surname }) => {
    const li = document.createElement("li");
    const fullName = `${username} ${surname}`;
    if (isAdmin) {
      const match = pairsMap.find((p) => p.giver === fullName);
      li.textContent = match ? `${fullName} ➜ ${match.receiver}` : `${fullName} ➜ ?`;
    } else {
      li.textContent = fullName;
    }
    membersList.appendChild(li);
  });
}

function setPairs(pairs) {
  pairsMap = pairs || [];
  renderMembersList();
}

async function loadPairsFromServer() {
  membersStatus.textContent = "Eşleşmeler yükleniyor...";
  try {
    const res = await fetch("/api/matches");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Eşleşmeler yüklenemedi.");
    }
    setPairs(data.pairs || []);
    localStorage.setItem("giveaway-matches", JSON.stringify(data.pairs || []));
    membersStatus.textContent = "";
  } catch (error) {
    membersStatus.textContent = error.message;
    membersStatus.style.color = "#ff9b9b";
  }
}

async function runMatch() {
  membersStatus.textContent = "Eşleştiriliyor...";
  try {
    const res = await fetch("/api/match", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Eşleştirme yapılamadı.");
    }
    setPairs(data.pairs || []);
    localStorage.setItem("giveaway-matches", JSON.stringify(data.pairs || []));
    membersStatus.textContent = "Eşleşmeler oluşturuldu.";
  } catch (error) {
    membersStatus.textContent = error.message;
    membersStatus.style.color = "#ff9b9b";
  }
}

function restorePairs() {
  const stored = localStorage.getItem("giveaway-matches");
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      setPairs(parsed);
    }
  } catch (err) {
    // ignore parse errors
  }
}

if (isSuperuser()) {
  if (assignmentCard) {
    assignmentCard.classList.add("hidden");
  }
  if (actionsCard) {
    actionsCard.classList.remove("hidden");
  }
  matchButton.classList.remove("hidden");
  matchButton.addEventListener("click", runMatch);
  // Try server first for existing persisted matches; fallback to local cache.
  loadPairsFromServer().catch(restorePairs);
} else {
  matchButton.remove();
  if (actionsCard) {
    actionsCard.remove();
  }
}

async function loadMyAssignment() {
  const { username, surname } = getUserIdentity();
  if (!username || !surname) return;
  assignmentText.textContent = "Hediyeleşme eşin aranıyor...";
  try {
    const res = await fetch(
      `/api/my-match?username=${encodeURIComponent(username)}&surname=${encodeURIComponent(
        surname
      )}`
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Henüz bir eşleşme yok.");
    }
    assignmentText.textContent = `Hediye alacağın kişi: ${data.receiver}`;
  } catch (error) {
    assignmentText.textContent = error.message;
    assignmentText.style.color = "#ff9b9b";
  }
}

if (!isSuperuser()) {
  loadMyAssignment();
} else {
  assignmentText.textContent = "Eşleşmeleri görmek için Eşleştir'e bas.";
}

