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

const providerDetails: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  telegram: { icon: FaTelegram, color: "#0088cc" },
  whatsapp: { icon: FaWhatsapp, color: "#25D366" },
  instagram: { icon: FaInstagram, color: "#E4405F" },
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getProfile();
      setProfile(data);
      setError(null);
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

  const renderAccountCard = (account: ConnectedAccount) => {
    const details = providerDetails[account.provider];
    if (!details) return null;

    const { icon: Icon, color } = details;
    const isConnected = account.is_active;

    const handleCardClick = () => {
      if (isConnected && account.provider === "telegram") {
        navigate("/telegram");
      }
    };

    return (
      <motion.div
        key={account.provider}
        className={`cyber-messenger-card ${
          isConnected ? "connected" : "disconnected"
        }`}
        onClick={handleCardClick}
        whileHover={{ scale: isConnected ? 1.02 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <HolographicCard className="messenger-card-content">
          <div className="messenger-card-header">
            <div className="messenger-icon-container">
              <Hexagon size={80} className="messenger-hexagon">
                <Icon
                  className="messenger-icon"
                  style={{ color, fontSize: "2.5rem" }}
                />
              </Hexagon>
            </div>
            <div className="messenger-info">
              <h3 className="font-orbitron messenger-title">
                {account.provider.charAt(0).toUpperCase() +
                  account.provider.slice(1)}
              </h3>
              <div className="status-indicator">
                {isConnected ? (
                  <CheckCircle className="status-icon connected" />
                ) : (
                  <XCircle className="status-icon disconnected" />
                )}
                <span className="status-text font-rajdhani">
                  {isConnected ? "ACTIVE" : "OFFLINE"}
                </span>
              </div>
            </div>
          </div>

          {isConnected && (
            <div className="messenger-details">
              <div className="detail-item">
                <User className="detail-icon" />
                <span className="font-rajdhani">@{account.username}</span>
              </div>
              <div className="cyber-stats">
                <div className="stat-item">
                  <Activity className="stat-icon" />
                  <span className="font-rajdhani">Online</span>
                </div>
                <div className="stat-item">
                  <Shield className="stat-icon" />
                  <span className="font-rajdhani">Encrypted</span>
                </div>
              </div>
            </div>
          )}

          <div className="messenger-actions">
            <Button
              className={`cyberpunk-btn messenger-btn ${
                isConnected ? "disconnect-btn" : "connect-btn"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (account.provider === "telegram") {
                  if (isConnected) {
                    handleTelegramLogout();
                  } else {
                    navigate("/telegram");
                  }
                }
              }}
              disabled={!isConnected && account.provider !== "telegram"}
            >
              {isConnected ? (
                <Power className="btn-icon" />
              ) : (
                <Zap className="btn-icon" />
              )}
              <span className="font-rajdhani">
                {isConnected ? "DISCONNECT" : "CONNECT"}
              </span>
            </Button>
          </div>
        </HolographicCard>
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

      <div className="profile-content">
        {/* Hero Section */}
        <motion.div
          ref={heroRef}
          className="profile-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <div className="hero-header">
            <GlitchText className="hero-title font-orbitron">
              NEURAL PROFILE
            </GlitchText>
            <div className="cyber-divider"></div>
          </div>

          <div className="user-avatar-section">
            <Hexagon size={120} className="avatar-hexagon">
              <div className="avatar-container">
                <Avatar className="cyber-avatar">
                  <AvatarImage
                    src={
                      profile?.username
                        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`
                        : undefined
                    }
                    alt={profile?.username || "User"}
                  />
                  <AvatarFallback className="cyber-avatar-fallback">
                    <Terminal size={48} className="avatar-icon" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </Hexagon>
            <motion.div
              className="user-status"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="status-badge">
                <Activity className="status-pulse" />
                <span className="font-rajdhani">ONLINE</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* User Info Cards */}
        <div className="user-info-grid">
          <HolographicCard className="info-card">
            <div className="info-header">
              <User className="info-icon" />
              <span className="font-orbitron">IDENTITY</span>
            </div>
            <div className="info-value font-rajdhani">
              {profile?.username || "Anonymous"}
            </div>
          </HolographicCard>

          <HolographicCard className="info-card">
            <div className="info-header">
              <Mail className="info-icon" />
              <span className="font-orbitron">COMM CHANNEL</span>
            </div>
            <div className="info-value font-rajdhani">
              {profile?.email || "No comm channel"}
            </div>
          </HolographicCard>

          <HolographicCard className="info-card">
            <div className="info-header">
              <Network className="info-icon" />
              <span className="font-orbitron">CONNECTIONS</span>
            </div>
            <div className="info-value font-rajdhani">
              {profile?.connected_accounts.filter((acc) => acc.is_active)
                .length || 0}{" "}
              Active
            </div>
          </HolographicCard>

          <HolographicCard className="info-card">
            <div className="info-header">
              <Shield className="info-icon" />
              <span className="font-orbitron">SECURITY</span>
            </div>
            <div className="info-value font-rajdhani">
              <CheckCircle className="security-icon" />
              ENCRYPTED
            </div>
          </HolographicCard>
        </div>

        {/* Messenger Connections */}
        <motion.div
          className="messengers-section"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="section-header">
            <GlitchText className="section-title font-orbitron">
              NEURAL INTERFACES
            </GlitchText>
            <div className="cyber-divider-small"></div>
          </div>

          <motion.div
            ref={cardsRef}
            className="messengers-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {profile?.connected_accounts.map(renderAccountCard)}
          </motion.div>
        </motion.div>

        {/* Control Panel */}
        <motion.div
          className="control-panel"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <HolographicCard className="control-card">
            <div className="control-header">
              <Cpu className="control-icon" />
              <span className="font-orbitron">SYSTEM CONTROL</span>
            </div>
            <div className="control-actions">
              <Button
                className="cyberpunk-btn control-btn"
                onClick={() => navigate("/home")}
              >
                <Home className="btn-icon" />
                <span className="font-rajdhani">HOME</span>
              </Button>
              <Button
                className="cyberpunk-btn control-btn"
                onClick={() => navigate("/settings")}
              >
                <Settings className="btn-icon" />
                <span className="font-rajdhani">CONFIGURE</span>
              </Button>
              <Button
                className="cyberpunk-btn control-btn disconnect-btn"
                onClick={() => {
                  localStorage.clear();
                  navigate("/home");
                }}
              >
                <Power className="btn-icon" />
                <span className="font-rajdhani">DISCONNECT</span>
              </Button>
            </div>
          </HolographicCard>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
