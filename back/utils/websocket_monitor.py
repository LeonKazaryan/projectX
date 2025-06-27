"""
WebSocket monitoring utilities for debugging real-time connections
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any

class WebSocketMonitor:
    def __init__(self):
        self.connection_stats = {}
        self.message_count = 0
        self.start_time = datetime.now()
    
    def log_connection(self, session_id: str, event: str, details: str = ""):
        """Log WebSocket connection events"""
        timestamp = datetime.now().isoformat()
        print(f"[WS-MONITOR] {timestamp} | {session_id} | {event} | {details}")
        
        if session_id not in self.connection_stats:
            self.connection_stats[session_id] = {
                "connected_at": timestamp,
                "messages_sent": 0,
                "last_activity": timestamp,
                "status": "unknown"
            }
        
        self.connection_stats[session_id]["last_activity"] = timestamp
        self.connection_stats[session_id]["status"] = event
    
    def log_message_sent(self, session_id: str, message_type: str, success: bool = True):
        """Log when a message is sent through WebSocket"""
        self.message_count += 1
        
        if session_id in self.connection_stats:
            self.connection_stats[session_id]["messages_sent"] += 1
        
        status = "SUCCESS" if success else "FAILED"
        self.log_connection(session_id, f"MESSAGE_SENT_{status}", f"Type: {message_type}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current monitoring statistics"""
        uptime = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "uptime_seconds": uptime,
            "total_messages_sent": self.message_count,
            "active_connections": len([
                s for s in self.connection_stats.values() 
                if s["status"] not in ["disconnected", "error"]
            ]),
            "connection_details": self.connection_stats
        }
    
    def cleanup_session(self, session_id: str):
        """Clean up monitoring data for a session"""
        if session_id in self.connection_stats:
            self.connection_stats[session_id]["status"] = "disconnected"
            self.log_connection(session_id, "CLEANUP", "Session data cleaned")

# Global monitor instance
ws_monitor = WebSocketMonitor() 