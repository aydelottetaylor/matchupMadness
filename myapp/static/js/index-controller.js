let top25Data = {};
let madnessRatings = {};
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

function createMadnessTable() {
    const container = document.getElementById('madness-rating');
    container.innerHTML = '';
    container.style.width = '32%';

    const header = document.createElement('h1');
    header.classList.add('table-header');
    header.innerHTML = 'Madness Rankings';
    header.style.marginBottom = '0.5rem';
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
    container.appendChild(table);
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

function createTop25Table() {
    const container = document.getElementById('top-25-data');
    container.style.width = '25%';

    const header = document.createElement('h1');
    header.classList.add('table-header');
    header.innerHTML = 'AP Top 25';
    header.style.marginBottom = '0.5rem';
    container.appendChild(header);

    const table = document.createElement('table');
    table.style.marginTop = '0px';
    table.classList.add('stats-table');
    table.style.width = "100%";

    headers = [
        'Rk.',
        'Team',
        "W-L"
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
    await fetchMadnessRatings();
    console.log(madnessRatings);

    createTop25Table();
    createMadnessTable();


}


window.addEventListener('DOMContentLoaded', initializePage);