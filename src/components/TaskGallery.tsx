import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, Eye, Trash2, RefreshCw, Grid, List, Search } from 'lucide-react';
import { meshyAPI, TaskResponse, getTaskId } from '../services/meshyAPI';
import ModelViewer3D from './ModelViewer3D';

interface TaskGalleryProps {
  taskType?: 'text_to_3d' | 'image_to_3d' | 'all';
}

const TaskGallery: React.FC<TaskGalleryProps> = ({ taskType = 'all' }) => {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, [taskType]);

  const loadTasks = async () => {
    setLoading(true);
    console.log('TaskGallery: Starting to load tasks for type:', taskType);
    
    try {
      let allTasks: TaskResponse[] = [];
      
      if (taskType === 'all' || taskType === 'text_to_3d') {
        try {
          console.log('TaskGallery: Loading text-to-3d tasks...');
          const textTasks = await meshyAPI.listTextTo3DTasks(20);
          console.log('TaskGallery: Text-to-3d tasks received:', textTasks);
          // Mark these as text_to_3d tasks for proper handling
          const markedTextTasks = textTasks.map(task => ({ ...task, task_type: 'text_to_3d' as const }));
          allTasks = [...allTasks, ...markedTextTasks];
        } catch (error) {
          console.warn('Failed to load text-to-3d tasks:', error);
        }
      }
      
      if (taskType === 'all' || taskType === 'image_to_3d') {
        try {
          console.log('TaskGallery: Loading image-to-3d tasks...');
          const imageTasks = await meshyAPI.listImageTo3DTasks(20);
          console.log('TaskGallery: Image-to-3d tasks received:', imageTasks);
          // Mark these as image_to_3d tasks for proper handling
          const markedImageTasks = imageTasks.map(task => ({ ...task, task_type: 'image_to_3d' as const }));
          allTasks = [...allTasks, ...markedImageTasks];
        } catch (error) {
          console.warn('Failed to load image-to-3d tasks:', error);
        }
      }
      
      console.log('TaskGallery: All tasks combined:', allTasks);
      
      // Sort by creation date (newest first)
      allTasks.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      setTasks(allTasks);
      console.log('TaskGallery: Tasks set to state, final count:', allTasks.length);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (task: TaskResponse) => {
    const taskId = getTaskId(task);
    if (!taskId) {
      alert('Cannot delete task: No task ID found');
      return;
    }

    const confirmMessage = `Are you sure you want to delete this task?\n\nTask ID: ${taskId}\nType: ${task.task_type || 'Unknown'}\nStatus: ${task.status}`;
    if (!confirm(confirmMessage)) return;
    
    try {
      console.log('🗑️ Deleting task:', { taskId, taskType: task.task_type, task });
      
      // Filter task type to only supported delete types
      const supportedDeleteTypes: ('text_to_3d' | 'image_to_3d' | 'multi_image_to_3d')[] = ['text_to_3d', 'image_to_3d', 'multi_image_to_3d'];
      const deleteTaskType = supportedDeleteTypes.includes(task.task_type as any) 
        ? (task.task_type as 'text_to_3d' | 'image_to_3d' | 'multi_image_to_3d') 
        : undefined;
      
      if (!deleteTaskType && task.task_type) {
        // Handle unsupported task types
        throw new Error(`Delete operation not supported for task type: ${task.task_type}`);
      }
      
      // Use the filtered task_type if available, otherwise let the API try all endpoints
      await meshyAPI.deleteTask(taskId, deleteTaskType);
      
      console.log('✅ Task deleted successfully');
      
      // Remove from local state
      setTasks(prev => prev.filter(t => getTaskId(t) !== taskId));
      
      if (selectedTask && getTaskId(selectedTask) === taskId) {
        setSelectedTask(null);
      }
      
      alert('✅ Task deleted successfully!');
    } catch (error: any) {
      console.error('❌ Error deleting task:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert(`❌ Failed to delete task: ${errorMessage}\n\nTask ID: ${taskId}\nPlease try again or check the console for details.`);
    }
  };

  const handleDownload = (format: string, url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `model_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      getTaskId(task)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'FAILED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          3D Model Gallery
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          View, manage, and download your generated 3D models
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={loadTasks}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredTasks.length} of {tasks.length} tasks
          {tasks.length === 0 && !loading && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200">
                No tasks found. This could be due to:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                <li>Missing API key or incorrect configuration</li>
                <li>No tasks created yet</li>
                <li>API endpoint issues</li>
              </ul>
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={loadTasks} 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      // Test your specific task ID that works in Postman
                      const taskId = '01999965-2446-76ee-93c5-1fc4a9066061';
                      console.log('🧪 Testing specific task ID:', taskId);
                      
                      // Try direct fetch first (like Postman)
                      const directResponse = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, {
                        headers: {
                          'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}`,
                          'Accept': 'application/json',
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (directResponse.ok) {
                        const data = await directResponse.json();
                        console.log('✅ Direct fetch success:', data);
                        alert(`✅ Direct Fetch Works!\nStatus: ${data.status}\nProgress: ${data.progress}%\nModel URL: ${data.model_urls?.glb ? 'Available' : 'Not Ready'}`);
                      } else {
                        console.error('❌ Direct fetch failed:', directResponse.status, directResponse.statusText);
                        alert(`❌ Direct Fetch Failed: ${directResponse.status} ${directResponse.statusText}`);
                      }
                      
                      // Now test our API service
                      const serviceResponse = await meshyAPI.testSpecificTask(taskId);
                      console.log('✅ Service response:', serviceResponse);
                      alert(`✅ API Service Also Works!\nEndpoint: ${serviceResponse.endpoint}`);
                      
                    } catch (error) {
                      console.error('❌ Test failed:', error);
                      alert(`❌ Test Failed: ${error}`);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                >
                  Test Your Task ID
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Task Grid/List */}
      {!loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredTasks.map((task) => {
            const taskId = getTaskId(task);
            const hasModel = task.model_urls?.glb && task.status === 'SUCCEEDED';

            return (
              <div
                key={taskId}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Thumbnail/Model Preview */}
                <div className={`${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'aspect-square'} bg-gray-100 dark:bg-gray-900 relative`}>
                  {hasModel ? (
                    <div className="w-full h-full">
                      <model-viewer
                        src={task.model_urls!.glb}
                        poster={task.thumbnail_url}
                        alt="3D Model"
                        auto-rotate
                        camera-controls
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'transparent'
                        }}
                      />
                      <Button
                        onClick={() => setSelectedTask(task)}
                        className="absolute top-2 right-2"
                        size="sm"
                        variant="secondary"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : task.thumbnail_url ? (
                    <img
                      src={task.thumbnail_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Eye className="h-12 w-12" />
                    </div>
                  )}
                </div>

                {/* Task Info */}
                <div className="p-4 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <Button
                      onClick={() => deleteTask(task)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>ID:</strong> {taskId?.substring(0, 8)}...</p>
                    <p><strong>Created:</strong> {new Date(task.created_at * 1000).toLocaleDateString()}</p>
                    
                    {/* Additional task details */}
                    {(task as any).mode && (
                      <p><strong>Mode:</strong> <span className="capitalize">{(task as any).mode}</span></p>
                    )}
                    {(task as any).name && (
                      <p><strong>Name:</strong> {(task as any).name}</p>
                    )}
                    {(task as any).seed && (
                      <p><strong>Seed:</strong> {(task as any).seed}</p>
                    )}
                    {(task as any).prompt && (
                      <p><strong>Prompt:</strong> <span className="italic">{(task as any).prompt.substring(0, 50)}{(task as any).prompt.length > 50 ? '...' : ''}</span></p>
                    )}
                    {task.task_type && (
                      <p><strong>Type:</strong> <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">{task.task_type}</span></p>
                    )}
                    
                    {task.progress !== undefined && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Download Buttons */}
                  {task.model_urls && task.status === 'SUCCEEDED' && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {Object.entries(task.model_urls)
                        .filter(([_, url]) => url)
                        .map(([format, url]) => (
                          <Button
                            key={format}
                            onClick={() => handleDownload(format, url!)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            {format.toUpperCase()}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tasks found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first 3D model to see it here'}
          </p>
        </div>
      )}

      {/* Modal for detailed view */}
      {selectedTask && selectedTask.model_urls?.glb && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  3D Model Details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ID: {getTaskId(selectedTask)} • Created: {new Date(selectedTask.created_at * 1000).toLocaleString()}
                </p>
              </div>
              <Button
                onClick={() => setSelectedTask(null)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>
            
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 3D Model Viewer */}
              <div className="lg:col-span-2">
                <ModelViewer3D
                  modelUrl={selectedTask.model_urls.glb}
                  thumbnailUrl={selectedTask.thumbnail_url}
                  taskId={getTaskId(selectedTask) || 'unknown'}
                  modelUrls={selectedTask.model_urls}
                  onDownload={handleDownload}
                />
              </div>
              
              {/* Task Details Panel */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Task Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status}
                      </span>
                    </div>
                    
                    {(selectedTask as any).mode && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                        <span className="font-medium capitalize">{(selectedTask as any).mode}</span>
                      </div>
                    )}
                    
                    {selectedTask.task_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium">{selectedTask.task_type}</span>
                      </div>
                    )}
                    
                    {(selectedTask as any).seed && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Seed:</span>
                        <span className="font-mono text-xs">{(selectedTask as any).seed}</span>
                      </div>
                    )}
                    
                    {selectedTask.progress !== undefined && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                          <span className="font-medium">{selectedTask.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${selectedTask.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {selectedTask.finished_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Finished:</span>
                        <span className="text-xs">{new Date(selectedTask.finished_at * 1000).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Prompt/Name Information */}
                {((selectedTask as any).prompt || (selectedTask as any).name) && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Generation Details</h4>
                    <div className="space-y-2 text-sm">
                      {(selectedTask as any).name && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Name:</span>
                          <p className="font-medium mt-1">{(selectedTask as any).name}</p>
                        </div>
                      )}
                      {(selectedTask as any).prompt && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Prompt:</span>
                          <p className="italic mt-1 text-gray-800 dark:text-gray-200">{(selectedTask as any).prompt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Raw JSON Data */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Raw Data</h4>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-40 bg-white dark:bg-gray-800 p-2 rounded">
                    {JSON.stringify(selectedTask, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskGallery;