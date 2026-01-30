import type {
  API,
  Characteristic,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import type { AccessoryDefinition, ParsedPollenData, PollenCategory } from './types.js';

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

    this.service = this.accessory.getService(this.api.hap.Service.AirQualitySensor)
      || this.accessory.addService(this.api.hap.Service.AirQualitySensor, definition.name);

    this.service.setCharacteristic(this.Characteristic.Name, definition.name);
  }

  updatePollenData(data: ParsedPollenData): void {
    const category = this.definition.category as PollenCategory;
    const count = data[category].count;
    const quality = this.mapCountToAirQuality(count);

    this.service.updateCharacteristic(this.Characteristic.AirQuality, quality);

    this.log.debug(
      `${this.definition.name}: ${category} count=${count}, AirQuality=${quality}`,
    );
  }

  private mapCountToAirQuality(count: number): number {
    // Map pollen count to HomeKit AirQuality enum (0-5)
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
