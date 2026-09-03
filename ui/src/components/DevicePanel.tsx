import Knob from './Knob';

interface Device {
  id: string;
  name: string;
  type: string;
  params: Record<string, number>;
}

interface DevicePanelProps {
  device: Device;
}

export default function DevicePanel({ device }: DevicePanelProps) {
  return (
    <div className="device-panel">
      <div className="device-header">
        <span className="device-title">{device.name}</span>
        <span className="device-type">{device.type}</span>
      </div>
      <div className="device-params">
        {Object.entries(device.params).map(([key, value]) => (
          <Knob key={key} label={key} value={value} />
        ))}
      </div>
    </div>
  );
}
