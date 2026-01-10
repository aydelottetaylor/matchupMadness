import mysql.connector
import logging
import os
import base64
import joblib
import pandas as pd

from flask_cors import CORS
from config import db_config
from flask import Flask, jsonify, render_template, request, send_from_directory, Response

log_path = os.path.join(os.path.dirname(__file__), 'backend/backend_log.txt')
model_path = os.path.join(os.path.dirname(__file__), 'model_1_0.pkl')
MODEL = joblib.load(model_path)

logging.basicConfig(
    filename=log_path,
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)


app = Flask(
    __name__,
    static_folder='static',
    template_folder='templates'
)
CORS(app)


def build_matchup_features(team_home, team_away):
    """Build the model input feature dict for a home vs away matchup."""
    return {
        'sos_diff': team_home['strength_of_schedule'] - team_away['strength_of_schedule'],
        'net_diff': team_home['net_rating_adjusted'] - team_away['net_rating_adjusted'],
        'srs_diff': team_home['simple_rating_system'] - team_away['simple_rating_system'],
        'mov_diff': team_home['margin_of_victory'] - team_away['margin_of_victory'],
        'pts_per_game': team_home['pts_per_game'],
        'opp_points_per_game_Team1': team_away['opp_points_per_game'],
        'pts_per_game_Team1': team_away['pts_per_game'],
        'opp_points_per_game': team_home['opp_points_per_game'],
        'assist_percentage': team_home['assist_percentage'],
        'team_rebound_percentage': team_home['team_rebound_percentage'],
        'rebs_diff': (team_home['team_rebounds'] / team_home['games']) - (team_away['team_rebounds'] / team_away['games']),
        'turnover_percentage': team_home['turnover_percentage'],
        'steal_percentage_Team1': team_away['steal_percentage'],
        'block_percentage_Team1': team_away['block_percentage'],
        'field_goal_percentage': team_home['field_goal_percentage'],
        '3_point_percentage': team_home['3_point_percentage'],
        'free_throw_percentage': team_home['free_throw_percentage'],
        'pace_diff': team_home['pace'] - team_away['pace'],
        'offensive_rating': team_home['offensive_rating'],
        'offensive_srs': team_home['offensive_srs'],
        'defensive_srs_Team1': team_away['defensive_srs'],
        'offensive_rating_adjusted': team_home['offensive_rating_adjusted'],
        'defensive_rating_adjusted_Team1': team_away['defensive_rating_adjusted'],
        'true_shooting_percentage': team_home['true_shooting_percentage'],
        'offensive_rebound_percentage': team_home['offensive_rebound_percentage'],
        'madness_diff': team_home['madness_rating'] - team_away['madness_rating'],
        'off_srs_diff': team_home['offensive_srs'] - team_away['offensive_srs'],
        'def_srs_diff': team_home['defensive_srs'] - team_away['defensive_srs'],
        'ts_diff': team_home['true_shooting_percentage'] - team_away['true_shooting_percentage'],
        'off_rating_diff': team_home['offensive_rating_adjusted'] - team_away['offensive_rating_adjusted'],
        'def_rating_diff': team_home['defensive_rating_adjusted'] - team_away['defensive_rating_adjusted'],
        'ft_rate_diff': team_home['free_throw_attempt_rate'] - team_away['free_throw_attempt_rate'],
        '3pa_rate_diff': team_home['3_point_attempt_rate'] - team_away['3_point_attempt_rate']
    }


@app.route('/')
def index():
    """Render the home dashboard."""
    return render_template('index.html', current_page='home')


@app.route('/favicon.ico')
def favicon():
    """Serve the favicon for the site."""
    return send_from_directory('static', 'img/favicon.ico')


@app.route('/team_stats_ratings')
def team_stats_ratings():
    """Render the team stats and ratings page."""
    return render_template('team_stats_ratings.html', current_page='team_stats_ratings')


@app.route('/player_stats_ratings')
def player_stats_ratings():
    """Render the player stats page."""
    return render_template('player_stats_ratings.html', current_page='player_stats_ratings')


@app.route('/plotly')
def plotly():
    """Render the Plotly chart page."""
    return render_template('plotly.html', current_page='plotly')


@app.route('/matchup_maker')
def matchup_maker():
    """Render the matchup maker page."""
    return render_template('matchup_maker.html', current_page='matchup_maker')


@app.route('/api/top_25_data')
def get_top_25_data():
    """Return AP Top 25 rows with basic record and conference data."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """ 
            SELECT ap_rank, team_name, wins, losses, c.conference_abbreviation
            FROM team t
            JOIN conference c ON c.conference_id = t.conference_id
            WHERE ap_rank != 0
            ORDER BY ap_rank ASC
        """
        
        cursor.execute(sql)
        top_25_data = cursor.fetchall()
        cursor.close()
        conn.close()

        top_25_data = [(ap_rank, team_name, f"{wins}-{losses}", conf) for ap_rank, team_name, wins, losses, conf in top_25_data]

        return jsonify(top_25_data)
    except Exception as e:
        logging.debug(f"An error occured in get_top_25_data(): {e}")


@app.route('/api/generateMadnessRtg')
def generate_madness_ratings():
    """Return Madness Ratings for all teams with ranks and conferences."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        sql = """
            SELECT team_name, madness_rating, net_rating_adjusted, c.conference_abbreviation
            FROM team t
            JOIN conference c ON c.conference_id = t.conference_id
            ORDER BY madness_rating DESC
        """

        cursor.execute(sql)
        ratings = cursor.fetchall()
        ratings.sort(key=lambda x: x[1], reverse=True)

        ratings = [(rank + 1, team_name, rating, net, conference) for rank, (team_name, rating, net, conference) in enumerate(ratings)]

        return jsonify(ratings)
    except Exception as e:
        logging.debug(f"An error occurred in generate madness ratings: {e}") 
    
    
@app.route('/api/get_player_stats')
def get_player_stats():
    """Return player rows joined with team and conference context."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        sql = """SELECT p.player_name,
                        t.team_name, 
                        c.conference_abbreviation,
                        p.position,
                        p.class,
                        p.games_played,
                        p.games_started,
                        p.minutes_per_game,
                        p.fg_percentage_per_game,
                        p.3p_percentage_per_game,
                        p.ft_percentage_per_game,
                        p.orb_per_game,
                        p.drb_per_game,
                        p.trb_per_game,
                        p.ast_per_game,
                        p.stl_per_game,
                        p.blk_per_game,
                        p.tov_per_game,
                        p.pf_per_game,
                        p.pts_per_game
                FROM player p
                JOIN team t ON p.team_id = t.team_id
                JOIN conference c ON t.conference_id = c.conference_id
                ORDER BY t.team_name, p.player_name"""
                
        cursor.execute(sql)
        player_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return jsonify({
            'player_data': player_data
        })
    except Exception as e:
        logging.debug(f"An error occurred in get_player_stats: {e}") 


@app.route('/api/get_team_stats')
def get_stats():
    """Return raw team stats plus a conference id map."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = f"""
                    SELECT  t.team_name, 
                            t.conference_id,
                            t.games,
                            t.wins,
                            t.losses,
                            t.win_percentage,
                            t.wins_conf,
                            t.losses_conf,
                            t.team_points,
                            t.opponent_points,
                            t.pts_per_game,
                            t.opp_points_per_game,
                            t.margin_of_victory,
                            t.team_rebounds,
                            t.offensive_rebounds,
                            t.assists,
                            t.steals,
                            t.blocks,
                            t.turnovers,
                            t.personal_fouls,
                            t.minutes_played,
                            t.field_goals,
                            t.field_goals_attempted,
                            t.field_goal_percentage,
                            t.3_point_field_goals,
                            t.3_point_field_goals_attempted,
                            t.3_point_percentage,
                            t.free_throws,
                            t.free_throws_attempted,
                            t.free_throw_percentage
                    FROM team t
                """
        
        cursor.execute(sql)
        team_stats = cursor.fetchall()

        cursor.execute('SELECT conference_id, conference_abbreviation FROM conference')
        conferences = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return jsonify({
            "teams": team_stats,
            "conferences": {row[0]: row[1] for row in conferences}
        })
    except Exception as e:
        logging.debug(f"An error occurred in get_stats: {e}")   
  
  
@app.route('/api/get_contenders')
def get_contenders():
    """Return the Championship Contenders list derived from multiple filters."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        sql = """
            SELECT DISTINCT(t.team_name),
                c.conference_abbreviation,
                t.wins,
                t.losses,
                t.ap_rank,
                t.madness_rating,
                t.net_rating_adjusted,
                t.offensive_rating_adjusted, 
                t.defensive_rating_adjusted, 
                t.strength_of_schedule,
                t.simple_rating_system
            FROM team t
            JOIN (
            SELECT team_name
            FROM team 
            ORDER BY offensive_rating_adjusted DESC
            LIMIT 20
            ) top20 ON t.team_name = top20.team_name
            JOIN (
            SELECT team_name
            FROM team 
            ORDER BY defensive_rating_adjusted ASC
            LIMIT 20
            ) bottom20 ON t.team_name = bottom20.team_name
            JOIN (
            SELECT team_name
            FROM team
            ORDER BY strength_of_schedule DESC
            LIMIT 50
            ) sos ON t.team_name = sos.team_name
            JOIN conference c on c.conference_id = t.conference_id
            ORDER BY net_rating_adjusted DESC
        """
        cursor.execute(sql)
        contenders = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(contenders)
    except Exception as e:
        logging.debug(f"An error occured: {e}")


@app.route('/api/get_next_up')
def get_next_up():
    """Return the Next Up tier with broader thresholds than contenders."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        sql = """
            SELECT DISTINCT(t.team_name),
                c.conference_abbreviation,
                t.wins,
                t.losses,
                t.ap_rank,
                t.madness_rating,
                t.net_rating_adjusted,
                t.offensive_rating_adjusted, 
                t.defensive_rating_adjusted,  
                t.strength_of_schedule,
                t.simple_rating_system
            FROM team t
            JOIN (
                SELECT team_name
                FROM team 
                ORDER BY offensive_rating_adjusted DESC
                LIMIT 35
            ) top20 ON t.team_name = top20.team_name
            JOIN (
                SELECT team_name
                FROM team 
                ORDER BY defensive_rating_adjusted ASC
                LIMIT 35
            ) bottom20 ON t.team_name = bottom20.team_name
            JOIN (
                SELECT team_name
                FROM team
                ORDER BY strength_of_schedule DESC
                LIMIT 100
            ) sos ON t.team_name = sos.team_name
            JOIN conference c on c.conference_id = t.conference_id
            
            WHERE t.team_name NOT IN (
                SELECT DISTINCT(t.team_name)
                FROM team t
                JOIN (
                    SELECT team_name
                    FROM team 
                    ORDER BY offensive_rating_adjusted DESC
                    LIMIT 20
                ) top20 ON t.team_name = top20.team_name
                JOIN (
                    SELECT team_name
                    FROM team 
                    ORDER BY defensive_rating_adjusted ASC
                    LIMIT 20
                ) bottom20 ON t.team_name = bottom20.team_name
                JOIN (
                    SELECT team_name
                    FROM team
                    ORDER BY strength_of_schedule DESC
                    LIMIT 50
                ) sos ON t.team_name = sos.team_name
            )
            
            ORDER BY t.net_rating_adjusted DESC
        """
        cursor.execute(sql)
        next_up = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(next_up)
    except Exception as e:
        logging.debug(f"An error occured: {e}")


@app.route('/api/get_best_mid_majors')      
def get_best_mid_majors():
    """Return top mid-major teams excluding power conferences."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        sql = """
            SELECT DISTINCT(t.team_name),
                c.conference_abbreviation,
                t.wins,
                t.losses,
                t.ap_rank,
                t.madness_rating,
                t.net_rating_adjusted,
                t.offensive_rating_adjusted, 
                t.defensive_rating_adjusted,  
                t.strength_of_schedule,
                t.simple_rating_system
            FROM team t
            JOIN (
            SELECT t.team_name
            FROM team t 
            JOIN conference c on c.conference_id = t.conference_id
            WHERE c.conference_abbreviation NOT IN ('Big Ten', 'ACC', 'Big 12', 'Big East', 'SEC')
            ORDER BY offensive_rating_adjusted DESC
            LIMIT 25
            ) top20 ON t.team_name = top20.team_name
            JOIN (
            SELECT t.team_name
            FROM team t
            JOIN conference c on c.conference_id = t.conference_id
            WHERE c.conference_abbreviation NOT IN ('Big Ten', 'ACC', 'Big 12', 'Big East', 'SEC')
            ORDER BY defensive_rating_adjusted ASC
            LIMIT 25
            ) bottom20 ON t.team_name = bottom20.team_name
            JOIN (
            SELECT t.team_name
            FROM team t
            JOIN conference c on c.conference_id = t.conference_id
            WHERE c.conference_abbreviation NOT IN ('Big Ten', 'ACC', 'Big 12', 'Big East', 'SEC')
            ORDER BY strength_of_schedule DESC
            LIMIT 50
            ) sos ON t.team_name = sos.team_name
            JOIN conference c on c.conference_id = t.conference_id
            ORDER BY net_rating_adjusted DESC
        """
        cursor.execute(sql)
        mid_majors = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(mid_majors)
    except Exception as e:
        logging.debug(f"An error occured: {e}")
        
        
@app.route('/api/get_team_ratings')
def get_ratings():
    """Return advanced team ratings and efficiency metrics."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = f"""
            SELECT t.team_name,
                    t.conference_id,
                    t.ap_rank,
                    t.games,
                    t.wins,
                    t.losses,
                    t.win_percentage,
                    t.wins_conf,
                    t.losses_conf,
                    t.strength_of_schedule,
                    t.offensive_srs,
                    t.defensive_srs,
                    t.simple_rating_system,
                    t.offensive_rating_adjusted,
                    t.defensive_rating_adjusted,
                    t.net_rating_adjusted,
                    t.pace,
                    t.free_throw_attempt_rate,
                    t.free_throws_per_field_goal,
                    t.3_point_attempt_rate,
                    t.team_rebound_percentage,
                    t.offensive_rebound_percentage,
                    t.assist_percentage,
                    t.steal_percentage,
                    t.block_percentage,
                    t.turnover_percentage,
                    t.effective_field_goal_percentage,
                    t.true_shooting_percentage
            FROM team t
        """
        cursor.execute(sql)
        team_ratings = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(team_ratings)
    except Exception as e:
        logging.debug(f"An error occured: {e}")
        
        
@app.route('/api/get_team_names')
def get_team_names():
    """Return alphabetized team names for selectors."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """
            SELECT team_name
            FROM team
            ORDER BY team_name
        """
        cursor.execute(sql)
        team_names = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(team_names)
    except Exception as e:
        logging.debug(f"An error occured: {e}")
        

@app.route('/api/generateProbs')
def generate_probs():
    """Return a single home-team win probability for a matchup."""
    team1_name = request.args.get('team1')
    team2_name = request.args.get('team2')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM team
            WHERE team_name IN (%s, %s)
        """, (team1_name, team2_name))
        teams = {row["team_name"]: row for row in cursor.fetchall()}
        t0 = teams.get(team1_name)
        t1 = teams.get(team2_name)

        cursor.close()
        conn.close()

        if not t0 or not t1:
            return jsonify({}), 404

        input_data = build_matchup_features(t0, t1)

        input_df = pd.DataFrame([input_data])

        prob = MODEL.predict_proba(input_df)[0][1]
        prob = round(100 * (1 - prob), 1)

        return jsonify(prob)
    except Exception as e:
        logging.error("Error in /api/generateProbs: %s", str(e))
        return jsonify({}), 500


@app.route('/api/generateMatchupProbs')
def generate_matchup_probs():
    """Return both home-team win probabilities for a matchup."""
    team1_name = request.args.get('team1')
    team2_name = request.args.get('team2')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM team
            WHERE team_name IN (%s, %s)
        """, (team1_name, team2_name))
        teams = {row["team_name"]: row for row in cursor.fetchall()}
        t0 = teams.get(team1_name)
        t1 = teams.get(team2_name)

        cursor.close()
        conn.close()

        if not t0 or not t1:
            return jsonify({}), 404

        inputs = [
            build_matchup_features(t0, t1),
            build_matchup_features(t1, t0)
        ]
        input_df = pd.DataFrame(inputs)
        probs = MODEL.predict_proba(input_df)[:, 1]

        team1_prob = round(100 * (1 - probs[0]), 1)
        team2_prob = round(100 * (1 - probs[1]), 1)

        return jsonify({
            "team1_prob": team1_prob,
            "team2_prob": team2_prob
        })
    except Exception as e:
        logging.error("Error in /api/generateMatchupProbs: %s", str(e))
        return jsonify({}), 500


@app.route('/api/matchup')
def get_matchup_data():
    """Return matchup data, logos, and stat ranks for two teams."""
    team1 = request.args.get('team1')
    team2 = request.args.get('team2')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        def get_team_data(team_name):
            """Fetch a team row and attach a base64 logo."""
            cursor.execute("""
                SELECT t.*, l.logo_binary
                FROM team t
                LEFT JOIN logos l ON t.team_id = l.team_id
                WHERE t.team_name = %s
            """, (team_name,))
            team = cursor.fetchone()
            if team and team["logo_binary"]:
                # Convert binary logo to base64 string
                team["logo_base64"] = base64.b64encode(team["logo_binary"]).decode("utf-8")
            else:
                team["logo_base64"] = None
                
            if "logo_binary" in team:
                del team["logo_binary"]
            return team
        
        def get_stat_ranks():
            """Build per-team stat ranking dictionaries."""
            cursor.execute("SELECT * FROM team")
            teams = cursor.fetchall()

            # Build a dictionary of ranks per team per stat
            rankings = {}

            stat_columns = [
                'games', 'wins', 'win_percentage', 'madness_rating', 
                'strength_of_schedule', 'offensive_srs', 'defensive_srs', 
                'simple_rating_system','offensive_rating_adjusted', 'defensive_rating_adjusted',
                'net_rating_adjusted', 'pace', 'free_throw_attempt_rate',
                'free_throws_per_field_goal', '3_point_attempt_rate',
                'team_rebound_percentage', 'offensive_rebound_percentage',
                'assist_percentage', 'steal_percentage', 'block_percentage',
                'turnover_percentage', 'effective_field_goal_percentage',
                'true_shooting_percentage'
            ]
            
            lower_is_better = {
                'defensive_rating_adjusted',
                'turnover_percentage'
            }

            for stat in stat_columns:
                reverse = stat not in lower_is_better

                sorted_teams = sorted(
                    teams,
                    key=lambda t: t[stat] if t[stat] is not None else float('-inf'),
                    reverse=reverse
                )

                rank = 1
                prev_value = None

                for i, team in enumerate(sorted_teams):
                    tid = team["team_id"]
                    value = team[stat]

                    if tid not in rankings:
                        rankings[tid] = {}

                    if value == prev_value:
                        rankings[tid][stat] = rank
                    else:
                        rank = i + 1
                        rankings[tid][stat] = rank
                        prev_value = value

            return rankings
        
        team1_data = get_team_data(team1)
        team2_data = get_team_data(team2)
        
        rankings = get_stat_ranks()
        team1_data["stat_ranks"] = rankings.get(team1_data["team_id"], {})
        team2_data["stat_ranks"] = rankings.get(team2_data["team_id"], {})

        cursor.close()
        conn.close()

        return jsonify({"team1": team1_data, "team2": team2_data})
    except Exception as e:
        logging.error("Error in /api/matchup: %s", str(e))
        return jsonify({}), 500
    

@app.route('/api/get_averages_for_net')
def get_net_averages():
    """Return average offensive and defensive ratings."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        sql = """
                SELECT
                    AVG(offensive_rating_adjusted) AS aoff,
                    AVG(defensive_rating_adjusted) AS adef
                FROM team
            """
        cursor.execute(sql)
        averages = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify(averages)
        
    except Exception as e:
        logging.debug(f"An error occured: {e}")
    

@app.route('/api/fetch_top_68')
def create_top_68():
    """Return the top 68 teams for the Plotly chart filter."""
    how = request.args.get('how')
    # print(how)
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        if how == "Top 68 Teams By Madness Rating":
            sql = """
                SELECT t.team_name,
                    t.offensive_rating_adjusted,
                    t.defensive_rating_adjusted,
                    t.net_rating_adjusted,
                    t.madness_rating,
                    l.logo_binary
                FROM team t
                LEFT JOIN logos l ON t.team_id = l.team_id
                ORDER BY madness_rating DESC
                LIMIT 68
            """
        elif how == "Top 68 Teams By Net Rating":
            sql = """
                SELECT t.team_name,
                    t.offensive_rating_adjusted,
                    t.defensive_rating_adjusted,
                    t.net_rating_adjusted,
                    t.madness_rating,
                    l.logo_binary
                FROM team t
                LEFT JOIN logos l ON t.team_id = l.team_id
                ORDER BY net_rating_adjusted DESC
                LIMIT 68
            """
        elif how == "All Teams":
            sql = """
                SELECT t.team_name,
                    t.offensive_rating_adjusted,
                    t.defensive_rating_adjusted,
                    t.net_rating_adjusted,
                    t.madness_rating,
                    l.logo_binary
                FROM team t
                LEFT JOIN logos l ON t.team_id = l.team_id
            """
        else:
            sql = f"""
                SELECT t.team_name,
                    t.offensive_rating_adjusted,
                    t.defensive_rating_adjusted,
                    t.net_rating_adjusted,
                    t.madness_rating,
                    l.logo_binary
                FROM team t
                JOIN conference c on c.conference_id = t.conference_id
                LEFT JOIN logos l ON t.team_id = l.team_id
                WHERE c.conference_abbreviation = '{how}'
                ORDER BY net_rating_adjusted DESC
                LIMIT 68
            """
        cursor.execute(sql)
        teams = cursor.fetchall()
        cursor.close()
        conn.close()

        for team in teams:
            logo_binary = team.get("logo_binary")
            if logo_binary:
                team["logo_base64"] = base64.b64encode(logo_binary).decode("utf-8")
            else:
                team["logo_base64"] = None
            team.pop("logo_binary", None)

        return jsonify(teams)
    except Exception as e:
        logging.debug(f"An error occured: {e}")


@app.route('/api/get_team_list')
def get_team_list():
    """Return team names with optional base64 logos for UI lists."""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT t.team_name, l.logo_binary
            FROM team t
            LEFT JOIN logos l ON t.team_id = l.team_id
            ORDER BY t.team_name
        """)
        teams = cursor.fetchall()
        cursor.close()
        conn.close()

        for team in teams:
            logo_binary = team.get("logo_binary")
            if logo_binary:
                team["logo_base64"] = base64.b64encode(logo_binary).decode("utf-8")
            else:
                team["logo_base64"] = None
            team.pop("logo_binary", None)

        return jsonify(teams)
    except Exception as e:
        logging.debug(f"An error occured in get_team_list: {e}")

if __name__ == '__main__':
    # app.run(debug=True)
    app.run(host="0.0.0.0", port=10000)




