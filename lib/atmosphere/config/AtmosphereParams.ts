import { Vector3 } from "@babylonjs/core";

export interface IAtmosphereBounds {
  bottomRadius: number; // The exact surface radius of the planet (e.g. 6360 km)
  topRadius: number;    // The absolute top edge of the atmosphere (e.g. 6460 km)
}

/**
 * Manages the physical constants and coordinate relative math
 * necessary for resolving planet-scale optical depths.
 */
export class AtmosphereParams {
  private bounds: IAtmosphereBounds;
  // Large World Coordinate (LWC) vector defining where the planet mathematically exists
  private floatingOriginCenter: Vector3;

  constructor(
    bottomRadius: number = 6360.0,
    topRadius: number = 6460.0,
    planetOrigin: Vector3 = Vector3.Zero()
  ) {
    this.bounds = { bottomRadius, topRadius };
    this.floatingOriginCenter = planetOrigin.clone();
  }

  public getBounds(): IAtmosphereBounds {
    return this.bounds;
  }

  public setPlanetOrigin(origin: Vector3) {
    this.floatingOriginCenter.copyFrom(origin);
  }

  public getPlanetOrigin(): Vector3 {
    return this.floatingOriginCenter;
  }

  /**
   * Calculates the exact scalar altitude of a camera/point above the 'sea level'
   * of the planet, entirely independent of Large World Coordinates offsets.
   * @param worldPosition The world space coordinate of the camera
   */
  public getAltitudeRelativeToSeaLevel(worldPosition: Vector3): number {
    const distanceToCore = Vector3.Distance(worldPosition, this.floatingOriginCenter);
    // Returns negative if underground/underwater
    return distanceToCore - this.bounds.bottomRadius;
  }

  /**
   * Calculates the normalized altitude (0.0 = Ground, 1.0 = Top Radius)
   */
  public getNormalizedAltitude(worldPosition: Vector3): number {
    const altitude = this.getAltitudeRelativeToSeaLevel(worldPosition);
    const thickness = this.bounds.topRadius - this.bounds.bottomRadius;
    const normalized = altitude / thickness;
    return Math.max(0.0, Math.min(1.0, normalized)); // Clamp to 0..1
  }
}
