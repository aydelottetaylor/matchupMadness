let tableData = [];
let conferences = {};
let sortDirection = {};
let lastColumn = -1;

const statsButton = document.getElementById('team-stats-button');
const ratingsButton = document.getElementById('team-ratings-button');

function fetchStatsData() {
    fetch('/api/team_stats')
        .then(res => res.json())
        .then(data => {
            tableData = [...data.teams];
            conferences = data.conferences;
            buildTable('stats');
        })
        .catch(error => {
            console.error("Error fetching the stats data:", error);
        });
}

function fetchRatingsData() {
    fetch('/api/team_ratings')
        .then(res => res.json())
        .then(data => {
            tableData = data;
            console.log(tableData);
            buildTable('ratings');
        })
        .catch(error => {
            console.error("Error fetching the stats data:", error);
        });
}

function buildTable(type) {
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
            6: 'Points',
            7: 'Opp. Points',
            8: 'PPG',
            9: 'Opp. PPG',
            10: 'MOV',
            11: 'Rebs',
            12: 'O. Rebs',
            13: 'Ast',
            14: 'Stl',
            15: 'Blk',
            16: 'TO',
            17: 'PF',
            18: 'MP',
            19: 'FG',
            20: 'FGA',
            21: 'FGP',
            22: '3P',
            23: '3PA',
            24: '3P%',
            25: 'FT',
            26: 'FTA',
            27: 'FT%'
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
            7: 'SOS',
            8: 'O. SRS',
            9: 'D. SRS',
            10: 'SRS',
            11: 'O. Rtg',
            12: 'D. Rtg',
            13: 'N. Rtg',
            14: 'Pace',
            15: 'FTr',
            16: 'FT/FGA',
            17: '3PAr',
            18: 'TRB%',
            19: 'ORB%',
            20: 'AST%',
            21: 'STL%',
            22: 'BLK%',
            23: 'TOV%',
            24: 'eFG%',
            25: 'TS%'
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

    tableData.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            td.textContent = formatCell(cell, i, type);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
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

    if ((index == 8 || index == 9) && type == 'stats') {
        return cell.toFixed(1);
    } else if (index == 10 && type == 'stats') {
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

window.addEventListener('DOMContentLoaded', fetchStatsData);

statsButton.addEventListener('click', () => {
    statsButton.classList.add('active');
    ratingsButton.classList.remove('active');

    const stats_gloss = document.getElementById('team-stats-glossary');
    const ratings_gloss = document.getElementById('team-ratings-glossary');
    stats_gloss.style.display = "block";
    ratings_gloss.style.display = "none";

    fetchStatsData();

});

ratingsButton.addEventListener('click', () => {
    ratingsButton.classList.add('active');
    statsButton.classList.remove('active');

    const stats_gloss = document.getElementById('team-stats-glossary');
    const ratings_gloss = document.getElementById('team-ratings-glossary');
    stats_gloss.style.display = "none";
    ratings_gloss.style.display = "block";

    fetchRatingsData();

});
