export type RoutePathPoint = {
  latitude: number;
  longitude: number;
};

export type RouteResponse = {
  id: number;
  routeNumber: string;
  routeName: string;
  path: RoutePathPoint[];
};

export type RouteListItem = {
  id: number;
  routeNumber: string;
  routeName: string;
};
