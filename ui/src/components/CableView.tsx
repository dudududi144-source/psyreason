import { useState, useRef } from 'react';

export interface CableViewDevice {
  id: string;
  name: string;
  x: number;
  y: number;
  inputs: { id: string; name: string; type: 'audio' | 'cv' }[];
  outputs: { id: string; name: string; type: 'audio' | 'cv' }[];
}

export interface CableViewCable {
  id: string;
  fromPort: string;
  toPort: string;
  type: 'audio' | 'cv';
}

interface CableViewProps {
  devices: CableViewDevice[];
  cables: CableViewCable[];
  onConnect?: (fromPort: string, toPort: string, type: 'audio' | 'cv') => void;
  onDisconnect?: (cableId: string) => void;
}

const DEVICE_WIDTH = 220;
const PORT_SPACING = 24;
const DEVICE_HEADER = 36;

export default function CableView({ devices, cables, onConnect, onDisconnect }: CableViewProps) {
  const [dragCable, setDragCable] = useState<{ fromPort: string; x: number; y: number; type: 'audio' | 'cv' } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate port position on screen
  const getPortPosition = (portId: string): { x: number; y: number } | null => {
    for (const device of devices) {
      // Outputs on right side
      const outIndex = device.outputs.findIndex((p) => p.id === portId);
      if (outIndex >= 0) {
        return {
          x: device.x + DEVICE_WIDTH,
          y: device.y + DEVICE_HEADER + outIndex * PORT_SPACING + 12,
        };
      }
      // Inputs on left side
      const inIndex = device.inputs.findIndex((p) => p.id === portId);
      if (inIndex >= 0) {
        return {
          x: device.x,
          y: device.y + DEVICE_HEADER + inIndex * PORT_SPACING + 12,
        };
      }
    }
    return null;
  };

  const handlePortMouseDown = (portId: string, type: 'audio' | 'cv', isOutput: boolean, e: React.MouseEvent) => {
    if (!isOutput) return; // cables start from outputs only
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragCable({
      fromPort: portId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      type,
    });
  };

  const handlePortMouseUp = (portId: string, type: 'audio' | 'cv', isOutput: boolean) => {
    if (isOutput || !dragCable) return;
    if (dragCable.type !== type) return; // type must match
    onConnect?.(dragCable.fromPort, portId, type);
    setDragCable(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragCable) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragCable({
      ...dragCable,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const renderCablePath = (fromPos: { x: number; y: number }, toPos: { x: number; y: number }): string => {
    // Bezier curve for natural cable droop
    const dx = Math.abs(toPos.x - fromPos.x);
    const droop = Math.min(60, dx * 0.3);
    return 'M ' + fromPos.x + ' ' + fromPos.y +
      ' C ' + (fromPos.x + 40) + ' ' + (fromPos.y + droop) +
      ', ' + (toPos.x - 40) + ' ' + (toPos.y + droop) +
      ', ' + toPos.x + ' ' + toPos.y;
  };

  return (
    <div className="cable-view">
      <div className="cable-view-header">
        <h2>CABLE VIEW - Back of Rack</h2>
        <span className="hint">Drag from output (right) to input (left) to connect. Click cable to disconnect.</span>
      </div>
      <svg
        ref={svgRef}
        className="cable-canvas"
        width="100%"
        height="600"
        onMouseMove={handleMouseMove}
        onMouseUp={() => setDragCable(null)}
      >
        {/* Render cables */}
        {cables.map((cable) => {
          const fromPos = getPortPosition(cable.fromPort);
          const toPos = getPortPosition(cable.toPort);
          if (!fromPos || !toPos) return null;
          const color = cable.type === 'audio' ? '#ff6600' : '#00aaff';
          return (
            <path
              key={cable.id}
              d={renderCablePath(fromPos, toPos)}
              stroke={color}
              strokeWidth={3}
              fill="none"
              className="cable-path"
              onClick={() => onDisconnect?.(cable.id)}
            />
          );
        })}

        {/* Render drag cable */}
        {dragCable && (() => {
          const fromPos = getPortPosition(dragCable.fromPort);
          if (!fromPos) return null;
          return (
            <path
              d={renderCablePath(fromPos, { x: dragCable.x, y: dragCable.y })}
              stroke={dragCable.type === 'audio' ? '#ff6600' : '#00aaff'}
              strokeWidth={3}
              fill="none"
              opacity={0.6}
              strokeDasharray="5,5"
            />
          );
        })()}

        {/* Render devices */}
        {devices.map((device) => {
          const height = DEVICE_HEADER + Math.max(device.inputs.length, device.outputs.length) * PORT_SPACING + 12;
          return (
            <g key={device.id} transform={'translate(' + device.x + ',' + device.y + ')'}>
              {/* Device body */}
              <rect
                width={DEVICE_WIDTH}
                height={height}
                fill="#1a1a25"
                stroke="#2a2a3a"
                strokeWidth={1}
                rx={4}
              />
              {/* Device name */}
              <text x={DEVICE_WIDTH / 2} y={22} textAnchor="middle" fill="#00ff88" fontSize={12}>
                {device.name}
              </text>
              {/* Input ports (left) */}
              {device.inputs.map((port, i) => (
                <g key={port.id} transform={'translate(0,' + (DEVICE_HEADER + i * PORT_SPACING) + ')'}>
                  <circle
                    cx={0}
                    cy={12}
                    r={6}
                    fill="#12121a"
                    stroke={port.type === 'audio' ? '#ff6600' : '#00aaff'}
                    strokeWidth={2}
                    className="port"
                    onMouseUp={() => handlePortMouseUp(port.id, port.type, false)}
                  />
                  <text x={12} y={16} fill="#8888aa" fontSize={9}>{port.name}</text>
                </g>
              ))}
              {/* Output ports (right) */}
              {device.outputs.map((port, i) => (
                <g key={port.id} transform={'translate(' + DEVICE_WIDTH + ',' + (DEVICE_HEADER + i * PORT_SPACING) + ')'}>
                  <circle
                    cx={0}
                    cy={12}
                    r={6}
                    fill="#12121a"
                    stroke={port.type === 'audio' ? '#ff6600' : '#00aaff'}
                    strokeWidth={2}
                    className="port"
                    onMouseDown={(e) => handlePortMouseDown(port.id, port.type, true, e)}
                  />
                  <text x={-12} y={16} textAnchor="end" fill="#8888aa" fontSize={9}>{port.name}</text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
