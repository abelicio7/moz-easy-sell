export type FlowStatus = 'draft' | 'active' | 'inactive';

export type NodeType = 
  | 'start' 
  | 'question' 
  | 'message' 
  | 'input' 
  | 'condition' 
  | 'result' 
  | 'redirect' 
  | 'webhook' 
  | 'pixel';

export interface FlowTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  backgroundImage?: string;
}

export interface Flow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string;
  status: FlowStatus;
  theme: FlowTheme;
  created_at: string;
  updated_at: string;
}

// Data structures for different node types
export interface StartNodeData {
  title: string;
  description?: string;
  buttonText?: string;
  image_url?: string;
  video_url?: string;
}

export interface Option {
  id: string;
  label: string;
  value: string;
  score: number;
  result_tag?: string;
}

export interface QuestionNodeData {
  question: string;
  description?: string;
  questionType: 'multiple_choice' | 'single_choice';
  options: Option[];
  image_url?: string;
}

export interface MessageNodeData {
  title?: string;
  content: string;
  buttonText?: string;
  image_url?: string;
}

export interface InputNodeData {
  title: string;
  description?: string;
  fields: {
    id: string;
    type: 'text' | 'email' | 'phone' | 'number';
    label: string;
    required: boolean;
  }[];
  buttonText?: string;
}

export interface ConditionNodeData {
  conditions: {
    id: string;
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string;
  }[];
  logicalOperator: 'AND' | 'OR';
}

export interface ResultNodeData {
  title: string;
  description: string;
  image_url?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface RedirectNodeData {
  url: string;
  delayMs?: number;
}

export interface WebhookNodeData {
  url: string;
  method: 'POST' | 'GET';
  headers?: Record<string, string>;
  payloadMap?: Record<string, string>;
}

export interface PixelNodeData {
  eventName: string;
  eventData?: Record<string, any>;
}

export type FlowNodeData = 
  | StartNodeData 
  | QuestionNodeData 
  | MessageNodeData 
  | InputNodeData 
  | ConditionNodeData 
  | ResultNodeData 
  | RedirectNodeData 
  | WebhookNodeData 
  | PixelNodeData;

export interface FlowNode {
  id: string;
  flow_id: string;
  type: NodeType;
  position_x: number;
  position_y: number;
  data: FlowNodeData;
  created_at: string;
  updated_at: string;
}

export interface FlowEdgeCondition {
  operator: string;
  value: any;
}

export interface FlowEdge {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle?: string;
  target_handle?: string;
  condition?: FlowEdgeCondition;
  created_at: string;
}

export interface FlowLead {
  id: string;
  flow_id: string;
  contact_data: Record<string, any>;
  answers: Record<string, any>;
  path: string[];
  tags: string[];
  score: number;
  result_node_id?: string;
  created_at: string;
}
