import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import TaskGallery from './components/TaskGallery';
import TextTo3D from './components/TextTo3D';
import ImageTo3D from './components/ImageTo3D';
import MultiImageTo3D from './components/MultiImageTo3D';
import Remesh from './components/Remesh';
import Rigging from './components/Rigging';
import TaskHistory from './components/TaskHistory';

function App() {
  const [currentTab, setCurrentTab] = useState('task-gallery');

  const renderContent = () => {
    switch (currentTab) {
      case 'task-gallery':
        return <TaskGallery />;
      case 'text-to-3d':
        return <TextTo3D />;
      case 'image-to-3d':
        return <ImageTo3D />;
      case 'multi-image-to-3d':
        return <MultiImageTo3D />;
      case 'remesh':
        return <Remesh />;
      case 'rigging':
        return <Rigging />;
      case 'task-history':
        return <TaskHistory />;
      default:
        return <TaskGallery />;
    }
  };

  return (
    <ThemeProvider>
      <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
        {renderContent()}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
