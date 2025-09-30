import React, { useState } from 'react';
import { Loader2, Download, Upload, X } from 'lucide-react';
import { meshyAPI, RiggingRequest, TaskResponse, fileToBase64, getTaskId } from '../services/meshyAPI';
import { Button } from './ui/button';

const Rigging: React.FC = () => {
  const [formData, setFormData] = useState<RiggingRequest>({
    model_url: '',
    height_meters: 1.8,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResponse | null>(null);
  const [polling, setPolling] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a 3D model file
    const allowedTypes = ['.glb', '.gltf', '.fbx', '.obj', '.ply', '.usd'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      alert('Please select a 3D model file (.glb, .gltf, .fbx, .obj, .ply, .usd)');
      return;
    }

    setSelectedFile(file);

    try {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, model_url: base64 });
    } catch (error) {
      console.error('Error converting file to base64:', error);
      alert('Error processing model file');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormData({ ...formData, model_url: '' });
  };

  const handleUrlChange = (url: string) => {
    setFormData({ ...formData, model_url: url });
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.model_url.trim()) return;

    setLoading(true);
    try {
      const response = await meshyAPI.rigging(formData);
      setResult(response);
      const taskId = getTaskId(response);
      if (taskId) {
        pollTaskStatus(taskId);
      } else {
        console.error('No task ID received from API. Response:', response);
        setResult(prev => prev ? { ...prev, task_error: { message: 'No task ID received from API' } } : null);
      }
    } catch (error) {
      console.error('Error rigging model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to rig model. Please try again.';
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
          Model Rigging
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add skeletal animation support to your 3D models for character animation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                3D Model *
              </label>
              
              {!selectedFile && !formData.model_url.startsWith('http') ? (
                <div>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="model-upload" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500 font-medium">
                          Upload a 3D model
                        </span>
                        <input
                          id="model-upload"
                          name="model-upload"
                          type="file"
                          className="sr-only"
                          accept=".glb,.gltf,.fbx,.obj,.ply,.usd"
                          onChange={handleFileSelect}
                        />
                      </label>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        GLB, GLTF, FBX, OBJ, PLY, USD files
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-center text-gray-500 dark:text-gray-400 text-sm mb-2">
                      or
                    </div>
                    <input
                      type="url"
                      placeholder="Enter model URL"
                      value={formData.model_url.startsWith('data:') ? '' : formData.model_url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedFile ? selectedFile.name : 'Model URL'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : formData.model_url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Height Settings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Character Height (meters) *
              </label>
              <input
                type="number"
                value={formData.height_meters}
                onChange={(e) => setFormData({ ...formData, height_meters: parseFloat(e.target.value) || 1.8 })}
                min="0.1"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The height of the character in meters (0.1 - 10.0). This helps determine the scale and bone structure.
              </p>
            </div>

            {/* Height Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Height Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, height_meters: 1.2 })}
                >
                  Child (1.2m)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, height_meters: 1.6 })}
                >
                  Teen (1.6m)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, height_meters: 1.8 })}
                >
                  Adult (1.8m)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, height_meters: 2.0 })}
                >
                  Tall (2.0m)
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                About Model Rigging
              </h4>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Adds a skeletal structure to your 3D model</li>
                <li>• Enables character animation and poses</li>
                <li>• Compatible with most animation software</li>
                <li>• Best results with humanoid characters</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.model_url.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rigging Model...
                </>
              ) : (
                'Start Rigging'
              )}
            </Button>
          </form>
        </div>

        {/* Result */}
        <div>
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rigging Result
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
                  <p>Character Height: {formData.height_meters}m</p>
                  <p>Created: {new Date(result.created_at * 1000).toLocaleString()}</p>
                  {result.finished_at && (
                    <p>Finished: {new Date(result.finished_at * 1000).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {polling && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Rigging in progress...</span>
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
                    alt="Rigged Model Preview"
                    className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              {result.model_urls && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Download Rigged Models
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.model_urls).map(([format, url]) => (
                      <Button
                        key={format}
                        onClick={() => handleDownload(url, `rigged_model.${format}`)}
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
                    Animation Preview
                  </h4>
                  <video
                    src={result.video_url}
                    controls
                    className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              {result.status === 'SUCCEEDED' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                    Rigging Complete!
                  </h4>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Your model is now ready for animation. Import it into your favorite animation software like Blender, Maya, or Unity.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rigging;