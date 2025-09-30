import React, { useState } from 'react';
import { Loader2, Download, X, Plus } from 'lucide-react';
import { meshyAPI, MultiImageTo3DRequest, TaskResponse, fileToBase64, getTaskId } from '../services/meshyAPI';
import { Button } from './ui/button';

interface ImageItem {
  id: string;
  file?: File;
  url: string;
  preview: string;
}

const MultiImageTo3D: React.FC = () => {
  const [formData, setFormData] = useState<MultiImageTo3DRequest>({
    image_urls: [],
    should_remesh: true,
    should_texture: true,
    enable_pbr: true,
  });
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResponse | null>(null);
  const [polling, setPolling] = useState(false);

  const addImageFromFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const preview = URL.createObjectURL(file);
      const newImage: ImageItem = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: base64,
        preview,
      };

      setImages(prev => [...prev, newImage]);
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, base64]
      }));
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image file');
    }
  };

  const addImageFromUrl = (url: string) => {
    if (!url.trim()) return;

    const newImage: ImageItem = {
      id: Math.random().toString(36).substr(2, 9),
      url: url.trim(),
      preview: url.trim(),
    };

    setImages(prev => [...prev, newImage]);
    setFormData(prev => ({
      ...prev,
      image_urls: [...prev.image_urls, url.trim()]
    }));
  };

  const removeImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove?.file) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    setImages(prev => prev.filter(img => img.id !== id));
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, index) => images[index].id !== id)
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addImageFromFile);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.image_urls.length < 2) {
      alert('Please add at least 2 images');
      return;
    }

    setLoading(true);
    try {
      const response = await meshyAPI.multiImageTo3D(formData);
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
    const pollInterval = setInterval(async () => {
      try {
        const taskStatus = await meshyAPI.getTask(taskId);
        setResult(taskStatus);
        
        if (taskStatus.status === 'SUCCEEDED' || taskStatus.status === 'FAILED') {
          clearInterval(pollInterval);
          setPolling(false);
        }
      } catch (error) {
        console.error('Error polling task status:', error);
        clearInterval(pollInterval);
        setPolling(false);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 600000);
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
          Multi-Image to 3D Model
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create 3D models from multiple images for better accuracy and detail
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Images * (Minimum 2 images)
              </label>
              
              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.preview}
                      alt="Selected"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {/* Add More Button */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-32 flex items-center justify-center">
                  <label htmlFor="multi-file-upload" className="cursor-pointer text-center">
                    <Plus className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Add Image
                    </span>
                    <input
                      id="multi-file-upload"
                      name="multi-file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
              </div>

              {/* URL Input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Or add image URL"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImageFromUrl((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                    addImageFromUrl(input.value);
                    input.value = '';
                  }}
                >
                  Add URL
                </Button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Added {images.length} image{images.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable_pbr_multi"
                  checked={formData.enable_pbr}
                  onChange={(e) => setFormData({ ...formData, enable_pbr: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="enable_pbr_multi" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable PBR materials (Physically Based Rendering)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="should_texture_multi"
                  checked={formData.should_texture}
                  onChange={(e) => setFormData({ ...formData, should_texture: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="should_texture_multi" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Apply textures to the model
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="should_remesh_multi"
                  checked={formData.should_remesh}
                  onChange={(e) => setFormData({ ...formData, should_remesh: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="should_remesh_multi" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable remeshing for better topology
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || formData.image_urls.length < 2}
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

              {result.thumbnail_url && (
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

export default MultiImageTo3D;