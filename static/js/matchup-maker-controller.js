let teams = {}
let team1_prob = 0;
let team2_prob = 0;

function handleTeamChange() {
    const team1 = document.getElementById('team1-select').value;
    const team2 = document.getElementById('team2-select').value;

    if (team1 != ' - Select A Team - ' && team2 != ' - Select A Team - ' && team1 !== team2) {
        compareTeams();
    }
}

function fetchAndAddTeams() {
    const team1Select = document.getElementById('team1-select');
    const team2Select = document.getElementById('team2-select');
    const selectOption1 = new Option(' - Select A Team - ', ' - Select A Team - ');
    const selectOption2 = new Option(' - Select A Team - ', ' - Select A Team - ');
    team1Select.add(selectOption1);
    team2Select.add(selectOption2);

    team1Select.addEventListener("change", handleTeamChange);
    team2Select.addEventListener("change", handleTeamChange);

    fetch('/api/team_names')
        .then(res => res.json())
        .then(teamNames => {
            teams = teamNames;
            teamNames.forEach(name => {
                const opt1 = new Option(name[0], name[0]);
                const opt2 = new Option(name[0], name[0]);
                team1Select.add(opt1);
                team2Select.add(opt2);
            });
        });
}

function compareTeams() {
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
        leftLogo.src = `data:image/png;base64,${team1.logo_base64}`;
    }

    const leftGaugeContainer = document.createElement('div');
    leftGaugeContainer.id = 'left-gauge-container';
    leftGaugeContainer.classList.add('gauge-container');

    const leftGaugeCanvas = document.createElement('canvas');
    leftGaugeCanvas.id = 'gauge-left';
    leftGaugeCanvas.width = 250;
    leftGaugeCanvas.height = 200;

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
        rightLogo.src = `data:image/png;base64,${team2.logo_base64}`;
    }

    const rightGaugeContainer = document.createElement('div');
    rightGaugeContainer.id = 'right-gauge-container';
    rightGaugeContainer.classList.add('gauge-container');

    const rightGaugeCanvas = document.createElement('canvas');
    rightGaugeCanvas.id = 'gauge-right';
    rightGaugeCanvas.width = 250;
    rightGaugeCanvas.height = 200;

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
                    cell1.style.background = '#56d91069';
                    cell2.style.background = '#c91d0669';
                }
                else if (val2 > val1) {
                    cell1.style.background = '#c91d0669';
                    cell2.style.background = '#56d91069';
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

async function getProbs(team1, team2) {
    await fetch(`/api/generateProbs?team1=${encodeURIComponent(team1['team_name'])}&team2=${encodeURIComponent(team2['team_name'])}`)
    .then(res => res.json())
    .then(data => {
        team1_prob = data;
    });

    await fetch(`/api/generateProbs?team1=${encodeURIComponent(team2['team_name'])}&team2=${encodeURIComponent(team1['team_name'])}`)
        .then(res => res.json())
        .then(data => {
            team2_prob = data;
        });
}

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
    leftDescription.innerHTML += ' wins as <br> the HOME team in this matchup.*';
    
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
    rightDescription.innerHTML += ' wins as <br> the HOME team in this matchup.*';
}

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

