/// Build-time configuration, supplied with `--dart-define`.
///
/// The publishable (anon) key is client-safe — it can only do what Row Level
/// Security allows. Never pass a service/secret key to a mobile app.
class Env {
  const Env._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://galecacpodrgshzsyitm.supabase.co',
  );

  /// Required at run time: pass --dart-define=SUPABASE_KEY=sb_publishable_...
  static const String supabaseKey = String.fromEnvironment('SUPABASE_KEY');

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;
}
