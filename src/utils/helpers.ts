import { AxiosError } from 'axios';
import { ReveAIError, ReveAIErrorType } from '../types';

/**
 * Delay execution for a specified time
 * @param ms Milliseconds to wait
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert an Axios error to a ReveAIError
 * @param error The original error from Axios
 * @param operation Description of the operation that failed
 * @param verbose Whether to include verbose error details
 * @returns A formatted ReveAIError
 */
export function handleAxiosError(
  error: AxiosError | Error,
  operation: string,
  verbose: boolean = false
): ReveAIError {
  if (error instanceof ReveAIError) {
    return error;
  }

  // Handle Axios error
  if ('isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data as Record<string, unknown>;
    
    let errorMessage = '';
    let errorDetails = '';
    
    if (verbose) {
      // Add request details for verbose mode
      errorDetails = '\nRequest details:';
      if (axiosError.config?.url) {
        errorDetails += `\n- URL: ${axiosError.config.method?.toUpperCase() || 'UNKNOWN'} ${axiosError.config.url}`;
      }
      if (axiosError.config?.data) {
        try {
          const parsedData = typeof axiosError.config.data === 'string' 
            ? JSON.parse(axiosError.config.data) 
            : axiosError.config.data;
          errorDetails += `\n- Request data: ${JSON.stringify(parsedData, null, 2)}`;
        } catch {
          errorDetails += `\n- Request data: [Could not parse]`;
        }
      }
      
      // Add response details for verbose mode
      if (statusCode) {
        errorDetails += `\n- Status: ${statusCode}`;
      }
      if (responseData) {
        errorDetails += `\n- Response: ${JSON.stringify(responseData, null, 2)}`;
      }
    }
    
    // Authentication errors
    if (statusCode === 401 || statusCode === 403) {
      errorMessage = `Authentication error: ${responseData?.message || axiosError.message}`;
      return new ReveAIError(
        verbose ? errorMessage + errorDetails : errorMessage,
        ReveAIErrorType.AUTHENTICATION_ERROR,
        statusCode
      );
    }
    
    // Timeout errors
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      errorMessage = `Request timed out during ${operation}`;
      return new ReveAIError(
        verbose ? errorMessage + errorDetails : errorMessage,
        ReveAIErrorType.TIMEOUT_ERROR
      );
    }
    
    // Network errors
    if (axiosError.message.includes('Network Error')) {
      errorMessage = `Network error during ${operation}: ${axiosError.message}`;
      return new ReveAIError(
        verbose ? errorMessage + errorDetails : errorMessage,
        ReveAIErrorType.REQUEST_ERROR
      );
    }
    
    // API errors
    if (statusCode && statusCode >= 400) {
      errorMessage = `API error during ${operation}: ${responseData?.message || axiosError.message}`;
      return new ReveAIError(
        verbose ? errorMessage + errorDetails : errorMessage,
        ReveAIErrorType.API_ERROR,
        statusCode
      );
    }
    
    // Default for other Axios errors
    errorMessage = `Request error during ${operation}: ${axiosError.message}`;
    return new ReveAIError(
      verbose ? errorMessage + errorDetails : errorMessage,
      ReveAIErrorType.REQUEST_ERROR,
      statusCode
    );
  }
  
  // Handle non-Axios errors
  return new ReveAIError(
    `Error during ${operation}: ${error.message}`,
    ReveAIErrorType.UNKNOWN_ERROR
  );
}

/**
 * Generate a random seed for image generation
 * @returns A random seed number
 */
export function generateRandomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

/**
 * Validate image generation options to ensure they're within acceptable ranges
 * @param width Image width
 * @param height Image height
 * @param batchSize Number of images to generate
 */
export function validateImageOptions(
  width?: number,
  height?: number,
  batchSize?: number
): void {
  if (width && (width < 384 || width > 1360 || width % 8 !== 0)) {
    throw new ReveAIError(
      'Width must be between 384 and 1360 and be divisible by 8',
      ReveAIErrorType.GENERATION_ERROR
    );
  }
  
  if (height && (height < 384 || height > 1360 || height % 8 !== 0)) {
    throw new ReveAIError(
      'Height must be between 384 and 1360 and be divisible by 8',
      ReveAIErrorType.GENERATION_ERROR
    );
  }
  
  if (batchSize !== undefined && (batchSize < 1 || batchSize > 8)) {
    throw new ReveAIError(
      'Batch size must be between 1 and 8',
      ReveAIErrorType.GENERATION_ERROR
    );
  }
}

/**
 * Parse JWT token to extract user information
 * @param token JWT token string
 * @returns Decoded token payload
 */
export function parseJwt(token: string): Record<string, unknown> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
} 