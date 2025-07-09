import React, { useEffect, useState, useRef } from "react";
import authService from "../services/authService";
import { API_BASE_URL } from "../services/authService";
import type { ProfileData, ConnectedAccount } from "../services/authService";

import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  FaTelegram,
  FaWhatsapp,
  FaInstagram,
  FaUser,
  FaEnvelope,
} from "react-icons/fa";
import {
  FiPower,
  FiSettings,
  FiUser,
  FiMail,
  FiActivity,
  FiZap,
  FiShield,
} from "react-icons/fi";
import {
  User,
  Mail,
  Shield,
  Zap,
  Activity,
  Settings,
  Power,
  Terminal,
  Cpu,
  Network,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Home,
  Wifi,
  WifiOff,
} from "lucide-react";
import ParticleBackground from "../cyberpunk/ParticleBackground";
import GlitchText from "../cyberpunk/GlitchText";
import HolographicCard from "../cyberpunk/HolographicCard";
import Hexagon from "../cyberpunk/Hexagon";
import { Button } from "../../src/components/ui/button";
import { Card } from "../../src/components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "../../src/components/ui/avatar";
import { useMessagingStore } from "../messaging/MessagingStore";

const providerDetails: Record<
  string,
  { icon: React.ElementType; color: string; gradient: string; name: string }
> = {
  telegram: {
    icon: FaTelegram,
    color: "#0088cc",
    gradient: "from-blue-500 to-cyan-400",
    name: "Telegram",
  },
  whatsapp: {
    icon: FaWhatsapp,
    color: "#25D366",
    gradient: "from-green-500 to-emerald-400",
    name: "WhatsApp",
  },
  instagram: {
    icon: FaInstagram,
    color: "#E4405F",
    gradient: "from-purple-500 to-pink-400",
    name: "Instagram",
  },
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
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
        rotationY: -15,
      });

      gsap.to(cardsRef.current.children, {
        scale: 1,
        rotationY: 0,
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

    const { icon: Icon, color, gradient, name } = details;
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
        className={`neural-interface-card ${
          isConnected ? "connected" : "disconnected"
        } ${account.provider}-theme`}
        onClick={handleCardClick}
        whileHover={{ scale: isConnected ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="neural-connection-line">
          <div
            className={`connection-flow ${isConnected ? "active" : "inactive"}`}
          ></div>
        </div>

        <div className="interface-card-glass">
          <div className="interface-header">
            <div className={`interface-icon bg-gradient-to-br ${gradient}`}>
              <Icon className="provider-icon" />
            </div>
            <div className="interface-info">
              <h3 className="font-orbitron interface-name">{name}</h3>
              <div className="connection-status">
                {isConnected ? (
                  <div className="status-active">
                    <Wifi className="status-icon" />
                    <span className="font-rajdhani">CONNECTED</span>
                  </div>
                ) : (
                  <div className="status-inactive">
                    <WifiOff className="status-icon" />
                    <span className="font-rajdhani">OFFLINE</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="interface-details">
              <div className="user-data">
                <User className="data-icon" />
                <span className="font-rajdhani">@{account.username}</span>
              </div>
              <div className="security-badges">
                <div className="security-badge">
                  <Shield className="badge-icon" />
                  <span className="font-rajdhani">E2E</span>
                </div>
                <div className="security-badge">
                  <Activity className="badge-icon" />
                  <span className="font-rajdhani">LIVE</span>
                </div>
              </div>
            </div>
          )}

          <div className="interface-actions">
            <Button
              className={`neural-action-btn ${
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
              <span className="font-rajdhani">
                {isConnected ? "DISCONNECT" : "CONNECT"}
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
      <div className="cyber-profile-container">
        <ParticleBackground />
        <div className="cyber-grid-overlay"></div>
        <div className="loading-container">
          <motion.div
            className="cyber-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Loader2 className="loading-spinner" />
            <GlitchText className="loading-text font-orbitron">
              ACCESSING NEURAL INTERFACE...
            </GlitchText>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="cyber-profile-container">
        <ParticleBackground />
        <div className="cyber-grid-overlay"></div>
        <motion.div
          className="error-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="error-icon">
            <XCircle size={64} className="text-red-500" />
          </div>
          <GlitchText className="error-title font-orbitron">
            SYSTEM ERROR
          </GlitchText>
          <p className="error-message font-rajdhani">{error}</p>
          <Button className="cyberpunk-btn" onClick={() => navigate("/home")}>
            <Terminal className="btn-icon" />
            RETURN TO HUB
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="cyber-profile-container">
      <ParticleBackground />
      <div className="cyber-grid-overlay"></div>

      <div className="profile-content-new">
        {/* Main Profile Layout - Left User Info, Right Neural Interfaces */}
        <motion.div
          ref={heroRef}
          className="profile-layout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* Left Side - User Profile */}
          <div className="user-profile-section">
            <div className="profile-glass-card">
              <div className="profile-header">
                <GlitchText className="profile-title font-orbitron">
                  chathut
                </GlitchText>
                <div className="neural-divider"></div>
              </div>

              <div className="user-avatar-container">
                <div className="avatar-brain-center">
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
                      <Terminal size={48} className="avatar-terminal" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="neural-pulse"></div>
                </div>

                <motion.div
                  className="user-status-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Activity className="pulse-icon" />
                  <span className="font-rajdhani">ONLINE</span>
                </motion.div>
              </div>

              <div className="user-info-section">
                <div className="info-item primary">
                  <User className="info-icon" />
                  <div className="info-content">
                    <span className="info-label font-rajdhani">IDENTITY</span>
                    <span className="info-value font-orbitron">
                      {profile?.username || "Anonymous"}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <Mail className="info-icon" />
                  <div className="info-content">
                    <span className="info-label font-rajdhani">CHANNEL</span>
                    <span className="info-value font-rajdhani">
                      {profile?.email || "No channel"}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <Network className="info-icon" />
                  <div className="info-content">
                    <span className="info-label font-rajdhani">
                      ACTIVE LINKS
                    </span>
                    <span className="info-value font-rajdhani">
                      {profile?.connected_accounts.filter(
                        (acc) => acc.is_active
                      ).length || 0}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <Shield className="info-icon" />
                  <div className="info-content">
                    <span className="info-label font-rajdhani">SECURITY</span>
                    <span className="info-value font-rajdhani">
                      <CheckCircle className="security-check" />
                      ENCRYPTED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Neural Interfaces */}
          <div className="neural-interfaces-section">
            <div className="interfaces-header">
              <GlitchText className="interfaces-title font-orbitron">
                NEURAL INTERFACES
              </GlitchText>
              <div className="neural-divider"></div>
            </div>

            <motion.div
              ref={cardsRef}
              className="interfaces-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {profile?.connected_accounts.map(renderAccountCard)}
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
          <div className="control-glass-card">
            <div className="control-header">
              <Cpu className="control-icon" />
              <span className="font-orbitron">SYSTEM CONTROL</span>
            </div>
            <div className="control-actions">
              <Button
                className="control-action-btn home-btn"
                onClick={() => navigate("/home")}
              >
                <Home className="action-icon" />
                <span className="font-rajdhani">HOME</span>
              </Button>
              <Button
                className="control-action-btn settings-btn"
                onClick={() => navigate("/settings")}
              >
                <Settings className="action-icon" />
                <span className="font-rajdhani">CONFIGURE</span>
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
                <span className="font-rajdhani">DISCONNECT</span>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
