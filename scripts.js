let expanded = false;

const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwXXLUPOStUqeqaP9jtGlr7aTcIuyNkVG-Z9One5i_EjoCBWMQMb46aandP92lj9s8Ilw/exec";

// 2. google.script.run ki jagah ye naya function banayein
async function callBackend(action, payload = {}) {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    body: JSON.stringify({ action: action, payload: payload })
  });
  return await response.json();
}

function toggleChapters() {
  const items = document.querySelectorAll('.chapter-item');
  const btn = document.querySelector('.view-all');

  expanded = !expanded;

  items.forEach((item, index) => {
    if (index >= 5) {

      if (expanded) {
        // SHOW
        item.classList.remove('hidden');
        setTimeout(() => {
          item.classList.remove('fade-out');
          item.classList.add('show');
        }, 10);

      } else {
        // HIDE WITH ANIMATION
        item.classList.remove('show');
        item.classList.add('fade-out');

        setTimeout(() => {
          item.classList.add('hidden');
        }, 300); // match CSS timing
      }

    }
  });

  btn.innerText = expanded 
    ? "છુપાવો" 
    : "બધા 35 ચેપ્ટર્સ જુઓ";
}

/* INITIAL */
document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll('.chapter-item');

  items.forEach((item, index) => {
    if (index >= 5) {
      item.classList.add('hidden');
    }
  });
});

function openCheckout() {
  const landing = document.getElementById("landing-page");
  const checkout = document.getElementById("checkout-page");

  // 1. Sabhi pages se active class hatao aur hidden add karo
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active", "fade-up");
    p.classList.add("hidden");
  });

  // 2. Checkout page ko setup karo
  checkout.classList.remove("hidden");
  checkout.classList.add("active");

  // 3. Animation restart karne ke liye trick
  void checkout.offsetWidth; 
  checkout.classList.add("fade-up");

  updateStickyCTA();
  window.scrollTo(0, 0);
}

function closeCheckout() {
  const landing = document.getElementById("landing-page");

  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active", "fade-up");
    p.classList.add("hidden");
  });

  landing.classList.remove("hidden");
  landing.classList.add("active");

  void landing.offsetWidth;
  landing.classList.add("fade-up");

  updateStickyCTA();
  window.scrollTo(0, 0);
}

// closeLogin mein bhi same yahi closeCheckout wala logic call kar sakte hain 
// ya dono ko ek hi common function "showLanding()" bana kar de sakte hain.
function closeLogin() {
  closeCheckout(); 
}

function showMessage(text, type) {
  const box = document.getElementById("formMessage");
  box.innerText = text;
  box.className = "form-message " + type;
  box.style.display = "block";
}

function clearMessage() {
  const box = document.getElementById("formMessage");
  box.style.display = "none";
}

function startPayment() {
  const name = document.querySelector('input[type="text"]').value.trim();
  const email = document.querySelector('input[type="email"]').value.trim();

  clearMessage();

  // 1. EMPTY CHECK
  if (!name || !email) {
    showMessage("Please enter your full name and email", "error");
    return;
  }

  // 2. FORMAT CHECK
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showMessage("Invalid email format", "error");
    return;
  }

  // 3. TYPO CHECK (smart)
  const domain = email.split("@")[1];
  const suggestions = {
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "yaho.com": "yahoo.com",
    "outlok.com": "outlook.com"
  };

  if (suggestions[domain]) {
    showMessage(`Did you mean ${email.replace(domain, suggestions[domain])}?`, "error");
    return;
  }

  // 4. FAKE EMAIL BLOCK
  const blocked = ["tempmail", "10min", "mailinator", "fake"];
  if (blocked.some(b => email.includes(b))) {
    showMessage("Temporary emails are not allowed", "error");
    return;
  }

  // 🔥 5. DUPLICATE PURCHASE CHECK
  showMessage("Checking account status...", "success");

  // YAHAN BADLAV HAI: callBackend function ka use
  callBackend("checkAccess", { email: email })
    .then(res => {
      // Chonki Apps Script se object {hasAccess: true/false} aayega
      if (res && res.hasAccess === true) {
        showMessage("You already have access! Opening your dashboard...", "success");
        
        // Header reset
        const loginNav = document.getElementById("loginNavBtn");
        const logoutNav = document.getElementById("logoutNavBtn");
        if(loginNav) loginNav.classList.add("hidden");
        if(logoutNav) logoutNav.classList.remove("hidden");

        setTimeout(() => {
          showPage("dashboard-page");
        }, 1500);
      } else {
        // Naya user hai
        showMessage("Redirecting to secure payment...", "success");
        openRazorpay(name, email);
      }
    })
    .catch(err => {
      // Server error par safety ke liye payment open kar dena behtar hai
      console.error("Check Access Error:", err);
      openRazorpay(name, email);
    });
}

function openRazorpay(name, email) {
  if (typeof Razorpay === "undefined") {
    showMessage("Payment system failed to load. Please refresh.", "error");
    return;
  }

  showMessage("Generating Order...", "success");

  // Backend se Key aur Order details mangwana
  callBackend("getCheckoutDetails").then(data => {
    var options = {
      "key": data.rzpKey, // Backend se aayi key
      "amount": data.amount, // Backend se aaya amount
      "currency": "INR",
      "name": "Mission 1 Crore",
      "description": "365 Days Blueprint Ebook",
      "order_id": data.order_id, // Backend se aaya order id
      "prefill": { "name": name, "email": email },
      "theme": { "color": "#d59e15" },
      "handler": function (response) {
        verifyUserPayment(response, name, email);
      },
      "modal": {
        "ondismiss": function() {
          showMessage("Payment cancelled", "error");
        }
      }
    };
    var rzp = new Razorpay(options);
    rzp.open();
  }).catch(err => {
    console.error("Checkout Error:", err);
    showMessage("Failed to start payment. Try again.", "error");
  });
}

function verifyUserPayment(response, name, email) {
  showMessage("Verifying payment...", "success");

  callBackend("verifyPayment", {
    order_id: response.razorpay_order_id,
    payment_id: response.razorpay_payment_id,
    signature: response.razorpay_signature,
    name: name,
    email: email
  }).then(res => {
    if (res && res.success === true) {
      showMessage("Payment verified! Opening your dashboard... 🎉", "success");
      
      // Header reset
      document.getElementById("loginNavBtn").classList.add("hidden");
      document.getElementById("logoutNavBtn").classList.remove("hidden");

      setTimeout(() => {
        showPage("dashboard-page");
      }, 1500);
    } else {
      let msg = (res && res.message) ? res.message : "Verification failed";
      showMessage("Error: " + msg + " ❌", "error");
    }
  }).catch(err => {
    console.error("Verify Error:", err);
    showMessage("Server error during verification ❌", "error");
  });
}

function loginUser() {
  const emailInput = document.getElementById("loginEmail");
  const email = emailInput.value.trim();
  const btn = document.querySelector(".login-btn");

  if (!email) {
    showLoginMessage("Please enter your email address", "error");
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showLoginMessage("Invalid email format", "error");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Verifying Access...";
  showLoginMessage("Checking our records, please wait...", "success");

  // Backend check call
  callBackend("checkAccess", { email: email }).then(res => {
    btn.disabled = false;
    btn.innerText = "Access My Ebook";
    
    if (res && res.hasAccess === true) {
      showLoginMessage("Access Granted! Opening Dashboard...", "success");
      
      // Header Buttons Switch
      document.getElementById("loginNavBtn").classList.add("hidden");
      document.getElementById("logoutNavBtn").classList.remove("hidden");
      
      showPage("dashboard-page"); 
    } else {
      showLoginMessage("No purchase found for this email ❌", "error");
    }
  }).catch(err => {
    btn.disabled = false;
    btn.innerText = "Access My Ebook";
    showLoginMessage("Server Error. Please refresh and try again.", "error");
  });
}

function openLogin() {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.add("hidden");
    p.classList.remove("active", "fade-up");
  });

  const loginPage = document.getElementById("login-page");
  if (loginPage) {
    loginPage.classList.remove("hidden");
    loginPage.classList.add("active");
    void loginPage.offsetWidth;
    loginPage.classList.add("fade-up");
  }

  updateStickyCTA();
  window.scrollTo(0, 0);
}

// Helper to show message in the card (exactly like payment card)
function showLoginMessage(text, type) {
  const box = document.getElementById("loginMessage");
  box.innerText = text;
  box.className = "form-message " + type;
  box.style.display = "block";
}

// Common function to switch pages
function showPage(pageId) {
  // 1. Pehle sabhi pages ko hide karo
  const allPages = document.querySelectorAll(".page");
  allPages.forEach(p => {
    p.classList.add("hidden");
    p.classList.remove("active", "fade-up");
  });

  // 2. Target page ko dhoondo
  const target = document.getElementById(pageId);
  
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
    
    // 3. Animation restart (Ye zaroori hai)
    void target.offsetWidth; 
    target.classList.add("fade-up");
    
    // 4. CTA button handle karein
    updateStickyCTA();
    window.scrollTo(0, 0);
    
    console.log("Successfully switched to: " + pageId);
  } else {
    console.error("Page ID not found: " + pageId);
  }
}

// 1. Jab Logout button click ho (Sirf modal dikhao)
function logout() {
  const modal = document.getElementById("logoutModal");
  modal.classList.remove("hidden");
}

// 2. Agar user Cancel kare
function closeLogoutModal() {
  document.getElementById("logoutModal").classList.add("hidden");
}

// 3. Agar user 'Yes, Logout' par click kare (Asli Logout logic)
function confirmLogout() {
  // Modal chhupao
  closeLogoutModal();

  // Header Buttons Reset
  const loginNav = document.getElementById("loginNavBtn");
  const logoutNav = document.getElementById("logoutNavBtn");
  if(loginNav) loginNav.classList.remove("hidden");
  if(logoutNav) logoutNav.classList.add("hidden");
  
  // Inputs clear karo
  const emailInput = document.getElementById("loginEmail");
  if(emailInput) emailInput.value = "";
  
  // Landing Page par bhejo
  showPage("landing-page");
  
  console.log("Custom logout successful.");
}

function updateStickyCTA() {

  const landing = document.getElementById("landing-page");
  const cta = document.getElementById("stickyCTA");

  if (!cta) return;

  if (!landing.classList.contains("hidden")) {
    cta.style.display = "block";
  } else {
    cta.style.display = "none";
  }
}

function startDownloadProcess() {
  const btn = document.getElementById("downloadBtn");
  
  // 1. Visual Feedback
  btn.innerText = "⏳ E-Book Downloading...";
  btn.disabled = true;

  // 2. 🔥 Sabse Stable Download Link (Bade files ke liye)
  // Isse Google Drive ka preview page khulega jahan se 100% download hoga
  const fileId = "14qrXGhCMvb8yAOXchXDtusQ0EpbVN1Q5";
  const downloadUrl = "https://drive.google.com/uc?id=" + fileId + "&export=download";
  
  // Naya Tab khol kar download start karein taaki main page na ruke
  window.open(downloadUrl, '_blank');

  // 3. Reset Button after 5 seconds
  setTimeout(() => {
    btn.innerText = "📥 Download E-Book (PDF)";
    btn.disabled = false;
  }, 5000);
}

// Is function ko apne scripts.html mein add karein
function startDropboxDownload() {
  const btn = document.getElementById("downloadBtn");
  const msg = document.getElementById("downloadMsg");
  
  // 1. User Feedback
  btn.innerText = "⏳ E-Book Downloading...";
  btn.disabled = true;
  if(msg) msg.innerText = "Connecting to secure server...";

  // 2. 🔥 Dropbox Direct Link (dl=1)
  // Yahan apna asli Dropbox link dalein (aakhir mein dl=1 ke saath)
  const dropboxLink = "https://www.dropbox.com/scl/fi/nzvjo5so0w2vcioxmskrt/365-1-_compressed.pdf?rlkey=ccyoh4yzjllzlehyf7sn0xg9q&st=lxav8un0&dl=1";

  // Hidden link create karke click karwana (Secure method)
  const a = document.createElement("a");
  a.href = dropboxLink;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 3. Reset Button after 5 seconds
  setTimeout(() => {
    btn.innerText = "📥 Download E-Book (PDF)";
    btn.disabled = false;
    if(msg) msg.innerText = "Download started successfully! ✅";
  }, 5000);
}

document.addEventListener("DOMContentLoaded", updateStickyCTA);

// 1. Apna Apps Script URL yahan dalein


