let statsData = [];
let ratingsData = [];
let conferences = {};
let sortDirection = {};
let lastColumn = -1;
let currentTable = 'stats';
let conferenceFilter = 'None';
let useHeatmap = false;
let headers = [];

const statsButton = document.getElementById('team-stats-button');
const ratingsButton = document.getElementById('team-ratings-button');
const confDropdown = document.getElementById('conferences-dropdown');
const heatmapToggle = document.getElementById('heatmap-toggle');

const LOWER_BETTER = {
    stats: new Set([4, 7, 9, 11, 18, 19]),
    ratings: new Set([2, 5, 8, 14, 25])
};

/** Fetch base team stats and conference mappings. */
async function fetchStatsData() {
    await fetch(`/api/get_team_stats`)
        .then(res => res.json())
        .then(data => {
            statsData = [...data.teams];
            conferences = data.conferences;
        })
        .catch(error => {
            console.error("Error fetching the stats data:", error);
        });
}

/** Fetch advanced ratings data for teams. */
async function fetchRatingsData() {
    await fetch(`/api/get_team_ratings`)
        .then(res => res.json())
        .then(data => {
            ratingsData = data;
        })
        .catch(error => {
            console.error("Error fetching the stats data:", error);
        });
}

/** Build the stats or ratings table based on the selected type. */
async function buildTable(type) {
    currentTable = type;
    const container = document.getElementById('data-list');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('stats-table');
    table.classList.add(type === 'stats' ? 'stats-view' : 'ratings-view');
    if (useHeatmap) {
        table.classList.add('heatmap-on');
    }

    if (type == 'stats') {
        headers = [
            { label: '#', dataIndex: null },
            { label: 'School', dataIndex: 0 },
            { label: 'Conf', dataIndex: 1 },
            { label: 'G', dataIndex: 2 },
            { label: 'W', dataIndex: 3 },
            { label: 'L', dataIndex: 4 },
            { label: 'W-L%', dataIndex: 5 },
            { label: 'Conf. W', dataIndex: 6 },
            { label: 'Conf. L', dataIndex: 7 },
            { label: 'Points', dataIndex: 8 },
            { label: 'Opp. Points', dataIndex: 9 },
            { label: 'PPG', dataIndex: 10 },
            { label: 'Opp. PPG', dataIndex: 11 },
            { label: 'MOV', dataIndex: 12 },
            { label: 'Rebs', dataIndex: 13 },
            { label: 'O. Rebs', dataIndex: 14 },
            { label: 'Ast', dataIndex: 15 },
            { label: 'Stl', dataIndex: 16 },
            { label: 'Blk', dataIndex: 17 },
            { label: 'TO', dataIndex: 18 },
            { label: 'PF', dataIndex: 19 },
            { label: 'MP', dataIndex: 20 },
            { label: 'FG', dataIndex: 21 },
            { label: 'FGA', dataIndex: 22 },
            { label: 'FGP', dataIndex: 23 },
            { label: '3P', dataIndex: 24 },
            { label: '3PA', dataIndex: 25 },
            { label: '3P%', dataIndex: 26 },
            { label: 'FT', dataIndex: 27 },
            { label: 'FTA', dataIndex: 28 },
            { label: 'FT%', dataIndex: 29 }
        ];
    } else {
        headers = [
            { label: '#', dataIndex: null },
            { label: 'School', dataIndex: 0 },
            { label: 'Conf', dataIndex: 1 },
            { label: 'AP Rank', dataIndex: 2 },
            { label: 'G', dataIndex: 3 },
            { label: 'W', dataIndex: 4 },
            { label: 'L', dataIndex: 5 },
            { label: 'W-L%', dataIndex: 6 },
            { label: 'Conf. W', dataIndex: 7 },
            { label: 'Conf. L', dataIndex: 8 },
            { label: 'SOS', dataIndex: 9 },
            { label: 'O. SRS', dataIndex: 10 },
            { label: 'D. SRS', dataIndex: 11 },
            { label: 'SRS', dataIndex: 12 },
            { label: 'O. Rtg', dataIndex: 13 },
            { label: 'D. Rtg', dataIndex: 14 },
            { label: 'N. Rtg', dataIndex: 15 },
            { label: 'Pace', dataIndex: 16 },
            { label: 'FTr', dataIndex: 17 },
            { label: 'FT/FGA', dataIndex: 18 },
            { label: '3PAr', dataIndex: 19 },
            { label: 'TRB%', dataIndex: 20 },
            { label: 'ORB%', dataIndex: 21 },
            { label: 'AST%', dataIndex: 22 },
            { label: 'STL%', dataIndex: 23 },
            { label: 'BLK%', dataIndex: 24 },
            { label: 'TOV%', dataIndex: 25 },
            { label: 'eFG%', dataIndex: 26 },
            { label: 'TS%', dataIndex: 27 }
        ];
    }
    

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.label;
        if (header.dataIndex !== null) {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => sortByColumn(header.dataIndex, type));
        }
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const scrollWrapper = document.createElement('div');
    scrollWrapper.classList.add('table-scroll-container');
    scrollWrapper.appendChild(table);
    container.appendChild(scrollWrapper);

    const tableData = type == 'stats' ? statsData : ratingsData;
    const columnStats = computeColumnStats(tableData, type);
    buildTableBody(table, type, columnStats);
}

/** Populate the table body and apply conference filtering. */
function buildTableBody(table, type, columnStats) {
    const oldTbody = table.querySelector('tbody');
    if (oldTbody) table.removeChild(oldTbody);

    const tbody = document.createElement('tbody');
    if (type == 'stats') {
        tableData = statsData;
    } else {
        tableData = ratingsData;
    }

    let rowIndex = 0;
    tableData.forEach(row => {
        const conference = conferences[row[1]] || 'Unknown';
        if ((conference == conferenceFilter && conferenceFilter != 'None') || conferenceFilter == 'None') {
            rowIndex += 1;
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                if (header.dataIndex === null) {
                    td.textContent = rowIndex;
                } else {
                    const cell = row[header.dataIndex];
                    td.textContent = formatCell(cell, header.dataIndex, type);
                    applyHeatmapStyle(td, cell, header.dataIndex, type, columnStats);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
    });

    table.appendChild(tbody);
}

/** Format cell values for display based on column/type rules. */
function formatCell(cell, index, type) {
    if (index === 1) {
        return conferences[cell] || 'Unknown';
    }

    if (type == 'ratings' && index == 2 && cell == 0) {
        return '';
    }

    if (type == 'stats' && index == 5 && typeof cell === 'number') {
        return cell.toFixed(3);
    }

    if (type == 'ratings' && index == 6 && typeof cell === 'number') {
        return cell.toFixed(3);
    }

    if ((index == 10 || index == 11) && type == 'stats') {
        return cell.toFixed(1);
    } else if (index == 12 && type == 'stats') {
        return cell.toFixed(2);
    } else if (typeof cell === 'number' && !Number.isInteger(cell)) {
        return cell.toFixed(3);
    }
  
    return cell;
}

/** Compute averages and ranges for numeric columns to support heatmap shading. */
function computeColumnStats(tableData, type) {
    const sums = {};
    const counts = {};
    const mins = {};
    const maxs = {};

    tableData.forEach(row => {
        row.forEach((cell, index) => {
            if (index === 0 || index === 1) {
                return;
            }
            if (type == 'ratings' && index == 2 && cell == 0) {
                return;
            }
            if (typeof cell !== 'number' || !Number.isFinite(cell)) {
                return;
            }
            sums[index] = (sums[index] || 0) + cell;
            counts[index] = (counts[index] || 0) + 1;
            mins[index] = mins[index] === undefined ? cell : Math.min(mins[index], cell);
            maxs[index] = maxs[index] === undefined ? cell : Math.max(maxs[index], cell);
        });
    });

    const averages = {};
    Object.keys(sums).forEach(index => {
        averages[index] = sums[index] / counts[index];
    });
    return { averages, mins, maxs };
}

/** Build a subtle red/green background color for a value vs average. */
function getHeatmapColor(value, average, min, max, invert) {
    if (typeof value !== 'number'
        || typeof average !== 'number'
        || typeof min !== 'number'
        || typeof max !== 'number') {
        return '';
    }
    let adjustedValue = value;
    let adjustedAverage = average;
    let adjustedMin = min;
    let adjustedMax = max;
    if (invert) {
        adjustedValue = -value;
        adjustedAverage = -average;
        adjustedMin = -max;
        adjustedMax = -min;
    }
    const diff = adjustedValue - adjustedAverage;
    const span = diff >= 0
        ? adjustedMax - adjustedAverage
        : adjustedAverage - adjustedMin;
    if (!Number.isFinite(span) || span <= 0) {
        return '';
    }
    const intensity = Math.min(1, Math.abs(diff) / span);
    if (intensity < 0.04) {
        return '';
    }
    const alpha = 0.14 + (0.32 * intensity);
    if (diff > 0) {
        return `rgba(35, 146, 66, ${alpha})`;
    }
    return `rgba(206, 54, 50, ${alpha})`;
}

/** Apply heatmap styling to a table cell if enabled. */
function applyHeatmapStyle(cell, value, index, type, columnStats) {
    if (!useHeatmap) {
        cell.style.backgroundColor = '';
        return;
    }
    if (index === 0 || index === 1) {
        cell.style.backgroundColor = '';
        return;
    }
    if (type == 'ratings' && index == 2) {
        cell.style.backgroundColor = '';
        return;
    }
    const average = columnStats.averages[index];
    const min = columnStats.mins[index];
    const max = columnStats.maxs[index];
    const invert = LOWER_BETTER[type].has(index);
    const color = getHeatmapColor(value, average, min, max, invert);
    cell.style.backgroundColor = color || '';
}

/** Sort the current table by column and re-render. */
function sortByColumn(colIndex, type) {
    direction = sortDirection[colIndex] === 'asc' ? 'desc' : 'asc';
    sortDirection[colIndex] = direction;

    if (lastColumn != colIndex) {
        direction = 'asc';
    }

    if (type == 'stats') {
        tableData = statsData;
    } else {
        tableData = ratingsData;
    }
  
    tableData.sort((a, b) => {
        let valA = colIndex === 1 ? conferences[a[1]] : a[colIndex];
        let valB = colIndex === 1 ? conferences[b[1]] : b[colIndex];
  
        if (colIndex === 2 && type == 'ratings') {
            const isAZero = valA === 0;
            const isBZero = valB === 0;
      
            if (isAZero && !isBZero) return 1;
            if (!isAZero && isBZero) return -1;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
            if (colIndex === 2 && type == 'ratings') {
                return direction === 'asc' ? valA - valB : valB - valA;
            }
            return direction === 'asc' ? valB - valA : valA - valB;
        } else {
        return direction === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
    });

    lastColumn = colIndex;
    buildTable(type); // full rebuild
}

statsButton.addEventListener('click', () => {
    statsButton.classList.add('active');
    ratingsButton.classList.remove('active');

    const stats_gloss = document.getElementById('team-stats-glossary');
    const ratings_gloss = document.getElementById('team-ratings-glossary');
    stats_gloss.style.display = "block";
    ratings_gloss.style.display = "none";
    
    buildTable('stats');
});

ratingsButton.addEventListener('click', () => {
    ratingsButton.classList.add('active');
    statsButton.classList.remove('active');

    const stats_gloss = document.getElementById('team-stats-glossary');
    const ratings_gloss = document.getElementById('team-ratings-glossary');
    stats_gloss.style.display = "none";
    ratings_gloss.style.display = "block";

    buildTable('ratings');
});

confDropdown.addEventListener('change', () => {
    conferenceFilter = confDropdown.value;
    if (currentTable == 'stats') {
        buildTable('stats');
    } else {
        buildTable('ratings');
    }
});

if (heatmapToggle) {
    heatmapToggle.addEventListener('change', () => {
        useHeatmap = heatmapToggle.checked;
        buildTable(currentTable);
    });
}

/** Initialize the team stats page data and default view. */
async function init() {
    await fetchStatsData();
    await buildTable('stats');
    await fetchRatingsData();
}

window.addEventListener('DOMContentLoaded', () => {
    init();
});
