import re
from typing import Dict, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class FirewallRule:
    name: str
    pattern: str
    action: str  # 'block', 'allow'
    severity: str  # 'low', 'medium', 'high'

class WebApplicationFirewall:
    def __init__(self):
        self.rules = self._load_default_rules()
        self.blocked_ips = {}

    def _load_default_rules(self) -> List[FirewallRule]:
        """Load default security rules"""
        return [
            # SQL Injection
            FirewallRule('SQL Injection', r"(')|(\-\-)|(\#)|(UNION SELECT)", 'block', 'high'),
            # XSS
            FirewallRule('XSS Attack', r"<script>|javascript:|onerror=", 'block', 'high'),
            # Path Traversal
            FirewallRule('Path Traversal', r"\.\./|\.\.\\", 'block', 'medium'),
            # Command Injection
            FirewallRule('Command Injection', r";\s*(exec|system|eval)", 'block', 'high')
        ]

    def inspect_request(self, request_data: Dict) -> Dict:
        """
        Inspect incoming request data (headers, body, params) for threats.
        Returns a dict with 'allowed': bool and 'threats': list.
        """
        result = {
            'allowed': True,
            'threats': []
        }

        # Convert simple dict values to string for regex checking
        content_to_check = str(request_data)

        for rule in self.rules:
            if re.search(rule.pattern, content_to_check, re.IGNORECASE):
                result['threats'].append({
                    'rule': rule.name,
                    'severity': rule.severity
                })
                
                if rule.action == 'block':
                    result['allowed'] = False
                    # Stop checking if we found a blocking rule
                    break
        
        return result

    def block_ip(self, ip_address: str, duration: int = 3600):
        """Block an IP for a specific duration (seconds)"""
        expiry = datetime.now().timestamp() + duration
        self.blocked_ips[ip_address] = expiry

    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is currently blocked"""
        if ip_address in self.blocked_ips:
            if datetime.now().timestamp() < self.blocked_ips[ip_address]:
                return True
            else:
                del self.blocked_ips[ip_address] # Expired
        return False

# Initialize WAF
waf = WebApplicationFirewall()