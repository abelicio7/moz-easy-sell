-- Create flows table
CREATE TABLE public.flows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')) NOT NULL,
    theme JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create flow_nodes table
CREATE TABLE public.flow_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_id UUID REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    position_x FLOAT NOT NULL DEFAULT 0,
    position_y FLOAT NOT NULL DEFAULT 0,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create flow_edges table
CREATE TABLE public.flow_edges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_id UUID REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
    source_node_id UUID REFERENCES public.flow_nodes(id) ON DELETE CASCADE NOT NULL,
    target_node_id UUID REFERENCES public.flow_nodes(id) ON DELETE CASCADE NOT NULL,
    source_handle TEXT,
    target_handle TEXT,
    condition JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create flow_leads table
CREATE TABLE public.flow_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flow_id UUID REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
    contact_data JSONB DEFAULT '{}'::jsonb,
    answers JSONB DEFAULT '{}'::jsonb,
    path JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    score INTEGER DEFAULT 0,
    result_node_id UUID REFERENCES public.flow_nodes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_leads ENABLE ROW LEVEL SECURITY;

-- Policies for flows
CREATE POLICY "Users can manage their own flows" ON public.flows FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active flows" ON public.flows FOR SELECT USING (status = 'active');

-- Policies for flow_nodes
CREATE POLICY "Users can manage their own flow nodes" ON public.flow_nodes FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.flows WHERE id = flow_id)
);
CREATE POLICY "Public can view nodes of active flows" ON public.flow_nodes FOR SELECT USING (
    flow_id IN (SELECT id FROM public.flows WHERE status = 'active')
);

-- Policies for flow_edges
CREATE POLICY "Users can manage their own flow edges" ON public.flow_edges FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.flows WHERE id = flow_id)
);
CREATE POLICY "Public can view edges of active flows" ON public.flow_edges FOR SELECT USING (
    flow_id IN (SELECT id FROM public.flows WHERE status = 'active')
);

-- Policies for flow_leads
CREATE POLICY "Users can view leads of their flows" ON public.flow_leads FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.flows WHERE id = flow_id)
);
CREATE POLICY "Public can insert flow leads" ON public.flow_leads FOR INSERT WITH CHECK (true);
