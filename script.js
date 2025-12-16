import { auth, database, storage } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  ref,
  set,
  push,
  get,
  onValue,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

import {
  ref as sRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* ================= AUTH ================= */

let currentUser = null;
let isAdmin = false;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin = user && user.email === "admin@diskobre.com";

    // Only update dashboard greeting if user is logged in
  const userNameEl = document.getElementById("userName");
  if (user && userNameEl) {
    try {
      const snap = await get(ref(database, "users/" + user.uid));
      const nickname = snap.exists() ? snap.val().nickname : "User";
      localStorage.setItem("nickname", nickname);
      userNameEl.innerText = nickname;  // ✅ This updates the greeting properly
    } catch {
      userNameEl.innerText = "User";
    }
  }
});
  const path = window.location.pathname;

  // Protect pages
  if (!user && path.includes("dashboard.html")) window.location = "login.html";
  if (path.includes("admin.html") && !isAdmin) window.location = "login.html";

  // Update dashboard greeting
  const userNameEl = document.getElementById("userName");
  if (userNameEl && user) {
    // Try to fetch nickname from database
    try {
      const snap = await get(ref(database, "users/" + user.uid));
      const nickname = snap.exists() ? snap.val().nickname : "User";
      localStorage.setItem("nickname", nickname);
      userNameEl.innerText = nickname;
    } catch {
      userNameEl.innerText = "User";
    }
  }

  // Show claim reminder
  const reminder = document.getElementById("claimReminder");
  if (reminder) reminder.style.display = user ? "block" : "none";

  // Render items
  if (document.getElementById("lostItemsList") && user) renderItems("lost_items", "lostItemsList", false);
  if (document.getElementById("foundItemsList") && user) renderItems("found_items", "foundItemsList", false);

  if (isAdmin && document.getElementById("adminLostItems")) {
    renderItems("lost_items", "adminLostItems", true);
    renderItems("found_items", "adminFoundItems", true);
  }
});

/* ================= SIGN UP ================= */

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = document.getElementById("nickname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(database, "users/" + userCred.user.uid), { nickname, email });
      alert("Account created!");
      window.location = "login.html";
    } catch (err) {
      alert("Signup failed: " + err.message);
    }
  });
}

/* ================= LOGIN ================= */

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      // fetch nickname
      const snap = await get(ref(database, "users/" + userCred.user.uid));
      const nickname = snap.exists() ? snap.val().nickname : "User";
      localStorage.setItem("nickname", nickname);

      // redirect
      if (email === "admin@diskobre.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (err) {
      alert("Login failed: " + err.message);
    }
  });
}

/* ================= LOGOUT ================= */

window.logout = async () => {
  try {
    await signOut(auth);
    localStorage.clear();
    window.location = "index.html";
  } catch (err) {
    alert("Logout failed: " + err.message);
  }
};

/* ================= ITEM SUBMISSION ================= */

document.addEventListener("DOMContentLoaded", () => {
  const lostForm = document.getElementById("lostForm");
  if (lostForm) lostForm.addEventListener("submit", submitItem.bind(null, "lost_items", lostForm));

  const foundForm = document.getElementById("foundForm");
  if (foundForm) foundForm.addEventListener("submit", submitItem.bind(null, "found_items", foundForm));
});

async function submitItem(path, form, e) {
  e.preventDefault();
  if (!currentUser) return alert("Please login first.");

  try {
    const userId = currentUser.uid;
    const data = await collectItemData(path);
    await push(ref(database, `${path}/${userId}`), { ...data, status: "active" });
    alert("Item submitted!");
    form.reset();
  } catch (err) {
    console.error(err);
    alert("Submission failed: " + err.message);
  }
}

/* ================= HELPER: collectItemData ================= */

async function collectItemData(folder) {
  const itemNameEl = document.getElementById("itemName");
  const descriptionEl = document.getElementById("description");
  const locationEl = document.getElementById("location");
  const nicknameEl = document.getElementById("nickname");
  const contactEl = document.getElementById("contact");
  const leftWithGuardEl = document.getElementById("leftWithGuard");
  const photoEl = document.getElementById("itemPhoto");

  let photoURL = "";
  if (photoEl && photoEl.files.length > 0) {
    const file = photoEl.files[0];
    const imgRef = sRef(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(imgRef, file);
    photoURL = await getDownloadURL(imgRef);
  }

  return {
    name: itemNameEl?.value || "",
    description: descriptionEl?.value || "",
    location: locationEl?.value || "",
    nickname: nicknameEl?.value || "Anonymous",
    contact: contactEl?.value || "N/A",
    leftWithGuard: leftWithGuardEl?.checked || false,
    photo: photoURL,
    timestamp: Date.now()
  };
}

/* ================= RENDER ITEMS ================= */

function renderItems(path, containerId, adminMode = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  onValue(ref(database, path), (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach((userNode) => {
      userNode.forEach((itemSnap) => {
        const item = itemSnap.val();
        if (!item) return;

        const div = document.createElement("div");
        div.className = "itemCard";

        div.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <p><strong>Location:</strong> ${item.location}</p>
          <p><strong>Reporter:</strong> ${item.nickname}</p>
          <p><strong>Contact:</strong> ${item.contact}</p>
          ${item.photo ? `<img src="${item.photo}" width="120">` : ""}
          ${
            adminMode ? `
            <button onclick="deleteItem('${path}','${userNode.key}','${itemSnap.key}')">Delete</button>
            <button onclick="markReturned('${path}','${userNode.key}','${itemSnap.key}')">Mark Returned</button>
          ` : ""
          }
          <hr>
        `;
        container.appendChild(div);
      });
    });
  });
}

/* ================= ADMIN ACTIONS ================= */

window.deleteItem = async (path, userId, itemId) => {
  if (!confirm("Delete this item?")) return;
  await remove(ref(database, `${path}/${userId}/${itemId}`));
};

window.markReturned = async (path, userId, itemId) => {
  await update(ref(database, `${path}/${userId}/${itemId}`), { returned: true });
  alert("Item marked as returned.");
};
