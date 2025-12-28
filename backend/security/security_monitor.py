import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict

# Configure logging
logging.basicConfig(
    filename='security_monitor.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class AdvancedSecurityMonitor:
    def __init__(self):
        self.suspicious_activities = []
        self.failed_login_attempts = {}
        self.security_logs = []
        self.blocked_ips = set()
        
        self.config = {
            'max_login_attempts': 5,
            'lockout_time': 900,  # 15 minutes
            'suspicious_patterns': [
                r'<script>', r'javascript:', r'DROP TABLE', 
                r'UNION SELECT', r'1=1', r'OR 1=1'
            ]
        }

    def log_event(self, event_type: str, details: Dict):
        """Log a security event"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'details': details
        }
        self.security_logs.append(event)
        logging.info(f"Security Event: {event_type} - {details}")
        
        # Check for immediate threats
        if event_type == 'FAILED_LOGIN':
            self._handle_failed_login(details.get('ip_address'))

    def _handle_failed_login(self, ip_address: str):
        """Track failed logins and block IP if threshold exceeded"""
        if not ip_address:
            return

        current_time = time.time()
        
        # Initialize or clean old attempts
        if ip_address not in self.failed_login_attempts:
            self.failed_login_attempts[ip_address] = []
        
        # Keep only recent attempts (last 15 mins)
        self.failed_login_attempts[ip_address] = [
            t for t in self.failed_login_attempts[ip_address] 
            if current_time - t < self.config['lockout_time']
        ]
        
        self.failed_login_attempts[ip_address].append(current_time)
        
        if len(self.failed_login_attempts[ip_address]) >= self.config['max_login_attempts']:
            self.block_ip(ip_address, reason="Too many failed login attempts")

    def block_ip(self, ip_address: str, reason: str = "Suspicious activity"):
        """Add IP to blocklist"""
        if ip_address not in self.blocked_ips:
            self.blocked_ips.add(ip_address)
            self.log_event('IP_BLOCKED', {'ip': ip_address, 'reason': reason})
            print(f"🚫 BLOCKED IP: {ip_address} - {reason}")

    def get_security_report(self) -> Dict:
        """Generate a summary report"""
        recent_events = [
            e for e in self.security_logs 
            if datetime.fromisoformat(e['timestamp']) > datetime.now() - timedelta(hours=24)
        ]
        
        return {
            'status': 'Active',
            'blocked_ips_count': len(self.blocked_ips),
            'total_events_24h': len(recent_events),
            'threat_level': 'Low' if len(recent_events) < 10 else 'High'
        }

# Singleton instance
security_monitor = AdvancedSecurityMonitor()