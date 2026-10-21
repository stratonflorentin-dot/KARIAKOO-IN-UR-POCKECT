import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/session_controller.dart';
import '../models/app_session.dart';
import '../screens/auth_screen.dart';
import 'retry_panel.dart';

/// Shows the sign-in screen when signed out, and the app's home when signed in.
/// Each app passes its own home builder.
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key, required this.appName, required this.home});

  final String appName;
  final Widget Function(BuildContext context, AppSession session) home;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    return session.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (_, __) => Scaffold(
        body: RetryPanel(
          message: 'Could not load your session.',
          onRetry: () => ref.invalidate(sessionProvider),
        ),
      ),
      data: (s) => s == null ? AuthScreen(appName: appName) : home(context, s),
    );
  }
}
