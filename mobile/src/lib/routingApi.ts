import { apiClient } from './api';

export type RoutingVehicle = 'motorbike' | 'car' | 'suv';

export type SafePathResponse = {
  found: boolean;
  reason?: string;
  vehicle?: { name?: string; maxWadingDepthCm?: number };
  route?: {
    total_distance_m?: number;
    total_cost_sec?: number;
    avoided?: { blocked_edge_ids?: Array<number | string> };
  };
};

export async function fetchSafePath(input: {
  start_lng: number;
  start_lat: number;
  end_lng: number;
  end_lat: number;
  vehicle_type: RoutingVehicle;
}) {
  const { data } = await apiClient.get('/api/v1/routing/safe-path', { params: input });
  return data;
}
