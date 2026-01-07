let how = 'Top 68 Teams By Madness Rating';

const howSelect = document.getElementById("howSelect");

howSelect.addEventListener("change", e => {
    how = e.target.value;
    console.log("how changed to:", how);

    renderChart();
});

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
    }

    // console.log("plottable points:", x.length);

    if (x.length === 0) {
        chartDiv.innerHTML = "<p>No valid points to plot.</p>";
        return;
    }

    const trace = {
        type: "scatter",
        mode: "markers+text",
        x,
        y,
        text: labels,
        textposition: "middle right",
        textfont: { size: 10 },
        marker: { size: 5 },
        customdata: rows.map(r => [
            Number(r.net_rating_adjusted),
            Number(r.madness_rating)
        ]),
        hovertemplate:
            "<b>%{text}</b><br>" +
            "Adj ORtg: %{x:.2f}<br>" +
            "Adj DRtg: %{y:.2f}<br>" +
            "Adj Net: %{customdata[0]:.2f}<br>" + 
            "Madness Rating: %{customdata[1]:.2f}" + 
            "<extra></extra>",
        marker: { size: 10 }
    };

    const offMean = x.reduce((a, b) => a + b, 0) / x.length;
    const defMean = y.reduce((a, b) => a + b, 0) / y.length;

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

    Plotly.newPlot(chartDiv, [trace], layout, { scrollZoom: true, responsive: true });
}


async function initializePage() {
    renderChart();
}

window.addEventListener('DOMContentLoaded', initializePage);