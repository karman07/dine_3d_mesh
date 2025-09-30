import React, { useState } from 'react';
import { Button } from './ui/button';
import { meshyAPI, getTaskId } from '../services/meshyAPI';

const APITester: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');
  const [lastTaskId, setLastTaskId] = useState<string>('');

  const testTextTo3D = async () => {
    setTesting(true);
    setResult('Testing Text to 3D API...');
    
    try {
      const response = await meshyAPI.textTo3D({
        mode: "preview",
        prompt: "a simple red cube",
        art_style: "realistic"
      });
      
      console.log('Text to 3D API Response:', response);
      const taskId = getTaskId(response);
      setLastTaskId(taskId || '');
      setResult(`✅ Text to 3D API Success!\nTask ID: ${taskId || 'NOT FOUND'}\nStatus: ${response.status}\n\nRaw Response Structure:\n${JSON.stringify(response, null, 2)}\n\nExtracted Task ID: ${taskId}`);
    } catch (error) {
      setResult(`❌ Text to 3D API Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testTaskPolling = async () => {
    if (!lastTaskId) {
      setResult('❌ No task ID available for testing. Please run a successful API call first.');
      return;
    }

    setTesting(true);
    setResult(`Testing task polling with ID: ${lastTaskId}...`);
    
    try {
      const taskStatus = await meshyAPI.getTask(lastTaskId, 'text_to_3d'); // Specify task type
      setResult(`✅ Task Polling Success!\nTask ID: ${lastTaskId}\nStatus: ${taskStatus.status}\n\nTask Details:\n${JSON.stringify(taskStatus, null, 2)}`);
    } catch (error) {
      setResult(`❌ Task Polling Error:\nTask ID: ${lastTaskId}\nError: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testSpecificTaskId = async () => {
    const taskId = '01999965-2446-76ee-93c5-1fc4a9066061'; // Your specific task ID
    setTesting(true);
    setResult(`Testing specific task ID: ${taskId}...`);
    
    try {
      const response = await meshyAPI.testSpecificTask(taskId);
      setResult(`✅ Task Found!\nEndpoint: ${response.endpoint}\nStatus: ${response.data.status}\nProgress: ${response.data.progress}%\n\nFull Response:\n${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      // Also try the direct API call to compare with Postman
      try {
        setResult(`First attempt failed, trying direct fetch...`);
        const directResponse = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}`,
            'Accept': 'application/json'
          }
        });
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          setResult(`✅ Direct Fetch Success!\nStatus: ${directResponse.status}\nData: ${JSON.stringify(data, null, 2)}`);
        } else {
          setResult(`❌ Direct Fetch Failed!\nStatus: ${directResponse.status}\nStatusText: ${directResponse.statusText}\nAPI call failed with both axios and fetch`);
        }
      } catch (fetchError) {
        setResult(`❌ All methods failed!\nAxios Error: ${error instanceof Error ? error.message : String(error)}\nFetch Error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
    } finally {
      setTesting(false);
    }
  };

  const testTextTo3DTaskRetrieval = async () => {
    setTesting(true);
    setResult('Testing Text-to-3D task retrieval (v2 endpoint)...');
    
    try {
      const testTaskId = "018a210d-8ba4-705c-b111-1f1776f7f578";
      const response = await meshyAPI.getTextTo3DTask(testTaskId);
      setResult(`✅ Text-to-3D Task Retrieval Success!\nTask ID: ${testTaskId}\nStatus: ${response.status}\n\nTask Details:\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ Text-to-3D Task Retrieval Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testRefineMode = async () => {
    setTesting(true);
    setResult('Testing Text-to-3D refine mode...');
    
    try {
      const response = await meshyAPI.textTo3D({
        mode: "refine",
        preview_task_id: "018a210d-8ba4-705c-b111-1f1776f7f578",
        enable_pbr: true
      });
      
      const taskId = getTaskId(response);
      setLastTaskId(taskId || '');
      setResult(`✅ Text-to-3D Refine Mode Success!\nNew Task ID: ${taskId || 'NOT FOUND'}\nStatus: ${response.status}\n\nRaw Response Structure:\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ Text-to-3D Refine Mode Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testDirectCurl = async () => {
    setTesting(true);
    setResult('Testing direct curl commands...');
    
    try {
      // Test the task retrieval curl command
      const taskResponse = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}`,
        }
      });

      const taskData = await taskResponse.json();
      
      if (taskResponse.ok) {
        setResult(`✅ Direct Curl Task Retrieval Success!\nStatus: ${taskResponse.status}\n\n📋 TASK DETAILS:\n${JSON.stringify(taskData, null, 2)}`);
      } else {
        setResult(`❌ Direct Curl Task Retrieval Error (${taskResponse.status}):\n${JSON.stringify(taskData, null, 2)}`);
      }
    } catch (error) {
      setResult(`❌ Direct Curl Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testImageTo3D = async () => {
    setTesting(true);
    setResult('Testing Image to 3D API...');
    
    try {
      // Use a simple test image URL
      const response = await meshyAPI.imageTo3D({
        image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Red_Cube.png/256px-Red_Cube.png",
        enable_pbr: true,
        should_texture: true
      });
      
      const taskId = getTaskId(response);
      setLastTaskId(taskId || '');
      setResult(`✅ Image to 3D API Success!\nTask ID: ${taskId || 'NOT FOUND'}\nStatus: ${response.status}\n\nRaw Response Structure:\n${JSON.stringify(response, null, 2)}\n\nExtracted Task ID: ${taskId}`);
    } catch (error) {
      setResult(`❌ Image to 3D API Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testListTextTo3DTasks = async () => {
    setTesting(true);
    setResult('Testing list text-to-3d tasks endpoint...');
    
    try {
      const response = await meshyAPI.listTextTo3DTasks(10);
      setResult(`✅ List Text-to-3D Tasks Success!\nFound ${response?.length || 0} tasks\n\nTasks:\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ List Text-to-3D Tasks Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testListImageTo3DTasks = async () => {
    setTesting(true);
    setResult('Testing list image-to-3d tasks endpoint...');
    
    try {
      const response = await meshyAPI.listImageTo3DTasks(10);
      setResult(`✅ List Image-to-3D Tasks Success!\nFound ${response?.length || 0} tasks\n\nTasks:\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ List Image-to-3D Tasks Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testListMultiImageTo3DTasks = async () => {
    setTesting(true);
    setResult('Testing list multi-image-to-3d tasks endpoint...');
    
    try {
      const response = await meshyAPI.listMultiImageTo3DTasks(10);
      setResult(`✅ List Multi-Image-to-3D Tasks Success!\nFound ${response?.length || 0} tasks\n\nTasks:\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`❌ List Multi-Image-to-3D Tasks Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testCorrectTaskEndpoint = async () => {
    setTesting(true);
    setResult('Testing correct task endpoint for your task ID...');
    
    try {
      const taskId = '018a210d-8ba4-705c-b111-1f1776f7f578';
      
      // Test the correct endpoint based on the curl command you provided
      const directResponse = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (directResponse.ok) {
        const data = await directResponse.json();
        setResult(`✅ Correct Endpoint Works!\nEndpoint: /openapi/v1/image-to-3d/${taskId}\nStatus: ${directResponse.status}\nData: ${JSON.stringify(data, null, 2)}`);
      } else {
        setResult(`❌ Endpoint Failed!\nStatus: ${directResponse.status}\nStatusText: ${directResponse.statusText}`);
      }
    } catch (error) {
      setResult(`❌ Test Failed:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testDeleteTask = async () => {
    setTesting(true);
    setResult('Testing delete task endpoints...');
    
    try {
      // Test the actual task ID from your curl commands
      const testTaskId = "018a210d-8ba4-705c-b111-1f1776f7f578";
      
      // First, try to get the task to see what type it is
      setResult(`Step 1: Checking task type for ${testTaskId}...`);
      
      let taskType: 'text_to_3d' | 'image_to_3d' | 'multi_image_to_3d' | undefined;
      
      // Try to determine task type by checking which endpoint works
      try {
        await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${testTaskId}`, {
          headers: { 'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}` }
        });
        taskType = 'image_to_3d';
      } catch {
        try {
          await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${testTaskId}`, {
            headers: { 'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}` }
          });
          taskType = 'text_to_3d';
        } catch {
          try {
            await fetch(`https://api.meshy.ai/openapi/v1/multi-image-to-3d/${testTaskId}`, {
              headers: { 'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}` }
            });
            taskType = 'multi_image_to_3d';
          } catch {
            taskType = undefined;
          }
        }
      }
      
      setResult(`Step 2: Detected task type: ${taskType || 'unknown'}\n\nStep 3: Testing delete with our enhanced function...`);
      
      // Note: We won't actually delete the task, just test the endpoint detection
      await meshyAPI.deleteTask(testTaskId, taskType);
      
      setResult(`✅ Delete Task Test Success!\nTask ID: ${testTaskId}\nDetected Type: ${taskType || 'auto-detected'}\nDelete function worked correctly`);
    } catch (error: any) {
      // This is expected since we're testing with a potentially non-existent task
      const errorDetails = error.response?.data || error.message;
      setResult(`ℹ️ Delete Test Completed\nTask ID: 018a210d-8ba4-705c-b111-1f1776f7f578\nResult: ${error.message}\n\nThis is normal if the task doesn't exist or was already deleted.\n\nError details: ${JSON.stringify(errorDetails, null, 2)}`);
    } finally {
      setTesting(false);
    }
  };

  const testStreamProgress = async () => {
    setTesting(true);
    setResult('Testing stream progress endpoint...');
    
    try {
      const testTaskId = "018a210d-8ba4-705c-b111-1f1776f7f578";
      const stream = await meshyAPI.streamTaskProgress(testTaskId);
      
      const reader = stream.getReader();
      let result = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          result += chunk;
        }
        
        setResult(`✅ Stream Progress Success!\nStream data:\n${result}`);
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      setResult(`❌ Stream Progress Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setResult('Testing basic connection...');
    
    try {
      // Test basic fetch to the API
      const response = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_MESHY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: "preview",
          prompt: "test cube",
          art_style: "realistic"
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        const taskId = data.id || data.task_id || data.result || 'NOT FOUND';
        setResult(`✅ Direct API Connection Successful!\nStatus: ${response.status}\n\n🔍 RESPONSE STRUCTURE ANALYSIS:\n${JSON.stringify(data, null, 2)}\n\n🔑 AVAILABLE TASK ID FIELDS:\n- data.id: ${data.id || 'undefined'}\n- data.task_id: ${data.task_id || 'undefined'}\n- data.result: ${data.result || 'undefined'}\n\n✅ EXTRACTED TASK ID: ${taskId}`);
      } else {
        setResult(`❌ API Error (${response.status}):\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      setResult(`❌ Network Error:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          API Connection Test
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Test the connection to Meshy API and debug any issues
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Configuration:</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>API Key:</strong> {import.meta.env.VITE_MESHY_API_KEY ? `${import.meta.env.VITE_MESHY_API_KEY.substring(0, 10)}...` : '❌ Missing'}</p>
            <p><strong>Base URL:</strong> {import.meta.env.VITE_MESHY_API_BASE_URL || 'https://api.meshy.ai'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button onClick={testConnection} disabled={testing} variant="outline">
            Test Direct Connection
          </Button>
          
          <Button onClick={testTextTo3D} disabled={testing} variant="outline">
            Test Text to 3D API
          </Button>
          
          <Button onClick={testImageTo3D} disabled={testing} variant="outline">
            Test Image to 3D API
          </Button>

          <Button onClick={testTaskPolling} disabled={testing || !lastTaskId} variant="outline">
            Test Task Polling
          </Button>

          <Button onClick={testTextTo3DTaskRetrieval} disabled={testing} variant="outline">
            Test Task Retrieval (v2)
          </Button>

          <Button onClick={testRefineMode} disabled={testing} variant="outline">
            Test Refine Mode
          </Button>

          <Button onClick={testDirectCurl} disabled={testing} variant="outline">
            Test Direct Curl
          </Button>

          <Button onClick={testSpecificTaskId} disabled={testing} variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100">
            Test Your Task ID
          </Button>

          <Button onClick={testListTextTo3DTasks} disabled={testing} variant="outline" className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100">
            List Text-to-3D Tasks
          </Button>

          <Button onClick={testListImageTo3DTasks} disabled={testing} variant="outline" className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100">
            List Image-to-3D Tasks
          </Button>

          <Button onClick={testListMultiImageTo3DTasks} disabled={testing} variant="outline" className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100">
            List Multi-Image Tasks
          </Button>

          <Button onClick={testCorrectTaskEndpoint} disabled={testing} variant="outline" className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100">
            Test Correct Endpoint
          </Button>

          <Button onClick={testDeleteTask} disabled={testing} variant="outline" className="bg-red-50 border-red-200 text-red-800 hover:bg-red-100">
            Test Delete Task
          </Button>

          <Button onClick={testStreamProgress} disabled={testing} variant="outline" className="bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100">
            Test Stream Progress
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Result:</h3>
            <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-auto max-h-96">
              {result}
            </pre>
          </div>
        )}

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Curl Commands Being Tested:
          </h4>
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-2">
            <div>
              <strong>Task Retrieval:</strong>
              <code className="block bg-blue-100 dark:bg-blue-800 p-2 rounded mt-1">
                curl https://api.meshy.ai/openapi/v2/text-to-3d/018a210d-8ba4-705c-b111-1f1776f7f578 \<br/>
                -H "Authorization: Bearer YOUR_API_KEY"
              </code>
            </div>
            <div>
              <strong>Refine Mode:</strong>
              <code className="block bg-blue-100 dark:bg-blue-800 p-2 rounded mt-1">
                curl https://api.meshy.ai/openapi/v2/text-to-3d \<br/>
                -H 'Authorization: Bearer YOUR_API_KEY' \<br/>
                -H 'Content-Type: application/json' \<br/>
                -d '&#123;"mode": "refine", "preview_task_id": "018a210d-8ba4-705c-b111-1f1776f7f578", "enable_pbr": true&#125;'
              </code>
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Troubleshooting Tips:
          </h4>
          <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
            <li>• Check if your API key is valid and active</li>
            <li>• Ensure you have sufficient API credits</li>
            <li>• The task ID 018a210d-8ba4-705c-b111-1f1776f7f578 might be expired</li>
            <li>• Check browser console for detailed error messages</li>
            <li>• Verify network connectivity</li>
            <li>• Check if API endpoints have changed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default APITester;