import React, { useEffect, useState, useRef } from "react";
import authService from "../services/authService";
import { API_BASE_URL } from "../services/authService";
import type { ProfileData, ConnectedAccount } from "../services/authService";

import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import {
  User,
  Mail,
  Shield,
  Activity,
  Settings,
  Power,
  Network,
  CheckCircle,
  XCircle,
  Loader2,
  Home,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import MessagingBackground from "../home/MessagingBackground";
import { Button } from "../../src/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../src/components/ui/avatar";
import { useMessagingStore } from "../messaging/MessagingStore";
import { useLanguage } from "../i18n/LanguageContext";

const providerDetails: Record<
  string,
  {
    icon: React.ElementType;
    color: string;
    gradient: string;
    name: string;
    themeColor: "telegram" | "whatsapp" | "ai" | "general";
  }
> = {
  telegram: {
    icon: FaTelegram,
    color: "#0088cc",
    gradient: "from-blue-500 to-cyan-400",
    name: "Telegram",
    themeColor: "telegram",
  },
  whatsapp: {
    icon: FaWhatsapp,
    color: "#25D366",
    gradient: "from-green-500 to-emerald-400",
    name: "WhatsApp",
    themeColor: "whatsapp",
  },
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Individual provider statuses from messaging store (avoid object selector)
  const telegramStatus = useMessagingStore((state) =>
    state.getProviderStatus("telegram")
  );
  const whatsappStatus = useMessagingStore((state) =>
    state.getProviderStatus("whatsapp")
  );

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getProfile();
      setProfile(data);
      setError(null);

      // Restore provider states to ensure UI shows correct status
      await useMessagingStore.getState().restoreProviderStates();
    } catch (err) {
      console.error("Profile fetch error:", err);
      if (!authService.getAccessToken()) {
        navigate("/home");
        return;
      }
      setError("Session expired or invalid. Please log in again.");
      authService.logout();
      setTimeout(() => navigate("/home"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // GSAP Animations
  useEffect(() => {
    if (!isLoading && profile && heroRef.current) {
      // First ensure elements are visible
      gsap.set(heroRef.current.children, { opacity: 1, y: 50 });

      gsap.to(heroRef.current.children, {
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
      });
    }
  }, [isLoading, profile]);

  useEffect(() => {
    if (!isLoading && profile && cardsRef.current) {
      // First ensure elements are visible
      gsap.set(cardsRef.current.children, {
        opacity: 1,
        scale: 0.8,
        y: 30,
      });

      gsap.to(cardsRef.current.children, {
        scale: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.5,
      });
    }
  }, [isLoading, profile]);

  useEffect(() => {
    fetchProfile();

    const handleFocus = () => {
      console.log("refetching profile");
      fetchProfile();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [navigate]);

  const handleTelegramLogout = async () => {
    try {
      const token = authService.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/telegram/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        localStorage.removeItem("telegram_session_id");
        localStorage.removeItem("telegram_session_string");
        fetchProfile();
      } else {
        setError("Failed to logout from Telegram.");
      }
    } catch (error) {
      console.error("Telegram logout error:", error);
      setError("An error occurred during Telegram logout.");
    }
  };

  const handleWhatsAppLogout = async () => {
    try {
      const token = authService.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/whatsapp/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchProfile();
      } else {
        setError("Failed to logout from WhatsApp.");
      }
    } catch (error) {
      console.error("WhatsApp logout error:", error);
      setError("An error occurred during WhatsApp logout.");
    }
  };

  const renderAccountCard = (account: ConnectedAccount) => {
    const details = providerDetails[account.provider];
    if (!details) return null;

    const { icon: Icon, gradient, name } = details;
    // Combine backend status and local provider status
    const isConnected =
      account.is_active ||
      (account.provider === "telegram"
        ? telegramStatus
        : account.provider === "whatsapp"
        ? whatsappStatus
        : false);

    const handleCardClick = () => {
      if (isConnected) {
        if (account.provider === "telegram") {
          navigate("/telegram");
        } else if (account.provider === "whatsapp") {
          navigate("/whatsapp");
        }
      }
    };

    return (
      <motion.div
        key={account.provider}
        className={`message-platform-card ${
          isConnected ? "connected" : "disconnected"
        } ${account.provider}-theme`}
        onClick={handleCardClick}
        whileHover={{ scale: isConnected ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="platform-card-content">
          <div className="platform-header">
            <div className={`platform-icon bg-gradient-to-br ${gradient}`}>
              <Icon className="provider-icon" />
            </div>
            <div className="platform-info">
              <h3 className="platform-name">{name}</h3>
              <div className="connection-status">
                {isConnected ? (
                  <div className="status-active">
                    <Wifi className="status-icon" />
                    <span>{t("profile.status.connected")}</span>
                  </div>
                ) : (
                  <div className="status-inactive">
                    <WifiOff className="status-icon" />
                    <span>{t("profile.status.offline")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="platform-details">
              <div className="user-data">
                <User className="data-icon" />
                <span>@{account.username}</span>
              </div>
              <div className="security-badges">
                <div className="security-badge">
                  <Shield className="badge-icon" />
                  <span>E2E</span>
                </div>
                <div className="security-badge">
                  <Activity className="badge-icon" />
                  <span>LIVE</span>
                </div>
              </div>
            </div>
          )}

          <div className="platform-actions">
            <Button
              className={`platform-action-btn ${
                isConnected ? "disconnect-action" : "connect-action"
              } ${account.provider}-btn`}
              onClick={(e) => {
                e.stopPropagation();
                if (account.provider === "telegram") {
                  if (isConnected) {
                    handleTelegramLogout();
                  } else {
                    navigate("/telegram");
                  }
                } else if (account.provider === "whatsapp") {
                  if (isConnected) {
                    handleWhatsAppLogout();
                  } else {
                    navigate("/whatsapp");
                  }
                }
              }}
              disabled={
                !isConnected &&
                account.provider !== "telegram" &&
                account.provider !== "whatsapp"
              }
            >
              {isConnected ? (
                <Power className="action-icon" />
              ) : (
                <Zap className="action-icon" />
              )}
              <span>
                {isConnected
                  ? t("profile.action.disconnect")
                  : t("profile.action.connect")}
              </span>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="profile-container">
        <MessagingBackground />
        <div className="loading-container">
          <motion.div
            className="profile-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Loader2 className="loading-spinner" />
            <div className="loading-text">{t("profile.loading")}</div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="profile-container">
        <MessagingBackground color="general" />
        <motion.div
          className="error-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="error-icon">
            <XCircle size={64} className="text-red-500" />
          </div>
          <h2 className="error-title">{t("profile.error.title")}</h2>
          <p className="error-message">{error}</p>
          <Button className="return-home-btn" onClick={() => navigate("/home")}>
            <Home className="btn-icon" />
            {t("profile.error.returnHome")}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <MessagingBackground color="general" />

      <div className="profile-content">
        {/* Main Profile Layout - Left User Info, Right Connected Platforms */}
        <motion.div
          ref={heroRef}
          className="profile-layout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Left Side - User Profile */}
          <div className="user-profile-section">
            <div className="profile-card">
              <div className="profile-header">
                <h2 className="profile-title">chathut</h2>
                <div className="profile-divider"></div>
              </div>

              <div className="user-avatar-container">
                <Avatar className="main-avatar">
                  <AvatarImage
                    src={
                      profile?.username
                        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
                        : undefined
                    }
                    alt={profile?.username || "User"}
                  />
                  <AvatarFallback className="avatar-fallback">
                    <User size={48} />
                  </AvatarFallback>
                </Avatar>

                <motion.div
                  className="user-status-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Activity className="pulse-icon" />
                  <span>{t("profile.status.online")}</span>
                </motion.div>
              </div>

              <div className="user-info-section">
                <div className="info-item primary">
                  <User className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">{t("profile.identity")}</span>
                    <span className="info-value">
                      {profile?.username || "Anonymous"}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <Mail className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">{t("profile.email")}</span>
                    <span className="info-value">
                      {profile?.email || "No email"}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <Network className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">
                      {t("profile.activeLinks")}
                    </span>
                    <span className="info-value">
                      {profile?.connected_accounts?.filter(
                        (acc) => acc.is_active
                      ).length || 0}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <Shield className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">{t("profile.security")}</span>
                    <span className="info-value">
                      <CheckCircle className="security-check" />
                      {t("profile.encrypted")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Connected Platforms */}
          <div className="connected-platforms-section">
            <div className="platforms-header">
              <h2 className="platforms-title">
                {t("profile.connectedPlatforms")}
              </h2>
              <div className="platforms-divider"></div>
            </div>

            <motion.div
              ref={cardsRef}
              className="platforms-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {profile?.connected_accounts?.map(renderAccountCard)}
            </motion.div>
          </div>
        </motion.div>

        {/* System Control Panel */}
        <motion.div
          className="system-control-panel"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <div className="control-card">
            <div className="control-header">
              <Settings className="control-icon" />
              <span>{t("profile.system")}</span>
            </div>
            <div className="control-actions">
              <Button
                className="control-action-btn home-btn"
                onClick={() => navigate("/home")}
              >
                <Home className="action-icon" />
                <span>{t("profile.action.home")}</span>
              </Button>
              <Button
                className="control-action-btn settings-btn"
                onClick={() => navigate("/settings")}
              >
                <Settings className="action-icon" />
                <span>{t("profile.action.settings")}</span>
              </Button>
              <Button
                className="control-action-btn disconnect-btn"
                onClick={async () => {
                  // Proper logout using authService
                  await authService.logout();
                  navigate("/home");
                }}
              >
                <Power className="action-icon" />
                <span>{t("profile.action.logout")}</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
