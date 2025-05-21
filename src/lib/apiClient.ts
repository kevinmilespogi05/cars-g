import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private requestsInProgress: Map<string, Promise<any>>;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.requestsInProgress = new Map();
    this.setupInterceptors();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getCacheKey(method: string, url: string, params?: any, data?: any): string {
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    config: any = {}
  ): Promise<T> {
    const cacheKey = this.getCacheKey(method, url, config.params, config.data);
    
    // Return existing promise if request is in progress
    if (this.requestsInProgress.has(cacheKey)) {
      return this.requestsInProgress.get(cacheKey);
    }

    const promise = this.axiosInstance.request({
      method,
      url,
      ...config,
    }).then(response => {
      this.requestsInProgress.delete(cacheKey);
      return response.data;
    }).catch(error => {
      this.requestsInProgress.delete(cacheKey);
      throw error;
    });

    this.requestsInProgress.set(cacheKey, promise);
    return promise;
  }

  public async get<T>(url: string, config?: any): Promise<T> {
    return this.makeRequest<T>('GET', url, config);
  }

  public async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.makeRequest<T>('POST', url, { ...config, data });
  }

  public async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.makeRequest<T>('PUT', url, { ...config, data });
  }

  public async delete<T>(url: string, config?: any): Promise<T> {
    return this.makeRequest<T>('DELETE', url, config);
  }
}

export const apiClient = ApiClient.getInstance(); 