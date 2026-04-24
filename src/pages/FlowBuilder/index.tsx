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
  NodeTypes,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DashboardLayout from '@/components/DashboardLayout';
import Sidebar from './Sidebar';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { 
  Save, Play, ArrowLeft, Loader2, 
  LayoutDashboard, GitBranch, Settings, Users,
  Eye, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom Nodes
import MessageNode from './nodes/MessageNode';
import QuestionNode from './nodes/QuestionNode';
import LeadNode from './nodes/LeadNode';
import ConditionNode from './nodes/ConditionNode';
import { StartNode, ResultNode } from './nodes/BaseNodes';

// Tab Views
import LeadsView from './LeadsView';

const nodeTypes: NodeTypes = {
  start: StartNode,
  message: MessageNode,
  question: QuestionNode,
  input: LeadNode,
  condition: ConditionNode,
  result: ResultNode,
};

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { strokeWidth: 3, stroke: '#2563EB' },
  animated: true,
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
  const [activeTab, setActiveTab] = useState('fluxo');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Load flow data from Supabase
  useEffect(() => {
    const fetchFlow = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data: flow, error: flowError } = await supabase.from('flows').select('*').eq('id', id).single();
        if (flowError || !flow) {
          toast.error("Fluxo não encontrado");
          navigate('/dashboard/quizzes');
          return;
        }
        setFlowInfo(flow);

        const { data: dbNodes } = await supabase.from('flow_nodes').select('*').eq('flow_id', id);
        const { data: dbEdges } = await supabase.from('flow_edges').select('*').eq('flow_id', id);

        if (dbNodes && dbNodes.length > 0) {
          setNodes(dbNodes.map(n => ({
            id: n.id,
            type: n.type,
            position: { x: n.position_x, y: n.position_y },
            data: n.data
          })));
        }

        if (dbEdges && dbEdges.length > 0) {
          setEdges(dbEdges.map(e => ({
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            sourceHandle: e.source_handle,
            targetHandle: e.target_handle,
            data: e.condition
          })));
        }
      } catch (err) {
        toast.error("Erro ao carregar o fluxo");
      } finally {
        setLoading(false);
      }
    };
    fetchFlow();
  }, [id]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)),
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
      if (!type) return;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      let data: any = { label: `${type} node`, type };
      if (type === 'question') { data.label = 'Nova Pergunta'; data.question = ''; data.options = []; }
      if (type === 'message') { data.label = 'Nova Mensagem'; data.content = ''; }
      if (type === 'input') { data.label = 'Captura Lead'; data.title = 'Deixe os seus dados'; }
      if (type === 'result') { data.label = 'Resultado Final'; }

      const newNode = { id: uuidv4(), type, position, data };
      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
    },
    [reactFlowInstance, setNodes],
  );

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await supabase.from('flow_edges').delete().eq('flow_id', id);
      await supabase.from('flow_nodes').delete().eq('flow_id', id);

      const nodesToInsert = nodes.map(n => ({ id: n.id, flow_id: id, type: n.type, position_x: n.position.x, position_y: n.position.y, data: n.data }));
      const { error: nErr } = await supabase.from('flow_nodes').insert(nodesToInsert);
      if (nErr) throw nErr;

      const edgesToInsert = edges.map(e => ({ flow_id: id, source_node_id: e.source, target_node_id: e.target, source_handle: e.sourceHandle, target_handle: e.targetHandle, condition: e.data || {} }));
      if (edgesToInsert.length > 0) {
        const { error: eErr } = await supabase.from('flow_edges').insert(edgesToInsert);
        if (eErr) throw eErr;
      }
      toast.success("Fluxo guardado!");
    } catch (err: any) {
      toast.error("Erro ao guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background animate-pulse">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Preparando o Construtor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-[#F3F4F6]">
      {/* INLEAD STYLE TOP BAR */}
      <div className="bg-white border-b px-6 h-16 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="hover:bg-blue-50" onClick={() => navigate('/dashboard/quizzes')}>
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </Button>
          <div className="hidden lg:block h-6 w-[1px] bg-border mx-2" />
          <div>
            <h2 className="text-base font-black text-slate-800 leading-none mb-1">{flowInfo?.name || 'Meu Funil'}</h2>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Edição Ativa</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
          <TabsList className="bg-slate-100/50 p-1 rounded-full border border-slate-200">
            <TabsTrigger value="builder" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Construtor
            </TabsTrigger>
            <TabsTrigger value="fluxo" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
              <GitBranch className="w-4 h-4 mr-2" /> Fluxo
            </TabsTrigger>
            <TabsTrigger value="leads" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
              <Users className="w-4 h-4 mr-2" /> Leads
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">
              <Settings className="w-4 h-4 mr-2" /> Config
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-600 px-6 font-bold transition-all">
            <Eye className="w-4 h-4 mr-2" /> Pré-visualizar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 px-8 font-bold transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {saving ? 'A Guardar...' : 'Publicar'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {activeTab === 'leads' ? (
          <div className="flex-1 overflow-y-auto">
            <LeadsView flowId={id!} />
          </div>
        ) : activeTab === 'config' ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">
             Configurações Gerais do Funil (Em breve)
          </div>
        ) : (
          <>
            {/* Canvas Area */}
            <div className="flex-1 h-full relative z-0" ref={reactFlowWrapper}>
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
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
              >
                <Background color="#CBD5E1" variant={BackgroundVariant.Dots} gap={24} size={1} />
                <Controls className="!bg-white !border-slate-200 !shadow-lg !rounded-xl overflow-hidden" />
                <MiniMap className="!bg-white !border-slate-200 !shadow-lg !rounded-xl" maskColor="rgba(37, 99, 235, 0.05)" />
              </ReactFlow>
            </div>

            {/* Sidebar Contextual */}
            <Sidebar 
              selectedNode={selectedNode} 
              setNodes={setNodes} 
              isMobileVisible={showMobileSidebar}
            />
          </>
        )}
      </div>
    </div>
  );
};

const FlowBuilder = () => {
  return (
    <DashboardLayout>
      <div className="h-full bg-background rounded-lg border-0 shadow-none overflow-hidden mt-[-1rem] mb-[-1rem] mx-[-1rem]">
        <ReactFlowProvider>
          <FlowBuilderInstance />
        </ReactFlowProvider>
      </div>
    </DashboardLayout>
  );
};

export default FlowBuilder;
