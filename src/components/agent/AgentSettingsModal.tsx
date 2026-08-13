import SettingsPanel from '../shared/SettingsPanel';

interface AgentSettingsModalProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  fontSize: 'sm' | 'base' | 'lg';
  setFontSize: (size: 'sm' | 'base' | 'lg') => void;
  simNotifications: boolean;
  handleToggleSimNotifications: () => void;
  lowStockNotifications: boolean;
  handleToggleLowStockNotifications: () => void;
  onLogout?: () => void;
  onConfirmLogout?: () => void;
  handleConfirmLogout?: () => void;
  username: string;
  biometricEnabled?: boolean;
  handleToggleBiometric?: () => void;
  biometricInAppearance?: boolean;
}

export default function AgentSettingsModal({
  settingsOpen,
  setSettingsOpen,
  darkMode,
  setDarkMode,
  fontSize,
  setFontSize,
  simNotifications,
  handleToggleSimNotifications,
  lowStockNotifications,
  handleToggleLowStockNotifications,
  onLogout,
  onConfirmLogout,
  handleConfirmLogout,
  username,
  biometricEnabled,
  handleToggleBiometric
}: AgentSettingsModalProps) {
  return (
    <SettingsPanel
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      fontSize={fontSize}
      setFontSize={setFontSize}
      biometricEnabled={biometricEnabled}
      onToggleBiometric={handleToggleBiometric}
      biometricInAppearance
      simNotifications={simNotifications}
      onToggleSimNotifications={handleToggleSimNotifications}
      lowStockNotifications={lowStockNotifications}
      onToggleLowStockNotifications={handleToggleLowStockNotifications}
      onLogout={() => {
        if (handleConfirmLogout) handleConfirmLogout();
        else if (onConfirmLogout) onConfirmLogout();
        else if (onLogout) onLogout();
      }}
    />
  );
}
