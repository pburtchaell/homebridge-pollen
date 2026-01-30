import type {
  API,
  Characteristic,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import type { AccessoryDefinition, ParsedPollenData, PollenCategory, PollenLevel } from './types.js';

export class PollenAccessoryHandler {
  private readonly service: Service;
  private readonly Characteristic: typeof Characteristic;

  constructor(
    private readonly accessory: PlatformAccessory,
    private readonly definition: AccessoryDefinition,
    private readonly api: API,
    private readonly log: Logger,
  ) {
    this.Characteristic = this.api.hap.Characteristic;

    this.accessory.getService(this.api.hap.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Ambee')
      .setCharacteristic(this.Characteristic.Model, 'Pollen Sensor')
      .setCharacteristic(this.Characteristic.SerialNumber, definition.id);

    if (definition.type === 'airquality') {
      this.service = this.accessory.getService(this.api.hap.Service.AirQualitySensor)
        || this.accessory.addService(this.api.hap.Service.AirQualitySensor, definition.name);
    } else {
      this.service = this.accessory.getService(this.api.hap.Service.ContactSensor)
        || this.accessory.addService(this.api.hap.Service.ContactSensor, definition.name);
    }

    this.service.setCharacteristic(this.Characteristic.Name, definition.name);
  }

  updatePollenData(data: ParsedPollenData): void {
    if (this.definition.type === 'airquality') {
      this.updateAirQuality(data);
    } else {
      this.updateContactSensor(data);
    }
  }

  private updateContactSensor(data: ParsedPollenData): void {
    const category = this.definition.category as PollenCategory;
    const targetLevel = this.definition.level as PollenLevel;
    const currentLevel = data[category].level;

    const isDetected = currentLevel === targetLevel;
    const state = isDetected
      ? this.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

    this.service.updateCharacteristic(this.Characteristic.ContactSensorState, state);

    this.log.debug(
      `${this.definition.name}: ${category} level is ${currentLevel}, `
      + `sensor ${targetLevel} → ${isDetected ? 'DETECTED' : 'NOT_DETECTED'}`,
    );
  }

  private updateAirQuality(data: ParsedPollenData): void {
    const quality = this.mapCountToAirQuality(data.overall.count);

    this.service.updateCharacteristic(this.Characteristic.AirQuality, quality);

    this.log.debug(
      `${this.definition.name}: overall count=${data.overall.count}, AirQuality=${quality}`,
    );
  }

  private mapCountToAirQuality(count: number): number {
    // Map total pollen count to HomeKit AirQuality enum (0-5)
    // 0=UNKNOWN, 1=EXCELLENT, 2=GOOD, 3=FAIR, 4=INFERIOR, 5=POOR
    if (count <= 20) {
      return this.Characteristic.AirQuality.EXCELLENT;
    }
    if (count <= 80) {
      return this.Characteristic.AirQuality.GOOD;
    }
    if (count <= 200) {
      return this.Characteristic.AirQuality.FAIR;
    }
    if (count <= 400) {
      return this.Characteristic.AirQuality.INFERIOR;
    }
    return this.Characteristic.AirQuality.POOR;
  }
}
