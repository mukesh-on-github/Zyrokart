import os
import json
import random
from datetime import datetime, timedelta
from flask import Flask, render_template_string, jsonify

app = Flask(__name__)

# --- Mock Monitor (Fallback if real monitor fails) ---
# This class mimics the behavior of the real security monitor.
# It generates fake data so the dashboard has something to show.
class MockMonitor:
    def get_security_report(self):
        return {
            'status': 'Active (Mock Mode)',
            'threat_level': 'Low',
            'blocked_ips_count': 12,
            'total_events_24h': 145,
            'suspicious_activities': 3
        }
    
    @property
    def security_logs(self):
        logs = []
        types = ['SQL_INJECTION', 'XSS_ATTACK', 'LOGIN_FAILED', 'BRUTE_FORCE']
        # Generate 20 fake log entries
        for i in range(20):
            logs.append({
                'timestamp': (datetime.now() - timedelta(minutes=i*5)).isoformat(),
                'event_type': random.choice(types),
                'details': {'ip': f'192.168.1.{random.randint(10, 99)}'}
            })
        return logs

# --- Import Logic ---
# Try to import the real security_monitor. If it fails (e.g., file missing or error),
# switch to the MockMonitor so the app doesn't crash.
try:
    from security_monitor import security_monitor
except ImportError:
    print("⚠️ Security Monitor not found. Running in Mock Mode.")
    security_monitor = MockMonitor()

# --- HTML Template ---
# This HTML is embedded directly in the Python file for simplicity.
# It includes CSS for a dark-themed, "hacker-style" dashboard.
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZyroKart Security Center</title>
    <meta http-equiv="refresh" content="30"> <!-- Auto-refresh every 30 seconds -->
    <style>
        :root {
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --text-main: #c9d1d9;
            --accent: #58a6ff;
            --border: #30363d;
            --success: #238636;
            --danger: #da3633;
            --warning: #d29922;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 1.5rem; color: var(--accent); }
        .badge {
            background: var(--success);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 20px;
        }
        .card h3 { margin-top: 0; font-size: 0.9rem; color: #8b949e; }
        .stat { font-size: 2rem; font-weight: bold; margin: 10px 0; }

        .logs-container {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            overflow: hidden;
        }
        .logs-header {
            padding: 15px 20px;
            border-bottom: 1px solid var(--border);
            font-weight: 600;
        }
        .log-entry {
            padding: 12px 20px;
            border-bottom: 1px solid var(--border);
            font-family: monospace;
            font-size: 0.9rem;
            display: flex;
            gap: 15px;
        }
        .log-entry:last-child { border-bottom: none; }
        .log-time { color: #8b949e; min-width: 160px; }
        .log-type { font-weight: bold; min-width: 140px; }
        
        .type-SQL_INJECTION { color: var(--danger); }
        .type-XSS_ATTACK { color: var(--warning); }
        .type-BRUTE_FORCE { color: var(--danger); }
        .type-INFO { color: var(--accent); }

    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ ZyroKart Security Center</h1>
            <span class="badge">System Live</span>
        </div>

        <div class="grid">
            <div class="card">
                <h3>THREAT LEVEL</h3>
                <!-- Dynamic color based on threat level -->
                <div class="stat" style="color: {{ '#da3633' if report.threat_level == 'High' else '#238636' }}">
                    {{ report.threat_level }}
                </div>
            </div>
            <div class="card">
                <h3>BLOCKED IPs</h3>
                <div class="stat">{{ report.blocked_ips_count }}</div>
            </div>
            <div class="card">
                <h3>EVENTS (24H)</h3>
                <div class="stat">{{ report.total_events_24h }}</div>
            </div>
            <div class="card">
                <h3>SUSPICIOUS ACTIVITY</h3>
                <div class="stat">{{ report.get('suspicious_activities', 0) }}</div>
            </div>
        </div>

        <div class="logs-container">
            <div class="logs-header">Recent Security Events</div>
            <!-- Loop through logs and display them -->
            {% for log in logs %}
            <div class="log-entry">
                <span class="log-time">{{ log.timestamp }}</span>
                <span class="log-type type-{{ log.event_type }}">{{ log.event_type }}</span>
                <span class="log-details">{{ log.details }}</span>
            </div>
            {% endfor %}
            {% if not logs %}
            <div class="log-entry" style="justify-content: center; color: #8b949e;">
                No recent events found.
            </div>
            {% endif %}
        </div>
    </div>
</body>
</html>
"""

# --- Routes ---

@app.route('/')
def index():
    try:
        # Get data from the monitor (Real or Mock)
        report = security_monitor.get_security_report()
        
        # Safely get logs, handling different ways the monitor might store them
        raw_logs = getattr(security_monitor, 'security_logs', [])
        
        # If logs exist, take the last 20 and reverse them (newest first)
        logs = raw_logs[-20:][::-1] if raw_logs else []
        
    except Exception as e:
        # If anything breaks, show an error report instead of crashing
        report = {'threat_level': 'Error', 'blocked_ips_count': '-', 'total_events_24h': '-', 'status': str(e)}
        logs = []
        
    return render_template_string(DASHBOARD_HTML, report=report, logs=logs)

@app.route('/api/stats')
def api_stats():
    # API endpoint to return raw JSON data
    return jsonify(security_monitor.get_security_report())

if __name__ == '__main__':
    print(f"🔒 Security Dashboard running at http://localhost:5001")
    # debug=True allows the server to auto-reload if you make changes
    app.run(port=5001, debug=True)