/**
 * Feature Flags System
 * 
 * Simple feature flag infrastructure for controlling heavy features
 * and enabling gradual rollout of new functionality.
 */

export type FeatureFlag =
  | "calendar_view"
  | "google_maps_autocomplete"
  | "rich_gigpack_branding"
  | "realtime_activity"
  | "advanced_analytics"
  | "ai_setlist_suggestions";

interface FeatureFlagConfig {
  enabled: boolean;
  description: string;
  environments?: ("development" | "staging" | "production")[];
}

const FEATURE_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  calendar_view: {
    enabled: true,
    description: "Full calendar view with month/week/day views",
    environments: ["development", "staging", "production"],
  },
  google_maps_autocomplete: {
    enabled: true,
    description: "Google Maps venue autocomplete",
    environments: ["development", "staging", "production"],
  },
  rich_gigpack_branding: {
    enabled: true,
    description: "Hero images, custom colors, and advanced branding in GigPack",
    environments: ["development", "staging", "production"],
  },
  realtime_activity: {
    enabled: false,
    description: "Real-time activity feeds using Supabase Realtime",
    environments: ["development"],
  },
  advanced_analytics: {
    enabled: false,
    description: "Advanced analytics and reporting features",
    environments: ["development"],
  },
  ai_setlist_suggestions: {
    enabled: false,
    description: "AI-powered setlist suggestions",
    environments: ["development"],
  },
};

/**
 * Check if a feature flag is enabled
 * @param flag - The feature flag to check
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const config = FEATURE_FLAGS[flag];
  if (!config) return false;

  // Check if feature is globally enabled
  if (!config.enabled) return false;

  // Check environment restrictions
  if (config.environments) {
    const currentEnv = process.env.NODE_ENV as "development" | "production";
    const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV as
      | "development"
      | "staging"
      | "production"
      | undefined;

    const env = vercelEnv || currentEnv;
    if (!config.environments.includes(env)) {
      return false;
    }
  }

  return true;
}
