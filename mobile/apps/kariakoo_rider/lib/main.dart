import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

import 'screens/rider_dashboard.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const ProviderScope(child: RiderApp()));
}

class RiderApp extends StatelessWidget {
  const RiderApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KARIAKOO Rider',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: AuthGate(
        appName: 'Rider',
        home: (context, session) => (session.hasRole(AppRole.rider) && session.riderId != null)
            ? RiderDashboard(session: session)
            : RiderHome(session: session),
      ),
    );
  }
}

class RiderHome extends ConsumerWidget {
  const RiderHome({super.key, required this.session});
  final AppSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isRider = session.hasRole(AppRole.rider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('KARIAKOO Rider', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.pedal_bike, size: 56, color: AppColors.brand600),
              const SizedBox(height: 16),
              Text('Habari, ${session.displayName}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                isRider
                    ? 'Going online, job offers, live delivery and earnings arrive in Phase 2 — wired to the dispatch backend.'
                    : "You don't have a rider account yet. Applying to ride arrives with the role-application flow.",
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
