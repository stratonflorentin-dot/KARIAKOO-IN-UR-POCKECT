import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';

/// Initialise Supabase once, before `runApp`. Call from each app's `main`.
Future<void> initSupabase() async {
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseKey,
  );
}

/// The shared Supabase client. RLS applies to every call made through it.
SupabaseClient get supabase => Supabase.instance.client;
