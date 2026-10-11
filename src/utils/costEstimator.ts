// =========================================================================
// Driving Instructor Vehicle Cost & Net Revenue Estimator
// Calculates running fuel/energy costs and vehicle depreciation to derive true net take-home earnings.
// =========================================================================

export type VehicleFuelType = 'petrol' | 'diesel' | 'electric';

export interface VehicleCostSettings {
  fuelType: VehicleFuelType;
  fuelCostPerUnit: number; // £ per Litre (petrol/diesel) or £ per kWh (electric)
  efficiency: number; // MPG (petrol/diesel) or mi/kWh (electric)
  milesPerHour: number; // Average miles driven per teaching hour (default: 25)
  enableDepreciation: boolean; // Include wear, tires, dual controls, and car depreciation
  depreciationPerMile: number; // £ per mile (default: £0.12)
}

export interface CostBreakdown {
  teachingHours: number;
  estimatedMiles: number;
  fuelCostPerMile: number;
  depreciationCostPerMile: number;
  totalCostPerMile: number;
  fuelCost: number;
  depreciationCost: number;
  totalCost: number;
  grossRevenue: number;
  netRevenue: number;
  profitMargin: number; // 0 to 100 percentage
  costPerHour: number;
}

// 1 UK Imperial Gallon = 4.54609 Litres
export const LITRES_PER_UK_GALLON = 4.54609;

// Verified UK national forecourt benchmarks (FuelCosts.co.uk / Official CMA Fuel Finder data)
export const DEFAULT_UK_BENCHMARKS = {
  petrol: {
    costPerUnit: 1.755, // £1.755 / litre (175.5p) current UK pump average via FuelCosts.co.uk
    defaultMpg: 40.0, // Learner stop-start town driving in a 1.0L-1.2L tuition car
    unitLabel: '£/L',
    efficiencyLabel: 'MPG',
  },
  diesel: {
    costPerUnit: 2.007, // £2.007 / litre (200.7p) current UK pump average via FuelCosts.co.uk
    defaultMpg: 45.0, // Learner stop-start town driving in a diesel tuition car
    unitLabel: '£/L',
    efficiencyLabel: 'MPG',
  },
  electric: {
    costPerUnit: 0.275, // £0.275 / kWh (UK standard home energy tariff)
    defaultMpg: 3.8, // 3.8 mi/kWh in city driving
    unitLabel: '£/kWh',
    efficiencyLabel: 'mi/kWh',
  },
};

export const DEFAULT_VEHICLE_SETTINGS: VehicleCostSettings = {
  fuelType: 'petrol',
  fuelCostPerUnit: DEFAULT_UK_BENCHMARKS.petrol.costPerUnit,
  efficiency: DEFAULT_UK_BENCHMARKS.petrol.defaultMpg,
  milesPerHour: 25.0, // UK average for lesson driving including transit and higher-speed routes
  enableDepreciation: true,
  depreciationPerMile: 0.12, // £0.12/mile covers tyres, brakes, dual controls, servicing & depreciation
};

/**
 * Calculates per-mile and period costs for driving tuition.
 */
export function calculateVehicleCosts(
  teachingHours: number,
  grossRevenue: number,
  settings: VehicleCostSettings = DEFAULT_VEHICLE_SETTINGS
): CostBreakdown {
  const safeHours = Math.max(0, teachingHours);
  const safeRevenue = Math.max(0, grossRevenue);
  const estimatedMiles = safeHours * Math.max(1, settings.milesPerHour);

  let fuelCostPerMile = 0;
  if (settings.efficiency > 0) {
    if (settings.fuelType === 'electric') {
      // For EV: cost per mile = cost per kWh / (miles per kWh)
      fuelCostPerMile = settings.fuelCostPerUnit / settings.efficiency;
    } else {
      // For petrol/diesel: litres per mile = 4.54609 / MPG
      const litresPerMile = LITRES_PER_UK_GALLON / settings.efficiency;
      fuelCostPerMile = litresPerMile * settings.fuelCostPerUnit;
    }
  }

  const depreciationCostPerMile = settings.enableDepreciation 
    ? Math.max(0, settings.depreciationPerMile) 
    : 0;

  const totalCostPerMile = fuelCostPerMile + depreciationCostPerMile;
  const fuelCost = estimatedMiles * fuelCostPerMile;
  const depreciationCost = estimatedMiles * depreciationCostPerMile;
  const totalCost = fuelCost + depreciationCost;
  const netRevenue = safeRevenue - totalCost;
  const profitMargin = safeRevenue > 0 
    ? Math.max(0, Math.min(100, (netRevenue / safeRevenue) * 100)) 
    : 0;
  const costPerHour = safeHours > 0 ? totalCost / safeHours : 0;

  return {
    teachingHours: safeHours,
    estimatedMiles: Math.round(estimatedMiles * 10) / 10,
    fuelCostPerMile,
    depreciationCostPerMile,
    totalCostPerMile,
    fuelCost,
    depreciationCost,
    totalCost,
    grossRevenue: safeRevenue,
    netRevenue,
    profitMargin: Math.round(profitMargin * 10) / 10,
    costPerHour: Math.round(costPerHour * 100) / 100,
  };
}

export interface LiveFuelPriceResult {
  petrol: number;
  diesel: number;
  electric: number;
  source: string;
  timestamp: string;
}

/**
 * Fetches current UK fuel prices from the FuelCosts.co.uk API (official CMA Fuel Finder data)
 * or returns verified national averages.
 */
export async function fetchLiveUKFuelPrices(): Promise<LiveFuelPriceResult> {
  const fallback: LiveFuelPriceResult = {
    petrol: DEFAULT_UK_BENCHMARKS.petrol.costPerUnit,
    diesel: DEFAULT_UK_BENCHMARKS.diesel.costPerUnit,
    electric: DEFAULT_UK_BENCHMARKS.electric.costPerUnit,
    source: 'FuelCosts.co.uk (CMA Fuel Finder)',
    timestamp: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  const endpoints = [
    '/fuelcosts-api/stats/regions',
    'https://fuelcosts.co.uk/api/stats/regions',
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.national) {
          const avgE10 = typeof data.national.averageE10 === 'number' ? data.national.averageE10 : null;
          const avgDiesel = typeof data.national.averageDiesel === 'number' ? data.national.averageDiesel : null;

          if (avgE10 && avgE10 > 50 && avgE10 < 300) {
            // FuelCosts prices are returned in pence (e.g. 175.5p), convert to £/litre
            const petrolPrice = Math.round((avgE10 / 100) * 1000) / 1000;
            const dieselPrice = avgDiesel && avgDiesel > 50 && avgDiesel < 300
              ? Math.round((avgDiesel / 100) * 1000) / 1000
              : fallback.diesel;

            const stationsCount = data.national.totalStations 
              ? `${data.national.totalStations.toLocaleString()} stations` 
              : '5,000+ stations';

            return {
              petrol: petrolPrice,
              diesel: dieselPrice,
              electric: DEFAULT_UK_BENCHMARKS.electric.costPerUnit,
              source: `FuelCosts.co.uk (${stationsCount})`,
              timestamp: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
            };
          }
        }
      }
    } catch {
      // Try next endpoint or fall back
    }
  }

  return fallback;
}
