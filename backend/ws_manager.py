"""
WebSocket Connection Manager for real-time notifications.
Manages per-user connections, role-based targeting, and message delivery.
"""

import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections per user_id (vendor or admin)."""

    def __init__(self):
        # user_id -> set of WebSocket connections (supports multiple tabs)
        self.active: Dict[str, Set[WebSocket]] = {}
        # role -> set of user_ids (for broadcast by role)
        self.role_map: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, role: str = ""):
        await websocket.accept()
        if user_id not in self.active:
            self.active[user_id] = set()
        self.active[user_id].add(websocket)
        if role:
            if role not in self.role_map:
                self.role_map[role] = set()
            self.role_map[role].add(user_id)
        logger.info(f"WS connected: {user_id} ({role}) — total connections: {sum(len(s) for s in self.active.values())}")

    def disconnect(self, websocket: WebSocket, user_id: str, role: str = ""):
        if user_id in self.active:
            self.active[user_id].discard(websocket)
            if not self.active[user_id]:
                del self.active[user_id]
                if role and role in self.role_map:
                    self.role_map[role].discard(user_id)
        logger.info(f"WS disconnected: {user_id}")

    async def send_to_user(self, user_id: str, data: dict):
        """Send notification to a specific user (all their tabs)."""
        if user_id not in self.active:
            return
        dead = []
        for ws in self.active[user_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active[user_id].discard(ws)

    async def send_to_role(self, role: str, data: dict):
        """Send notification to all users of a specific role."""
        user_ids = self.role_map.get(role, set()).copy()
        for uid in user_ids:
            await self.send_to_user(uid, data)

    def is_connected(self, user_id: str) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0


# Singleton instance
ws_manager = ConnectionManager()
