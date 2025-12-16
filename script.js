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

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  isAdmin = user && user.email === "admin@diskobre.com";

  // Update dashboard greeting
const userNameEl = document.getElementById("userName");
if (userNameEl && user) {
  const nickname = localStorage.getItem("nickname") || "User";
  userNameEl.innerText = nickname;
} 
  // SHOW FRIENDLY CLAIM REMINDER
  const reminder = document.getElementById("claimReminder");
  if (reminder) {
    reminder.style.display = user ? "block" : "none";
  }
  
  // Protect admin page
  if (window.location.pathname.includes("admin.html") && !isAdmin) {
    window.location = "login.html";
    return;
  }

  // USER DASHBOARD
  if (document.getElementById("lostItemsList")) {
    renderItems("lost_items", "lostItemsList", false);
  }

  if (document.getElementById("foundItemsList")) {
    renderItems("found_items", "foundItemsList", false);
  }

  // ADMIN DASHBOARD (plain view — all items)
  if (isAdmin && document.getElementById("adminActiveLost")) {
    renderItems("lost_items", "adminActiveLost", true);
    renderItems("found_items", "adminActiveFound", true);
  }
});




/* ================= SIGN UP ================= */

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = document.getElementById("nickname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(database, "users/" + userCred.user.uid), { nickname, email });

    alert("Account created!");
    window.location = "login.html";
  });
}

/* ================= LOGIN (FIXED) ================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);

      let nickname = "User";

      // Safely fetch nickname (admin may not have a record)
      const snap = await get(ref(database, "users/" + userCred.user.uid));
      if (snap.exists()) {
        nickname = snap.val().nickname;
      }

      localStorage.setItem("nickname", nickname);

      // Redirect
      if (email === "admin@diskobre.com") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (error) {
      alert("Login failed: " + error.message);
    }
  });
}

/* ================= LOGOUT ================= */

window.logout = async () => {
  await signOut(auth);
  localStorage.clear();
  window.location = "index.html";
};

/* ================= SUBMISSIONS ================= */

document.addEventListener("DOMContentLoaded", () => {

  const lostForm = document.getElementById("lostForm");
  if (lostForm) {
    lostForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const userId = auth.currentUser ? auth.currentUser.uid : "guest";
        const data = await collectItemData("lost_items");

        await push(ref(database, `lost_items/${userId}`), {
          ...data,
          status: "active"
        });

        alert("Lost item submitted!");
        lostForm.reset();
      } catch (err) {
        console.error(err);
        alert("Submission failed");
      }
    });
  }

  const foundForm = document.getElementById("foundForm");
  if (foundForm) {
    foundForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const userId = auth.currentUser ? auth.currentUser.uid : "guest";
        const data = await collectItemData("found_items");

        await push(ref(database, `found_items/${userId}`), {
          ...data,
          status: "active"
        });

        alert("Found item submitted!");
        foundForm.reset();
      } catch (err) {
        console.error(err);
        alert("Submission failed");
      }
    });
  }

});

 /* ================= VIEW ITEMS (USER) ================= */

if (document.getElementById("lostItemsList")) {
  renderItems("lost_items", "lostItemsList", false);
}

if (document.getElementById("foundItemsList")) {
  renderItems("found_items", "foundItemsList", false);
}


  /* ================= ADMIN PANEL ================= */

  renderItems("lost_items", "adminLostItems", true);
  renderItems("found_items", "adminFoundItems", true);
});

/* ================= HELPERS ================= */

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
    name: itemNameEl?.value.trim() || "",
    description: descriptionEl?.value.trim() || "",
    location: locationEl?.value.trim() || "",
    nickname: nicknameEl?.value.trim() || "Anonymous",
    contact: contactEl?.value.trim() || "N/A",
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

        if (item.status && item.status !== "active") {
          div.style.opacity = "0.45";
        }

        div.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <p><strong>Location:</strong> ${item.location}</p>
          <p><strong>Reporter:</strong> ${item.nickname}</p>
          <p><strong>Contact:</strong> ${item.contact}</p>
          ${item.photo ? `<img src="${item.photo}" width="120">` : ""}

          ${
            adminMode && item.status === "active"
              ? `
              <button onclick="markReturned('${path}','${userNode.key}','${itemSnap.key}')">
                Mark Returned
              </button>
              <button onclick="deleteItem('${path}','${userNode.key}','${itemSnap.key}')">
                Delete
              </button>
            `
              : ""
          }

          ${
            !adminMode &&
            currentUser &&
            currentUser.uid === userNode.key &&
            item.status === "active"
              ? `
              <button onclick="userMarkReturned('${path}','${userNode.key}','${itemSnap.key}')">
                ${path === "lost_items" ? "Mark as Found" : "Mark as Claimed"}
              </button>
            `
              : ""
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
  await update(ref(database, `${path}/${userId}/${itemId}`), {
    returned: true
  });
  alert("Item marked as returned.");
};

/* ================= USER ACTIONS ================= */
window.userMarkReturned = async (path, userId, itemId) => {
  await update(ref(database, `${path}/${userId}/${itemId}`), {
    status: "returned"
  });

  alert("Item marked as returned.");
};
