import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../src/components/ui/avatar";
import { Button } from "../../src/components/ui/button";
import { Settings, User, ChevronDown, LogOut } from "lucide-react";
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { authService, type User as UserType } from "../services/authService";
import { useLanguage } from "../i18n/LanguageContext";
import "./Nav.css";

interface NavProps {
  onSettingsClick: () => void;
}

export const Nav: React.FC<NavProps> = ({ onSettingsClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserType | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Determine active platform based on current route
  const currentPath = location.pathname;
  const isWhatsApp = currentPath.includes("whatsapp");
  const isTelegram = currentPath.includes("telegram");

  // Function to switch platform
  const switchPlatform = () => {
    if (isWhatsApp) {
      navigate("/telegram");
    } else if (isTelegram) {
      navigate("/whatsapp");
    } else {
      // If not in a messaging platform, default to telegram
      navigate("/telegram");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/");
  };

  return (
    <div className="nav-container">
      <div className="nav-content">
        {/* Left side - Brand and Platform Switcher */}
        <div className="nav-left">
          <div className="brand-section" onClick={() => navigate("/")}>
            <span className="brand-text">chathut</span>
          </div>

          {/* Platform Switcher Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={switchPlatform}
            className={`nav-btn platform-switcher-btn ${
              isWhatsApp
                ? "whatsapp-active"
                : isTelegram
                ? "telegram-active"
                : ""
            }`}
            title={
              isWhatsApp ? t("nav.switchToTelegram") : t("nav.switchToWhatsApp")
            }
          >
            {isWhatsApp ? (
              <FaTelegram className="h-5 w-5" />
            ) : (
              <FaWhatsapp className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Right side - User Profile with Dropdown */}
        <div className="nav-right">
          <div className="user-dropdown" ref={dropdownRef}>
            <div
              className="user-section"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
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
                  <span className="status-text">{t("nav.online")}</span>
                </div>
              </div>
              <ChevronDown
                className={`dropdown-arrow ${dropdownOpen ? "open" : ""}`}
              />
            </div>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    navigate("/profile");
                    setDropdownOpen(false);
                  }}
                >
                  <User className="dropdown-icon" />
                  <span>{t("nav.profile")}</span>
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    onSettingsClick();
                    setDropdownOpen(false);
                  }}
                >
                  <Settings className="dropdown-icon" />
                  <span>{t("nav.settings")}</span>
                </div>
                <div className="dropdown-divider"></div>
                <div
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <LogOut className="dropdown-icon" />
                  <span>{t("nav.logout")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
