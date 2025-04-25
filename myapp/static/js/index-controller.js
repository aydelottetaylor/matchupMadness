let top25Data = {};

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

async function initializePage() {
    await fetchTop25Data();

    console.log(top25Data);

}


window.addEventListener('DOMContentLoaded', initializePage);