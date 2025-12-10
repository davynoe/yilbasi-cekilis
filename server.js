const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const USER_FILE = path.join(DATA_DIR, "users.txt");
const SUPERUSER_FILE = path.join(DATA_DIR, "superusers.txt");
const MATCH_FILE = path.join(DATA_DIR, "matches.txt");

app.use(cors());
app.use(express.json());

// In-memory demo store; replace with a real database for production use.
const users = [];
const superusers = [];
let matches = [];

const findUserByUsername = (username) =>
  users.find((user) => user.username.toLowerCase() === username.toLowerCase());

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USER_FILE)) {
    fs.writeFileSync(USER_FILE, "", "utf8");
  }
  if (!fs.existsSync(SUPERUSER_FILE)) {
    fs.writeFileSync(SUPERUSER_FILE, "", "utf8");
  }
  if (!fs.existsSync(MATCH_FILE)) {
    fs.writeFileSync(MATCH_FILE, "", "utf8");
  }
}

function loadUsersFromFile() {
  ensureDataFile();
  const content = fs.readFileSync(USER_FILE, "utf8");
  content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [username, surname, password] = line.split(",").map((v) => v?.trim());
      if (username && surname && password) {
        users.push({ username, surname, password });
      }
    });
}

function loadSuperusersFromFile() {
  ensureDataFile();
  const content = fs.readFileSync(SUPERUSER_FILE, "utf8");
  content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [username, surname, password] = line.split(",").map((v) => v?.trim());
      if (username && surname && password) {
        superusers.push({ username, surname, password });
      }
    });
}

function persistUser({ username, surname, password }) {
  ensureDataFile();
  const line = `${username},${surname},${password}\n`;
  fs.appendFile(USER_FILE, line, (err) => {
    if (err) {
      console.error("Failed to persist user:", err);
    }
  });
}

function loadMatchesFromFile() {
  ensureDataFile();
  const content = fs.readFileSync(MATCH_FILE, "utf8");
  matches = [];
  content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      // giverUsername,giverSurname|receiverUsername,receiverSurname
      const [giverPart, receiverPart] = line.split("|");
      if (!giverPart || !receiverPart) return;
      const [gUser, gSurname] = giverPart.split(",").map((v) => v?.trim());
      const [rUser, rSurname] = receiverPart.split(",").map((v) => v?.trim());
      if (gUser && gSurname && rUser && rSurname) {
        matches.push({
          giver: { username: gUser, surname: gSurname },
          receiver: { username: rUser, surname: rSurname },
        });
      }
    });
}

function persistMatches(list) {
  ensureDataFile();
  const lines = list.map(
    ({ giver, receiver }) =>
      `${giver.username},${giver.surname}|${receiver.username},${receiver.surname}`
  );
  fs.writeFile(MATCH_FILE, lines.join("\n"), (err) => {
    if (err) console.error("Failed to persist matches:", err);
  });
}

loadUsersFromFile();
loadSuperusersFromFile();
loadMatchesFromFile();

app.post("/api/signup", (req, res) => {
  const { username, surname, password } = req.body || {};

  if (!username || !surname || !password) {
    return res.status(400).json({ error: "Kullanıcı adı, soyadı ve şifre gerekli." });
  }

  if (findUserByUsername(username)) {
    return res.status(409).json({ error: "Bu kullanıcı adı zaten var." });
  }

  const record = { username, surname, password };
  users.push(record);
  persistUser(record);
  return res.status(201).json({ message: "Kayıt başarılı. Çekilişe hoş geldin!" });
});

app.post("/api/login", (req, res) => {
  const { username, surname, password } = req.body || {};

  if (!username || !surname || !password) {
    return res.status(400).json({ error: "Kullanıcı adı, soyadı ve şifre gerekli." });
  }

  const superuser = superusers.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.surname.toLowerCase() === surname.toLowerCase()
  );

  if (superuser && superuser.password === password) {
    return res.json({ message: `Tekrar hoş geldin, ${superuser.username}!`, role: "superuser" });
  }

  const user = users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.surname.toLowerCase() === surname.toLowerCase()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Kullanıcı adı, soyadı veya şifre hatalı." });
  }

  return res.json({ message: `Tekrar hoş geldin, ${user.username}!`, role: "user" });
});

app.get("/api/members", (_req, res) => {
  // Only expose public fields
  const list = users.map(({ username, surname }) => ({ username, surname }));
  return res.json({ members: list });
});

app.post("/api/match", (_req, res) => {
  if (users.length < 2) {
    return res.status(400).json({ error: "Eşleşme için en az 2 katılımcı gerekli." });
  }

  const shuffled = [...users];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Rotate by one to avoid self-pairing after shuffle.
  const rotated = shuffled.slice(1).concat(shuffled[0]);

  matches = shuffled.map((giver, idx) => ({
    giver: { username: giver.username, surname: giver.surname },
    receiver: { username: rotated[idx].username, surname: rotated[idx].surname },
  }));

  persistMatches(matches);

  const responsePairs = matches.map(({ giver, receiver }) => ({
    giver: `${giver.username} ${giver.surname}`,
    receiver: `${receiver.username} ${receiver.surname}`,
  }));

  return res.json({ pairs: responsePairs });
});

app.get("/api/matches", (_req, res) => {
  const responsePairs = matches.map(({ giver, receiver }) => ({
    giver: `${giver.username} ${giver.surname}`,
    receiver: `${receiver.username} ${receiver.surname}`,
  }));
  return res.json({ pairs: responsePairs });
});

app.get("/api/my-match", (req, res) => {
  const { username, surname } = req.query || {};
  if (!username || !surname) {
    return res.status(400).json({ error: "Kullanıcı adı ve soyadı gerekli." });
  }

  const match = matches.find(
    ({ giver }) =>
      giver.username.toLowerCase() === username.toLowerCase() &&
      giver.surname.toLowerCase() === surname.toLowerCase()
  );

  if (!match) {
    return res.status(404).json({ error: "Henüz bir eşleşme yok." });
  }

  return res.json({
    receiver: `${match.receiver.username} ${match.receiver.surname}`,
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`New Years Giveaway server running at http://localhost:${PORT}`);
});

