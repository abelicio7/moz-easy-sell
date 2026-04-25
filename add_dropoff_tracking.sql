-- Add status to flow_leads to track drop-offs
ALTER TABLE public.flow_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed'));
ALTER TABLE public.flow_leads ADD COLUMN IF NOT EXISTS current_node_id UUID REFERENCES public.flow_nodes(id) ON DELETE SET NULL;

-- Enable real-time updates for tracking (optional but good)
ALTER TABLE public.flow_leads REPLICA IDENTITY FULL;
