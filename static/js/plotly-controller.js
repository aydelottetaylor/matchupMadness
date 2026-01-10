let how = 'Top 68 Teams By Madness Rating';

const howSelect = document.getElementById("howSelect");
const logoCache = new Map();
const LOGO_WHITE_THRESHOLD = 245;

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
    if (logoCache.has(source)) {
        return Promise.resolve(logoCache.get(source));
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
            logoCache.set(source, transparentSource);
            resolve(transparentSource);
        };
        img.onerror = () => resolve(source);
        img.src = source;
    });
}

howSelect.addEventListener("change", e => {
    how = e.target.value;
    console.log("how changed to:", how);

    renderChart();
});

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

    let rows;
    let averages;
    try {
        const res = await fetch(`/api/fetch_top_68?how=${encodeURIComponent(how)}`, { cache: "no-store" });
        const avs = await fetch('/api/get_averages_for_net', { cache: "no-store" })
        rows = await res.json();
        averages = await avs.json();
        // console.log("rows length:", rows?.length, "sample:", rows?.[0]);
    } catch (e) {
        console.error("Fetch/JSON failed:", e);
        return;
    }
    console.log(averages);

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
        const off = Number(r.offensive_rating_adjusted);
        const def = Number(r.defensive_rating_adjusted);
        const n = Number(r.net_rating_adjusted);
        const m = Number(r.madness_rating);

        if (!Number.isFinite(off) || !Number.isFinite(def)) continue;

        x.push(off);
        y.push(def);
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
        return;
    }

    const trace = {
        type: "scatter",
        mode: "markers",
        x,
        y,
        text: labels,
        customdata: customData,
        hovertemplate:
            "<b>%{text}</b><br>" +
            "Adj ORtg: %{x:.2f}<br>" +
            "Adj DRtg: %{y:.2f}<br>" +
            "Adj Net: %{customdata[0]:.2f}<br>" + 
            "Madness Rating: %{customdata[1]:.2f}" + 
            "<extra></extra>",
        marker: { size: 12, color: "rgba(0, 0, 0, 0)" }
    };

    const offMean = x.reduce((a, b) => a + b, 0) / x.length;
    const defMean = y.reduce((a, b) => a + b, 0) / y.length;
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

    let layout = {};
    console.log(how);
    if (how != 'All Teams') {
        layout = {
            title: how + ": Offensive vs Defensive Efficiency",
            xaxis: { title: "Offensive Rating Adjusted" },
            yaxis: { title: "Defensive Rating Adjusted", autorange: "reversed" },
            dragmode: "pan",
            shapes: [
                // Vertical offensive average
                {
                    type: "line", xref: "x", yref: "paper", x0: offMean, x1: offMean, y0: 0, y1: 1, line: {color: "red", width: 2, dash: "dot"}
                },
                // Horizontal defensive average
                {
                    type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: defMean, y1: defMean, line: {color: "red", width: 2, dash: "dot"}
                },
                // Vertical national offensive average
                {
                    type: "line", xref: "x", yref: "paper", x0: averages[0].aoff, x1: averages[0].aoff, y0: 0, y1: 1, line: {color: "green", width: 2, dash: "dot"}
                },
                // Horizontal national defensive average
                {
                    type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: averages[0].adef, y1: averages[0].adef, line: {color: "green", width: 2, dash: "dot"}
                },
            ],
            annotations: [
                {
                    x: offMean,
                    y: 1.02,
                    xref: "x",
                    yref: "paper",
                    text: `Avg ORtg: ${offMean.toFixed(2)}`,
                    showarrow: false,
                    font: { color: "red", size: 10 },
                    xanchor: "left",
                    yanchor: "top"
                },
                {
                    x: -0.02,
                    y: defMean,
                    xref: "paper",
                    yref: "y",
                    text: `Avg DRtg: ${defMean.toFixed(2)}`,
                    showarrow: false,
                    font: { color: "red", size: 10 },
                    xanchor: "left",
                    yanchor: "top"
                },
                {
                    x: averages[0].aoff,
                    y: 1.02,
                    xref: "x",
                    yref: "paper",
                    text: `National Avg ORtg: ${averages[0].aoff.toFixed(2)}`,
                    showarrow: false,
                    font: { color: "green", size: 10 },
                    xanchor: "left",
                    yanchor: "top"
                },
                {
                    x: -0.02,
                    y: averages[0].adef,
                    xref: "paper",
                    yref: "y",
                    text: `National Avg DRtg: ${averages[0].adef.toFixed(2)}`,
                    showarrow: false,
                    font: { color: "green", size: 10 },
                    xanchor: "left",
                    yanchor: "top"
                }
            ]
        };
    } else {
        layout = {
            title: how + ": Offensive vs Defensive Efficiency",
            xaxis: { title: "Offensive Rating Adjusted" },
            yaxis: { title: "Defensive Rating Adjusted", autorange: "reversed" },
            dragmode: "pan",
            shapes: [
                // Vertical offensive average
                {
                    type: "line", xref: "x", yref: "paper", x0: offMean, x1: offMean, y0: 0, y1: 1, line: {color: "red", width: 2, dash: "dot"}
                },
                // Horizontal defensive average
                {
                    type: "line", xref: "paper", yref: "y", x0: 0, x1: 1, y0: defMean, y1: defMean, line: {color: "red", width: 2, dash: "dot"}
                }
            ],
            annotations: [
                {
                    x: offMean,
                    y: 1.02,
                    xref: "x",
                    yref: "paper",
                    text: `Avg ORtg: ${offMean.toFixed(2)}`,
                    showarrow: false,
                    font: { color: "red", size: 10 },
                    xanchor: "left",
                    yanchor: "top"
                },
                {
                    x: -0.02,
                    y: defMean,
                    xref: "paper",
                    yref: "y",
                    text: `Avg DRtg: ${defMean.toFixed(2)}`,
                    showarrow: false,
                    font: { color: "red", size: 10 },
                    xanchor: "left",
                    yanchor: "top"
                }
            ]
        };
    }

    layout.images = logoImages;
    Plotly.newPlot(chartDiv, [trace], layout, { scrollZoom: true, responsive: true });
}


/** Initialize the Plotly page on load. */
async function initializePage() {
    renderChart();
}

window.addEventListener('DOMContentLoaded', initializePage);
