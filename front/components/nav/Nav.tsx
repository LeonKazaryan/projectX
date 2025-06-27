import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NavProps {
  onLogout: () => void;
  onSettingsClick: () => void;
  // Add other props like user info as needed
}

export const Nav: React.FC<NavProps> = ({ onLogout, onSettingsClick }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-2 px-4 h-14 bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          {/* Placeholder, replace with actual user data */}
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">Username</p>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <Home className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettingsClick}>
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
