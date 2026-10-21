
"use strict";

/* =========================================
   COFFEE CORNER - LOCAL AUTHENTICATION DEMO
   ========================================= */

const USERS_KEY = "coffeeCornerUsers";
const SESSION_KEY = "coffeeCornerSession";

/* Get registered users */

function getUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(USERS_KEY));
        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

/* Save registered users */

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/* Find user by email */

function findUserByEmail(email) {
    const normalizedEmail = email.trim().toLowerCase();

    return getUsers().find(
        user => user.email === normalizedEmail
    );
}

/* Hash password using PBKDF2 */

async function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error(
            "Secure password hashing is unavailable. Open this site using VS Code Live Server."
        );
    }

    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 310000,
            hash: "SHA-256"
        },
        key,
        256
    );

    return Array.from(new Uint8Array(bits))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

/* Register a user */

async function registerUser(name, email, password) {
    name = name.trim();
    email = email.trim().toLowerCase();

    if (!name || !email || !password) {
        throw new Error("Please complete all fields.");
    }

    if (findUserByEmail(email)) {
        throw new Error("This email is already registered.");
    }

    const saltBytes = crypto.getRandomValues(
        new Uint8Array(16)
    );

    const salt = Array.from(saltBytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

    const passwordHash = await hashPassword(password, salt);

    const users = getUsers();

    // Check again before saving
    if (users.some(user => user.email === email)) {
        throw new Error("This email is already registered.");
    }

    users.push({
        id: crypto.randomUUID(),
        name: name,
        email: email,
        salt: salt,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString()
    });

    saveUsers(users);

    return {
        name: name,
        email: email
    };
}

/* Log in a registered user */

async function loginUser(email, password) {
    email = email.trim().toLowerCase();

    const user = findUserByEmail(email);

    if (!user) {
        throw new Error("Incorrect email or password.");
    }

    const enteredHash = await hashPassword(
        password,
        user.salt
    );

    if (enteredHash !== user.passwordHash) {
        throw new Error("Incorrect email or password.");
    }

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email
        })
    );

    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
}

/* Get the logged-in user */

function getCurrentUser() {
    try {
        return JSON.parse(
            sessionStorage.getItem(SESSION_KEY)
        );
    } catch {
        return null;
    }
}

/* Log out */

function logoutUser() {
    sessionStorage.removeItem(SESSION_KEY);
}

/* =========================================
   SIGNUP FORM
   ========================================= */

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("fullName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const agreeTerms = document.getElementById("agreeTerms").checked;

        const message = document.getElementById("signupMessage");
        const submitButton = signupForm.querySelector(
            'button[type="submit"]'
        );

        message.textContent = "";
        message.className = "form-message";

        if (!name || !email || !password || !confirmPassword) {
            message.textContent = "Please complete all fields.";
            message.classList.add("error");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            message.textContent = "Please enter a valid email address.";
            message.classList.add("error");
            return;
        }

        if (password.length < 8) {
            message.textContent =
                "Your password must be at least 8 characters.";
            message.classList.add("error");
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Your passwords do not match.";
            message.classList.add("error");
            return;
        }

        if (!agreeTerms) {
            message.textContent =
                "Please agree to the terms and conditions.";
            message.classList.add("error");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        try {
            await registerUser(name, email, password);

            message.textContent =
                "Account created successfully! Redirecting to login...";
            message.classList.add("success");

            signupForm.reset();

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            message.textContent =
                error.message || "Unable to create your account.";
            message.classList.add("error");

        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Create Account <span>→</span>';
        }
    });
}

/* =========================================
   SHOW / HIDE PASSWORD
   ========================================= */

document.querySelectorAll("[data-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
        const input = document.getElementById(
            button.dataset.toggle
        );

        if (!input) return;

        const showing = input.type === "text";

        input.type = showing ? "password" : "text";
        button.textContent = showing ? "Show" : "Hide";

        button.setAttribute(
            "aria-label",
            showing ? "Show password" : "Hide password"
        );
    });
});


/* =========================================
   COFFEE CORNER - LOGIN FORM
   ========================================= */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        const message = document.getElementById("loginMessage");
        const button = document.getElementById("loginButton");

        message.textContent = "";
        message.className = "form-message";

        if (!email || !password) {
            message.textContent = "Please enter your email and password.";
            message.classList.add("error");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            message.textContent = "Please enter a valid email address.";
            message.classList.add("error");
            return;
        }

        button.disabled = true;
        button.textContent = "Logging in...";

        try {
            const user = await loginUser(email, password);

            message.textContent =
                "Welcome back, " + user.name + "! Redirecting...";
            message.classList.add("success");

            setTimeout(function () {
                window.location.href = "index.html";
            }, 1000);

        } catch (error) {
            message.textContent =
                error.message || "Unable to log in.";
            message.classList.add("error");

        } finally {
            button.disabled = false;
            button.innerHTML = 'Log In <span>→</span>';
        }
    });
}
