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

  /// Google OAuth "Web application" client ID (the one also set as Supabase's
  /// Google provider client ID). Used as the audience for the ID token.
  /// Pass --dart-define=GOOGLE_SERVER_CLIENT_ID=xxxxx.apps.googleusercontent.com
  static const String googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  /// Google OAuth "iOS" client ID. Only needed for the iOS builds.
  /// Pass --dart-define=GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
  static const String googleIosClientId = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');

  /// "Continue with Google" is shown only once the Google client ID is supplied,
  /// so the apps still build and run with email/password before Google is set up.
  static bool get googleConfigured => googleServerClientId.isNotEmpty;
}
