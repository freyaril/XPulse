(() => {
    'use strict';

    //   Helpers  
    // Query shortcuts
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    // Escape text before putting it in HTML
    const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // REMADE BY TRIO: Workout exercise images mapped to images/WORKOUTS/ folder
    const EXERCISE_IMAGES = {
        // Chest
        'Barbell Bench Press': 'images/WORKOUTS/chest-workout/bench-press.png',
        'Dumbbell Incline Press': 'images/WORKOUTS/chest-workout/dumbbell-incline.png',
        'Dumbbell Fly': 'images/WORKOUTS/chest-workout/dumbbell-fly.png',
        'Smith Machine Incline Press': 'images/WORKOUTS/chest-workout/smith-incline.png',
        'Machine Chest Fly': 'images/WORKOUTS/chest-workout/machine-fly.png',
        'Dips': 'images/WORKOUTS/chest-workout/dips.png',

        // Back
        'Pull-Up': 'images/WORKOUTS/back-workout/pull-up.png',
        'Lat Pulldown': 'images/WORKOUTS/back-workout/lat-pulldown.png',
        'Barbell Row': 'images/WORKOUTS/back-workout/barbell-row.png',
        'Seated Cable Row': 'images/WORKOUTS/back-workout/seated-row.png',
        'Dumbbell Row': 'images/WORKOUTS/back-workout/dumbbell-row.png',
        'Face Pull': 'images/WORKOUTS/back-workout/face-pull.png',

        // Shoulders
        'Overhead Press': 'images/WORKOUTS/shoulder-workout/overhead-press.png',
        'Dumbbell Lateral Raise': 'images/WORKOUTS/shoulder-workout/lat-raises.png',
        'Arnold Press': 'images/WORKOUTS/shoulder-workout/arnold-press.png',
        'Rear Delt Fly': 'images/WORKOUTS/shoulder-workout/rear-delt-fly.png',
        'Upright Row': 'images/WORKOUTS/shoulder-workout/upright-row.png',
        'Machine Shoulder Press': 'images/WORKOUTS/shoulder-workout/machine-shoulder-press.png',

        // Legs
        'Barbell Squat': 'images/WORKOUTS/leg-workout/barbell-squats.png',
        'Romanian Deadlift': 'images/WORKOUTS/leg-workout/rdl.png',
        'Leg Press': 'images/WORKOUTS/leg-workout/leg-press.png',
        'Walking Lunge': 'images/WORKOUTS/leg-workout/walking-lunge.png',
        'Leg Curl': 'images/WORKOUTS/leg-workout/leg-curl.png',
        'Standing Calf Raise': 'images/WORKOUTS/leg-workout/standing-calf-raise.png',

        // Arms
        'Barbell Curl': 'images/WORKOUTS/arm-workout/barbell-curl.png',
        'Hammer Curl': 'images/WORKOUTS/arm-workout/hammer-curl.png',
        'Preacher Curl': 'images/WORKOUTS/arm-workout/preacher-curl.png',
        'Skull Crusher': 'images/WORKOUTS/arm-workout/skull-crusher.png',
        'Triceps Push-Down': 'images/WORKOUTS/arm-workout/tricep-push-down.png',
        'Overhead Triceps Extension': 'images/WORKOUTS/arm-workout/overhead-extension.png'
    };
    // Image tag for an exercise
    const exerciseImg = (name) => (EXERCISE_IMAGES[name] ? `<img src="${esc(EXERCISE_IMAGES[name])}" alt="${esc(name)}">` : '');

    // Storage keys
    const ACCOUNTS_KEY = 'xpulse_accounts';
    const SESSION_KEY = 'xpulse_session';

    // Read from localStorage
    const readJSON = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            return fallback;
        }
    };
    // Write to localStorage
    const writeJSON = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* storage full / blocked */ }
    };

    //   Storage (accounts and saved data)  
    // Data every new account starts with
    const defaultState = () => ({
        profile: {
            sex: 'male',
            height: '', heightUnit: 'cm',
            // REMADE BY TRIO: default weight unit to kg (lbs removed from onboarding)
            weight: '', weightUnit: 'kg',
            objective: 'lose-weight',
            split: 'ppl-hybrid',
            startDate: null,
            onboarded: false
        },
        workouts: [],
        weightLog: [],
        claimed: [],
        addedByDay: {},
        wallet: { xp: 0, coins: 0, inventory: [], owned: [], vouchers: [], equipped: { border: null, avatar: null, banner: null } }
    });

    // Accounts and current session
    const getAccounts = () => readJSON(ACCOUNTS_KEY, {});
    const sessionKey = () => localStorage.getItem(SESSION_KEY);

    // Logged-in user
    function getUser() {
        const key = sessionKey();
        const user = key ? getAccounts()[key] : null;
        if (!user) return null;
        // Merge with defaults so older saved data never breaks the pages
        const base = defaultState();
        user.state = Object.assign(base, user.state || {});
        user.state.profile = Object.assign(base.profile, user.state.profile || {});
        user.state.wallet = Object.assign(base.wallet, user.state.wallet || {});
        user.state.wallet.owned = user.state.wallet.owned || [];
        user.state.wallet.vouchers = user.state.wallet.vouchers || [];
        user.state.addedByDay = user.state.addedByDay || {};
        user.state.wallet.equipped = Object.assign({ border: null, avatar: null, banner: null }, user.state.wallet.equipped || {});
        // REMADE BY GI: Normalize legacy Cinnamoroll Border name to Ice Border
        [...(user.state.wallet.owned || []), ...(user.state.wallet.inventory || [])].forEach((item) => {
            if (item && (item.cosmetic === 'border-cinnamoroll' || item.name === 'Cinnamoroll Border')) {
                item.name = 'Ice Border';
            }
        });
        return user;
    }

    // Save the logged-in user
    function saveUser(user) {
        const key = sessionKey();
        if (!key) return;
        const accounts = getAccounts();
        accounts[key] = user;
        writeJSON(ACCOUNTS_KEY, accounts);
    }

    // Current user
    let user = getUser();
    let updateDashboardRanks = null;

    //   Page guard  
    // Not logged in: go to login
    if ($('[data-requires-auth]') && !user) {
        window.location.replace('index.html#login');
        return;
    }
    // Onboarding not finished: go to onboarding
    if (document.body.dataset.page && user && !user.state.profile.onboarded) {
        window.location.replace('index.html#onboard');
        return;
    }

    //   Shared UI (toast, modals, cosmetics)  
    // Toast message
    let toastTimer = null;
    function toast(message, type = 'info') {
        let el = $('#toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast';
            el.className = 'toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.className = `toast toast-${type} show-toast`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show-toast'), 3200);
    }

    // Open / close a modal
    const modalTriggers = new WeakMap();
    function openModal(modal, trigger) {
        if (!modal) return;
        modalTriggers.set(modal, trigger || document.activeElement);
        modal.classList.add('show-modal');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        const focusTarget = $('.modal-close-btn, .dialog-btn', modal);
        if (focusTarget) focusTarget.focus({ preventScroll: true });
    }
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show-modal');
        modal.setAttribute('aria-hidden', 'true');
        if (!$('.modal-backdrop.show-modal')) document.body.classList.remove('modal-open');
        const trigger = modalTriggers.get(modal);
        if (trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });
    }
    // Backdrop click + Escape close any open modal
    $$('.modal-backdrop').forEach((modal) => {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') $$('.modal-backdrop.show-modal').forEach(closeModal);
    });

    // Objective names and accent colours
    const OBJECTIVES = {
        'lose-weight': { text: 'lose weight', color: '#1fee00' },
        'gain-strength': { text: 'gain strength', color: '#fb923c' },
        'gain-muscle': { text: 'gain muscle', color: '#38bdf8' }
    };
    if (user) {
        const goal = OBJECTIVES[user.state.profile.objective] || OBJECTIVES['lose-weight'];
        document.documentElement.style.setProperty('--goal-accent', goal.color);
    }

    // Cosmetic class names
    const BORDER_CLASSES = ['equipped-border-burning', 'equipped-border-cinnamoroll'];
    const AVATAR_CLASSES = ['avatar-gigachad', 'avatar-cat', 'avatar-warrior', 'avatar-awakened'];
    const BANNER_CLASSES = ['banner-golden'];

    // Show equipped border, avatar and banner
    function applyCosmetics() {
        if (!user) return;
        const eq = user.state.wallet.equipped;
        $$('.avatar-circle, .profile-avatar-large').forEach((el) => {
            el.classList.remove(...BORDER_CLASSES, ...AVATAR_CLASSES, 'has-avatar');
            if (eq.border) el.classList.add(`equipped-${eq.border}`);
            if (eq.avatar) el.classList.add('has-avatar', eq.avatar);
        });
        const bannerBg = $('#profileBannerBg');
        if (bannerBg) {
            bannerBg.classList.remove(...BANNER_CLASSES);
            if (eq.banner) bannerBg.classList.add(eq.banner);
        }
    }
    applyCosmetics();

    //   Single page: landing, login, register, onboarding  
    // Views inside index.html
    const viewEls = $$('.view[data-view]');
    if (viewEls.length) initSinglePage();

    // Landing, login, register and onboarding (no reloads)
    function initSinglePage() {
        const NAMES = viewEls.map((v) => v.dataset.view);
        const NEEDS_ACCOUNT = ['onboard', 'objective', 'splits', 'complete'];
        // REMADE BY TRIO: Removed inches and lbs from onboarding units (restricted to cm and kg)
        const unitLabel = { cm: 'cm', kg: 'kg' };
        const units = { height: 'cm', weight: 'kg' };

        // Form errors
        const errorEl = (form) => $('.form-error', form);
        function showError(form, msg) { const el = errorEl(form); el.textContent = msg; el.hidden = false; }
        $$('form').forEach((form) => {
            const clear = () => { const el = errorEl(form); if (el) el.hidden = true; };
            form.addEventListener('input', clear);
            form.addEventListener('click', (e) => { if (e.target.closest('.unit-btn, .pill-option, .objective-card-label, .split-card-label')) clear(); });
        });

        // Go to a view
        const go = (name) => { if (location.hash === `#${name}`) route(); else location.hash = name; };

        // Show the view named in the URL
        function route() {
            let name = location.hash.replace('#', '') || 'landing';
            if (!NAMES.includes(name)) name = 'landing';
            user = getUser();

            // Already logged in: skip the landing / login / register views entirely
            if (user && ['landing', 'login', 'register'].includes(name)) {
                if (user.state.profile.onboarded) { window.location.replace('dashboard.html'); return; }
                if (name === 'landing') { return go('onboard'); }
            }
            if (NEEDS_ACCOUNT.includes(name) && !user) { return go('login'); }
            if (name === 'complete' && user && !user.state.profile.onboarded) { return go('onboard'); }

            viewEls.forEach((v) => {
                const on = v.dataset.view === name;
                v.hidden = !on;
                if (on) {
                    document.title = v.dataset.title;
                    v.classList.remove('view-enter'); void v.offsetWidth; v.classList.add('view-enter');
                }
            });
            window.scrollTo(0, 0);
            enterView(name);
            const heading = $(`#view-${name} h1`);
            if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
        }

        // Fill a view with saved answers
        function enterView(name) {
            if (!user) return;
            const p = user.state.profile;
            if (name === 'onboard') {
                const sexRadio = $(`input[name="sex"][value="${p.sex}"]`);
                if (sexRadio) sexRadio.checked = true;
                $('#userHeight').value = p.height;
                $('#userWeight').value = p.weight;
                // REMADE BY TRIO: Enforce cm and kg for onboarding view
                units.height = 'cm'; units.weight = 'kg';
                ['height', 'weight'].forEach(syncUnitUI);
            }
            if (name === 'objective') {
                const r = $(`input[name="objective"][value="${p.objective}"]`);
                if (r) r.checked = true;
            }
            if (name === 'splits') {
                const r = $(`input[name="split"][value="${p.split}"]`);
                if (r) r.checked = true;
            }
        }

        // Register
        const registerForm = $('#registerForm');
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = $('#regUsername').value.trim();
            const email = $('#regEmail').value.trim();
            const password = $('#regPass').value;
            const accounts = getAccounts();

            if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return showError(registerForm, 'Username must be 3-20 characters: letters, numbers or underscores.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError(registerForm, 'Please enter a valid email address.');
            if (password.length < 6) return showError(registerForm, 'Password must be at least 6 characters.');
            const key = email.toLowerCase();
            if (accounts[key]) return showError(registerForm, 'An account with that email already exists. Try logging in instead.');
            if (Object.values(accounts).some((a) => a.username.toLowerCase() === username.toLowerCase())) return showError(registerForm, 'That athlete username is already taken.');

            accounts[key] = { username, email, password, state: defaultState() };
            writeJSON(ACCOUNTS_KEY, accounts);
            localStorage.setItem(SESSION_KEY, key);
            registerForm.reset();
            go('onboard');
        });

        // Login
        const loginForm = $('#loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = $('#loginId').value.trim().toLowerCase();
            const password = $('#loginPass').value;
            if (!id || !password) return showError(loginForm, 'Enter your username/email and password.');

            const match = Object.entries(getAccounts()).find(([key, a]) => key === id || a.username.toLowerCase() === id);
            if (!match) return showError(loginForm, 'No account found with that username or email. Sign up instead?');
            if (match[1].password !== password) return showError(loginForm, 'Incorrect password. Please try again.');

            localStorage.setItem(SESSION_KEY, match[0]);
            loginForm.reset();
            const done = match[1].state && match[1].state.profile && match[1].state.profile.onboarded;
            if (done) window.location.href = 'dashboard.html'; else go('onboard');
        });

        // Onboarding: height and weight
        const onboardForm = $('#onboardForm');
        const inputs = { height: $('#userHeight'), weight: $('#userWeight') };

        ['height', 'weight'].forEach((group) => {
            $$(`.unit-toggle[data-unit-group="${group}"] .unit-btn`).forEach((btn) => {
                btn.addEventListener('click', () => { units[group] = btn.dataset.unit; syncUnitUI(group); });
            });
        });
        // REMADE BY TRIO: Human limits validation on onboarding height and weight
        onboardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const p = user.state.profile;
            const height = parseFloat(inputs.height.value);
            const weight = parseFloat(inputs.weight.value);

            if (isNaN(height) || height < 50 || height > 260) {
                return showError(onboardForm, 'Height must be within realistic human limits (50 cm – 260 cm).');
            }
            if (isNaN(weight) || weight < 20 || weight > 350) {
                return showError(onboardForm, 'Weight must be within realistic human limits (20 kg – 350 kg).');
            }

            Object.assign(p, {
                sex: $('input[name="sex"]:checked').value,
                height, heightUnit: 'cm',
                weight, weightUnit: 'kg',
                startDate: p.startDate || new Date().toISOString()
            });
            saveUser(user);
            go('objective');
        });

        // Onboarding: objective
        $('#objectiveForm').addEventListener('submit', (e) => {
            e.preventDefault();
            user.state.profile.objective = $('input[name="objective"]:checked').value;
            saveUser(user);
            go('splits');
        });

        // Onboarding: split
        $('#splitsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            user.state.profile.split = $('input[name="split"]:checked').value;
            user.state.profile.onboarded = true;
            saveUser(user);
            go('complete');
        });

        // Start the router
        window.addEventListener('hashchange', route);
        route();
    }

    //   Shared data  
    // Date as YYYY-MM-DD
    const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Day names (Sunday first)
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Current streak, longest streak and this week
    function streakStats(workouts, schedule) {
        const trained = new Set(workouts.map((w) => dayKey(new Date(w.date))));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let current = 0;
        for (let i = 0; i < 400; i++) {
            const d = new Date(today); d.setDate(today.getDate() - i);
            if (trained.has(dayKey(d))) { current++; continue; }
            if (!schedule[DOW[d.getDay()]] || i === 0) continue; // rest day, or today not finished yet
            break;
        }

        let longest = 0, run = 0;
        if (trained.size) {
            const first = new Date(Math.min(...workouts.map((w) => new Date(w.date).setHours(0, 0, 0, 0))));
            for (const d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
                if (trained.has(dayKey(d))) { run++; longest = Math.max(longest, run); }
                else if (schedule[DOW[d.getDay()]] && dayKey(d) !== dayKey(today)) run = 0;
            }
        }

        const monday = new Date(today);
        monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, i) => {
            const d = new Date(monday); d.setDate(monday.getDate() + i);
            return { label: name, scheduled: Boolean(schedule[name]), done: trained.has(dayKey(d)), today: dayKey(d) === dayKey(today) };
        });
        return { current, longest, week };
    }

    // Intensity: rest seconds and seconds per rep
    const INTENSITY = {
        low: { label: 'Low', rest: 60, tempo: 2 },
        medium: { label: 'Medium', rest: 90, tempo: 3 },
        high: { label: 'High', rest: 150, tempo: 4 }
    };
    // Seconds to m:ss
    const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

    // REMADE BY TRIO: Recommended foods with image paths wired to the images/food/ folder
    const RECOMMENDED_FOODS = {
        'gain-strength': [
            { name: 'Egg', serving: '50g, 1 large', image: 'images/food/eggs.png', macros: { Calories: '72', Protein: '6g', Carbs: '0.4g', Fat: '5g' } },
            { name: 'Beef Sirloin', serving: '100g', image: 'images/food/beef-sirloin.png', macros: { Calories: '215', Protein: '27g', Carbs: '0g', Fat: '12g' } },
            { name: 'White Rice', serving: '160g', image: 'images/food/white-rice.png', macros: { Calories: '205', Protein: '4g', Carbs: '45g', Fat: '0.4g' } },
            { name: 'Sweet Potato', serving: '130g', image: 'images/food/sweet-potato.png', macros: { Calories: '112', Protein: '2g', Carbs: '26g', Fat: '0.1g' } }
        ],
        'gain-muscle': [
            { name: 'Chicken Breast', serving: '100g', image: 'images/food/chicken-breast.png', macros: { Calories: '165', Protein: '31g', Carbs: '0g', Fat: '3.6g' } },
            { name: 'Tilapia', serving: '100g', image: 'images/food/tilapia.png', macros: { Calories: '128', Protein: '26g', Carbs: '0g', Fat: '2.7g' } },
            { name: 'Cardava Banana', serving: '100g', image: 'images/food/cardava-banana.png', macros: { Calories: '120', Protein: '1g', Carbs: '31g', Fat: '0.2g' } },
            { name: 'Oats, Dry', serving: '40g', image: 'images/food/oats.png', macros: { Calories: '150', Protein: '5g', Carbs: '27g', Fat: '3g' } }
        ],
        'lose-weight': [
            { name: 'Milkfish', serving: '100g', image: 'images/food/milk-fish.png', macros: { Calories: '190', Protein: '21g', Carbs: '0g', Fat: '11g' } },
            { name: 'Firm Tofu', serving: '100g', image: 'images/food/firm-tofu.png', macros: { Calories: '144', Protein: '17g', Carbs: '3g', Fat: '9g' } },
            { name: 'Mung Beans', serving: '200g', image: 'images/food/mung-beans.png', macros: { Calories: '212', Protein: '14g', Carbs: '39g', Fat: '0.8g' } },
            { name: 'Sweet Potato', serving: '130g', image: 'images/food/sweet-potato.png', macros: { Calories: '112', Protein: '2g', Carbs: '26g', Fat: '0.1g' } }
        ]
    };

    // Exercises by muscle group
    const LIBRARY = {
        chest: ['Barbell Bench Press', 'Dumbbell Incline Press', 'Dumbbell Fly', 'Smith Machine Incline Press', 'Machine Chest Fly', 'Dips'],
        back: ['Pull-Up', 'Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Dumbbell Row', 'Face Pull'],
        shoulders: ['Overhead Press', 'Dumbbell Lateral Raise', 'Arnold Press', 'Rear Delt Fly', 'Upright Row', 'Machine Shoulder Press'],
        arms: ['Triceps Push-Down', 'Barbell Curl', 'Hammer Curl', 'Skull Crusher', 'Preacher Curl', 'Overhead Triceps Extension'],
        legs: ['Barbell Squat', 'Romanian Deadlift', 'Leg Press', 'Walking Lunge', 'Leg Curl', 'Standing Calf Raise']
    };
    // Exercises per workout day
    const DAY_PLANS = {
        push: { label: 'push day', exercises: ['Barbell Bench Press', 'Dumbbell Incline Press', 'Dumbbell Fly', 'Triceps Push-Down'] },
        pull: { label: 'pull day', exercises: ['Pull-Up', 'Barbell Row', 'Lat Pulldown', 'Barbell Curl'] },
        legs: { label: 'leg day', exercises: ['Barbell Squat', 'Romanian Deadlift', 'Leg Press', 'Standing Calf Raise'] },
        upper: { label: 'upper body day', exercises: ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Barbell Curl'] },
        lower: { label: 'lower body day', exercises: ['Barbell Squat', 'Romanian Deadlift', 'Leg Press', 'Standing Calf Raise'] },
        full: { label: 'full body day', exercises: ['Barbell Squat', 'Barbell Bench Press', 'Barbell Row', 'Overhead Press'] }
    };
    // Week days (Monday first)
    const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // REMADE BY TRIO: Updated 5-day split (rest on Thu & Sun) and 6-day split (rest on Thu)
    const SCHEDULES = {
        'full-body': { Mon: 'full', Wed: 'full', Fri: 'full' },
        'upper-lower': { Mon: 'upper', Tue: 'lower', Thu: 'upper', Fri: 'lower' },
        'ppl-hybrid': { Mon: 'push', Tue: 'pull', Wed: 'legs', Fri: 'upper', Sat: 'lower' },
        ppl: { Mon: 'push', Tue: 'pull', Wed: 'legs', Fri: 'push', Sat: 'pull', Sun: 'legs' }
    };

    //   Dashboard  
    // Body rank popup
    const ranksModal = $('#ranksModal');
    if (ranksModal) {
        const openBtn = $('#openRanksModalBtn');
        openBtn.addEventListener('click', () => openModal(ranksModal, openBtn));
        $('#closeRanksModalBtn').addEventListener('click', () => closeModal(ranksModal));
    }

    if (document.body.dataset.page === 'dashboard' && user) {
        const { profile, workouts, weightLog } = user.state;

        // Ranked-state preview (?preview=ranked)
        if (new URLSearchParams(location.search).get('preview') === 'ranked') {
            document.body.setAttribute('data-rank-preview', 'on');
            const sample = { chest: 'pink-diamond', back: 'diamond', triceps: 'amethyst', biceps: 'gold', shoulder: 'ruby', legs: 'bronze' };
            Object.entries(sample).forEach(([muscle, tier]) => {
                const el = $(`.tier-name[data-muscle="${muscle}"]`);
                if (!el) return;
                el.className = `tier-name tier-${tier}`;
                el.textContent = tier.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            });
            const note = document.createElement('p');
            note.className = 'preview-note';
            note.textContent = 'Design preview only - ranks are not calculated yet.';
            $('.rank-list-column').appendChild(note);
        }

        // REMADE BY TRIO: Weight logging with Desired Weight and Weight History hover X removal
        // REMADE BY TRIO: Display pure value in desired box since kg is displayed outside
        const unit = profile.weightUnit || 'kg';
        const desired = profile.desiredWeight;
        const desiredEl = $('#valWeightDesired');
        if (desiredEl) desiredEl.textContent = desired || '--';
        const openDesiredBtn = $('#openDesiredModalBtn');
        if (desired && openDesiredBtn) {
            openDesiredBtn.textContent = 'Edit';
        }

        function getPoints() {
            return [{ date: profile.startDate, value: profile.weight, isInitial: true }]
                .concat(weightLog.map((w, idx) => ({ date: w.date, value: w.value, logIndex: idx, isInitial: false })))
                .filter((pt) => pt.value !== '' && pt.value !== null && !isNaN(+pt.value));
        }

        // REMADE BY TRIO: Safe refreshWeightDisplays preventing null crashes and syncing external unit labels
        function refreshWeightDisplays() {
            const pts = getPoints();
            const latest = pts.length ? pts[pts.length - 1].value : '--';
            const beforeEl = $('#valWeightBefore');
            if (beforeEl) beforeEl.textContent = profile.weight || '--';
            const nowEl = $('#valWeightNow');
            if (nowEl) nowEl.textContent = latest;
            const sublabel = $('#weightSublabel');
            if (sublabel) sublabel.textContent = `Weight (${unit})`;
            const input = $('#weighInInput');
            if (input) input.placeholder = `New weigh-in (${unit})`;
            $$('.weight-unit-label').forEach((el) => { el.textContent = unit; });
        }
        refreshWeightDisplays();

        // Weight chart
        function renderChart() {
            const box = $('#weightChartContainer');
            if (!box) return;
            const pts = getPoints();
            if (pts.length < 2) {
                box.innerHTML = `
                    <h3 class="weight-history-title">Weight History</h3>
                    <div class="chart-empty-state">
                        <p class="empty-chart-text">Log your next weigh-in to begin tracking progress over time.</p>
                    </div>`;
                return;
            }
            const W = 560, H = 290, L = 64, R = 28, T = 28, B = 52;
            let min = Math.min(...pts.map((pt) => +pt.value));
            let max = Math.max(...pts.map((pt) => +pt.value));
            if (min === max) { min -= 1; max += 1; }
            const span = (max - min) * 0.25;
            min -= span; max += span;
            const x = (i) => L + (i * (W - L - R)) / (pts.length - 1);
            const y = (v) => T + ((max - v) / (max - min)) * (H - T - B);
            const line = pts.map((pt, i) => `${x(i).toFixed(1)},${y(+pt.value).toFixed(1)}`).join(' ');
            const ticks = [max - span, (max + min) / 2, min + span].map((v) => Math.round(v * 10) / 10);
            const month = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            box.innerHTML = `
                <h3 class="weight-history-title">Weight History</h3>
                <svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time chart">
                    <path d="M${L} ${T - 8} V${H - B} H${W - R}" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round"/>
                    ${ticks.map((v) => `<text x="${L - 10}" y="${y(v) + 4}" text-anchor="end" class="chart-tick">${v}${unit}</text>`).join('')}
                    <polyline points="${line}" fill="none" stroke="#0b0b5c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
                    ${pts.map((pt, i) => `
                        <circle cx="${x(i).toFixed(1)}" cy="${y(+pt.value).toFixed(1)}" r="4.5" fill="#0b0b5c"/>
                        <g class="chart-date-group" data-log-index="${pt.logIndex !== undefined ? pt.logIndex : ''}">
                            <rect x="${(x(i) - 22).toFixed(1)}" y="${H - B + 4}" width="44" height="42" fill="transparent" class="chart-date-hitbox"/>
                            <text x="${x(i).toFixed(1)}" y="${H - B + 18}" text-anchor="middle" class="chart-tick chart-date-text">${esc(month(pt.date))}</text>
                            ${!pt.isInitial ? `
                            <g class="chart-delete-btn" data-log-index="${pt.logIndex}" role="button" aria-label="Delete weigh-in on ${esc(month(pt.date))}">
                                <circle cx="${x(i).toFixed(1)}" cy="${H - B + 34}" r="8.5" class="chart-delete-circle"/>
                                <text x="${x(i).toFixed(1)}" y="${H - B + 37.5}" text-anchor="middle" class="chart-delete-x-text">&times;</text>
                            </g>` : ''}
                        </g>`).join('')}
                </svg>`;
        }
        renderChart();

        // REMADE BY TRIO: Click listener on weight chart for hover X removal
        const chartBox = $('#weightChartContainer');
        if (chartBox) {
            chartBox.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.chart-delete-btn');
                if (!deleteBtn) return;
                const idx = parseInt(deleteBtn.dataset.logIndex, 10);
                if (!isNaN(idx) && idx >= 0 && idx < weightLog.length) {
                    weightLog.splice(idx, 1);
                    saveUser(user);
                    refreshWeightDisplays();
                    renderChart();
                    toast('Weigh-in removed.', 'info');
                }
            });
        }

        // REMADE BY TRIO: Log a weigh-in with strict human limits validation
        $('#weighInForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = $('#weighInInput');
            const value = parseFloat(input.value);
            const minW = unit === 'kg' ? 20 : 50;
            const maxW = unit === 'kg' ? 350 : 700;
            if (isNaN(value) || value < minW || value > maxW) {
                toast(`Weight must be within realistic human limits (${minW} – ${maxW} ${unit}).`, 'error');
                return;
            }
            weightLog.push({ date: new Date().toISOString(), value });
            saveUser(user);
            refreshWeightDisplays();
            input.value = '';
            renderChart();
            toast('Weigh-in logged.', 'success');
        });

        // ADDED BY TRIO: Desired weight popup modal handlers
        const desiredModal = $('#desiredWeightModal');
        const closeDesiredBtn = $('#closeDesiredModalBtn');
        const desiredForm = $('#desiredWeightForm');
        const desiredInput = $('#desiredWeightInput');

        if (desiredModal && openDesiredBtn) {
            openDesiredBtn.addEventListener('click', () => {
                if (desiredInput) {
                    desiredInput.value = user.state.profile.desiredWeight || '';
                    desiredInput.placeholder = `Target weight (${unit})`;
                }
                const tag = $('#desiredUnitTag');
                if (tag) tag.textContent = unit;
                openModal(desiredModal, openDesiredBtn);
            });
            if (closeDesiredBtn) {
                closeDesiredBtn.addEventListener('click', () => closeModal(desiredModal));
            }
            if (desiredForm) {
                // REMADE BY TRIO: Desired weight submission with strict human limits validation
                desiredForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const val = parseFloat(desiredInput.value);
                    const minW = unit === 'kg' ? 20 : 50;
                    const maxW = unit === 'kg' ? 350 : 700;
                    if (isNaN(val) || val < minW || val > maxW) {
                        toast(`Desired weight must be within realistic human limits (${minW} – ${maxW} ${unit}).`, 'error');
                        return;
                    }
                    user.state.profile.desiredWeight = val;
                    saveUser(user);
                    // REMADE BY TRIO: Display pure value in desired box since kg is displayed outside
                    $('#valWeightDesired').textContent = val;
                    openDesiredBtn.textContent = 'Edit';
                    closeModal(desiredModal);
                    toast(`Desired weight set to ${val} ${unit}.`, 'success');
                });
            }
        }

        // Consistency and streaks
        const sched = SCHEDULES[profile.split] || SCHEDULES['ppl-hybrid'];
        const stats = streakStats(workouts, sched);
        $('#streakCurrent').textContent = stats.current;
        $('#streakLongest').textContent = stats.longest;
        const done = stats.week.filter((d) => d.done).length;
        const planned = stats.week.filter((d) => d.scheduled).length;
        $('#weekCount').textContent = `${done} / ${planned}`;
        const pct = planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;
        $('#weekBarFill').style.width = `${pct}%`;
        $('#weekBar').setAttribute('aria-valuenow', String(pct));
        $('#weekDays').innerHTML = stats.week.map((d) => `
            <div class="week-day${d.scheduled ? ' is-scheduled' : ''}${d.done ? ' is-done' : ''}${d.today ? ' is-today' : ''}">
                <span class="week-dot">${d.done ? '&#10003;' : ''}</span><span>${d.label}</span>
            </div>`).join('');

        // REMADE BY TRIO: Render recent workouts with average lbs/reps and X remove button
        const grid = $('#workoutsGrid');
        function renderRecentWorkouts() {
            if (!grid) return;
            if (!workouts.length) {
                grid.innerHTML = `
                    <div class="empty-workouts-box">
                        <div class="empty-icon-circle" aria-hidden="true">&#127947;&#65039;</div>
                        <h3>No workouts recorded yet</h3>
                        <p>Your logged training sessions, sets, and rep stats will appear here.</p>
                        <a href="workouts.html" class="start-workout-btn">Log First Workout</a>
                    </div>`;
                return;
            }
            grid.innerHTML = workouts.slice(0, 4).map((w, i) => {
                const sets = w.sets && w.sets.length ? w.sets : [];
                const numSets = sets.length || 1;
                const totalW = sets.reduce((sum, s) => sum + (+s.w || 0), 0);
                const totalR = sets.reduce((sum, s) => sum + (+s.r || 0), 0);
                const avgW = Math.round((totalW / numSets) * 10) / 10;
                const avgR = Math.round((totalR / numSets) * 10) / 10;
                const displayUnit = w.unit || 'lbs';

                return `
                    <article class="workout-card" data-workout-index="${i}">
                        <div class="workout-image-placeholder" style="position: relative;" aria-hidden="true">
                            ${exerciseImg(w.name)}
                            <button type="button" class="remove-recent-workout-btn" data-index="${i}" aria-label="Remove ${esc(w.name)}" title="Remove workout">&times;</button>
                        </div>
                        <h3>${esc(w.name)}</h3>
                        <p>Completed on: ${esc(new Date(w.date).toLocaleDateString('en-US'))}</p>
                        <p class="workout-avg-stats">Average: <strong>${avgW} ${displayUnit}</strong> &middot; <strong>${avgR} reps</strong></p>
                    </article>`;
            }).join('');
        }
        renderRecentWorkouts();

        // REMADE BY TRIO: Handle removal of recent workout
        if (grid) {
            grid.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.remove-recent-workout-btn');
                if (!removeBtn) return;
                const idx = +removeBtn.dataset.index;
                if (idx >= 0 && idx < workouts.length) {
                    const removedName = workouts[idx].name;
                    workouts.splice(idx, 1);
                    saveUser(user);
                    renderRecentWorkouts();
                    if (typeof updateDashboardRanks === 'function') {
                        updateDashboardRanks();
                    }
                    toast(`${removedName} removed from recent workouts.`, 'info');
                }
            });
        }
    }

    //   Workouts  
    if (document.body.dataset.page === 'workouts' && user) {
        const { profile, workouts } = user.state;
        // REMADE BY TRIO: Enforce lbs instead of kg for workout logging
        const unit = 'lbs';
        let schedule = SCHEDULES[profile.split] || SCHEDULES['ppl-hybrid'];
        const cardsRow = $('#workoutCardsRow');
        const loggingBox = $('#loggingCardContainer');
        const addModal = $('#addWorkoutModal');
        const scheduleModal = $('#scheduleModal');

        $('#userGoalText').textContent = (OBJECTIVES[profile.objective] || OBJECTIVES['lose-weight']).text;

        // Today's workout
        const todayName = DOW[new Date().getDay()];
        const startIdx = WEEK.indexOf(todayName);
        let dayType = schedule[todayName];
        for (let i = 1; !dayType && i <= 7; i++) dayType = schedule[WEEK[(startIdx + i) % 7]];

        // Workout state
        let exercises = [];          // the day's workout cards (plan + exercises the user added)
        let active = 0;              // exercise chosen in the LOGGING card (independent of the cards row)
        let menuOpen = false;
        const setsByExercise = {};
        const intensityByExercise = {};
        const addedKey = () => `${dayKey(new Date())}:${dayType}`;

        // REMADE BY TRIO: Minimum reps configuration per intensity
        const INTENSITY_MIN_REPS = { low: 1, medium: 7, high: 12 };

        // REMADE BY TRIO: Rest-only timer logic with user-typed custom time and completion alert
        let customRestSeconds = 90;
        const restTimer = { total: 90, remaining: 90, running: false, handle: null, finished: false };

        function stopRestTimer() {
            clearInterval(restTimer.handle);
            restTimer.handle = null;
            restTimer.running = false;
        }

        function resetRestTimer(seconds) {
            stopRestTimer();
            if (typeof seconds === 'number' && !isNaN(seconds) && seconds > 0) {
                customRestSeconds = seconds;
            }
            restTimer.total = customRestSeconds;
            restTimer.remaining = customRestSeconds;
            restTimer.finished = false;
            paintRestTimer();
        }

        function paintRestTimer() {
            const display = $('#timerDisplay');
            const phaseEl = $('#timerPhase');
            const clockEl = $('#timerClock');
            const startBtn = $('#timerStartBtn');
            if (!clockEl || !startBtn) return;

            clockEl.textContent = fmtTime(restTimer.remaining);
            if (restTimer.finished) {
                if (phaseEl) phaseEl.textContent = 'Rest Finished!';
                if (display) display.classList.add('is-complete');
                startBtn.textContent = 'Start Rest';
            } else if (restTimer.running) {
                if (phaseEl) phaseEl.textContent = 'Resting...';
                if (display) display.classList.remove('is-complete');
                startBtn.textContent = 'Pause';
            } else if (restTimer.remaining < restTimer.total && restTimer.remaining > 0) {
                if (phaseEl) phaseEl.textContent = 'Paused';
                startBtn.textContent = 'Resume';
            } else {
                if (phaseEl) phaseEl.textContent = 'Rest Ready';
                if (display) display.classList.remove('is-complete');
                startBtn.textContent = 'Start Rest';
            }
        }

        function playRestChime() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.8);
            } catch (err) { /* AudioContext blocked or not supported */ }
        }

        function triggerRestAlert() {
            playRestChime();
            if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
            toast('Rest time is finished! Time to do the next set.', 'success');
            setTimeout(() => {
                alert('Rest time is finished! Time to do the next set.');
            }, 60);
        }

        function tickRest() {
            restTimer.remaining -= 1;
            if (restTimer.remaining <= 0) {
                stopRestTimer();
                restTimer.remaining = 0;
                restTimer.finished = true;
                paintRestTimer();
                triggerRestAlert();
            } else {
                paintRestTimer();
            }
        }

        function toggleRestTimer() {
            if (restTimer.running) {
                stopRestTimer();
                paintRestTimer();
                return;
            }
            if (restTimer.finished || restTimer.remaining <= 0) {
                resetRestTimer();
            }
            restTimer.running = true;
            restTimer.handle = setInterval(tickRest, 1000);
            paintRestTimer();
        }

        // REMADE BY TRIO: loadDay with custom dayExercises persistence and fallback to defaults
        function loadDay(type) {
            dayType = type;
            const key = addedKey();
            if (user.state.dayExercises && Array.isArray(user.state.dayExercises[key])) {
                exercises = [...user.state.dayExercises[key]];
            } else {
                const extras = user.state.addedByDay[key] || [];
                exercises = DAY_PLANS[type].exercises.concat(extras.filter((n) => !DAY_PLANS[type].exercises.includes(n)));
            }
            active = 0;
            menuOpen = false;
            $('#dayLabel').textContent = DAY_PLANS[type].label;
            renderAll();
        }

        // REMADE BY TRIO: Restore default workouts button handler (restores default 4 exercises)
        const restoreBtn = $('#restoreDefaultBtn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                const defaults = DAY_PLANS[dayType]?.exercises || [];
                exercises = [...defaults];
                user.state.dayExercises = user.state.dayExercises || {};
                user.state.dayExercises[addedKey()] = [...defaults];
                if (user.state.addedByDay) {
                    delete user.state.addedByDay[addedKey()];
                }
                saveUser(user);
                active = 0;
                renderAll();
                toast(`Restored default 4 exercises for ${DAY_PLANS[dayType].label}.`, 'success');
            });
        }

        // REMADE BY TRIO: renderCards with X remove button on top right of exercise card
        function renderCards() {
            const addCard = `
                <div class="exercise-card add-card">
                    <button type="button" class="add-exercise-btn" id="openAddModalBtn" aria-label="Add exercise" aria-haspopup="dialog">
                        <span class="plus-circle">+</span>
                    </button>
                    <h4>Add more!</h4>
                </div>`;
            cardsRow.innerHTML = exercises.map((name) => `
                <div class="exercise-card" data-exercise="${esc(name)}">
                    <div class="exercise-thumb-placeholder" style="position: relative;">
                        ${exerciseImg(name)}
                        <button type="button" class="remove-exercise-card-btn" data-exercise="${esc(name)}" aria-label="Remove ${esc(name)}" title="Remove exercise">&times;</button>
                    </div>
                    <h4>${esc(name)}</h4>
                    <p>Recommended: 2 sets &times; 8 times</p>
                </div>`).join('') + addCard;
        }

        // REMADE BY TRIO: Check and auto-switch intensity based on reps entered for every intensity
        function checkAutoIntensity(name, inputReps) {
            let target = 'low';
            if (inputReps >= 12) {
                target = 'high';
            } else if (inputReps >= 7) {
                target = 'medium';
            }
            if (target !== intensityByExercise[name]) {
                intensityByExercise[name] = target;
                $$('.intensity-btn', loggingBox).forEach((b) => {
                    const on = b.dataset.intensity === target;
                    b.classList.toggle('active', on);
                    b.setAttribute('aria-checked', String(on));
                });
                const restInput = $('#restTimeInput');
                if (restInput) {
                    restInput.value = INTENSITY[target].rest;
                    resetRestTimer(+restInput.value);
                }
            }
        }

        // REMADE BY TRIO: Logging card with chronological remove-set button and rest-only timer
        function renderLogging() {
            stopRestTimer();
            if (!exercises.length) {
                loggingBox.innerHTML = '<div class="empty-logging-prompt"><p>No exercise selected yet.</p><span>Click <strong>Add more!</strong> above to add an exercise to today&rsquo;s workout.</span></div>';
                return;
            }
            const name = exercises[active];
            const level = (intensityByExercise[name] = intensityByExercise[name] || 'medium');
            const minReq = INTENSITY_MIN_REPS[level] || 7;
            const sets = (setsByExercise[name] = setsByExercise[name] || [{ w: 60, r: minReq }, { w: 60, r: minReq }]);
            customRestSeconds = (INTENSITY[level] || INTENSITY.medium).rest;

            loggingBox.innerHTML = `
                <button type="button" class="exercise-selector${menuOpen ? ' is-open' : ''}" id="exerciseToggleBtn" aria-haspopup="listbox" aria-expanded="${menuOpen}" aria-controls="exerciseMenu">
                    <div class="selector-thumb" aria-hidden="true">${exerciseImg(name)}</div>
                    <span class="selector-name" id="currentExerciseName">${esc(name)}</span>
                    <span class="dropdown-arrow" aria-hidden="true">v</span>
                </button>
                <div class="exercise-menu${menuOpen ? ' open' : ''}" id="exerciseMenu" role="listbox" aria-label="Exercises in today's workout">
                    ${exercises.map((n, i) => `
                        <button type="button" class="exercise-option${i === active ? ' is-current' : ''}" role="option" aria-selected="${i === active}" data-index="${i}">
                            <div class="selector-thumb" aria-hidden="true">${exerciseImg(n)}</div><span>${esc(n)}</span>
                        </button>`).join('')}
                </div>
                <div class="logging-collapsible show-logging" id="loggingDetails">
                    <div class="intensity-row">
                        <span class="intensity-label">Intensity</span>
                        <div class="intensity-group" role="radiogroup" aria-label="Workout intensity">
                            ${Object.entries(INTENSITY).map(([k, v]) => `<button type="button" class="intensity-btn${k === level ? ' active' : ''}" role="radio" aria-checked="${k === level}" data-intensity="${k}">${v.label}</button>`).join('')}
                        </div>
                    </div>
                    <div class="logging-headers">
                        <span>Set</span>
                        <span>Lbs</span>
                        <span>Reps</span>
                        <span class="header-action-spacer" aria-hidden="true"></span>
                    </div>
                    ${sets.map((st, i) => `
                        <div class="logging-row">
                            <div class="set-pill">${i + 1}</div>
                            <!-- REMADE BY TRIO: Weight and Reps inputs with human limit bounds (0-1500 lbs, 1-150 reps) -->
                            <input type="number" class="log-input" data-set="${i}" data-field="w" value="${st.w}" min="0" max="1500" step="any" aria-label="Set ${i + 1} weight in lbs">
                            <input type="number" class="log-input" data-set="${i}" data-field="r" value="${st.r}" min="1" max="150" step="1" aria-label="Set ${i + 1} reps">
                            ${i === sets.length - 1 && sets.length > 1
                                ? `<button type="button" class="remove-set-btn" id="removeLastSetBtn" aria-label="Remove set ${i + 1}" title="Remove set ${i + 1}">&times;</button>`
                                : `<span class="remove-set-placeholder" aria-hidden="true"></span>`
                            }
                        </div>`).join('')}
                    <button type="button" class="add-set-btn" id="addSetBtn">+ Add set</button>
                    <button type="button" class="done-btn" id="doneLoggingBtn">Done</button>
                    
                    <div class="timer-panel" id="timerPanel">
                        <div class="timer-meta">
                            <span>Rest between sets</span>
                            <div class="custom-rest-box">
                                <label for="restTimeInput" class="rest-input-label">Rest (sec):</label>
                                <input type="number" id="restTimeInput" class="rest-time-input" min="5" max="600" step="5" value="${customRestSeconds}" aria-label="Rest time in seconds">
                            </div>
                        </div>
                        <div class="timer-display is-rest" id="timerDisplay" aria-live="polite">
                            <span class="timer-phase" id="timerPhase">Rest Ready</span>
                            <strong class="timer-clock" id="timerClock">${fmtTime(customRestSeconds)}</strong>
                        </div>
                        <div class="timer-actions">
                            <button type="button" class="timer-btn" id="timerStartBtn">Start Rest</button>
                            <button type="button" class="timer-btn timer-btn--ghost" id="timerResetBtn">Reset</button>
                        </div>
                    </div>
                </div>`;
            resetRestTimer(customRestSeconds);
        }

        // Redraw cards and logging
        function renderAll() { renderCards(); renderLogging(); }

        // Open / close the exercise list
        function setMenu(open) {
            menuOpen = open;
            const btn = $('#exerciseToggleBtn'), menu = $('#exerciseMenu');
            if (!btn || !menu) return;
            btn.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
            menu.classList.toggle('open', open);
        }

        // Add button & remove card button listeners
        cardsRow.addEventListener('click', (e) => {
            // REMADE BY TRIO: Handle removal of exercise card on clicking X
            const removeBtn = e.target.closest('.remove-exercise-card-btn');
            if (removeBtn) {
                e.stopPropagation();
                const toRemove = removeBtn.dataset.exercise;
                exercises = exercises.filter((n) => n !== toRemove);
                user.state.dayExercises = user.state.dayExercises || {};
                user.state.dayExercises[addedKey()] = [...exercises];
                if (user.state.addedByDay && user.state.addedByDay[addedKey()]) {
                    user.state.addedByDay[addedKey()] = user.state.addedByDay[addedKey()].filter((n) => n !== toRemove);
                }
                saveUser(user);
                if (active >= exercises.length) {
                    active = Math.max(0, exercises.length - 1);
                }
                renderAll();
                toast(`${toRemove} removed.`, 'info');
                return;
            }
            const addBtn = e.target.closest('#openAddModalBtn');
            if (addBtn) { renderExerciseGrid(); openModal(addModal, addBtn); }
        });

        // Logging card clicks
        loggingBox.addEventListener('click', (e) => {
            const name = exercises[active];
            const option = e.target.closest('.exercise-option');
            const intensityBtn = e.target.closest('.intensity-btn');
            if (option) {
                active = +option.dataset.index;
                menuOpen = false;
                renderLogging();
            } else if (e.target.closest('#exerciseToggleBtn')) {
                setMenu(!menuOpen);
            } else if (intensityBtn) {
                // REMADE BY TRIO: Intensity selection changes reps on screen (Low: 1, Med: 7, High: 12)
                const chosen = intensityBtn.dataset.intensity;
                const targetReps = INTENSITY_MIN_REPS[chosen] || 7;
                intensityByExercise[name] = chosen;
                $$('.intensity-btn', loggingBox).forEach((b) => {
                    const on = b === intensityBtn;
                    b.classList.toggle('active', on);
                    b.setAttribute('aria-checked', String(on));
                });
                // Update all reps inputs on screen to the selected intensity's reps
                const sets = setsByExercise[name] || [];
                sets.forEach((st, i) => {
                    st.r = targetReps;
                    const input = $(`input[data-set="${i}"][data-field="r"]`, loggingBox);
                    if (input) input.value = targetReps;
                });
                const restInput = $('#restTimeInput');
                if (restInput) {
                    restInput.value = INTENSITY[chosen].rest;
                    resetRestTimer(+restInput.value);
                }
            } else if (e.target.closest('.remove-set-btn, #removeLastSetBtn')) {
                // REMADE BY TRIO: Chronological removal of the highest numbered set (minimum 1 set)
                const sets = setsByExercise[name];
                if (sets && sets.length > 1) {
                    const removedNum = sets.length;
                    sets.pop();
                    renderLogging();
                    toast(`Set ${removedNum} removed.`, 'info');
                }
            } else if (e.target.closest('#addSetBtn')) {
                const sets = setsByExercise[name];
                const currentInt = intensityByExercise[name] || 'medium';
                const minReq = INTENSITY_MIN_REPS[currentInt] || 7;
                const last = sets[sets.length - 1] || { w: 60, r: minReq };
                sets.push({ w: last.w, r: last.r });
                renderLogging();
            } else if (e.target.closest('#timerStartBtn')) {
                toggleRestTimer();
            } else if (e.target.closest('#timerResetBtn')) {
                const restInput = $('#restTimeInput');
                const val = restInput ? parseInt(restInput.value, 10) : customRestSeconds;
                resetRestTimer(val);
            } else if (e.target.closest('#doneLoggingBtn')) {
                const sets = setsByExercise[name];
                const currentInt = intensityByExercise[name] || 'medium';

                // REMADE BY TRIO: Decline sets beyond human limits (max 1500 lbs, max 150 reps)
                if (sets.some((st) => st.w === '' || isNaN(+st.w) || st.r === '' || isNaN(+st.r))) {
                    toast('Enter the weight and reps for every set.', 'error');
                    return;
                }
                if (sets.some((st) => +st.w < 0 || +st.w > 1500)) {
                    toast('Weight cannot exceed 1,500 lbs (beyond human limits).', 'error');
                    return;
                }
                if (sets.some((st) => +st.r < 1 || +st.r > 150)) {
                    toast('Reps cannot exceed 150 (beyond human limits).', 'error');
                    return;
                }

                workouts.unshift({
                    name, date: new Date().toISOString(), unit,
                    intensity: currentInt,
                    sets: sets.map((st) => ({ w: +st.w, r: +st.r }))
                });
                saveUser(user);
                const doneBtn = $('#doneLoggingBtn');
                doneBtn.classList.add('is-saved');
                doneBtn.textContent = 'Saved!';
                toast(`${name} logged. Nice work!`, 'success');
                setTimeout(() => { if (doneBtn.isConnected) { doneBtn.classList.remove('is-saved'); doneBtn.textContent = 'Done'; } }, 1500);
            }
        });

        // REMADE BY TRIO: Input events for reps auto-intensity and rest timer typing
        loggingBox.addEventListener('input', (e) => {
            const input = e.target.closest('.log-input');
            if (input) {
                const currentName = exercises[active];
                setsByExercise[currentName][+input.dataset.set][input.dataset.field] = input.value;
                if (input.dataset.field === 'r') {
                    const rVal = parseInt(input.value, 10);
                    if (!isNaN(rVal) && rVal >= 1) {
                        checkAutoIntensity(currentName, rVal);
                    }
                }
                return;
            }
            if (e.target.id === 'restTimeInput') {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                    resetRestTimer(val);
                }
            }
        });
        // Close the exercise list on outside click or Esc
        document.addEventListener('click', (e) => { if (menuOpen && !e.target.closest('#exerciseToggleBtn, #exerciseMenu')) setMenu(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

        // Add-exercise modal
        const searchInput = $('#exerciseSearchInput');
        const categorySelect = $('#exerciseCategory');
        // Exercises shown in the modal
        function renderExerciseGrid() {
            const query = searchInput.value.trim().toLowerCase();
            const category = categorySelect.value;
            const pool = query ? Object.values(LIBRARY).flat() : LIBRARY[category];
            const list = pool.filter((n) => !exercises.includes(n) && n.toLowerCase().includes(query));
            $('#modalSectionTitle').textContent = query ? `Results for "${searchInput.value.trim()}"` : category.charAt(0).toUpperCase() + category.slice(1);
            // Add the chosen exercise
            $('#exerciseGrid').innerHTML = list.map((n) => `
                <button type="button" class="add-exercise-item" data-exercise="${esc(n)}" aria-label="Add ${esc(n)} to today's workout">
                    <div class="add-thumb-box">${exerciseImg(n)}</div>
                    <h5>${esc(n)}</h5>
                </button>`).join('');
            $('#exerciseEmpty').hidden = list.length > 0;
        }
        searchInput.addEventListener('input', renderExerciseGrid);
        categorySelect.addEventListener('change', renderExerciseGrid);
        $('#closeAddModalBtn').addEventListener('click', () => closeModal(addModal));
        $('#exerciseGrid').addEventListener('click', (e) => {
            const item = e.target.closest('.add-exercise-item');
            if (!item) return;
            const name = item.dataset.exercise;
            const key = addedKey();
            user.state.addedByDay[key] = (user.state.addedByDay[key] || []).concat(name);
            exercises.push(name);
            user.state.dayExercises = user.state.dayExercises || {};
            user.state.dayExercises[key] = [...exercises];
            saveUser(user);
            closeModal(addModal);
            renderAll();
            toast(`${name} added to ${DAY_PLANS[dayType].label}.`, 'success');
        });

        // Recommended foods
        function renderRecommendedFoods() {
            const foods = RECOMMENDED_FOODS[profile.objective] || [];
            if (!foods.length) return;
            $('#foodsCard').innerHTML = foods.map((f) => `
                <div class="food-item">
                    <div class="food-img-placeholder" role="img" aria-label="${esc(f.name)}">${f.image ? `<img src="${esc(f.image)}" alt="${esc(f.name)}">` : ''}</div>
                    <div class="food-info">
                        <h4>${esc(f.name)}</h4>
                        <span class="food-servings">${esc(f.serving || '')}</span>
                        <ul class="macros-list">${Object.entries(f.macros || {}).map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join('')}</ul>
                    </div>
                </div>`).join('');
        }

        // REMADE BY TRIO: Weekly schedule modal uses dynamic active schedule
        const scheduleBtn = $('#openScheduleBtn');
        scheduleBtn.addEventListener('click', () => {
            const activeSched = SCHEDULES[user.state.profile.split] || SCHEDULES['ppl-hybrid'];
            $('#scheduleList').innerHTML = WEEK.map((day) => {
                const type = activeSched[day];
                if (!type) return `<div class="schedule-row is-rest"><span class="schedule-day">${day}</span><span>Rest day</span></div>`;
                return `<button type="button" class="schedule-row" data-type="${type}"><span class="schedule-day">${day}</span><span>${DAY_PLANS[type].label.charAt(0).toUpperCase() + DAY_PLANS[type].label.slice(1)}</span></button>`;
            }).join('');
            openModal(scheduleModal, scheduleBtn);
        });
        $('#closeScheduleBtn').addEventListener('click', () => closeModal(scheduleModal));
        $('#scheduleList').addEventListener('click', (e) => {
            const row = e.target.closest('.schedule-row[data-type]');
            if (!row) return;
            loadDay(row.dataset.type);
            closeModal(scheduleModal);
            toast(`Loaded ${DAY_PLANS[row.dataset.type].label}.`, 'success');
        });

        // ADDED BY TRIO: Change Goal popup modal handler
        const goalModal = $('#changeGoalModal');
        const openGoalBtn = $('#openGoalModalBtn');
        const closeGoalBtn = $('#closeGoalModalBtn');
        const changeGoalForm = $('#changeGoalForm');

        if (goalModal && openGoalBtn) {
            openGoalBtn.addEventListener('click', () => {
                const currentGoal = user.state.profile.objective;
                const radio = $(`input[name="change_objective"][value="${currentGoal}"]`, goalModal);
                if (radio) radio.checked = true;
                openModal(goalModal, openGoalBtn);
            });
            if (closeGoalBtn) {
                closeGoalBtn.addEventListener('click', () => closeModal(goalModal));
            }
            if (changeGoalForm) {
                changeGoalForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const selected = $('input[name="change_objective"]:checked', changeGoalForm);
                    if (!selected) return;
                    const newGoal = selected.value;
                    user.state.profile.objective = newGoal;
                    saveUser(user);
                    const goalObj = OBJECTIVES[newGoal] || OBJECTIVES['lose-weight'];
                    $('#userGoalText').textContent = goalObj.text;
                    document.documentElement.style.setProperty('--goal-accent', goalObj.color);
                    renderRecommendedFoods();
                    closeModal(goalModal);
                    toast(`Goal updated to ${goalObj.text}.`, 'success');
                });
            }
        }

        // ADDED BY TRIO: Change Split popup modal handler
        const splitModal = $('#changeSplitModal');
        const openSplitBtn = $('#openSplitModalBtn');
        const closeSplitBtn = $('#closeSplitModalBtn');
        const changeSplitForm = $('#changeSplitForm');

        if (splitModal && openSplitBtn) {
            openSplitBtn.addEventListener('click', () => {
                const currentSplit = user.state.profile.split;
                const radio = $(`input[name="change_split"][value="${currentSplit}"]`, splitModal);
                if (radio) radio.checked = true;
                openModal(splitModal, openSplitBtn);
            });
            if (closeSplitBtn) {
                closeSplitBtn.addEventListener('click', () => closeModal(splitModal));
            }
            if (changeSplitForm) {
                changeSplitForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const selected = $('input[name="change_split"]:checked', changeSplitForm);
                    if (!selected) return;
                    const newSplit = selected.value;
                    user.state.profile.split = newSplit;
                    schedule = SCHEDULES[newSplit] || SCHEDULES['ppl-hybrid'];
                    saveUser(user);
                    const currentTodayName = DOW[new Date().getDay()];
                    const currentStartIdx = WEEK.indexOf(currentTodayName);
                    let newDay = schedule[currentTodayName];
                    for (let i = 1; !newDay && i <= 7; i++) newDay = schedule[WEEK[(currentStartIdx + i) % 7]];
                    loadDay(newDay || 'full');
                    closeModal(splitModal);
                    toast(`Split updated to ${newSplit.replace('-', ' ')}.`, 'success');
                });
            }
        }

        renderRecommendedFoods();
        loadDay(dayType || 'push');
    }

    //   Store  
    if (document.body.dataset.page === 'store' && user) {
        const wallet = user.state.wallet;
        // Store state and tabs
        const tabXp = $('#tabXpBtn'), tabCoins = $('#tabCoinsBtn');
        const xpView = $('#xpCatalogView'), coinsView = $('#coinsCatalogView');

        // XP / Coins tab
        function showTab(which) {
            const xp = which === 'xp';
            tabXp.classList.toggle('active', xp);
            tabCoins.classList.toggle('active', !xp);
            tabXp.setAttribute('aria-selected', String(xp));
            tabCoins.setAttribute('aria-selected', String(!xp));
            xpView.style.display = xp ? 'block' : 'none';
            coinsView.style.display = xp ? 'none' : 'block';
        }
        tabXp.addEventListener('click', () => showTab('xp'));
        tabCoins.addEventListener('click', () => showTab('coins'));

        // Balance, bought items and cosmetics
        function updateStoreUI() {
            $('#userXpVal').textContent = wallet.xp;
            $('#userCoinVal').textContent = wallet.coins;
            // Open the buy dialog
            $$('.buy-btn').forEach((btn) => {
                if (wallet.inventory.includes(btn.dataset.name)) {
                    btn.textContent = 'Claimed';
                    btn.classList.add('is-claimed');
                    btn.disabled = true;
                }
            });
            applyCosmetics();
        }
        updateStoreUI();

        // Buy dialog
        const backdrop = $('#storeModalBackdrop');
        const confirmCard = $('#storeConfirmCard');
        const successCard = $('#storeSuccessCard');
        let pending = null;

        function closeStoreModal() { closeModal(backdrop); pending = null; }

        $$('.buy-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const cost = parseInt(btn.dataset.cost, 10);
                const balance = type === 'coin' ? wallet.coins : wallet.xp;
                if (balance < cost) {
                    toast(`Not enough ${type === 'coin' ? 'Coins' : 'XP'} - you have ${balance}, this costs ${cost}. Claim achievements on your profile to earn more.`, 'error');
                    return;
                }
                pending = { type, cost, name: btn.dataset.name, slot: btn.dataset.slot, cosmetic: btn.dataset.cosmetic };
                $('#modalItemTitle').textContent = pending.name;
                $('#modalItemCost').textContent = `${cost} ${type === 'coin' ? 'Coins' : 'XP'}`;
                $('#modalItemDesc').textContent = btn.dataset.desc || '';
                const thumb = btn.closest('.store-thumb-box').firstElementChild;
                $('#modalThumbContainer').innerHTML = thumb.outerHTML;
                $('#modalSuccessThumbContainer').innerHTML = thumb.outerHTML;
                confirmCard.style.display = 'block';
                successCard.style.display = 'none';
                openModal(backdrop, btn);
            });
        });

        $('#modalCancelBuyBtn').addEventListener('click', closeStoreModal);
        $('#modalExitBtn').addEventListener('click', closeStoreModal);
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) pending = null; });

        // Confirm purchase
        $('#modalConfirmBuyBtn').addEventListener('click', () => {
            if (!pending) return;
            if (pending.type === 'coin') wallet.coins -= pending.cost; else wallet.xp -= pending.cost;
            wallet.inventory.push(pending.name);

            const isCosmetic = Boolean(pending.cosmetic);
            const code = () => Math.random().toString(36).substring(2, 7).toUpperCase();
            const voucherCode = `JGYU-${code().slice(0, 4)}-${code()}`;
            if (isCosmetic) {
                wallet.owned.push({ name: pending.name, slot: pending.slot, cosmetic: pending.cosmetic });
                wallet.equipped[pending.slot] = pending.cosmetic; // equipped right away; change it any time from the profile inventory
            } else {
                wallet.vouchers.push({ name: pending.name, code: voucherCode, date: new Date().toISOString() });
            }
            saveUser(user);
            updateStoreUI();

            $('#modalVoucherCode').textContent = isCosmetic ? 'Equipped to your profile.' : voucherCode;
            confirmCard.style.display = 'none';
            successCard.style.display = 'block';
            $('#modalExitBtn').focus();
        });
    }

    //   Profile  
    if (document.body.dataset.page === 'profile' && user) {
        const { profile, wallet, claimed } = user.state;
        const weights = [profile.weight].concat(user.state.weightLog.map((w) => w.value));
        const schedule = SCHEDULES[profile.split] || SCHEDULES['ppl-hybrid'];

        // Name and stats
        $('#profileUsername').textContent = user.username;
        $('#statWeight').textContent = `${profile.weight || '--'} kg >> ${weights[weights.length - 1] || '--'} kg`;
        const streak = streakStats(user.state.workouts, schedule).current;
        $('#statStreak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
        const xpEl = $('#statXp'), coinEl = $('#statCoins');
        const refreshWallet = () => { xpEl.textContent = wallet.xp; coinEl.textContent = wallet.coins; };
        refreshWallet();

        // Inventory
        const SLOT_LABEL = { border: 'Border', avatar: 'Avatar', banner: 'Banner' };
        const grid = $('#inventoryGrid');
        const moreBtn = $('#inventoryMoreBtn');
        const VISIBLE = 4;
        let expanded = false;

        // Item thumbnail
        function previewFor(item) {
            if (item.kind === 'voucher') return '<span class="voucher-glyph">Code</span>';
            if (item.slot === 'border') return `<div class="cosmetic-preview-circle ${item.cosmetic.replace('border-', 'border-')}-preview"></div>`;
            if (item.slot === 'avatar') return `<div class="avatar-preview-box ${item.cosmetic}"></div>`;
            return '<div class="banner-preview-box"></div>';
        }

        // Inventory list (4 shown, rest under Show more)
        function renderInventory() {
            const items = wallet.owned.map((o) => Object.assign({ kind: 'cosmetic' }, o))
                .concat(wallet.vouchers.map((v) => Object.assign({ kind: 'voucher' }, v)));
            if (!items.length) {
                grid.innerHTML = '<p class="inventory-empty">Nothing here yet. Cosmetics and voucher codes you get in the Store show up here.</p>';
                moreBtn.hidden = true;
                return;
            }
            const shown = expanded ? items : items.slice(0, VISIBLE);
            grid.innerHTML = shown.map((item) => {
                if (item.kind === 'voucher') {
                    return `<button type="button" class="showcase-badge-item inventory-item is-voucher" data-kind="voucher" data-code="${esc(item.code)}" aria-label="Copy voucher code for ${esc(item.name)}">
                        <div class="badge-thumb-box" aria-hidden="true">${previewFor(item)}</div>
                        <div class="badge-info"><h4>${esc(item.name)}</h4><span class="inventory-code">${esc(item.code)}</span><span class="badge-sub">Tap to copy</span></div>
                    </button>`;
                }
                const on = wallet.equipped[item.slot] === item.cosmetic;
                return `<button type="button" class="showcase-badge-item inventory-item${on ? ' is-equipped' : ''}" data-kind="cosmetic" data-slot="${esc(item.slot)}" data-cosmetic="${esc(item.cosmetic)}" aria-pressed="${on}">
                    <div class="badge-thumb-box" aria-hidden="true">${previewFor(item)}</div>
                    <div class="badge-info"><h4>${esc(item.name)}</h4><span class="badge-sub">${SLOT_LABEL[item.slot] || 'Cosmetic'}</span><span class="badge-stat-prog">${on ? 'Equipped' : 'Tap to equip'}</span></div>
                </button>`;
            }).join('');
            moreBtn.hidden = items.length <= VISIBLE;
            moreBtn.textContent = expanded ? 'Show less' : `Show more (${items.length - VISIBLE})`;
            moreBtn.setAttribute('aria-expanded', String(expanded));
        }

        // Equip a cosmetic / copy a voucher code
        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.inventory-item');
            if (!item) return;
            if (item.dataset.kind === 'voucher') {
                const code = item.dataset.code;
                const done = () => toast(`Voucher code ${code} copied.`, 'success');
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => toast(`Your code: ${code}`));
                else toast(`Your code: ${code}`);
                return;
            }
            const { slot, cosmetic } = item.dataset;
            const removing = wallet.equipped[slot] === cosmetic;
            wallet.equipped[slot] = removing ? null : cosmetic;
            saveUser(user);
            applyCosmetics();
            renderInventory();
            toast(removing ? 'Cosmetic removed.' : 'Cosmetic equipped.', 'success');
        });
        // Show more / less
        moreBtn.addEventListener('click', () => { expanded = !expanded; renderInventory(); });
        renderInventory();

        // Log out
        $('#logoutBtn').addEventListener('click', () => {
            localStorage.removeItem(SESSION_KEY);
            window.location.href = 'index.html#landing';
        });
    }

    // ============================================================
    // ADDED BY TRIO: Shared Body Rank Engine & Profile Achievements Mission Verification
    // ============================================================

    // Map every exercise name to one of the 6 dashboard muscle groups
    const EXERCISE_TO_MUSCLE = {
        // Chest
        'Barbell Bench Press': 'chest',
        'Dumbbell Incline Press': 'chest',
        'Dumbbell Fly': 'chest',
        'Smith Machine Incline Press': 'chest',
        'Machine Chest Fly': 'chest',
        'Dips': 'chest',
        // Back
        'Pull-Up': 'back',
        'Lat Pulldown': 'back',
        'Barbell Row': 'back',
        'Seated Cable Row': 'back',
        'Dumbbell Row': 'back',
        'Face Pull': 'back',
        // Triceps (from arms category)
        'Triceps Push-Down': 'triceps',
        'Skull Crusher': 'triceps',
        'Overhead Triceps Extension': 'triceps',
        // Biceps (from arms category)
        'Barbell Curl': 'biceps',
        'Hammer Curl': 'biceps',
        'Preacher Curl': 'biceps',
        // Shoulders
        'Overhead Press': 'shoulder',
        'Dumbbell Lateral Raise': 'shoulder',
        'Arnold Press': 'shoulder',
        'Rear Delt Fly': 'shoulder',
        'Upright Row': 'shoulder',
        'Machine Shoulder Press': 'shoulder',
        // Legs
        'Barbell Squat': 'legs',
        'Romanian Deadlift': 'legs',
        'Leg Press': 'legs',
        'Walking Lunge': 'legs',
        'Leg Curl': 'legs',
        'Standing Calf Raise': 'legs'
    };

    // Rank tiers ordered from highest to lowest
    const RANK_TIERS = [
        { name: 'Pink Diamond', key: 'pink-diamond', minW: 101, maxW: Infinity, minReps: 12 },
        { name: 'Diamond',      key: 'diamond',      minW: 81,  maxW: 100,      minReps: 12 },
        { name: 'Amethyst',     key: 'amethyst',     minW: 66,  maxW: 80,       minReps: 12 },
        { name: 'Ruby',         key: 'ruby',         minW: 51,  maxW: 65,       minReps: 7  },
        { name: 'Sapphire',     key: 'sapphire',     minW: 41,  maxW: 50,       minReps: 7  },
        { name: 'Emerald',      key: 'emerald',      minW: 31,  maxW: 40,       minReps: 7  },
        { name: 'Gold',         key: 'gold',         minW: 21,  maxW: 30,       minReps: 1  },
        { name: 'Iron',         key: 'iron',         minW: 11,  maxW: 20,       minReps: 1  },
        { name: 'Bronze',       key: 'bronze',       minW: 1,   maxW: 10,       minReps: 1  }
    ];

    // CSS variable name for each muscle group (matches --part-* in style.css)
    const MUSCLE_CSS_VAR = {
        chest: '--part-chest',
        back: '--part-back',
        triceps: '--part-triceps',
        biceps: '--part-biceps',
        shoulder: '--part-shoulders',
        legs: '--part-legs'
    };

    // Minimum number of logged workouts per muscle group before a rank is assigned
    const MIN_WORKOUTS_FOR_RANK = 4;

    function calculateBodyRanks(workouts) {
        const muscles = ['chest', 'back', 'triceps', 'biceps', 'shoulder', 'legs'];
        const results = {};

        muscles.forEach((muscle) => {
            const muscleWorkouts = (workouts || []).filter((w) => EXERCISE_TO_MUSCLE[w.name] === muscle);

            if (muscleWorkouts.length < MIN_WORKOUTS_FOR_RANK) {
                results[muscle] = { tier: null, name: 'Unranked', key: 'unranked' };
                return;
            }

            let totalWeight = 0;
            let totalReps = 0;
            let entryCount = muscleWorkouts.length;

            muscleWorkouts.forEach((w) => {
                const sets = w.sets || [];
                if (!sets.length) return;
                const avgW = sets.reduce((sum, s) => sum + (+s.w || 0), 0) / sets.length;
                const avgR = sets.reduce((sum, s) => sum + (+s.r || 0), 0) / sets.length;
                totalWeight += avgW;
                totalReps += avgR;
            });

            const avgWeight = totalWeight / entryCount;
            const avgReps = totalReps / entryCount;

            let matched = null;
            for (const tier of RANK_TIERS) {
                if (avgWeight >= tier.minW && avgReps >= tier.minReps) {
                    matched = tier;
                    break;
                }
            }

            if (matched) {
                results[muscle] = { tier: matched, name: matched.name, key: matched.key };
            } else {
                results[muscle] = { tier: null, name: 'Unranked', key: 'unranked' };
            }
        });

        return results;
    }

    function isAchievementComplete(id) {
        if (!user) return false;
        const workouts = user.state.workouts || [];
        const schedule = SCHEDULES[user.state.profile.split] || SCHEDULES['ppl-hybrid'];
        switch (id) {
            case 0: // First Rep: Log your first workout
                return workouts.length >= 1;

            case 1: // Bench Beginner: Log a Barbell Bench Press
                return workouts.some((w) => w.name && w.name.trim().toLowerCase() === 'barbell bench press');

            case 2: // Three-Peat: Train 3 days in one week
                if (!workouts.length) return false;
                const daysByWeek = {};
                const trainedDays = new Set(workouts.map((w) => dayKey(new Date(w.date))));
                trainedDays.forEach((dk) => {
                    const [y, m, d] = dk.split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    const mon = new Date(dt);
                    mon.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
                    const wkKey = dayKey(mon);
                    daysByWeek[wkKey] = (daysByWeek[wkKey] || 0) + 1;
                });
                return Object.values(daysByWeek).some((cnt) => cnt >= 3);

            case 3: // Weigh-In: Log your first weigh-in
                return Boolean(user.state.weightLog && user.state.weightLog.length >= 1);

            case 4: // Rank Climber: Reach Bronze in any muscle
                if (typeof calculateBodyRanks !== 'function') return false;
                const ranks = calculateBodyRanks(workouts);
                return Object.values(ranks).some((r) => r && r.tier !== null);

            case 5: // Volume Club: Lift 5000KGs in total
                let totalVolume = 0;
                workouts.forEach((w) => {
                    const mult = w.unit === 'kg' ? 2.20462 : 1;
                    (w.sets || []).forEach((s) => {
                        totalVolume += (+s.w || 0) * mult * (+s.r || 0);
                    });
                });
                return totalVolume >= 10000;

            case 6: // Shop Smart: Redeem your first reward
                const w = user.state.wallet || {};
                return (w.inventory && w.inventory.length > 0) ||
                       (w.owned && w.owned.length > 0) ||
                       (w.vouchers && w.vouchers.length > 0);

            case 7: // Iron Streak: Keep a 7-day streak
                const stats = streakStats(workouts, schedule);
                return Boolean(stats.current >= 7 || stats.longest >= 7);

            case 8: // Pink Diamond / LETS GOOO: Always complete (available to claim)
                return true;
            default:
                return false;
        }
    }

    // REMADE BY GI: Initialize achievements with distinct reward values and reward badges
    function initProfileAchievements() {
        if (!user) return;
        const { wallet, claimed } = user.state;
        const xpEl = $('#statXp'), coinEl = $('#statCoins');
        const refreshWallet = () => { if (xpEl && coinEl) { xpEl.textContent = wallet.xp; coinEl.textContent = wallet.coins; } };

        // REMADE BY GI: Distinct reward configurations per achievement
        const ACHIEVEMENT_REWARDS = {
            0: { xp: 100, coins: 50 },      // First Rep: 100 XP, 50 Coins
            1: { xp: 150, coins: 75 },      // Bench Beginner: 150 XP, 75 Coins
            2: { xp: 300, coins: 150 },     // Three-Peat: 300 XP, 150 Coins
            3: { xp: 120, coins: 60 },      // Weigh-In: 120 XP, 60 Coins
            4: { xp: 500, coins: 250 },     // Rank Climber: 500 XP, 250 Coins
            5: { xp: 750, coins: 350 },     // Volume Club: 750 XP, 350 Coins
            6: { xp: 250, coins: 100 },     // Shop Smart: 250 XP, 100 Coins
            7: { xp: 1000, coins: 500 },    // Iron Streak: 1,000 XP, 500 Coins
            8: { xp: 10000, coins: 10000 }  // LETS GOOO: 10,000 XP, 10,000 Coins
        };

        $$('.achievement-card').forEach((card) => {
            const id = +card.dataset.ach;
            const actionRow = $('.achieve-action-row', card);
            if (!actionRow) return;

            const existingBtn = $('.achieve-btn', actionRow);
            const defReward = ACHIEVEMENT_REWARDS[id] || { xp: 100, coins: 50 };
            const xp = parseInt(actionRow.dataset.xp || card.dataset.xp || (existingBtn && existingBtn.dataset.xp) || defReward.xp, 10);
            const coins = parseInt(actionRow.dataset.coins || card.dataset.coins || (existingBtn && existingBtn.dataset.coins) || defReward.coins, 10);

            const rewardBadge = `<span class="achieve-reward-badge" title="${xp} XP and ${coins} Coins">+${xp.toLocaleString()} XP &middot; +${coins.toLocaleString()} C</span>`;

            if (claimed.includes(id)) {
                actionRow.innerHTML = `${rewardBadge}<span class="achieve-claimed-text">Claimed</span>`;
            } else if (isAchievementComplete(id)) {
                actionRow.innerHTML = `${rewardBadge}<button type="button" class="achieve-btn" data-xp="${xp}" data-coins="${coins}">Claim</button>`;
                const btn = $('.achieve-btn', actionRow);
                btn.addEventListener('click', () => {
                    if (claimed.includes(id) || !isAchievementComplete(id)) return;
                    wallet.xp += xp;
                    wallet.coins += coins;
                    claimed.push(id);
                    saveUser(user);
                    refreshWallet();
                    actionRow.innerHTML = `${rewardBadge}<span class="achieve-claimed-text">Claimed</span>`;
                    toast(`+${xp.toLocaleString()} XP and +${coins.toLocaleString()} Coins claimed!`, 'success');
                });
            } else {
                actionRow.innerHTML = `${rewardBadge}<span class="achieve-ongoing-text">Ongoing</span>`;
            }
        });
    }

    // ADDED BY TRIO: Apply Body Ranks on Dashboard
    updateDashboardRanks = function() {
        if (!user) return;
        const ranks = calculateBodyRanks(user.state.workouts);

        // Update each muscle label text and CSS class in the rank list
        Object.entries(ranks).forEach(([muscle, info]) => {
            const el = $(`.tier-name[data-muscle="${muscle}"]`);
            if (!el) return;

            // Remove all previous tier classes
            el.className = 'tier-name';

            // Set the correct tier class and display name
            el.classList.add(`tier-${info.key}`);
            el.textContent = info.name;
        });

        // Update the heatmap body figure colours via CSS custom properties
        Object.entries(ranks).forEach(([muscle, info]) => {
            const cssVar = MUSCLE_CSS_VAR[muscle];
            if (!cssVar) return;

            if (info.tier) {
                // Set the body part colour to the rank's colour variable
                document.documentElement.style.setProperty(cssVar, `var(--rank-${info.key})`);
            } else {
                // Reset to unranked grey
                document.documentElement.style.setProperty(cssVar, 'var(--rank-unranked)');
            }
        });
    };

    if (document.body.dataset.page === 'dashboard' && user) {
        updateDashboardRanks();
    }

    // ADDED BY TRIO: Trigger Profile achievements at the bottom after all constants and functions are initialized
    if (document.body.dataset.page === 'profile' && user) {
        initProfileAchievements();
    }

    // ============================================================
    // ADDED BY GI: Workout Demo Link System & Popup Modal
    // ============================================================
    // Paste your demo video/website link inside the quotes for any exercise.
    // Search for "(WORKOUT NAME) DEMO LINK" (or any workout name) to quickly find it
    const WORKOUT_DEMO_LINKS = {
        // --- Chest Workouts ---
        // BARBELL BENCH PRESS DEMO LINK
        'Barbell Bench Press': 'https://drive.google.com/file/d/1pFdSRE0aouLX8vTZRmUwh_XkgnnhY6LF/view?usp=drive_link',

        // DUMBBELL INCLINE PRESS DEMO LINK
        'Dumbbell Incline Press': 'https://drive.google.com/file/d/1EVnnWMsW2U03lU7IDDJX2x5YUXCk1vS3/view?usp=drive_link',

        // DUMBBELL FLY DEMO LINK
        'Dumbbell Fly': 'https://drive.google.com/file/d/1y1hXVWn0bQcq4zoEWwvR7xGY0RkLk9KH/view?usp=drive_link',

        // SMITH MACHINE INCLINE PRESS DEMO LINK
        'Smith Machine Incline Press': 'https://drive.google.com/file/d/1kzR5BrRbAXPav-ZsWvYo5rqaZugkQwuI/view?usp=drive_link',

        // MACHINE CHEST FLY DEMO LINK
        'Machine Chest Fly': 'https://drive.google.com/file/d/1qM4N_ElV7NNhduWQi-BIThzXyTcSoyQD/view?usp=drive_link',

        // DIPS DEMO LINK
        'Dips': 'https://drive.google.com/file/d/1yGzz9yX4pxrGYoREVostSjfa8xLMQV8H/view?usp=drive_link',

        // --- Back Workouts ---
        // PULL-UP DEMO LINK
        'Pull-Up': 'https://drive.google.com/file/d/17bFPVLyTynzQ44x3MKsgiekZ_XUjEhv5/view?usp=drive_link',

        // LAT PULLDOWN DEMO LINK
        'Lat Pulldown': 'https://drive.google.com/file/d/19rDNBQuDVJD4_eXGjyGWtLhq8hmLlINJ/view?usp=drive_link',

        // BARBELL ROW DEMO LINK
        'Barbell Row': 'https://drive.google.com/file/d/16IZHrTEc_p4Q1ag8d_gmI8BKzDvYci3A/view?usp=drive_link',

        // SEATED CABLE ROW DEMO LINK
        'Seated Cable Row': 'https://drive.google.com/file/d/1T3A9kPjC51fEPA2yPEBDMa-A_rXB3CmQ/view?usp=drive_link',

        // DUMBBELL ROW DEMO LINK
        'Dumbbell Row': 'https://drive.google.com/file/d/1Y_GhNzuyjjD7l9IbBRXVxx3SAT_UDWOF/view?usp=drive_link',

        // FACE PULL DEMO LINK
        'Face Pull': 'https://drive.google.com/file/d/1GgdvISNtyqs9GlCcnSnU9_5JDX8FjaJK/view?usp=drive_link',

        // --- Shoulder Workouts ---
        // OVERHEAD PRESS DEMO LINK
        'Overhead Press': 'https://drive.google.com/file/d/1QNNObLziYS9nwiCAGC-NBFDGv8B6CGQh/view?usp=drive_link',

        // DUMBBELL LATERAL RAISE DEMO LINK
        'Dumbbell Lateral Raise': 'https://drive.google.com/file/d/19Js_myvEDgqHqBUwWiQzmKSx6jAIC3Qe/view?usp=drive_link',

        // ARNOLD PRESS DEMO LINK
        'Arnold Press': 'https://drive.google.com/file/d/1USDtCM8GKVm9pzZoW8Gdce2sG9D5Zx8V/view?usp=drive_link',

        // REAR DELT FLY DEMO LINK
        'Rear Delt Fly': 'https://drive.google.com/file/d/1IOaIAGBBayAxdTrjvPrQFCeu-QGiarLK/view?usp=drive_link',

        // UPRIGHT ROW DEMO LINK
        'Upright Row': 'https://drive.google.com/file/d/1JuWv4an5T2tlo8uS2J1fCeK-gZV4Y_i7/view?usp=drive_link',

        // MACHINE SHOULDER PRESS DEMO LINK
        'Machine Shoulder Press': 'https://drive.google.com/file/d/1iHPZtkw-tNGJg-xA06kwLEVbXZL8caSO/view?usp=drive_link',

        // --- Leg Workouts ---
        // BARBELL SQUAT DEMO LINK
        'Barbell Squat': 'https://drive.google.com/file/d/1HztUWluII0hnxZ_LPBwuF3Amp49ZBNkG/view?usp=drive_link',

        // ROMANIAN DEADLIFT DEMO LINK
        'Romanian Deadlift': 'https://drive.google.com/file/d/1x51MUVU_cOdACGuLOxbWH1GrK0X8GrGE/view?usp=drive_link',

        // LEG PRESS DEMO LINK
        'Leg Press': 'https://drive.google.com/file/d/1fM4HBM8Mg6smQ12tJ6BmRFDY-XyDS7uc/view?usp=drive_link',

        // WALKING LUNGE DEMO LINK
        'Walking Lunge': 'https://drive.google.com/file/d/1ASf6Lp0-Ubun7pK84XzgWy2mQ2bZaYIJ/view?usp=drive_link',

        // LEG CURL DEMO LINK
        'Leg Curl': 'https://drive.google.com/file/d/1WF35lttjsakXxihwRM63VBVQaKIH1H0P/view?usp=drive_link',

        // STANDING CALF RAISE DEMO LINK
        'Standing Calf Raise': 'https://drive.google.com/file/d/19KImPbKtbhdBhoNq8nu04Y3_gryLPoUc/view?usp=drive_link',

        // --- Arm Workouts ---
        // BARBELL CURL DEMO LINK
        'Barbell Curl': 'https://drive.google.com/file/d/1C_7FwIaFSmwUC6HOCTsQZQZzcITyIRyI/view?usp=drive_link',

        // HAMMER CURL DEMO LINK
        'Hammer Curl': 'https://drive.google.com/file/d/1TtQJSKU4apRBQ-poLa3q6mdcBLAwGwkI/view?usp=drive_link',

        // PREACHER CURL DEMO LINK
        'Preacher Curl': 'https://drive.google.com/file/d/12UgsE0VSU8RWiShsqS0WqbQPi8cFiV7r/view?usp=drive_link',

        // SKULL CRUSHER DEMO LINK
        'Skull Crusher': 'https://drive.google.com/file/d/1RP_1HxPoZ7rTq72YSeV7H4YflmnJlGKT/view?usp=drive_link',

        // TRICEPS PUSH-DOWN DEMO LINK
        'Triceps Push-Down': 'https://drive.google.com/file/d/1_5s7pD0wTMX8Fj_5l4XcBgfX0uqLVVJ9/view?usp=drive_link',

        // OVERHEAD TRICEPS EXTENSION DEMO LINK
        'Overhead Triceps Extension': 'https://drive.google.com/file/d/1SDNt2huKOf89h8agvPo0xnV6Gr53RjZj/view?usp=drive_link'
    };

    function initWorkoutDemoModal() {
        const demoModal = $('#workoutDemoModal');
        if (!demoModal) return;

        const demoTitle = $('#workoutDemoTitle');
        const demoThumb = $('#workoutDemoThumb');
        const demoYesBtn = $('#workoutDemoYesBtn');
        const demoNoBtn = $('#workoutDemoNoBtn');
        const closeDemoBtn = $('#closeWorkoutDemoBtn');
        let currentExercise = '';

        function openDemo(name, triggerEl) {
            currentExercise = name;
            if (demoTitle) demoTitle.textContent = `View ${name} Demo?`;
            if (demoThumb) demoThumb.innerHTML = exerciseImg(name);
            openModal(demoModal, triggerEl);
        }

        if (closeDemoBtn) {
            closeDemoBtn.addEventListener('click', () => closeModal(demoModal));
        }
        if (demoNoBtn) {
            demoNoBtn.addEventListener('click', () => closeModal(demoModal));
        }
        if (demoYesBtn) {
            demoYesBtn.addEventListener('click', () => {
                const link = (WORKOUT_DEMO_LINKS[currentExercise] || '').trim();
                closeModal(demoModal);
                if (link && link !== '#') {
                    window.open(link, '_blank', 'noopener,noreferrer');
                } else {
                    toast(`wla p link busseng`, 'info');
                }
            });
        }

        // Delegate click for all workout cards (including any newly added workouts)
        const cardsRow = $('#workoutCardsRow');
        if (cardsRow) {
            cardsRow.addEventListener('click', (e) => {
                // If user clicks the 'X' button to remove the card, do not open demo
                if (e.target.closest('.remove-exercise-card-btn')) return;
                // If user clicks 'Add more!' card, do not open demo
                if (e.target.closest('.add-card')) return;

                const card = e.target.closest('.exercise-card');
                if (card && card.dataset.exercise) {
                    openDemo(card.dataset.exercise, card);
                }
            });
        }
    }

    if (document.body.dataset.page === 'workouts') {
        initWorkoutDemoModal();
    }
})();
