let tableData = {};
let teamNames = {};
let conferences = {};
let sortDirection = {};
let lastColumn = -1;
let currentTable = 'stats';
let conferenceFilter = 'None';
let teamFilter = 'None';

const confDropdown = document.getElementById('conferences-dropdown');
const teamDropdown = document.getElementById('team-dropdown');

function fetchStatsData() {
    sortDirection = {};
    fetch(`/api/get_player_stats?conference=${encodeURIComponent(conferenceFilter)}&team=${encodeURIComponent(teamFilter)}`)
        .then(res => res.json())
        .then(data => {
            tableData = data['player_data'];
            buildTable();
        })
        .catch(error => {
            console.log("Error fetching the player data: ", error);
        });
}

function fetchTeams() {
    fetch('/api/get_team_names')
        .then(res => res.json())
        .then(data => {
            teamNames = data;
            buildTeamDropdown();
        })
        .catch(error => {
            console.log("Error fetching the team names: ", error);
        });
}

function buildTeamDropdown() {
    const teamDropdown = document.getElementById('team-dropdown');

    teamNames.forEach(team => {
        const teamOption = document.createElement('option');
        teamOption.value = team[0];
        teamOption.innerHTML = team[0];
        teamDropdown.appendChild(teamOption);
    })
}

function buildTable() {
    const container = document.getElementById('data-list');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('stats-table');

    headers = {
        0: 'Name',
        1: 'School',
        2: 'Conf.',
        3: 'Position',
        4: 'Class',
        5: 'GP',
        6: 'GS',
        7: 'MPG',
        8: 'FG%',
        9: '3P%',
        10: 'FT%',
        11: 'ORB',
        12: 'DRB',
        13: 'TRB',
        14: 'AST',
        15: 'STL',
        16: 'BLK',
        17: 'TOV',
        18: 'PF',
        19: 'PTS'
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    Object.keys(headers).forEach(colIndex => {
        const th = document.createElement('th');
        th.textContent = headers[colIndex];
        th.style.cursor = 'pointer';

        th.addEventListener('click', () => sortByColumn(Number(colIndex)));
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const scrollWrapper = document.createElement('div');
    scrollWrapper.classList.add('table-scroll-container');
    scrollWrapper.appendChild(table);
    container.appendChild(scrollWrapper);

    buildTableBody(table);
}

function buildTableBody(table) {
    const oldTbody = table.querySelector('tbody');
    if (oldTbody) table.removeChild(oldTbody);

    const tbody = document.createElement('tbody');

    tableData.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            td.textContent = formatCell(cell, i);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
}

function formatCell(cell, index) {
    if (cell == null) {
        return '';
    }

    if (index == 7 || index >= 11) {
        return cell.toFixed(1);
    } else if (index == 12) {
        return cell.toFixed(2);
    } else if (typeof cell === 'number' && (!Number.isInteger(cell) || (index >= 8 && index <= 10))) {
        return cell.toFixed(3);
    }
  
    return cell;
}

function sortByColumn(colIndex) {
    direction = sortDirection[colIndex] === 'asc' ? 'desc' : 'asc';
    sortDirection[colIndex] = direction;

    if (lastColumn != colIndex) {
        direction = 'asc';
    }
  
    tableData.sort((a, b) => {
        let valA = a[colIndex];
        let valB = b[colIndex];

        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? valB - valA : valA - valB;
        } else {
        return direction === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
    });

    lastColumn = colIndex;
    buildTable(); // full rebuild
}

confDropdown.addEventListener('change', () => {
    conferenceFilter = confDropdown.value;
    teamDropdown.value = teamFilter = 'None';
    fetchStatsData();
});

teamDropdown.addEventListener('change', () => {
    teamFilter = teamDropdown.value;
    confDropdown.value = conferenceFilter = 'None';
    fetchStatsData();
})

window.addEventListener('DOMContentLoaded', () => {
    fetchStatsData();
    fetchTeams();
});