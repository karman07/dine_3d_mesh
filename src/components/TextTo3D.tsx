import React, { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { meshyAPI, TextTo3DRequest, TaskResponse, getTaskId } from '../services/meshyAPI';
import { Button } from './ui/button';
import ModelViewer3D from './ModelViewer3D';

const TextTo3D: React.FC = () => {
  const [formData, setFormData] = useState<TextTo3DRequest>({
    mode: 'preview',
    prompt: '',
    art_style: 'realistic',
    negative_prompt: '',
    should_remesh: true,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResponse | null>(null);
  const [polling, setPolling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt?.trim()) return;

    setLoading(true);
    try {
      const response = await meshyAPI.textTo3D(formData);
      setResult(response);
      // Start polling for status updates only if we have a valid task ID
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
        const taskStatus = await meshyAPI.getTask(taskId, 'text_to_3d'); // Specify text-to-3D task type
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

  const handleDownload = (format: string, url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `model_${result ? getTaskId(result) || 'unknown' : 'unknown'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Text to 3D Model
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Generate 3D models from text descriptions using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt *
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="Describe the 3D model you want to create (e.g., 'a monster mask')"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Art Style
              </label>
              <select
                value={formData.art_style}
                onChange={(e) => setFormData({ ...formData, art_style: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="realistic">Realistic</option>
                <option value="cartoon">Cartoon</option>
                <option value="low-poly">Low Poly</option>
                <option value="sculpture">Sculpture</option>
                <option value="pbr">PBR</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mode
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="preview">Preview (Fast)</option>
                <option value="refine">Refine (High Quality)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Negative Prompt (Optional)
              </label>
              <textarea
                value={formData.negative_prompt}
                onChange={(e) => setFormData({ ...formData, negative_prompt: e.target.value })}
                placeholder="Describe what you don't want in the model"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="should_remesh"
                checked={formData.should_remesh}
                onChange={(e) => setFormData({ ...formData, should_remesh: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="should_remesh" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable remeshing for better topology
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.prompt?.trim()}
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

              {result.model_urls && !result.model_urls.glb && (
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

export default TextTo3D;