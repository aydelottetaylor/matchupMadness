from flask import Flask, jsonify, render_template, request, send_from_directory
import mysql.connector
from flask_cors import CORS
import logging
import os
import base64

from config import db_config
import joblib
import sklearn
import pandas as pd


log_path = os.path.join(os.path.dirname(__file__), 'backend/backend_log.txt')

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


@app.route('/')
def index():
    return render_template('index.html', current_page='home')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'img/favicon.ico')


@app.route('/team_stats_ratings')
def team_stats_ratings():
    return render_template('team_stats_ratings.html', current_page='team_stats_ratings')


@app.route('/player_stats_ratings')
def player_stats_ratings():
    return render_template('player_stats_ratings.html', current_page='player_stats_ratings')


@app.route('/matchup_maker')
def matchup_maker():
    return render_template('matchup_maker.html', current_page='matchup_maker')


@app.route('/api/top_25_data')
def get_top_25_data():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        sql = """ 
            SELECT ap_rank, team_name, wins, losses
            FROM team
            WHERE ap_rank != 0
            ORDER BY ap_rank ASC
        """
        
        cursor.execute(sql)
        top_25_data = cursor.fetchall()
        cursor.close()
        conn.close()

        top_25_data = [(ap_rank, team_name, f"{wins}-{losses}") for ap_rank, team_name, wins, losses in top_25_data]

        return jsonify(top_25_data)
    except Exception as e:
        logging.debug(f"An error occured in get_top_25_data(): {e}")


@app.route('/api/generateMadnessRtg')
def generate_madness_ratings():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        sql = """
            SELECT team_name, madness_rating, c.conference_abbreviation
            FROM team t
            JOIN conference c ON c.conference_id = t.conference_id
            ORDER BY madness_rating DESC
        """

        cursor.execute(sql)
        ratings = cursor.fetchall()
        ratings.sort(key=lambda x: x[1], reverse=True)

        ratings = [(rank + 1, team_name, rating, conference) for rank, (team_name, rating, conference) in enumerate(ratings)]

        return jsonify(ratings)
    except Exception as e:
        logging.debug(f"An error occurred in generate madness ratings: {e}") 
    
    
@app.route('/api/get_player_stats')
def get_player_stats():
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
    team1_name = request.args.get('team1')
    team2_name = request.args.get('team2')

    try:
        model = joblib.load('model_1_0.pkl')
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT *
            FROM team
            WHERE team_name = %s
        """, (team1_name,))
        t0 = cursor.fetchone()

        cursor.execute("""
            SELECT *
            FROM team
            WHERE team_name = %s
        """, (team2_name,))
        t1 = cursor.fetchone()

        cursor.close()
        conn.close()

        input_data = {
            'sos_diff': t0['strength_of_schedule'] - t1['strength_of_schedule'],
            'net_diff': t0['net_rating_adjusted'] - t1['net_rating_adjusted'],
            'srs_diff': t0['simple_rating_system'] - t1['simple_rating_system'],
            'mov_diff': t0['margin_of_victory'] - t1['margin_of_victory'],
            'pts_per_game': t0['pts_per_game'],
            'opp_points_per_game_Team1': t1['opp_points_per_game'],
            'pts_per_game_Team1': t1['pts_per_game'],
            'opp_points_per_game': t0['opp_points_per_game'],
            'assist_percentage': t0['assist_percentage'],
            'team_rebound_percentage': t0['team_rebound_percentage'],
            'rebs_diff': (t0['team_rebounds'] / t0['games']) - (t1['team_rebounds'] / t1['games']),
            'turnover_percentage': t0['turnover_percentage'],
            'steal_percentage_Team1': t1['steal_percentage'],
            'block_percentage_Team1': t1['block_percentage'],
            'field_goal_percentage': t0['field_goal_percentage'],
            '3_point_percentage': t0['3_point_percentage'],
            'free_throw_percentage': t0['free_throw_percentage'],
            'pace_diff': t0['pace'] - t1['pace'],
            'offensive_rating': t0['offensive_rating'],
            'offensive_srs': t0['offensive_srs'],
            'defensive_srs_Team1': t1['defensive_srs'],
            'offensive_rating_adjusted': t0['offensive_rating_adjusted'],
            'defensive_rating_adjusted_Team1': t1['defensive_rating_adjusted'],
            'true_shooting_percentage': t0['true_shooting_percentage'],
            'offensive_rebound_percentage': t0['offensive_rebound_percentage'],
            'madness_diff': t0['madness_rating'] - t1['madness_rating'],
            'off_srs_diff': t0['offensive_srs'] - t1['offensive_srs'],
            'def_srs_diff': t0['defensive_srs'] - t1['defensive_srs'],
            'ts_diff': t0['true_shooting_percentage'] - t1['true_shooting_percentage'],
            'off_rating_diff': t0['offensive_rating_adjusted'] - t1['offensive_rating_adjusted'],
            'def_rating_diff': t0['defensive_rating_adjusted'] - t1['defensive_rating_adjusted'],
            'ft_rate_diff': t0['free_throw_attempt_rate'] - t1['free_throw_attempt_rate'],
            '3pa_rate_diff': t0['3_point_attempt_rate'] - t1['3_point_attempt_rate']
        }

        input_df = pd.DataFrame([input_data])

        prob = model.predict_proba(input_df)[0][1]
        prob = round(100 * (1 - prob), 1)

        return jsonify(prob)
    except Exception as e:
        logging.error("Error in /api/generateProbs: %s", str(e))
        return jsonify({}), 500


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
    

if __name__ == '__main__':
    # app.run(debug=True)
    app.run(host="0.0.0.0", port=10000)




