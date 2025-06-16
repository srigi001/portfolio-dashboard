// Authentication configuration
export const USE_GOOGLE_AUTH = true;

// Development configuration
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// API configuration
export const API_BASE_URL = IS_DEVELOPMENT 
  ? 'http://localhost:5173'
  : 'https://portfolio-prophet-fresh.netlify.app';



