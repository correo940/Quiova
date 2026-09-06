-- ROLLBACK: restaura las policies tal y como estaban antes del 2026-09-05.
-- Uso: borrar primero las policies "admin_only_*" creadas por rls_fix_20260905.sql,
-- volver a poner RLS off en beta_mission_reviews y oficina_tablon si hiciera falta,
-- y ejecutar este archivo.

CREATE POLICY "Service role full access" ON public.ai_global_knowledge AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert api_usage" ON public.api_usage AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can read own api_usage" ON public.api_usage AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated can manage assistant responses" ON public.assistant_responses AS PERMISSIVE FOR ALL TO public USING ((auth.uid() IS NOT NULL));
CREATE POLICY "Everyone can read active assistant responses" ON public.assistant_responses AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));
CREATE POLICY "Allow public insert for bridge" ON public.document_ingestion_bridge AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public select for bridge" ON public.document_ingestion_bridge AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow public update for bridge" ON public.document_ingestion_bridge AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "Users can update own profile." ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Creators can create thoughts" ON public.shared_thoughts AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = creator_id));
CREATE POLICY "Creators can update their thoughts" ON public.shared_thoughts AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = creator_id));
CREATE POLICY "Creators can view their own thoughts" ON public.shared_thoughts AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = creator_id));
CREATE POLICY "Public access via share token" ON public.shared_thoughts AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Permitir acceso anon a gastos" ON public.splitsmart_gastos AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "Permitir acceso anon a grupos" ON public.splitsmart_grupos AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "Permitir acceso anon a miembros" ON public.splitsmart_miembros AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "Anyone can mark messages as read" ON public.thought_messages AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Creators can send messages" ON public.thought_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (((sender_type = 'creator'::text) AND (EXISTS ( SELECT 1 FROM shared_thoughts st WHERE ((st.id = thought_messages.thought_id) AND (st.creator_id = auth.uid()))))));
CREATE POLICY "Public can view messages in accessible thoughts" ON public.thought_messages AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM shared_thoughts st WHERE ((st.id = thought_messages.thought_id) AND ((st.deleted_by_creator = false) OR (st.deleted_by_recipient = false))))));
CREATE POLICY "Recipients can send messages" ON public.thought_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (((sender_type = 'recipient'::text) AND (sender_session_id IS NOT NULL)));
CREATE POLICY "Anyone can cancel pauses" ON public.thought_pauses AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can create pauses" ON public.thought_pauses AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can view pauses" ON public.thought_pauses AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1 FROM shared_thoughts st WHERE (st.id = thought_pauses.thought_id))));
CREATE POLICY "Service role can manage user_api_limits" ON public.user_api_limits AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "Users can read own user_api_limits" ON public.user_api_limits AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
