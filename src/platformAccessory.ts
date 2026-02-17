import type {
  API,
  Characteristic,
  Logger,
  PlatformAccessory,
  Service,
} from "homebridge";
import type { AccessoryDefinition, ParsedPollenData, PollenCategory } from "./types.js";

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
      .setCharacteristic(this.Characteristic.Manufacturer, "Google")
      .setCharacteristic(this.Characteristic.Model, "Pollen Sensor")
      .setCharacteristic(this.Characteristic.SerialNumber, definition.id);

    this.service = this.accessory.getService(this.api.hap.Service.AirQualitySensor)
      || this.accessory.addService(this.api.hap.Service.AirQualitySensor, definition.name);

    this.service.setCharacteristic(this.Characteristic.Name, definition.name);
  }

  updatePollenData(data: ParsedPollenData): void {
    const category = this.definition.category as PollenCategory;
    const index = data[category].index;
    const quality = this.mapIndexToAirQuality(index);

    this.service.updateCharacteristic(this.Characteristic.AirQuality, quality);

    this.log.debug(
      `${this.definition.name}: ${category} index=${index}, AirQuality=${quality}`,
    );
  }

  private mapIndexToAirQuality(index: number): number {
    // Map Google UPI (0-5) to HomeKit AirQuality enum (0-5)
    // 0=UNKNOWN, 1=EXCELLENT, 2=GOOD, 3=FAIR, 4=INFERIOR, 5=POOR
    switch (index) {
      case 0: // None
      case 1: // Very Low
        return this.Characteristic.AirQuality.EXCELLENT;
      case 2: // Low
        return this.Characteristic.AirQuality.GOOD;
      case 3: // Moderate
        return this.Characteristic.AirQuality.FAIR;
      case 4: // High
        return this.Characteristic.AirQuality.INFERIOR;
      case 5: // Very High
        return this.Characteristic.AirQuality.POOR;
      default:
        return this.Characteristic.AirQuality.UNKNOWN;
    }
  }
}
