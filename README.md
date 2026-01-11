# Matchup Madness

Matchup Madness is a Flask web app for comparing NCAA basketball teams, exploring ratings, and generating matchup win probabilities from a trained model. It pulls data from a MySQL database, renders multiple tables and charts, and provides a matchup-maker UI with searchable team selection.

## Features
- Home dashboard with AP Top 25, Madness Rankings, and tiered team tables.
- Team stats and advanced ratings tables with conference filters.
- Matchup Maker with searchable team inputs, side-by-side comparison, and win probability gauges.
- Plotly chart view to explore top teams or conferences with team logos.
- Plotly axis selectors to compare any stat vs any stat.
- Plotly regression line toggle (off by default) for quick trend visualization.
- Transparent logo rendering with session-level caching for faster UI loads.
- REST endpoints for data retrieval and model inference.

## Pages
- `/` Home: Top 25, Madness Rankings, and team tiers (contenders, next up, mid-majors).
- `/team_stats_ratings` Team stats and advanced ratings.
- `/plotly` Interactive Plotly scatter chart with filtering.
- `/matchup_maker` Team matchup comparison and win probabilities.

## Tech Stack
- Backend: Flask, MySQL (mysql-connector), pandas, joblib, scikit-learn
- Frontend: HTML templates, vanilla JS, CSS
- Charts: Plotly, gauge.js

## Project Structure
- `app.py` Flask app and API routes.
- `templates/` HTML templates for each page.
- `static/css/` Styling.
- `static/js/` Page controllers and UI logic.
- `static/img/` Image assets (navbar logo, favicon, etc.).
- `model_1_0.pkl` Trained model used for matchup probabilities.
- `render.yaml` Deployment config (Render).

## Local Setup
### Prerequisites
- Python 3.10+ recommended
- MySQL database with the expected tables (see below)

### Install
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Database Configuration
The app loads database credentials from `config.py` via `db_config` and connects with:
```python
mysql.connector.connect(**db_config)
```
Provide your own `db_config` values (host, user, password, database, port, etc.) as needed for your MySQL instance.

### Database Tables Referenced
The app expects at least the following tables and columns:
- `team` (team_name, team_id, games, wins, losses, win_percentage, wins_conf, losses_conf,
  team_points, opponent_points, pts_per_game, opp_points_per_game, margin_of_victory,
  team_rebounds, offensive_rebounds, assists, steals, blocks, turnovers, personal_fouls,
  minutes_played, field_goals, field_goals_attempted, field_goal_percentage, 3_point_field_goals,
  3_point_field_goals_attempted, 3_point_percentage, free_throws, free_throws_attempted,
  free_throw_percentage, ap_rank, madness_rating, net_rating_adjusted, offensive_rating_adjusted,
  defensive_rating_adjusted, strength_of_schedule, simple_rating_system, offensive_srs,
  defensive_srs, pace, free_throw_attempt_rate, free_throws_per_field_goal, 3_point_attempt_rate,
  team_rebound_percentage, offensive_rebound_percentage, assist_percentage, steal_percentage,
  block_percentage, turnover_percentage, effective_field_goal_percentage, true_shooting_percentage,
  conference_id)
- `conference` (conference_id, conference_abbreviation)
- `player` (player_name, team_id, position, class, games_played, games_started, minutes_per_game,
  fg_percentage_per_game, 3p_percentage_per_game, ft_percentage_per_game, orb_per_game,
  drb_per_game, trb_per_game, ast_per_game, stl_per_game, blk_per_game, tov_per_game,
  pf_per_game, pts_per_game)
- `logos` (team_id, logo_binary)

### Model File
Ensure `model_1_0.pkl` is present at the repo root. It is loaded once at startup and used for matchup probability predictions.

## Run Locally
```bash
python app.py
```
Then open `http://localhost:10000`.

## API Reference (GET)
All endpoints return JSON. Parameters are provided as query strings.

- `/api/top_25_data`
  Returns AP Top 25 teams with rank, name, W-L, and conference.
- `/api/generateMadnessRtg`
  Returns all teams sorted by Madness Rating with rank, team name, rating, net rating, and conference.
- `/api/get_team_stats`
  Returns raw team stat rows plus a conference id to abbreviation map.
  Response shape: `{ "teams": [...], "conferences": { "<id>": "<abbr>" } }`
- `/api/get_team_ratings`
  Returns advanced team ratings and efficiency metrics for all teams.
- `/api/get_team_names`
  Returns an array of team names, sorted alphabetically.
- `/api/get_team_list`
  Returns team names with optional `logo_base64` for UI lists.
- `/api/get_player_stats`
  Returns player rows with team and conference context.
  Response shape: `{ "player_data": [...] }`
- `/api/get_contenders`
  Returns the "Championship Contenders" list (teams meeting offensive, defensive, and SOS criteria).
- `/api/get_next_up`
  Returns the "Next Up" tier using similar criteria with broader thresholds.
- `/api/get_best_mid_majors`
  Returns top mid-major teams (excludes power conferences).
- `/api/get_averages_for_net`
  Returns average offensive and defensive ratings used for net comparisons.
- `/api/fetch_top_68?how=<mode-or-conference>`
  Returns top-68 teams for Plotly (includes `logo_base64` for logo rendering).
  Accepted `how` values:
  - `Top 68 Teams By Madness Rating`
  - `Top 68 Teams By Net Rating`
  - `All Teams`
  - Any conference abbreviation (e.g. `ACC`, `SEC`, `Big 12`, etc.)
- `/api/fetch_plotly?how=<mode-or-conference>&x=<stat>&y=<stat>`
  Returns plotly-ready rows for the selected x/y stats (includes `x_value`, `y_value`, and `logo_base64`).
  Allowed stats are limited to columns in the `team` table (see `PLOTLY_STATS` in `app.py`).
- `/api/get_plotly_averages?x=<stat>&y=<stat>`
  Returns national averages for the selected x/y stats.
- `/api/matchup?team1=<name>&team2=<name>`
  Returns both teams with full stat rows, base64 logos, and stat rank dictionaries.
  Response shape: `{ "team1": {...}, "team2": {...} }`
- `/api/generateMatchupProbs?team1=<name>&team2=<name>`
  Returns both home-team probabilities in one call (faster for the UI).
  Response shape: `{ "team1_prob": <number>, "team2_prob": <number> }`
- `/api/generateProbs?team1=<name>&team2=<name>`
  Legacy single-probability endpoint (home-team win probability only).

## Deployment
`render.yaml` provides a Render configuration. If you deploy with gunicorn, make sure the start command points at the module that exposes `app`.

## Notes
- Data attribution is shown in the footer (Sports Reference).
- The matchup UI expects the two probability calls to be available and the logos stored in the `logos` table.
- Transparent logos are cached in `sessionStorage` during idle time to improve repeat visits.
- Plotly axis selectors are populated from the `team` table stats and sorted alphabetically by label.
