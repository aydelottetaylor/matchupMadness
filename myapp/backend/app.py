from flask import Flask, jsonify, render_template, request, send_from_directory
import mysql.connector
from flask_cors import CORS
import logging
import os
import base64

from config import db_config


log_path = os.path.join(os.path.dirname(__file__), 'backend_log.txt')

logging.basicConfig(
    filename=log_path,
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)


app = Flask(
    __name__,
    static_folder=os.path.join(os.path.pardir, 'frontend/static'),
    template_folder=os.path.join(os.path.pardir, 'frontend/templates')
)
CORS(app)


@app.route('/')
def index():
    return render_template('index.html', current_page='home')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico')

@app.route('/stats_ratings')
def stats_ratings():
    return render_template('stats_ratings.html', current_page='stats_ratings')

@app.route('/matchup_maker')
def matchup_maker():
    return render_template('matchup_maker.html', current_page='matchup_maker')

@app.route('/api/top_25_data')
def get_top_25_data():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """ 
            SELECT team_name, ap_rank
            FROM team
            WHERE ap_rank != 0
            ORDER BY ap_rank ASC
        """
        
        cursor.execute(sql)
        top_25_data = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(top_25_data)
    except:
        logging.debug(f"An error occured in get_top_25_data(): {e}")

@app.route('/api/team_stats')
def get_stats():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """
            SELECT  team_name, 
                    conference_id,
                    games,
                    wins,
                    losses,
                    win_percentage,
                    team_points,
                    opponent_points,
                    pts_per_game,
                    opp_points_per_game,
                    margin_of_victory,
                    team_rebounds,
                    offensive_rebounds,
                    assists,
                    steals,
                    blocks,
                    turnovers,
                    personal_fouls,
                    minutes_played,
                    field_goals,
                    field_goals_attempted,
                    field_goal_percentage,
                    3_point_field_goals,
                    3_point_field_goals_attempted,
                    3_point_percentage,
                    free_throws,
                    free_throws_attempted,
                    free_throw_percentage
            FROM team
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
        logging.debug(f"An error occurred: {e}")   
        
        
@app.route('/api/team_ratings')
def get_ratings():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """
            SELECT team_name,
                    conference_id,
                    ap_rank,
                    games,
                    wins,
                    losses,
                    win_percentage,
                    strength_of_schedule,
                    offensive_srs,
                    defensive_srs,
                    simple_rating_system,
                    offensive_rating_adjusted,
                    defensive_rating_adjusted,
                    net_rating_adjusted,
                    pace,
                    free_throw_attempt_rate,
                    free_throws_per_field_goal,
                    3_point_attempt_rate,
                    team_rebound_percentage,
                    offensive_rebound_percentage,
                    assist_percentage,
                    steal_percentage,
                    block_percentage,
                    turnover_percentage,
                    effective_field_goal_percentage,
                    true_shooting_percentage
            FROM team
        """
        cursor.execute(sql)
        team_ratings = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(team_ratings)
    except Exception as e:
        logging.debug(f"An error occured: {e}")
        
        
@app.route('/api/team_names')
def get_team_names():
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
        
        
@app.route('/api/matchup')
def get_matchup_data():
    team1 = request.args.get('team1')
    team2 = request.args.get('team2')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        def get_team_data(team_name):
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
            cursor.execute("SELECT * FROM team")
            teams = cursor.fetchall()

            # Build a dictionary of ranks per team per stat
            rankings = {}

            stat_columns = [
                'games', 'wins', 'win_percentage', 'strength_of_schedule',
                'offensive_srs', 'defensive_srs', 'simple_rating_system',
                'offensive_rating_adjusted', 'defensive_rating_adjusted',
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
    

if __name__ == '__main__':
    app.run(debug=True)




