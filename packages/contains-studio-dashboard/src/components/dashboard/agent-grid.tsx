'use client';

import { useState } from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Agent } from '@/types';

import { AgentCard } from './agent-card';

interface AgentGridProps {
  agents: Agent[];
}

const domains = [
  'all',
  'engineering',
  'design',
  'marketing',
  'product',
  'project-management',
  'studio-operations',
  'testing',
  'bonus',
];

export function AgentGrid({ agents }: AgentGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || agent.domain === selectedDomain;
    const matchesStatus = selectedStatus === 'all' || agent.status === selectedStatus;

    return matchesSearch && matchesDomain && matchesStatus;
  });

  const agentsByDomain = domains.reduce(
    (acc, domain) => {
      if (domain === 'all') {
        return acc;
      }
      acc[domain] = filteredAgents.filter((agent) => agent.domain === domain);
      return acc;
    },
    {} as Record<string, Agent[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by domain" />
          </SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain === 'all' ? 'All Domains' : domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All ({filteredAgents.length})</TabsTrigger>
          {domains.slice(1).map((domain) => (
            <TabsTrigger key={domain} value={domain}>
              {domain} ({agentsByDomain[domain]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>

        {domains.slice(1).map((domain) => (
          <TabsContent key={domain} value={domain} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentsByDomain[domain]?.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No agents found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
