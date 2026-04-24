import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Save, Play, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Custom Nodes
import MessageNode from './nodes/MessageNode';
import QuestionNode from './nodes/QuestionNode';
import LeadNode from './nodes/LeadNode';
import ConditionNode from './nodes/ConditionNode';
import { StartNode, ResultNode } from './nodes/BaseNodes';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  input: LeadNode,
  condition: ConditionNode,
  result: ResultNode,
};

const initialNodes = [
  {
    id: uuidv4(),
    type: 'start',
    position: { x: 250, y: 150 },
    data: { label: 'INÍCIO', type: 'start' },
  },
];

const FlowBuilderInstance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flowInfo, setFlowInfo] = useState<any>(null);

  // Load flow data from Supabase
  useEffect(() => {
    const fetchFlow = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // 1. Get Flow Info
        const { data: flow, error: flowError } = await supabase
          .from('flows')
          .select('*')
          .eq('id', id)
          .single();

        if (flowError || !flow) {
          toast.error("Fluxo não encontrado");
          navigate('/dashboard/quizzes');
          return;
        }
        setFlowInfo(flow);

        // 2. Get Nodes
        const { data: dbNodes, error: nodesError } = await supabase
          .from('flow_nodes')
          .select('*')
          .eq('flow_id', id);

        // 3. Get Edges
        const { data: dbEdges, error: edgesError } = await supabase
          .from('flow_edges')
          .select('*')
          .eq('flow_id', id);

        if (dbNodes && dbNodes.length > 0) {
          const formattedNodes = dbNodes.map(n => ({
            id: n.id,
            type: n.type,
            position: { x: n.position_x, y: n.position_y },
            data: n.data
          }));
          setNodes(formattedNodes);
        }

        if (dbEdges && dbEdges.length > 0) {
          const formattedEdges = dbEdges.map(e => ({
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            sourceHandle: e.source_handle,
            targetHandle: e.target_handle,
            data: e.condition
          }));
          setEdges(formattedEdges);
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar o fluxo");
      } finally {
        setLoading(false);
      }
    };

    fetchFlow();
  }, [id, navigate, setNodes, setEdges]);

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
        id: uuidv4(),
        type: type,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
    },
    [reactFlowInstance, setNodes],
  );

  const handleSave = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      
      // 1. Delete existing nodes and edges (simplified sync for now)
      // Note: In a production app, we would do a differential update
      await supabase.from('flow_edges').delete().eq('flow_id', id);
      await supabase.from('flow_nodes').delete().eq('flow_id', id);

      // 2. Insert Nodes
      const nodesToInsert = nodes.map(n => ({
        id: n.id,
        flow_id: id,
        type: n.type,
        position_x: n.position.x,
        position_y: n.position.y,
        data: n.data
      }));

      const { error: nodesError } = await supabase.from('flow_nodes').insert(nodesToInsert);
      if (nodesError) throw nodesError;

      // 3. Insert Edges
      const edgesToInsert = edges.map(e => ({
        id: e.id.length > 36 ? uuidv4() : e.id, // Ensure edge ID is also valid if needed
        flow_id: id,
        source_node_id: e.source,
        target_node_id: e.target,
        source_handle: e.sourceHandle,
        target_handle: e.targetHandle,
        condition: e.data || {}
      }));

      if (edgesToInsert.length > 0) {
        const { error: edgesError } = await supabase.from('flow_edges').insert(edgesToInsert);
        if (edgesError) throw edgesError;
      }

      toast.success("Fluxo guardado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">A carregar o seu funil...</p>
      </div>
    );
  }

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden">
      {/* Builder Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-card border-b sticky top-0 z-20">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard/quizzes')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-sm md:text-xl font-bold truncate max-w-[100px] md:max-w-[300px]">{flowInfo?.name || 'Meu Funil'}</h2>
            <p className="hidden md:block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
               {flowInfo?.status?.toUpperCase()} • ID: {id?.substring(0,8)}
            </p>
          </div>
        </div>
        <div className="flex gap-1 md:gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="md:hidden gap-1"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            {selectedNode ? <Settings2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {selectedNode ? 'Config' : 'Blocos'}
          </Button>
          
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary hidden sm:flex">
            <Play className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Testar</span>
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 shadow-lg shadow-primary/20 px-3 md:px-4">
            {saving ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Save className="w-3 h-3 md:w-4 md:h-4" />}
            <span>{saving ? 'A Guardar...' : 'Guardar'}</span>
          </Button>
        </div>
      </div>

      {/* Builder Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* React Flow Canvas */}
        <div className="flex-1 h-full relative bg-[#f8fafc] z-0" ref={reactFlowWrapper}>
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
        <Sidebar 
          selectedNode={selectedNode} 
          setNodes={setNodes} 
          isMobileVisible={showMobileSidebar}
        />
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
