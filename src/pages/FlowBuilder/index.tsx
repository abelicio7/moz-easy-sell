import { useState, useCallback, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DashboardLayout from '@/components/DashboardLayout';
import Sidebar from './Sidebar';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Save, Play } from 'lucide-react';
import { toast } from 'sonner';

// Custom Nodes
import MessageNode from './nodes/MessageNode';
import QuestionNode from './nodes/QuestionNode';
import LeadNode from './nodes/LeadNode';
import { StartNode, ResultNode } from './nodes/BaseNodes';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  input: LeadNode,
  result: ResultNode,
};
import { FlowNodeData } from '@/types/flow';

// Initial nodes for a new flow
const initialNodes = [
  {
    id: 'start-node',
    type: 'start',
    position: { x: 250, y: 100 },
    data: { label: 'INÍCIO' },
  },
];

const FlowBuilderInstance = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Default data based on type
      let data: any = { label: `${type} node`, type };
      
      if (type === 'question') {
        data.label = 'Nova Pergunta';
        data.question = '';
        data.options = [];
      }
      if (type === 'message') {
        data.label = 'Nova Mensagem';
        data.content = '';
      }
      if (type === 'input') {
        data.label = 'Captura de Lead';
        data.title = 'Deixe os seus dados';
      }
      if (type === 'result') {
        data.label = 'Resultado Final';
      }

      const newNode = {
        id: `node-${uuidv4()}`,
        type: type,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
    },
    [reactFlowInstance, setNodes],
  );

  const handleSave = () => {
    console.log("Nodes", nodes);
    console.log("Edges", edges);
    toast.success("Fluxo salvo com sucesso! (Simulação)");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Builder Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-card border-b">
        <div>
          <h2 className="text-xl font-bold">Meu Primeiro Funil</h2>
          <p className="text-sm text-muted-foreground">Status: Rascunho</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Play className="w-4 h-4" /> Testar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      {/* Builder Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#ccc" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Sidebar / Properties Panel */}
        <Sidebar selectedNode={selectedNode} setNodes={setNodes} />
      </div>
    </div>
  );
};

const FlowBuilder = () => {
  return (
    <DashboardLayout>
      <div className="h-full bg-background rounded-lg border shadow-sm overflow-hidden mt-[-1rem] mb-[-1rem] mx-[-1rem]">
        <ReactFlowProvider>
          <FlowBuilderInstance />
        </ReactFlowProvider>
      </div>
    </DashboardLayout>
  );
};

export default FlowBuilder;
