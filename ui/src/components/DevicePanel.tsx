import Knob from './Knob';

interface Device {
  id: string;
  name: string;
  type: string;
  color?: string;
  params: Record<string, number>;
}

interface DevicePanelProps {
  device: Device;
}

export default function DevicePanel({ device }: DevicePanelProps) {
  const accentColor = device.color || '#00ff88';
  return (
    <div className="device-panel" style={{ borderColor: accentColor + '44' }}>
      <div className="device-header" style={{ borderBottom: '1px solid ' + accentColor + '44' }}>
        <span className="device-title" style={{ color: accentColor }}>{device.name}</span>
        <span className="device-type">{device.type}</span>
      </div>
      <div className="device-params">
        {Object.entries(device.params).map(([key, value]) => (
          <Knob key={key} label={key} value={value} color={accentColor} />
        ))}
      </div>
    </div>
  );
}
