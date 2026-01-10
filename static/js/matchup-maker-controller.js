let teams = {}
let teamList = [];
let team1_prob = 0;
let team2_prob = 0;
let first = 0;
const logoCache = new Map();
const LOGO_WHITE_THRESHOLD = 245;
const LOGO_CACHE_KEY = "mm_logo_cache_v1";
const LOGO_CACHE_DONE_KEY = "mm_logo_cache_complete_v1";
let logoCacheStore = null;
let logoPrewarmIndex = 0;
let logoPrewarmScheduled = false;

/** Create a stable hash for cache keys. */
function hashLogoSource(source) {
    let hash = 5381;
    for (let i = 0; i < source.length; i += 1) {
        hash = ((hash << 5) + hash) + source.charCodeAt(i);
        hash &= 0xffffffff;
    }
    return (hash >>> 0).toString(36);
}

/** Load cached logos from sessionStorage into memory. */
function loadLogoCacheFromStorage() {
    if (logoCacheStore !== null) {
        return;
    }
    logoCacheStore = {};
    try {
        const raw = sessionStorage.getItem(LOGO_CACHE_KEY);
        if (!raw) {
            return;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
            logoCacheStore = parsed;
            Object.entries(logoCacheStore).forEach(([key, value]) => {
                if (typeof value === "string") {
                    logoCache.set(key, value);
                }
            });
        }
    } catch (error) {
        logoCacheStore = {};
    }
}

/** Check whether the full logo cache has been built in this session. */
function isLogoCacheComplete() {
    try {
        return sessionStorage.getItem(LOGO_CACHE_DONE_KEY) === "true";
    } catch (error) {
        return false;
    }
}

/** Mark the full logo cache as complete for this session. */
function markLogoCacheComplete() {
    try {
        sessionStorage.setItem(LOGO_CACHE_DONE_KEY, "true");
    } catch (error) {
        return;
    }
}

/** Persist a transparent logo into sessionStorage cache. */
function persistLogoCacheEntry(cacheKey, value) {
    if (!cacheKey || !value) {
        return;
    }
    if (!logoCacheStore) {
        logoCacheStore = {};
    }
    logoCacheStore[cacheKey] = value;
    try {
        sessionStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(logoCacheStore));
    } catch (error) {
        if (error && error.name === "QuotaExceededError") {
            return;
        }
    }
}

/** Remove near-white background pixels connected to the image edge. */
function stripWhiteBackground(imageData, width, height, threshold) {
    const data = imageData.data;
    const visited = new Uint8Array(width * height);
    const queue = [];

    const isWhite = (idx) => {
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        return a > 0 && r >= threshold && g >= threshold && b >= threshold;
    };

    const enqueue = (x, y) => {
        const pos = y * width + x;
        if (visited[pos]) {
            return;
        }
        const idx = pos * 4;
        if (!isWhite(idx)) {
            return;
        }
        visited[pos] = 1;
        queue.push(pos);
    };

    for (let x = 0; x < width; x += 1) {
        enqueue(x, 0);
        enqueue(x, height - 1);
    }

    for (let y = 1; y < height - 1; y += 1) {
        enqueue(0, y);
        enqueue(width - 1, y);
    }

    while (queue.length) {
        const pos = queue.pop();
        const x = pos % width;
        const y = Math.floor(pos / width);

        if (x > 0) enqueue(x - 1, y);
        if (x < width - 1) enqueue(x + 1, y);
        if (y > 0) enqueue(x, y - 1);
        if (y < height - 1) enqueue(x, y + 1);
    }

    for (let i = 0; i < visited.length; i += 1) {
        if (visited[i]) {
            data[i * 4 + 3] = 0;
        }
    }
}

/** Convert a base64 logo to a transparent-background version. */
function makeTransparentLogo(source) {
    if (!source) {
        return Promise.resolve(null);
    }
    loadLogoCacheFromStorage();
    const cacheKey = hashLogoSource(source);
    if (logoCache.has(cacheKey)) {
        return Promise.resolve(logoCache.get(cacheKey));
    }
    if (logoCacheStore && logoCacheStore[cacheKey]) {
        const cached = logoCacheStore[cacheKey];
        logoCache.set(cacheKey, cached);
        return Promise.resolve(cached);
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            stripWhiteBackground(imageData, canvas.width, canvas.height, LOGO_WHITE_THRESHOLD);
            ctx.putImageData(imageData, 0, 0);
            const transparentSource = canvas.toDataURL("image/png");
            logoCache.set(cacheKey, transparentSource);
            persistLogoCacheEntry(cacheKey, transparentSource);
            resolve(transparentSource);
        };
        img.onerror = () => resolve(source);
        img.src = source;
    });
}

/** Apply a transparent logo to an image element and cache the result. */
function setLogoImage(img, base64, name) {
    if (!img || !base64) {
        return;
    }
    const rawSource = `data:image/png;base64,${base64}`;
    img.alt = name ? `${name} logo` : 'Team logo';
    makeTransparentLogo(rawSource).then((transparent) => {
        img.src = transparent || rawSource;
    });
}

/** Pre-warm transparent logo cache during idle time. */
function scheduleLogoPrewarm() {
    if (logoPrewarmScheduled || teamList.length === 0 || isLogoCacheComplete()) {
        return;
    }
    logoPrewarmScheduled = true;

    const runBatch = (deadline) => {
        let processed = 0;
        const hasIdle = deadline && typeof deadline.timeRemaining === "function";

        while (logoPrewarmIndex < teamList.length) {
            const team = teamList[logoPrewarmIndex];
            logoPrewarmIndex += 1;

            if (team.logo_base64) {
                const source = `data:image/png;base64,${team.logo_base64}`;
                makeTransparentLogo(source);
            }

            processed += 1;
            if (hasIdle && deadline.timeRemaining() < 1) {
                break;
            }
            if (!hasIdle && processed >= 6) {
                break;
            }
        }

        if (logoPrewarmIndex < teamList.length) {
            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(runBatch, { timeout: 500 });
            } else {
                setTimeout(() => runBatch(null), 120);
            }
        } else {
            markLogoCacheComplete();
        }
    };

    if (typeof requestIdleCallback === "function") {
        requestIdleCallback(runBatch, { timeout: 500 });
    } else {
        setTimeout(() => runBatch(null), 120);
    }
}

/** Render filtered team options into a custom dropdown list. */
function renderTeamOptions(dropdown, query) {
    const normalizedQuery = query.trim().toLowerCase();
    dropdown.innerHTML = '';

    const matches = teamList.filter(team => team.name.toLowerCase().includes(normalizedQuery));

    if (matches.length === 0) {
        const empty = document.createElement('div');
        empty.classList.add('team-option', 'is-empty');
        empty.textContent = 'No matches';
        dropdown.appendChild(empty);
        return;
    }

    matches.forEach(team => {
        const option = document.createElement('button');
        option.type = 'button';
        option.classList.add('team-option');
        option.dataset.value = team.name;

        const logoWrapper = document.createElement('span');
        logoWrapper.classList.add('team-option-logo');
        if (team.logo_base64) {
            const logo = document.createElement('img');
            logo.loading = 'lazy';
            logoWrapper.appendChild(logo);
            setLogoImage(logo, team.logo_base64, team.name);
        } else {
            logoWrapper.classList.add('is-placeholder');
        }

        const label = document.createElement('span');
        label.textContent = team.name;

        option.appendChild(logoWrapper);
        option.appendChild(label);
        dropdown.appendChild(option);
    });
}

/** Wire up a searchable dropdown input and selection behavior. */
function setupSearchableDropdown(searchInput, dropdown, selectElement) {
    const wrapper = searchInput.closest('.team-search-wrapper');

    const openDropdown = () => {
        renderTeamOptions(dropdown, searchInput.value);
        dropdown.classList.add('is-open');
    };

    const selectTeam = (name) => {
        if (!name) {
            return;
        }
        searchInput.value = name;
        selectElement.value = name;
        dropdown.classList.remove('is-open');
        handleTeamChange();
    };

    searchInput.addEventListener('focus', openDropdown);
    searchInput.addEventListener('input', openDropdown);

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const firstOption = dropdown.querySelector('.team-option:not(.is-empty)');
            if (firstOption) {
                event.preventDefault();
                selectTeam(firstOption.dataset.value);
            }
        }
    });

    dropdown.addEventListener('mousedown', (event) => {
        const option = event.target.closest('.team-option');
        if (!option || option.classList.contains('is-empty')) {
            return;
        }
        selectTeam(option.dataset.value);
    });

    document.addEventListener('click', (event) => {
        if (!wrapper.contains(event.target)) {
            dropdown.classList.remove('is-open');
        }
    });
}

/** Fetch matchup data when both teams are selected. */
async function handleTeamChange() {
    const team1 = document.getElementById('team1-select').value;
    const team2 = document.getElementById('team2-select').value;

    if (team1 != ' - Select A Team - ' && team2 != ' - Select A Team - ' && team1 !== team2) {
        if (first != 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            first = 1;
        }

        compareTeams();
    }
}

/** Populate team selectors and initialize searchable dropdowns. */
function fetchAndAddTeams() {
    const team1Select = document.getElementById('team1-select');
    const team2Select = document.getElementById('team2-select');
    const team1Search = document.getElementById('team1-search');
    const team2Search = document.getElementById('team2-search');
    const team1Dropdown = document.getElementById('team1-dropdown');
    const team2Dropdown = document.getElementById('team2-dropdown');
    const selectOption1 = new Option(' - Select A Team - ', ' - Select A Team - ');
    const selectOption2 = new Option(' - Select A Team - ', ' - Select A Team - ');
    team1Select.add(selectOption1);
    team2Select.add(selectOption2);

    team1Select.addEventListener("change", handleTeamChange);
    team2Select.addEventListener("change", handleTeamChange);

    setupSearchableDropdown(team1Search, team1Dropdown, team1Select);
    setupSearchableDropdown(team2Search, team2Dropdown, team2Select);

    fetch('/api/get_team_list')
        .then(res => res.json())
        .then(teamNames => {
            teams = teamNames;
            teamList = teamNames.map(team => ({
                name: team.team_name,
                logo_base64: team.logo_base64
            }));
            teamList.forEach(team => {
                team1Select.add(new Option(team.name, team.name));
                team2Select.add(new Option(team.name, team.name));
            });
            renderTeamOptions(team1Dropdown, '');
            renderTeamOptions(team2Dropdown, '');
            scheduleLogoPrewarm();
        });
}

/** Request matchup data for the selected teams and render it. */
async function compareTeams() {
    const team1 = document.getElementById('team1-select').value;
    const team2 = document.getElementById('team2-select').value;

    const container = document.getElementById('matchup-result');
    container.innerHTML = '<div id="loading-spinner" class="spinner" style="display: none;"></div>';
    const spinner = document.getElementById('loading-spinner');

    spinner.style.display = 'block';

    if (!team1 || !team2 || team1 === team2) {
        return;
    }

    fetch(`/api/matchup?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`)
        .then(res => res.json())
        .then(data => {
            spinner.style.display = 'none';
            renderMatchup(data.team1, data.team2);
        });
}

/** Build the matchup comparison layout and stats table. */
function renderMatchup(team1, team2) {
    const container = document.getElementById('matchup-result');
    container.innerHTML = '';  // clear previous

    // Create main wrapper for side-by-side layout
    const matchupWrapper = document.createElement('div');
    matchupWrapper.classList.add('matchup-wrapper');


    // === Left logo + Guage ===
    const leftBox = document.createElement('div');
    leftBox.classList.add('team-box');

    const leftLogo = document.createElement('img');
    leftLogo.classList.add('matchup-logo');
    if (team1.logo_base64) {
        setLogoImage(leftLogo, team1.logo_base64, team1.team_name);
    }

    const leftGaugeContainer = document.createElement('div');
    leftGaugeContainer.id = 'left-gauge-container';
    leftGaugeContainer.classList.add('gauge-container');

    const leftGaugeCanvas = document.createElement('canvas');
    leftGaugeCanvas.id = 'gauge-left';
    leftGaugeCanvas.width = 225;
    leftGaugeCanvas.height = 175;

    const leftGaugeText = document.createElement('div');
    leftGaugeText.id = 'left-gauge-text';
    leftGaugeText.classList.add('gauge-text');

    const leftDescription = document.createElement('p');
    leftDescription.id = 'left-description';
    leftDescription.classList.add('gauge-description');

    leftBox.appendChild(leftLogo);

    leftGaugeContainer.appendChild(leftGaugeCanvas);
    leftGaugeContainer.appendChild(leftGaugeText);
    leftBox.appendChild(leftDescription);
    leftBox.appendChild(leftGaugeContainer);

    // === Right logo + Guage ===
    const rightBox = document.createElement('div');
    rightBox.classList.add('team-box');

    const rightLogo = document.createElement('img');
    rightLogo.classList.add('matchup-logo');
    if (team2.logo_base64) {
        setLogoImage(rightLogo, team2.logo_base64, team2.team_name);
    }

    const rightGaugeContainer = document.createElement('div');
    rightGaugeContainer.id = 'right-gauge-container';
    rightGaugeContainer.classList.add('gauge-container');

    const rightGaugeCanvas = document.createElement('canvas');
    rightGaugeCanvas.id = 'gauge-right';
    rightGaugeCanvas.width = 225;
    rightGaugeCanvas.height = 175;

    const rightGaugeText = document.createElement('div');
    rightGaugeText.id = 'right-gauge-text';
    rightGaugeText.classList.add('gauge-text');

    const rightDescription = document.createElement('p');
    rightDescription.id = 'right-description';
    rightDescription.classList.add('gauge-description');

    rightBox.appendChild(rightLogo);

    rightGaugeContainer.appendChild(rightGaugeCanvas);
    rightGaugeContainer.appendChild(rightGaugeText);
    rightBox.appendChild(rightDescription);
    rightBox.appendChild(rightGaugeContainer);

    // Add to container
    container.appendChild(matchupWrapper);

    const keysToCompare = [
        'games',
        'wins',  
        'win_percentage', 
        'madness_rating',
        'strength_of_schedule',
        'offensive_srs',
        'defensive_srs',
        'simple_rating_system',
        'offensive_rating_adjusted',
        'defensive_rating_adjusted',
        'net_rating_adjusted',
        'pace',
        'free_throw_attempt_rate',
        'free_throws_per_field_goal',
        '3_point_attempt_rate',
        'team_rebound_percentage',
        'offensive_rebound_percentage',
        'assist_percentage',
        'steal_percentage',
        'block_percentage',
        'turnover_percentage',
        'effective_field_goal_percentage',
        'true_shooting_percentage'
    ];

    const table = document.createElement('table');
    table.classList.add('matchup-table');

    const headerRow = `<tr><th class="team-rank-column">Rank</th><th class="team-column">${team1.team_name}</th><th></th><th class="team-column">${team2.team_name}</th><th class="team-rank-column">Rank</th></tr>`;
    table.innerHTML = headerRow;

    keysToCompare.forEach(key => {
        const row = document.createElement('tr');
        const val1 = team1[key];
        const val2 = team2[key];

        const cell1 = document.createElement('td');
        const cell2 = document.createElement('td');
        const label = document.createElement('td');

        cell1.textContent = formatStat(val1, key);
        cell2.textContent = formatStat(val2, key);

        switch (key) {
            case 'games':
                label.textContent = 'Games';
                break;
            case 'wins':
                label.textContent = 'Wins';
                break;
            case 'win_percentage':
                label.textContent = 'W-L%';
                break;
            case 'madness_rating':
                label.textContent = 'Madness Rtg.';
                break;
            case 'strength_of_schedule':
                label.textContent = 'SOS';
                break;
            case 'offensive_srs':
                label.textContent = 'O. SRS';
                break;
            case 'defensive_srs':
                label.textContent = 'D. SRS';
                break;
            case 'simple_rating_system':
                label.textContent = 'SRS';
                break;
            case 'offensive_rating_adjusted':
                label.textContent = 'O. Rtg';
                break;
            case 'defensive_rating_adjusted':
                label.textContent = 'D. Rtg';
                break;
            case 'net_rating_adjusted':
                label.textContent = 'N. Rtg';
                break;
            case 'pace':
                label.textContent = 'Pace';
                break;
            case 'free_throw_attempt_rate':
                label.textContent = 'FTr';
                break;
            case 'free_throws_per_field_goal':
                label.textContent = 'FT/FGA';
                break;
            case '3_point_attempt_rate':
                label.textContent = '3PAr';
                break;
            case 'team_rebound_percentage':
                label.textContent = 'TRB%';
                break;
            case 'offensive_rebound_percentage':
                label.textContent = 'ORB%';
                break;
            case 'assist_percentage':
                label.textContent = 'AST%';
                break;
            case 'steal_percentage':
                label.textContent = 'STL%';
                break;
            case 'block_percentage':
                label.textContent = 'BLK%';
                break;
            case 'turnover_percentage':
                label.textContent = 'TOV%';
                break;
            case 'effective_field_goal_percentage':
                label.textContent = 'eFG%';
                break;
            case 'true_shooting_percentage':
                label.textContent = 'TS%';
                break;
        }

        const rank1 = document.createElement('td');
        const rank2 = document.createElement('td');

        // Highlight winner
        if (typeof val1 === 'number' && typeof val2 === 'number') {
            if(key != 'games') {
                if (val1 > val2) {
                    cell1.style.background = 'var(--good)';
                    cell2.style.background = 'var(--bad)';
                }
                else if (val2 > val1) {
                    cell1.style.background = 'var(--bad)';
                    cell2.style.background = 'var(--good)';
                }
            }
        }

        if (key == 'defensive_rating_adjusted' || key == 'turnover_percentage') {
            temp = cell1.style.background;
            cell1.style.background = cell2.style.background;
            cell2.style.background = temp;
        }

        if (team1.stat_ranks?.[key] < team2.stat_ranks?.[key]) {
            rank1.style.fontWeight = 'bold';
        } else if (team2.stat_ranks?.[key] < team1.stat_ranks?.[key]) {
            rank2.style.fontWeight = 'bold';
        }

        if (key != 'games') {
            pound = '#'
            rank1.textContent = pound.concat(team1.stat_ranks?.[key]) || '-';
            rank2.textContent = pound.concat(team2.stat_ranks?.[key]) || '-';

            fire1 = '🔥';
            fire2 = '🔥';
            cold1 = '🧊';
            cold2 = '🧊';
            space1 = "";
            space2 = "";

            if(team1.stat_ranks?.[key] < 10) {
                space1 = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"; 
            } else if (team1.stat_ranks?.[key] < 100) {
                space1 = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
            } else {
                space1 = "\u00A0\u00A0\u00A0\u00A0\u00A0";
            }

            if(team2.stat_ranks?.[key] < 10) {
                space2 = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"; 
            } else if (team2.stat_ranks?.[key] < 100) {
                space2 = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
            } else {
                space2 = "\u00A0\u00A0\u00A0\u00A0\u00A0";
            }

            if ((1 - team1.stat_ranks?.[key] / 364) > .95) {
                rank1.textContent = rank1.textContent + space1 + fire1;
            }
            if ((1 - team2.stat_ranks?.[key] / 364) > .95) {
                rank2.textContent = fire2 + space2 + rank2.textContent;
            }
            if ((team1.stat_ranks?.[key] / 364) > .95) {
                rank1.textContent = rank1.textContent + space1 + cold1;
            }
            if ((team2.stat_ranks?.[key] / 364) > .95) {
                rank2.textContent = cold2 + space2 + rank2.textContent;
            } 
        }

        label.classList.add('matchup-label');
        rank1.style.textAlign = 'left';
        rank2.style.textAlign = 'right';

        row.appendChild(rank1);
        row.appendChild(cell1);
        row.appendChild(label);
        row.appendChild(cell2);
        row.appendChild(rank2);
        row.classList.add('matchup-row');
        table.appendChild(row);
    });

    matchupWrapper.appendChild(leftBox);
    matchupWrapper.appendChild(table);  // your existing table
    matchupWrapper.appendChild(rightBox);

    expl = document.createElement('p');
    expl.textContent = '🔥 = Team is in top 5% in this stat.   🧊 = Team is in bottom 5% in this stat.';
    expl.style.width = '100%';
    expl.style.textAlign = 'center';

    disclaimer = document.createElement('p');
    disclaimer.textContent = '*Probabilities generated by ML model trained on historical data. THESE PROBABILITIES ARE NOT BETTING ADVICE.';
    disclaimer.style.fontSize = '12px';
    disclaimer.style.width = '100%';
    disclaimer.style.textAlign = 'center';

    container.appendChild(matchupWrapper);
    container.appendChild(expl);
    container.appendChild(disclaimer);

    renderGauges(team1, team2);
}

/** Fetch both home-team probabilities for the matchup. */
async function getProbs(team1, team2) {
    await fetch(`/api/generateMatchupProbs?team1=${encodeURIComponent(team1['team_name'])}&team2=${encodeURIComponent(team2['team_name'])}`)
        .then(res => res.json())
        .then(data => {
            team1_prob = data.team1_prob;
            team2_prob = data.team2_prob;
        });
}

/** Render probability gauges and explanatory text. */
async function renderGauges(team1, team2) {
    await getProbs(team1, team2);

    const opts = {
        lines: 1, // The number of lines to draw
        angle: 0, // The length of each line
        lineWidth: 0.1, // The line thickness
        pointer: {
            length: 0.9, // The radius of the inner circle
            strokeWidth: 0.035, // The rotation offset
            color: '#000000' // Fill color
        },
        limitMax: 'false',   // If true, the pointer will not go past the end of the gauge
        colorStart: '#102b40',   // Colors
        colorStop: '#102b40',    // just experiment with them
        strokeColor: '#FFFFFF',   // to see which ones work best for you
        generateGradient: true
    };

    const leftGauge = new Donut(document.getElementById('gauge-left')).setOptions(opts);
    leftGauge.maxValue = 100;
    leftGauge.setMinValue(0);
    leftGauge.animationSpeed = 10;
    leftGauge.set(team1_prob);

    const leftGaugeText = document.getElementById('left-gauge-text');
    leftGaugeText.innerHTML = team1_prob;
    leftGaugeText.innerHTML += '%';

    const leftDescription = document.getElementById('left-description');
    leftDescription.innerHTML = 'Probability that ';
    leftDescription.innerHTML += team1['team_name'];
    leftDescription.innerHTML += ' wins as the HOME team in this matchup.*';
    
    const rightGauge = new Donut(document.getElementById('gauge-right')).setOptions(opts);
    rightGauge.maxValue = 100;
    rightGauge.setMinValue(0);
    rightGauge.animationSpeed = 10;
    rightGauge.set(team2_prob);

    const rightGaugeText = document.getElementById('right-gauge-text');
    rightGaugeText.innerHTML = team2_prob;
    rightGaugeText.innerHTML += '%';

    const rightDescription = document.getElementById('right-description');
    rightDescription.innerHTML = 'Probability that ';
    rightDescription.innerHTML += team2['team_name'];
    rightDescription.innerHTML += ' wins as the HOME team in this matchup.*';
}

/** Format stat values based on the stat key. */
function formatStat(val, key) {
    const three = [
        'win_percentage',
        'free_throw_attempt_rate',
        '3_point_attempt_rate',
        'effective_field_goal_percentage',
        'true_shooting_percentage',
        'free_throws_per_field_goal',
        'madness_rating'
    ];

    const two = [
        'strength_of_schedule', 
        'offensive_srs', 
        'defensive_srs', 
        'simple_rating_system',
        'offensive_rating_adjusted',
        'defensive_rating_adjusted',
        'net_rating_adjusted'
    ];

    const one = [
        'pace',
        'team_rebound_percentage',
        'offensive_rebound_percentage',
        'assist_percentage',
        'steal_percentage',
        'block_percentage',
        'turnover_percentage'
    ];

    if (three.includes(key)) {
        return val.toFixed(3);
    } else if (two.includes(key)) {
        return val.toFixed(2);
    } else if (one.includes(key)) {
        return val.toFixed(1);
    }

    return val;
}

document.addEventListener('DOMContentLoaded', fetchAndAddTeams());

