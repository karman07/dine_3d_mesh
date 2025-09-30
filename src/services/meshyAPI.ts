import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_MESHY_API_BASE_URL;
const API_KEY = import.meta.env.VITE_MESHY_API_KEY;

console.log('API Configuration:', {
  baseURL: API_BASE_URL,
  apiKey: API_KEY ? 'Set' : 'Missing'
});

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add request/response interceptors for better debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, `${config.baseURL}${config.url}`);
    console.log('Request headers:', config.headers);
    console.log('Request config:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      timeout: config.timeout
    });
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data type:', typeof response.data);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      fullURL: `${error.config?.baseURL}${error.config?.url}`
    });
    
    // Log specific error details for common issues
    if (error.response?.status === 404) {
      console.error('🔍 404 Error Details:', {
        fullURL: `${error.config?.baseURL}${error.config?.url}`,
        possibleIssues: [
          'Incorrect endpoint URL',
          'Task ID not found',
          'Wrong API version (v1 vs v2)',
          'Endpoint not available for this task type'
        ]
      });
    }
    
    if (error.response?.status === 401) {
      console.error('🔑 Authentication Error:', {
        apiKey: API_KEY ? 'Present but possibly invalid' : 'Missing',
        authHeader: error.config?.headers?.Authorization
      });
    }
    
    return Promise.reject(error);
  }
);

export interface TextTo3DRequest {
  mode: 'preview' | 'refine';
  prompt?: string; // Optional for refine mode
  art_style?: 'realistic' | 'cartoon' | 'low-poly' | 'sculpture' | 'pbr';
  negative_prompt?: string;
  should_remesh?: boolean;
  preview_task_id?: string; // Required for refine mode
  enable_pbr?: boolean; // Available for refine mode
}

export interface ImageTo3DRequest {
  image_url: string;
  enable_pbr?: boolean;
  should_remesh?: boolean;
  should_texture?: boolean;
}

export interface MultiImageTo3DRequest {
  image_urls: string[];
  should_remesh?: boolean;
  should_texture?: boolean;
  enable_pbr?: boolean;
}

export interface RemeshRequest {
  input_task_id: string;
  target_formats: ('glb' | 'fbx' | 'obj' | 'usd' | 'ply')[];
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
  resize_height?: number;
  origin_at?: 'bottom' | 'center';
}

export interface RiggingRequest {
  model_url: string;
  height_meters: number;
}

export interface TaskResponse {
  result?: string; // This might contain the task ID
  id?: string;
  task_id?: string; // Meshy might use task_id instead of id
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  created_at: number;
  finished_at?: number;
  task_error?: {
    message: string;
  };
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usd?: string;
    ply?: string;
  };
  thumbnail_url?: string;
  video_url?: string;
  progress?: number;
  task_type?: 'text_to_3d' | 'image_to_3d' | 'multi_image_to_3d' | 'remesh' | 'rigging';
}

// Helper function to handle API calls with better error handling
const handleAPICall = async <T>(
  apiCall: () => Promise<any>,
  operationName: string
): Promise<T> => {
  try {
    const response = await apiCall();
    const data = response.data;
    
    console.log(`${operationName} - Raw API Response:`, data);
    
    // Normalize the task ID field (Meshy API might use different field names)
    if (data) {
      // If result field contains the task ID, copy it to id field for consistency
      if (!data.id && !data.task_id && data.result) {
        data.id = data.result;
      } else if (!data.id && data.task_id) {
        data.id = data.task_id;
      }
    }
    
    // Validate that we received a proper response with an ID
    const taskId = data?.id || data?.task_id || data?.result;
    if (!data || !taskId) {
      console.error(`${operationName} - Invalid response format:`, data);
      throw new Error(`${operationName} failed: Invalid response format (no task ID found in response)`);
    }
    
    return data;
  } catch (error: any) {
    console.error(`${operationName} failed:`, error);
    
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.message || error.response.data?.error || `HTTP ${error.response.status}`;
      throw new Error(`${operationName} failed: ${errorMessage}`);
    } else if (error.request) {
      // Request made but no response received
      throw new Error(`${operationName} failed: No response from server. Please check your internet connection.`);
    } else {
      // Something else happened
      throw new Error(`${operationName} failed: ${error.message}`);
    }
  }
};

export const meshyAPI = {
  // Text to 3D
  textTo3D: async (data: TextTo3DRequest): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.post('/openapi/v2/text-to-3d', data),
      'Text to 3D generation'
    );
  },

  // Image to 3D
  imageTo3D: async (data: ImageTo3DRequest): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.post('/openapi/v1/image-to-3d', data),
      'Image to 3D generation'
    );
  },

  // Multi-image to 3D
  multiImageTo3D: async (data: MultiImageTo3DRequest): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.post('/openapi/v1/multi-image-to-3d', data),
      'Multi-image to 3D generation'
    );
  },

  // Remesh
  remesh: async (data: RemeshRequest): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.post('/openapi/v1/remesh', data),
      'Model remeshing'
    );
  },

  // Rigging
  rigging: async (data: RiggingRequest): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.post('/openapi/v1/rigging', data),
      'Model rigging'
    );
  },

  // Test specific task ID (for debugging)
  testSpecificTask: async (taskId: string): Promise<any> => {
    console.log(`🧪 Testing specific task ID: ${taskId}`);
    
    const testEndpoints = [
      `/openapi/v2/text-to-3d/${taskId}`,
      `/openapi/v1/image-to-3d/${taskId}`,
      `/openapi/v1/multi-image-to-3d/${taskId}`,
      `/openapi/v1/tasks/${taskId}`
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        const response = await apiClient.get(endpoint);
        console.log(`✅ Success with ${endpoint}:`, response.data);
        return { endpoint, success: true, data: response.data };
      } catch (error: any) {
        console.log(`❌ Failed with ${endpoint}:`, error.response?.status, error.response?.statusText);
      }
    }
    
    throw new Error(`All endpoints failed for task ID: ${taskId}`);
  },

  // Get remesh task status
  getRemeshTask: async (taskId: string): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.get(`/openapi/v1/remesh/${taskId}`),
      'Remesh task retrieval'
    );
  },

  // Get rigging task status  
  getRiggingTask: async (taskId: string): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.get(`/openapi/v1/rigging/${taskId}`),
      'Rigging task retrieval'
    );
  },

  // Get task status - intelligent endpoint selection
  getTask: async (taskId: string, taskType: 'text_to_3d' | 'image_to_3d' | 'multi_image_to_3d' | 'auto' = 'auto'): Promise<TaskResponse> => {
    const endpoints = [
      { url: `/openapi/v2/text-to-3d/${taskId}`, type: 'text-to-3d' },
      { url: `/openapi/v1/image-to-3d/${taskId}`, type: 'image-to-3d' },
      { url: `/openapi/v1/multi-image-to-3d/${taskId}`, type: 'multi-image-to-3d' },
      { url: `/openapi/v1/tasks/${taskId}`, type: 'generic' }
    ];

    // If specific task type is provided, try that endpoint first
    if (taskType !== 'auto') {
      const specificEndpoint = endpoints.find(e => e.type === taskType);
      if (specificEndpoint) {
        try {
          return await handleAPICall(
            () => apiClient.get(specificEndpoint.url),
            `${taskType} task retrieval`
          );
        } catch (error) {
          console.warn(`${taskType} endpoint failed, trying other endpoints:`, error);
        }
      }
    }

    // Try all endpoints in order
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint.url}`);
        return await handleAPICall(
          () => apiClient.get(endpoint.url),
          `Task retrieval (${endpoint.type})` 
        );
      } catch (error) {
        console.warn(`Endpoint ${endpoint.url} failed:`, error);
      }
    }
    
    throw new Error(`All endpoints failed for task ID: ${taskId}`);
  },

  // Get text-to-3D task specifically (v2 endpoint)
  getTextTo3DTask: async (taskId: string): Promise<TaskResponse> => {
    return handleAPICall(
      () => apiClient.get(`/openapi/v2/text-to-3d/${taskId}`),
      'Text-to-3D task retrieval'
    );
  },

  // List text-to-3d tasks
  listTextTo3DTasks: async (pageSize = 10, page = 1): Promise<TaskResponse[]> => {
    try {
      console.log('Making direct API call to list text-to-3d tasks...');
      const response = await apiClient.get(`/openapi/v2/text-to-3d?page_size=${pageSize}&page=${page}`);
      console.log('Text-to-3D tasks - Raw API Response:', response.data);
      
      // API returns array directly, not wrapped in tasks property
      const tasks = Array.isArray(response.data) ? response.data : [];
      console.log('Text-to-3D tasks - Processed tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching text-to-3d tasks:', error);
      return [];
    }
  },

  // List image-to-3d tasks
  listImageTo3DTasks: async (pageSize = 10, page = 1): Promise<TaskResponse[]> => {
    try {
      console.log('Making direct API call to list image-to-3d tasks...');
      const response = await apiClient.get(`/openapi/v1/image-to-3d?page_size=${pageSize}&page=${page}`);
      console.log('Image-to-3D tasks - Raw API Response:', response.data);
      
      // API returns array directly, not wrapped in tasks property
      const tasks = Array.isArray(response.data) ? response.data : [];
      console.log('Image-to-3D tasks - Processed tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching image-to-3d tasks:', error);
      return [];
    }
  },

  // List multi-image-to-3d tasks
  listMultiImageTo3DTasks: async (pageSize = 10, page = 1): Promise<TaskResponse[]> => {
    try {
      console.log('Making direct API call to list multi-image-to-3d tasks...');
      const response = await apiClient.get(`/openapi/v1/multi-image-to-3d?page_size=${pageSize}&page=${page}`);
      console.log('Multi-Image-to-3D tasks - Raw API Response:', response.data);
      
      const tasks = Array.isArray(response.data) ? response.data : [];
      console.log('Multi-Image-to-3D tasks - Processed tasks:', tasks);
      return tasks;
    } catch (error) {
      console.error('Error fetching multi-image-to-3d tasks:', error);
      return [];
    }
  },

  // Delete task with intelligent type detection
  deleteTask: async (taskId: string, taskType?: 'text_to_3d' | 'image_to_3d' | 'multi_image_to_3d'): Promise<void> => {
    console.log(`🗑️ Attempting to delete task: ${taskId}`);
    
    // If no task type specified, try to detect from task ID or try all endpoints
    const endpointsToTry = [];
    
    if (taskType) {
      // Try the specific endpoint first
      switch (taskType) {
        case 'text_to_3d':
          endpointsToTry.push({ url: `/openapi/v2/text-to-3d/${taskId}`, type: 'text_to_3d' });
          break;
        case 'multi_image_to_3d':
          endpointsToTry.push({ url: `/openapi/v1/multi-image-to-3d/${taskId}`, type: 'multi_image_to_3d' });
          break;
        default:
          endpointsToTry.push({ url: `/openapi/v1/image-to-3d/${taskId}`, type: 'image_to_3d' });
      }
    } else {
      // Try all possible endpoints
      endpointsToTry.push(
        { url: `/openapi/v1/image-to-3d/${taskId}`, type: 'image_to_3d' },
        { url: `/openapi/v2/text-to-3d/${taskId}`, type: 'text_to_3d' },
        { url: `/openapi/v1/multi-image-to-3d/${taskId}`, type: 'multi_image_to_3d' }
      );
    }
    
    let lastError;
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`🔍 Trying delete endpoint: ${endpoint.url}`);
        await apiClient.delete(endpoint.url);
        console.log(`✅ Successfully deleted task using ${endpoint.type} endpoint`);
        return; // Success, exit early
      } catch (error: any) {
        console.warn(`❌ Delete failed for ${endpoint.type}:`, error.response?.status, error.response?.statusText);
        lastError = error;
      }
    }
    
    // If all endpoints failed, throw the last error
    throw new Error(`Failed to delete task ${taskId}: ${lastError?.response?.data?.message || lastError?.message || 'Unknown error'}`);
  },

  // Stream task progress (for multi-image-to-3d)
  streamTaskProgress: async (taskId: string): Promise<ReadableStream> => {
    const response = await fetch(`${API_BASE_URL}/openapi/v1/multi-image-to-3d/${taskId}/stream`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.body!;
  },

  // List tasks (this endpoint might not exist, let's handle it gracefully)
  listTasks: async (page = 1, limit = 10): Promise<{ tasks: TaskResponse[] }> => {
    try {
      return await handleAPICall(
        () => apiClient.get(`/openapi/v1/tasks?page=${page}&limit=${limit}`),
        'Tasks listing'
      );
    } catch (error) {
      // If the endpoint doesn't exist, return empty array
      console.warn('Tasks listing endpoint not available:', error);
      return { tasks: [] };
    }
  },
};

// Utility function to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Helper function to safely extract task ID from response
export const getTaskId = (response: TaskResponse): string | null => {
  // Try different possible field names that Meshy API might use
  return response.id || response.task_id || response.result || null;
};