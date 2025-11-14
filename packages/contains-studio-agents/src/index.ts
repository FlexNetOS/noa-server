// Contains Studio Agents - Placeholder
// This package is referenced by contains-studio-dashboard but not yet implemented

export const version = '1.0.0';

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export const agents: Agent[] = [];

export default {
  version,
  agents,
};
