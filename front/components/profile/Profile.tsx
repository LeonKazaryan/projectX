import React, { useEffect, useState } from "react";
import authService from "../services/authService";
import { API_BASE_URL } from "../services/authService";
import type { ProfileData, ConnectedAccount } from "../services/authService";
import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaTelegram,
  FaWhatsapp,
  FaInstagram,
  FaUser,
  FaEnvelope,
} from "react-icons/fa";
import { FiPower, FiSettings } from "react-icons/fi";

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
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const data = await authService.getProfile();
      setProfile(data);
    } catch (err) {
      console.error("Profile fetch error:", err);
      if (!authService.getAccessToken()) {
        navigate("/home");
        return;
      }
      setError("Session expired or invalid. Please log in again.");
      authService.logout();
      setTimeout(() => navigate("/home"), 3000);
    }
  };

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
      <div
        className={`account-card-wrapper ${isConnected ? "clickable" : ""}`}
        onClick={handleCardClick}
      >
        <motion.div
          key={account.provider}
          className={`account-card ${
            isConnected ? "connected" : "disconnected"
          } ${account.provider}`}
          whileHover={{
            scale: isConnected ? 1.05 : 1,
            y: isConnected ? -5 : 0,
          }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="account-card-header">
            <Icon className="account-icon" style={{ color }} />
            <h3 className="font-orbitron">
              {account.provider.charAt(0).toUpperCase() +
                account.provider.slice(1)}
            </h3>
          </div>
          <div className="account-card-body">
            <p className="font-rajdhani">
              Status:{" "}
              <span style={{ color: isConnected ? "#00ff00" : "#ff00ff" }}>
                {isConnected ? "Connected" : "Not Connected"}
              </span>
            </p>
            {isConnected && (
              <p className="font-rajdhani">As: {account.username}</p>
            )}
          </div>
          <div className="account-card-footer">
            <button
              className="cyberpunk-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent card click when clicking button
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
              <FiPower /> {isConnected ? "Logout" : "Connect"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="profile-container cyberpunk-font-rajdhani text-danger">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container cyberpunk-font-rajdhani">
        Loading Cyber-Profile...
      </div>
    );
  }

  return (
    <div className="profile-container">
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="profile-header">
          <h1 className="font-orbitron glitch-text" data-text="User Profile">
            User Profile
          </h1>
          <div className="neon-divider"></div>
        </div>
        <div className="profile-details">
          <p>
            <FaUser /> <span className="font-rajdhani">Username:</span>{" "}
            <span className="font-orbitron">{profile.username}</span>
          </p>
          <p>
            <FaEnvelope /> <span className="font-rajdhani">Email:</span>{" "}
            <span className="font-orbitron">{profile.email}</span>
          </p>
        </div>

        <div className="connected-accounts-section">
          <h2 className="font-orbitron">Connected Messengers</h2>
          <div className="accounts-grid">
            {profile.connected_accounts.map(renderAccountCard)}
          </div>
        </div>

        <div className="profile-actions">
          <button
            className="cyberpunk-btn"
            onClick={() => navigate("/settings")}
          >
            <FiSettings /> Profile Settings
          </button>
          <button
            className="cyberpunk-btn disconnect-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/home");
            }}
          >
            <FiPower /> Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
