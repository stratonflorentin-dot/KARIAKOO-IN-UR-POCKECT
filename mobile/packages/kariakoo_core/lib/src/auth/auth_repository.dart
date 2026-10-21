import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import '../supabase/supabase_init.dart';

/// Thin wrapper over Supabase Auth. The apps call this; it never touches a
/// service key, so Row Level Security governs everything the session can do.
class AuthRepository {
  const AuthRepository();

  User? get currentUser => supabase.auth.currentUser;

  Stream<AuthState> authStateChanges() => supabase.auth.onAuthStateChange;

  Future<AuthResponse> signIn(
      {required String email, required String password}) {
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

  /// Sign in (or sign up) with a Google account, natively — no web redirect.
  ///
  /// First Google sign-in creates the Supabase account, and the
  /// `handle_new_user` trigger fills the profile and grants the `customer`
  /// role, exactly like an email sign-up. Sellers and riders then apply for
  /// their role from inside the app. Admin has no mobile app, so it is never
  /// reachable this way.
  ///
  /// Requires the Google provider enabled in Supabase and the OAuth client IDs
  /// configured (see mobile/README). Returns `true` on success, `false` if the
  /// person dismissed the Google chooser.
  Future<bool> signInWithGoogle() async {
    final googleSignIn = GoogleSignIn(
      // The web client ID is the audience Supabase expects on the ID token.
      serverClientId:
          Env.googleServerClientId.isEmpty ? null : Env.googleServerClientId,
      // Needed on iOS so the native sheet knows which OAuth client to use.
      clientId: Env.googleIosClientId.isEmpty ? null : Env.googleIosClientId,
    );
    final account = await googleSignIn.signIn();
    if (account == null) return false; // person cancelled

    final googleAuth = await account.authentication;
    final idToken = googleAuth.idToken;
    if (idToken == null) {
      throw const AuthException('Google sign-in did not return an ID token.');
    }
    final accessToken = googleAuth.accessToken;
    if (accessToken == null) {
      throw const AuthException('Google sign-in did not return an access token.');
    }
    await supabase.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      accessToken: accessToken,
    );
    return true;
  }

  Future<void> signOut() => supabase.auth.signOut();
}

/// Turn Supabase's raw auth errors into plain guidance.
String friendlyAuthError(Object error) {
  final message = error is AuthException ? error.message : error.toString();
  final m = message.toLowerCase();
  if (m.contains('invalid login credentials'))
    return 'That email or password is not correct.';
  if (m.contains('already registered'))
    return 'An account with this email already exists. Try signing in.';
  if (m.contains('email not confirmed'))
    return 'Please confirm your email first — check your inbox.';
  if (m.contains('email') && m.contains('invalid'))
    return 'Please enter a valid email address.';
  if (m.contains('signups not allowed') || m.contains('signup is disabled')) {
    return 'New accounts are temporarily disabled. Please try again later.';
  }
  if (m.contains('rate limit') || m.contains('too many requests')) {
    return 'Too many attempts. Wait a few minutes, then try again.';
  }
  if (m.contains('weak password') || m.contains('password should')) {
    return 'Choose a stronger password with at least 8 characters.';
  }
  if (m.contains('password')) return message;
  if (m.contains('id token') || m.contains('provider'))
    return 'Google sign-in isn\'t available right now. Try email instead.';
  if (m.contains('network'))
    return 'No internet connection. Check your network and try again.';
  return 'Something went wrong. Please try again.';
}
