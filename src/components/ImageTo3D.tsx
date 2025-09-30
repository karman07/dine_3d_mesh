import React, { useState } from 'react';
import { Loader2, Download, Upload, X } from 'lucide-react';
import { meshyAPI, ImageTo3DRequest, TaskResponse, fileToBase64, getTaskId } from '../services/meshyAPI';
import { Button } from './ui/button';
import ModelViewer3D from './ModelViewer3D';

const ImageTo3D: React.FC = () => {
  const [formData, setFormData] = useState<ImageTo3DRequest>({
    image_url: '',
    enable_pbr: true,
    should_remesh: true,
    should_texture: true,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResponse | null>(null);
  const [polling, setPolling] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 for API
    try {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, image_url: base64 });
    } catch (error) {
      console.error('Error converting file to base64:', error);
      alert('Error processing image file');
    }
  };

  const removeFile = () => {
    setImagePreview('');
    setFormData({ ...formData, image_url: '' });
  };

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, image_url: url });
    setImagePreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image_url.trim()) return;

    setLoading(true);
    try {
      const response = await meshyAPI.imageTo3D(formData);
      setResult(response);
      const taskId = getTaskId(response);
      if (taskId) {
        pollTaskStatus(taskId);
      } else {
        console.error('No task ID received from API. Response:', response);
        setResult(prev => prev ? { ...prev, task_error: { message: 'No task ID received from API' } } : null);
      }
    } catch (error) {
      console.error('Error creating 3D model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create 3D model. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    if (!taskId || taskId === 'undefined') {
      console.error('Invalid task ID for polling:', taskId);
      return;
    }

    setPolling(true);
    let pollCount = 0;
    const maxPolls = 200; // Maximum 10 minutes of polling
    
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;
        const taskStatus = await meshyAPI.getTask(taskId);
        console.log(`Poll ${pollCount}: Status=${taskStatus.status}, Progress=${taskStatus.progress}`);
        
        setResult(taskStatus);
        
        // More comprehensive completion check
        const isCompleted = taskStatus.status === 'SUCCEEDED' || 
                           taskStatus.status === 'FAILED' ||
                           (taskStatus.progress === 100 && taskStatus.model_urls?.glb) ||
                           pollCount >= maxPolls;
        
        if (isCompleted) {
          console.log('Task completed, stopping polling');
          clearInterval(pollInterval);
          setPolling(false);
          
          // Force final status update if we have model URLs but status isn't SUCCEEDED
          if (taskStatus.model_urls?.glb && taskStatus.status !== 'SUCCEEDED') {
            setResult(prev => prev ? { ...prev, status: 'SUCCEEDED' as const, progress: 100 } : null);
          }
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        clearInterval(pollInterval);
        setPolling(false);
      }
    }, 2000); // Reduced polling interval for better responsiveness
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Image to 3D Model
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Convert a single image into a 3D model with textures
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image *
              </label>
              
              {!imagePreview ? (
                <div>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500 font-medium">
                          Upload an image
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleFileSelect}
                        />
                      </label>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        PNG, JPG, JPEG up to 10MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm mb-2">
                      or
                    </div>
                    <input
                      type="url"
                      placeholder="Enter image URL"
                      value={formData.image_url.startsWith('data:') ? '' : formData.image_url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable_pbr"
                  checked={formData.enable_pbr}
                  onChange={(e) => setFormData({ ...formData, enable_pbr: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="enable_pbr" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable PBR materials (Physically Based Rendering)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="should_texture"
                  checked={formData.should_texture}
                  onChange={(e) => setFormData({ ...formData, should_texture: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="should_texture" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Apply textures to the model
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="should_remesh_img"
                  checked={formData.should_remesh}
                  onChange={(e) => setFormData({ ...formData, should_remesh: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="should_remesh_img" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable remeshing for better topology
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.image_url.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Model...
                </>
              ) : (
                'Generate 3D Model'
              )}
            </Button>
          </form>
        </div>

        {/* Result */}
        <div>
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generation Result
              </h3>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status:
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.status === 'SUCCEEDED' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : result.status === 'FAILED'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                  }`}>
                    {result.status}
                  </span>
                </div>

                {result.progress !== undefined && (
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{result.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-600">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${result.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Task ID: {result.id}</p>
                  <p>Created: {new Date(result.created_at * 1000).toLocaleString()}</p>
                  {result.finished_at && (
                    <p>Finished: {new Date(result.finished_at * 1000).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {polling && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Checking status...</span>
                </div>
              )}

              {result.task_error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-300 text-sm">
                    Error: {result.task_error.message}
                  </p>
                </div>
              )}

              {result.model_urls?.glb && result.status === 'SUCCEEDED' && (
                <div className="mb-6">
                  <ModelViewer3D
                    modelUrl={result.model_urls.glb}
                    thumbnailUrl={result.thumbnail_url}
                    taskId={getTaskId(result) || 'unknown'}
                    modelUrls={result.model_urls}
                    onDownload={handleDownload}
                  />
                </div>
              )}

              {result.thumbnail_url && !result.model_urls?.glb && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Preview
                  </h4>
                  <img
                    src={result.thumbnail_url}
                    alt="3D Model Preview"
                    className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              {result.model_urls && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Download Models
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.model_urls).map(([format, url]) => (
                      <Button
                        key={format}
                        onClick={() => handleDownload(url, `model.${format}`)}
                        variant="outline"
                        size="sm"
                        className="mr-2"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download {format.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {result.video_url && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    360° Preview
                  </h4>
                  <video
                    src={result.video_url}
                    controls
                    className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageTo3D;