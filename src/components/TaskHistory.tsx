import React, { useState, useEffect } from 'react';
import { Loader2, Download, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { meshyAPI, TaskResponse } from '../services/meshyAPI';
import { Button } from './ui/button';

const TaskHistory: React.FC = () => {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadTasks = async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await meshyAPI.listTasks(pageNum, 10);
      if (pageNum === 1) {
        setTasks(response.tasks);
      } else {
        setTasks(prev => [...prev, ...response.tasks]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING':
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTaskType = () => {
    // This is a simplified way to determine task type
    // In a real app, you might store this information
    return 'Generation Task';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Task History
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              View and manage your recent 3D model generation tasks
            </p>
          </div>
          <Button
            onClick={() => loadTasks(1)}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.length === 0 && !loading ? (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tasks yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Start creating 3D models to see your task history here.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {getTaskType()}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'SUCCEEDED' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : task.status === 'FAILED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Task ID: <span className="font-mono">{task.id}</span></p>
                      <p>Created: {new Date(task.created_at * 1000).toLocaleString()}</p>
                      {task.finished_at && (
                        <p>Finished: {new Date(task.finished_at * 1000).toLocaleString()}</p>
                      )}
                    </div>

                    {task.progress !== undefined && task.status !== 'SUCCEEDED' && task.status !== 'FAILED' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-600">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {task.task_error && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-red-800 dark:text-red-300 text-sm">
                          Error: {task.task_error.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {task.thumbnail_url && (
                    <img
                      src={task.thumbnail_url}
                      alt="Task preview"
                      className="w-20 h-20 object-cover rounded border border-gray-200 dark:border-gray-600"
                    />
                  )}
                </div>
              </div>

              {task.model_urls && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Download Models
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(task.model_urls).map(([format, url]) => (
                      <Button
                        key={format}
                        onClick={() => handleDownload(url, `model_${task.id}.${format}`)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {format.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {task.video_url && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    360° Preview
                  </h4>
                  <video
                    src={task.video_url}
                    controls
                    className="w-full max-w-xs rounded border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading tasks...</span>
          </div>
        )}

        {tasks.length > 0 && !loading && (
          <div className="text-center pt-4">
            <Button
              onClick={() => loadTasks(page + 1)}
              variant="outline"
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskHistory;