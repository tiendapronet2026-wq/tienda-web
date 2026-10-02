grant select, insert, update, delete on public.integration_connections to authenticated;
grant select on public.integration_link_sessions to authenticated;
grant select on public.integration_audit_events to authenticated;
notify pgrst, 'reload schema';
