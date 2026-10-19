import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kariakoo_core/kariakoo_core.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const ProviderScope(child: SellerApp()));
}

class SellerApp extends StatelessWidget {
  const SellerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KARIAKOO Seller',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: AuthGate(
        appName: 'Seller',
        home: (context, session) => SellerHome(session: session),
      ),
    );
  }
}

class SellerHome extends ConsumerWidget {
  const SellerHome({super.key, required this.session});
  final AppSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSeller = session.hasRole(AppRole.seller);
    return Scaffold(
      appBar: AppBar(
        title: const Text('KARIAKOO Seller', style: TextStyle(fontWeight: FontWeight.w800)),
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
              const Icon(Icons.storefront, size: 56, color: AppColors.brand600),
              const SizedBox(height: 16),
              Text('Karibu, ${session.displayName}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                isSeller
                    ? 'Your seller dashboard — products, orders and finances — arrives in Phase 3.'
                    : "You don't have a seller account yet. Applying to sell arrives with the role-application flow.",
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
