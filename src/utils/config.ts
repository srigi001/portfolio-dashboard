// Authentication configuration
export const USE_GOOGLE_AUTH = true;

// Development configuration
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// API configuration
export const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:5173';



