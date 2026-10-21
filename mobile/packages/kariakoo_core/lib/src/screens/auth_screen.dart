import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_repository.dart';
import '../auth/session_controller.dart';
import '../config/env.dart';
import '../theme/app_colors.dart';

/// Shared sign-in / sign-up screen used by all three apps. On success the
/// session stream updates and AuthGate swaps to the app's home automatically.
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key, required this.appName});

  /// e.g. "Customer", "Rider", "Seller" — shown under the brand.
  final String appName;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen>
    with SingleTickerProviderStateMixin {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  bool _signUp = false;
  bool _busy = false;
  bool _showPassword = false;
  String? _error;
  String? _info;
  late final AnimationController _entrance = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 850),
  )..forward();
  late final Animation<double> _fade = CurvedAnimation(
    parent: _entrance,
    curve: Curves.easeOutCubic,
  );
  late final Animation<Offset> _rise = Tween<Offset>(
    begin: const Offset(0, .08),
    end: Offset.zero,
  ).animate(CurvedAnimation(parent: _entrance, curve: Curves.easeOutCubic));

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _entrance.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    final auth = ref.read(authRepositoryProvider);
    try {
      if (_signUp) {
        final res = await auth.signUp(
          email: _email.text.trim(),
          password: _password.text,
          fullName: _name.text.trim(),
        );
        if (res.session == null && mounted) {
          setState(() => _info =
              'No active session was returned. If this email already has a KARIAKOO account, switch to Sign in. Otherwise, check your inbox for a confirmation link.');
        }
      } else {
        await auth.signIn(email: _email.text.trim(), password: _password.text);
      }
    } catch (e) {
      if (mounted) setState(() => _error = _authErrorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _authErrorText(Object error) {
    final message = error.toString().toLowerCase();
    if (message.contains('already registered') ||
        message.contains('user_already_exists') ||
        message.contains('already exists')) {
      return 'You already have a KARIAKOO account. Sign in with the same email; your account works across all three apps.';
    }
    return friendlyAuthError(error);
  }

  Future<void> _google() async {
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      // On success the session stream updates and AuthGate swaps to home.
      final signedIn = await ref.read(authRepositoryProvider).signInWithGoogle();
      if (!signedIn && mounted) {
        setState(() => _info = 'Google sign-in was cancelled. You can try again or use email.');
      }
    } catch (e) {
      if (mounted) setState(() => _error = friendlyAuthError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF0FDF4), Color(0xFFFAFAF9), Colors.white],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: FadeTransition(
                  opacity: _fade,
                  child: SlideTransition(
                    position: _rise,
                    child: Form(
                      key: _form,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _BrandMark(appName: widget.appName),
                          const SizedBox(height: 28),
                          if (widget.appName != 'Customer' && !_signUp) ...[
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: AppColors.brand50,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.brand100),
                              ),
                              child: Text(
                                'Already use KARIAKOO in another app? Sign in with that same account, then choose ${widget.appName == 'Seller' ? 'Open a shop' : 'Apply to ride'} to get started.',
                                style: const TextStyle(
                                    color: AppColors.brand900, height: 1.4),
                              ),
                            ),
                            const SizedBox(height: 20),
                          ],
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 240),
                            transitionBuilder: (child, animation) =>
                                FadeTransition(
                              opacity: animation,
                              child: SlideTransition(
                                position: Tween<Offset>(
                                        begin: const Offset(0, .12),
                                        end: Offset.zero)
                                    .animate(animation),
                                child: child,
                              ),
                            ),
                            child: Text(
                              _signUp ? 'Create your account' : 'Welcome back',
                              key: ValueKey(_signUp),
                              style: const TextStyle(
                                  fontSize: 24, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(height: 20),
                          if (_signUp) ...[
                            TextFormField(
                              controller: _name,
                              decoration:
                                  const InputDecoration(labelText: 'Full name'),
                              autofillHints: const [AutofillHints.name],
                              textInputAction: TextInputAction.next,
                              validator: (v) =>
                                  (v == null || v.trim().length < 2)
                                      ? 'Enter your name'
                                      : null,
                            ),
                            const SizedBox(height: 12),
                          ],
                          TextFormField(
                            controller: _email,
                            decoration:
                                const InputDecoration(labelText: 'Email'),
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.email],
                            autocorrect: false,
                            enableSuggestions: false,
                            textInputAction: TextInputAction.next,
                            validator: (v) => (v == null ||
                                    !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                                        .hasMatch(v.trim()))
                                ? 'Enter a valid email address'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _password,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              suffixIcon: IconButton(
                                tooltip: _showPassword
                                    ? 'Hide password'
                                    : 'Show password',
                                onPressed: () => setState(
                                    () => _showPassword = !_showPassword),
                                icon: Icon(_showPassword
                                    ? Icons.visibility_off
                                    : Icons.visibility),
                              ),
                            ),
                            autofillHints: _signUp
                                ? const [AutofillHints.newPassword]
                                : const [AutofillHints.password],
                            obscureText: !_showPassword,
                            validator: (v) => (v == null || v.length < 8)
                                ? 'At least 8 characters'
                                : null,
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Text(_error!,
                                style: const TextStyle(
                                    color: AppColors.danger,
                                    fontWeight: FontWeight.w600)),
                          ],
                          if (_info != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.brand50,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(_info!,
                                  style: const TextStyle(
                                      color: AppColors.brand900)),
                            ),
                          ],
                          const SizedBox(height: 20),
                          ElevatedButton(
                            onPressed: _busy ? null : _submit,
                            child: Text(_busy
                                ? 'Please wait…'
                                : (_signUp ? 'Create account' : 'Sign in')),
                          ),
                          if (Env.googleConfigured) ...[
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                const Expanded(child: Divider()),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 12),
                                  child: Text('or',
                                      style: TextStyle(color: AppColors.muted)),
                                ),
                                const Expanded(child: Divider()),
                              ],
                            ),
                            const SizedBox(height: 16),
                            OutlinedButton.icon(
                              onPressed: _busy ? null : _google,
                              icon: const _GoogleG(),
                              label: const Text('Continue with Google'),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size.fromHeight(48),
                                side: const BorderSide(color: AppColors.line),
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),
                          TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                      _signUp = !_signUp;
                                      _error = null;
                                      _info = null;
                                    }),
                            child: Text(_signUp
                                ? 'Already have an account? Sign in'
                                : 'New here? Create an account'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A small Google "G" mark for the sign-in button. (Swap for the official
/// multicolour asset to fully match Google's brand guidelines.)
class _GoogleG extends StatelessWidget {
  const _GoogleG();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 18,
      height: 18,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(3),
        border: Border.all(color: AppColors.line),
      ),
      child: const Text(
        'G',
        style: TextStyle(
            color: Color(0xFF4285F4),
            fontWeight: FontWeight.w800,
            fontSize: 13,
            height: 1),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({required this.appName});
  final String appName;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
              color: AppColors.gold400,
              borderRadius: BorderRadius.circular(10)),
          child: const Text('K',
              style: TextStyle(
                  color: AppColors.ink,
                  fontWeight: FontWeight.w900,
                  fontSize: 20)),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('KARIAKOO',
                style:
                    TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.5)),
            Text(appName,
                style: const TextStyle(
                    color: AppColors.brand700,
                    fontWeight: FontWeight.w600,
                    fontSize: 12)),
          ],
        ),
      ],
    );
  }
}
