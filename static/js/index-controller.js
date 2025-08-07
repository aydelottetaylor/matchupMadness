let top25Data = {};
let madnessRatings = {};
let contenders = {};
let nextUp = {};
let midMajors = {};
let sortDirection = {};
let lastColumn = -1;

async function fetchTop25Data() {
    await fetch('/api/top_25_data')
        .then(res => res.json())
        .then(data => {
            top25Data = data;
        })
        .catch(error => {
            console.error("An error occurred while fetching top 25 data: ", error);
        });
}

async function fetchMadnessRatings() {
    await fetch('/api/generateMadnessRtg')
        .then(res => res.json())
        .then(data => {
            madnessRatings = data;
        })
        .catch(error => {
            console.error("An error occurred while fetching madness data: ", error);
        });
}

async function fetchContendersNextAndMid() {
    await fetch('/api/get_contenders')
        .then(res => res.json())
        .then(data => {
            contenders = data;
        })
        .catch(error => {
            console.error("An error occurred while fetching contenders: ", error);
        });

    await fetch('/api/get_next_up')
        .then(res => res.json())
        .then(data => {
            nextUp = data;
        })
        .catch(error => {
            console.error("An error occurred while fetching next up: ", error);
        });

    await fetch('/api/get_best_mid_majors')
        .then(res => res.json())
        .then(data => {
            midMajors = data;
        })
        .catch(error => {
            console.error("An error occurred while fetching mid majors: ", error);
        });
}

function createMadnessTable() {
    const container = document.getElementById('madness-rating');
    container.innerHTML = '';
    container.style.width = 'auto';

    const header = document.createElement('h1');
    header.classList.add('table-header');
    header.innerHTML = 'Madness Rankings';
    header.style.marginBottom = '0.5rem';
    header.style.width = '100%';
    container.appendChild(header);

    const table = document.createElement('table');
    table.style.marginTop = '0px';
    table.classList.add('stats-table');
    table.style.width = "100%";

    headers = [
        'Rk.',
        'Team',
        'Madness Rtg.',
        'Conf.'
    ];

    
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

    const tbody = document.createElement('tbody');

    madnessRatings.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    const scrollWrapper = document.createElement('div');
    scrollWrapper.classList.add('index-table-scroll-container');
    scrollWrapper.style.width = "100%";
    scrollWrapper.appendChild(table);
    container.appendChild(scrollWrapper);
}

function sortByColumn(colIndex) {
    direction = sortDirection[colIndex] === 'asc' ? 'desc' : 'asc';
    sortDirection[colIndex] = direction;

    if (lastColumn != colIndex) {
        direction = 'asc';
    }

    madnessRatings.sort((a, b) => {
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
    createMadnessTable();
}

function createTeamSection() {
    let headers = [
        'Team',
        'Conf.',
        'W',
        'L',
        'AP Rank',
        'Madness Rtg.',
        'Net Rtg,',
        'O Rtg.',
        'D Rtg.',
        'SOS',
        'SRS'
    ];

    const container = document.getElementById('teams');
    container.style.width = 'auto';

    // Add contender header and table
    const header1 = document.createElement('h1');
    header1.classList.add('table-header');
    header1.innerHTML = 'Championship Contenders';
    header1.style.textAlign = 'left';
    header1.style.marginRight = '2rem';
    header1.style.marginBottom = '0.3rem';
    container.appendChild(header1);

    const contenderTable = document.createElement('table');
    contenderTable.style.marginTop = '0px';
    contenderTable.classList.add('stats-table');
    contenderTable.style.width = "100%";

    const contenderHead = document.createElement('thead');
    const contenderHeaderRow = document.createElement('tr');

    Object.keys(headers).forEach(colIndex => {
        const th = document.createElement('th');
        th.textContent = headers[colIndex];
        th.style.cursor = 'pointer';

        contenderHeaderRow.appendChild(th);
    });

    contenderHead.appendChild(contenderHeaderRow);
    contenderTable.appendChild(contenderHead);

    const contenderBody = document.createElement('tbody');

    contenders.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            if (cell != '0') {
                td.textContent = cell;
            } else {
                td.textContent = '';
            }
            tr.appendChild(td);
        });
        contenderBody.appendChild(tr);
    });

    contenderTable.appendChild(contenderBody);
    container.appendChild(contenderTable);

    // Add next up header and table
    const header2 = document.createElement('h1');
    header2.classList.add('table-header');
    header2.innerHTML = 'Next Up';
    header2.style.textAlign = 'left';
    header2.style.marginBottom = '0.3rem';
    container.appendChild(header2);

    const nextTable = document.createElement('table');
    nextTable.style.marginTop = '0px';
    nextTable.classList.add('stats-table');
    nextTable.style.width = "100%";

    const nextHead = document.createElement('thead');
    const nextHeaderRow = document.createElement('tr');

    Object.keys(headers).forEach(colIndex => {
        const th = document.createElement('th');
        th.textContent = headers[colIndex];
        th.style.cursor = 'pointer';

        nextHeaderRow.appendChild(th);
    });

    nextHead.appendChild(nextHeaderRow);
    nextTable.appendChild(nextHead);

    const nextBody = document.createElement('tbody');

    nextUp.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            if (cell != '0') {
                td.textContent = cell;
            } else {
                td.textContent = '';
            }
            tr.appendChild(td);
        });
        nextBody.appendChild(tr);
    });

    nextTable.appendChild(nextBody);
    container.appendChild(nextTable);

    // Add mid major header and table
    const header3 = document.createElement('h1');
    header3.classList.add('table-header');
    header3.innerHTML = 'Best Mid-Majors';
    header3.style.textAlign = 'left';
    header3.style.marginBottom = '0.3rem';
    container.appendChild(header3);

    const midTable = document.createElement('table');
    midTable.style.marginTop = '0px';
    midTable.classList.add('stats-table');
    midTable.style.width = "100%";

    const midHead = document.createElement('thead');
    const midHeaderRow = document.createElement('tr');

    Object.keys(headers).forEach(colIndex => {
        const th = document.createElement('th');
        th.textContent = headers[colIndex];
        th.style.cursor = 'pointer';

        midHeaderRow.appendChild(th);
    });

    midHead.appendChild(midHeaderRow);
    midTable.appendChild(midHead);

    const midBody = document.createElement('tbody');

    midMajors.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            if (cell != '0') {
                td.textContent = cell;
            } else {
                td.textContent = '';
            }
            tr.appendChild(td);
        });
        midBody.appendChild(tr);
    });

    midTable.appendChild(midBody);
    container.appendChild(midTable);
}

function createTop25Table() {
    const container = document.getElementById('top-25-data');
    container.style.width = 'auto';

    const header = document.createElement('h1');
    header.classList.add('table-header');
    header.innerHTML = 'AP Top 25';
    header.style.marginBottom = '0.5rem';
    header.style.width = '100%';
    container.appendChild(header);

    const table = document.createElement('table');
    table.style.marginTop = '0px';
    table.classList.add('stats-table');
    table.style.width = "100%";

    headers = [
        'Rk.',
        'Team',
        'W-L'
    ];

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    Object.keys(headers).forEach(colIndex => {
        const th = document.createElement('th');
        th.textContent = headers[colIndex];
        th.style.cursor = 'pointer';

        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    top25Data.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

async function initializePage() {
    await fetchTop25Data();
    createTop25Table();

    await fetchMadnessRatings();
    createMadnessTable();

    await fetchContendersNextAndMid();
    createTeamSection();
}


window.addEventListener('DOMContentLoaded', initializePage);