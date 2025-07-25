let statsData = [];
let ratingsData = [];
let conferences = {};
let sortDirection = {};
let lastColumn = -1;
let currentTable = 'stats';
let conferenceFilter = 'None';

const statsButton = document.getElementById('team-stats-button');
const ratingsButton = document.getElementById('team-ratings-button');
const confDropdown = document.getElementById('conferences-dropdown');

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

async function buildTable(type) {
    currentTable = type;
    const container = document.getElementById('data-list');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('stats-table');
    
    headers = {}; 

    if (type == 'stats') {
        headers = {
            0: 'School',
            1: 'Conf',
            2: 'G',
            3: 'W',
            4: 'L',
            5: 'W-L%',
            6: 'Conf. W',
            7: 'Conf. L',
            8: 'Points',
            9: 'Opp. Points',
            10: 'PPG',
            11: 'Opp. PPG',
            12: 'MOV',
            13: 'Rebs',
            14: 'O. Rebs',
            15: 'Ast',
            16: 'Stl',
            17: 'Blk',
            18: 'TO',
            19: 'PF',
            20: 'MP',
            21: 'FG',
            22: 'FGA',
            23: 'FGP',
            24: '3P',
            25: '3PA',
            26: '3P%',
            27: 'FT',
            28: 'FTA',
            29: 'FT%'
        };
    } else {
        headers = {
            0: 'School',
            1: 'Conf',
            2: 'AP Rank',
            3: 'G',
            4: 'W',
            5: 'L',
            6: 'W-L%',
            7: 'Conf. W',
            8: 'Conf. L',
            9: 'SOS',
            10: 'O. SRS',
            11: 'D. SRS',
            12: 'SRS',
            13: 'O. Rtg',
            14: 'D. Rtg',
            15: 'N. Rtg',
            16: 'Pace',
            17: 'FTr',
            18: 'FT/FGA',
            19: '3PAr',
            20: 'TRB%',
            21: 'ORB%',
            22: 'AST%',
            23: 'STL%',
            24: 'BLK%',
            25: 'TOV%',
            26: 'eFG%',
            27: 'TS%'
        };
    }
    

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    Object.keys(headers).forEach(colIndex => {
        const th = document.createElement('th');
        th.textContent = headers[colIndex];
        th.style.cursor = 'pointer';

        th.addEventListener('click', () => sortByColumn(Number(colIndex), type));
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const scrollWrapper = document.createElement('div');
    scrollWrapper.classList.add('table-scroll-container');
    scrollWrapper.appendChild(table);
    container.appendChild(scrollWrapper);

    buildTableBody(table, type);
}

function buildTableBody(table, type) {
    const oldTbody = table.querySelector('tbody');
    if (oldTbody) table.removeChild(oldTbody);

    const tbody = document.createElement('tbody');
    if (type == 'stats') {
        tableData = statsData;
    } else {
        tableData = ratingsData;
    }

    tableData.forEach(row => {
        const tr = document.createElement('tr');
        let conference = "";
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            td.textContent = formatCell(cell, i, type);
            if (i == 1) {
                conference = td.textContent;
            }
            tr.appendChild(td);
        });
        if ((conference == conferenceFilter && conferenceFilter != 'None') || conferenceFilter == 'None') {
            tbody.appendChild(tr);
        }
    });

    table.appendChild(tbody);
}

function formatCell(cell, index, type) {
    if (index === 1) {
        return conferences[cell] || 'Unknown';
    }

    if (type == 'ratings' && index == 2 && cell == 0) {
        return '';
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

async function init() {
    await fetchStatsData();
    await buildTable('stats');
    await fetchRatingsData();
}

window.addEventListener('DOMContentLoaded', () => {
    init();
});