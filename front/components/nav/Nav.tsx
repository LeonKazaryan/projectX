import React, { useState, useEffect } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../src/components/ui/avatar";
import { Button } from "../../src/components/ui/button";
import { Settings, Home, User, Terminal, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService, type User as UserType } from "../services/authService";
import "./Nav.css";

interface NavProps {
  onSettingsClick: () => void;
}

export const Nav: React.FC<NavProps> = ({ onSettingsClick }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
  }, []);

  return (
    <div className="nav-container">
      <div className="nav-content">
        {/* Left side - Brand and User Info */}
        <div className="nav-left">
          <div className="brand-section">
            <div className="brand-icon">
              <Terminal className="h-6 w-6 text-cyan-400" />
            </div>
            <span className="brand-text">chathut</span>
          </div>

          <div className="user-section">
            <Avatar className="user-avatar">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="avatar-fallback">
                {user?.displayName?.charAt(0) ||
                  user?.username?.charAt(0) ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="user-info">
              <p className="user-name">
                {user?.displayName || user?.username || "User"}
              </p>
              <div className="status-indicator">
                <div className="status-dot"></div>
                <span className="status-text">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Navigation Buttons */}
        <div className="nav-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="nav-btn home-btn"
          >
            <Home className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="nav-btn profile-btn"
          >
            <User className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/whatsapp")}
            className="nav-btn whatsapp-btn"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="nav-btn settings-btn"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
