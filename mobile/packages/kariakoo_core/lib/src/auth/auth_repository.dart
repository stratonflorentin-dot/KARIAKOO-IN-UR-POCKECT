import 'package:supabase_flutter/supabase_flutter.dart';

import '../supabase/supabase_init.dart';

/// Thin wrapper over Supabase Auth. The apps call this; it never touches a
/// service key, so Row Level Security governs everything the session can do.
class AuthRepository {
  const AuthRepository();

  User? get currentUser => supabase.auth.currentUser;

  Stream<AuthState> authStateChanges() => supabase.auth.onAuthStateChange;

  Future<AuthResponse> signIn({required String email, required String password}) {
    return supabase.auth.signInWithPassword(email: email, password: password);
  }

  /// `full_name` reaches the `handle_new_user` trigger, which fills the profile
  /// and grants the `customer` role. Returns a session only if email
  /// confirmation is off; otherwise the user must confirm by email first.
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) {
    return supabase.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  Future<void> signOut() => supabase.auth.signOut();
}

/// Turn Supabase's raw auth errors into plain guidance.
String friendlyAuthError(Object error) {
  final message = error is AuthException ? error.message : error.toString();
  final m = message.toLowerCase();
  if (m.contains('invalid login credentials')) return 'That email or password is not correct.';
  if (m.contains('already registered')) return 'An account with this email already exists. Try signing in.';
  if (m.contains('email not confirmed')) return 'Please confirm your email first — check your inbox.';
  if (m.contains('email') && m.contains('invalid')) return 'Please enter a valid email address.';
  if (m.contains('password')) return message;
  return 'Something went wrong. Please try again.';
}
