/**
 * Smart Tennis Arena — Contratos Administrativos, Dispositivos IoT, Categorias e Incidentes de Segurança
 * Alinhado com: RF05, RF17, RF22, RF23 e Seção 5 (Cibersegurança do IoT e Segurança Física)
 */

export type IoTTransportType = 'USB_SERIAL' | 'WIFI_WS' | 'BLE' | 'SIMULATOR';

export type IoTDeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'FAULT';

export type SafetyIncidentType =
  | 'EMERGENCY_STOP'
  | 'SENSOR_INCONSISTENT'
  | 'COMMUNICATION_LOSS'
  | 'AREA_UNSAFE'
  | 'ACTUATOR_FAULT';

export interface CategoryRecord {
  id: number;
  slug: string;
  code: string;
  name: string;
  description: string;
  targetAudience: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface IoTDeviceRecord {
  id: number;
  deviceCode: string;
  name: string;
  hardwareModel: string;
  firmwareVersion: string;
  transportType: IoTTransportType;
  status: IoTDeviceStatus;
  piezoThresholds: number[];
  sensorHealth: Record<string, string>;
  lastSeenAt: string | null;
  pairedByUserId: number | null;
  active: boolean;
  createdAt: string;
}

export interface PairIoTDeviceDto {
  deviceCode: string;
  pairingToken: string;
  firmwareVersion?: string;
  transportType?: IoTTransportType;
  piezoThresholds?: number[];
  sensorHealth?: Record<string, string>;
}

export interface ReportSafetyIncidentDto {
  incidentType: SafetyIncidentType;
  source: string;
  reason: string;
  sessionId?: number | null;
  deviceCode?: string | null;
  correlationId?: string | null;
}

export interface SafetyIncidentRecord {
  id: number;
  sessionId: number | null;
  userId: number | null;
  userName: string | null;
  deviceCode: string | null;
  incidentType: SafetyIncidentType;
  source: string;
  reason: string;
  correlationId: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  createdAt: string;
}

export interface SystemSettingRecord {
  settingKey: string;
  settingValue: string;
  valueType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description: string;
  updatedByUserId: number | null;
  updatedAt: string;
}

