import en from "@/messages/en.json";

type NestedRecord = { [key: string]: string | NestedRecord };

function getNestedValue(obj: NestedRecord, path: string): string {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return path;
    current = current[key];
  }

  if (typeof current === 'string') return current;
  return path;
}

export function useTranslations(namespace: string) {
  const messages = (en as any)[namespace];

  return (key: string, params?: Record<string, string | number>) => {
    if (!messages) return `${namespace}.${key}`;

    let value = getNestedValue(messages, key);
    
    // Simple parameter interpolation
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{${paramKey}}`, String(paramValue));
      });
    }

    return value;
  };
}

