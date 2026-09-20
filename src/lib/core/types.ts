/** Núcleo común TiendaPro SaaS — contratos tipados (sin persistencia remota en esta fase). */

export type TenantId = string;
export type OrganizationId = string;
export type UserId = string;
export type ProjectId = string;

export type CoreAuditAction = "module.toggle" | "plan.change" | "config.update" | "auth.login";

export type AuditEntryCore = {
  id: string;
  tenantId: TenantId;
  actorUserId: UserId | null;
  action: CoreAuditAction;
  resource: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Organization = {
  id: OrganizationId;
  tenantId: TenantId;
  legalName: string;
  slug: string;
};

export type TenantUser = {
  id: UserId;
  tenantId: TenantId;
  email: string;
  displayName: string;
};

export type RoleId = "owner" | "admin" | "operator" | "viewer";

export type Permission =
  | "core:read"
  | "core:configure"
  | "modules:activate"
  | "billing:read"
  | "projects:write";

export type RoleDefinition = {
  id: RoleId;
  permissions: Permission[];
};

export type Project = {
  id: ProjectId;
  tenantId: TenantId;
  name: string;
  status: "active" | "archived";
};

export type TenantConfig = {
  tenantId: TenantId;
  locale: string;
  timezone: string;
  customDomain: string | null;
  deploymentMode: "shared" | "dedicated";
};

/** Contratos que los módulos consumen del núcleo — evitar duplicar entidades. */
export type CoreEntityRefs = {
  tenantId: TenantId;
  organizationId: OrganizationId;
  actorUserId: UserId;
};

export type CoreServicesContract = {
  getOrganization(tenantId: TenantId): Promise<Organization | null>;
  listProjects(tenantId: TenantId): Promise<Project[]>;
  appendAudit(entry: Omit<AuditEntryCore, "id" | "createdAt">): Promise<void>;
};
