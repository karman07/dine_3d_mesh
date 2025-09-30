import React from 'react';
import { Button } from './ui/button';
import { Download, Eye } from 'lucide-react';

interface ModelViewerProps {
  modelUrl: string;
  thumbnailUrl?: string;
  taskId: string;
  modelUrls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usd?: string;
    ply?: string;
  };
  onDownload?: (format: string, url: string) => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

const ModelViewer3D: React.FC<ModelViewerProps> = ({
  modelUrl,
  thumbnailUrl,
  taskId,
  modelUrls,
  onDownload
}) => {
  // Ensure we only use GLB files for 3D preview
  const glbUrl = modelUrls?.glb || modelUrl;
  console.log('🔍 ModelViewer3D - GLB URL:', glbUrl);
  const isGlbFile = glbUrl?.toLowerCase().includes('.glb') || glbUrl?.toLowerCase().includes('model.glb');
  
  // Add CORS proxy for problematic URLs
  
  // Don't render 3D viewer if no GLB file is available
  if (!isGlbFile || !glbUrl) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                3D Model Preview
              </h3>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Task ID: {taskId}
            </div>
          </div>
        </div>
        <div className="relative h-96 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <div className="text-gray-600 dark:text-gray-400 font-medium">GLB File Not Available</div>
            <div className="text-gray-500 dark:text-gray-500 text-sm mt-2">3D preview requires GLB format</div>
            {thumbnailUrl && (
              <div className="mt-4">
                <img src={thumbnailUrl} alt="Preview" className="max-w-xs mx-auto rounded-lg" />
              </div>
            )}
          </div>
        </div>
        {/* Still show download section if other formats available */}
        {modelUrls && Object.keys(modelUrls).length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900 dark:text-white flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Download Model
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(modelUrls)
                .filter(([_, url]) => url)
                .map(([format, url]) => (
                  <Button
                    key={format}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(format, url!)}
                    className="flex items-center justify-center space-x-1 text-xs"
                  >
                    <Download className="h-3 w-3" />
                    <span>{format.toUpperCase()}</span>
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  const handleDownload = (format: string, url: string) => {
    if (onDownload) {
      onDownload(format, url);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = url;
      link.download = `model_${taskId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Model Viewer Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              3D Model Preview
            </h3>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Task ID: {taskId}
          </div>
        </div>
      </div>

      {/* 3D Model Viewer with Enhanced Controls */}
      <div className="relative h-96 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <model-viewer
          src={glbUrl}
          poster={thumbnailUrl}
          alt={`3D Model - ${taskId}`}
          camera-controls
          touch-action="manipulation"
          disable-zoom="false"
          environment-image="neutral"
          exposure="1.0"
          shadow-intensity="0.5"
          shadow-softness="0.3"
          camera-orbit="0deg 75deg 3m"
          min-camera-orbit="auto auto 1m"
          max-camera-orbit="auto auto 8m"
          field-of-view="30deg"
          interaction-prompt="auto"
          loading="lazy"
          reveal="auto"
          preload
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            '--poster-color': 'transparent',
            '--progress-bar-color': '#3b82f6',
            '--progress-bar-height': '3px',
            '--progress-mask': 'none',
            '--interaction-prompt-color': '#ffffff',
            '--interaction-prompt-text-color': '#000000'
          }}
          onLoad={(event: any) => {
            console.log('✅ 3D Model loaded successfully:', glbUrl);
            // Enable all interactions after load
            const modelViewer = event.target;
            modelViewer.style.pointerEvents = 'auto';
            modelViewer.removeAttribute('loading');
          }}
          onError={(error: any) => {
            console.error('❌ 3D Model loading error:', error, 'GLB URL:', glbUrl);
          }}
          onModelVisibility={(event: any) => {
            console.log('👁️ Model visibility changed:', event.detail.visible);
          }}
        >
          {/* Loading indicator */}
          <div slot="progress-bar" className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-200 border-t-blue-500"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading 3D Model...</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2 max-w-md break-all">
                {glbUrl}
              </span>
            </div>
          </div>

          {/* Error fallback */}
          <div slot="error" className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 z-10">
            <div className="text-center p-4">
              <div className="text-red-500 text-2xl mb-2">⚠️</div>
              <div className="text-red-700 dark:text-red-300 font-medium">Failed to load GLB model</div>
              <div className="text-red-600 dark:text-red-400 text-xs mt-1 max-w-md break-all">
                📦 {glbUrl}
              </div>
              <div className="text-red-600 dark:text-red-400 text-xs mt-2">
                GLB file may be corrupted, too large, or inaccessible
              </div>
              <div className="flex gap-2 mt-3 justify-center">
                <button 
                  onClick={() => window.open(glbUrl, '_blank')} 
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  Test GLB URL
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                >
                  Retry
                </button>
                {thumbnailUrl && (
                  <button 
                    onClick={() => window.open(thumbnailUrl, '_blank')} 
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    View Thumbnail
                  </button>
                )}
              </div>
            </div>
          </div>
        </model-viewer>

        {/* Simple Controls Overlay */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 rounded-lg p-2 text-white text-xs">
          <div className="flex items-center space-x-3">
            <span title="Drag to rotate">🖱️</span>
            <span title="Scroll to zoom">🔍</span>
            <span title="Double-click to reset">🎯</span>
          </div>
        </div>


      </div>


    </div>
  );
};

export default ModelViewer3D;