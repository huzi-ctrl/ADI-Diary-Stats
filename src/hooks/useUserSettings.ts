import { useState, useMemo, useEffect } from 'react';
import { DEFAULT_MASTER_GEMINI_KEY } from '../utils/aiHelper';
import { 
  type VehicleCostSettings, 
  type VehicleFuelType, 
  DEFAULT_VEHICLE_SETTINGS, 
  DEFAULT_UK_BENCHMARKS 
} from '../utils/costEstimator';

export interface UserSettings {
  hourlyRate: number;
  setHourlyRate: React.Dispatch<React.SetStateAction<number>>;
  testRate: number;
  setTestRate: React.Dispatch<React.SetStateAction<number>>;
  nonPayingStudents: string;
  setNonPayingStudents: React.Dispatch<React.SetStateAction<string>>;
  nonPayingList: string[];
  theme: 'dark' | 'light';
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  toggleTheme: () => void;
  capacityMode: 'historical' | 'custom';
  setCapacityMode: React.Dispatch<React.SetStateAction<'historical' | 'custom'>>;
  customIdealHours: Record<number, number>;
  setCustomIdealHours: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  enableAiInsights: boolean;
  setEnableAiInsights: React.Dispatch<React.SetStateAction<boolean>>;
  aiProvider: 'gemini' | 'openai';
  setAiProvider: React.Dispatch<React.SetStateAction<'gemini' | 'openai'>>;
  aiModel: string;
  setAiModel: React.Dispatch<React.SetStateAction<string>>;
  aiApiKey: string;
  setAiApiKey: React.Dispatch<React.SetStateAction<string>>;
  googleClientId: string;
  setGoogleClientId: React.Dispatch<React.SetStateAction<string>>;
  outlookClientId: string;
  setOutlookClientId: React.Dispatch<React.SetStateAction<string>>;
  excludedYears: number[];
  setExcludedYears: React.Dispatch<React.SetStateAction<number[]>>;
  vehicleFuelType: VehicleFuelType;
  setVehicleFuelType: React.Dispatch<React.SetStateAction<VehicleFuelType>>;
  fuelCostPerUnit: number;
  setFuelCostPerUnit: React.Dispatch<React.SetStateAction<number>>;
  fuelEfficiency: number;
  setFuelEfficiency: React.Dispatch<React.SetStateAction<number>>;
  milesPerHour: number;
  setMilesPerHour: React.Dispatch<React.SetStateAction<number>>;
  enableDepreciation: boolean;
  setEnableDepreciation: React.Dispatch<React.SetStateAction<boolean>>;
  depreciationPerMile: number;
  setDepreciationPerMile: React.Dispatch<React.SetStateAction<number>>;
  vehicleCostSettings: VehicleCostSettings;
  setVehicleCostSettings: (settings: Partial<VehicleCostSettings>) => void;
  exportSettings: () => string;
  importSettings: (jsonStr: string) => boolean;
}

export function useUserSettings(): UserSettings {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('adi_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('adi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Hourly Rate
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('adi_hourly_rate');
    return saved ? parseFloat(saved) : 40;
  });

  useEffect(() => {
    localStorage.setItem('adi_hourly_rate', hourlyRate.toString());
  }, [hourlyRate]);

  // Exclusive Test Rate (£ per test booking, e.g. £80-£120 for car hire + test)
  const [testRate, setTestRate] = useState<number>(() => {
    const saved = localStorage.getItem('adi_test_rate');
    // If not set, defaults to 0 (meaning tests use standard hourly rate by default, or 0 if disabled)
    return saved !== null ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem('adi_test_rate', testRate.toString());
  }, [testRate]);

  // Non-paying students keyword list
  const [nonPayingStudents, setNonPayingStudents] = useState<string>(() => {
    const saved = localStorage.getItem('adi_non_paying_students');
    return saved || 'friends, family';
  });

  useEffect(() => {
    localStorage.setItem('adi_non_paying_students', nonPayingStudents);
  }, [nonPayingStudents]);

  const nonPayingList = useMemo(() => {
    return nonPayingStudents
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
  }, [nonPayingStudents]);

  // Capacity calculation mode
  const [capacityMode, setCapacityMode] = useState<'historical' | 'custom'>(() => {
    const saved = localStorage.getItem('adi_capacity_mode');
    return saved === 'custom' || saved === 'historical' ? saved : 'historical';
  });

  useEffect(() => {
    localStorage.setItem('adi_capacity_mode', capacityMode);
  }, [capacityMode]);

  // Custom daily target hours
  const [customIdealHours, setCustomIdealHours] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('adi_custom_ideal_hours');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom ideal hours', e);
      }
    }
    return { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 }; // default 7h Mon-Fri, 0h Sat-Sun
  });

  useEffect(() => {
    localStorage.setItem('adi_custom_ideal_hours', JSON.stringify(customIdealHours));
  }, [customIdealHours]);

  // AI Settings
  const [enableAiInsights, setEnableAiInsights] = useState<boolean>(() => {
    return localStorage.getItem('adi_enable_ai_insights') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('adi_enable_ai_insights', enableAiInsights ? 'true' : 'false');
  }, [enableAiInsights]);

  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>(() => {
    const saved = localStorage.getItem('adi_ai_provider');
    return saved === 'openai' || saved === 'gemini' ? saved : 'gemini';
  });

  useEffect(() => {
    localStorage.setItem('adi_ai_provider', aiProvider);
  }, [aiProvider]);

  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('adi_ai_model') || 'gemini-2.5-flash';
  });

  useEffect(() => {
    localStorage.setItem('adi_ai_model', aiModel);
  }, [aiModel]);

  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    const saved = localStorage.getItem('adi_ai_api_key');
    if (saved && saved.trim()) return saved.trim();
    const envKey = ((import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '').trim();
    return envKey || DEFAULT_MASTER_GEMINI_KEY;
  });

  useEffect(() => {
    if (aiApiKey && aiApiKey.trim()) {
      localStorage.setItem('adi_ai_api_key', aiApiKey.trim());
    }
  }, [aiApiKey]);

  // OAuth Client IDs
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem('adi_google_client_id') || '';
  });

  useEffect(() => {
    localStorage.setItem('adi_google_client_id', googleClientId);
  }, [googleClientId]);

  const [outlookClientId, setOutlookClientId] = useState<string>(() => {
    return localStorage.getItem('adi_outlook_client_id') || '';
  });

  useEffect(() => {
    localStorage.setItem('adi_outlook_client_id', outlookClientId);
  }, [outlookClientId]);

  // Excluded years from statistics (e.g. partial year / starting out)
  const [excludedYears, setExcludedYears] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('adi_excluded_years');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('adi_excluded_years', JSON.stringify(excludedYears));
  }, [excludedYears]);

  // Vehicle Running Cost & Net Revenue Settings
  const [vehicleFuelType, setVehicleFuelType] = useState<VehicleFuelType>(() => {
    const saved = localStorage.getItem('adi_vehicle_fuel_type');
    if (saved === 'petrol' || saved === 'diesel' || saved === 'electric') {
      return saved;
    }
    return DEFAULT_VEHICLE_SETTINGS.fuelType;
  });

  useEffect(() => {
    localStorage.setItem('adi_vehicle_fuel_type', vehicleFuelType);
  }, [vehicleFuelType]);

  const [fuelCostPerUnit, setFuelCostPerUnit] = useState<number>(() => {
    const saved = localStorage.getItem('adi_fuel_cost_per_unit');
    return saved !== null ? parseFloat(saved) : DEFAULT_UK_BENCHMARKS.petrol.costPerUnit;
  });

  useEffect(() => {
    localStorage.setItem('adi_fuel_cost_per_unit', fuelCostPerUnit.toString());
  }, [fuelCostPerUnit]);

  const [fuelEfficiency, setFuelEfficiency] = useState<number>(() => {
    const saved = localStorage.getItem('adi_fuel_efficiency');
    return saved !== null ? parseFloat(saved) : DEFAULT_UK_BENCHMARKS.petrol.defaultMpg;
  });

  useEffect(() => {
    localStorage.setItem('adi_fuel_efficiency', fuelEfficiency.toString());
  }, [fuelEfficiency]);

  const [milesPerHour, setMilesPerHour] = useState<number>(() => {
    const saved = localStorage.getItem('adi_miles_per_hour');
    if (saved !== null) {
      const val = parseFloat(saved);
      if (val === 15) return DEFAULT_VEHICLE_SETTINGS.milesPerHour; // Upgrade old default to 25
      return val;
    }
    return DEFAULT_VEHICLE_SETTINGS.milesPerHour;
  });

  useEffect(() => {
    localStorage.setItem('adi_miles_per_hour', milesPerHour.toString());
  }, [milesPerHour]);

  const [enableDepreciation, setEnableDepreciation] = useState<boolean>(() => {
    const saved = localStorage.getItem('adi_enable_depreciation');
    return saved !== null ? saved === 'true' : DEFAULT_VEHICLE_SETTINGS.enableDepreciation;
  });

  useEffect(() => {
    localStorage.setItem('adi_enable_depreciation', enableDepreciation ? 'true' : 'false');
  }, [enableDepreciation]);

  const [depreciationPerMile, setDepreciationPerMile] = useState<number>(() => {
    const saved = localStorage.getItem('adi_depreciation_per_mile');
    return saved !== null ? parseFloat(saved) : DEFAULT_VEHICLE_SETTINGS.depreciationPerMile;
  });

  useEffect(() => {
    localStorage.setItem('adi_depreciation_per_mile', depreciationPerMile.toString());
  }, [depreciationPerMile]);

  const vehicleCostSettings: VehicleCostSettings = useMemo(() => ({
    fuelType: vehicleFuelType,
    fuelCostPerUnit,
    efficiency: fuelEfficiency,
    milesPerHour,
    enableDepreciation,
    depreciationPerMile,
  }), [vehicleFuelType, fuelCostPerUnit, fuelEfficiency, milesPerHour, enableDepreciation, depreciationPerMile]);

  const setVehicleCostSettings = (settings: Partial<VehicleCostSettings>) => {
    if (settings.fuelType !== undefined) setVehicleFuelType(settings.fuelType);
    if (settings.fuelCostPerUnit !== undefined) setFuelCostPerUnit(settings.fuelCostPerUnit);
    if (settings.efficiency !== undefined) setFuelEfficiency(settings.efficiency);
    if (settings.milesPerHour !== undefined) setMilesPerHour(settings.milesPerHour);
    if (settings.enableDepreciation !== undefined) setEnableDepreciation(settings.enableDepreciation);
    if (settings.depreciationPerMile !== undefined) setDepreciationPerMile(settings.depreciationPerMile);
  };

  // Zero-scope cross-device sync: Export & Import settings
  const exportSettings = () => {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      hourlyRate,
      testRate,
      nonPayingStudents,
      theme,
      capacityMode,
      customIdealHours,
      enableAiInsights,
      aiProvider,
      aiModel,
      excludedYears,
      vehicleCostSettings,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importSettings = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (typeof data.hourlyRate === 'number') setHourlyRate(data.hourlyRate);
      if (typeof data.testRate === 'number') setTestRate(data.testRate);
      if (typeof data.nonPayingStudents === 'string') setNonPayingStudents(data.nonPayingStudents);
      if (data.theme === 'light' || data.theme === 'dark') setTheme(data.theme);
      if (data.capacityMode === 'historical' || data.capacityMode === 'custom') setCapacityMode(data.capacityMode);
      if (data.customIdealHours && typeof data.customIdealHours === 'object') setCustomIdealHours(data.customIdealHours);
      if (typeof data.enableAiInsights === 'boolean') setEnableAiInsights(data.enableAiInsights);
      if (data.aiProvider === 'gemini' || data.aiProvider === 'openai') setAiProvider(data.aiProvider);
      if (typeof data.aiModel === 'string') setAiModel(data.aiModel);
      if (Array.isArray(data.excludedYears)) setExcludedYears(data.excludedYears);
      if (data.vehicleCostSettings && typeof data.vehicleCostSettings === 'object') {
        setVehicleCostSettings(data.vehicleCostSettings);
      }
      return true;
    } catch {
      return false;
    }
  };

  return {
    hourlyRate,
    setHourlyRate,
    testRate,
    setTestRate,
    nonPayingStudents,
    setNonPayingStudents,
    nonPayingList,
    theme,
    setTheme,
    toggleTheme,
    capacityMode,
    setCapacityMode,
    customIdealHours,
    setCustomIdealHours,
    enableAiInsights,
    setEnableAiInsights,
    aiProvider,
    aiModel,
    setAiProvider,
    setAiModel,
    aiApiKey,
    setAiApiKey,
    googleClientId,
    setGoogleClientId,
    outlookClientId,
    setOutlookClientId,
    excludedYears,
    setExcludedYears,
    vehicleFuelType,
    setVehicleFuelType,
    fuelCostPerUnit,
    setFuelCostPerUnit,
    fuelEfficiency,
    setFuelEfficiency,
    milesPerHour,
    setMilesPerHour,
    enableDepreciation,
    setEnableDepreciation,
    depreciationPerMile,
    setDepreciationPerMile,
    vehicleCostSettings,
    setVehicleCostSettings,
    exportSettings,
    importSettings,
  };
}
