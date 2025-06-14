// Default to true if environment variable is not set
const envValue = import.meta.env.VITE_USE_GOOGLE_AUTH;
export const USE_GOOGLE_AUTH = envValue === undefined ? true : envValue === 'true';



