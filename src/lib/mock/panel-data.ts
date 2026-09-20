/** Datos ficticios — no representan clientes reales ni producción. */

export type MockClient = {
  id: string;
  name: string;
  segment: string;
  status: "activo" | "prospecto" | "pausa";
  projects: number;
};

export type MockProject = {
  id: string;
  name: string;
  client: string;
  phase: "discovery" | "build" | "launch" | "care";
  progress: number;
};

export type MockTask = {
  id: string;
  title: string;
  project: string;
  assignee: string;
  due: string;
  status: "pendiente" | "en curso" | "hecho";
};

export type MockAgentRun = {
  id: string;
  name: string;
  model: string;
  status: "idle" | "running" | "done";
  lastReport: string;
};

export type MockReport = {
  id: string;
  title: string;
  createdAt: string;
  agent: string;
  summary: string;
};

export const mockClients: MockClient[] = [
  { id: "c1", name: "Nova Retail (demo)", segment: "Retail", status: "activo", projects: 2 },
  { id: "c2", name: "Atlas Servicios (demo)", segment: "Servicios", status: "prospecto", projects: 1 },
  { id: "c3", name: "Horizonte Labs (demo)", segment: "Tecnología", status: "activo", projects: 3 },
];

export const mockProjects: MockProject[] = [
  { id: "p1", name: "Tienda showcase Q3", client: "Nova Retail (demo)", phase: "build", progress: 62 },
  { id: "p2", name: "Panel operaciones", client: "Atlas Servicios (demo)", phase: "discovery", progress: 18 },
  { id: "p3", name: "POS piloto", client: "Horizonte Labs (demo)", phase: "launch", progress: 91 },
];

export const mockTasks: MockTask[] = [
  { id: "t1", title: "Definir design tokens v3", project: "Tienda showcase Q3", assignee: "Agente UI", due: "2026-09-22", status: "en curso" },
  { id: "t2", title: "Mock flujos chatbot", project: "Panel operaciones", assignee: "Agente Reglas", due: "2026-09-25", status: "pendiente" },
  { id: "t3", title: "Informe sprint demo", project: "POS piloto", assignee: "Composer 2.5", due: "2026-09-20", status: "hecho" },
];

export const mockAgents: MockAgentRun[] = [
  { id: "a1", name: "Orquestador TiendaPro", model: "Composer 2.5", status: "idle", lastReport: "Informe configuración PR #1" },
  { id: "a2", name: "Validador permisos", model: "Composer 2.5", status: "done", lastReport: "Sin integraciones externas" },
  { id: "a3", name: "Generador informes", model: "Composer 2.5", status: "running", lastReport: "Reconstrucción 3.0 en curso" },
];

export const mockReports: MockReport[] = [
  {
    id: "r1",
    title: "Kickoff TiendaPro 3.0",
    createdAt: "2026-09-19",
    agent: "Orquestador TiendaPro",
    summary: "Plataforma comercial + panel mock + demos ficticias.",
  },
  {
    id: "r2",
    title: "Estado CI/Vercel PR #1",
    createdAt: "2026-09-19",
    agent: "Generador informes",
    summary: "Checks verdes; merge pendiente de autorización.",
  },
];

export const panelStats = {
  activeClients: 2,
  openProjects: 3,
  tasksDueWeek: 2,
  agentRunsToday: 1,
};
