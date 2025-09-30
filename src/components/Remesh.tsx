import React, { useState } from 'react';
import { Loader2, Download, Search } from 'lucide-react';
import { meshyAPI, RemeshRequest, TaskResponse, getTaskId } from '../services/meshyAPI';
import { Button } from './ui/button';

const Remesh: React.FC = () => {
  const [formData, setFormData] = useState<RemeshRequest>({
    input_task_id: '',
    target_formats: ['glb'],
    topology: 'quad',
    target_polycount: 50000,
    resize_height: 1.0,
    origin_at: 'bottom',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResponse | null>(null);
  const [polling, setPolling] = useState(false);
  const [taskLookup, setTaskLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<TaskResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.input_task_id.trim()) return;

    setLoading(true);
    try {
      const response = await meshyAPI.remesh(formData);
      setResult(response);
      const taskId = getTaskId(response);
      if (taskId) {
        pollTaskStatus(taskId);
      } else {
        console.error('No task ID received from API. Response:', response);
        setResult(prev => prev ? { ...prev, task_error: { message: 'No task ID received from API' } } : null);
      }
    } catch (error) {
      console.error('Error remeshing model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remesh model. Please try again.';
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

  const lookupTask = async () => {
    if (!taskLookup.trim()) return;

    try {
      const task = await meshyAPI.getTask(taskLookup.trim());
      setLookupResult(task);
    } catch (error) {
      console.error('Error looking up task:', error);
      alert('Task not found or error occurred');
      setLookupResult(null);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleFormatChange = (format: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        target_formats: [...formData.target_formats, format as any]
      });
    } else {
      setFormData({
        ...formData,
        target_formats: formData.target_formats.filter(f => f !== format)
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Remesh 3D Model
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Optimize and convert existing 3D models with better topology and different formats
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          {/* Task Lookup */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Look up existing task
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={taskLookup}
                onChange={(e) => setTaskLookup(e.target.value)}
                placeholder="Enter task ID to lookup"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button type="button" onClick={lookupTask} variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Lookup
              </Button>
            </div>
            
            {lookupResult && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                <div className="text-sm">
                  <p><strong>Status:</strong> {lookupResult.status}</p>
                  <p><strong>Created:</strong> {new Date(lookupResult.created_at * 1000).toLocaleString()}</p>
                  {lookupResult.model_urls && (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      onClick={() => setFormData({ ...formData, input_task_id: lookupResult.id || '' })}
                    >
                      Use this task for remesh
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Remesh Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Input Task ID *
              </label>
              <input
                type="text"
                value={formData.input_task_id}
                onChange={(e) => setFormData({ ...formData, input_task_id: e.target.value })}
                placeholder="Enter the task ID of the 3D model to remesh"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Formats *
              </label>
              <div className="space-y-2">
                {['glb', 'fbx', 'obj', 'usd', 'ply'].map((format) => (
                  <div key={format} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`format_${format}`}
                      checked={formData.target_formats.includes(format as any)}
                      onChange={(e) => handleFormatChange(format, e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor={`format_${format}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {format.toUpperCase()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topology
              </label>
              <select
                value={formData.topology}
                onChange={(e) => setFormData({ ...formData, topology: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="quad">Quad</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Polycount
              </label>
              <input
                type="number"
                value={formData.target_polycount}
                onChange={(e) => setFormData({ ...formData, target_polycount: parseInt(e.target.value) || 50000 })}
                min="1000"
                max="200000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target number of polygons (1,000 - 200,000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resize Height
              </label>
              <input
                type="number"
                value={formData.resize_height}
                onChange={(e) => setFormData({ ...formData, resize_height: parseFloat(e.target.value) || 1.0 })}
                min="0.1"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Scale factor for model height (0.1 - 10.0)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Origin Position
              </label>
              <select
                value={formData.origin_at}
                onChange={(e) => setFormData({ ...formData, origin_at: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading || !formData.input_task_id.trim() || formData.target_formats.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Remeshing...
                </>
              ) : (
                'Start Remesh'
              )}
            </Button>
          </form>
        </div>

        {/* Result */}
        <div>
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Remesh Result
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
                  <p>Input Task: {formData.input_task_id}</p>
                  <p>Created: {new Date(result.created_at * 1000).toLocaleString()}</p>
                  {result.finished_at && (
                    <p>Finished: {new Date(result.finished_at * 1000).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {polling && (
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm">Processing...</span>
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
                    alt="Remeshed Model Preview"
                    className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              {result.model_urls && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Download Remeshed Models
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.model_urls).map(([format, url]) => (
                      <Button
                        key={format}
                        onClick={() => handleDownload(url, `remeshed_model.${format}`)}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Remesh;