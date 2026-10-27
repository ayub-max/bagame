

(function () {
  "use strict";

  

  var KEY = "bagame.account";
  var CART_KEY = "bagame.cart";
  var memory = null;
  var cartMemory = null;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : memory;
    } catch (e) {
      return memory;
    }
  }

  function write(account) {
    memory = account;
    try { localStorage.setItem(KEY, JSON.stringify(account)); } catch (e) {}
  }

  function clear() {
    memory = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function initials(name) {
    var parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "V";
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  

  function buildGate() {
    var gate = document.createElement("div");
    gate.className = "gate";
    gate.id = "gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "gate-title");
    gate.innerHTML = [
      '<div class="gate__card">',
      '  <p class="gate__logo" id="gate-title">.B.A. <span>GAME</span></p>',
      '  <p class="gate__lead" id="gate-lead">Create an account to open the store, library and profile.</p>',
      '  <form id="gate-form" novalidate>',
      '    <div class="field" id="field-nick">',
      '      <label for="gate-nick">Nickname</label>',
      '      <input id="gate-nick" name="nick" type="text" autocomplete="nickname" placeholder="nova_rider">',
      '      <span class="field__error" data-error="nick"></span>',
      '    </div>',
      '    <div class="field">',
      '      <label for="gate-email">Email</label>',
      '      <input id="gate-email" name="email" type="email" autocomplete="email" placeholder="you@mail.com">',
      '      <span class="field__error" data-error="email"></span>',
      '    </div>',
      '    <div class="field">',
      '      <label for="gate-pass">Password</label>',
      '      <input id="gate-pass" name="pass" type="password" autocomplete="new-password" placeholder="at least 8 characters">',
      '      <span class="field__error" data-error="pass"></span>',
      '    </div>',
      '    <label class="gate__row" id="field-terms">',
      '      <input id="gate-terms" type="checkbox">',
      '      <span>I am 13 or older and accept the platform rules.</span>',
      '    </label>',
      '    <span class="field__error" data-error="terms"></span>',
      '    <button class="btn btn--primary btn--block" type="submit" id="gate-submit">Create account</button>',
      '  </form>',
      '  <p class="gate__switch">',
      '    <span id="gate-switch-text">Already have an account?</span>',
      '    <button type="button" id="gate-switch">Log in</button>',
      '  </p>',
      '</div>'
    ].join("");
    return gate;
  }

  var gate, form, mode = "signup";

  function setMode(next) {
    mode = next;
    var signup = mode === "signup";
    document.getElementById("field-nick").hidden = !signup;
    document.getElementById("field-terms").hidden = !signup;
    document.getElementById("gate-lead").textContent = signup
      ? "Create an account to open the store, library and profile."
      : "Welcome back. Enter your email and password.";
    document.getElementById("gate-submit").textContent = signup ? "Create account" : "Log in";
    document.getElementById("gate-switch-text").textContent = signup ? "Already have an account?" : "No account yet?";
    document.getElementById("gate-switch").textContent = signup ? "Log in" : "Sign up";
    document.getElementById("gate-pass").setAttribute("autocomplete", signup ? "new-password" : "current-password");
    clearErrors();
  }

  function clearErrors() {
    form.querySelectorAll("[data-error]").forEach(function (node) { node.textContent = ""; });
    form.querySelectorAll("input").forEach(function (node) { node.removeAttribute("aria-invalid"); });
  }

  function fail(name, message) {
    var slot = form.querySelector('[data-error="' + name + '"]');
    if (slot) slot.textContent = message;
    var input = form.querySelector('[name="' + name + '"]') || document.getElementById("gate-" + name);
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function validate() {
    clearErrors();
    var nick = document.getElementById("gate-nick").value.trim();
    var email = document.getElementById("gate-email").value.trim();
    var pass = document.getElementById("gate-pass").value;
    var terms = document.getElementById("gate-terms").checked;
    var ok = true;

    if (mode === "signup" && nick.length < 3) { fail("nick", "Nickname must be 3+ characters."); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { fail("email", "Check your email address."); ok = false; }
    if (pass.length < 8) { fail("pass", "Password must be 8+ characters."); ok = false; }
    if (mode === "signup" && !terms) { fail("terms", "You need to accept the rules."); ok = false; }
    if (!ok) return null;

    return {
      nick: mode === "signup" ? nick : email.split("@")[0],
      email: email,
      wallet: 125,
      level: 24,
      joined: new Date().toISOString().slice(0, 10)
    };
  }

  function openGate() {
    gate.hidden = false;
    document.body.classList.add("is-locked");
    var first = mode === "signup"
      ? document.getElementById("gate-nick")
      : document.getElementById("gate-email");
    if (first) first.focus();
  }

  function closeGate() {
    gate.hidden = true;
    document.body.classList.remove("is-locked");
  }

  function sessionCart() {
    return [
      '<button class="session__cart" type="button" data-cart-open aria-label="Cart">',
      '  <span class="session__cart-icon" aria-hidden="true">🛒</span>',
      '  <span class="session__cart-count" data-cart-count>0</span>',
      '</button>'
    ].join("");
  }

  function paintSession(account) {
    var box = document.querySelector("[data-session]");
    if (!box) return;

    if (!account) {
      box.innerHTML = sessionCart() +
        '<button class="btn btn--ghost" type="button" data-open-gate>Log in</button>';
      box.querySelector("[data-open-gate]").addEventListener("click", function () { openGate(); });
    } else {
      box.innerHTML = [
        sessionCart(),
        '<button type="button" class="session__wallet" data-topup title="Top up wallet">' + money(account.wallet) + ' <span aria-hidden="true">+</span></button>',
        '<span class="session__name">' + esc(account.nick) + '</span>',
        '<span class="session__avatar">' + initials(account.nick) + '</span>'
      ].join("");
    }
    paintCartCount();
  }

  function startGate() {
    document.body.appendChild(buildGate());
    gate = document.getElementById("gate");
    form = document.getElementById("gate-form");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var account = validate();
      if (!account) return;
      write(account);
      closeGate();
      paintSession(account);
      toast("Welcome, " + account.nick + "!");
      document.dispatchEvent(new CustomEvent("vp:signin", { detail: account }));
    });

    document.getElementById("gate-switch").addEventListener("click", function () {
      setMode(mode === "signup" ? "signin" : "signup");
      var first = mode === "signup"
        ? document.getElementById("gate-nick")
        : document.getElementById("gate-email");
      if (first) first.focus();
    });

    gate.addEventListener("keydown", function (event) {
      if (event.key === "Escape") event.preventDefault();
    });

    var account = read();
    setMode("signup");
    if (account) {
      closeGate();
      paintSession(account);
    } else {
      paintSession(null);
      openGate();
    }

    document.querySelectorAll("[data-logout]").forEach(function (button) {
      button.addEventListener("click", function () {
        clear();
        paintSession(null);
        setMode("signup");
        openGate();
      });
    });
  }

  window.VP = {
    account: read,
    openGate: function () { if (gate) openGate(); },
    logout: function () { clear(); paintSession(null); if (gate) openGate(); },
    topup: function (amount) { openTopup(amount); }
  };

  

  function startMenu() {
    var burger = document.querySelector("[data-burger]");
    var nav = document.querySelector(".nav");
    if (!burger || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    burger.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target) && !burger.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        burger.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) setOpen(false);
    });

    setOpen(false);
  }

  

  var GAMES = {
  "Cyber Neon 2077": {
    "img": "images/cyberpunk.jpg",
    "shots": [
      "images/spider.jpg",
      "images/watch-dogs-legion.jpg",
      "images/gta-5.jpg"
    ],
    "genre": "Open world · RPG",
    "tags": [
      "Open world",
      "RPG",
      "Cyberpunk",
      "Story"
    ],
    "short": "Night City never sleeps. Choose your path in a neon-soaked megacity of chrome and betrayal.",
    "about": "Become a mercenary outlaw in a city of dreams and danger. Deep character builds, branching quests and high-octane combat. Drive, hack and fight your way to legend.",
    "features": [
      "Massive open world",
      "Deep RPG systems",
      "Cinematic story",
      "Vehicle combat"
    ],
    "studio": "Night City Studio",
    "publisher": ".B.A. Originals",
    "release": "December 10, 2025",
    "size": 70,
    "rating": 4.6,
    "reviews": 98400,
    "players": "1",
    "langs": "English, Russian, 日本語, O‘zbek",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i7-8700 / Ryzen 5 3600",
      "ram": "16 GB",
      "gpu": "RTX 2060 / RX 5700",
      "disk": "70 GB SSD"
    },
    "price": {
      "off": "−40%",
      "old": "$59.90",
      "now": "$35.94",
      "value": 35.94
    }
  },
  "Elden Lands": {
    "img": "images/elden.jpg",
    "shots": [
      "images/sekiro.jpg",
      "images/dark-souls.jpg",
      "images/shadow-of-the-colossus.jpg"
    ],
    "genre": "Action RPG · Soulslike",
    "tags": [
      "Souls-like",
      "Open world",
      "Boss fights",
      "Hardcore"
    ],
    "short": "Rise as a Tarnished in a shattered realm ruled by demigods and ancient magic.",
    "about": "Explore a vast interlinked world, challenge colossal bosses and forge your own legend. Every death teaches. Every victory is earned.",
    "features": [
      "Seamless open world",
      "Brutal bosses",
      "Deep buildcrafting",
      "Online co-op & invasion"
    ],
    "studio": "From Horizon",
    "publisher": ".B.A. Originals",
    "release": "February 25, 2025",
    "size": 60,
    "rating": 4.9,
    "reviews": 210000,
    "players": "1–3",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-8400 / Ryzen 5 2600",
      "ram": "12 GB",
      "gpu": "GTX 1060 / RX 580",
      "disk": "60 GB SSD"
    },
    "price": {
      "now": "$49.90",
      "value": 49.9
    }
  },
  "Red Horizon 2": {
    "img": "images/rdr2.jpg",
    "shots": [
      "images/gta-5.jpg",
      "images/far-cry-4.jpg",
      "images/watch-dogs-legion.jpg"
    ],
    "genre": "Open world · Western",
    "tags": [
      "Story",
      "Open world",
      "Horses",
      "Immersive"
    ],
    "short": "An outlaw's last ride across a dying frontier of beauty and blood.",
    "about": "Live the life of an outlaw in a living, breathing world. Hunt, rob, bond with your horse and face the end of an era.",
    "features": [
      "Living world",
      "Epic story",
      "Hunting & camping",
      "Honor system"
    ],
    "studio": "Frontier Works",
    "publisher": ".B.A. Originals",
    "release": "October 26, 2024",
    "size": 150,
    "rating": 4.8,
    "reviews": 312000,
    "players": "1",
    "langs": "English, Russian, Español",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i7-4770K / Ryzen 5 1500X",
      "ram": "12 GB",
      "gpu": "GTX 1060 6GB / RX 480",
      "disk": "150 GB"
    },
    "price": {
      "off": "−50%",
      "old": "$59.90",
      "now": "$29.95",
      "value": 29.95
    }
  },
  "God of Blades": {
    "img": "images/godofwar.jpg",
    "shots": [
      "images/sekiro.jpg",
      "images/batman-arkham-knight.jpg",
      "images/assassins-creed-valhalla.jpg"
    ],
    "genre": "Action · Adventure",
    "tags": [
      "Story",
      "Combat",
      "Mythology",
      "Single-player"
    ],
    "short": "A father and son journey through the realms of Norse myth.",
    "about": "Brutal, intimate combat meets a deeply human story. Explore, craft and face gods in a stunning mythic world.",
    "features": [
      "Cinematic combat",
      "Father-son story",
      "Realm travel",
      "Boss battles"
    ],
    "studio": "Santa Myth",
    "publisher": ".B.A. Originals",
    "release": "January 14, 2025",
    "size": 80,
    "rating": 4.9,
    "reviews": 89000,
    "players": "1",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-6600K / Ryzen 5 2400G",
      "ram": "8 GB",
      "gpu": "GTX 1060 / RX 570",
      "disk": "80 GB SSD"
    },
    "price": {
      "off": "−30%",
      "old": "$49.90",
      "now": "$34.93",
      "value": 34.93
    }
  },
  "Spider City": {
    "img": "images/spider.jpg",
    "shots": [
      "images/batman-arkham-knight.jpg",
      "images/guardians-of-the-galaxy.jpg",
      "images/gta-5.jpg"
    ],
    "genre": "Action · Superhero",
    "tags": [
      "Open world",
      "Web-swinging",
      "Story",
      "Combat"
    ],
    "short": "Swing through a living metropolis as the friendly neighborhood hero.",
    "about": "Master web-slinging traversal, face iconic villains and protect the city in a story-driven open-world adventure.",
    "features": [
      "Fluid traversal",
      "Suit collection",
      "Side missions",
      "Photo mode"
    ],
    "studio": "Insomniac-like",
    "publisher": ".B.A. Originals",
    "release": "August 12, 2025",
    "size": 75,
    "rating": 4.7,
    "reviews": 156000,
    "players": "1",
    "langs": "English, Russian, O‘zbek",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i3-4160 / Ryzen 3 1200",
      "ram": "8 GB",
      "gpu": "GTX 950 / RX 560",
      "disk": "75 GB"
    },
    "price": {
      "off": "−25%",
      "old": "$59.90",
      "now": "$44.92",
      "value": 44.92
    }
  },
  "Wizard School": {
    "img": "images/hogwarts.jpg",
    "shots": [
      "images/final-fantasy-xv.jpg",
      "images/folklore.jpg",
      "images/witcher-3.jpg"
    ],
    "genre": "Action RPG · Magic",
    "tags": [
      "Magic",
      "Open world",
      "School life",
      "Exploration"
    ],
    "short": "Attend a legendary school of magic and shape your destiny.",
    "about": "Cast spells, explore ancient halls, befriend classmates and uncover secrets that could change the wizarding world forever.",
    "features": [
      "Spell combat",
      "House system",
      "Flying",
      "Morality choices"
    ],
    "studio": "Avalanche Magic",
    "publisher": ".B.A. Originals",
    "release": "February 10, 2025",
    "size": 85,
    "rating": 4.5,
    "reviews": 201000,
    "players": "1",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-6600K / Ryzen 5 2600",
      "ram": "16 GB",
      "gpu": "GTX 1080 Ti / RX 5700 XT",
      "disk": "85 GB SSD"
    },
    "price": {
      "off": "−35%",
      "old": "$59.90",
      "now": "$38.93",
      "value": 38.93
    }
  },
  "Star Colony": {
    "img": "images/starfield.jpg",
    "shots": [
      "images/guardians-of-the-galaxy.jpg",
      "images/borderlands.jpg",
      "images/doom.jpg"
    ],
    "genre": "Space RPG · Exploration",
    "tags": [
      "Space",
      "RPG",
      "Exploration",
      "Crafting"
    ],
    "short": "Build your ship, recruit a crew and chart the stars.",
    "about": "A galaxy of planets to land on, factions to join and mysteries to solve. Customize your ship and decide who you become among the stars.",
    "features": [
      "Ship building",
      "Planet landing",
      "Deep RPG",
      "Outposts"
    ],
    "studio": "Bethesda-like",
    "publisher": ".B.A. Originals",
    "release": "September 6, 2025",
    "size": 125,
    "rating": 4.2,
    "reviews": 145000,
    "players": "1",
    "langs": "English, Russian",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-8400 / Ryzen 5 2600X",
      "ram": "16 GB",
      "gpu": "RTX 2080 / RX 6800 XT",
      "disk": "125 GB SSD"
    },
    "price": {
      "off": "−20%",
      "old": "$69.90",
      "now": "$55.92",
      "value": 55.92
    }
  },
  "Baldur's Path": {
    "img": "images/baldurs.jpg",
    "shots": [
      "images/dark-souls.jpg",
      "images/final-fantasy-xv.jpg",
      "images/witcher-3.jpg"
    ],
    "genre": "CRPG · Turn-based",
    "tags": [
      "Story",
      "Choices",
      "Co-op",
      "D&D"
    ],
    "short": "Gather a party of misfits and rewrite destiny in a world of gods and monsters.",
    "about": "Inspired by classic tabletop RPGs. Every choice matters, combat is tactical and the story branches wildly based on your decisions.",
    "features": [
      "Full co-op",
      "Branching story",
      "Character creation",
      "Tactical combat"
    ],
    "studio": "Larian-like",
    "publisher": ".B.A. Originals",
    "release": "August 3, 2025",
    "size": 150,
    "rating": 4.9,
    "reviews": 420000,
    "players": "1–4",
    "langs": "English, Russian, 日本語, O‘zbek",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-4690 / Ryzen 5 1500X",
      "ram": "8 GB",
      "gpu": "GTX 970 / RX 480",
      "disk": "150 GB SSD"
    },
    "price": {
      "off": "−15%",
      "old": "$59.90",
      "now": "$50.91",
      "value": 50.91
    }
  },
  "Shadow Blade": {
    "img": "images/sekiro.jpg",
    "shots": [
      "images/dark-souls.jpg",
      "images/dishonored.jpg",
      "images/assassins-creed-valhalla.jpg"
    ],
    "genre": "Action · Stealth",
    "tags": [
      "Samurai",
      "Boss fights",
      "Precision",
      "Hardcore"
    ],
    "short": "Master the blade and reclaim your honor in feudal Japan.",
    "about": "Deflect, counter and strike with perfect timing. A focused, punishing action experience where skill is everything.",
    "features": [
      "Combat mastery",
      "Stealth tools",
      "Boss gauntlet",
      "New Game+"
    ],
    "studio": "From Horizon",
    "publisher": ".B.A. Originals",
    "release": "March 22, 2025",
    "size": 25,
    "rating": 4.8,
    "reviews": 98000,
    "players": "1",
    "langs": "English, 日本語, Russian",
    "req": {
      "os": "Windows 7 64-bit",
      "cpu": "Intel i3-2100 / FX-6300",
      "ram": "4 GB",
      "gpu": "GTX 760 / R7 260X",
      "disk": "25 GB"
    },
    "price": {
      "off": "−45%",
      "old": "$39.90",
      "now": "$21.94",
      "value": 21.94
    }
  },
  "Hades Return": {
    "img": "images/hades2.jpg",
    "shots": [
      "images/folklore.jpg",
      "images/machinarium.jpg",
      "images/little-nightmares.jpg"
    ],
    "genre": "Roguelike · Action",
    "tags": [
      "Roguelike",
      "Mythology",
      "Fast combat",
      "Story"
    ],
    "short": "Escape the underworld again and again in stylish, story-rich runs.",
    "about": "Die, learn, grow stronger. Meet gods, collect boons and carve your way out of the House of Hades in this critically acclaimed roguelike.",
    "features": [
      "Runs that matter",
      "God boons",
      "Voice acting",
      "Constant updates"
    ],
    "studio": "Supergiant-like",
    "publisher": ".B.A. Originals",
    "release": "May 6, 2025",
    "size": 20,
    "rating": 4.9,
    "reviews": 175000,
    "players": "1",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 7 64-bit",
      "cpu": "Dual Core 2.4 GHz",
      "ram": "4 GB",
      "gpu": "1GB VRAM",
      "disk": "20 GB"
    },
    "price": {
      "off": "−20%",
      "old": "$24.90",
      "now": "$19.92",
      "value": 19.92
    }
  },
  "Monkey King": {
    "img": "images/blackmyth.jpg",
    "shots": [
      "images/shadow-of-the-colossus.jpg",
      "images/dark-souls.jpg",
      "images/sekiro.jpg"
    ],
    "genre": "Action RPG · Myth",
    "tags": [
      "Boss fights",
      "China myth",
      "Spectacle",
      "Single-player"
    ],
    "short": "Transform into legendary forms and battle mythical beasts.",
    "about": "Based on Journey to the West. Stunning visuals, fluid combat and a world filled with gods, demons and transformations.",
    "features": [
      "Transformations",
      "Spectacle bosses",
      "Exploration",
      "Cinematic presentation"
    ],
    "studio": "Game Science-like",
    "publisher": ".B.A. Originals",
    "release": "August 20, 2025",
    "size": 130,
    "rating": 4.7,
    "reviews": 89000,
    "players": "1",
    "langs": "English, 中文, Russian",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-8400 / Ryzen 5 1600",
      "ram": "16 GB",
      "gpu": "RTX 2060 / RX 5700 XT",
      "disk": "130 GB SSD"
    },
    "price": {
      "now": "$59.90",
      "value": 59.9
    }
  },
  "Silent Town": {
    "img": "images/silent.jpg",
    "shots": [
      "images/resident-evil-3.jpg",
      "images/little-nightmares.jpg",
      "images/dishonored.jpg"
    ],
    "genre": "Horror · Survival",
    "tags": [
      "Horror",
      "Psychological",
      "Puzzle",
      "Story"
    ],
    "short": "Return to a fog-covered town where nightmares take physical form.",
    "about": "A modern reimagining of classic psychological horror. Solve puzzles, manage limited resources and face your deepest fears.",
    "features": [
      "Atmospheric horror",
      "Puzzle solving",
      "Multiple endings",
      "Remake fidelity"
    ],
    "studio": "Bloober-like",
    "publisher": ".B.A. Originals",
    "release": "October 8, 2025",
    "size": 50,
    "rating": 4.6,
    "reviews": 67000,
    "players": "1",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-3470 / FX-8350",
      "ram": "8 GB",
      "gpu": "GTX 780 / R9 290",
      "disk": "50 GB"
    },
    "price": {
      "off": "−30%",
      "old": "$39.90",
      "now": "$27.93",
      "value": 27.93
    }
  },
  "Counter Zone 2": {
    "img": "images/cs2.jpg",
    "shots": [
      "images/call-of-duty.jpg",
      "images/doom.jpg",
      "images/stalker-2.jpg"
    ],
    "genre": "Tactical FPS · Competitive",
    "tags": [
      "FPS",
      "Esports",
      "5v5",
      "Skins"
    ],
    "short": "The definitive competitive shooter. Aim, clutch, climb the ranks.",
    "about": "Round-based tactical combat. Economy, utility and pure aim skill decide the match. Global ranks and massive esports scene.",
    "features": [
      "5v5 ranked",
      "Workshop maps",
      "Skin economy",
      "Spectator tools"
    ],
    "studio": "Valve-like",
    "publisher": ".B.A. Originals",
    "release": "September 27, 2025",
    "size": 40,
    "rating": 4.4,
    "reviews": 890000,
    "players": "Multiplayer",
    "langs": "English, Russian, O‘zbek",
    "req": {
      "os": "Windows 10",
      "cpu": "Intel Core 2 Duo E6600",
      "ram": "4 GB",
      "gpu": "1GB VRAM",
      "disk": "40 GB"
    },
    "price": {
      "now": "Free",
      "value": 0
    }
  },
  "Battle Royale X": {
    "img": "images/pubg.jpg",
    "shots": [
      "images/call-of-duty.jpg",
      "images/gta-5.jpg",
      "images/far-cry-4.jpg"
    ],
    "genre": "Battle Royale · Survival",
    "tags": [
      "100 players",
      "Loot",
      "Vehicles",
      "Squads"
    ],
    "short": "Drop in, loot up, be the last squad standing.",
    "about": "Intense battle royale with realistic ballistics, large maps and vehicle chaos. Solo, duo or squad.",
    "features": [
      "100-player matches",
      "Realistic gunplay",
      "Multiple maps",
      "Ranked seasons"
    ],
    "studio": "Krafton-like",
    "publisher": ".B.A. Originals",
    "release": "March 23, 2025",
    "size": 45,
    "rating": 4.3,
    "reviews": 520000,
    "players": "1–4",
    "langs": "English, Russian, 한국어",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-4430 / FX-6300",
      "ram": "8 GB",
      "gpu": "GTX 960 / R7 370",
      "disk": "45 GB"
    },
    "price": {
      "off": "−60%",
      "old": "$29.90",
      "now": "$11.96",
      "value": 11.96
    }
  },
  "Apex Legends Pro": {
    "img": "images/apex.jpg",
    "shots": [
      "images/call-of-duty.jpg",
      "images/doom.jpg",
      "images/guardians-of-the-galaxy.jpg"
    ],
    "genre": "Hero shooter · BR",
    "tags": [
      "Heroes",
      "Fast TTK",
      "Squads",
      "Free-to-play"
    ],
    "short": "Choose your Legend. Drop. Fight. Win as a squad.",
    "about": "Fast-paced hero battle royale with unique abilities, smooth movement and seasonal content.",
    "features": [
      "Unique Legends",
      "Season passes",
      "Arenas mode",
      "Cross-play"
    ],
    "studio": "Respawn-like",
    "publisher": ".B.A. Originals",
    "release": "February 4, 2025",
    "size": 55,
    "rating": 4.5,
    "reviews": 410000,
    "players": "1–3",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 7 64-bit",
      "cpu": "Intel i5-3570K / FX-8350",
      "ram": "8 GB",
      "gpu": "GTX 640 / HD 7730",
      "disk": "55 GB"
    },
    "price": {
      "now": "Free",
      "value": 0
    }
  },
  "Dota Legends": {
    "img": "images/dota2.jpg",
    "shots": [
      "images/borderlands.jpg",
      "images/guardians-of-the-galaxy.jpg",
      "images/witcher-3.jpg"
    ],
    "genre": "MOBA · Competitive",
    "tags": [
      "5v5",
      "Strategy",
      "Esports",
      "Free"
    ],
    "short": "Destroy the enemy Ancient in the deepest strategy MOBA.",
    "about": "Over 120 heroes, endless item builds and the highest skill ceiling in gaming. Free forever with huge tournament scene.",
    "features": [
      "120+ heroes",
      "Turbo mode",
      "Battle Pass",
      "Custom games"
    ],
    "studio": "Valve-like",
    "publisher": ".B.A. Originals",
    "release": "July 9, 2024",
    "size": 60,
    "rating": 4.6,
    "reviews": 1200000,
    "players": "Multiplayer",
    "langs": "English, Russian, 中文",
    "req": {
      "os": "Windows 7",
      "cpu": "Dual core from Intel / AMD at 2.8 GHz",
      "ram": "4 GB",
      "gpu": "DirectX 9",
      "disk": "60 GB"
    },
    "price": {
      "now": "Free",
      "value": 0
    }
  },
  "GTA Mega City": {
    "img": "images/gta-5.jpg",
    "shots": [
      "images/watch-dogs-legion.jpg",
      "images/far-cry-4.jpg",
      "images/call-of-duty.jpg"
    ],
    "genre": "Open world · Crime",
    "tags": [
      "Heists",
      "Online",
      "Story",
      "Sandbox"
    ],
    "short": "Three criminals. One city. Unlimited chaos.",
    "about": "Switch between three protagonists in a satirical open world full of heists, side activities and online mayhem.",
    "features": [
      "Story mode",
      "GTA Online",
      "Heists",
      "Mod support"
    ],
    "studio": "Rockstar-like",
    "publisher": ".B.A. Originals",
    "release": "April 14, 2025",
    "size": 110,
    "rating": 4.7,
    "reviews": 1500000,
    "players": "1–30",
    "langs": "English, Russian, Español, O‘zbek",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel Core 2 Quad Q6600 / Phenom 9850",
      "ram": "4 GB",
      "gpu": "9800 GT / HD 4870",
      "disk": "110 GB"
    },
    "price": {
      "off": "−50%",
      "old": "$29.90",
      "now": "$14.95",
      "value": 14.95
    }
  },
  "Witcher Path": {
    "img": "images/witcher-3.jpg",
    "shots": [
      "images/dark-souls.jpg",
      "images/assassins-creed-valhalla.jpg",
      "images/folklore.jpg"
    ],
    "genre": "Action RPG · Story",
    "tags": [
      "Story",
      "Choices",
      "Monsters",
      "Open world"
    ],
    "short": "A monster hunter searches for a lost child in a war-torn world.",
    "about": "One of the greatest RPGs ever made. Deep quests, memorable characters and a world that reacts to your choices.",
    "features": [
      "Award-winning story",
      "Expansions included",
      "Monster contracts",
      "Gwent card game"
    ],
    "studio": "CDPR-like",
    "publisher": ".B.A. Originals",
    "release": "May 19, 2025",
    "size": 50,
    "rating": 4.9,
    "reviews": 680000,
    "players": "1",
    "langs": "English, Russian, 日本語, O‘zbek",
    "req": {
      "os": "Windows 7 64-bit",
      "cpu": "Intel i5-2500K / AMD Phenom II X4 940",
      "ram": "6 GB",
      "gpu": "GTX 660 / HD 7870",
      "disk": "50 GB"
    },
    "price": {
      "off": "−70%",
      "old": "$39.90",
      "now": "$11.97",
      "value": 11.97
    }
  },
  "Doom Eternal X": {
    "img": "images/doom.jpg",
    "shots": [
      "images/call-of-duty.jpg",
      "images/borderlands.jpg",
      "images/stalker-2.jpg"
    ],
    "genre": "FPS · Arena",
    "tags": [
      "Fast combat",
      "Demons",
      "Soundtrack",
      "Glory kills"
    ],
    "short": "Rip and tear until it is done. Pure demon-slaying adrenaline.",
    "about": "The ultimate power fantasy shooter. Fast movement, chainsaw, glory kills and a metal soundtrack that never stops.",
    "features": [
      "Glory kills",
      "Weapon mods",
      "Demonic invasions",
      "Master levels"
    ],
    "studio": "id-like",
    "publisher": ".B.A. Originals",
    "release": "March 20, 2025",
    "size": 50,
    "rating": 4.8,
    "reviews": 112000,
    "players": "1–2",
    "langs": "English, Russian",
    "req": {
      "os": "Windows 7/10 64-bit",
      "cpu": "Intel i5-3570 / FX-8350",
      "ram": "8 GB",
      "gpu": "GTX 970 / R9 280",
      "disk": "50 GB"
    },
    "price": {
      "off": "−55%",
      "old": "$39.90",
      "now": "$17.95",
      "value": 17.95
    }
  },
  "Stalker Zone 2": {
    "img": "images/stalker-2.jpg",
    "shots": [
      "images/far-cry-4.jpg",
      "images/dishonored.jpg",
      "images/resident-evil-3.jpg"
    ],
    "genre": "FPS · Survival",
    "tags": [
      "Anomaly",
      "Open world",
      "Atmospheric",
      "Hardcore"
    ],
    "short": "Survive the Zone. Anomalies, mutants and other stalkers await.",
    "about": "A living, dangerous open world filled with anomalies, factions and emergent stories. Trust no one.",
    "features": [
      "A-Life system",
      "Anomalies",
      "Factions",
      "Survival crafting"
    ],
    "studio": "GSC-like",
    "publisher": ".B.A. Originals",
    "release": "November 20, 2025",
    "size": 150,
    "rating": 4.4,
    "reviews": 78000,
    "players": "1",
    "langs": "English, Ukrainian, Russian",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-7600K / Ryzen 5 1600X",
      "ram": "16 GB",
      "gpu": "RTX 2070 / RX 5700 XT",
      "disk": "150 GB SSD"
    },
    "price": {
      "off": "−10%",
      "old": "$59.90",
      "now": "$53.91",
      "value": 53.91
    }
  },
  "Little Nightmares III": {
    "img": "images/little-nightmares.jpg",
    "shots": [
      "images/machinarium.jpg",
      "images/folklore.jpg",
      "images/hunger-games.jpg"
    ],
    "genre": "Horror · Puzzle",
    "tags": [
      "Atmosphere",
      "Co-op",
      "Puzzle",
      "Story"
    ],
    "short": "Two children trapped in a world of twisted adults.",
    "about": "Solve environmental puzzles, hide from grotesque creatures and uncover a dark narrative in stunning hand-crafted levels.",
    "features": [
      "Co-op campaign",
      "Hand-crafted levels",
      "No combat focus",
      "Haunting art"
    ],
    "studio": "Tarsier-like",
    "publisher": ".B.A. Originals",
    "release": "October 10, 2025",
    "size": 15,
    "rating": 4.5,
    "reviews": 34000,
    "players": "1–2",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows 10",
      "cpu": "Intel i5-2300 / FX-4350",
      "ram": "4 GB",
      "gpu": "GTX 650 Ti / HD 7770",
      "disk": "15 GB"
    },
    "price": {
      "off": "−40%",
      "old": "$29.90",
      "now": "$17.94",
      "value": 17.94
    }
  },
  "Machina Dream": {
    "img": "images/machinarium.jpg",
    "shots": [
      "images/folklore.jpg",
      "images/hunger-games.jpg",
      "images/little-nightmares.jpg"
    ],
    "genre": "Point & click · Puzzle",
    "tags": [
      "Indie",
      "Puzzle",
      "Art",
      "Story"
    ],
    "short": "A robot's gentle adventure in a mechanical city of secrets.",
    "about": "Beautiful hand-drawn art, clever puzzles and a wordless story that touches the heart. A classic indie gem.",
    "features": [
      "Hand-drawn art",
      "No text dialogue",
      "Inventive puzzles",
      "Soundtrack"
    ],
    "studio": "Amanita-like",
    "publisher": ".B.A. Originals",
    "release": "January 15, 2024",
    "size": 1,
    "rating": 4.7,
    "reviews": 28000,
    "players": "1",
    "langs": "English, Russian, 日本語",
    "req": {
      "os": "Windows XP+",
      "cpu": "1.8 GHz",
      "ram": "1 GB",
      "gpu": "128 MB VRAM",
      "disk": "1 GB"
    },
    "price": {
      "off": "−60%",
      "old": "$9.90",
      "now": "$3.96",
      "value": 3.96
    }
  },
  "UFC Ring 6": {
    "img": "images/ufc-6.jpg",
    "shots": [
      "images/batman-arkham-knight.jpg",
      "images/call-of-duty.jpg",
      "images/gta-5.jpg"
    ],
    "genre": "Sports · Fighting",
    "tags": [
      "MMA",
      "Career",
      "Online",
      "Realistic"
    ],
    "short": "Step into the octagon and become the ultimate champion.",
    "about": "Realistic striking and grappling, deep career mode and online ranked fights. Feel every punch.",
    "features": [
      "Career mode",
      "Online ranked",
      "Create fighter",
      "Realistic physics"
    ],
    "studio": "EA Sports-like",
    "publisher": ".B.A. Originals",
    "release": "October 25, 2025",
    "size": 40,
    "rating": 4.1,
    "reviews": 22000,
    "players": "1–2",
    "langs": "English, Russian",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-3550 / FX-8350",
      "ram": "8 GB",
      "gpu": "GTX 660 / HD 7850",
      "disk": "40 GB"
    },
    "price": {
      "off": "−35%",
      "old": "$59.90",
      "now": "$38.93",
      "value": 38.93
    }
  },
  "Assassin Valhalla X": {
    "img": "images/assassins-creed-valhalla.jpg",
    "shots": [
      "images/far-cry-4.jpg",
      "images/shadow-of-the-colossus.jpg",
      "images/witcher-3.jpg"
    ],
    "genre": "Action · Open world",
    "tags": [
      "Vikings",
      "Stealth",
      "Raids",
      "RPG"
    ],
    "short": "Lead a Viking clan to conquer England.",
    "about": "Raid, build your settlement, duel and explore a massive Dark Ages Britain filled with mysteries and combat.",
    "features": [
      "Settlement building",
      "River raids",
      "RPG progression",
      "Mythical content"
    ],
    "studio": "Ubisoft-like",
    "publisher": ".B.A. Originals",
    "release": "November 10, 2025",
    "size": 160,
    "rating": 4.3,
    "reviews": 198000,
    "players": "1",
    "langs": "English, Russian, Français",
    "req": {
      "os": "Windows 10 64-bit",
      "cpu": "Intel i5-4460 / Ryzen 5 1400",
      "ram": "8 GB",
      "gpu": "GTX 960 / R9 380",
      "disk": "160 GB"
    },
    "price": {
      "off": "−60%",
      "old": "$59.90",
      "now": "$23.96",
      "value": 23.96
    }
  }
  };
  var KIND_NAME = {
    racing: "Car racing", shooter: "Space shooter", fps: "First-person tactical shooter", snake: "Snake",
    memory: "Memory match", runner: "Endless runner", catch: "Orb catcher",
    breakout: "Brick breaker", whack: "Target tap"
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hurt() {
    G.lives--;
    arcadeHud();
    if (G.lives <= 0) arcadeOver(false);
  }

  function drawCar(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 17, y - 28, 34, 56);
    ctx.fillStyle = "rgba(10,8,24,.75)";
    ctx.fillRect(x - 12, y - 14, 24, 12);
    ctx.fillRect(x - 12, y + 10, 24, 8);
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(x - 14, y - 28, 8, 4);
    ctx.fillRect(x + 6, y - 28, 8, 4);
  }

  var MINI = {

    /* ---------- Car racing ---------- */
    racing: {
      help: "Steer with the ← → keys, the mouse or touch. Dodge the traffic: every 40 m adds a point. Three crashes and the race is over.",
      reset: function () {
        G.x = 320; G.dist = 0; G.cars = []; G.spawn = 0.5; G.inv = 0; G.off = 0; G.lives = 3;
      },
      update: function (dt) {
        var speed = Math.min(640, 300 + G.t * 9);
        if (G.keys.ArrowLeft) G.x -= 380 * dt;
        if (G.keys.ArrowRight) G.x += 380 * dt;
        G.x = clamp(G.x, 170, 490);
        G.dist += speed * dt;
        G.off = (G.off + speed * dt) % 80;
        var sc = Math.floor(G.dist / 40);
        if (sc !== G.score) { G.score = sc; arcadeHud(); }
        G.inv = Math.max(0, G.inv - dt);
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.35, 1.0 - G.t * 0.012);
          var lane = Math.floor(Math.random() * 4);
          G.cars.push({ x: 195 + lane * 90, y: -60, v: speed * (0.3 + Math.random() * 0.25),
                        c: COLORS[Math.floor(Math.random() * COLORS.length)] });
        }
        G.cars = G.cars.filter(function (c) {
          c.y += (speed - c.v) * dt;
          if (G.state === "playing" && G.inv <= 0 && Math.abs(c.x - G.x) < 32 && Math.abs(c.y - 330) < 52) {
            G.inv = 1.4; hurt(); return false;
          }
          return c.y < 450;
        });
      },
      draw: function (ctx) {
        ctx.fillStyle = "#10261a"; ctx.fillRect(0, 0, 640, 400);
        ctx.fillStyle = "#2a2a3d"; ctx.fillRect(150, 0, 360, 400);
        ctx.fillStyle = "#ffc247"; ctx.fillRect(146, 0, 4, 400); ctx.fillRect(510, 0, 4, 400);
        ctx.fillStyle = "rgba(255,255,255,.55)";
        for (var l = 1; l < 4; l++) {
          for (var y = -80 + G.off; y < 400; y += 80) ctx.fillRect(150 + l * 90 - 2, y, 4, 40);
        }
        G.cars.forEach(function (c) { drawCar(ctx, c.x, c.y, c.c); });
        if (G.inv <= 0 || Math.floor(G.inv * 10) % 2 === 0) drawCar(ctx, G.x, 330, G.color);
      }
    },

    /* ---------- Space shooter ---------- */
    shooter: {
      help: "Move the ship with the mouse, touch or ← → keys. It fires by itself: shoot the red invaders before they reach you.",
      reset: function () {
        G.x = 320; G.bul = []; G.en = []; G.spawn = 0.4; G.fire = 0; G.inv = 0; G.lives = 3;
      },
      update: function (dt) {
        if (G.keys.ArrowLeft) G.x -= 420 * dt;
        if (G.keys.ArrowRight) G.x += 420 * dt;
        G.x = clamp(G.x, 24, 616);
        G.inv = Math.max(0, G.inv - dt);
        G.fire -= dt;
        if (G.fire <= 0) { G.fire = 0.22; G.bul.push({ x: G.x, y: 350 }); }
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.3, 0.9 - G.t * 0.01);
          G.en.push({ x: 30 + Math.random() * 580, y: -16, v: 70 + Math.random() * 40 + G.t * 3, ph: Math.random() * 6 });
        }
        G.bul.forEach(function (b) { b.y -= 520 * dt; });
        G.bul = G.bul.filter(function (b) { return b.y > -10; });
        G.en.forEach(function (e) { e.y += e.v * dt; e.x = clamp(e.x + Math.sin(G.t * 2 + e.ph) * 40 * dt, 14, 626); });
        G.en = G.en.filter(function (e) {
          for (var i = 0; i < G.bul.length; i++) {
            var b = G.bul[i];
            if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
              G.bul.splice(i, 1); G.score++; arcadeHud(); return false;
            }
          }
          if (G.state === "playing" && G.inv <= 0 && Math.abs(e.x - G.x) < 24 && Math.abs(e.y - 372) < 20) {
            G.inv = 1; hurt(); return false;
          }
          if (e.y > 400) { if (G.state === "playing") hurt(); return false; }
          return true;
        });
      },
      draw: function (ctx) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        G.bul.forEach(function (b) { ctx.fillRect(b.x - 2, b.y - 8, 4, 12); });
        ctx.shadowColor = "#ff4d6d"; ctx.fillStyle = "#ff4d6d";
        G.en.forEach(function (e) {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + 14); ctx.lineTo(e.x + 14, e.y - 10); ctx.lineTo(e.x - 14, e.y - 10);
          ctx.closePath(); ctx.fill();
        });
        if (G.inv <= 0 || Math.floor(G.inv * 10) % 2 === 0) {
          ctx.shadowColor = G.color; ctx.fillStyle = G.color;
          ctx.beginPath();
          ctx.moveTo(G.x, 352); ctx.lineTo(G.x + 20, 386); ctx.lineTo(G.x, 378); ctx.lineTo(G.x - 20, 386);
          ctx.closePath(); ctx.fill();
        }
      }
    },

    /* ---------- Snake ---------- */
    snake: {
      help: "Steer the snake with the arrow keys or swipe. Eat the glowing food and don't bite your own tail. The walls wrap around.",
      reset: function () {
        G.sn = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        G.dir = { x: 1, y: 0 }; G.nd = { x: 1, y: 0 }; G.acc = 0; G.lives = 1;
        MINI.snake.food();
      },
      food: function () {
        var p, ok;
        do {
          p = { x: Math.floor(Math.random() * 32), y: Math.floor(Math.random() * 20) };
          ok = !G.sn.some(function (s) { return s.x === p.x && s.y === p.y; });
        } while (!ok);
        G.fd = p;
      },
      turn: function (dx, dy) {
        if (dx === -G.dir.x && dy === -G.dir.y) return;
        G.nd = { x: dx, y: dy };
      },
      key: function (e) {
        if (e.key === "ArrowLeft") MINI.snake.turn(-1, 0);
        if (e.key === "ArrowRight") MINI.snake.turn(1, 0);
        if (e.key === "ArrowUp") MINI.snake.turn(0, -1);
        if (e.key === "ArrowDown") MINI.snake.turn(0, 1);
      },
      update: function (dt) {
        G.acc += dt;
        var step = Math.max(0.06, 0.12 - G.score * 0.002);
        while (G.acc >= step && G.state === "playing") {
          G.acc -= step;
          G.dir = G.nd;
          var h = { x: (G.sn[0].x + G.dir.x + 32) % 32, y: (G.sn[0].y + G.dir.y + 20) % 20 };
          if (G.sn.some(function (s) { return s.x === h.x && s.y === h.y; })) {
            G.lives = 0; arcadeHud(); arcadeOver(false); return;
          }
          G.sn.unshift(h);
          if (h.x === G.fd.x && h.y === G.fd.y) { G.score++; arcadeHud(); MINI.snake.food(); }
          else G.sn.pop();
        }
      },
      draw: function (ctx) {
        ctx.fillStyle = "rgba(10,8,24,.55)"; ctx.fillRect(0, 0, 640, 400);
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        ctx.beginPath(); ctx.arc(G.fd.x * 20 + 10, G.fd.y * 20 + 10, 7, 0, 6.283); ctx.fill();
        ctx.shadowColor = G.color;
        G.sn.forEach(function (s, i) {
          ctx.fillStyle = i === 0 ? "#ffffff" : G.color;
          ctx.fillRect(s.x * 20 + 1, s.y * 20 + 1, 18, 18);
        });
      }
    },

    /* ---------- Memory match ---------- */
    memory: {
      help: "Click the cards to flip them and find all six pairs. Every wrong guess costs one try, and you only have eight.",
      reset: function () {
        var sym = ["◆", "●", "▲", "■", "★", "♥"], deck = sym.concat(sym);
        for (var i = deck.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
        }
        G.cards = deck.map(function (s) { return { s: s, open: false, done: false }; });
        G.pick = []; G.lock = 0; G.lives = 8;
      },
      click: function (x, y) {
        if (G.lock > 0) return;
        var col = Math.floor((x - 56) / 136), row = Math.floor((y - 40) / 112);
        if (col < 0 || col > 3 || row < 0 || row > 2) return;
        if ((x - 56) % 136 > 120 || (y - 40) % 112 > 96) return;
        var i = row * 4 + col, c = G.cards[i];
        if (c.open || c.done) return;
        c.open = true; G.pick.push(i);
        if (G.pick.length < 2) return;
        var a = G.cards[G.pick[0]], b = G.cards[G.pick[1]];
        if (a.s === b.s) {
          a.done = b.done = true; G.pick = []; G.score += 10;
          if (G.cards.every(function (k) { return k.done; })) { G.score += G.lives * 5; arcadeHud(); arcadeOver(true); return; }
          arcadeHud();
        } else {
          G.lives--; G.lock = 0.7; arcadeHud();
        }
      },
      update: function (dt) {
        if (G.lock > 0) {
          G.lock -= dt;
          if (G.lock <= 0) {
            G.pick.forEach(function (i) { G.cards[i].open = false; });
            G.pick = [];
            if (G.lives <= 0) arcadeOver(false);
          }
        }
      },
      draw: function (ctx) {
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "44px sans-serif";
        G.cards.forEach(function (c, i) {
          var x = 56 + (i % 4) * 136, y = 40 + Math.floor(i / 4) * 112;
          ctx.fillStyle = c.done ? "rgba(79,224,176,.28)" : c.open ? "rgba(255,255,255,.18)" : "rgba(123,92,255,.4)";
          ctx.fillRect(x, y, 120, 96);
          ctx.strokeStyle = c.done ? "#4fe0b0" : "rgba(255,255,255,.35)";
          ctx.strokeRect(x + .5, y + .5, 119, 95);
          if (c.open || c.done) { ctx.fillStyle = "#fff"; ctx.fillText(c.s, x + 60, y + 50); }
        });
      }
    },

    /* ---------- Endless runner ---------- */
    runner: {
      help: "Press Space, ↑ or click / tap to jump over the obstacles. The longer you run, the faster it gets.",
      reset: function () {
        G.py = 0; G.vy = 0; G.obs = []; G.spawn = 1; G.inv = 0; G.lives = 3; G.off = 0; G.dist = 0;
      },
      jump: function () { if (G.py === 0) G.vy = 640; },
      key: function (e) {
        if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") MINI.runner.jump();
      },
      click: function () { MINI.runner.jump(); },
      update: function (dt) {
        var speed = Math.min(520, 260 + G.t * 8);
        G.dist += speed * dt; G.off = (G.off + speed * dt) % 40;
        var sc = Math.floor(G.dist / 60);
        if (sc !== G.score) { G.score = sc; arcadeHud(); }
        G.vy -= 1800 * dt; G.py += G.vy * dt;
        if (G.py <= 0) { G.py = 0; G.vy = 0; }
        G.inv = Math.max(0, G.inv - dt);
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = 0.9 + Math.random() * 0.9 - Math.min(0.4, G.t * 0.005);
          G.obs.push({ x: 660, w: 22 + Math.random() * 20, h: 24 + Math.random() * 30 });
        }
        G.obs = G.obs.filter(function (o) {
          o.x -= speed * dt;
          var top = 290 - G.py;
          if (G.state === "playing" && G.inv <= 0 && o.x < 115 && o.x + o.w > 85 && top + 40 > 330 - o.h) {
            G.inv = 1.2; hurt(); return false;
          }
          return o.x > -60;
        });
      },
      draw: function (ctx) {
        ctx.fillStyle = "rgba(10,8,24,.45)"; ctx.fillRect(0, 330, 640, 70);
        ctx.fillStyle = "#4fe0b0"; ctx.fillRect(0, 330, 640, 3);
        ctx.fillStyle = "rgba(255,255,255,.25)";
        for (var x = -40 + G.off; x < 640; x += 40) ctx.fillRect(x, 352, 20, 3);
        ctx.shadowBlur = 12; ctx.shadowColor = "#ff4d6d"; ctx.fillStyle = "#ff4d6d";
        G.obs.forEach(function (o) {
          ctx.beginPath();
          ctx.moveTo(o.x, 330); ctx.lineTo(o.x + o.w / 2, 330 - o.h); ctx.lineTo(o.x + o.w, 330);
          ctx.closePath(); ctx.fill();
        });
        if (G.inv <= 0 || Math.floor(G.inv * 10) % 2 === 0) {
          ctx.shadowColor = G.color; ctx.fillStyle = G.color;
          ctx.fillRect(85, 290 - G.py, 30, 40);
          ctx.fillStyle = "#fff"; ctx.fillRect(103, 298 - G.py, 6, 6);
        }
      }
    },

    /* ---------- Orb catcher ---------- */
    catch: {
      help: "Move with the mouse, touch or ← → keys. Catch the glowing orbs, avoid the red spikes.",
      reset: function () { G.x = 320; G.w = 90; G.items = []; G.spawn = 0; G.lives = 3; },
      update: function (dt) {
        if (G.keys.ArrowLeft) G.x -= 420 * dt;
        if (G.keys.ArrowRight) G.x += 420 * dt;
        G.x = clamp(G.x, G.w / 2, 640 - G.w / 2);
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.28, 0.8 - G.t * 0.01);
          G.items.push({ x: 20 + Math.random() * 600, y: -14, bad: Math.random() < 0.28,
                         v: 130 + Math.random() * 60 + G.t * 4 });
        }
        G.items = G.items.filter(function (it) {
          it.y += it.v * dt;
          var hit = it.y > 360 && it.y < 390 && Math.abs(it.x - G.x) < G.w / 2 + 8;
          if (hit) {
            if (it.bad) hurt(); else { G.score++; arcadeHud(); }
            return false;
          }
          return it.y <= 420;
        });
      },
      draw: function (ctx) {
        ctx.shadowBlur = 16;
        G.items.forEach(function (it) {
          ctx.shadowColor = it.bad ? "#ff4d6d" : G.color;
          ctx.fillStyle = it.bad ? "#ff4d6d" : G.color;
          ctx.beginPath();
          if (it.bad) { ctx.moveTo(it.x, it.y - 12); ctx.lineTo(it.x + 11, it.y + 10); ctx.lineTo(it.x - 11, it.y + 10); ctx.closePath(); }
          else ctx.arc(it.x, it.y, 10, 0, 6.283);
          ctx.fill();
        });
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        ctx.fillRect(G.x - G.w / 2, 372, G.w, 12);
      }
    },

    /* ---------- Brick breaker ---------- */
    breakout: {
      help: "Move the paddle with the mouse, touch or ← → keys. Bounce the ball to break every brick. Drop the ball three times and it is over.",
      reset: function () {
        G.x = 320; G.w = 100; G.lives = 3; G.items = [];
        G.bricks = [];
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 10; c++) G.bricks.push({ x: 20 + c * 60, y: 40 + r * 24, w: 54, h: 18, row: r, alive: true });
        }
        G.left = G.bricks.length;
        G.ball = { x: 320, y: 340, vx: 150, vy: -250 };
      },
      update: function (dt) {
        if (G.keys.ArrowLeft) G.x -= 440 * dt;
        if (G.keys.ArrowRight) G.x += 440 * dt;
        G.x = clamp(G.x, G.w / 2, 640 - G.w / 2);
        var b = G.ball;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx); }
        if (b.x > 634) { b.x = 634; b.vx = -Math.abs(b.vx); }
        if (b.y < 6) { b.y = 6; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + 6 >= 372 && b.y < 386 && Math.abs(b.x - G.x) < G.w / 2 + 6) {
          b.vy = -Math.abs(b.vy);
          b.vx = clamp((b.x - G.x) / (G.w / 2) * 300, -300, 300);
          if (Math.abs(b.vx) < 70) b.vx = (b.vx < 0 || (b.vx === 0 && Math.random() < 0.5) ? -1 : 1) * 70;
        }
        for (var i = 0; i < G.bricks.length; i++) {
          var k = G.bricks[i];
          if (k.alive && b.x > k.x - 6 && b.x < k.x + k.w + 6 && b.y > k.y - 6 && b.y < k.y + k.h + 6) {
            k.alive = false; G.left--; G.score++; arcadeHud();
            b.vy = -b.vy * 1.015;
            if (G.left <= 0) { arcadeOver(true); return; }
            break;
          }
        }
        if (b.y > 410) {
          hurt();
          if (G && G.state === "playing") {
            G.ball = { x: G.x, y: 340, vx: (Math.random() < 0.5 ? -1 : 1) * 150, vy: -250 };
          }
        }
      },
      draw: function (ctx) {
        ctx.shadowBlur = 10;
        G.bricks.forEach(function (k) {
          if (!k.alive) return;
          ctx.shadowColor = COLORS[k.row % COLORS.length];
          ctx.fillStyle = COLORS[k.row % COLORS.length];
          ctx.fillRect(k.x, k.y, k.w, k.h);
        });
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        ctx.fillRect(G.x - G.w / 2, 372, G.w, 12);
        ctx.shadowColor = "#ffffff"; ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(G.ball.x, G.ball.y, 6, 0, 6.283); ctx.fill();
      }
    },

    /* ---------- Target tap ---------- */
    whack: {
      help: "Click or tap each target before its ring runs out. Every target that vanishes costs a life. Three misses and it is over.",
      reset: function () { G.items = []; G.spawn = 0.4; G.lives = 3; },
      update: function (dt) {
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.35, 0.9 - G.t * 0.012);
          G.items.push({ x: 50 + Math.random() * 540, y: 50 + Math.random() * 300, age: 0,
                         life: Math.max(0.8, 1.7 - G.t * 0.014), r: 26 });
        }
        for (var i = G.items.length - 1; i >= 0; i--) {
          var it = G.items[i];
          it.age += dt;
          if (it.age >= it.life) {
            G.items.splice(i, 1);
            hurt();
            if (!G || G.state !== "playing") return;
          }
        }
      },
      click: function (x, y) {
        for (var i = 0; i < G.items.length; i++) {
          var it = G.items[i];
          if (Math.hypot(it.x - x, it.y - y) <= it.r + 8) {
            G.items.splice(i, 1); G.score++; arcadeHud();
            return;
          }
        }
      },
      draw: function (ctx) {
        G.items.forEach(function (it) {
          var left = 1 - it.age / it.life;
          ctx.shadowBlur = 14; ctx.shadowColor = G.color; ctx.fillStyle = G.color;
          ctx.globalAlpha = 0.35 + 0.65 * left;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r * (0.6 + 0.4 * left), 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0; ctx.strokeStyle = "#ffc247"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 7, -1.5708, -1.5708 + 6.283 * left); ctx.stroke();
        });
      }
    },

    /* ---------- First-person bot shooter ---------- */
    fps: {
      help: "FIRST-PERSON 3D-STYLE MISSION: WASD to walk, Shift to sprint, mouse to look, click to shoot, R to restart after defeat. Eliminate 8 enemy bots.",
      reset: function () {
        G.px = 3.5; G.py = 3.5; G.angle = 0.15; G.hp = 100; G.ammo = 40; G.kills = 0; G.shotFlash = 0; G.hitFlash = 0; G.enemyClock = 0;
        G.map = ["111111111111", "100000000001", "101100110101", "100000000001", "101011010101", "100000000001", "101100110101", "100000000001", "111111111111"];
        G.bots = [ {x:8.5,y:1.8,hp:2},{x:9.3,y:3.5,hp:2},{x:2.4,y:5.4,hp:2},{x:8.5,y:6.8,hp:2},{x:5.5,y:1.7,hp:2},{x:5.7,y:7.3,hp:2},{x:1.7,y:3.2,hp:2},{x:10,y:5.2,hp:2} ];
        G.lives = 3; G.score = 0; G.lastMouseX = null; G.damageWait = 0;
      },
      wall: function(x,y){ return !G.map[Math.floor(y)] || G.map[Math.floor(y)][Math.floor(x)] !== "0"; },
      update: function(dt) {
        var speed=(G.keys.Shift ? 3.6 : 2.25)*dt, ca=Math.cos(G.angle), sa=Math.sin(G.angle), nx=G.px, ny=G.py;
        if(G.keys.ArrowLeft) G.angle-=1.8*dt; if(G.keys.ArrowRight) G.angle+=1.8*dt;
        if(G.keys.KeyA || G.keys.a) { nx += Math.cos(G.angle-1.5708)*speed; ny += Math.sin(G.angle-1.5708)*speed; }
        if(G.keys.KeyD || G.keys.d) { nx += Math.cos(G.angle+1.5708)*speed; ny += Math.sin(G.angle+1.5708)*speed; }
        if(G.keys.KeyW || G.keys.w || G.keys.ArrowUp) { nx += ca*speed; ny += sa*speed; }
        if(G.keys.KeyS || G.keys.s || G.keys.ArrowDown) { nx -= ca*speed; ny -= sa*speed; }
        if(!this.wall(nx,G.py)) G.px=nx; if(!this.wall(G.px,ny)) G.py=ny;
        G.shotFlash=Math.max(0,G.shotFlash-dt); G.hitFlash=Math.max(0,G.hitFlash-dt); G.damageWait-=dt;
        G.bots.forEach(function(b){ if(b.hp<=0)return; var dx=G.px-b.x,dy=G.py-b.y,d=Math.hypot(dx,dy); if(d>0.8){var v=0.32*dt;b.x+=dx/d*v;b.y+=dy/d*v;} if(d<1.0 && G.damageWait<=0){G.hp-=12;G.damageWait=0.7;G.hitFlash=0.18;document.getElementById("arcade-lives").textContent=Math.max(0,Math.ceil(G.hp/34));if(G.hp<=0)arcadeOver(false);} });
        if(G.kills>=8 && G.state==="playing"){G.score=G.kills*100+Math.max(0,G.hp);arcadeHud();arcadeOver(true);}
      },
      click: function(){
        if(G.state!=="playing")return; if(G.ammo<=0){gameMsg("OUT OF AMMO","Mission failed — restart to reload.");return;}
        G.ammo--;G.shotFlash=0.12;var best=null,bestDiff=0.15;
        G.bots.forEach(function(b){if(b.hp<=0)return;var dx=b.x-G.px,dy=b.y-G.py,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx)-G.angle;a=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(a)<bestDiff && dist<7){best=b;bestDiff=Math.abs(a);}});
        if(best){best.hp--;if(best.hp<=0){G.kills++;G.score=G.kills*100;arcadeHud();} }
        if(G.ammo===0 && G.kills<8){gameMsg("MAGAZINE EMPTY","You need to restart the mission.");}
      },
      draw: function(ctx){
        var w=640,h=400;var sky=ctx.createLinearGradient(0,0,0,220);sky.addColorStop(0,"#071226");sky.addColorStop(1,"#31546c");ctx.fillStyle=sky;ctx.fillRect(0,0,w,200);
        var floor=ctx.createLinearGradient(0,200,0,h);floor.addColorStop(0,"#263641");floor.addColorStop(1,"#090d15");ctx.fillStyle=floor;ctx.fillRect(0,200,w,200);
        var depths=[],rays=160,fov=1.12;
        for(var i=0;i<rays;i++){var a=G.angle-fov/2+fov*i/rays,dx=Math.cos(a),dy=Math.sin(a),d=0,hit=false;while(d<12&&!hit){d+=0.035;hit=this.wall(G.px+dx*d,G.py+dy*d);}d*=Math.cos(a-G.angle);depths[i]=d;var wh=Math.min(400,260/d),shade=Math.max(24,125-d*10);ctx.fillStyle="rgb("+(shade*.48|0)+","+(shade*.78|0)+","+(shade|0)+")";ctx.fillRect(i*w/rays,200-wh/2,w/rays+1,wh);if((i%8)<2){ctx.fillStyle="rgba(120,220,255,.09)";ctx.fillRect(i*w/rays,200-wh/2,w/rays+1,wh);}}
        G.bots.forEach(function(b){if(b.hp<=0)return;var dx=b.x-G.px,dy=b.y-G.py,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx)-G.angle;a=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(a)>fov/2+0.2)return;var sx=w/2+a/fov*w,sz=Math.min(150,95/dist),sy=200;var ri=Math.max(0,Math.min(rays-1,Math.floor(sx/w*rays)));if(dist>depths[ri]+0.2)return;ctx.fillStyle="#1a202b";ctx.fillRect(sx-sz*.28,sy-sz*.08,sz*.56,sz*.8);ctx.fillStyle="#d94e58";ctx.fillRect(sx-sz*.23,sy-sz*.42,sz*.46,sz*.38);ctx.fillStyle="#ffdbb1";ctx.fillRect(sx-sz*.17,sy-sz*.38,sz*.34,sz*.2);ctx.fillStyle="#6fffe0";ctx.fillRect(sx-sz*.18,sy-sz*.32,sz*.08,sz*.05);ctx.fillRect(sx+sz*.1,sy-sz*.32,sz*.08,sz*.05);ctx.fillStyle="#ef5361";ctx.fillRect(sx-sz*.25,sy-sz*.5,sz*.5,4);ctx.fillStyle="#57ef9a";ctx.fillRect(sx-sz*.25,sy-sz*.5,sz*.5*(b.hp/2),4);});
        // weapon silhouette and HUD
        ctx.fillStyle="#101820";ctx.beginPath();ctx.moveTo(270,400);ctx.lineTo(292,315);ctx.lineTo(347,315);ctx.lineTo(371,400);ctx.fill();ctx.fillStyle="#465868";ctx.fillRect(301,300,38,70);ctx.fillStyle="#192734";ctx.fillRect(311,280,18,48);
        ctx.strokeStyle=G.shotFlash?"#ffce66":"#e6f6ff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(310,200);ctx.lineTo(330,200);ctx.moveTo(320,190);ctx.lineTo(320,210);ctx.stroke();
        ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(12,12,205,56);ctx.fillStyle="#70f5dc";ctx.font="bold 14px Arial";ctx.fillText("OPERATION: IRON VEIL",22,31);ctx.fillStyle="#fff";ctx.font="12px Arial";ctx.fillText("BOTS: "+G.kills+" / 8     AMMO: "+G.ammo,22,49);ctx.fillStyle="#333";ctx.fillRect(22,55,175,6);ctx.fillStyle=G.hp>35?"#52edaa":"#ff526b";ctx.fillRect(22,55,175*Math.max(0,G.hp)/100,6);
        if(G.hitFlash){ctx.fillStyle="rgba(255,20,50,.2)";ctx.fillRect(0,0,w,h);}
      }
    }
  };

  function buildArcade() {
    var box = document.createElement("div");
    box.className = "arcade";
    box.id = "arcade";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "arcade-title");
    box.innerHTML = [
      '<div class="arcade__card">',
      '  <div class="arcade__bar">',
      '    <b id="arcade-title"></b>',
      '    <span>Score <b id="arcade-score">0</b></span>',
      '    <span>Lives <b id="arcade-lives">3</b></span>',
      '    <span>Best <b id="arcade-best">0</b></span>',
      '    <button type="button" class="btn btn--ghost btn--small" id="arcade-exit">Exit game</button>',
      '  </div>',
      '  <div class="arcade__stage" id="arcade-stage">',
      '    <canvas id="arcade-canvas" width="640" height="400"></canvas>',
      '    <div class="arcade__msg" id="arcade-msg"></div>',
      '  </div>',
      '  <p class="arcade__help" id="arcade-help"></p>',
      '</div>'
    ].join("");
    return box;
  }

  function gameMsg(title, text) {
    document.getElementById("arcade-msg").innerHTML = "<b>" + esc(title) + "</b><span>" + esc(text) + "</span>";
    document.getElementById("arcade-msg").hidden = false;
  }

  function launchGame(title) {
    if (window.VPFP && GAMES[title]) { window.VPFP.launch(title); return; }
    if (!arcade || !GAMES[title]) return;
    var hue = 0;
    for (var i = 0; i < title.length; i++) hue += title.charCodeAt(i);
    var best = readHistory().filter(function (h) { return h.title === title; })
      .reduce(function (m, h) { return Math.max(m, h.score); }, 0);
    var kind = KIND_OF[title] || "catch";

    G = { title: title, kind: kind, color: COLORS[hue % COLORS.length], state: "ready", x: 320, w: 90, items: [],
          score: 0, lives: 3, best: best, t: 0, spawn: 0, played: 0, startedAt: 0, keys: {}, raf: 0, last: 0 };
    MINI[kind].reset();

    document.getElementById("arcade-title").textContent = title;
    document.getElementById("arcade-help").textContent = MINI[kind].help + " Click or press Space to start.";
    document.getElementById("arcade-stage").style.backgroundImage =
      "linear-gradient(rgba(10,8,24,.78), rgba(10,8,24,.9)), url('" + GAMES[title].img + "')";
    gameMsg(title, KIND_NAME[kind] + " · click or press Space to start");
    arcadeHud();
    arcade.hidden = false;
    document.body.classList.add("is-locked");
    document.getElementById("arcade-exit").focus();
    G.last = performance.now();
    G.raf = requestAnimationFrame(arcadeLoop);
  }

  function arcadeHud() {
    document.getElementById("arcade-score").textContent = G.score;
    document.getElementById("arcade-lives").textContent = G.lives;
    document.getElementById("arcade-best").textContent = Math.max(G.best, G.score);
  }

  function arcadeStart() {
    if (!G || G.state === "playing") return;
    G.state = "playing";
    G.score = 0; G.t = 0;
    MINI[G.kind].reset();
    G.startedAt = Date.now();
    document.getElementById("arcade-msg").hidden = true;
    arcadeHud();
  }

  function arcadeOver(win) {
    if (!G || G.state === "over") return;
    G.state = "over";
    G.played += (Date.now() - G.startedAt) / 1000;
    if (G.score > G.best) G.best = G.score;
    gameMsg(win ? "You win!" : "Game over", "Score " + G.score + " · click or press Space to play again");
    arcadeHud();
  }

  function arcadeLoop(now) {
    if (!G || arcade.hidden) return;
    var dt = Math.min(0.05, (now - G.last) / 1000);
    G.last = now;
    var c = document.getElementById("arcade-canvas"), ctx = c.getContext("2d");
    var K = MINI[G.kind];

    if (G.state === "playing") {
      G.t += dt;
      K.update(dt);
    }

    ctx.clearRect(0, 0, 640, 400);
    ctx.shadowBlur = 0;
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    K.draw(ctx);
    ctx.shadowBlur = 0;

    G.raf = requestAnimationFrame(arcadeLoop);
  }

  function closeGame() {
    if (!G) return;
    cancelAnimationFrame(G.raf);
    var secs = G.played + (G.state === "playing" ? (Date.now() - G.startedAt) / 1000 : 0);
    var score = G.score;
    var title = G.title;
    var wasPlaying = G.state === "playing";
    G = null;
    arcade.hidden = true;
    if (!gameModal || gameModal.hidden) document.body.classList.remove("is-locked");

    // every launch is saved, so the history always shows what was played last
    var list = readHistory();
    var bestScore = Math.max(score, wasPlaying ? score : 0);
    list.unshift({ title: title, ts: Date.now(), score: Math.max(bestScore, 0), dur: secs });
    writeHistory(list.slice(0, 100));
    document.dispatchEvent(new CustomEvent("vp:history"));
    toast("Saved to play history: " + title);
  }

  function startArcade() {
    document.body.appendChild(buildArcade());
    arcade = document.getElementById("arcade");
    document.getElementById("arcade-exit").addEventListener("click", closeGame);

    var stage = document.getElementById("arcade-stage");
    var canvas = document.getElementById("arcade-canvas");

    function toCanvas(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left) / r.width * 640, y: (clientY - r.top) / r.height * 400 };
    }

    stage.addEventListener("click", function (e) {
      if (!G) return;
      if (G.state !== "playing") { arcadeStart(); return; }
      var K = MINI[G.kind];
      if (K.click) { var p = toCanvas(e.clientX, e.clientY); K.click(p.x, p.y); }
    });

    function moveTo(clientX) {
      if (!G) return;
      if (G.kind === "fps") {
        if (G.lastMouseX !== null) G.angle += (clientX - G.lastMouseX) * 0.004;
        G.lastMouseX = clientX;
      } else G.x = toCanvas(clientX, 0).x;
    }
    stage.addEventListener("mousemove", function (e) { moveTo(e.clientX); });
    stage.addEventListener("mouseleave", function () { if (G && G.kind === "fps") G.lastMouseX = null; });
    stage.addEventListener("touchmove", function (e) { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });

    // swipes steer the snake on touch screens
    var sx = 0, sy = 0;
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (!G || G.kind !== "snake" || G.state !== "playing") return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) MINI.snake.turn(dx > 0 ? 1 : -1, 0);
      else MINI.snake.turn(0, dy > 0 ? 1 : -1);
    });

    document.addEventListener("keydown", function (e) {
      if (!G) return;
      if (e.key === "Escape") { closeGame(); return; }
      if ((e.key === "r" || e.key === "R") && G.kind === "fps") { arcadeStart(); return; }
      var K = MINI[G.kind];
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "W", "A", "S", "D"].indexOf(e.key) !== -1) {
        G.keys[e.key] = true; G.keys[e.code] = true; e.preventDefault();
        if (G.state === "playing" && K.key) K.key(e);
      }
      if ((e.key === " " || e.key === "Enter") && e.target.id !== "arcade-exit") {
        e.preventDefault();
        if (G.state !== "playing") arcadeStart();
        else if (K.key) K.key(e);
      }
    });
    document.addEventListener("keyup", function (e) { if (G) G.keys[e.key] = false; });
  }

  function imageOf(title) {
    var data = GAMES[title];
    return data ? data.img : "";
  }

  

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : (cartMemory || []);
    } catch (e) {
      return cartMemory || [];
    }
  }

  function writeCart(list) {
    cartMemory = list;
    try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) {}
    paintCartCount();
    paintCartPanel();
  }

  function inCart(title) {
    return readCart().indexOf(title) !== -1;
  }

  function addToCart(title) {
    if (isOwned(title)) { toast(title + " is already in your profile"); return; }
    var list = readCart();
    if (list.indexOf(title) !== -1) { toast(title + " is already in the cart"); return; }
    list.push(title);
    writeCart(list);
    toast(title + " added to cart");
  }

  function removeFromCart(title) {
    writeCart(readCart().filter(function (item) { return item !== title; }));
  }

  function cartTotal() {
    return readCart().reduce(function (sum, title) {
      var data = GAMES[title];
      return sum + (data && data.price ? (data.price.value || 0) : 0);
    }, 0);
  }

  function paintCartCount() {
    var count = readCart().length;
    document.querySelectorAll("[data-cart-count]").forEach(function (node) {
      node.textContent = count;
      node.classList.toggle("is-empty", count === 0);
    });
  }

  var cartPanel;

  function buildCartPanel() {
    var panel = document.createElement("div");
    panel.className = "drawer";
    panel.id = "cart-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Cart");
    panel.innerHTML = [
      '<div class="drawer__card">',
      '  <div class="drawer__head">',
      '    <h2>Cart</h2>',
      '    <button type="button" class="drawer__close" data-cart-close aria-label="Close">×</button>',
      '  </div>',
      '  <div class="drawer__body" id="cart-items"></div>',
      '  <div class="drawer__foot">',
      '    <p class="drawer__total"><span>Total</span><b id="cart-total">0 ₽</b></p>',
      '    <button class="btn btn--primary btn--block" type="button" id="cart-buy">Check out</button>',
      '  </div>',
      '</div>'
    ].join("");
    return panel;
  }

  function paintCartPanel() {
    var box = document.getElementById("cart-items");
    if (!box) return;
    var list = readCart();

    if (!list.length) {
      box.innerHTML = '<p class="drawer__empty">Nothing here yet. Open a game page and press “Add to cart”.</p>';
    } else {
      box.innerHTML = list.map(function (title) {
        var data = GAMES[title] || {};
        return [
          '<div class="cart-item">',
          '  <div class="cover cart-item__cover" style="background-image:url(\'' + imageOf(title) + '\')"></div>',
          '  <div class="cart-item__body">',
          '    <b>' + esc(title) + '</b>',
          '    <span>' + esc(data.genre) + '</span>',
          '  </div>',
          '  <span class="cart-item__price">' + esc(data.price ? data.price.now : "—") + '</span>',
          '  <button type="button" class="cart-item__remove" data-cart-remove="' + esc(title) + '" aria-label="Remove ' + esc(title) + '">×</button>',
          '</div>'
        ].join("");
      }).join("");
    }

    var total = document.getElementById("cart-total");
    if (total) total.textContent = money(cartTotal());
  }

  function openCart() {
    if (!cartPanel) return;
    paintCartPanel();
    cartPanel.hidden = false;
    document.body.classList.add("is-locked");
  }

  function closeCart() {
    if (!cartPanel) return;
    cartPanel.hidden = true;
    if (!gameModal || gameModal.hidden) document.body.classList.remove("is-locked");
  }

  function startCart() {
    document.body.appendChild(buildCartPanel());
    cartPanel = document.getElementById("cart-panel");

    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-cart-open]")) { openCart(); return; }
      if (event.target.closest("[data-cart-close]")) { closeCart(); return; }

      var remove = event.target.closest("[data-cart-remove]");
      if (remove) { removeFromCart(remove.dataset.cartRemove); refreshBuyButtons(); return; }

      if (event.target === cartPanel) closeCart();
    });

    document.getElementById("cart-buy").addEventListener("click", openCheckout);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && cartPanel && !cartPanel.hidden) closeCart();
    });

    paintCartCount();
  }

  var OWNED_KEY = "bagame.owned";
  var CONTACT_KEY = "bagame.contact";
  var ownedMemory = [];
  var checkout, checkoutBusy = false;

  function readOwned() {
    try {
      var raw = localStorage.getItem(OWNED_KEY);
      return raw ? JSON.parse(raw) : ownedMemory;
    } catch (e) { return ownedMemory; }
  }
  function writeOwned(list) {
    ownedMemory = list;
    try { localStorage.setItem(OWNED_KEY, JSON.stringify(list)); } catch (e) {}
    document.dispatchEvent(new CustomEvent("vp:owned"));
  }
  function isOwned(title) {
    return readOwned().some(function (o) { return o.title === title; });
  }
  function readContact() {
    try { return JSON.parse(localStorage.getItem(CONTACT_KEY)) || null; } catch (e) { return null; }
  }

  function buildCheckout() {
    var box = document.createElement("div");
    box.className = "gate topup";
    box.id = "checkout";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "co-title");
    box.innerHTML = [
      '<div class="gate__card topup__card">',
      '  <button type="button" class="topup__close" data-co-close aria-label="Close">×</button>',
      '  <h2 class="topup__title" id="co-title">Checkout</h2>',
      '  <p class="topup__balance" id="co-sum"></p>',
      '  <form id="co-form" novalidate>',
      '    <div class="field"><label for="co-phone">Phone number</label>',
      '      <input id="co-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67">',
      '      <span class="field__error" data-coerr="phone"></span></div>',
      '    <div class="field"><label for="co-mail">Gmail</label>',
      '      <input id="co-mail" type="email" autocomplete="email" placeholder="name@gmail.com">',
      '      <span class="field__error" data-coerr="mail"></span></div>',
      '    <div class="field"><label for="co-card">Card number</label>',
      '      <input id="co-card" type="text" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="Any 13–19 digits">',
      '      <span class="field__error" data-coerr="card"></span></div>',
      '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="co-exp">Expiry (MM/YY)</label><input id="co-exp" maxlength="5" placeholder="MM/YY"><span class="field__error" data-coerr="exp"></span></div>',
      '    <div class="field"><label for="co-cvv">CVV</label><input id="co-cvv" inputmode="numeric" maxlength="4" placeholder="123"><span class="field__error" data-coerr="cvv"></span></div></div>',
      '    <button class="btn btn--primary btn--block" type="submit" id="co-submit">Pay and add to profile</button>', 
      '  </form>',
      '  <p class="topup__note">Demo checkout: enter any card number (13–19 digits), any expiry MM/YY and any CVV. Nothing is sent to a real bank — data stays in this browser only.</p>',
      '</div>'
    ].join("");
    return box;
  }

  function coError(name, message) {
    checkout.querySelector('[data-coerr="' + name + '"]').textContent = message;
    var id = ({phone:"co-phone",mail:"co-mail",card:"co-card",exp:"co-exp",cvv:"co-cvv"})[name] || "co-mail";
    document.getElementById(id).setAttribute("aria-invalid", "true");
  }
  function coClear() {
    checkout.querySelectorAll("[data-coerr]").forEach(function (n) { n.textContent = ""; });
    checkout.querySelectorAll("input").forEach(function (n) { n.removeAttribute("aria-invalid"); });
  }

  function openCheckout() {
    var account = read();
    if (!account) { closeCart(); openGate(); return; }
    var list = readCart();
    if (!list.length) { toast("Your cart is empty"); return; }
    coClear();
    var saved = readContact() || {};
    var fallback = account.email && /@gmail\.com$/i.test(account.email) ? account.email : "";
    document.getElementById("co-phone").value = saved.phone || "";
    document.getElementById("co-mail").value = saved.email || fallback;
    document.getElementById("co-sum").innerHTML = list.length + (list.length === 1 ? " game" : " games") + " · total <b>" + money(cartTotal()) + "</b>";
    document.getElementById("co-submit").disabled = false;
    checkoutBusy = false;
    closeCart();
    checkout.hidden = false;
    document.body.classList.add("is-locked");
    document.getElementById("co-phone").focus();
  }

  function closeCheckout() {
    if (!checkout || checkoutBusy) return;
    checkout.hidden = true;
    if ((!gameModal || gameModal.hidden) && (!cartPanel || cartPanel.hidden)) document.body.classList.remove("is-locked");
  }

  function submitCheckout() {
    coClear();
    var account = read();
    if (!account) { closeCheckout(); openGate(); return; }
    var phone = document.getElementById("co-phone").value.trim();
    var email = document.getElementById("co-mail").value.trim().toLowerCase();
    var digits = phone.replace(/[\s\-()]/g, "");
    var card = document.getElementById("co-card").value.replace(/\s/g, "");
    var exp = document.getElementById("co-exp").value.trim();
    var cvv = document.getElementById("co-cvv").value.trim();
    var ok = true;
    if (!/^\+?\d{9,15}$/.test(digits)) { coError("phone", "Enter a valid phone number, 9–15 digits."); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { coError("mail", "Enter a valid email address."); ok = false; }
    if (!/^\d{13,19}$/.test(card)) { coError("card", "Enter 13–19 digits (spaces allowed)."); ok = false; }
    // Accept any MM/YY-style or pure digits for expiry (demo)
    var expDigits = exp.replace(/\D/g, "");
    if (expDigits.length < 3 || expDigits.length > 4) { coError("exp", "Enter expiry as digits, e.g. 09/28 or 0928."); ok = false; }
    if (!/^\d{3,4}$/.test(cvv)) { coError("cvv", "Enter 3 or 4 digits."); ok = false; }
    if (!ok) return;
    var list = readCart();
    if (!list.length) { toast("Your cart is empty"); closeCheckout(); return; }
    checkoutBusy = true;
    document.getElementById("co-submit").disabled = true;
    document.getElementById("co-submit").textContent = "Processing demo payment…";
    setTimeout(function () {
      var now = Date.now(), owned = readOwned().slice();
      list.forEach(function (title) {
        if (!owned.some(function (o) { return o.title === title; })) owned.push({ title: title, at: now, phone: digits, email: email });
      });
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ phone: digits, email: email })); } catch (e) {}
      writeOwned(owned); writeCart([]); refreshBuyButtons();
      checkoutBusy = false;
      document.getElementById("co-submit").textContent = "Pay and add to profile";
      closeCheckout();
      toast("Demo purchase complete — no real payment was taken");
    }, 700);
  }

  function startCheckout() {
    document.body.appendChild(buildCheckout());
    checkout = document.getElementById("checkout");
    checkout.addEventListener("click", function (e) {
      if (e.target === checkout || e.target.closest("[data-co-close]")) closeCheckout();
    });
    document.getElementById("co-form").addEventListener("submit", function (e) { e.preventDefault(); submitCheckout(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && checkout && !checkout.hidden) closeCheckout(); });
  }

  function refreshBuyButtons() {
    document.querySelectorAll("[data-buy]").forEach(function (button) {
      var title = button.dataset.buy;
      var own = isOwned(title);
      var added = own || inCart(title);
      button.textContent = own ? "Owned" : (added ? "In cart" : "Add to cart");
      button.classList.toggle("is-added", added);
    });
  }

  

  var toastTimer;

  function toast(message) {
    var node = document.getElementById("toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "toast";
      node.className = "toast";
      node.setAttribute("role", "status");
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-shown"); }, 2600);
  }

  

  var TOPUP_MIN = 1;
  var TOPUP_MAX = 500;
  var TOPUP_PRESETS = [5, 10, 20, 50, 100];
  var topup, topupMethod = "card", topupBusy = false;

  function money(value) {
    return "$" + Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setWallet(value) {
    var account = read();
    if (!account) return;
    account.wallet = Math.max(0, Math.round(value * 100) / 100);
    write(account);
    paintSession(account);
    document.dispatchEvent(new CustomEvent("vp:wallet", { detail: account }));
  }

  function luhn(number) {
    var sum = 0, alt = false;
    for (var i = number.length - 1; i >= 0; i--) {
      var d = parseInt(number.charAt(i), 10);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }
  function processPayment(payment) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ ok: true }); }, 1200);
    });
  }

  function buildTopup() {
    var box = document.createElement("div");
    box.className = "gate topup";
    box.id = "topup";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "topup-title");
    box.innerHTML = [
      '<div class="gate__card topup__card">',
      '  <button type="button" class="topup__close" data-topup-close aria-label="Close">×</button>',
      '  <h2 class="topup__title" id="topup-title">Top up wallet</h2>',
      '  <p class="topup__balance">Current balance: <b id="topup-balance">0 ₽</b></p>',
      '  <form id="topup-form" novalidate>',
      '    <div class="topup__chips" id="topup-chips">',
      TOPUP_PRESETS.map(function (v) {
        return '<button type="button" class="topup__chip" data-amount="' + v + '" aria-pressed="false">' + money(v) + '</button>';
      }).join(""),
      '    </div>',
      '    <div class="field">',
      '      <label for="topup-amount">Other amount, $</label>',
      '      <input id="topup-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="from 1 to 500">',
      '      <span class="field__error" data-terr="amount"></span>',
      '    </div>',
      '    <div class="topup__methods" role="tablist" aria-label="Payment method">',
      '      <button type="button" role="tab" class="is-active" data-method="card" aria-selected="true">Bank card</button>',
      '      <button type="button" role="tab" data-method="sbp" aria-selected="false">Bank transfer</button>',
      '    </div>',
      '    <div id="topup-card">',
      '      <div class="field">',
      '        <label for="topup-number">Card number</label>',
      '        <input id="topup-number" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="23">',
      '        <span class="field__error" data-terr="number"></span>',
      '      </div>',
      '      <div class="topup__row">',
      '        <div class="field">',
      '          <label for="topup-exp">Expiry</label>',
      '          <input id="topup-exp" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5">',
      '          <span class="field__error" data-terr="exp"></span>',
      '        </div>',
      '        <div class="field">',
      '          <label for="topup-cvc">CVC</label>',
      '          <input id="topup-cvc" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="3">',
      '          <span class="field__error" data-terr="cvc"></span>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <p class="topup__sbp" id="topup-sbp" hidden>The payment will be confirmed in your banking app.</p>',
      '    <button class="btn btn--primary btn--block" type="submit" id="topup-submit">Top up</button>',
      '  </form>',
      '  <p class="topup__note">Demo mode: no real charges are made, and card details are never stored or sent.</p>',
      '</div>'
    ].join("");
    return box;
  }

  function topupField(name) {
    return topup.querySelector('[data-terr="' + name + '"]');
  }

  function topupFail(name, message, inputId) {
    topupField(name).textContent = message;
    var input = document.getElementById(inputId);
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function topupClearErrors() {
    topup.querySelectorAll("[data-terr]").forEach(function (n) { n.textContent = ""; });
    topup.querySelectorAll("input").forEach(function (n) { n.removeAttribute("aria-invalid"); });
  }

  function topupAmount() {
    var digits = document.getElementById("topup-amount").value.replace(/\D/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function topupRefresh() {
    var amount = topupAmount();
    document.querySelectorAll("#topup-chips .topup__chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(parseInt(chip.dataset.amount, 10) === amount));
    });
    var btn = document.getElementById("topup-submit");
    if (!topupBusy) btn.textContent = amount >= TOPUP_MIN && amount <= TOPUP_MAX ? "Top up " + money(amount) : "Top up";
  }

  function setTopupMethod(method) {
    topupMethod = method;
    topup.querySelectorAll("[data-method]").forEach(function (b) {
      var on = b.dataset.method === method;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    document.getElementById("topup-card").hidden = method !== "card";
    document.getElementById("topup-sbp").hidden = method !== "sbp";
    topupClearErrors();
  }

  function openTopup(prefill) {
    if (!topup) return;
    var account = read();
    if (!account) { openGate(); return; }
    if (cartPanel && !cartPanel.hidden) closeCart();

    topupBusy = false;
    document.getElementById("topup-form").reset();
    topupClearErrors();
    setTopupMethod("card");
    document.getElementById("topup-balance").textContent = money(account.wallet);
    var start = prefill ? Math.min(Math.max(Math.ceil(prefill), TOPUP_MIN), TOPUP_MAX) : 1000;
    document.getElementById("topup-amount").value = String(start);
    document.getElementById("topup-submit").disabled = false;
    topupRefresh();

    topup.hidden = false;
    document.body.classList.add("is-locked");
    document.getElementById("topup-number").focus();
  }

  function closeTopup() {
    if (!topup || topupBusy) return;
    topup.hidden = true;
    document.getElementById("topup-form").reset();
    var cartOpen = cartPanel && !cartPanel.hidden;
    var gameOpen = gameModal && !gameModal.hidden;
    if (!cartOpen && !gameOpen) document.body.classList.remove("is-locked");
  }

  function submitTopup() {
    if (topupBusy) return;
    topupClearErrors();
    var ok = true;
    var amount = topupAmount();

    if (amount < TOPUP_MIN || amount > TOPUP_MAX) {
      topupFail("amount", "Amount from " + money(TOPUP_MIN) + " to " + money(TOPUP_MAX) + ".", "topup-amount");
      ok = false;
    }

    if (topupMethod === "card") {
      var number = document.getElementById("topup-number").value.replace(/\D/g, "");
      if (number.length < 13 || number.length > 19 || !luhn(number)) {
        topupFail("number", "Check the card number.", "topup-number");
        ok = false;
      }
      var exp = document.getElementById("topup-exp").value.match(/^(\d{2})\/(\d{2})$/);
      var now = new Date();
      var valid = false;
      if (exp) {
        var mm = parseInt(exp[1], 10), yy = parseInt(exp[2], 10);
        var curYY = now.getFullYear() % 100, curMM = now.getMonth() + 1;
        valid = mm >= 1 && mm <= 12 && (yy > curYY || (yy === curYY && mm >= curMM));
      }
      if (!valid) { topupFail("exp", "Invalid expiry.", "topup-exp"); ok = false; }
      if (!/^\d{3}$/.test(document.getElementById("topup-cvc").value)) {
        topupFail("cvc", "3 digits.", "topup-cvc");
        ok = false;
      }
    }
    if (!ok) return;

    topupBusy = true;
    var btn = document.getElementById("topup-submit");
    btn.disabled = true;
    btn.textContent = "Processing payment…";

    processPayment({ amount: amount, method: topupMethod }).then(function (result) {
      topupBusy = false;
      if (!result || !result.ok) {
        btn.disabled = false;
        topupRefresh();
        toast("Payment failed. Please try again.");
        return;
      }
      var account = read();
      if (account) setWallet(account.wallet + amount);
      closeTopup();
      toast("Wallet topped up by " + money(amount));
    });
  }

  function startTopup() {
    document.body.appendChild(buildTopup());
    topup = document.getElementById("topup");

    document.getElementById("topup-form").addEventListener("submit", function (event) {
      event.preventDefault();
      submitTopup();
    });

    document.getElementById("topup-amount").addEventListener("input", function (event) {
      var digits = event.target.value.replace(/\D/g, "").slice(0, 6);
      event.target.value = digits ? parseInt(digits, 10).toLocaleString("en-US") : "";
      topupRefresh();
    });

    document.getElementById("topup-number").addEventListener("input", function (event) {
      var digits = event.target.value.replace(/\D/g, "").slice(0, 19);
      event.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });

    document.getElementById("topup-exp").addEventListener("input", function (event) {
      var digits = event.target.value.replace(/\D/g, "").slice(0, 4);
      event.target.value = digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
    });

    document.getElementById("topup-cvc").addEventListener("input", function (event) {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3);
    });

    topup.addEventListener("click", function (event) {
      if (event.target === topup || event.target.closest("[data-topup-close]")) { closeTopup(); return; }
      var chip = event.target.closest(".topup__chip");
      if (chip) {
        document.getElementById("topup-amount").value = parseInt(chip.dataset.amount, 10).toLocaleString("en-US");
        topupRefresh();
        return;
      }
      var method = event.target.closest("[data-method]");
      if (method) setTopupMethod(method.dataset.method);
    });

    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-topup]")) { event.preventDefault(); openTopup(); }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && topup && !topup.hidden) closeTopup();
    });
  }

  

  var gameModal, lastFocused;

  function buildGameModal() {
    var modal = document.createElement("div");
    modal.className = "gate game-modal";
    modal.id = "game-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "game-modal-title");
    modal.innerHTML = [
      '<div class="game-modal__card">',
      '  <button type="button" class="game-modal__close" id="game-modal-close" aria-label="Close">×</button>',
      '  <div class="game-modal__hero" id="game-modal-hero">',
      '    <div class="game-modal__hero-text">',
      '      <p class="game-modal__genre" id="game-modal-genre"></p>',
      '      <h2 id="game-modal-title"></h2>',
      '      <p class="game-modal__short" id="game-modal-short"></p>',
      '    </div>',
      '  </div>',
      '  <div class="game-modal__scroll">',
      '    <ul class="facts" id="game-modal-facts"></ul>',
      '    <ul class="tags game-modal__tags" id="game-modal-tags"></ul>',
      '    <div class="tabs" role="tablist" id="game-modal-tabs">',
      '      <button type="button" data-tab="about" aria-selected="true">About</button>',
      '      <button type="button" data-tab="specs" aria-selected="false">Specs</button>',
      '      <button type="button" data-tab="reviews" aria-selected="false">Reviews</button>',
      '    </div>',
      '    <div class="pane" data-pane="about">',
      '      <p class="game-modal__text" id="game-modal-text"></p>',
      '      <h3 class="game-modal__sub">What\'s inside</h3>',
      '      <ul class="features" id="game-modal-features"></ul>',
      '      <h3 class="game-modal__sub">Screenshots</h3>',
      '      <div class="shots" id="game-modal-shots"></div>',
      '    </div>',
      '    <div class="pane" data-pane="specs" hidden>',
      '      <table class="specs" id="game-modal-specs"></table>',
      '    </div>',
      '    <div class="pane" data-pane="reviews" hidden>',
      '      <div class="score" id="game-modal-score"></div>',
      '      <div class="reviews" id="game-modal-reviews"></div>',
      '    </div>',
      '  </div>',
      '  <div class="game-modal__buy" id="game-modal-buy"></div>',
      '</div>'
    ].join("");
    return modal;
  }

  function stars(rating) {
    var full = Math.round(rating);
    var out = "";
    for (var i = 1; i <= 5; i++) out += '<span class="' + (i <= full ? "is-on" : "") + '">★</span>';
    return out;
  }

  var REVIEWS = [
    { nick: "kira_vox", hours: "142 h", text: "Rare case where the description matches what is on screen. I come back every evening." },
    { nick: "halcyon", hours: "38 h", text: "The first two hours feel awkward, then it clicks. Do the whole tutorial, don't skip it." },
    { nick: "mr_tape", hours: "9 h", text: "Runs smooth on a mid-range build, no dips noticed. Localization is solid." }
  ];

  function fillGameModal(title) {
    var data = GAMES[title];
    if (!data) return false;

    document.getElementById("game-modal-hero").style.backgroundImage =
      "linear-gradient(180deg, rgba(10,8,24,.1), rgba(10,8,24,.94)), url('" + data.img + "')";

    document.getElementById("game-modal-genre").textContent = data.genre || "";
    document.getElementById("game-modal-title").textContent = title;
    document.getElementById("game-modal-short").textContent = data.short || "";
    document.getElementById("game-modal-text").textContent = data.about || data.short || "";

    document.getElementById("game-modal-facts").innerHTML = [
      { k: "Rating", v: data.upcoming ? "Not rated yet" : data.rating + " / 5" },
      { k: "Developer", v: data.studio },
      { k: "Released", v: data.release },
      { k: "Players", v: data.players },
      { k: "Size", v: data.size + " GB" }
    ].map(function (item) {
      return "<li><span>" + esc(item.k) + "</span><b>" + esc(item.v) + "</b></li>";
    }).join("");

    var tagsEl = document.getElementById("game-modal-tags");
    var tags = data.tags || [];
    tagsEl.innerHTML = tags.map(function (tag) { return "<li>" + esc(tag) + "</li>"; }).join("");
    tagsEl.hidden = tags.length === 0;

    document.getElementById("game-modal-features").innerHTML = (data.features || [])
      .map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");

    document.getElementById("game-modal-shots").innerHTML = (data.shots || [])
      .map(function (src, i) {
        return '<img src="' + src + '" alt="Screenshot ' + (i + 1) + ' from ' + esc(title) + '" loading="lazy">';
      }).join("");

    var req = data.req || {};
    document.getElementById("game-modal-specs").innerHTML = [
      ["Publisher", data.publisher],
      ["Release date", data.release],
      ["Languages", data.langs],
      ["Operating system", req.os],
      ["Processor", req.cpu],
      ["Memory", req.ram],
      ["Graphics card", req.gpu],
      ["Disk space", req.disk]
    ].map(function (row) {
      return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1] || "—") + "</td></tr>";
    }).join("");

    document.getElementById("game-modal-score").innerHTML = [
      "<b>" + (data.upcoming ? "—" : data.rating) + "</b>",
      '<div><div class="score__stars">' + stars(data.rating) + "</div>",
      "<span>" + (data.upcoming ? "Not released yet" : data.reviews.toLocaleString("en-US") + " player reviews") + "</span></div>"
    ].join("");

    document.getElementById("game-modal-reviews").innerHTML = REVIEWS.map(function (r) {
      return [
        '<article class="review">',
        '  <p class="review__head"><b>' + r.nick + "</b><span>" + r.hours + " played</span></p>",
        '  <p class="review__text">' + r.text + "</p>",
        "</article>"
      ].join("");
    }).join("");

    var price = data.price || {};
    document.getElementById("game-modal-buy").innerHTML = [
      '<div class="price">',
      price.off ? '<span class="price__off">' + price.off + "</span>" : "",
      price.old ? '<span class="price__old">' + price.old + "</span>" : "",
      '<span class="price__now">' + (price.now || "—") + "</span>",
      "</div>",
      '<button class="btn btn--primary" type="button" data-buy="' + esc(title) + '">Add to cart</button>',
      '<button class="btn btn--ghost" type="button" data-wishlist="' + esc(title) + '">Add to wishlist</button>'
    ].join("");

    switchTab("about");
    refreshBuyButtons();
    return true;
  }

  function switchTab(name) {
    document.querySelectorAll("#game-modal-tabs button").forEach(function (button) {
      button.setAttribute("aria-selected", String(button.dataset.tab === name));
    });
    document.querySelectorAll(".game-modal .pane").forEach(function (pane) {
      pane.hidden = pane.dataset.pane !== name;
    });
  }

  function openGameModal(title) {
    if (!gameModal) return;
    if (!fillGameModal(title)) return;
    lastFocused = document.activeElement;
    gameModal.hidden = false;
    document.body.classList.add("is-locked");
    gameModal.querySelector(".game-modal__scroll").scrollTop = 0;
    document.getElementById("game-modal-close").focus();
  }

  function closeGameModal() {
    if (!gameModal) return;
    gameModal.hidden = true;
    if (!cartPanel || cartPanel.hidden) document.body.classList.remove("is-locked");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function startGameModal() {
    document.body.appendChild(buildGameModal());
    gameModal = document.getElementById("game-modal");

    document.getElementById("game-modal-close").addEventListener("click", closeGameModal);

    gameModal.addEventListener("click", function (event) {
      if (event.target === gameModal) { closeGameModal(); return; }
      var tab = event.target.closest("#game-modal-tabs button");
      if (tab) switchTab(tab.dataset.tab);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !gameModal.hidden) closeGameModal();
    });
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-game]");
      if (trigger) { openGameModal(trigger.dataset.game); return; }

      var buy = event.target.closest("[data-buy]");
      if (buy) { addToCart(buy.dataset.buy); refreshBuyButtons(); return; }

      var wish = event.target.closest("[data-wishlist]");
      if (wish) {
        var on = wish.classList.toggle("is-added");
        wish.textContent = on ? "In wishlist" : "Add to wishlist";
        toast(on ? "Added to wishlist" : "Removed from wishlist");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var target = event.target;
      if (target && target.matches && target.matches("[data-game]")) {
        event.preventDefault();
        openGameModal(target.dataset.game);
      }
    });
  }
  function cover(title, extraClass, plain) {
    var src = imageOf(title);
    var style = src ? ' style="background-image:url(\'' + src + '\')"' : "";
    var cls = "cover" + (extraClass ? " " + extraClass : "");
    if (plain) {
      return '<div class="' + cls + '"' + style + '><span class="cover__title">' + esc(title) + "</span></div>";
    }
    return '<div class="' + cls + '" data-game="' + esc(title) + '" tabindex="0" role="button" ' +
      'aria-haspopup="dialog" aria-label="Details about ' + esc(title) + '"' + style +
      '><span class="cover__title">' + esc(title) + "</span>" +
      '<span class="cover__hint">Details</span></div>';
  }

  

  window.GAMES = GAMES;
  if (window.VP) {
    try {
      window.VP.games = GAMES;
      if (typeof toast === "function") window.VP.toast = toast;
    } catch (e) {}
  }

  function page_home() {
    var featured = ["Cyber Neon 2077", "Silent Town", "Shadow Blade"];
    var kickers = {
      "Cyber Neon 2077": "Out September 24",
      "Silent Town": "Early access",
      "Shadow Blade": "“Rift” update"
    };
    var deals = ["Star Colony", "Wizard School", "Little Nightmares III", "Hades Return",
      "Red Horizon 2", "Machina Dream", "Doom Eternal X", "Spider City", "Witcher Path", "Little Nightmares III"];
    var chart = ["Cyber Neon 2077", "Witcher Path", "Shadow Blade", "Silent Town", "Stalker Zone 2", "Star Colony", "Star Colony"];
    var fresh = [
      { title: "GTA Mega City", meta: "Released yesterday" },
      { title: "God of Blades", meta: "Released September 12" },
      { title: "Spider City", meta: "Released September 9" },
      { title: "Baldur's Path", meta: "Released September 5" },
      { title: "Battle Royale X", meta: "Released June 11" },
      { title: "Red Horizon 2", meta: "Released May 15" },
      { title: "Counter Zone 2", meta: "Released April 12" },
      { title: "Machina Dream", meta: "Released January 8" }
    ];

    var picker = document.getElementById("hero-picker");

    function showFeatured(index) {
      var title = featured[index];
      var game = GAMES[title];
      var heroCover = document.getElementById("hero-cover");

      heroCover.className = "cover hero__cover";
      heroCover.style.backgroundImage = "url('" + game.img + "')";
      heroCover.dataset.game = title;
      heroCover.setAttribute("tabindex", "0");
      heroCover.setAttribute("role", "button");
      heroCover.setAttribute("aria-haspopup", "dialog");
      heroCover.setAttribute("aria-label", "Details about " + title);
      heroCover.innerHTML = '<span class="cover__title">' + esc(title) +
        '</span><span class="cover__hint">Details</span>';

      document.getElementById("hero-kicker").textContent = kickers[title] || "";
      document.getElementById("hero-title").textContent = title;
      document.getElementById("hero-text").textContent = game.short;
      document.getElementById("hero-tags").innerHTML = (game.tags || [])
        .map(function (tag) { return "<li>" + esc(tag) + "</li>"; }).join("");

      var price = game.price || {};
      var off = document.getElementById("hero-off");
      var old = document.getElementById("hero-old");
      off.textContent = price.off || "";
      off.hidden = !price.off;
      old.textContent = price.old || "";
      old.hidden = !price.old;
      document.getElementById("hero-now").textContent = price.now || "";

      var buy = document.getElementById("hero-buy");
      if (buy) buy.dataset.buy = title;

      var wish = document.querySelector("[data-wish]");
      if (wish) {
        wish.dataset.wishlist = title;
        wish.classList.remove("is-added");
        wish.textContent = "Add to wishlist";
      }

      picker.querySelectorAll("button").forEach(function (button, i) {
        button.setAttribute("aria-pressed", String(i === index));
      });

      refreshBuyButtons();
    }

    picker.innerHTML = featured.map(function (title) {
      return '<li><button type="button" aria-pressed="false" aria-label="Show ' + esc(title) + '">' +
        cover(title, null, true) + "</button></li>";
    }).join("");

    picker.querySelectorAll("button").forEach(function (button, index) {
      button.addEventListener("click", function () { showFeatured(index); });
    });

    showFeatured(0);

    
    document.getElementById("deals").innerHTML = deals.map(function (title) {
      var game = GAMES[title];
      var price = game.price || {};
      return [
        '<article class="card">',
        cover(title),
        '  <div class="card__body">',
        '    <h3 class="card__title">' + esc(title) + "</h3>",
        '    <p class="card__meta">' + esc(game.genre) + "</p>",
        '    <p class="card__rating">' + stars(game.rating) + "<span>" + game.rating + "</span></p>",
        '    <p class="card__price">' +
        (price.off ? '<span class="price__off">' + price.off + "</span>" : "") +
        (price.old ? '<span class="price__old">' + price.old + "</span>" : "") +
        '<span class="price__now">' + price.now + "</span></p>",
        '    <button class="btn btn--small btn--primary" type="button" data-buy="' + esc(title) + '">Add to cart</button>',
        "  </div>",
        "</article>"
      ].join("");
    }).join("");

    
    document.getElementById("chart").innerHTML = chart.map(function (title, index) {
      var game = GAMES[title];
      return [
        "<li>",
        '  <span class="chart__rank">' + (index + 1) + "</span>",
        cover(title, "chart__thumb"),
        "  <div>",
        '    <p class="chart__name">' + esc(title) + "</p>",
        '    <p class="chart__genre">' + esc(game.genre) + "</p>",
        "  </div>",
        '  <span class="chart__price">' + (game.price ? game.price.now : "—") + "</span>",
        "</li>"
      ].join("");
    }).join("");

    
    document.getElementById("fresh").innerHTML = fresh.map(function (item) {
      var game = GAMES[item.title];
      return [
        '<article class="card">',
        cover(item.title),
        '  <div class="card__body">',
        '    <h3 class="card__title">' + esc(item.title) + "</h3>",
        '    <p class="card__meta">' + esc(item.meta) + " · " + esc(game.genre) + "</p>",
        '    <p class="card__rating">' + stars(game.rating) + "<span>" + game.rating + "</span></p>",
        '    <p class="card__price"><span class="price__now">' + game.price.now + "</span></p>",
        '    <button class="btn btn--small btn--primary" type="button" data-buy="' + esc(item.title) + '">Add to cart</button>',
        "  </div>",
        "</article>"
      ].join("");
    }).join("");

    // new section: games that are not out yet
    var soon = ["Assassin Valhalla X", "Dota Legends", "Machina Dream"];
    document.getElementById("soon").innerHTML = soon.map(function (title) {
      var game = GAMES[title];
      return [
        '<article class="soon__card">',
        cover(title, "soon__cover"),
        '  <div class="soon__body">',
        '    <p class="soon__date">Out ' + esc(game.release) + "</p>",
        "    <h3>" + esc(title) + "</h3>",
        '    <p class="soon__text">' + esc(game.short) + "</p>",
        '    <ul class="tags tags--tight">' + (game.tags || []).slice(0, 3).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>",
        '    <div class="soon__foot">',
        '      <span class="price__now">' + game.price.now + "</span>",
        '      <button class="btn btn--small btn--ghost" type="button" data-wishlist="' + esc(title) + '">Add to wishlist</button>',
        '      <button class="btn btn--small btn--primary" type="button" data-buy="' + esc(title) + '">Add to cart</button>',
        "    </div>",
        "  </div>",
        "</article>"
      ].join("");
    }).join("");

    refreshBuyButtons();
  }

  

  function page_news() {
    var posts = [
      {
        topic: "Update",
        title: "“Rift” for Iron Meridian: a sixth faction and a rewritten AI",
        text: "The Helix engineers get their own 12-mission campaign, and the enemy no longer sees the whole map — it now scouts like a player.",
        date: "September 16", read: "4 min", game: "Shadow Blade"
      },
      {
        topic: "Release",
        title: "Dust & Circuit leaves early access",
        text: "1,500 fixes in a year: the story finale, photo mode and mod support through a built-in editor.",
        date: "September 16", read: "3 min", game: "GTA Mega City"
      },
      {
        topic: "Festival",
        title: "Autumn Strategy Fest: demos and discounts up to 70%",
        text: "Nine days, 240 participants. Demos stay available after the fest and progress carries over to the full game.",
        date: "September 15", read: "2 min", game: "Wizard School"
      },
      {
        topic: "Platform",
        title: "Refunds now take a single click",
        text: "If you played under two hours and bought within two weeks, the money returns to your wallet instantly, no support emails.",
        date: "September 14", read: "2 min", game: "Hades Return"
      },
      {
        topic: "Update",
        title: "Hollow Signal: 4-player co-op and a new station module",
        text: "Voice chat breaks down as the station gets damaged — the worse the module, the more static on the channel.",
        date: "September 12", read: "5 min", game: "Silent Town"
      },
      {
        topic: "Release",
        title: "Cassette Rally goes free",
        text: "The developers are moving to cosmetic packs. Everyone who bought it earlier gets the First Cassette pack.",
        date: "September 9", read: "2 min", game: "Spider City"
      }
    ];

    var dates = [
      { day: "24.09", title: "Cyber Neon 2077", note: "Launch at 7:00 PM" },
      { day: "01.10", title: "Demo Night", note: "48 hours, 60 games" },
      { day: "07.10", title: "Wizard School", note: "“Binding” expansion" },
      { day: "20.10", title: "Autumn Sale", note: "Two weeks of deals" }
    ];

    var feed = document.getElementById("feed");
    var empty = document.getElementById("feed-empty");
    var filters = document.getElementById("filters");

    var topics = ["All"].concat(posts.reduce(function (list, post) {
      if (list.indexOf(post.topic) === -1) list.push(post.topic);
      return list;
    }, []));

    filters.innerHTML = topics.map(function (topic, index) {
      return '<button type="button" data-topic="' + topic + '" aria-pressed="' + (index === 0) + '">' + topic + "</button>";
    }).join("");

    function render(topic) {
      var visible = topic === "All" ? posts : posts.filter(function (p) { return p.topic === topic; });
      empty.hidden = visible.length > 0;

      feed.innerHTML = visible.map(function (post) {
        return [
          '<article class="post">',
          cover(post.game, "post__cover"),
          '  <div class="post__body">',
          '    <p class="post__meta"><span class="post__topic">' + post.topic + "</span>" +
          "<span>" + post.date + "</span><span>" + post.read + " read</span></p>",
          '    <h2 class="post__title">' + post.title + "</h2>",
          '    <p class="post__text">' + post.text + "</p>",
          '    <button class="post__more" type="button" data-game="' + esc(post.game) + '">Open game page →</button>',
          "  </div>",
          "</article>"
        ].join("");
      }).join("");
    }

    filters.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-topic]");
      if (!button) return;
      filters.querySelectorAll("button").forEach(function (item) {
        item.setAttribute("aria-pressed", String(item === button));
      });
      render(button.dataset.topic);
    });

    render("All");

    document.getElementById("dates").innerHTML = dates.map(function (item) {
      return ["<li>", "  <time>" + item.day + "</time>",
        "  <p>" + item.title + "<span>" + item.note + "</span></p>", "</li>"].join("");
    }).join("");

    // new section: community poll (vote is remembered in this browser)
    var POLL_KEY = "bagame.poll";
    var pollMemory = null;
    var pollOptions = [
      { id: "racing", label: "More racing games", votes: 412 },
      { id: "coop", label: "Co-op shooters", votes: 538 },
      { id: "rpg", label: "Story-driven RPGs", votes: 691 },
      { id: "cozy", label: "Cozy puzzle games", votes: 287 }
    ];
    function readPoll() {
      try { var raw = localStorage.getItem(POLL_KEY); return raw ? JSON.parse(raw) : pollMemory; }
      catch (e) { return pollMemory; }
    }
    function writePoll(choice) {
      pollMemory = choice;
      try { localStorage.setItem(POLL_KEY, JSON.stringify(choice)); } catch (e) {}
    }
    function paintPoll() {
      var mine = readPoll();
      var total = pollOptions.reduce(function (sum, o) { return sum + o.votes + (mine === o.id ? 1 : 0); }, 0);
      document.getElementById("poll-options").innerHTML = pollOptions.map(function (o) {
        var votes = o.votes + (mine === o.id ? 1 : 0);
        var pct = Math.round(votes / total * 100);
        return '<button type="button" class="poll__opt' + (mine === o.id ? " is-mine" : "") + '" data-vote="' + o.id + '"' +
          (mine ? " disabled" : "") + ">" +
          '<span class="poll__label">' + esc(o.label) + (mine === o.id ? " ✓" : "") + "</span>" +
          '<span class="poll__pct">' + (mine ? pct + "%" : "Vote") + "</span>" +
          '<span class="poll__bar"><span style="width:' + (mine ? pct : 0) + '%"></span></span></button>';
      }).join("");
      document.getElementById("poll-note").textContent = mine
        ? total.toLocaleString("en-US") + " votes. Thanks, your choice is saved."
        : "Pick one. Results appear after you vote.";
    }
    document.getElementById("poll-options").addEventListener("click", function (event) {
      var btn = event.target.closest("[data-vote]");
      if (!btn || readPoll()) return;
      writePoll(btn.dataset.vote);
      paintPoll();
      toast("Vote counted");
    });
    paintPoll();

    var digest = document.getElementById("digest");
    digest.addEventListener("submit", function (event) {
      event.preventDefault();
      var status = document.getElementById("digest-status");
      var mail = document.getElementById("digest-mail");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim())) {
        status.style.color = "var(--danger)";
        status.textContent = "Check your email address.";
        return;
      }
      status.style.color = "var(--mint)";
      status.textContent = "Done. Your first email arrives on Monday.";
      digest.reset();
    });
  }

  

  function page_library() {
    var games = [
      { title: "Cyber Neon 2077", state: "Installed", hours: 142, last: "today", done: 61 },
      { title: "Shadow Blade", state: "Installed", hours: 88, last: "yesterday", done: 34 },
      { title: "Silent Town", state: "Updating", hours: 26, last: "3 days ago", done: 12 },
      { title: "Star Colony", state: "Installed", hours: 310, last: "a week ago", done: 100 },
      { title: "Wizard School", state: "Not installed", hours: 54, last: "a month ago", done: 72 },
      { title: "Little Nightmares III", state: "Not installed", hours: 9, last: "6 months ago", done: 8 },
      { title: "Hades Return", state: "Installed", hours: 17, last: "4 days ago", done: 45 },
      { title: "GTA Mega City", state: "Not installed", hours: 0, last: "never launched", done: 0 },
      { title: "Witcher Path", state: "Installed", hours: 203, last: "2 days ago", done: 88 },
      { title: "Battle Royale X", state: "Installed", hours: 40, last: "5 days ago", done: 27 },
      { title: "Elden Lands", state: "Installed", hours: 56, last: "today", done: 22 },
      { title: "Star Colony", state: "Installed", hours: 91, last: "yesterday", done: 48 },
      { title: "Counter Zone 2", state: "Installed", hours: 33, last: "3 days ago", done: 15 },
      { title: "Cyber Neon 2077", state: "Installed", hours: 12, last: "today", done: 70 },
      { title: "UFC Ring 6", state: "Updating", hours: 12, last: "a week ago", done: 18 },
      { title: "Little Nightmares III", state: "Not installed", hours: 6, last: "2 months ago", done: 5 },
      { title: "Star Colony", state: "Installed", hours: 78, last: "yesterday", done: 41 },
      { title: "Stalker Zone 2", state: "Installed", hours: 55, last: "today", done: 19 }
    ];
    games.forEach(function (game) {
      game.size = (GAMES[game.title] && GAMES[game.title].size) || 20;
    });

    var DISK_TOTAL = 500;
    var states = ["All games", "Installed", "Updating", "Not installed"];
    var current = "All games";
    var query = "";

    var grid = document.getElementById("lib-grid");
    var empty = document.getElementById("lib-empty");
    var count = document.getElementById("lib-count");
    var filters = document.getElementById("lib-filters");

    function countFor(state) {
      return state === "All games" ? games.length
        : games.filter(function (game) { return game.state === state; }).length;
    }

    filters.innerHTML = states.map(function (state) {
      return '<button type="button" data-state="' + state + '" aria-pressed="' +
        (state === current) + '">' + state + "<span>" + countFor(state) + "</span></button>";
    }).join("");

    function hoursLabel(hours) {
      return hours === 0 ? "Not played yet" : hours + " h played";
    }

    function render() {
      var normalized = query.trim().toLowerCase();
      var visible = games.filter(function (game) {
        var byState = current === "All games" || game.state === current;
        var byName = game.title.toLowerCase().indexOf(normalized) !== -1;
        return byState && byName;
      });

      empty.hidden = visible.length > 0;
      count.textContent = visible.length + " of " + games.length + " games";

      grid.innerHTML = visible.map(function (game) {
        var installed = game.state !== "Not installed";
        return [
          '<article class="game">',
          cover(game.title, "game__cover"),
          '  <div class="game__body">',
          '    <h2 class="game__title">' + esc(game.title) + "</h2>",
          '    <p class="game__stat"><span>' + hoursLabel(game.hours) + "</span>" +
          '<span class="game__state" data-state="' + game.state + '">' + game.state + "</span></p>",
          '    <div class="game__progress">',
          "      <p><span>Achievements</span><span>" + game.done + "%</span></p>",
          '      <div class="bar"><span class="bar__fill" style="width:' + game.done + '%"></span></div>',
          "    </div>",
          '    <p class="game__stat"><span>Last played: ' + lastFor(game) + "</span><span>" + game.size + " GB</span></p>",
          '    <div class="game__actions">',
          installed
            ? '      <button class="btn btn--play" type="button" data-play="' + esc(game.title) + '" title="' + (KIND_NAME[KIND_OF[game.title] || "catch"]) + '">Play</button>'
            : '      <button class="btn btn--primary" type="button" data-install="' + esc(game.title) + '">Install</button>',
          '      <button class="btn btn--ghost" type="button" data-game="' + esc(game.title) + '">Details</button>',
          "    </div>",
          "  </div>",
          "</article>"
        ].join("");
      }).join("");
    }

    function refreshDisk() {
      var used = games.filter(function (g) { return g.state !== "Not installed"; })
        .reduce(function (sum, g) { return sum + g.size; }, 0);
      var percent = Math.min(100, Math.round((used / DISK_TOTAL) * 100));
      document.getElementById("disk-value").textContent = used + " GB of " + DISK_TOTAL + " GB";
      document.getElementById("disk-bar").style.width = percent + "%";
    }

    function refreshCounters() {
      filters.querySelectorAll("button").forEach(function (button) {
        button.querySelector("span").textContent = countFor(button.dataset.state);
      });
    }

    filters.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-state]");
      if (!button) return;
      current = button.dataset.state;
      filters.querySelectorAll("button").forEach(function (item) {
        item.setAttribute("aria-pressed", String(item === button));
      });
      render();
    });

    document.getElementById("search").addEventListener("input", function (event) {
      query = event.target.value;
      render();
    });

    grid.addEventListener("click", function (event) {
      var install = event.target.closest("[data-install]");
      if (install) {
        var target = games.find(function (g) { return g.title === install.dataset.install; });
        if (target) {
          target.state = "Installed";
          target.last = "just now";
          render(); refreshCounters(); refreshDisk();
          toast(target.title + " installed");
        }
        return;
      }

      var play = event.target.closest("[data-play]");
      if (play) {
        play.textContent = "Launching…";
        play.disabled = true;
        var toLaunch = play.dataset.play;
        setTimeout(function () { render(); launchGame(toLaunch); }, 600);
      }
    });

    function paintHistory() {
      var list = readHistory();
      var box = document.getElementById("history");
      box.innerHTML = list.length ? list.slice(0, 8).map(function (h) {
        return '<li><b>' + esc(h.title) + '</b><span>' + ago(h.ts) + ' · score ' + h.score + ' · ' + fmtDur(h.dur) + '</span></li>';
      }).join("") : '<li class="history__empty">No games played yet. Press Play on any installed game.</li>';

      var banner = document.getElementById("lastplayed");
      if (!list.length) { banner.hidden = true; return; }
      var last = list[0];
      banner.hidden = false;
      banner.innerHTML = '<div><span>Last played</span><b>' + esc(last.title) + '</b><em>' + ago(last.ts) +
        ' · score ' + last.score + ' · ' + fmtDur(last.dur) + '</em></div>' +
        '<button class="btn btn--play" type="button" data-again="' + esc(last.title) + '">Play again</button>';
    }

    document.getElementById("history-clear").addEventListener("click", function () {
      writeHistory([]); paintHistory(); render(); toast("History cleared");
    });
    document.getElementById("lastplayed").addEventListener("click", function (event) {
      var again = event.target.closest("[data-again]");
      if (again) launchGame(again.dataset.again);
    });
    document.addEventListener("vp:history", function () { paintHistory(); render(); });

    render();
    refreshDisk();
    paintHistory();

    // new section: recommendations based on the tags of the games you play most
    var weights = {};
    games.forEach(function (g) {
      (GAMES[g.title].tags || []).forEach(function (t) { weights[t] = (weights[t] || 0) + g.hours; });
    });
    var owned = games.map(function (g) { return g.title; });
    var recs = Object.keys(GAMES).filter(function (title) {
      return owned.indexOf(title) === -1 && !GAMES[title].upcoming;
    }).map(function (title) {
      var tags = GAMES[title].tags || [];
      var score = tags.reduce(function (sum, t) { return sum + (weights[t] || 0); }, 0);
      var because = games.filter(function (g) {
        return (GAMES[g.title].tags || []).some(function (t) { return tags.indexOf(t) !== -1; });
      }).sort(function (a, b) { return b.hours - a.hours; })[0];
      return { title: title, score: score, because: because ? because.title : null };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 4);

    document.getElementById("recs").innerHTML = recs.map(function (r) {
      var game = GAMES[r.title];
      var price = game.price || {};
      return [
        '<article class="card">',
        cover(r.title),
        '  <div class="card__body">',
        '    <h3 class="card__title">' + esc(r.title) + "</h3>",
        '    <p class="card__meta">' + esc(game.genre) + "</p>",
        r.because ? '    <p class="recs__why">Because you play ' + esc(r.because) + "</p>" : "",
        '    <p class="card__price">' +
        (price.off ? '<span class="price__off">' + price.off + "</span>" : "") +
        '<span class="price__now">' + price.now + "</span></p>",
        '    <button class="btn btn--small btn--primary" type="button" data-buy="' + esc(r.title) + '">Add to cart</button>',
        "  </div>",
        "</article>"
      ].join("");
    }).join("");
    refreshBuyButtons();
  }

  

  function page_profile() {
    var stats = [
      { value: "12", label: "games in library" },
      { value: "907 h", label: "total played" },
      { value: "214", label: "achievements" },
      { value: "37", label: "friends" }
    ];

    var activity = [
      { title: "Cyber Neon 2077", note: "Unlocked “First Drift”", hours: "12 h this week" },
      { title: "Shadow Blade", note: "Completed the Helix campaign", hours: "6 h this week" },
      { title: "Hades Return", note: "Collected 18 of 40 fragments", hours: "3 h this week" }
    ];

    var awards = [
      { icon: "◆", title: "First Drift", note: "Cyber Neon 2077", locked: false },
      { icon: "✦", title: "Not a Single Alarm", note: "Silent Town", locked: false },
      { icon: "▲", title: "Six Factions", note: "Shadow Blade", locked: false },
      { icon: "✕", title: "Full Collection", note: "Static Bloom · 18/40", locked: true }
    ];

    var friends = [
      { nick: "kira_vox", state: "Playing: Iron Meridian", online: true },
      { nick: "halcyon", state: "Online", online: true },
      { nick: "mr_tape", state: "Offline · 2 h ago", online: false },
      { nick: "solen", state: "Playing: Skyfall Requiem", online: true },
      { nick: "nine_lives", state: "Offline · yesterday", online: false }
    ];

    function short(name) {
      return String(name).trim().slice(0, 2).toUpperCase() || "V";
    }

    function paintAccount() {
      var account = window.VP && window.VP.account ? window.VP.account() : null;
      if (!account) return;
      document.getElementById("me-nick").textContent = account.nick;
      document.getElementById("me-mail").textContent = account.email;
      document.getElementById("me-avatar").textContent = short(account.nick);
      document.getElementById("me-level").textContent = account.level;
      document.getElementById("wallet").textContent = account.wallet.toLocaleString("en-US") + " ₽";
    }

    paintAccount();
    document.addEventListener("vp:signin", paintAccount);
    document.addEventListener("vp:wallet", paintAccount);

    document.getElementById("me-xp").style.width = "67%";

    // purchased games: shown here and playable
    function paintOwned() {
      var owned = readOwned();
      var box = document.getElementById("owned");
      document.getElementById("owned-count").textContent = owned.length ? owned.length + (owned.length === 1 ? " game" : " games") : "";
      var contact = readContact();
      var phone = document.getElementById("me-phone");
      if (phone) phone.textContent = contact ? "☎ " + contact.phone + " · " + contact.email : "";
      var first = document.querySelector("#stats .stat b");
      if (first) first.textContent = String(12 + owned.length);
      if (!owned.length) {
        box.innerHTML = '<div class="hist__empty"><b>No purchased games yet</b><p>Add a game to the cart and check out. It will appear here and you can play it right away.</p><a class="btn btn--primary" href="index.html">Go to the store</a></div>';
        return;
      }
      box.innerHTML = owned.slice().reverse().map(function (o) {
        var g = GAMES[o.title] || {};
        var kind = KIND_NAME[KIND_OF[o.title] || "catch"];
        var best = readHistory().filter(function (h) { return h.title === o.title; }).reduce(function (m, h) { return Math.max(m, h.score); }, 0);
        return '<article class="card">' + cover(o.title) + '<div class="card__body"><h3 class="card__title">' + esc(o.title) + '</h3><p class="card__meta">' + esc(g.genre || "") +
          ' · bought ' + new Date(o.at).toLocaleDateString("en-GB") + '</p><p class="card__meta">' + esc(kind) + (best ? " · best " + best : "") +
          '</p><button class="btn btn--small btn--play" type="button" data-own-play="' + esc(o.title) + '">Play</button></div></article>';
      }).join("");
    }
    paintOwned();
    document.addEventListener("vp:owned", paintOwned);
    document.addEventListener("vp:history", paintOwned);
    document.getElementById("owned").addEventListener("click", function (e) {
      var b = e.target.closest("[data-own-play]");
      if (!b) return;
      b.textContent = "Launching…";
      b.disabled = true;
      var t = b.dataset.ownPlay;
      setTimeout(function () { paintOwned(); launchGame(t); }, 500);
    });


    function paintLast() {
      var h = readHistory()[0];
      document.getElementById("me-status").textContent = h ? "Last played: " + h.title + " · " + ago(h.ts) : "Last played: nothing yet";
    }
    paintLast();
    document.addEventListener("vp:history", paintLast);

    document.getElementById("stats").innerHTML = stats.map(function (item) {
      return '<div class="stat"><b>' + item.value + "</b><span>" + item.label + "</span></div>";
    }).join("");

    document.getElementById("activity").innerHTML = activity.map(function (item) {
      return [
        "<li>",
        cover(item.title),
        "  <div>",
        '    <p class="activity__name">' + esc(item.title) + "</p>",
        '    <p class="activity__note">' + esc(item.note) + "</p>",
        "  </div>",
        '  <span class="activity__hours">' + item.hours + "</span>",
        "</li>"
      ].join("");
    }).join("");

    document.getElementById("awards").innerHTML = awards.map(function (item) {
      return [
        '<div class="award' + (item.locked ? " award--locked" : "") + '">',
        '  <div class="award__icon">' + item.icon + "</div>",
        "  <b>" + item.title + "</b>",
        "  <span>" + (item.locked ? "Locked · " : "") + item.note + "</span>",
        "</div>"
      ].join("");
    }).join("");

    document.getElementById("friends").innerHTML = friends.map(function (friend) {
      return [
        "<li>",
        '  <span class="friends__avatar">' + short(friend.nick) + "</span>",
        "  <div>",
        "    <b>" + friend.nick + "</b>",
        '    <span class="' + (friend.online ? "is-online" : "") + '">' + friend.state + "</span>",
        "  </div>",
        "</li>"
      ].join("");
    }).join("");

    // new section: playtime over the last seven days
    var week = [
      { day: "Mon", h: 2 }, { day: "Tue", h: 3 }, { day: "Wed", h: 1.5 }, { day: "Thu", h: 2.5 },
      { day: "Fri", h: 3 }, { day: "Sat", h: 5.5 }, { day: "Sun", h: 3.5 }
    ];
    var weekMax = Math.max.apply(null, week.map(function (d) { return d.h; }));
    var weekTotal = week.reduce(function (sum, d) { return sum + d.h; }, 0);
    document.getElementById("week-total").textContent = weekTotal + " h this week";
    document.getElementById("week").innerHTML = week.map(function (d) {
      return '<div class="week__col' + (d.h === weekMax ? " is-peak" : "") + '">' +
        "<b>" + d.h + "h</b>" +
        '<span class="week__bar"><span style="height:' + Math.round(d.h / weekMax * 100) + '%"></span></span>' +
        "<em>" + d.day + "</em></div>";
    }).join("");

    document.getElementById("friends-online").textContent =
      "· " + friends.filter(function (f) { return f.online; }).length + " online";

    document.getElementById("edit-status").addEventListener("click", function () {
      var status = document.getElementById("me-status");
      var next = prompt("What should friends see?", status.textContent);
      if (next !== null && next.trim() !== "") status.textContent = next.trim();
    });
  }

  


  /* ============================================================
     Play history + mini-game
     ============================================================ */

  var HIST_KEY = "bagame.history";
  var histMemory = [];

  function readHistory() {
    try {
      var raw = localStorage.getItem(HIST_KEY);
      return raw ? JSON.parse(raw) : histMemory;
    } catch (e) { return histMemory; }
  }

  function writeHistory(list) {
    histMemory = list;
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function recordPlay(title, score, durationSec) {
    if (!title) return;
    score = Math.max(0, Math.round(Number(score) || 0));
    var secs = Math.max(0, Number(durationSec) || 0);
    var list = readHistory();
    list.unshift({ title: String(title), ts: Date.now(), score: score, dur: secs });
    writeHistory(list.slice(0, 100));
    try { document.dispatchEvent(new CustomEvent("vp:history")); } catch (e) {}
    if (typeof toast === "function") toast("Saved to play history: " + title);
  }

  // Expose for other game engines (fpgames / refresh)
  if (window.VP) {
    window.VP.recordPlay = recordPlay;
    window.VP.readHistory = readHistory;
  } else {
    window.VP = { recordPlay: recordPlay, readHistory: readHistory };
  }

  function ago(ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " h ago";
    var d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : d + " days ago";
  }

  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2);
  }

  function lastFor(game) {
    var hit = readHistory().filter(function (h) { return h.title === game.title; })[0];
    return hit ? ago(hit.ts) : game.last;
  }

  var arcade, G = null;
  var COLORS = ["#7b5cff", "#4fe0b0", "#ffc247", "#ff4d6d", "#5cc8ff"];

  /* Each library game opens its own mini-game, chosen by genre */
  var KIND_OF = {
    "Cyber Neon 2077": "racing", "Spider City": "racing",
    "Star Colony": "fps", "Silent Town": "fps",
    "Hades Return": "snake", "Baldur's Path": "memory",
    "Shadow Blade": "breakout", "Wizard School": "memory",
    "Little Nightmares III": "runner", "God of Blades": "catch",
    "GTA Mega City": "racing",
    "Counter Zone 2": "racing", "Stalker Zone 2": "fps", "Monkey King": "whack",
    "Elden Lands": "snake", "Battle Royale X": "fps", "Red Horizon 2": "runner",
    "Apex Legends Pro": "shooter", "UFC Ring 6": "whack", "Assassin Valhalla X": "runner",
    "Dota Legends": "shooter", "Machina Dream": "breakout",
    "Cyber Neon 2077": "racing", "Elden Lands": "runner", "Star Colony": "shooter",
    "Wizard School": "memory", "Spider City": "catch", "UFC Ring 6": "whack",
    "Counter Zone 2": "fps",
    "Witcher Path": "runner", "Battle Royale X": "fps", "Little Nightmares III": "memory",
    "Star Colony": "breakout", "Stalker Zone 2": "shooter", "Red Horizon 2": "fps",
    "Machina Dream": "memory", "Doom Eternal X": "racing", "Monkey King": "runner",
    "Spider City": "runner", "GTA Mega City": "fps"
  };
  var KIND_NAME = {
    racing: "Car racing", shooter: "Space shooter", fps: "First-person tactical shooter", snake: "Snake",
    memory: "Memory match", runner: "Endless runner", catch: "Orb catcher",
    breakout: "Brick breaker", whack: "Target tap"
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hurt() {
    G.lives--;
    arcadeHud();
    if (G.lives <= 0) arcadeOver(false);
  }

  function drawCar(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 17, y - 28, 34, 56);
    ctx.fillStyle = "rgba(10,8,24,.75)";
    ctx.fillRect(x - 12, y - 14, 24, 12);
    ctx.fillRect(x - 12, y + 10, 24, 8);
    ctx.fillStyle = "#fff6c8";
    ctx.fillRect(x - 14, y - 28, 8, 4);
    ctx.fillRect(x + 6, y - 28, 8, 4);
  }

  var MINI = {

    /* ---------- Car racing ---------- */
    racing: {
      help: "Steer with the ← → keys, the mouse or touch. Dodge the traffic: every 40 m adds a point. Three crashes and the race is over.",
      reset: function () {
        G.x = 320; G.dist = 0; G.cars = []; G.spawn = 0.5; G.inv = 0; G.off = 0; G.lives = 3;
      },
      update: function (dt) {
        var speed = Math.min(640, 300 + G.t * 9);
        if (G.keys.ArrowLeft) G.x -= 380 * dt;
        if (G.keys.ArrowRight) G.x += 380 * dt;
        G.x = clamp(G.x, 170, 490);
        G.dist += speed * dt;
        G.off = (G.off + speed * dt) % 80;
        var sc = Math.floor(G.dist / 40);
        if (sc !== G.score) { G.score = sc; arcadeHud(); }
        G.inv = Math.max(0, G.inv - dt);
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.35, 1.0 - G.t * 0.012);
          var lane = Math.floor(Math.random() * 4);
          G.cars.push({ x: 195 + lane * 90, y: -60, v: speed * (0.3 + Math.random() * 0.25),
                        c: COLORS[Math.floor(Math.random() * COLORS.length)] });
        }
        G.cars = G.cars.filter(function (c) {
          c.y += (speed - c.v) * dt;
          if (G.state === "playing" && G.inv <= 0 && Math.abs(c.x - G.x) < 32 && Math.abs(c.y - 330) < 52) {
            G.inv = 1.4; hurt(); return false;
          }
          return c.y < 450;
        });
      },
      draw: function (ctx) {
        ctx.fillStyle = "#10261a"; ctx.fillRect(0, 0, 640, 400);
        ctx.fillStyle = "#2a2a3d"; ctx.fillRect(150, 0, 360, 400);
        ctx.fillStyle = "#ffc247"; ctx.fillRect(146, 0, 4, 400); ctx.fillRect(510, 0, 4, 400);
        ctx.fillStyle = "rgba(255,255,255,.55)";
        for (var l = 1; l < 4; l++) {
          for (var y = -80 + G.off; y < 400; y += 80) ctx.fillRect(150 + l * 90 - 2, y, 4, 40);
        }
        G.cars.forEach(function (c) { drawCar(ctx, c.x, c.y, c.c); });
        if (G.inv <= 0 || Math.floor(G.inv * 10) % 2 === 0) drawCar(ctx, G.x, 330, G.color);
      }
    },

    /* ---------- Space shooter ---------- */
    shooter: {
      help: "Move the ship with the mouse, touch or ← → keys. It fires by itself: shoot the red invaders before they reach you.",
      reset: function () {
        G.x = 320; G.bul = []; G.en = []; G.spawn = 0.4; G.fire = 0; G.inv = 0; G.lives = 3;
      },
      update: function (dt) {
        if (G.keys.ArrowLeft) G.x -= 420 * dt;
        if (G.keys.ArrowRight) G.x += 420 * dt;
        G.x = clamp(G.x, 24, 616);
        G.inv = Math.max(0, G.inv - dt);
        G.fire -= dt;
        if (G.fire <= 0) { G.fire = 0.22; G.bul.push({ x: G.x, y: 350 }); }
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.3, 0.9 - G.t * 0.01);
          G.en.push({ x: 30 + Math.random() * 580, y: -16, v: 70 + Math.random() * 40 + G.t * 3, ph: Math.random() * 6 });
        }
        G.bul.forEach(function (b) { b.y -= 520 * dt; });
        G.bul = G.bul.filter(function (b) { return b.y > -10; });
        G.en.forEach(function (e) { e.y += e.v * dt; e.x = clamp(e.x + Math.sin(G.t * 2 + e.ph) * 40 * dt, 14, 626); });
        G.en = G.en.filter(function (e) {
          for (var i = 0; i < G.bul.length; i++) {
            var b = G.bul[i];
            if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
              G.bul.splice(i, 1); G.score++; arcadeHud(); return false;
            }
          }
          if (G.state === "playing" && G.inv <= 0 && Math.abs(e.x - G.x) < 24 && Math.abs(e.y - 372) < 20) {
            G.inv = 1; hurt(); return false;
          }
          if (e.y > 400) { if (G.state === "playing") hurt(); return false; }
          return true;
        });
      },
      draw: function (ctx) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        G.bul.forEach(function (b) { ctx.fillRect(b.x - 2, b.y - 8, 4, 12); });
        ctx.shadowColor = "#ff4d6d"; ctx.fillStyle = "#ff4d6d";
        G.en.forEach(function (e) {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + 14); ctx.lineTo(e.x + 14, e.y - 10); ctx.lineTo(e.x - 14, e.y - 10);
          ctx.closePath(); ctx.fill();
        });
        if (G.inv <= 0 || Math.floor(G.inv * 10) % 2 === 0) {
          ctx.shadowColor = G.color; ctx.fillStyle = G.color;
          ctx.beginPath();
          ctx.moveTo(G.x, 352); ctx.lineTo(G.x + 20, 386); ctx.lineTo(G.x, 378); ctx.lineTo(G.x - 20, 386);
          ctx.closePath(); ctx.fill();
        }
      }
    },

    /* ---------- Snake ---------- */
    snake: {
      help: "Steer the snake with the arrow keys or swipe. Eat the glowing food and don't bite your own tail. The walls wrap around.",
      reset: function () {
        G.sn = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        G.dir = { x: 1, y: 0 }; G.nd = { x: 1, y: 0 }; G.acc = 0; G.lives = 1;
        MINI.snake.food();
      },
      food: function () {
        var p, ok;
        do {
          p = { x: Math.floor(Math.random() * 32), y: Math.floor(Math.random() * 20) };
          ok = !G.sn.some(function (s) { return s.x === p.x && s.y === p.y; });
        } while (!ok);
        G.fd = p;
      },
      turn: function (dx, dy) {
        if (dx === -G.dir.x && dy === -G.dir.y) return;
        G.nd = { x: dx, y: dy };
      },
      key: function (e) {
        if (e.key === "ArrowLeft") MINI.snake.turn(-1, 0);
        if (e.key === "ArrowRight") MINI.snake.turn(1, 0);
        if (e.key === "ArrowUp") MINI.snake.turn(0, -1);
        if (e.key === "ArrowDown") MINI.snake.turn(0, 1);
      },
      update: function (dt) {
        G.acc += dt;
        var step = Math.max(0.06, 0.12 - G.score * 0.002);
        while (G.acc >= step && G.state === "playing") {
          G.acc -= step;
          G.dir = G.nd;
          var h = { x: (G.sn[0].x + G.dir.x + 32) % 32, y: (G.sn[0].y + G.dir.y + 20) % 20 };
          if (G.sn.some(function (s) { return s.x === h.x && s.y === h.y; })) {
            G.lives = 0; arcadeHud(); arcadeOver(false); return;
          }
          G.sn.unshift(h);
          if (h.x === G.fd.x && h.y === G.fd.y) { G.score++; arcadeHud(); MINI.snake.food(); }
          else G.sn.pop();
        }
      },
      draw: function (ctx) {
        ctx.fillStyle = "rgba(10,8,24,.55)"; ctx.fillRect(0, 0, 640, 400);
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        ctx.beginPath(); ctx.arc(G.fd.x * 20 + 10, G.fd.y * 20 + 10, 7, 0, 6.283); ctx.fill();
        ctx.shadowColor = G.color;
        G.sn.forEach(function (s, i) {
          ctx.fillStyle = i === 0 ? "#ffffff" : G.color;
          ctx.fillRect(s.x * 20 + 1, s.y * 20 + 1, 18, 18);
        });
      }
    },

    /* ---------- Memory match ---------- */
    memory: {
      help: "Click the cards to flip them and find all six pairs. Every wrong guess costs one try, and you only have eight.",
      reset: function () {
        var sym = ["◆", "●", "▲", "■", "★", "♥"], deck = sym.concat(sym);
        for (var i = deck.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t;
        }
        G.cards = deck.map(function (s) { return { s: s, open: false, done: false }; });
        G.pick = []; G.lock = 0; G.lives = 8;
      },
      click: function (x, y) {
        if (G.lock > 0) return;
        var col = Math.floor((x - 56) / 136), row = Math.floor((y - 40) / 112);
        if (col < 0 || col > 3 || row < 0 || row > 2) return;
        if ((x - 56) % 136 > 120 || (y - 40) % 112 > 96) return;
        var i = row * 4 + col, c = G.cards[i];
        if (c.open || c.done) return;
        c.open = true; G.pick.push(i);
        if (G.pick.length < 2) return;
        var a = G.cards[G.pick[0]], b = G.cards[G.pick[1]];
        if (a.s === b.s) {
          a.done = b.done = true; G.pick = []; G.score += 10;
          if (G.cards.every(function (k) { return k.done; })) { G.score += G.lives * 5; arcadeHud(); arcadeOver(true); return; }
          arcadeHud();
        } else {
          G.lives--; G.lock = 0.7; arcadeHud();
        }
      },
      update: function (dt) {
        if (G.lock > 0) {
          G.lock -= dt;
          if (G.lock <= 0) {
            G.pick.forEach(function (i) { G.cards[i].open = false; });
            G.pick = [];
            if (G.lives <= 0) arcadeOver(false);
          }
        }
      },
      draw: function (ctx) {
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "44px sans-serif";
        G.cards.forEach(function (c, i) {
          var x = 56 + (i % 4) * 136, y = 40 + Math.floor(i / 4) * 112;
          ctx.fillStyle = c.done ? "rgba(79,224,176,.28)" : c.open ? "rgba(255,255,255,.18)" : "rgba(123,92,255,.4)";
          ctx.fillRect(x, y, 120, 96);
          ctx.strokeStyle = c.done ? "#4fe0b0" : "rgba(255,255,255,.35)";
          ctx.strokeRect(x + .5, y + .5, 119, 95);
          if (c.open || c.done) { ctx.fillStyle = "#fff"; ctx.fillText(c.s, x + 60, y + 50); }
        });
      }
    },

    /* ---------- Endless runner ---------- */
    runner: {
      help: "Press Space, ↑ or click / tap to jump over the obstacles. The longer you run, the faster it gets.",
      reset: function () {
        G.py = 0; G.vy = 0; G.obs = []; G.spawn = 1; G.inv = 0; G.lives = 3; G.off = 0; G.dist = 0;
      },
      jump: function () { if (G.py === 0) G.vy = 640; },
      key: function (e) {
        if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") MINI.runner.jump();
      },
      click: function () { MINI.runner.jump(); },
      update: function (dt) {
        var speed = Math.min(520, 260 + G.t * 8);
        G.dist += speed * dt; G.off = (G.off + speed * dt) % 40;
        var sc = Math.floor(G.dist / 60);
        if (sc !== G.score) { G.score = sc; arcadeHud(); }
        G.vy -= 1800 * dt; G.py += G.vy * dt;
        if (G.py <= 0) { G.py = 0; G.vy = 0; }
        G.inv = Math.max(0, G.inv - dt);
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = 0.9 + Math.random() * 0.9 - Math.min(0.4, G.t * 0.005);
          G.obs.push({ x: 660, w: 22 + Math.random() * 20, h: 24 + Math.random() * 30 });
        }
        G.obs = G.obs.filter(function (o) {
          o.x -= speed * dt;
          var top = 290 - G.py;
          if (G.state === "playing" && G.inv <= 0 && o.x < 115 && o.x + o.w > 85 && top + 40 > 330 - o.h) {
            G.inv = 1.2; hurt(); return false;
          }
          return o.x > -60;
        });
      },
      draw: function (ctx) {
        ctx.fillStyle = "rgba(10,8,24,.45)"; ctx.fillRect(0, 330, 640, 70);
        ctx.fillStyle = "#4fe0b0"; ctx.fillRect(0, 330, 640, 3);
        ctx.fillStyle = "rgba(255,255,255,.25)";
        for (var x = -40 + G.off; x < 640; x += 40) ctx.fillRect(x, 352, 20, 3);
        ctx.shadowBlur = 12; ctx.shadowColor = "#ff4d6d"; ctx.fillStyle = "#ff4d6d";
        G.obs.forEach(function (o) {
          ctx.beginPath();
          ctx.moveTo(o.x, 330); ctx.lineTo(o.x + o.w / 2, 330 - o.h); ctx.lineTo(o.x + o.w, 330);
          ctx.closePath(); ctx.fill();
        });
        if (G.inv <= 0 || Math.floor(G.inv * 10) % 2 === 0) {
          ctx.shadowColor = G.color; ctx.fillStyle = G.color;
          ctx.fillRect(85, 290 - G.py, 30, 40);
          ctx.fillStyle = "#fff"; ctx.fillRect(103, 298 - G.py, 6, 6);
        }
      }
    },

    /* ---------- Orb catcher ---------- */
    catch: {
      help: "Move with the mouse, touch or ← → keys. Catch the glowing orbs, avoid the red spikes.",
      reset: function () { G.x = 320; G.w = 90; G.items = []; G.spawn = 0; G.lives = 3; },
      update: function (dt) {
        if (G.keys.ArrowLeft) G.x -= 420 * dt;
        if (G.keys.ArrowRight) G.x += 420 * dt;
        G.x = clamp(G.x, G.w / 2, 640 - G.w / 2);
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.28, 0.8 - G.t * 0.01);
          G.items.push({ x: 20 + Math.random() * 600, y: -14, bad: Math.random() < 0.28,
                         v: 130 + Math.random() * 60 + G.t * 4 });
        }
        G.items = G.items.filter(function (it) {
          it.y += it.v * dt;
          var hit = it.y > 360 && it.y < 390 && Math.abs(it.x - G.x) < G.w / 2 + 8;
          if (hit) {
            if (it.bad) hurt(); else { G.score++; arcadeHud(); }
            return false;
          }
          return it.y <= 420;
        });
      },
      draw: function (ctx) {
        ctx.shadowBlur = 16;
        G.items.forEach(function (it) {
          ctx.shadowColor = it.bad ? "#ff4d6d" : G.color;
          ctx.fillStyle = it.bad ? "#ff4d6d" : G.color;
          ctx.beginPath();
          if (it.bad) { ctx.moveTo(it.x, it.y - 12); ctx.lineTo(it.x + 11, it.y + 10); ctx.lineTo(it.x - 11, it.y + 10); ctx.closePath(); }
          else ctx.arc(it.x, it.y, 10, 0, 6.283);
          ctx.fill();
        });
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        ctx.fillRect(G.x - G.w / 2, 372, G.w, 12);
      }
    },

    /* ---------- Brick breaker ---------- */
    breakout: {
      help: "Move the paddle with the mouse, touch or ← → keys. Bounce the ball to break every brick. Drop the ball three times and it is over.",
      reset: function () {
        G.x = 320; G.w = 100; G.lives = 3; G.items = [];
        G.bricks = [];
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 10; c++) G.bricks.push({ x: 20 + c * 60, y: 40 + r * 24, w: 54, h: 18, row: r, alive: true });
        }
        G.left = G.bricks.length;
        G.ball = { x: 320, y: 340, vx: 150, vy: -250 };
      },
      update: function (dt) {
        if (G.keys.ArrowLeft) G.x -= 440 * dt;
        if (G.keys.ArrowRight) G.x += 440 * dt;
        G.x = clamp(G.x, G.w / 2, 640 - G.w / 2);
        var b = G.ball;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx); }
        if (b.x > 634) { b.x = 634; b.vx = -Math.abs(b.vx); }
        if (b.y < 6) { b.y = 6; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + 6 >= 372 && b.y < 386 && Math.abs(b.x - G.x) < G.w / 2 + 6) {
          b.vy = -Math.abs(b.vy);
          b.vx = clamp((b.x - G.x) / (G.w / 2) * 300, -300, 300);
          if (Math.abs(b.vx) < 70) b.vx = (b.vx < 0 || (b.vx === 0 && Math.random() < 0.5) ? -1 : 1) * 70;
        }
        for (var i = 0; i < G.bricks.length; i++) {
          var k = G.bricks[i];
          if (k.alive && b.x > k.x - 6 && b.x < k.x + k.w + 6 && b.y > k.y - 6 && b.y < k.y + k.h + 6) {
            k.alive = false; G.left--; G.score++; arcadeHud();
            b.vy = -b.vy * 1.015;
            if (G.left <= 0) { arcadeOver(true); return; }
            break;
          }
        }
        if (b.y > 410) {
          hurt();
          if (G && G.state === "playing") {
            G.ball = { x: G.x, y: 340, vx: (Math.random() < 0.5 ? -1 : 1) * 150, vy: -250 };
          }
        }
      },
      draw: function (ctx) {
        ctx.shadowBlur = 10;
        G.bricks.forEach(function (k) {
          if (!k.alive) return;
          ctx.shadowColor = COLORS[k.row % COLORS.length];
          ctx.fillStyle = COLORS[k.row % COLORS.length];
          ctx.fillRect(k.x, k.y, k.w, k.h);
        });
        ctx.shadowColor = "#ffc247"; ctx.fillStyle = "#ffc247";
        ctx.fillRect(G.x - G.w / 2, 372, G.w, 12);
        ctx.shadowColor = "#ffffff"; ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(G.ball.x, G.ball.y, 6, 0, 6.283); ctx.fill();
      }
    },

    /* ---------- Target tap ---------- */
    whack: {
      help: "Click or tap each target before its ring runs out. Every target that vanishes costs a life. Three misses and it is over.",
      reset: function () { G.items = []; G.spawn = 0.4; G.lives = 3; },
      update: function (dt) {
        G.spawn -= dt;
        if (G.spawn <= 0) {
          G.spawn = Math.max(0.35, 0.9 - G.t * 0.012);
          G.items.push({ x: 50 + Math.random() * 540, y: 50 + Math.random() * 300, age: 0,
                         life: Math.max(0.8, 1.7 - G.t * 0.014), r: 26 });
        }
        for (var i = G.items.length - 1; i >= 0; i--) {
          var it = G.items[i];
          it.age += dt;
          if (it.age >= it.life) {
            G.items.splice(i, 1);
            hurt();
            if (!G || G.state !== "playing") return;
          }
        }
      },
      click: function (x, y) {
        for (var i = 0; i < G.items.length; i++) {
          var it = G.items[i];
          if (Math.hypot(it.x - x, it.y - y) <= it.r + 8) {
            G.items.splice(i, 1); G.score++; arcadeHud();
            return;
          }
        }
      },
      draw: function (ctx) {
        G.items.forEach(function (it) {
          var left = 1 - it.age / it.life;
          ctx.shadowBlur = 14; ctx.shadowColor = G.color; ctx.fillStyle = G.color;
          ctx.globalAlpha = 0.35 + 0.65 * left;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r * (0.6 + 0.4 * left), 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0; ctx.strokeStyle = "#ffc247"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 7, -1.5708, -1.5708 + 6.283 * left); ctx.stroke();
        });
      }
    },

    /* ---------- First-person bot shooter ---------- */
    fps: {
      help: "FIRST-PERSON 3D-STYLE MISSION: WASD to walk, Shift to sprint, mouse to look, click to shoot, R to restart after defeat. Eliminate 8 enemy bots.",
      reset: function () {
        G.px = 3.5; G.py = 3.5; G.angle = 0.15; G.hp = 100; G.ammo = 40; G.kills = 0; G.shotFlash = 0; G.hitFlash = 0; G.enemyClock = 0;
        G.map = ["111111111111", "100000000001", "101100110101", "100000000001", "101011010101", "100000000001", "101100110101", "100000000001", "111111111111"];
        G.bots = [ {x:8.5,y:1.8,hp:2},{x:9.3,y:3.5,hp:2},{x:2.4,y:5.4,hp:2},{x:8.5,y:6.8,hp:2},{x:5.5,y:1.7,hp:2},{x:5.7,y:7.3,hp:2},{x:1.7,y:3.2,hp:2},{x:10,y:5.2,hp:2} ];
        G.lives = 3; G.score = 0; G.lastMouseX = null; G.damageWait = 0;
      },
      wall: function(x,y){ return !G.map[Math.floor(y)] || G.map[Math.floor(y)][Math.floor(x)] !== "0"; },
      update: function(dt) {
        var speed=(G.keys.Shift ? 3.6 : 2.25)*dt, ca=Math.cos(G.angle), sa=Math.sin(G.angle), nx=G.px, ny=G.py;
        if(G.keys.ArrowLeft) G.angle-=1.8*dt; if(G.keys.ArrowRight) G.angle+=1.8*dt;
        if(G.keys.KeyA || G.keys.a) { nx += Math.cos(G.angle-1.5708)*speed; ny += Math.sin(G.angle-1.5708)*speed; }
        if(G.keys.KeyD || G.keys.d) { nx += Math.cos(G.angle+1.5708)*speed; ny += Math.sin(G.angle+1.5708)*speed; }
        if(G.keys.KeyW || G.keys.w || G.keys.ArrowUp) { nx += ca*speed; ny += sa*speed; }
        if(G.keys.KeyS || G.keys.s || G.keys.ArrowDown) { nx -= ca*speed; ny -= sa*speed; }
        if(!this.wall(nx,G.py)) G.px=nx; if(!this.wall(G.px,ny)) G.py=ny;
        G.shotFlash=Math.max(0,G.shotFlash-dt); G.hitFlash=Math.max(0,G.hitFlash-dt); G.damageWait-=dt;
        G.bots.forEach(function(b){ if(b.hp<=0)return; var dx=G.px-b.x,dy=G.py-b.y,d=Math.hypot(dx,dy); if(d>0.8){var v=0.32*dt;b.x+=dx/d*v;b.y+=dy/d*v;} if(d<1.0 && G.damageWait<=0){G.hp-=12;G.damageWait=0.7;G.hitFlash=0.18;document.getElementById("arcade-lives").textContent=Math.max(0,Math.ceil(G.hp/34));if(G.hp<=0)arcadeOver(false);} });
        if(G.kills>=8 && G.state==="playing"){G.score=G.kills*100+Math.max(0,G.hp);arcadeHud();arcadeOver(true);}
      },
      click: function(){
        if(G.state!=="playing")return; if(G.ammo<=0){gameMsg("OUT OF AMMO","Mission failed — restart to reload.");return;}
        G.ammo--;G.shotFlash=0.12;var best=null,bestDiff=0.15;
        G.bots.forEach(function(b){if(b.hp<=0)return;var dx=b.x-G.px,dy=b.y-G.py,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx)-G.angle;a=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(a)<bestDiff && dist<7){best=b;bestDiff=Math.abs(a);}});
        if(best){best.hp--;if(best.hp<=0){G.kills++;G.score=G.kills*100;arcadeHud();} }
        if(G.ammo===0 && G.kills<8){gameMsg("MAGAZINE EMPTY","You need to restart the mission.");}
      },
      draw: function(ctx){
        var w=640,h=400;var sky=ctx.createLinearGradient(0,0,0,220);sky.addColorStop(0,"#071226");sky.addColorStop(1,"#31546c");ctx.fillStyle=sky;ctx.fillRect(0,0,w,200);
        var floor=ctx.createLinearGradient(0,200,0,h);floor.addColorStop(0,"#263641");floor.addColorStop(1,"#090d15");ctx.fillStyle=floor;ctx.fillRect(0,200,w,200);
        var depths=[],rays=160,fov=1.12;
        for(var i=0;i<rays;i++){var a=G.angle-fov/2+fov*i/rays,dx=Math.cos(a),dy=Math.sin(a),d=0,hit=false;while(d<12&&!hit){d+=0.035;hit=this.wall(G.px+dx*d,G.py+dy*d);}d*=Math.cos(a-G.angle);depths[i]=d;var wh=Math.min(400,260/d),shade=Math.max(24,125-d*10);ctx.fillStyle="rgb("+(shade*.48|0)+","+(shade*.78|0)+","+(shade|0)+")";ctx.fillRect(i*w/rays,200-wh/2,w/rays+1,wh);if((i%8)<2){ctx.fillStyle="rgba(120,220,255,.09)";ctx.fillRect(i*w/rays,200-wh/2,w/rays+1,wh);}}
        G.bots.forEach(function(b){if(b.hp<=0)return;var dx=b.x-G.px,dy=b.y-G.py,dist=Math.hypot(dx,dy),a=Math.atan2(dy,dx)-G.angle;a=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(a)>fov/2+0.2)return;var sx=w/2+a/fov*w,sz=Math.min(150,95/dist),sy=200;var ri=Math.max(0,Math.min(rays-1,Math.floor(sx/w*rays)));if(dist>depths[ri]+0.2)return;ctx.fillStyle="#1a202b";ctx.fillRect(sx-sz*.28,sy-sz*.08,sz*.56,sz*.8);ctx.fillStyle="#d94e58";ctx.fillRect(sx-sz*.23,sy-sz*.42,sz*.46,sz*.38);ctx.fillStyle="#ffdbb1";ctx.fillRect(sx-sz*.17,sy-sz*.38,sz*.34,sz*.2);ctx.fillStyle="#6fffe0";ctx.fillRect(sx-sz*.18,sy-sz*.32,sz*.08,sz*.05);ctx.fillRect(sx+sz*.1,sy-sz*.32,sz*.08,sz*.05);ctx.fillStyle="#ef5361";ctx.fillRect(sx-sz*.25,sy-sz*.5,sz*.5,4);ctx.fillStyle="#57ef9a";ctx.fillRect(sx-sz*.25,sy-sz*.5,sz*.5*(b.hp/2),4);});
        // weapon silhouette and HUD
        ctx.fillStyle="#101820";ctx.beginPath();ctx.moveTo(270,400);ctx.lineTo(292,315);ctx.lineTo(347,315);ctx.lineTo(371,400);ctx.fill();ctx.fillStyle="#465868";ctx.fillRect(301,300,38,70);ctx.fillStyle="#192734";ctx.fillRect(311,280,18,48);
        ctx.strokeStyle=G.shotFlash?"#ffce66":"#e6f6ff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(310,200);ctx.lineTo(330,200);ctx.moveTo(320,190);ctx.lineTo(320,210);ctx.stroke();
        ctx.fillStyle="rgba(0,0,0,.6)";ctx.fillRect(12,12,205,56);ctx.fillStyle="#70f5dc";ctx.font="bold 14px Arial";ctx.fillText("OPERATION: IRON VEIL",22,31);ctx.fillStyle="#fff";ctx.font="12px Arial";ctx.fillText("BOTS: "+G.kills+" / 8     AMMO: "+G.ammo,22,49);ctx.fillStyle="#333";ctx.fillRect(22,55,175,6);ctx.fillStyle=G.hp>35?"#52edaa":"#ff526b";ctx.fillRect(22,55,175*Math.max(0,G.hp)/100,6);
        if(G.hitFlash){ctx.fillStyle="rgba(255,20,50,.2)";ctx.fillRect(0,0,w,h);}
      }
    }
  };

  function buildArcade() {
    var box = document.createElement("div");
    box.className = "arcade";
    box.id = "arcade";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "arcade-title");
    box.innerHTML = [
      '<div class="arcade__card">',
      '  <div class="arcade__bar">',
      '    <b id="arcade-title"></b>',
      '    <span>Score <b id="arcade-score">0</b></span>',
      '    <span>Lives <b id="arcade-lives">3</b></span>',
      '    <span>Best <b id="arcade-best">0</b></span>',
      '    <button type="button" class="btn btn--ghost btn--small" id="arcade-exit">Exit game</button>',
      '  </div>',
      '  <div class="arcade__stage" id="arcade-stage">',
      '    <canvas id="arcade-canvas" width="640" height="400"></canvas>',
      '    <div class="arcade__msg" id="arcade-msg"></div>',
      '  </div>',
      '  <p class="arcade__help" id="arcade-help"></p>',
      '</div>'
    ].join("");
    return box;
  }

  function gameMsg(title, text) {
    document.getElementById("arcade-msg").innerHTML = "<b>" + esc(title) + "</b><span>" + esc(text) + "</span>";
    document.getElementById("arcade-msg").hidden = false;
  }

  function launchGame(title) {
    if (window.VPFP && GAMES[title]) { window.VPFP.launch(title); return; }
    if (!arcade || !GAMES[title]) return;
    var hue = 0;
    for (var i = 0; i < title.length; i++) hue += title.charCodeAt(i);
    var best = readHistory().filter(function (h) { return h.title === title; })
      .reduce(function (m, h) { return Math.max(m, h.score); }, 0);
    var kind = KIND_OF[title] || "catch";

    G = { title: title, kind: kind, color: COLORS[hue % COLORS.length], state: "ready", x: 320, w: 90, items: [],
          score: 0, lives: 3, best: best, t: 0, spawn: 0, played: 0, startedAt: 0, keys: {}, raf: 0, last: 0 };
    MINI[kind].reset();

    document.getElementById("arcade-title").textContent = title;
    document.getElementById("arcade-help").textContent = MINI[kind].help + " Click or press Space to start.";
    document.getElementById("arcade-stage").style.backgroundImage =
      "linear-gradient(rgba(10,8,24,.78), rgba(10,8,24,.9)), url('" + GAMES[title].img + "')";
    gameMsg(title, KIND_NAME[kind] + " · click or press Space to start");
    arcadeHud();
    arcade.hidden = false;
    document.body.classList.add("is-locked");
    document.getElementById("arcade-exit").focus();
    G.last = performance.now();
    G.raf = requestAnimationFrame(arcadeLoop);
  }

  function arcadeHud() {
    document.getElementById("arcade-score").textContent = G.score;
    document.getElementById("arcade-lives").textContent = G.lives;
    document.getElementById("arcade-best").textContent = Math.max(G.best, G.score);
  }

  function arcadeStart() {
    if (!G || G.state === "playing") return;
    G.state = "playing";
    G.score = 0; G.t = 0;
    MINI[G.kind].reset();
    G.startedAt = Date.now();
    document.getElementById("arcade-msg").hidden = true;
    arcadeHud();
  }

  function arcadeOver(win) {
    if (!G || G.state === "over") return;
    G.state = "over";
    G.played += (Date.now() - G.startedAt) / 1000;
    if (G.score > G.best) G.best = G.score;
    gameMsg(win ? "You win!" : "Game over", "Score " + G.score + " · click or press Space to play again");
    arcadeHud();
  }

  function arcadeLoop(now) {
    if (!G || arcade.hidden) return;
    var dt = Math.min(0.05, (now - G.last) / 1000);
    G.last = now;
    var c = document.getElementById("arcade-canvas"), ctx = c.getContext("2d");
    var K = MINI[G.kind];

    if (G.state === "playing") {
      G.t += dt;
      K.update(dt);
    }

    ctx.clearRect(0, 0, 640, 400);
    ctx.shadowBlur = 0;
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    K.draw(ctx);
    ctx.shadowBlur = 0;

    G.raf = requestAnimationFrame(arcadeLoop);
  }

  function closeGame() {
    if (!G) return;
    cancelAnimationFrame(G.raf);
    var secs = G.played + (G.state === "playing" ? (Date.now() - G.startedAt) / 1000 : 0);
    var score = G.score;
    var title = G.title;
    var wasPlaying = G.state === "playing";
    G = null;
    arcade.hidden = true;
    if (!gameModal || gameModal.hidden) document.body.classList.remove("is-locked");

    // every launch is saved, so the history always shows what was played last
    var list = readHistory();
    var bestScore = Math.max(score, wasPlaying ? score : 0);
    list.unshift({ title: title, ts: Date.now(), score: Math.max(bestScore, 0), dur: secs });
    writeHistory(list.slice(0, 100));
    document.dispatchEvent(new CustomEvent("vp:history"));
    toast("Saved to play history: " + title);
  }

  function startArcade() {
    document.body.appendChild(buildArcade());
    arcade = document.getElementById("arcade");
    document.getElementById("arcade-exit").addEventListener("click", closeGame);

    var stage = document.getElementById("arcade-stage");
    var canvas = document.getElementById("arcade-canvas");

    function toCanvas(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left) / r.width * 640, y: (clientY - r.top) / r.height * 400 };
    }

    stage.addEventListener("click", function (e) {
      if (!G) return;
      if (G.state !== "playing") { arcadeStart(); return; }
      var K = MINI[G.kind];
      if (K.click) { var p = toCanvas(e.clientX, e.clientY); K.click(p.x, p.y); }
    });

    function moveTo(clientX) {
      if (!G) return;
      if (G.kind === "fps") {
        if (G.lastMouseX !== null) G.angle += (clientX - G.lastMouseX) * 0.004;
        G.lastMouseX = clientX;
      } else G.x = toCanvas(clientX, 0).x;
    }
    stage.addEventListener("mousemove", function (e) { moveTo(e.clientX); });
    stage.addEventListener("mouseleave", function () { if (G && G.kind === "fps") G.lastMouseX = null; });
    stage.addEventListener("touchmove", function (e) { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });

    // swipes steer the snake on touch screens
    var sx = 0, sy = 0;
    stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (!G || G.kind !== "snake" || G.state !== "playing") return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      if (Math.abs(dx) > Math.abs(dy)) MINI.snake.turn(dx > 0 ? 1 : -1, 0);
      else MINI.snake.turn(0, dy > 0 ? 1 : -1);
    });

    document.addEventListener("keydown", function (e) {
      if (!G) return;
      if (e.key === "Escape") { closeGame(); return; }
      if ((e.key === "r" || e.key === "R") && G.kind === "fps") { arcadeStart(); return; }
      var K = MINI[G.kind];
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "W", "A", "S", "D"].indexOf(e.key) !== -1) {
        G.keys[e.key] = true; G.keys[e.code] = true; e.preventDefault();
        if (G.state === "playing" && K.key) K.key(e);
      }
      if ((e.key === " " || e.key === "Enter") && e.target.id !== "arcade-exit") {
        e.preventDefault();
        if (G.state !== "playing") arcadeStart();
        else if (K.key) K.key(e);
      }
    });
    document.addEventListener("keyup", function (e) { if (G) G.keys[e.key] = false; });
  }

  function page_history() {
    var current = "All";
    var stats = document.getElementById("hist-stats");
    var filters = document.getElementById("hist-filters");
    var list = document.getElementById("hist-list");
    var empty = document.getElementById("hist-empty");
    var bestSection = document.getElementById("hist-best-section");
    var best = document.getElementById("hist-best");
    var count = document.getElementById("hist-count");

    function dayLabel(ts) {
      var d = new Date(ts), now = new Date();
      var a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      var b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      var diff = Math.round((b - a) / 86400000);
      if (diff <= 0) return "Today";
      if (diff === 1) return "Yesterday";
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    }

    function clock(ts) {
      return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }

    function fmtTotal(sec) {
      sec = Math.round(sec);
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return h ? h + " h " + m + " min" : m + " min";
    }

    function paint() {
      var all = readHistory();
      var titles = all.reduce(function (acc, h) {
        if (acc.indexOf(h.title) === -1) acc.push(h.title);
        return acc;
      }, []);
      if (current !== "All" && titles.indexOf(current) === -1) current = "All";

      // summary
      var secs = all.reduce(function (sum, h) { return sum + (h.dur || 0); }, 0);
      var topScore = all.reduce(function (m, h) { return Math.max(m, h.score || 0); }, 0);
      var tally = {};
      all.forEach(function (h) { tally[h.title] = (tally[h.title] || 0) + 1; });
      var fav = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; })[0];
      stats.innerHTML = [
        { v: String(all.length), l: "sessions played" },
        { v: all.length ? fmtTotal(secs) : "0 min", l: "time in games" },
        { v: String(topScore), l: "highest score" },
        { v: fav || "—", l: "most played" }
      ].map(function (i) { return '<div class="stat"><b>' + esc(i.v) + "</b><span>" + i.l + "</span></div>"; }).join("");

      // filters
      filters.hidden = all.length === 0;
      filters.innerHTML = ["All"].concat(titles).map(function (t) {
        return '<button type="button" data-title="' + esc(t) + '" aria-pressed="' + (t === current) + '">' + esc(t) + "</button>";
      }).join("");

      // timeline
      var visible = all.filter(function (h) { return current === "All" || h.title === current; });
      empty.hidden = all.length > 0;
      count.textContent = all.length ? visible.length + " of " + all.length + " sessions" : "";
      var html = "", lastDay = "";
      visible.forEach(function (h) {
        var label = dayLabel(h.ts);
        if (label !== lastDay) {
          if (lastDay) html += "</ul>";
          html += '<h3 class="hist__day">' + esc(label) + '</h3><ul class="hist__items">';
          lastDay = label;
        }
        html += '<li class="hist__item">' + cover(h.title, "hist__thumb") +
          '<div class="hist__info"><b>' + esc(h.title) + "</b>" +
          "<span>" + esc(KIND_NAME[KIND_OF[h.title] || "catch"]) + " · " + clock(h.ts) + " · " + ago(h.ts) + "</span></div>" +
          '<div class="hist__num"><b>' + h.score + "</b><span>score</span></div>" +
          '<div class="hist__num"><b>' + fmtDur(h.dur) + "</b><span>time</span></div>" +
          '<button class="btn btn--play btn--small" type="button" data-again="' + esc(h.title) + '">Play again</button></li>';
      });
      list.innerHTML = html ? html + "</ul>" : "";

      // new section: personal bests per game
      bestSection.hidden = all.length === 0;
      var rows = titles.map(function (t) {
        var mine = all.filter(function (h) { return h.title === t; });
        return {
          title: t,
          top: mine.reduce(function (m, h) { return Math.max(m, h.score || 0); }, 0),
          runs: mine.length,
          time: mine.reduce(function (sum, h) { return sum + (h.dur || 0); }, 0)
        };
      }).sort(function (a, b) { return b.top - a.top; });
      best.innerHTML = rows.map(function (r, i) {
        return '<article class="card best">' + cover(r.title) +
          '<div class="card__body"><p class="best__rank">#' + (i + 1) + " personal best</p>" +
          '<h3 class="card__title">' + esc(r.title) + "</h3>" +
          '<p class="best__score">' + r.top + "<span> points</span></p>" +
          '<p class="card__meta">' + r.runs + (r.runs === 1 ? " session" : " sessions") + " · " + fmtTotal(r.time) + "</p>" +
          '<button class="btn btn--small btn--play" type="button" data-again="' + esc(r.title) + '">Beat it</button></div></article>';
      }).join("");
    }

    filters.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-title]");
      if (!btn) return;
      current = btn.dataset.title;
      paint();
    });

    document.addEventListener("click", function (event) {
      var again = event.target.closest("[data-again]");
      if (again) launchGame(again.dataset.again);
    });

    document.getElementById("hist-clear").addEventListener("click", function () {
      if (!readHistory().length) return;
      writeHistory([]);
      paint();
      toast("History cleared");
    });

    document.addEventListener("vp:history", paint);
    paint();
  }

  function page_explore() {
    var $ = function (id) { return document.getElementById(id); };
    var titles = Object.keys(GAMES);
    var store = function (k, v) {
      try {
        if (v === undefined) return JSON.parse(localStorage.getItem("bagame." + k));
        localStorage.setItem("bagame." + k, JSON.stringify(v));
      } catch (e) {}
      return null;
    };
    var val = function (t) { var p = GAMES[t].price; return p && p.value ? p.value : 0; };
    var off = function (t) { var p = GAMES[t].price; return p && p.off ? Math.abs(parseInt(p.off.replace(/[^\d]/g, ""), 10)) : 0; };
    var byRating = titles.slice().sort(function (a, b) { return GAMES[b].rating - GAMES[a].rating; });

    function card(t) {
      var g = GAMES[t], p = g.price || {};
      return '<article class="card">' + cover(t) + '<div class="card__body"><h3 class="card__title">' + esc(t) + '</h3><p class="card__meta">' + esc(g.genre) + '</p><p class="card__rating">' + stars(g.rating) + "<span>" + g.rating + "</span></p><p class=\"card__price\">" +
        (p.off ? '<span class="price__off">' + p.off + "</span>" : "") + (p.old ? '<span class="price__old">' + p.old + "</span>" : "") + '<span class="price__now">' + (p.now || "Free") + '</span></p><button class="btn btn--small btn--primary" type="button" data-buy="' + esc(t) + '">Add to cart</button></div></article>';
    }

    // 3. game finder: search + tag + sort
    var tagCount = {};
    titles.forEach(function (t) { GAMES[t].tags.forEach(function (x) { tagCount[x] = (tagCount[x] || 0) + 1; }); });
    var tags = Object.keys(tagCount).sort(function (a, b) { return tagCount[b] - tagCount[a] || a.localeCompare(b); }).slice(0, 9);
    var state = { q: "", tag: "", sort: "rating" };
    $("x-tags").innerHTML = ['<button type="button" data-tag="" aria-pressed="true">All</button>'].concat(tags.map(function (x) {
      return '<button type="button" data-tag="' + esc(x) + '" aria-pressed="false">' + esc(x) + "</button>";
    })).join("");
    function setTag(tag) {
      state.tag = tag;
      $("x-tags").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tag === tag)); });
      paintFinder();
    }
    function paintFinder() {
      var q = state.q.toLowerCase();
      var list = titles.filter(function (t) {
        var g = GAMES[t];
        var hay = (t + " " + g.genre + " " + g.studio + " " + g.tags.join(" ")).toLowerCase();
        return (!q || hay.indexOf(q) !== -1) && (!state.tag || g.tags.indexOf(state.tag) !== -1);
      });
      var sorts = {
        rating: function (a, b) { return GAMES[b].rating - GAMES[a].rating; },
        cheap: function (a, b) { return val(a) - val(b); },
        deal: function (a, b) { return off(b) - off(a); },
        name: function (a, b) { return a.localeCompare(b); }
      };
      list.sort(sorts[state.sort]);
      $("x-grid").innerHTML = list.map(card).join("");
      $("x-count").textContent = list.length + " of " + titles.length + " games";
      $("x-empty").hidden = list.length > 0;
      refreshBuyButtons();
    }
    $("x-tags").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setTag(b.dataset.tag); });
    $("x-q").addEventListener("input", function (e) { state.q = e.target.value; paintFinder(); });
    $("x-sort").addEventListener("change", function (e) { state.sort = e.target.value; paintFinder(); });
    paintFinder();

    // 2. ticker: real tags, click filters the finder
    var tick = tags.map(function (x) { return '<button type="button" data-tick="' + esc(x) + '">' + esc(x.toUpperCase()) + "</button>"; }).join("");
    $("x-ticker").innerHTML = tick + tick;
    $("x-ticker").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tick]");
      if (!b) return;
      setTag(b.dataset.tick);
      $("x-finder").scrollIntoView({ behavior: "smooth" });
    });

    // 1. surprise me
    $("x-surprise").addEventListener("click", function () { openGameModal(titles[Math.floor(Math.random() * titles.length)]); });

    // 4. spotlight with next pick
    var spotAt = Math.floor(Date.now() / 864e5) % titles.length;
    function paintSpot() {
      var t = titles[spotAt], g = GAMES[t], p = g.price || {};
      $("x-spot").innerHTML = cover(t, "x-spot__cover") + '<div><p class="hero__kicker">' + esc(g.genre) + "</p><h3>" + esc(t) + "</h3><p>" + esc(g.short) + '</p><ul class="tags">' +
        g.tags.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><p class="card__price">' + (p.off ? '<span class="price__off">' + p.off + "</span>" : "") +
        '<span class="price__now">' + (p.now || "Free") + '</span></p><button class="btn btn--primary" type="button" data-buy="' + esc(t) + '">Add to cart</button></div>';
      refreshBuyButtons();
    }
    $("x-next").addEventListener("click", function () { spotAt = (spotAt + 1) % titles.length; paintSpot(); });
    paintSpot();

    // 5. rail with arrows
    $("x-rail").innerHTML = byRating.map(function (t) { return "<figure>" + cover(t) + "<figcaption>" + esc(t) + " · ★ " + GAMES[t].rating + "</figcaption></figure>"; }).join("");
    document.querySelectorAll("[data-rail]").forEach(function (b) {
      b.addEventListener("click", function () { $("x-rail").scrollBy({ left: 440 * Number(b.dataset.rail), behavior: "smooth" }); });
    });

    // 7. sortable leaderboard
    var lb = $("x-lb"), dir = {};
    document.querySelectorAll("[data-sort]").forEach(function (b) {
      b.addEventListener("click", function () {
        var col = Number(b.dataset.sort);
        dir[col] = !dir[col];
        var rows = Array.prototype.slice.call(lb.rows).sort(function (a, c) {
          var x = parseInt(a.cells[col].textContent.replace(/\D/g, ""), 10), y = parseInt(c.cells[col].textContent.replace(/\D/g, ""), 10);
          return dir[col] ? y - x : x - y;
        });
        rows.forEach(function (r, i) { r.cells[0].textContent = i + 1; lb.appendChild(r); });
      });
    });

    // 9. rings computed from the catalog and the cart
    var cartN = readCart().length;
    var sale = Math.round(titles.filter(function (t) { return off(t) > 0; }).length / titles.length * 100);
    var avg = Math.round(titles.reduce(function (s, t) { return s + GAMES[t].rating; }, 0) / titles.length / 5 * 100);
    var cartPct = Math.round(cartN / titles.length * 100);
    [["sale", sale], ["rate", avg], ["cart", cartPct]].forEach(function (r) {
      var node = document.querySelector('[data-ring="' + r[0] + '"]');
      node.style.setProperty("--p", r[1]);
      node.querySelector("b").textContent = r[1] + "%";
    });

    // 10 + 13. plans: choose and remember, compare column highlights
    var PLANS = [["Free", "$0", ["Full catalog", "Library"]], ["Plus", "$5", ["Extra discounts", "Early access", "Cloud saves"]], ["Family", "$9", ["Up to 5 profiles", "Shared library"]]];
    function paintPlans() {
      var cur = store("plan") || "Free";
      $("x-plans").innerHTML = PLANS.map(function (p) {
        var on = p[0] === cur;
        return '<div class="' + (on ? "is-top" : "") + '"><h3>' + p[0] + '</h3><p class="x-price">' + p[1] + (p[1] === "$0" ? "" : "<small>/mo</small>") + "</p><ul>" +
          p[2].map(function (f) { return "<li>" + f + "</li>"; }).join("") + '</ul><button class="btn ' + (on ? "btn--play" : "btn--primary") + ' btn--block" type="button" data-plan="' + p[0] + '">' + (on ? "Current plan" : "Choose " + p[0]) + "</button></div>";
      }).join("");
      var cmp = $("x-cmp").children;
      for (var i = 0; i < cmp.length; i++) cmp[i].classList.remove("is-cur");
      var col = cur === "Free" ? 1 : 2;
      for (var j = 1; j < cmp.length; j++) if (j % 3 === col) cmp[j].classList.add("is-cur");
      return cur;
    }
    paintPlans();
    $("x-plans").addEventListener("click", function (e) {
      var b = e.target.closest("[data-plan]");
      if (!b) return;
      store("plan", b.dataset.plan);
      paintPlans();
      $("x-plan-note").textContent = "Plan switched to " + b.dataset.plan + " (demo, no payment taken).";
      toast("Plan: " + b.dataset.plan);
    });

    // 12. FAQ search
    $("x-faqq").addEventListener("input", function (e) {
      var q = e.target.value.toLowerCase();
      $("x-faq").querySelectorAll("details").forEach(function (d) { d.hidden = q && d.textContent.toLowerCase().indexOf(q) === -1; });
    });

    // 14. badges unlocked from real activity
    var acct = read(), hist = readHistory().length;
    var BADGES = [["🛒", "First purchase", cartN >= 1], ["💎", "Collector (3+ in cart)", cartN >= 3], ["🎮", "First session", hist >= 1], ["🔥", "5 sessions", hist >= 5], ["👤", "Signed in", !!acct], ["💰", "Plus member", store("plan") === "Plus" || store("plan") === "Family"]];
    $("x-badges").innerHTML = BADGES.map(function (b) { return '<span class="' + (b[2] ? "is-on" : "") + '" title="' + (b[2] ? "Unlocked" : "Locked") + '">' + b[0] + " " + b[1] + "</span>"; }).join("");

    // 15. editors' picks (top 2 rated) and 16. mosaic of real screenshots
    $("x-zig").innerHTML = byRating.slice(0, 2).map(function (t, i) {
      return '<div class="' + (i ? "is-rev" : "") + '">' + cover(t, "x-zig__cover") + "<p><b>" + esc(t) + "</b>" + esc(GAMES[t].short) + '<br><button class="btn btn--small btn--primary" type="button" data-buy="' + esc(t) + '">Add to cart</button></p></div>';
    }).join("");
    var shots = [];
    titles.forEach(function (t) { GAMES[t].shots.slice(0, 1).forEach(function (s) { shots.push([t, s]); }); });
    $("x-mosaic").innerHTML = shots.slice(0, 9).map(function (s) { return '<img src="' + s[1] + '" alt="' + esc(s[0]) + ' screenshot" data-game="' + esc(s[0]) + '" tabindex="0" loading="lazy">'; }).join("");

    // 17. tips
    var TIPS = ["Press any cover to open the game page with specs and reviews.", "Add games to the cart first, then top up the wallet once.", "Every launched session is saved on the History page.", "Use the finder tags to jump straight to a genre.", "Your plan and votes are remembered in this browser."];
    var tipAt = 0;
    $("x-tip").textContent = TIPS[0];
    $("x-tip-next").addEventListener("click", function () { tipAt = (tipAt + 1) % TIPS.length; $("x-tip").textContent = TIPS[tipAt]; });

    // 18. roadmap voting
    var VOTES = store("votes") || {}, mine = store("myvotes") || {};
    var ROAD = [["Now", ["Explore page"]], ["Next", ["Friend gifts", "Light theme"]], ["Later", ["Mods hub"]]];
    function paintRoad() {
      $("x-road").innerHTML = ROAD.map(function (c) {
        return "<div><h3>" + c[0] + "</h3>" + c[1].map(function (f) {
          return '<p><span>' + f + '</span><button type="button" class="x-vote' + (mine[f] ? " is-on" : "") + '" data-vote="' + f + '" aria-pressed="' + !!mine[f] + '">▲ ' + (VOTES[f] || 0) + "</button></p>";
        }).join("") + "</div>";
      }).join("");
    }
    paintRoad();
    $("x-road").addEventListener("click", function (e) {
      var b = e.target.closest("[data-vote]");
      if (!b) return;
      var f = b.dataset.vote;
      mine[f] = !mine[f];
      VOTES[f] = Math.max(0, (VOTES[f] || 0) + (mine[f] ? 1 : -1));
      store("votes", VOTES); store("myvotes", mine);
      paintRoad();
    });

    // 20. contact form: validated and saved
    $("x-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, box = store("messages") || [];
      box.push({ name: f.elements[0].value.trim(), mail: f.elements[1].value.trim(), text: f.elements[2].value.trim(), at: Date.now() });
      store("messages", box);
      $("x-status").textContent = "Thanks! Message #" + box.length + " saved in this browser.";
      f.reset();
    });
  }

  function page_deals() {
    var titles = Object.keys(GAMES);
    function card(t) {
      var g = GAMES[t], p = g.price || {};
      return '<article class="card">' + cover(t) + '<div class="card__body"><h3 class="card__title">' + esc(t) + '</h3><p class="card__meta">' + esc(g.genre) + '</p><p class="card__price">' +
        (p.off ? '<span class="price__off">' + p.off + "</span> " : "") +
        (p.old ? '<span class="price__old">' + p.old + "</span> " : "") +
        '<span class="price__now">' + (p.now || "Free") + '</span></p>' +
        '<button class="btn btn--small btn--primary" type="button" data-buy="' + esc(t) + '">Add to cart</button></div></article>';
    }
    var deals = titles.filter(function (t) { return GAMES[t].price && GAMES[t].price.off; }).sort(function (a, b) {
      var oa = Math.abs(parseInt(String(GAMES[a].price.off).replace(/[^\d]/g, ""), 10) || 0);
      var ob = Math.abs(parseInt(String(GAMES[b].price.off).replace(/[^\d]/g, ""), 10) || 0);
      return ob - oa;
    });
    var cheap = titles.filter(function (t) { var v = GAMES[t].price && GAMES[t].price.value; return v > 0 && v < 20; });
    var free = titles.filter(function (t) { return GAMES[t].price && GAMES[t].price.value === 0; });
    var g1 = document.getElementById("deals-grid");
    var g2 = document.getElementById("deals-cheap");
    var g3 = document.getElementById("deals-free");
    if (g1) g1.innerHTML = deals.slice(0, 12).map(card).join("") || "<p class='feed__empty'>No deals right now.</p>";
    if (g2) g2.innerHTML = cheap.map(card).join("") || "<p class='feed__empty'>Nothing under $20.</p>";
    if (g3) g3.innerHTML = free.map(card).join("") || "<p class='feed__empty'>No free titles.</p>";
  }


  var pages = {
    home: page_home,
    deals: page_deals,
    news: page_news,
    library: page_library,
    profile: page_profile,
    history: page_history,
    explore: page_explore
  };

  function boot() {
    startGate();
    startMenu();
    startCart();
    startCheckout();
    startTopup();
    startGameModal();
    startArcade();

    var name = document.body.dataset.page;
    if (pages[name]) {
      try {
        pages[name]();
      } catch (error) {
        console.error("Page error (" + name + "):", error);
      }
    }
    refreshBuyButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
