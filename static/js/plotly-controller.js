let how = 'Top 68 Teams By Madness Rating';
let renderToken = 0;
let xStat = 'offensive_rating_adjusted';
let yStat = 'defensive_rating_adjusted';

const howSelect = document.getElementById("howSelect");
const xStatSelect = document.getElementById("xStatSelect");
const yStatSelect = document.getElementById("yStatSelect");
const correlationValue = document.getElementById("plotly-correlation-value");
const regressionToggle = document.getElementById("regressionToggle");
const logoCache = new Map();
const LOGO_WHITE_THRESHOLD = 245;
const LOGO_CACHE_KEY = "mm_logo_cache_v1";
const LOGO_CACHE_DONE_KEY = "mm_logo_cache_complete_v1";
let logoCacheStore = null;
const STAT_OPTIONS = [
    "3_point_attempt_rate",
    "3_point_field_goals",
    "3_point_field_goals_attempted",
    "3_point_percentage",
    "assist_percentage",
    "assists",
    "block_percentage",
    "blocks",
    "defensive_rating_adjusted",
    "defensive_srs",
    "effective_field_goal_percentage",
    "field_goal_percentage",
    "field_goals",
    "field_goals_attempted",
    "free_throw_attempt_rate",
    "free_throw_percentage",
    "free_throws",
    "free_throws_attempted",
    "free_throws_per_field_goal",
    "games",
    "home_losses",
    "home_wins",
    "losses",
    "losses_conf",
    "losses_visitor",
    "madness_rating",
    "margin_of_victory",
    "minutes_played",
    "net_rating_adjusted",
    "offensive_rating",
    "offensive_rating_adjusted",
    "offensive_rebound_percentage",
    "offensive_rebounds",
    "offensive_srs",
    "opp_points_per_game",
    "opponent_points",
    "pace",
    "personal_fouls",
    "pts_per_game",
    "simple_rating_system",
    "steal_percentage",
    "steals",
    "strength_of_schedule",
    "team_points",
    "team_rebound_percentage",
    "team_rebounds",
    "turnover_percentage",
    "turnovers",
    "true_shooting_percentage",
    "win_percentage",
    "wins",
    "wins_conf",
    "wins_visitor"
];
const STAT_LABEL_OVERRIDES = {
    "3_point_attempt_rate": "3-Point Attempt Rate",
    "3_point_field_goals": "3-Point Field Goals",
    "3_point_field_goals_attempted": "3-Point Attempts",
    "3_point_percentage": "3-Point Percentage",
    ap_rank: "AP Rank",
    offensive_srs: "Offensive SRS",
    defensive_srs: "Defensive SRS",
    defensive_rating_adjusted: "Adj Defensive Rating",
    net_rating_adjusted: "Adj Net Rating",
    offensive_rating_adjusted: "Adj Offensive Rating",
    opp_points_per_game: "Opponent Points Per Game",
    pts_per_game: "Points Per Game",
    simple_rating_system: "Simple Rating System",
    strength_of_schedule: "Strength of Schedule",
    win_percentage: "Win Percentage"
};
const LOWER_IS_BETTER = new Set([
    "defensive_rating_adjusted",
    "losses",
    "losses_conf",
    "home_losses",
    "losses_visitor",
    "opponent_points",
    "opp_points_per_game",
    "personal_fouls",
    "turnovers",
    "turnover_percentage"
]);

/** Format stat keys into human-friendly labels. */
function formatStatLabel(statKey) {
    if (STAT_LABEL_OVERRIDES[statKey]) {
        return STAT_LABEL_OVERRIDES[statKey];
    }
    const cleaned = statKey.replace(/_/g, " ").replace(/^3 point /, "3-point ");
    const words = cleaned.split(" ");
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/** Compute Pearson correlation for two numeric arrays. */
function computeCorrelation(xValues, yValues) {
    if (xValues.length === 0 || yValues.length === 0 || xValues.length !== yValues.length) {
        return null;
    }
    const count = xValues.length;
    const meanX = xValues.reduce((sum, val) => sum + val, 0) / count;
    const meanY = yValues.reduce((sum, val) => sum + val, 0) / count;
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < count; i += 1) {
        const dx = xValues[i] - meanX;
        const dy = yValues[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) {
        return null;
    }
    return numerator / Math.sqrt(denomX * denomY);
}

/** Compute a regression line (y = mx + b) for the provided values. */
function computeRegressionLine(xValues, yValues, xMin, xMax) {
    if (xValues.length < 2 || xValues.length !== yValues.length) {
        return null;
    }
    const count = xValues.length;
    const meanX = xValues.reduce((sum, val) => sum + val, 0) / count;
    const meanY = yValues.reduce((sum, val) => sum + val, 0) / count;
    let numerator = 0;
    let denom = 0;

    for (let i = 0; i < count; i += 1) {
        const dx = xValues[i] - meanX;
        numerator += dx * (yValues[i] - meanY);
        denom += dx * dx;
    }

    if (denom === 0) {
        return null;
    }

    const slope = numerator / denom;
    const intercept = meanY - slope * meanX;
    const y0 = slope * xMin + intercept;
    const y1 = slope * xMax + intercept;

    if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
        return null;
    }

    return {
        x0: xMin,
        x1: xMax,
        y0,
        y1
    };
}

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

/** Pre-warm the logo cache using the full team list during idle time. */
function prewarmAllTeamLogos() {
    if (isLogoCacheComplete()) {
        return;
    }

    fetch('/api/get_team_list')
        .then(res => res.json())
        .then(teamList => {
            if (!Array.isArray(teamList) || teamList.length === 0) {
                return;
            }

            let index = 0;
            const runBatch = (deadline) => {
                let processed = 0;
                const hasIdle = deadline && typeof deadline.timeRemaining === "function";

                while (index < teamList.length) {
                    const team = teamList[index];
                    index += 1;
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

                if (index < teamList.length) {
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
                requestIdleCallback(runBatch, { timeout: 800 });
            } else {
                setTimeout(() => runBatch(null), 200);
            }
        })
        .catch(() => {});
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

howSelect.addEventListener("change", e => {
    how = e.target.value;

    renderChart();
});

/** Populate a stat selector with all available options. */
function populateStatSelect(select, selectedValue) {
    select.innerHTML = "";
    const sortedOptions = STAT_OPTIONS
        .map(stat => ({ stat, label: formatStatLabel(stat) }))
        .sort((a, b) => a.label.localeCompare(b.label));

    sortedOptions.forEach(({ stat, label }) => {
        const option = document.createElement("option");
        option.value = stat;
        option.textContent = label;
        select.appendChild(option);
    });
    select.value = selectedValue;
}

xStatSelect.addEventListener("change", e => {
    xStat = e.target.value;
    renderChart();
});

yStatSelect.addEventListener("change", e => {
    yStat = e.target.value;
    renderChart();
});

if (regressionToggle) {
    regressionToggle.addEventListener("change", () => {
        renderChart();
    });
}

/** Fetch data and render the Plotly chart for the current filter. */
async function renderChart() {
    /*
    * Create plotly chart ORtg vs DRtg that is interactive
    *
    */
    const chartDiv = document.getElementById("top68Chart");
    // console.log("chartDiv:", chartDiv);
    // console.log("Plotly exists?:", typeof Plotly);

    if (!chartDiv) {
        console.error("Missing #top68Chart div");
        return;
    }

    const token = ++renderToken;
    let rows;
    let averages;
    try {
        const needsNationalAverages = how !== "All Teams";
        const [rowsResponse, averagesResponse] = await Promise.all([
            fetch(`/api/fetch_plotly?how=${encodeURIComponent(how)}&x=${encodeURIComponent(xStat)}&y=${encodeURIComponent(yStat)}`, { cache: "no-store" }),
            needsNationalAverages
                ? fetch(`/api/get_plotly_averages?x=${encodeURIComponent(xStat)}&y=${encodeURIComponent(yStat)}`, { cache: "no-store" })
                : Promise.resolve(null)
        ]);
        if (!rowsResponse.ok) {
            throw new Error("Plotly data request failed.");
        }
        rows = await rowsResponse.json();
        if (averagesResponse && !averagesResponse.ok) {
            throw new Error("Plotly averages request failed.");
        }
        averages = averagesResponse ? await averagesResponse.json() : null;
        // console.log("rows length:", rows?.length, "sample:", rows?.[0]);
    } catch (e) {
        console.error("Fetch/JSON failed:", e);
        return;
    }
    if (token !== renderToken) {
        return;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        console.error("No rows returned from API:", rows);
        chartDiv.innerHTML = "<p>No data returned.</p>";
        return;
    }

    // Build arrays (and filter out any bad ones, just in case)
    const x = [];
    const y = [];
    const labels = [];
    const logoSources = [];
    const customData = [];
    const net = [];
    const mad = [];

    for (const r of rows) {
        const xVal = Number(r.x_value);
        const yVal = Number(r.y_value);
        const n = Number(r.net_rating_adjusted);
        const m = Number(r.madness_rating);

        if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue;

        x.push(xVal);
        y.push(yVal);
        labels.push(r.team_name);
        net.push(Number.isFinite(n) ? n : null);
        mad.push(Number.isFinite(m) ? m : null);
        logoSources.push(r.logo_base64 ? `data:image/png;base64,${r.logo_base64}` : null);
        customData.push([
            Number.isFinite(n) ? n : null,
            Number.isFinite(m) ? m : null
        ]);
    }

    // console.log("plottable points:", x.length);

    if (x.length === 0) {
        chartDiv.innerHTML = "<p>No valid points to plot.</p>";
        if (correlationValue) {
            correlationValue.textContent = "--";
        }
        return;
    }

    if (correlationValue) {
        const corr = computeCorrelation(x, y);
        correlationValue.textContent = corr === null ? "--" : corr.toFixed(3);
    }

    const xLabel = formatStatLabel(xStat);
    const yLabel = formatStatLabel(yStat);
    const trace = {
        type: "scatter",
        mode: "markers",
        x,
        y,
        text: labels,
        customdata: customData,
        hovertemplate:
            "<b>%{text}</b><br>" +
            `${xLabel}: %{x:.2f}<br>` +
            `${yLabel}: %{y:.2f}<br>` +
            "Adj Net: %{customdata[0]:.2f}<br>" + 
            "Madness Rating: %{customdata[1]:.2f}" + 
            "<extra></extra>",
        marker: { size: 12, color: "rgba(0, 0, 0, 0)" }
    };

    const xMean = x.reduce((a, b) => a + b, 0) / x.length;
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const yMin = Math.min(...y);
    const yMax = Math.max(...y);
    const xRange = Math.max(xMax - xMin, 1);
    const yRange = Math.max(yMax - yMin, 1);
    const logoSizeX = xRange * 0.035;
    const logoSizeY = yRange * 0.035;
    const transparentLogos = await Promise.all(
        logoSources.map((source) => makeTransparentLogo(source))
    );
    if (token !== renderToken) {
        return;
    }

    const logoImages = x.map((xVal, index) => {
        const source = transparentLogos[index];
        if (!source) {
            return null;
        }
        return {
            source,
            xref: "x",
            yref: "y",
            x: xVal,
            y: y[index],
            sizex: logoSizeX,
            sizey: logoSizeY,
            xanchor: "center",
            yanchor: "middle",
            sizing: "contain",
            opacity: 0.95,
            layer: "above"
        };
    }).filter(Boolean);

    const xAxis = { title: xLabel };
    const yAxis = { title: yLabel };
    if (LOWER_IS_BETTER.has(xStat)) {
        xAxis.autorange = "reversed";
    }
    if (LOWER_IS_BETTER.has(yStat)) {
        yAxis.autorange = "reversed";
    }

    const shapes = [
        {
            type: "line",
            xref: "x",
            yref: "paper",
            x0: xMean,
            x1: xMean,
            y0: 0,
            y1: 1,
            line: {color: "red", width: 2, dash: "dot"},
            layer: "below"
        },
        {
            type: "line",
            xref: "paper",
            yref: "y",
            x0: 0,
            x1: 1,
            y0: yMean,
            y1: yMean,
            line: {color: "red", width: 2, dash: "dot"},
            layer: "below"
        }
    ];

    const annotations = [
        {
            x: xMean,
            y: 1.02,
            xref: "x",
            yref: "paper",
            text: `Avg ${xLabel}: ${xMean.toFixed(2)}`,
            showarrow: false,
            font: { color: "red", size: 10 },
            xanchor: "left",
            yanchor: "top"
        },
        {
            x: -0.02,
            y: yMean,
            xref: "paper",
            yref: "y",
            text: `Avg ${yLabel}: ${yMean.toFixed(2)}`,
            showarrow: false,
            font: { color: "red", size: 10 },
            xanchor: "left",
            yanchor: "top"
        }
    ];

    if (how !== "All Teams" && averages && Number.isFinite(averages.x_avg) && Number.isFinite(averages.y_avg)) {
        shapes.push(
            {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: averages.x_avg,
                x1: averages.x_avg,
                y0: 0,
                y1: 1,
                line: {color: "green", width: 2, dash: "dot"},
                layer: "below"
            },
            {
                type: "line",
                xref: "paper",
                yref: "y",
                x0: 0,
                x1: 1,
                y0: averages.y_avg,
                y1: averages.y_avg,
                line: {color: "green", width: 2, dash: "dot"},
                layer: "below"
            }
        );
        annotations.push(
            {
                x: averages.x_avg,
                y: 1.02,
                xref: "x",
                yref: "paper",
                text: `National Avg ${xLabel}: ${averages.x_avg.toFixed(2)}`,
                showarrow: false,
                font: { color: "green", size: 10 },
                xanchor: "left",
                yanchor: "top"
            },
            {
                x: -0.02,
                y: averages.y_avg,
                xref: "paper",
                yref: "y",
                text: `National Avg ${yLabel}: ${averages.y_avg.toFixed(2)}`,
                showarrow: false,
                font: { color: "green", size: 10 },
                xanchor: "left",
                yanchor: "top"
            }
        );
    }

    if (regressionToggle && regressionToggle.checked) {
        const regression = computeRegressionLine(x, y, xMin, xMax);
        if (regression) {
            shapes.push({
                type: "line",
                xref: "x",
                yref: "y",
                x0: regression.x0,
                x1: regression.x1,
                y0: regression.y0,
                y1: regression.y1,
                line: { color: "blue", width: 2 },
                layer: "below"
            });
        }
    }

    let layout = {
        title: `${how}: ${xLabel} vs ${yLabel}`,
        xaxis: xAxis,
        yaxis: yAxis,
        dragmode: "pan",
        shapes,
        annotations
    };

    layout.images = logoImages;
    const plotConfig = { scrollZoom: true, responsive: true };
    if (chartDiv.data) {
        Plotly.react(chartDiv, [trace], layout, plotConfig);
    } else {
        Plotly.newPlot(chartDiv, [trace], layout, plotConfig);
    }
}


/** Initialize the Plotly page on load. */
async function initializePage() {
    populateStatSelect(xStatSelect, xStat);
    populateStatSelect(yStatSelect, yStat);
    renderChart();
    if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => prewarmAllTeamLogos(), { timeout: 800 });
    } else {
        setTimeout(() => prewarmAllTeamLogos(), 400);
    }
}

window.addEventListener('DOMContentLoaded', initializePage);
