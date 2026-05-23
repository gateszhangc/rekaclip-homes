GRANT anon TO authenticator;
GRANT anon TO postgres WITH ADMIN OPTION;
GRANT authenticated TO authenticator;
GRANT authenticated TO postgres WITH ADMIN OPTION;
GRANT authenticator TO postgres WITH ADMIN OPTION;
GRANT authenticator TO supabase_storage_admin;
GRANT service_role TO authenticator;
GRANT service_role TO postgres WITH ADMIN OPTION;
GRANT supabase_realtime_admin TO postgres;
