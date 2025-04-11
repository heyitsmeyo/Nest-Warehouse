/* eslint-disable */

'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
  EdgeTypes,
} from 'reactflow';
import Editor from '@monaco-editor/react';
import 'reactflow/dist/style.css';

interface WarehouseNode {
  name: string;
  x: number;
  y: number;
  isHome: boolean;
  isTag: boolean;
  tagColor?: string;
}

interface WarehouseConnection {
  fromNode: string;
  toNode: string;
  distance: number;
}

interface WarehouseData {
  nodes: WarehouseNode[];
  connections: WarehouseConnection[];
}

const defaultData: WarehouseData = {
  nodes: [],
  connections: [],
};

export default function Home() {
  const [data, setData] = useState<WarehouseData>(defaultData);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editorValue, setEditorValue] = useState<string>(JSON.stringify(defaultData, null, 2));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/warehouse/bulk');
      const warehouseData = await response.json();
      
      if (!response.ok) {
        if (response.status === 503) {
          setError('Database connection error. Please try again later.');
          console.error('Database connection error:', warehouseData.error);
          setData(defaultData);
          setEditorValue(JSON.stringify(defaultData, null, 2));
          return;
        }
        throw new Error(warehouseData.error || 'Failed to fetch data');
      }

      // Ensure we have valid data structure
      const transformedData: WarehouseData = {
        nodes: Array.isArray(warehouseData.nodes) ? warehouseData.nodes.map((node: any) => ({
          name: node.name || '',
          x: Number(node.x) || 0,
          y: Number(node.y) || 0,
          isHome: Boolean(node.isHome),
          isTag: Boolean(node.isTag),
          tagColor: node.tagColor || undefined
        })) : [],
        connections: Array.isArray(warehouseData.connections) ? warehouseData.connections.map((conn: any) => ({
          fromNode: conn.fromNode || '',
          toNode: conn.toNode || '',
          distance: Number(conn.distance) || 0
        })) : []
      };

      setData(transformedData);
      setEditorValue(JSON.stringify(transformedData, null, 2));
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setData(defaultData);
      setEditorValue(JSON.stringify(defaultData, null, 2));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data || !data.nodes || !data.connections) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = data.nodes.map((node) => ({
      id: node.name,
      position: { x: node.x * 100, y: node.y * 100 },
      data: { label: node.name },
      style: {
        background: node.isHome ? '#10b981' : node.isTag ? node.tagColor || '#f59e0b' : '#3b82f6',
        color: '#ffffff',
        border: '2px solid #1e293b',
        borderRadius: '50%',
        width: 50,
        height: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));

    const newEdges: Edge[] = data.connections.map((connection) => ({
      id: `e${connection.fromNode}-${connection.toNode}`,
      source: connection.fromNode,
      target: connection.toNode,
      label: connection.distance.toString(),
      style: { 
        stroke: '#3b82f6',
        strokeWidth: 2,
      },
      animated: true,
      labelStyle: { 
        fill: '#ffffff',
        fontSize: 12,
      },
      labelBgStyle: { 
        fill: '#1e293b', 
        opacity: 0.8,
      },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
      type: 'smoothstep',
    }));

    console.log('Setting nodes:', newNodes);
    console.log('Setting edges:', newEdges);
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [data, setNodes, setEdges]);

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setEditorValue(value);
      try {
        const parsedData = JSON.parse(value);
        setData(parsedData);
      } catch (error) {
        console.error('Invalid JSON:', error);
      }
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await fetch('/api/warehouse/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: editorValue,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update data');
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating data:', error);
      setError(error instanceof Error ? error.message : 'Failed to update data');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch('/api/warehouse/bulk', {
        method: 'DELETE',
      });

      if (response.ok) {
        setData(defaultData);
        setEditorValue(JSON.stringify(defaultData, null, 2));
        fetchData();
      } else {
        console.error('Failed to delete data');
      }
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white">
      {/* Left panel - JSON Editor */}
      <div className="w-1/2 p-4 bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Warehouse Configuration</h2>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Update Graph
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete All
            </button>
          </div>
        </div>
        <div className="h-[calc(100vh-100px)] border border-gray-700 rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="json"
            value={editorValue}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
            }}
          />
        </div>
      </div>

      {/* Right panel - Graph Visualization */}
      <div className="w-1/2 bg-gray-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          defaultEdgeOptions={{
            type: 'straight',
            animated: true,
            style: { stroke: '#3b82f6' },
          }}
        >
          <Background color="#1e293b" gap={16} />
          <Controls 
            className="bg-gray-800 text-white p-2 rounded-lg shadow-lg"
            style={{ 
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
